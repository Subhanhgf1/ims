import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays, format, differenceInMinutes } from "date-fns"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "last-30-days"
    
    // Calculate date range based on period
    let daysToLookBack = 30
    if (period === "last-7-days") daysToLookBack = 7
    if (period === "last-90-days") daysToLookBack = 90
    if (period === "last-year") daysToLookBack = 365
    
    const startDate = subDays(new Date(), daysToLookBack)

    // 1. Team Performance: Returns Processing Time
    const completedReturns = await prisma.return.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: startDate }
      },
      select: { createdAt: true, updatedAt: true }
    })

    const avgReturnTime = completedReturns.length > 0
      ? (completedReturns.reduce((sum, r) => sum + differenceInMinutes(r.updatedAt, r.createdAt), 0) / completedReturns.length) / 60
      : 0

    // 2. Team Performance: Inbound Processing Time (from PO creation to first receipt)
    // We use ReceivingRecord as the arrival event and PurchaseOrder as the request
    const inboundRecords = await prisma.receivingRecord.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        purchaseOrder: { select: { createdAt: true } }
      }
    })

    const avgInboundTime = inboundRecords.length > 0
      ? (inboundRecords.reduce((sum, r) => sum + differenceInMinutes(r.createdAt, r.purchaseOrder.createdAt), 0) / inboundRecords.length) / 60
      : 0

    // 3. Supply Chain Reliability: Supplier On-Time Rate
    // We compare ReceivingRecord date vs PurchaseOrder Expected date
    const poRecords = await prisma.receivingRecord.findMany({
      where: { receivedDate: { gte: startDate } },
      include: { purchaseOrder: { select: { expectedDate: true } } }
    })

    const onTimeCount = poRecords.filter(r => 
      r.receivedDate <= r.purchaseOrder.expectedDate
    ).length

    const inboundOnTimeRate = poRecords.length > 0
      ? (onTimeCount / poRecords.length) * 100
      : 0

    // 4. Counts for Throughput & Total Metrics
    const [returnsCount, inboundCount, outboundCount] = await Promise.all([
      // Use Return model for returns stats
      prisma.return.count({ where: { createdAt: { gte: startDate } } }),
      // Use ReceivingRecord for inbound stats (actual throughput)
      prisma.receivingRecord.count({ where: { createdAt: { gte: startDate } } }),
      // Use SalesOrder for outbound stats
      prisma.salesOrder.count({ where: { status: { in: ["SHIPPED", "DELIVERED"] }, updatedAt: { gte: startDate } } })
    ])

    // 5. Throughput Trend Data (Last 15 slots)
    const dailyStats = Array.from({ length: 15 }).map((_, i) => {
      const date = subDays(new Date(), i)
      const dateStr = format(date, "MMM dd")
      return { date: dateStr, fullDate: date, returns: 0, inbound: 0, outbound: 0 }
    }).reverse()

    const [trendsReturns, trendsInbound, trendsOutbound] = await Promise.all([
      prisma.return.findMany({ where: { createdAt: { gte: subDays(new Date(), 15) } }, select: { createdAt: true } }),
      prisma.receivingRecord.findMany({ where: { createdAt: { gte: subDays(new Date(), 15) } }, select: { createdAt: true } }),
      prisma.salesOrder.findMany({ where: { status: { in: ["SHIPPED", "DELIVERED"] }, updatedAt: { gte: subDays(new Date(), 15) } }, select: { updatedAt: true } })
    ])

    dailyStats.forEach(day => {
      day.returns = trendsReturns.filter(r => format(r.createdAt, "MMM dd") === day.date).length
      day.inbound = trendsInbound.filter(r => format(r.createdAt, "MMM dd") === day.date).length
      day.outbound = trendsOutbound.filter(o => format(o.updatedAt, "MMM dd") === day.date).length
    })

    // 6. Supplier Reliability Ranking (Filtered for real suppliers)
    const rawSuppliers = await prisma.supplier.findMany({
      where: {
        NOT: {
          name: { in: ["Returns", "Failed Delivery", "System", "Platform"] }
        }
      },
      include: {
        purchaseOrders: {
          where: { createdAt: { gte: startDate } },
          include: { receivingRecords: true }
        }
      }
    })

    const supplierPerformance = rawSuppliers.map(s => {
      const records = s.purchaseOrders.flatMap(po => po.receivingRecords)
      const total = records.length
      const onTime = records.filter(r => {
        const po = s.purchaseOrders.find(p => p.id === r.purchaseOrderId)
        return r.receivedDate <= po.expectedDate
      }).length
      
      return {
        name: s.name,
        onTimeRate: total > 0 ? (onTime / total) * 100 : 0,
        totalOrders: total
      }
    }).filter(s => s.totalOrders > 0)
      .sort((a, b) => b.onTimeRate - a.onTimeRate)
      .slice(0, 5)

    // 7. Item Usage Data
    const [salesItems, receivingRecords, returnItems] = await Promise.all([
      prisma.salesOrderItem.findMany({
        where: { salesOrder: { status: { in: ["SHIPPED", "DELIVERED"] }, updatedAt: { gte: startDate } } },
        include: { finishedGood: true, rawMaterial: true }
      }),
      prisma.receivingRecord.findMany({
        where: { createdAt: { gte: startDate } },
        include: { finishedGood: true, rawMaterial: true }
      }),
      prisma.returnItem.findMany({
        where: { return: { createdAt: { gte: startDate } } },
        include: { finishedGood: true, rawMaterial: true }
      })
    ])

    const itemUsageMap = {};

    const processItem = (record, type, q) => {
      let item = record.finishedGood || record.rawMaterial;
      if (!item) return;

      if (!itemUsageMap[item.id]) {
        itemUsageMap[item.id] = {
          id: item.id,
          name: item.name,
          sku: item.sku,
          type: record.finishedGood ? "Finished Good" : "Raw Material",
          inbounded: 0,
          outbounded: 0,
          returned: 0
        };
      }
      
      if (type === 'outbound') itemUsageMap[item.id].outbounded += q;
      if (type === 'inbound') itemUsageMap[item.id].inbounded += q;
      if (type === 'return') itemUsageMap[item.id].returned += q;
    };

    salesItems.forEach(si => processItem(si, 'outbound', si.quantity));
    receivingRecords.forEach(rr => processItem(rr, 'inbound', rr.quantity));
    returnItems.forEach(ri => processItem(ri, 'return', ri.quantity));

    // Calculate total movement for sorting
    const itemUsage = Object.values(itemUsageMap)
      .map(item => ({ ...item, totalMovement: item.inbounded + item.outbounded + item.returned }))
      .sort((a, b) => b.totalMovement - a.totalMovement)
      .slice(0, 100);

    const stats = {
      metrics: {
        avgReturnTime: avgReturnTime, // Now a float
        avgInboundTime: avgInboundTime, // Now a float
        inboundOnTimeRate: Math.round(inboundOnTimeRate),
        teamThroughput: returnsCount + inboundCount + outboundCount
      },
      throughputTrends: dailyStats,
      supplierPerformance,
      itemUsage,
      distribution: [
        { name: "Inbound", value: inboundCount },
        { name: "Outbound", value: outboundCount },
        { name: "Returns", value: returnsCount },
      ]
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching report stats:", error)
    return NextResponse.json({ error: "Failed to fetch report stats" }, { status: 500 })
  }
}
