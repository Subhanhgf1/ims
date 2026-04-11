export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { supplierId, expectedDate, notes, items } = data

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    
    // Safety check: Only allow editing PENDING or PARTIALLY_RECEIVED
    if (existing.status !== "PENDING" && existing.status !== "PARTIALLY_RECEIVED") {
      return NextResponse.json({ error: "Only PENDING or PARTIALLY_RECEIVED orders can be edited" }, { status: 400 })
    }

    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

    // Transaction to safely update headers and items
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete items that were removed in the UI (only if they haven't been received)
      const incomingItemIds = items.map(i => i.id).filter(Boolean)
      const itemsToDelete = existing.items.filter(ei => !incomingItemIds.includes(ei.id))
      
      for (const item of itemsToDelete) {
        if (item.received > 0) {
          throw new Error(`Cannot remove item ${item.id} because it has already been partially received.`)
        }
      }
      
      if (itemsToDelete.length > 0) {
        await tx.purchaseOrderItem.deleteMany({
          where: { id: { in: itemsToDelete.map(i => i.id) } }
        })
      }

      // 2. Prepare items for update/create
      const itemOperations = items.map((item) => {
        const qty = Number.parseInt(item.quantity)
        const cost = Number.parseFloat(item.unitCost)
        const total = qty * cost

        // If item exists, check quantity safety
        if (item.id) {
          const existingItem = existing.items.find(ei => ei.id === item.id)
          if (existingItem && qty < existingItem.received) {
            throw new Error(`Quantity for item ${item.id} cannot be less than the received quantity (${existingItem.received}).`)
          }
        }

        const itemData = {
          itemType: item.itemType,
          quantity: qty,
          unitCost: cost,
          totalCost: total,
          rawMaterialId: item.itemType === "raw_material" ? item.itemId : null,
          finishedGoodId: item.itemType === "finished_good" ? item.itemId : null,
        }

        if (item.id) {
          return tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: itemData
          })
        } else {
          return tx.purchaseOrderItem.create({
            data: {
              ...itemData,
              purchaseOrderId: id
            }
          })
        }
      })

      await Promise.all(itemOperations)

      // 3. Update the Order Header
      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          expectedDate: new Date(expectedDate),
          notes,
          totalValue,
        },
        include: {
          supplier: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              rawMaterial: { select: { name: true, unit: true } },
              finishedGood: { select: { name: true, unit: true } },
            },
          },
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: error.message || "Failed to update purchase order" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Only PENDING orders can be deleted. Please cancel the order if it has receipts." }, { status: 400 })
    }

    await prisma.purchaseOrder.delete({ where: { id } })

    return NextResponse.json({ message: "Order deleted successfully" })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 })
  }
}
