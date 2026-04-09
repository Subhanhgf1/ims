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

    const skip = (page - 1) * limit

    // Build search filter
    const where = search ? {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { returnNumber: { contains: search, mode: 'insensitive' } },
      ]
    } : {}

    const [returns, total] = await Promise.all([
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
      prisma.return.count({ where })
    ])

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
      // 1. Pre-process items to determine types and target quantities
      const processedItems = await Promise.all(items.map(async (item) => {
        const rawMaterial = await tx.rawMaterial.findUnique({
          where: { id: item.imsItemId },
          select: { id: true }
        })
        
        const itemType = rawMaterial ? 'raw_material' : 'finished_good'
        const quantity = Number(item.quantity)

        // 2. Perform the stock update immediately within the transaction
        if (itemType === 'raw_material') {
          await tx.rawMaterial.update({
            where: { id: item.imsItemId },
            data: { quantity: { increment: quantity } }
          })
        } else {
          await tx.finishedGood.update({
            where: { id: item.imsItemId },
            data: { quantity: { increment: quantity } }
          })
        }

        return {
          orderItemId: item.orderItemId,
          quantity,
          reason: item.reason,
          condition: item.condition,
          notes: item.notes,
          itemType,
          ...(itemType === 'raw_material'
            ? { rawMaterialId: item.imsItemId }
            : { finishedGoodId: item.imsItemId }
          )
        }
      }))

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

