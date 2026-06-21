import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateSONumber } from "@/lib/utils"
import { addDays, startOfDay } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET(request) {
  return handleLiquidation(request)
}

export async function POST(request) {
  return handleLiquidation(request)
}

async function handleLiquidation(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const isCronTrigger = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    let userId;

    if (isCronTrigger) {
      userId = process.env.SYSTEM_USER_ID;
    } else {
      const body = await request.json().catch(() => ({}));
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json(
        { error: isCronTrigger ? "SYSTEM_USER_ID environment variable is not configured" : "User ID is required" },
        { status: 400 }
      )
    }

    const EXCLUDED_CATEGORY_ID = "cmnlnckyn0000ky0410u4tvrv"
    const OVERSTOCK_CUSTOMER_ID = "cmozrsym70001k004kbnyocdz"

    // Fetch finished goods excluding the excluded category
    const finishedGoods = await prisma.finishedGood.findMany({
      where: {
        NOT: { categoryId: EXCLUDED_CATEGORY_ID },
      },
      include: { inventorySettings: true },
    })

    const itemsToLiquidate = finishedGoods
      .map((item) => {
        let maxLevel = item.inventorySettings?.maxStockLevel
        if (!maxLevel || maxLevel <= 0) {
          maxLevel = (item.minimumStock || 0) * 1.5
        }
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
      const shipDate = addDays(startOfDay(pktNow), 1)

      const salesOrder = await prisma.salesOrder.create({
        data: {
          soNumber,
          customerId: OVERSTOCK_CUSTOMER_ID,
          shipDate,
          totalValue,
          createdById: userId,
          notes: `Automated overstock liquidation to warehouse (monthly).`,
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
        shipDate: salesOrder.shipDate,
      })
    }

    return NextResponse.json({
      message: itemsToLiquidate.length > 0 ? "Overstock liquidation created" : "No overstock to liquidate",
      salesOrders: createdSalesOrders,
      totalLiquidationValue: createdSalesOrders.reduce((sum, o) => sum + o.totalValue, 0),
    })
  } catch (error) {
    console.error("Error in auto-liquidate:", error)
    return NextResponse.json({ error: "Failed to run auto-liquidation" }, { status: 500 })
  }
}
