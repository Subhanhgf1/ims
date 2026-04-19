import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePONumber } from "@/lib/utils"
import { addDays, startOfDay } from "date-fns"

export const dynamic = "force-dynamic"

export async function POST(request) {
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
    const RAW_CAPACITY = 400

    // 1. Fetch all finished goods that are NOT in the excluded category
    const finishedGoods = await prisma.finishedGood.findMany({
      where: {
        NOT: {
          categoryId: EXCLUDED_CATEGORY_ID,
        },
      },
    })

    // 2. Fetch pending inbound quantities (PO items not yet received)
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

    // 3. Identify items that need replenishment
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
      })
    }

    // 3. Group by receivedAs and create separate orders
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

    return NextResponse.json({
      message: "Smart replenishment complete",
      orders: createdOrders,
      totalValue: createdOrders.reduce((sum, o) => sum + o.totalValue, 0),
    })
    } catch (error) {
    console.error("Error in auto-replenish:", error)
    return NextResponse.json({ error: "Failed to run auto-replenishment" }, { status: 500 })
  }
}
