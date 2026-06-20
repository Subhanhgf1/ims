export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminNotificationOnGroup } from "@/lib/utils" // adjust path if needed

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { items, userId } = await request.json()

    if (!items?.length || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Fetch sales order
 const salesOrder = await prisma.salesOrder.findUnique({
  where: { id },
  include: {
    items: {
      include: {
        finishedGood: { select: { name: true, sku: true } }, // ✅
        rawMaterial: { select: { name: true, sku: true } },  // ✅
      },
    },
  },
})

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 })
    }

    if (!["PREPARING", "READY"].includes(salesOrder.status)) {
      return NextResponse.json(
        { error: "Sales order cannot be shipped in its current status" },
        { status: 400 }
      )
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      const shippedSummary = []
      const adjustments = []

      for (const shippedItem of items) {
        const orderItem = salesOrder.items.find((i) => i.id === shippedItem.itemId)
        if (!orderItem) continue

        const shippedQty = Number.parseInt(shippedItem.shippedQuantity)
        if (!shippedQty || shippedQty <= 0) continue

        const newShippedTotal = (orderItem.shipped || 0) + shippedQty

        // ✅ FIX 1: Await shipped count update immediately (not deferred)
        // Previously this was pushed to itemUpdates[] and batched later, causing
        // a race condition where inventory was committed but shipped stayed at 0
        await tx.salesOrderItem.update({
          where: { id: shippedItem.itemId },
          data: { shipped: { increment: shippedQty } },
        })

        // Deduct inventory
        let newBalance = 0;
        if (orderItem.finishedGoodId) {
          const updatedFg = await tx.finishedGood.update({
            where: { id: orderItem.finishedGoodId },
            data: { quantity: { decrement: shippedQty } },
          })
          newBalance = updatedFg.quantity;
        } else if (orderItem.rawMaterialId) {
          const updatedRm = await tx.rawMaterial.update({
            where: { id: orderItem.rawMaterialId },
            data: { quantity: { decrement: shippedQty } },
          })
          newBalance = updatedRm.quantity;
        }

        // ✅ FIX 2: Store positive quantity for DECREASE type (was -shippedQty which
        // violated the Int constraint and caused the whole transaction to rollback)
        const adjustment = {
          type: "DECREASE",
          quantity: shippedQty,
          balanceAfter: newBalance,
          reason: `Sales order ${salesOrder.soNumber} shipped`,
          reference: salesOrder.soNumber,
          userId,
        }

        if (orderItem.finishedGoodId) {
          adjustment.finishedGoodId = orderItem.finishedGoodId
        } else if (orderItem.rawMaterialId) {
          adjustment.rawMaterialId = orderItem.rawMaterialId
        }

        adjustments.push(adjustment)

        // Build summary
        const itemName =
          orderItem.finishedGood?.name ?? orderItem.rawMaterial?.name ?? "Unknown Item"

        const itemSku =
          orderItem.finishedGood?.sku ?? orderItem.rawMaterial?.sku ?? ""

        shippedSummary.push({
          name: itemName,
          sku: itemSku,
          qty: shippedQty,
          ordered: orderItem.quantity,
          totalShipped: newShippedTotal,
        })
      }

      if (adjustments.length > 0) {
        await tx.inventoryAdjustment.createMany({ data: adjustments })
      }

      const updatedItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: id },
      })

      const allShipped = updatedItems.every((i) => i.shipped >= i.quantity)

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: allShipped ? "SHIPPED" : "PREPARING" },
        include: {
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      })

      return {
        ...updatedOrder,
        status: allShipped ? "SHIPPED" : "PREPARING",
        shippedSummary,
      }
    }, { timeout: 30000 })

    // ✅ WhatsApp Notification
    if (result.status === "SHIPPED" || result.status === "PREPARING") {
      const divider = "─────────────────────"

      const itemLines = result.shippedSummary
        .map(
          (item) =>
            `*${item.name}*\n` +
            `  SKU: ${item.sku}\n` +
            `  Shipped: ${item.qty} unit(s)\n` +
            `  Progress: ${item.totalShipped}/${item.ordered} total`
        )
        .join("\n\n")

      const statusLabel =
        result.status === "SHIPPED"
          ? "✅ Fully Shipped"
          : "🚚 Partially Shipped"

      const message =
        `📤 *Outbound Order Shipped*\n` +
        `${divider}\n` +
        `*SO:* #${result.soNumber}\n` +
        `*Customer:* ${result.customer?.name ?? "Unknown"}\n` +
        `*Processed by:* ${result.createdBy?.name ?? "Unknown"}\n` +
        `*Time:* ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}\n` +
        `${divider}\n\n` +
        `*Items*\n\n` +
        `${itemLines}\n\n` +
        `${divider}\n` +
        `*Status:* ${statusLabel}\n\n`

      sendAdminNotificationOnGroup(message).catch((err) =>
        console.error("WhatsApp notification failed:", err)
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error shipping sales order:", error)
    return NextResponse.json(
      { error: "Failed to ship sales order" },
      { status: 500 }
    )
  }
}