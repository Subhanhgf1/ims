export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { customerId, shipDate, priority, notes, items } = data

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    if (existing.status === "SHIPPED" || existing.status === "DELIVERED") {
      return NextResponse.json({ error: "Cannot edit a shipped or delivered order" }, { status: 400 })
    }

    const totalValue = items.reduce((sum, item) => sum + item.quantity * (item.unitPrice || 0), 0)

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: id } })

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId,
        shipDate: new Date(shipDate),
        priority,
        notes,
        totalValue,
        items: {
          create: items.map((item) => {
            const quantity = Number(item.quantity)
            const unitPrice = Number(item.unitPrice) || 0
            const base = { quantity, unitPrice, totalPrice: quantity * (unitPrice === 0 ? 1 : unitPrice) }
            if (item.itemType === "finished_good") return { ...base, finishedGoodId: item.itemId }
            return { ...base, rawMaterialId: item.itemId }
          }),
        },
      },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: {
          include: {
            finishedGood: { select: { name: true, sku: true } },
            rawMaterial: { select: { name: true, sku: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating sales order:", error)
    return NextResponse.json({ error: "Failed to update sales order" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      select: { id: true, status: true, soNumber: true },
    })

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 })
    }

    if (salesOrder.status === "SHIPPED" || salesOrder.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cannot delete an order that has already been shipped or delivered" },
        { status: 400 }
      )
    }

    // Items cascade delete via Prisma schema (onDelete: Cascade on SalesOrderItem)
    await prisma.salesOrder.delete({ where: { id } })

    return NextResponse.json({ message: `Order ${salesOrder.soNumber} deleted successfully` })
  } catch (error) {
    console.error("Error deleting sales order:", error)
    return NextResponse.json({ error: "Failed to delete sales order" }, { status: 500 })
  }
}