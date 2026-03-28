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
      select: { status: true },
    })

    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Only PENDING orders can be edited" }, { status: 400 })
    }

    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

    // Delete existing items and recreate
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } })

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId,
        expectedDate: new Date(expectedDate),
        notes,
        totalValue,
        items: {
          create: items.map((item) => ({
            itemType: item.itemType,
            quantity: Number.parseInt(item.quantity),
            unitCost: Number.parseFloat(item.unitCost),
            totalCost: Number.parseInt(item.quantity) * Number.parseFloat(item.unitCost),
            rawMaterialId: item.itemType === "raw_material" ? item.itemId : null,
            finishedGoodId: item.itemType === "finished_good" ? item.itemId : null,
          })),
        },
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}
