export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    const [totalReceived, totalUsed, totalAdjustments, lastReceived, lastUsed, avgCost] = await Promise.all([
      // Total received
      prisma.receivingRecord.aggregate({
        where: { finishedGoodId: id },
        _sum: { quantity: true },
      }),
      // Total used in sales
      prisma.salesOrderItem.aggregate({
        where: { finishedGoodId: id },
        _sum: { shipped: true },
      }),
      // Total adjustments
      prisma.inventoryAdjustment.count({
        where: { finishedGoodId: id },
      }),
      // Last received
      prisma.receivingRecord.findFirst({
        where: { finishedGoodId: id },
        orderBy: { receivedDate: "desc" },
        select: { receivedDate: true },
      }),
      // Last used
      prisma.salesOrderItem.findFirst({
        where: { finishedGoodId: id },
        include: { salesOrder: { select: { updatedAt: true } } },
        orderBy: { salesOrder: { updatedAt: "desc" } },
      }),
      // Average cost
      prisma.receivingRecord.aggregate({
        where: { finishedGoodId: id },
        _avg: { quantity: true },
      }),
    ])

    const stats = {
      totalReceived: totalReceived._sum.quantity || 0,
      totalUsed: totalUsed._sum.shipped || 0,
      totalAdjustments,
      lastReceived: lastReceived?.receivedDate || null,
      lastUsed: lastUsed?.salesOrder?.updatedAt || null,
      averageCost: avgCost._avg.quantity || 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
