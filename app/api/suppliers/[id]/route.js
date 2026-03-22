export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { name, email, phone, address, rating } = data

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        rating: rating ? Number.parseFloat(rating) : 0,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if supplier has any associated records
    const rawMaterials = await prisma.rawMaterial.count({
      where: { supplierId: id },
    })

    const purchaseOrders = await prisma.purchaseOrder.count({
      where: { supplierId: id },
    })

    if (rawMaterials > 0 || purchaseOrders > 0) {
      return NextResponse.json({ error: "Cannot delete supplier with associated records" }, { status: 400 })
    }

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 })
  }
}
