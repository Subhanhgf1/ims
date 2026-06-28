import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePONumber } from "@/lib/utils"
import { addDays, startOfDay, subDays } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET(request) {
  return handleBoxReplenish(request)
}

export async function POST(request) {
  return handleBoxReplenish(request)
}

async function handleBoxReplenish(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const isCronTrigger = authHeader === `Bearer ${process.env.CRON_SECRET}`

    let userId

    if (isCronTrigger) {
      userId = process.env.SYSTEM_USER_ID
    } else {
      const body = await request.json().catch(() => ({}))
      userId = body.userId
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: isCronTrigger
            ? "SYSTEM_USER_ID environment variable is not configured"
            : "User ID is required",
        },
        { status: 400 }
      )
    }

    // ── Constants ──────────────────────────────────────────────────────────────
    // The packaging material category — boxes live here
    const PACKAGING_CATEGORY_ID = "cmnlnckyn0000ky0410u4tvrv"
    // Box Packaging supplier
    const BOX_SUPPLIER_ID = "cmp87dff8000ejx04pif1s3aq"

    const RECENT_DAYS = 3   // short window for current velocity
    const TREND_DAYS  = 30  // longer window for trend baseline

    const now         = new Date()
    const recentStart = subDays(now, RECENT_DAYS)
    const trendStart  = subDays(now, TREND_DAYS)

    // ── PHASE 1: Sales-velocity windows for packaging items ────────────────────
    // Boxes are consumed when finished goods are SHIPPED — they appear as
    // finished_good sales order items (since packaging is tracked as finished goods).
    const [recentSales, trendSales] = await Promise.all([
      prisma.salesOrderItem.groupBy({
        by: ["finishedGoodId"],
        where: {
          finishedGoodId: { not: null },
          salesOrder: {
            status: { in: ["SHIPPED", "DELIVERED"] },
            updatedAt: { gte: recentStart },
          },
        },
        _sum: { shipped: true },
      }),
      prisma.salesOrderItem.groupBy({
        by: ["finishedGoodId"],
        where: {
          finishedGoodId: { not: null },
          salesOrder: {
            status: { in: ["SHIPPED", "DELIVERED"] },
            updatedAt: { gte: trendStart },
          },
        },
        _sum: { shipped: true },
      }),
    ])

    const recentMap = new Map(recentSales.map((s) => [s.finishedGoodId, s._sum.shipped || 0]))
    const trendMap  = new Map(trendSales.map((s)  => [s.finishedGoodId, s._sum.shipped || 0]))

    // ── PHASE 2: Fetch only packaging material items ───────────────────────────
    const packagingItems = await prisma.finishedGood.findMany({
      where: {
        categoryId: PACKAGING_CATEGORY_ID,
      },
      include: {
        inventorySettings: true,
      },
    })

    if (packagingItems.length === 0) {
      return NextResponse.json({
        message: "No packaging material items found in the system.",
        ordersCreated: 0,
        smartMinUpdates: 0,
      })
    }

    // ── PHASE 3: Smart min-stock recalculation using per-item targetDays ───────
    // Key difference from the main replenish route: we use item.targetDays
    // (the value set on each box product) instead of the global preference.
    // This ensures box stock maintenance windows are not coupled to the
    // global stockMaintenanceDays setting.

    const minStockUpdates = []

    for (const item of packagingItems) {
      const itemTargetDays = item.targetDays || 30 // fall back to 30 days if not set

      const recentTotal    = recentMap.get(item.id) || 0
      const recentDailyAvg = recentTotal / RECENT_DAYS

      const trendTotal    = trendMap.get(item.id) || 0
      const trendDailyAvg = trendTotal / TREND_DAYS

      // Asymmetrical Smoothing (same formula as main auto-replenish):
      // Spike → react fast (70% recent, 30% trend) to prevent outages.
      // Drop  → react slow (30% recent, 70% trend) to avoid over-ordering.
      let smartDailyAvg = 0
      if (recentDailyAvg > trendDailyAvg) {
        smartDailyAvg = recentDailyAvg * 0.7 + trendDailyAvg * 0.3
      } else {
        smartDailyAvg = recentDailyAvg * 0.3 + trendDailyAvg * 0.7
      }

      // Min stock = enough stock to cover itemTargetDays at current smart velocity
      const smartMinStock = Math.ceil(smartDailyAvg * itemTargetDays)

      if (smartMinStock !== (item.minimumStock || 0)) {
        minStockUpdates.push({
          id:           item.id,
          newMin:       smartMinStock,
          newDailyAvg:  smartDailyAvg,
          itemTargetDays,
        })
      }
    }

    // Persist updated minimums
    if (minStockUpdates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const { id, newMin, newDailyAvg } of minStockUpdates) {
          await tx.finishedGood.update({
            where: { id },
            data: {
              minimumStock:     newMin,
              dailyConsumption: parseFloat(newDailyAvg.toFixed(4)),
            },
          })
        }
      })

      // Mirror into in-memory list so ordering phase uses fresh values
      const updateMap = new Map(minStockUpdates.map((u) => [u.id, u]))
      for (const item of packagingItems) {
        const upd = updateMap.get(item.id)
        if (upd) {
          item.minimumStock     = upd.newMin
          item.dailyConsumption = upd.newDailyAvg
        }
      }
    }

    // ── PHASE 4: Check pending inbound for packaging items ────────────────────
    const pendingPOItems = await prisma.purchaseOrderItem.findMany({
      where: {
        itemType:      "finished_good",
        finishedGoodId: { in: packagingItems.map((i) => i.id) },
        purchaseOrder: {
          status: { in: ["PENDING", "PARTIALLY_RECEIVED"] },
        },
      },
      select: {
        finishedGoodId: true,
        quantity:       true,
        received:       true,
      },
    })

    const pendingQuantities = pendingPOItems.reduce((acc, item) => {
      const pending = item.quantity - item.received
      if (pending > 0) {
        acc[item.finishedGoodId] = (acc[item.finishedGoodId] || 0) + pending
      }
      return acc
    }, {})

    // ── PHASE 5: Identify boxes that need ordering ─────────────────────────────
    // Target = max(minimumStock, targetDays × dailyConsumption)
    // This mirrors the logic in the main replenish route exactly.
    const itemsToRestock = packagingItems
      .map((item) => {
        const pendingInbound  = pendingQuantities[item.id] || 0
        const effectiveStock  = item.quantity + pendingInbound
        const itemTargetDays  = item.targetDays || 30

        const maintenanceTarget = itemTargetDays * (item.dailyConsumption || 0)
        const target            = Math.max(item.minimumStock || 0, maintenanceTarget)
        const shortage          = target - effectiveStock

        if (shortage <= 0) return null

        return {
          id:       item.id,
          name:     item.name,
          sku:      item.sku,
          quantity: Math.ceil(shortage),
          unitCost: item.cost,
        }
      })
      .filter(Boolean)

    if (itemsToRestock.length === 0) {
      return NextResponse.json({
        message:        "Box packaging inventory is healthy. No replenishment needed.",
        ordersCreated:  0,
        smartMinUpdates: minStockUpdates.length,
      })
    }

    // ── PHASE 6: Create a single PO for all boxes → Box Packaging supplier ────
    const pktNow      = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }))
    const expectedDate = addDays(startOfDay(pktNow), 7) // 1-week lead time for box packaging
    const poNumber    = generatePONumber()
    const totalValue  = itemsToRestock.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId:  BOX_SUPPLIER_ID,
        expectedDate,
        totalValue,
        createdById: userId,
        notes:       `Automated box packaging replenishment — ${itemsToRestock.length} SKU(s).`,
        items: {
          create: itemsToRestock.map((item) => ({
            itemType:      "finished_good",
            finishedGoodId: item.id,
            quantity:      item.quantity,
            unitCost:      item.unitCost,
            totalCost:     item.quantity * item.unitCost,
          })),
        },
      },
    })

    return NextResponse.json({
      message:         "Box packaging auto-replenishment complete.",
      smartMinUpdates: minStockUpdates.length,
      orders: [
        {
          poNumber:     purchaseOrder.poNumber,
          supplier:     "Box Packaging",
          itemCount:    itemsToRestock.length,
          totalValue:   purchaseOrder.totalValue,
          expectedDate: purchaseOrder.expectedDate,
          items:        itemsToRestock.map((i) => ({ sku: i.sku, name: i.name, qty: i.quantity })),
        },
      ],
      totalOrderValue: purchaseOrder.totalValue,
    })
  } catch (error) {
    console.error("Error in box auto-replenish:", error)
    return NextResponse.json({ error: "Failed to run box packaging replenishment" }, { status: 500 })
  }
}
