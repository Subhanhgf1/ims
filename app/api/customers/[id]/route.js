export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { name, email, phone, address } = data

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if customer has any associated records
    const salesOrders = await prisma.salesOrder.count({
      where: { customerId: id },
    })

    if (salesOrders > 0) {
      return NextResponse.json({ error: "Cannot delete customer with associated sales orders" }, { status: 400 })
    }

    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
