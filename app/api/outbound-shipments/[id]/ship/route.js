export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { items, userId } = data

    if (!items?.length) {
      return NextResponse.json({ error: "No items to ship" }, { status: 400 })
    }

    // Get the shipment with items
    const shipment = await prisma.outboundShipment.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            rawMaterial: true,
            finishedGood: true,
          },
        },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    if (shipment.status !== "PREPARING") {
      return NextResponse.json({ error: "Shipment already shipped" }, { status: 400 })
    }

    // Process each item
    for (const shipItem of items) {
      const shipmentItem = shipment.items.find((item) => item.id === shipItem.itemId)
      if (!shipmentItem) continue

      const shippedQuantity = Number.parseInt(shipItem.shippedQuantity) || 0
      if (shippedQuantity <= 0) continue

      // Update inventory
      if (shipmentItem.itemType === "raw_material" && shipmentItem.rawMaterial) {
        // Check if enough inventory is available
        if (shipmentItem.rawMaterial.quantity < shippedQuantity) {
          return NextResponse.json(
            { error: `Insufficient inventory for ${shipmentItem.rawMaterial.name}` },
            { status: 400 },
          )
        }

        await prisma.rawMaterial.update({
          where: { id: shipmentItem.rawMaterial.id },
          data: {
            quantity: { decrement: shippedQuantity },
          },
        })

        // Create inventory adjustment record
        await prisma.inventoryAdjustment.create({
          data: {
            type: "DECREASE",
            quantity: shippedQuantity,
            reason: `Outbound shipment - ${shipment.shipmentNumber}`,
            reference: shipment.shipmentNumber,
            userId,
            rawMaterialId: shipmentItem.rawMaterial.id,
          },
        })
      } else if (shipmentItem.itemType === "finished_good" && shipmentItem.finishedGood) {
        // Check if enough inventory is available
        if (shipmentItem.finishedGood.quantity < shippedQuantity) {
          return NextResponse.json(
            { error: `Insufficient inventory for ${shipmentItem.finishedGood.name}` },
            { status: 400 },
          )
        }

        await prisma.finishedGood.update({
          where: { id: shipmentItem.finishedGood.id },
          data: {
            quantity: { decrement: shippedQuantity },
          },
        })

        // Create inventory adjustment record
        await prisma.inventoryAdjustment.create({
          data: {
            type: "DECREASE",
            quantity: shippedQuantity,
            reason: `Outbound shipment - ${shipment.shipmentNumber}`,
            reference: shipment.shipmentNumber,
            userId,
            finishedGoodId: shipmentItem.finishedGood.id,
          },
        })
      }
    }

    // Update shipment status
    await prisma.outboundShipment.update({
      where: { id },
      data: { status: "SHIPPED" },
    })

    return NextResponse.json({ message: "Shipment processed successfully" })
  } catch (error) {
    console.error("Error shipping outbound shipment:", error)
    return NextResponse.json({ error: "Failed to ship items" }, { status: 500 })
  }
}
