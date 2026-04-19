export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page")) || 1
    const limit = parseInt(searchParams.get("limit")) || 10
    const search = searchParams.get("search") || ""
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const skip = (page - 1) * limit

    // Build filters
    const where = {
      AND: [
        search ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { trackingNumber: { contains: search, mode: 'insensitive' } },
            { returnNumber: { contains: search, mode: 'insensitive' } },
          ]
        } : {},
        status && status !== 'ALL' ? { status } : {},
        startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          }
        } : {},
      ]
    }

    // Filter for total stats (search and date only, ignoring status filter)
    const statsWhere = {
      AND: [
        search ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { trackingNumber: { contains: search, mode: 'insensitive' } },
            { returnNumber: { contains: search, mode: 'insensitive' } },
          ]
        } : {},
        startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          }
        } : {},
      ]
    }

    const [returns, total, stats] = await Promise.all([
      prisma.return.findMany({
        where,
        include: {
          items: {
            include: {
              rawMaterial: { select: { id: true, name: true, sku: true } },
              finishedGood: { select: { id: true, name: true, sku: true } }
            }
          },
          createdBy: { select: { id: true, name: true, email: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.return.count({ where }),
      prisma.return.groupBy({
        by: ['status'],
        where: statsWhere,
        _count: { _all: true }
      })
    ])

    const statsMap = stats.reduce((acc, curr) => {
      acc[curr.status] = curr._count._all
      return acc
    }, { PENDING: 0, PROCESSING: 0, COMPLETED: 0, REJECTED: 0 })

    const totalStats = Object.values(statsMap).reduce((a, b) => a + b, 0)

    // Transform the data to match what the component expects
    const transformedReturns = returns.map(ret => ({
      id: ret.id,
      returnNumber: ret.returnNumber,
      trackingNumber: ret.trackingNumber,
      orderNumber: ret.orderNumber,
      orderId: ret.orderId,
      customerId: ret.customerId,
      platformStoreId: ret.platformStoreId,
      status: ret.status,
      notes: ret.notes,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
      createdById: ret.createdById,
      items: ret.items.map(item => ({
        id: item.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reason: item.reason,
        condition: item.condition,
        notes: item.notes,
        imsItem: item.rawMaterial || item.finishedGood
      }))
    }))

    return NextResponse.json({
      data: transformedReturns,
      stats: {
        total: totalStats,
        ...statsMap
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching returns:", error)
    return NextResponse.json({ error: "Failed to fetch returns" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const {
      trackingNumber,
      orderNumber,
      orderId,
      customerId,
      platformStoreId,
      items,
      createdById
    } = data

    if (!trackingNumber || !orderNumber || !items || !createdById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a unique return number
    const returnNumber = `FD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create the return with items and update inventory in a transaction
    // Increased timeout to 15s to prevent P2028 errors on slower connections
    const returnData = await prisma.$transaction(async (tx) => {
      // 1. Pre-process items to determine types and handle bundle explosion
      // We use flatMap because one bundle item can explode into multiple component items
      const processedItems = []
      
      for (const item of items) {
        const quantity = Number(item.quantity)
        
        // Check for raw material first
        const rawMaterial = await tx.rawMaterial.findUnique({
          where: { id: item.imsItemId },
          select: { id: true }
        })

        if (rawMaterial) {
          // It's a raw material - simple update
          await tx.rawMaterial.update({
            where: { id: item.imsItemId },
            data: { quantity: { increment: quantity } }
          })
          processedItems.push({
            orderItemId: item.orderItemId,
            quantity,
            reason: item.reason,
            condition: item.condition,
            notes: item.notes,
            itemType: 'raw_material',
            rawMaterialId: item.imsItemId
          })
          continue
        }

        // Check for finished good
        const finishedGood = await tx.finishedGood.findUnique({
          where: { id: item.imsItemId }
        })

        if (finishedGood) {
          // Simple finished good - normal update
          await tx.finishedGood.update({
            where: { id: item.imsItemId },
            data: { quantity: { increment: quantity } }
          })
          processedItems.push({
            orderItemId: item.orderItemId,
            quantity,
            reason: item.reason,
            condition: item.condition,
            notes: item.notes,
            itemType: 'finished_good',
            finishedGoodId: item.imsItemId
          })
          continue
        }

        // Check for product bundle
        const bundle = await tx.productBundle.findUnique({
          where: { id: item.imsItemId },
          include: { 
            items: {
              include: { finishedGood: true }
            }
          }
        })

        if (bundle) {
          // EXPLODE BUNDLE: For each component, update inventory and add to return record
          for (const bundleItem of bundle.items) {
            const componentQty = quantity * bundleItem.quantity
            
            await tx.finishedGood.update({
              where: { id: bundleItem.finishedGoodId },
              data: { quantity: { increment: componentQty } }
            })

            processedItems.push({
              orderItemId: item.orderItemId,
              quantity: componentQty,
              reason: item.reason,
              condition: item.condition,
              notes: `(Component of Bundle: ${bundle.sku}) ${item.notes || ""}`,
              itemType: 'finished_good',
              finishedGoodId: bundleItem.finishedGoodId
            })
          }
          continue
        }
      }

      // 3. Create the return record with its items
      return await tx.return.create({
        data: {
          returnNumber,
          trackingNumber,
          orderNumber,
          orderId,
          customerId,
          platformStoreId,
          createdById,
          status: "COMPLETED", // Explicitly marking as completed after successful processing
          items: {
            create: processedItems
          }
        },
        include: {
          items: {
            include: {
              rawMaterial: { select: { id: true, name: true, sku: true } },
              finishedGood: { select: { id: true, name: true, sku: true } }
            }
          }
        }
      })
    }, {
      timeout: 15000 // 15 seconds timeout
    })

    // Transform the response to match the expected format
    const transformedReturn = {
      id: returnData.id,
      returnNumber: returnData.returnNumber,
      trackingNumber: returnData.trackingNumber,
      orderNumber: returnData.orderNumber,
      orderId: returnData.orderId,
      customerId: returnData.customerId,
      platformStoreId: returnData.platformStoreId,
      status: returnData.status,
      notes: returnData.notes,
      createdAt: returnData.createdAt,
      updatedAt: returnData.updatedAt,
      createdById: returnData.createdById,
      items: returnData.items.map(item => ({
        id: item.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reason: item.reason,
        condition: item.condition,
        notes: item.notes,
        imsItem: item.rawMaterial || item.finishedGood
      }))
    }

    return NextResponse.json(transformedReturn)
  } catch (error) {
    console.error("Error creating return:", error)
    return NextResponse.json({ error: "Failed to create return" }, { status: 500 })
  }
}

