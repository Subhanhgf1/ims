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
    const items = await prisma.rawMaterial.findMany({
      where: { id: { in: itemIds } },
    })

    // Convert to map for O(1) lookup
    const itemMap = new Map(items.map((item) => [item.id, item]))

    // Prepare updates + validations
    const updateQueries = []
    const adjustmentQueries = []

    for (const adj of adjustments) {
      const { id, type, quantity, reason, fields } = adj

      const item = itemMap.get(id)
      if (!item) {
        return NextResponse.json({ error: `Item ${id} not found` }, { status: 404 })
      }

      const updateData = {}

      // 1. Field edits
      if (fields && typeof fields === "object") {
        const ALLOWED_FIELDS = ["cost", "locationId", "minimumStock", "receivedAs", "supplierId"]
        for (const key of ALLOWED_FIELDS) {
          if (fields[key] !== undefined && fields[key] !== "") {
            if (key === "cost") {
              const num = parseFloat(fields[key])
              if (!isNaN(num) && num >= 0) updateData[key] = num
            } else if (key === "minimumStock") {
              const num = parseInt(fields[key], 10)
              if (!isNaN(num) && num >= 0) updateData[key] = num
            } else {
              updateData[key] = fields[key]
            }
          }
        }
      }

      // 2. Quantity adjustment
      if (type && quantity !== undefined) {
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: `Reason is required for item ${id}` }, { status: 400 })
        }

        const qty = parseInt(quantity, 10)
        let newQuantity = item.quantity
        if (type === "INCREASE") {
          newQuantity += qty
        } else if (type === "DECREASE") {
          newQuantity -= qty
          if (newQuantity < 0) {
            return NextResponse.json({ error: `Insufficient stock for item ${id}` }, { status: 400 })
          }
        }
        updateData.quantity = newQuantity

        adjustmentQueries.push(
          prisma.inventoryAdjustment.create({
            data: {
              type,
              quantity: qty,
              reason: reason.trim(),
              reference: reference || `Bulk adjustment ${new Date().toISOString()}`,
              userId,
              rawMaterialId: id,
            },
          })
        )
      }

      if (Object.keys(updateData).length > 0) {
        updateQueries.push(
          prisma.rawMaterial.update({
            where: { id },
            data: updateData,
          })
        )
      }
    }

    // Run all updates + adjustments in a single atomic transaction
    const results = await prisma.$transaction([...updateQueries, ...adjustmentQueries])

    const updatedItems = results.slice(0, updateQueries.length)
    const adjustmentsCreated = results.slice(updateQueries.length)

    return NextResponse.json({ items: updatedItems, adjustments: adjustmentsCreated })
  } catch (error) {
    console.error("Error bulk adjusting raw materials:", error)
    return NextResponse.json({ error: error.message || "Failed to bulk adjust raw materials" }, { status: 500 })
  }
}

