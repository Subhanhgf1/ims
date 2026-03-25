export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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