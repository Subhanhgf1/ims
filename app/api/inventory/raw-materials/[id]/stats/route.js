export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    const [totalReceived, totalUsed, totalAdjustments, lastReceived, lastUsed, avgCost] = await Promise.all([
      // Total received
      prisma.receivingRecord.aggregate({
        where: { rawMaterialId: id },
        _sum: { quantity: true },
      }),
      // Total used in production
      prisma.productionItem.aggregate({
        where: { rawMaterialId: id },
        _sum: { consumedQuantity: true },
      }),
      // Total adjustments
      prisma.inventoryAdjustment.count({
        where: { rawMaterialId: id },
      }),
      // Last received
      prisma.receivingRecord.findFirst({
        where: { rawMaterialId: id },
        orderBy: { receivedDate: "desc" },
        select: { receivedDate: true },
      }),
      // Last used
      prisma.productionItem.findFirst({
        where: { rawMaterialId: id },
        include: { productionOrder: { select: { updatedAt: true } } },
        orderBy: { productionOrder: { updatedAt: "desc" } },
      }),
      // Average cost
      prisma.receivingRecord.aggregate({
        where: { rawMaterialId: id },
        _avg: { quantity: true },
      }),
    ])

    const stats = {
      totalReceived: totalReceived._sum.quantity || 0,
      totalUsed: totalUsed._sum.consumedQuantity || 0,
      totalAdjustments,
      lastReceived: lastReceived?.receivedDate || null,
      lastUsed: lastUsed?.productionOrder?.updatedAt || null,
      averageCost: avgCost._avg.quantity || 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
