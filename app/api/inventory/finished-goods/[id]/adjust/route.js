import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { type, quantity, reason, reference, userId } = await request.json()

    if (!type || !quantity || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Fetch item first (outside transaction, no timeout risk)
    const item = await prisma.finishedGood.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    let newQuantity = item.quantity
    if (type === "INCREASE") {
      newQuantity += quantity
    } else if (type === "DECREASE") {
      newQuantity -= quantity
      if (newQuantity < 0) {
        return NextResponse.json({ error: "Insufficient stock for decrease adjustment" }, { status: 400 })
      }
    }

    // Run both queries in a batch transaction
    const [updatedItem, adjustment] = await prisma.$transaction([
      prisma.finishedGood.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
      prisma.inventoryAdjustment.create({
        data: {
          type,
          quantity,
          reason,
          reference,
          userId,
          finishedGoodId: id,
        },
        include: {
          user: { select: { name: true } },
        },
      }),
    ])

    return NextResponse.json({ item: updatedItem, adjustment })
  } catch (error) {
    console.error("Error adjusting inventory:", error)
    return NextResponse.json({ error: error.message || "Failed to adjust inventory" }, { status: 500 })
  }
}
