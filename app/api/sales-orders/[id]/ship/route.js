import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { items, userId } = await request.json()

    if (!items?.length || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Fetch order with items first (outside transaction to save time)
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 })
    }

    if (salesOrder.status !== "READY") {
      return NextResponse.json({ error: "Sales order is not ready for shipping" }, { status: 400 })
    }

    // Prepare DB operations
    const itemUpdates = []
    const finishedGoodUpdates = []
    const rawMaterialUpdates = []
    const adjustments = []

    for (const shippedItem of items) {
      const orderItem = salesOrder.items.find((i) => i.id === shippedItem.itemId)
      if (!orderItem) continue

      const shippedQty = Number.parseInt(shippedItem.shippedQuantity)
      if (!shippedQty) continue

      itemUpdates.push(
        prisma.salesOrderItem.update({
          where: { id: shippedItem.itemId },
          data: { shipped: { increment: shippedQty } },
        })
      )

      if (orderItem.finishedGoodId) {
        finishedGoodUpdates.push(
          prisma.finishedGood.update({
            where: { id: orderItem.finishedGoodId },
            data: { quantity: { decrement: shippedQty } },
          })
        )
      } else if (orderItem.rawMaterialId) {
        rawMaterialUpdates.push(
          prisma.rawMaterial.update({
            where: { id: orderItem.rawMaterialId },
            data: { quantity: { decrement: shippedQty } },
          })
        )
      }

      // finishedGoodUpdates.push(
      //   prisma.finishedGood.update({
      //     where: { id: orderItem.finishedGoodId },
      //     data: { quantity: { decrement: shippedQty } },
      //   })
      // )

  const adjustment = {
  type: "DECREASE",
  quantity: -shippedQty,
  reason: `Sales order ${salesOrder.soNumber} shipped`,
  reference: salesOrder.soNumber,
  userId,
}

// Attach only the relevant id
if (orderItem.finishedGoodId) {
  adjustment.finishedGoodId = orderItem.finishedGoodId
} else if (orderItem.rawMaterialId) {
  adjustment.rawMaterialId = orderItem.rawMaterialId
}

adjustments.push(adjustment)

    }

    // Run transaction with parallel updates + bulk insert
    const result = await prisma.$transaction(async (tx) => {
      // Run updates in parallel
      await Promise.all([
        ...itemUpdates.map((op) => op),
        ...finishedGoodUpdates.map((op) => op),
        ...rawMaterialUpdates.map((op) => op),
      ])

      // Insert adjustments in bulk
      if (adjustments.length > 0) {
        await tx.inventoryAdjustment.createMany({ data: adjustments })
      }

      // Check if all items are fully shipped
      const updatedItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: id },
      })

      const allShipped = updatedItems.every((item) => item.shipped >= item.quantity)

      // Update sales order status
      return tx.salesOrder.update({
        where: { id },
        data: { status: allShipped ? "SHIPPED" : "PREPARING" },
        include: {
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              finishedGood: { select: { name: true, sku: true } },
              rawMaterial: { select: { name: true, sku: true } },
            },
          },
        },
      })
    }, { timeout: 30000 }) // increase timeout just in case

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error shipping sales order:", error)
    return NextResponse.json({ error: "Failed to ship sales order" }, { status: 500 })
  }
}
