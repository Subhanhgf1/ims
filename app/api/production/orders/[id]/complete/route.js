export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { producedQuantity, userId } = await request.json()

    if (!producedQuantity || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const productionOrder = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        finishedGood: true,
        items: {
          include: { rawMaterial: true },
        },
      },
    })

    if (!productionOrder) {
      return NextResponse.json({ error: "Production order not found" }, { status: 404 })
    }

    if (productionOrder.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Production order is not in progress" }, { status: 400 })
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update production order
      const updatedOrder = await tx.productionOrder.update({
        where: { id },
        data: {
          producedQuantity: Number.parseInt(producedQuantity),
          status: "COMPLETED",
          endDate: new Date(),
        },
      })

      // Consume raw materials
      for (const item of productionOrder.items) {
        const consumeQuantity = Math.floor((item.requiredQuantity * producedQuantity) / productionOrder.targetQuantity)

        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            quantity: {
              decrement: consumeQuantity,
            },
          },
        })

        await tx.productionItem.update({
          where: { id: item.id },
          data: { consumedQuantity: consumeQuantity },
        })

        // Create inventory adjustment record
        await tx.inventoryAdjustment.create({
          data: {
            type: "PRODUCTION",
            quantity: -consumeQuantity,
            reason: `Production order ${productionOrder.productionNumber}`,
            reference: productionOrder.productionNumber,
            userId,
            rawMaterialId: item.rawMaterialId,
          },
        })
      }

      // Add finished goods to inventory
      await tx.finishedGood.update({
        where: { id: productionOrder.finishedGoodId },
        data: {
          quantity: {
            increment: Number.parseInt(producedQuantity),
          },
        },
      })

      // Create inventory adjustment record for finished goods
      await tx.inventoryAdjustment.create({
        data: {
          type: "PRODUCTION",
          quantity: Number.parseInt(producedQuantity),
          reason: `Production order ${productionOrder.productionNumber}`,
          reference: productionOrder.productionNumber,
          userId,
          finishedGoodId: productionOrder.finishedGoodId,
        },
      })

      return updatedOrder
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error completing production order:", error)
    return NextResponse.json({ error: "Failed to complete production order" }, { status: 500 })
  }
}
