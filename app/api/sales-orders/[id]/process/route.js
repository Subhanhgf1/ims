import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { items, userId } = data

    if (!items?.length) {
      return NextResponse.json({ error: "No items to process" }, { status: 400 })
    }

    // Get the sales order with items
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            finishedGood: true,
            rawMaterial: true,
          },
        },
      },
    })

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 })
    }

    if (salesOrder.status !== "PREPARING") {
      return NextResponse.json({ error: "Sales order already processed" }, { status: 400 })
    }

    // ✅ Validate inventory availability
    for (const processItem of items) {
      const orderItem = salesOrder.items.find((item) => item.id === processItem.itemId)
      if (!orderItem) continue

      const processedQuantity = Number(processItem.processedQuantity) || 0
      if (processedQuantity <= 0) continue

      const invItem = orderItem.finishedGood || orderItem.rawMaterial
      if (!invItem) {
        return NextResponse.json({ error: "Invalid item in sales order" }, { status: 400 })
      }

      if (invItem.quantity < processedQuantity) {
        return NextResponse.json(
          { error: `Insufficient inventory for ${invItem.name}` },
          { status: 400 },
        )
      }
    }

    // ✅ Process each item (allocate inventory)
    for (const processItem of items) {
      const orderItem = salesOrder.items.find((item) => item.id === processItem.itemId)
      if (!orderItem) continue

      const processedQuantity = Number(processItem.processedQuantity) || 0
      if (processedQuantity <= 0) continue

      const invItem = orderItem.finishedGood || orderItem.rawMaterial
      if (!invItem) continue

      // Update location if specified
      if (processItem.locationId && processItem.locationId !== invItem.locationId) {
        if (orderItem.finishedGood) {
          await prisma.finishedGood.update({
            where: { id: invItem.id },
            data: { locationId: processItem.locationId },
          })
        } else if (orderItem.rawMaterial) {
          await prisma.rawMaterial.update({
            where: { id: invItem.id },
            data: { locationId: processItem.locationId },
          })
        }
      }

      // Create inventory adjustment
      await prisma.inventoryAdjustment.create({
        data: {
          type: "TRANSFER",
          quantity: processedQuantity,
          reason: `Sales order processing - ${salesOrder.soNumber}`,
          reference: salesOrder.soNumber,
          userId,
          finishedGoodId: orderItem.finishedGood ? invItem.id : null,
          rawMaterialId: orderItem.rawMaterial ? invItem.id : null,
        },
      })
    }

    // ✅ Update sales order status
    await prisma.salesOrder.update({
      where: { id },
      data: { status: "READY" },
    })

    return NextResponse.json({ message: "Sales order processed successfully" })
  } catch (error) {
    console.error("Error processing sales order:", error)
    return NextResponse.json({ error: "Failed to process sales order" }, { status: 500 })
  }
}
