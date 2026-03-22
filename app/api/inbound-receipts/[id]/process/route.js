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

    // Get the receipt with items
    const receipt = await prisma.inboundReceipt.findUnique({
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

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    if (receipt.status !== "PENDING") {
      return NextResponse.json({ error: "Receipt already processed" }, { status: 400 })
    }

    // Process each item
    for (const processItem of items) {
      const receiptItem = receipt.items.find((item) => item.id === processItem.itemId)
      if (!receiptItem) continue

      const processedQuantity = Number.parseInt(processItem.processedQuantity) || 0
      if (processedQuantity <= 0) continue

      // Update inventory
      if (receiptItem.itemType === "raw_material" && receiptItem.rawMaterial) {
        await prisma.rawMaterial.update({
          where: { id: receiptItem.rawMaterial.id },
          data: {
            quantity: { increment: processedQuantity },
            locationId: processItem.locationId || receiptItem.rawMaterial.locationId,
          },
        })

        // Create inventory adjustment record
        await prisma.inventoryAdjustment.create({
          data: {
            type: "INCREASE",
            quantity: processedQuantity,
            reason: `Inbound receipt processing - ${receipt.receiptNumber}`,
            reference: receipt.receiptNumber,
            userId,
            rawMaterialId: receiptItem.rawMaterial.id,
          },
        })
      } else if (receiptItem.itemType === "finished_good" && receiptItem.finishedGood) {
        await prisma.finishedGood.update({
          where: { id: receiptItem.finishedGood.id },
          data: {
            quantity: { increment: processedQuantity },
            locationId: processItem.locationId || receiptItem.finishedGood.locationId,
          },
        })

        // Create inventory adjustment record
        await prisma.inventoryAdjustment.create({
          data: {
            type: "INCREASE",
            quantity: processedQuantity,
            reason: `Inbound receipt processing - ${receipt.receiptNumber}`,
            reference: receipt.receiptNumber,
            userId,
            finishedGoodId: receiptItem.finishedGood.id,
          },
        })
      }
    }

    // Update receipt status
    await prisma.inboundReceipt.update({
      where: { id },
      data: { status: "PROCESSED" },
    })

    return NextResponse.json({ message: "Receipt processed successfully" })
  } catch (error) {
    console.error("Error processing inbound receipt:", error)
    return NextResponse.json({ error: "Failed to process receipt" }, { status: 500 })
  }
}
