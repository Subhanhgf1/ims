export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Use Promise.all to fetch all data in parallel for better performance
    const [
      rawMaterialsCount,
      finishedGoodsCount,
      lowStockRawMaterials,
      lowStockFinishedGoods,
      pendingPurchaseOrders,
      pendingProductionOrders,
      todayReceivedOrders,
      todayShippedOrders,
      totalInventoryValue,
      recentActivities,
    ] = await Promise.all([
      // Raw materials count
      prisma.rawMaterial.count(),

      // Finished goods count
      prisma.finishedGood.count(),

      // Low stock raw materials
      prisma.rawMaterial.count({
        where: {
          quantity: { lte: prisma.rawMaterial.fields.minimumStock },
        },
      }),

      // Low stock finished goods
      prisma.finishedGood.count({
        where: {
          quantity: { lte: prisma.finishedGood.fields.minimumStock },
        },
      }),

      // Pending purchase orders
      prisma.purchaseOrder.count({
        where: { status: "PENDING" },
      }),

      // Pending production orders
      prisma.productionOrder.count({
        where: { status: "PENDING" },
      }),

      // Today's received orders
      prisma.purchaseOrder.count({
        where: {
          status: "RECEIVED",
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),

      // Today's shipped orders
      prisma.salesOrder.count({
        where: {
          status: "SHIPPED",
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
  // Fetch all items and calculate in JavaScript
Promise.all([
  prisma.rawMaterial.findMany({
    select: { quantity: true, cost: true },
  }),
  prisma.finishedGood.findMany({
    select: { quantity: true, cost: true },
  }),
]).then(([rawMats, finishedGoods]) => {
  const rawValue = rawMats.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
  const finishedValue = finishedGoods.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
  return rawValue + finishedValue
}),

      // Recent activities (last 10 receiving records)
      prisma.receivingRecord.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          rawMaterial: { select: { name: true } },
          finishedGood: { select: { name: true } },
        },
      }),
    ])

    const stats = {
      inventory: {
        totalRawMaterials: rawMaterialsCount,
        totalFinishedGoods: finishedGoodsCount,
        lowStockItems: lowStockRawMaterials + lowStockFinishedGoods,
        totalValue: totalInventoryValue,
      },
      operations: {
        pendingPurchaseOrders,
        pendingProductionOrders,
        todayReceived: todayReceivedOrders,
        todayShipped: todayShippedOrders,
      },
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        type: "RECEIVING",
        description: `${activity.user.name} received ${activity.quantity} units of ${
          activity.rawMaterial?.name || activity.finishedGood?.name
        }`,
        timestamp: activity.createdAt,
      })),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}

