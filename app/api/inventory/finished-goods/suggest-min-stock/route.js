import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays } from "date-fns"

export async function POST(request) {
  try {
    const { ids, lookbackDays = 30, targetDays, advanced = false } = await request.json()
    
    // Get default target days from settings if not provided
    let finalTargetDays = targetDays
    if (finalTargetDays === undefined || finalTargetDays === null) {
      const prefs = await prisma.systemPreferences.findFirst()
      finalTargetDays = prefs?.stockMaintenanceDays || 9
    }
    
    const startDate = subDays(new Date(), lookbackDays)
    const recentStartDate = subDays(new Date(), 3) // 3-day window for advanced logic

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

    // 2. Aggregate outbound movement (Standard window)
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

    // 2b. Aggregate outbound movement (Recent 3-day window)
    const recentStats = await prisma.salesOrderItem.groupBy({
      by: ['finishedGoodId'],
      where: {
        finishedGoodId: { in: targetIds },
        salesOrder: {
          status: { in: ["SHIPPED", "DELIVERED"] },
          updatedAt: { gte: recentStartDate }
        }
      },
      _sum: {
        shipped: true
      }
    })

    const statsMap = new Map(outboundStats.map(s => [s.finishedGoodId, s._sum.shipped || 0]))
    const recentMap = new Map(recentStats.map(s => [s.finishedGoodId, s._sum.shipped || 0]))

    // 3. Build suggestions
    const suggestions = items.map(item => {
      const totalOutbound = statsMap.get(item.id) || 0
      const standardDailyAvg = totalOutbound / lookbackDays
      
      const recentTotal = recentMap.get(item.id) || 0
      const recentDailyAvg = recentTotal / 3

      // Advanced logic: reactive to spikes (max of short-term and long-term)
      const dailyAvg = advanced 
        ? Math.max(standardDailyAvg, recentDailyAvg)
        : standardDailyAvg

      const suggestedMin = Math.ceil(dailyAvg * finalTargetDays)

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
