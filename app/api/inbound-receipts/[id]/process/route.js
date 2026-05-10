export const dynamic = "force-dynamic"

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

    // Process items in a batched transaction
    await prisma.$transaction(async (tx) => {
      const inventoryUpdates = []
      const adjustments = []

      for (const processItem of items) {
        const receiptItem = receipt.items.find((item) => item.id === processItem.itemId)
        if (!receiptItem) continue

        const processedQuantity = Number.parseInt(processItem.processedQuantity) || 0
        if (processedQuantity <= 0) continue

        // Update inventory
        let newBalance = 0;
        if (receiptItem.itemType === "raw_material" && receiptItem.rawMaterial) {
          const updatedRm = await tx.rawMaterial.update({
            where: { id: receiptItem.rawMaterial.id },
            data: {
              quantity: { increment: processedQuantity },
              locationId: processItem.locationId || receiptItem.rawMaterial.locationId,
            },
          })
          newBalance = updatedRm.quantity;

          // Prepare inventory adjustment record
          adjustments.push({
            type: "INCREASE",
            quantity: processedQuantity,
            balanceAfter: newBalance,
            reason: `Inbound receipt processing - ${receipt.receiptNumber}`,
            reference: receipt.receiptNumber,
            userId,
            rawMaterialId: receiptItem.rawMaterial.id,
          })
        } else if (receiptItem.itemType === "finished_good" && receiptItem.finishedGood) {
          const updatedFg = await tx.finishedGood.update({
            where: { id: receiptItem.finishedGood.id },
            data: {
              quantity: { increment: processedQuantity },
              locationId: processItem.locationId || receiptItem.finishedGood.locationId,
            },
          })
          newBalance = updatedFg.quantity;

          // Prepare inventory adjustment record
          adjustments.push({
            type: "INCREASE",
            quantity: processedQuantity,
            balanceAfter: newBalance,
            reason: `Inbound receipt processing - ${receipt.receiptNumber}`,
            reference: receipt.receiptNumber,
            userId,
            finishedGoodId: receiptItem.finishedGood.id,
          })
        }
      }

      // Execute all updates in batch
      await Promise.all([
        adjustments.length > 0 ? tx.inventoryAdjustment.createMany({ data: adjustments }) : Promise.resolve(),
      ])

      // Update receipt status
      await tx.inboundReceipt.update({
        where: { id },
        data: { status: "PROCESSED" },
      })
    })

    return NextResponse.json({ message: "Receipt processed successfully" })
  } catch (error) {
    console.error("Error processing inbound receipt:", error)
    return NextResponse.json({ error: "Failed to process receipt" }, { status: 500 })
  }
}
