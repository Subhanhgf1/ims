import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePONumber, generateSONumber } from "@/lib/utils"
import { addDays, startOfDay, subDays } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET(request) {
  return handleReplenish(request);
}

export async function POST(request) {
  return handleReplenish(request);
}

async function handleReplenish(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const isCronTrigger = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    let userId;

    if (isCronTrigger) {
      // Triggered by Vercel Cron
      userId = process.env.SYSTEM_USER_ID;
    } else {
      // Triggered manually from UI
      const body = await request.json().catch(() => ({}));
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json(
        { error: isCronTrigger ? "SYSTEM_USER_ID environment variable is not configured" : "User ID is required" }, 
        { status: 400 }
      );
    }

    const EXCLUDED_CATEGORY_ID = "cmnlnckyn0000ky0410u4tvrv"
    const DEFAULT_SUPPLIER_ID = "cmn26uk860002vsxwyufhrdry"
    const OVERSTOCK_CUSTOMER_ID = "cmozrsym70001k004kbnyocdz"
    const RAW_CAPACITY = 400

    // ── PHASE 1: Smart Minimum Stock Recalculation ──────────────────────────
    // Before creating any orders, recompute each item's minimumStock using
    // recent sales velocity (last 3 days) adjusted by a 30-day trend baseline.
    
    // Fetch global settings
    const prefs = await prisma.systemPreferences.findFirst()
    const SMART_TARGET_DAYS = prefs?.stockMaintenanceDays || 9
    
    const RECENT_DAYS = 3         // short window for current velocity
    const TREND_DAYS = 30         // longer window for trend baseline

    const now = new Date()
    const recentStart = subDays(now, RECENT_DAYS)
    const trendStart  = subDays(now, TREND_DAYS)

    // Fetch shipped quantities for all finished goods in both windows in parallel
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

    const recentMap = new Map(recentSales.map(s => [s.finishedGoodId, s._sum.shipped || 0]))
    const trendMap  = new Map(trendSales.map(s  => [s.finishedGoodId, s._sum.shipped || 0]))

    // ── PHASE 2: Fetch all finished goods (excluding the excluded category) ──

    const finishedGoods = await prisma.finishedGood.findMany({
      where: {
        NOT: {
          categoryId: EXCLUDED_CATEGORY_ID,
        },
      },
      include: {
        inventorySettings: true,
      },
    })

    // Build per-item smart min stock and collect DB updates
    const minStockUpdates = [] // { id, newMin, newDailyAvg }

    for (const item of finishedGoods) {
      const recentTotal = recentMap.get(item.id) || 0
      const recentDailyAvg = recentTotal / RECENT_DAYS

      const trendTotal = trendMap.get(item.id) || 0
      const trendDailyAvg = trendTotal / TREND_DAYS

      // Asymmetrical Smoothing: 
      // If spiking, react quickly to prevent outages (70% recent, 30% trend)
      // If dropping, react slowly to prevent over-stocking while filtering anomalies like weekends (30% recent, 70% trend)
      let smartDailyAvg = 0
      if (recentDailyAvg > trendDailyAvg) {
        smartDailyAvg = (recentDailyAvg * 0.7) + (trendDailyAvg * 0.3)
      } else {
        smartDailyAvg = (recentDailyAvg * 0.3) + (trendDailyAvg * 0.7)
      }

      const smartMinStock = Math.ceil(smartDailyAvg * SMART_TARGET_DAYS)

      // Allow the floor to lower or rise dynamically to prevent permanent overstocking
      if (smartMinStock !== (item.minimumStock || 0)) {
        minStockUpdates.push({
          id: item.id,
          newMin: smartMinStock,
          newDailyAvg: smartDailyAvg,
        })
      }
    }

    // Persist updated minimums to DB
    if (minStockUpdates.length > 0) {
      await Promise.all(
        minStockUpdates.map(({ id, newMin, newDailyAvg }) =>
          prisma.finishedGood.update({
            where: { id },
            data: {
              minimumStock:     newMin,
              dailyConsumption: parseFloat(newDailyAvg.toFixed(4)),
            },
          })
        )
      )

      // Mirror the new values into the in-memory list so ordering uses them
      const updateMap = new Map(minStockUpdates.map(u => [u.id, u]))
      for (const item of finishedGoods) {
        const upd = updateMap.get(item.id)
        if (upd) {
          item.minimumStock     = upd.newMin
          item.dailyConsumption = upd.newDailyAvg
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // 3. Fetch pending inbound quantities (PO items not yet received)
    const pendingPOItems = await prisma.purchaseOrderItem.findMany({
      where: {
        itemType: "finished_good",
        purchaseOrder: {
          status: { in: ["PENDING", "PARTIALLY_RECEIVED"] },
        },
      },
      select: {
        finishedGoodId: true,
        quantity: true,
        received: true,
      },
    })

    const pendingQuantities = pendingPOItems.reduce((acc, item) => {
      const pending = item.quantity - item.received
      if (pending > 0) {
        acc[item.finishedGoodId] = (acc[item.finishedGoodId] || 0) + pending
      }
      return acc
    }, {})

    // 4. Identify items that need replenishment (using freshly updated minimums)
    const itemsToRestock = finishedGoods
      .map((item) => {
        const pendingInbound = pendingQuantities[item.id] || 0
        const effectiveStock = item.quantity + pendingInbound
        
        const maintenanceTarget = (item.targetDays || 0) * (item.dailyConsumption || 0)
        const target = Math.max(item.minimumStock, maintenanceTarget)
        const shortage = target - effectiveStock

        if (shortage <= 0) return null

        // Calculate lead time for this item
        let leadTimeDays = 1 // Default for FINISHED goods
        if (item.receivedAs === "RAW") {
          const baseDelay = 2
          const volumeDelay = Math.floor(shortage / RAW_CAPACITY)
          leadTimeDays = baseDelay + volumeDelay
        }

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: Math.ceil(shortage),
          unitCost: item.cost,
          receivedAs: item.receivedAs,
          leadTimeDays,
        }
      })
      .filter(Boolean)

    if (itemsToRestock.length === 0) {
      return NextResponse.json({
        message: "Inventory is healthy. No replenishment needed.",
        ordersCreated: 0,
        smartMinUpdates: minStockUpdates.length,
      })
    }

    // 5. Group by receivedAs and create separate orders
    const groups = itemsToRestock.reduce((acc, item) => {
      if (!acc[item.receivedAs]) acc[item.receivedAs] = []
      acc[item.receivedAs].push(item)
      return acc
    }, {})

    const createdOrders = []

    for (const [receivedAs, items] of Object.entries(groups)) {
      // Calculate overall expected date for this group (furthest lead time)
      const maxLeadTime = Math.max(...items.map((i) => i.leadTimeDays))
      
      // Get current date in Pakistan timezone to avoid UTC midnight issues
      const pktNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }))
      const expectedDate = addDays(startOfDay(pktNow), maxLeadTime)

      const poNumber = generatePONumber()
      const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: DEFAULT_SUPPLIER_ID,
          expectedDate,
          totalValue,
          createdById: userId,
          notes: `Automated replenishment for ${receivedAs.toLowerCase()} goods.`,
          items: {
            create: items.map((item) => ({
              itemType: "finished_good",
              finishedGoodId: item.id,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
            })),
          },
        },
      })
      createdOrders.push({
        poNumber: purchaseOrder.poNumber,
        itemCount: items.length,
        totalValue: purchaseOrder.totalValue,
        expectedDate: purchaseOrder.expectedDate
      })
    }

    // ── PHASE 6: Overstock Liquidation (Outbound) ──────────────────────────
    // Identify items where current quantity exceeds their defined maxStockLevel.
    // Create a Sales Order for the Warehouse customer to pull the excess.

    const itemsToLiquidate = finishedGoods
      .map((item) => {
        // Use explicit maxStockLevel from settings if available
        let maxLevel = item.inventorySettings?.maxStockLevel
        
        // Fallback: If no explicit max stock is set, use 1.5x the current minimumStock (safety floor)
        // This makes the system reactive to items that have high stock but zero/low sales velocity.
        if (!maxLevel || maxLevel <= 0) {
          maxLevel = (item.minimumStock || 0) * 1.5
        }
        
        // Ensure we have a valid max level and we are actually above it
        if (maxLevel < 0) return null
        
        const excess = item.quantity - maxLevel
        if (excess <= 0) return null

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: Math.floor(excess),
          unitPrice: item.price || 0,
        }
      })
      .filter(Boolean)

    const createdSalesOrders = []
    if (itemsToLiquidate.length > 0) {
      const soNumber = generateSONumber()
      const totalValue = itemsToLiquidate.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const pktNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }))
      const shipDate = addDays(startOfDay(pktNow), 1) // 24 hours later

      const salesOrder = await prisma.salesOrder.create({
        data: {
          soNumber,
          customerId: OVERSTOCK_CUSTOMER_ID,
          shipDate,
          totalValue,
          createdById: userId,
          notes: `Automated overstock liquidation to warehouse.`,
          items: {
            create: itemsToLiquidate.map((item) => ({
              finishedGoodId: item.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      })
      
      createdSalesOrders.push({
        soNumber: salesOrder.soNumber,
        itemCount: itemsToLiquidate.length,
        totalValue: salesOrder.totalValue,
        shipDate: salesOrder.shipDate
      })
    }
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      message: itemsToLiquidate.length > 0 
        ? "Smart replenishment and overstock liquidation complete" 
        : "Smart replenishment complete",
      smartMinUpdates: minStockUpdates.length,
      orders: createdOrders,
      salesOrders: createdSalesOrders,
      totalOrderValue: createdOrders.reduce((sum, o) => sum + o.totalValue, 0),
      totalLiquidationValue: createdSalesOrders.reduce((sum, o) => sum + o.totalValue, 0),
    })
  } catch (error) {
    console.error("Error in auto-replenish:", error)
    return NextResponse.json({ error: "Failed to run auto-replenishment" }, { status: 500 })
  }
}
