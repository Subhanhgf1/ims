import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays } from "date-fns"

export async function POST(request) {
  try {
    const { ids, lookbackDays = 30, targetDays } = await request.json()

    if (targetDays === undefined || targetDays === null) {
      return NextResponse.json({ error: "targetDays is required" }, { status: 400 })
    }

    const startDate = subDays(new Date(), lookbackDays)

    // 1. Get the items (either specific IDs or all finished goods)
    const items = await prisma.finishedGood.findMany({
      where: ids && ids.length > 0 ? { id: { in: ids } } : {},
      select: {
        id: true,
        name: true,
        sku: true,
        minimumStock: true,
        quantity: true
      }
    })

    const targetIds = items.map(i => i.id)

    // 2. Aggregate outbound movement
    const outboundStats = await prisma.salesOrderItem.groupBy({
      by: ['finishedGoodId'],
      where: {
        finishedGoodId: { in: targetIds },
        salesOrder: {
          status: { in: ["SHIPPED", "DELIVERED"] },
          updatedAt: { gte: startDate }
        }
      },
      _sum: {
        shipped: true
      }
    })

    const statsMap = new Map(outboundStats.map(s => [s.finishedGoodId, s._sum.shipped || 0]))

    // 3. Build suggestions
    const suggestions = items.map(item => {
      const totalOutbound = statsMap.get(item.id) || 0
      const dailyAvg = totalOutbound / lookbackDays
      const suggestedMin = Math.ceil(dailyAvg * targetDays)

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        currentMin: item.minimumStock || 0,
        suggestedMin,
        totalOutbound,
        dailyAvg: dailyAvg.toFixed(2)
      }
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Error calculating suggested min stock:", error)
    return NextResponse.json({ error: "Failed to calculate suggestions" }, { status: 500 })
  }
}
