export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const customerId = searchParams.get("customerId")

    // Build where clause
    const where = {}
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    if (customerId) {
      where.customerId = customerId
    }

    // Fetch data using Promise.all for better performance
    const [salesOrders, outboundShipments, customers] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              rawMaterial: { select: { name: true, sku: true, unit: true } },
              finishedGood: { select: { name: true, sku: true, unit: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.outboundShipment.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              rawMaterial: { select: { name: true, sku: true, unit: true } },
              finishedGood: { select: { name: true, sku: true, unit: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.findMany({
        select: { id: true, name: true },
      }),
    ])

    // Calculate summary statistics
    const allOrders = [...salesOrders, ...outboundShipments]
    const summary = {
      totalOrders: allOrders.length,
      totalValue: allOrders.reduce((sum, order) => sum + (order.totalValue || 0), 0),
      totalItems: allOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0),
      statusBreakdown: {
        preparing: allOrders.filter((order) => order.status === "PREPARING").length,
        ready: allOrders.filter((order) => order.status === "READY").length,
        shipped: allOrders.filter((order) => order.status === "SHIPPED").length,
        delivered: allOrders.filter((order) => order.status === "DELIVERED").length,
      },
      customerBreakdown: customers.map((customer) => ({
        name: customer.name,
        orderCount: allOrders.filter((order) => order.customerId === customer.id).length,
        totalValue: allOrders
          .filter((order) => order.customerId === customer.id)
          .reduce((sum, order) => sum + (order.totalValue || 0), 0),
      })),
    }

    const reportData = {
      salesOrders,
      outboundShipments,
      summary,
      filters: { startDate, endDate, customerId },
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating outbound report:", error)
    return NextResponse.json({ error: "Failed to generate outbound report" }, { status: 500 })
  }
}

