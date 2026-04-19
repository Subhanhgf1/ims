export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { name, description, unit, cost, minimumStock, supplierId, locationId, receivedAs } = data

    if (!name || !unit || !supplierId || !locationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        name,
        description,
        unit,
        cost: cost ? Number.parseFloat(cost) : 0,
        minimumStock: minimumStock ? Number.parseInt(minimumStock) : 0,
        supplierId,
        locationId,
        receivedAs,
      },
      include: {
        supplier: { select: { name: true } },
        location: { select: { code: true, zone: true } },
      },
    })

    return NextResponse.json(rawMaterial)
  } catch (error) {
    console.error("Error updating raw material:", error)
    return NextResponse.json({ error: "Failed to update raw material" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if item is used in any orders or production
    const purchaseOrderItems = await prisma.purchaseOrderItem.count({
      where: { rawMaterialId: id },
    })

    const productionItems = await prisma.productionItem.count({
      where: { rawMaterialId: id },
    })

    if (purchaseOrderItems > 0 || productionItems > 0) {
      return NextResponse.json(
        { error: "Cannot delete raw material that is used in orders or production" },
        { status: 400 },
      )
    }

    await prisma.rawMaterial.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Raw material deleted successfully" })
  } catch (error) {
    console.error("Error deleting raw material:", error)
    return NextResponse.json({ error: "Failed to delete raw material" }, { status: 500 })
  }
}
