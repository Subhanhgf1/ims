import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePONumber } from "@/lib/utils"
import { addDays, startOfDay } from "date-fns"

export const dynamic = "force-dynamic"

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
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

    // 2. Identify items that need replenishment
    const itemsToRestock = finishedGoods
      .map((item) => {
        const maintenanceTarget = (item.targetDays || 0) * (item.dailyConsumption || 0)
        const target = Math.max(item.minimumStock, maintenanceTarget)
        const shortage = target - item.quantity

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

    // 3. Calculate overall expected date (furthest lead time)
    const maxLeadTime = Math.max(...itemsToRestock.map((i) => i.leadTimeDays))
    const expectedDate = addDays(startOfDay(new Date()), maxLeadTime)

    // 4. Create the Purchase Order
    const poNumber = generatePONumber()
    const totalValue = itemsToRestock.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: DEFAULT_SUPPLIER_ID,
        expectedDate,
        totalValue,
        createdById: userId,
        notes: "Automated replenishment based on target maintenance days and safety stock.",
        items: {
          create: itemsToRestock.map((item) => ({
            itemType: "finished_good",
            finishedGoodId: item.id,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
          })),
        },
      },
    })

    return NextResponse.json({
      message: "Smart replenishment complete",
      poNumber: purchaseOrder.poNumber,
      itemCount: itemsToRestock.length,
      totalValue,
      expectedDate: purchaseOrder.expectedDate,
    })
  } catch (error) {
    console.error("Error in auto-replenish:", error)
    return NextResponse.json({ error: "Failed to run auto-replenishment" }, { status: 500 })
  }
}
