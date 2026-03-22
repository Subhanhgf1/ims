export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request) {
  try {
    const { adjustments, userId, reference } = await request.json()

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ error: "Adjustments array is required" }, { status: 400 })
    }

    // Fetch all items in one query for efficiency
    const itemIds = adjustments.map((adj) => adj.id)
    const items = await prisma.finishedGood.findMany({
      where: { id: { in: itemIds } },
    })

    // Convert to map for O(1) lookup
    const itemMap = new Map(items.map((item) => [item.id, item]))

    // Prepare updates + validations
    const updateQueries = []
    const adjustmentQueries = []

    for (const adj of adjustments) {
      const { id, type, quantity, reason } = adj

      if (!id || !type || !quantity || !reason) {
        return NextResponse.json({ error: `Missing required fields for item ${id}` }, { status: 400 })
      }

      const item = itemMap.get(id)
      if (!item) {
        return NextResponse.json({ error: `Item ${id} not found` }, { status: 404 })
      }

      let newQuantity = item.quantity
      if (type === "INCREASE") {
        newQuantity += quantity
      } else if (type === "DECREASE") {
        newQuantity -= quantity
        if (newQuantity < 0) {
          return NextResponse.json({ error: `Insufficient stock for item ${id}` }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: `Invalid type for item ${id}` }, { status: 400 })
      }

      // Queue updates instead of running them immediately
      updateQueries.push(
        prisma.finishedGood.update({
          where: { id },
          data: { quantity: newQuantity },
        })
      )

      adjustmentQueries.push(
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
        })
      )
    }

    // Run all updates + adjustments in a single atomic transaction
    const results = await prisma.$transaction([...updateQueries, ...adjustmentQueries])

    const updatedItems = results.slice(0, updateQueries.length)
    const adjustmentsCreated = results.slice(updateQueries.length)

    return NextResponse.json({ items: updatedItems, adjustments: adjustmentsCreated })
  } catch (error) {
    console.error("Error bulk adjusting inventory:", error)
    return NextResponse.json({ error: error.message || "Failed to bulk adjust inventory" }, { status: 500 })
  }
}

