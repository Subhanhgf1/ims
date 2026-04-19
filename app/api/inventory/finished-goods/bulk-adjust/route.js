export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/inventory/finished-goods/bulk-adjust
 *
 * Accepts a mixed payload — each item can carry:
 *   - quantity adjustments  (type, quantity, reason)
 *   - field edits           (price, cost, locationId, categoryId, minimumStock)
 *
 * Both operations can be present on the same item in a single request.
 */
export async function POST(request) {
  try {
    const { adjustments, userId, reference } = await request.json()

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ error: "Adjustments array is required" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // ── Fetch all targeted items in one query ──────────────────────────────
    const itemIds = adjustments.map((adj) => adj.id)
    const items = await prisma.finishedGood.findMany({
      where: { id: { in: itemIds } },
    })
    const itemMap = new Map(items.map((item) => [item.id, item]))

    const updateQueries = []
    const adjustmentQueries = []

    for (const adj of adjustments) {
      const { id, type, quantity, reason, fields } = adj

      const item = itemMap.get(id)
      if (!item) {
        return NextResponse.json({ error: `Item ${id} not found` }, { status: 404 })
      }

      // ── Build the prisma data object ─────────────────────────────────────
      const updateData = {}

      // 1. Field edits (price, cost, locationId, categoryId, minimumStock)
      if (fields && typeof fields === "object") {
        const ALLOWED_FIELDS = ["price", "cost", "locationId", "categoryId", "minimumStock", "receivedAs"]
        for (const key of ALLOWED_FIELDS) {
          if (fields[key] !== undefined && fields[key] !== "") {
            // coerce numeric fields
            if (["price", "cost"].includes(key)) {
              const num = parseFloat(fields[key])
              if (isNaN(num) || num < 0) {
                return NextResponse.json(
                  { error: `Invalid value for "${key}" on item ${id}` },
                  { status: 400 }
                )
              }
              updateData[key] = num
            } else if (key === "minimumStock") {
              const num = parseInt(fields[key], 10)
              if (isNaN(num) || num < 0) {
                return NextResponse.json(
                  { error: `Invalid value for "minimumStock" on item ${id}` },
                  { status: 400 }
                )
              }
              updateData[key] = num
            } else {
              // locationId, categoryId — treat "none" as explicit null
              updateData[key] = fields[key] === "none" ? null : fields[key]
            }
          }
        }
      }

      // 2. Quantity adjustment
      if (type && quantity !== undefined) {
        if (!reason || !reason.trim()) {
          return NextResponse.json(
            { error: `Reason is required for quantity adjustment on item ${id}` },
            { status: 400 }
          )
        }

        const qty = parseInt(quantity, 10)
        if (isNaN(qty) || qty <= 0) {
          return NextResponse.json(
            { error: `Invalid quantity for item ${id}` },
            { status: 400 }
          )
        }

        if (type === "INCREASE") {
          updateData.quantity = item.quantity + qty
        } else if (type === "DECREASE") {
          const next = item.quantity - qty
          if (next < 0) {
            return NextResponse.json(
              { error: `Insufficient stock for item ${id}` },
              { status: 400 }
            )
          }
          updateData.quantity = next
        } else {
          return NextResponse.json(
            { error: `Invalid adjustment type "${type}" for item ${id}` },
            { status: 400 }
          )
        }

        // Log the adjustment record
        adjustmentQueries.push(
          prisma.inventoryAdjustment.create({
            data: {
              type,
              quantity: qty,
              reason: reason.trim(),
              reference: reference || `Bulk adjustment ${new Date().toISOString()}`,
              userId,
              finishedGoodId: id,
            },
            include: { user: { select: { name: true } } },
          })
        )
      }

      // Only push an update if there's something to change
      if (Object.keys(updateData).length > 0) {
        updateQueries.push(
          prisma.finishedGood.update({
            where: { id },
            data: updateData,
          })
        )
      }
    }

    if (updateQueries.length === 0 && adjustmentQueries.length === 0) {
      return NextResponse.json(
        { error: "No valid changes detected. Provide quantity adjustments or field edits." },
        { status: 400 }
      )
    }

    // ── Atomic transaction ─────────────────────────────────────────────────
    const results = await prisma.$transaction([...updateQueries, ...adjustmentQueries])

    const updatedItems = results.slice(0, updateQueries.length)
    const adjustmentsCreated = results.slice(updateQueries.length)

    return NextResponse.json({
      items: updatedItems,
      adjustments: adjustmentsCreated,
      summary: {
        itemsUpdated: updatedItems.length,
        adjustmentsLogged: adjustmentsCreated.length,
      },
    })
  } catch (error) {
    console.error("Error in bulk-adjust:", error)
    return NextResponse.json(
      { error: error.message || "Failed to bulk adjust inventory" },
      { status: 500 }
    )
  }
}