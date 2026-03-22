import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { type, quantity, reason, reference, userId } = await request.json()

    if (!type || !quantity || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Get current item
        const item = await tx.rawMaterial.findUnique({
          where: { id },
        })

        if (!item) {
          throw new Error("Item not found")
        }

        // Calculate new quantity
        let newQuantity = item.quantity
        if (type === "INCREASE") {
          newQuantity += qty
        } else if (type === "DECREASE") {
          newQuantity -= qty
          if (newQuantity < 0) {
            throw new Error("Insufficient stock for decrease adjustment")
          }
        } else {
          throw new Error("Invalid adjustment type")
        }

        // Update item quantity
        const updatedItem = await tx.rawMaterial.update({
          where: { id },
          data: { quantity: newQuantity },
        })

        // Create adjustment record
        const adjustment = await tx.inventoryAdjustment.create({
          data: {
            type,
            quantity: qty,
            reason,
            reference,
            userId,
            rawMaterialId: id,
          },
          include: {
            user: { select: { name: true } },
          },
        })

        return { item: updatedItem, adjustment }
      },
      {
        maxWait: 5000,   // wait max 5s for a connection
        timeout: 20000,  // allow up to 20s for this transaction
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error adjusting inventory:", error)
    return NextResponse.json(
      { error: error.message || "Failed to adjust inventory" },
      { status: 500 }
    )
  }
}
