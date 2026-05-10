export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { name, sku, description, unit, cost, minimumStock, supplierId, locationId, receivedAs } = data

    if (!name || !sku || !unit || !supplierId || !locationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        name: name?.trim(),
        sku,
        description,
        unit,
        cost: cost ? Number.parseFloat(cost) : 0,
        minimumStock: minimumStock ? Number.parseInt(minimumStock) : 0,
        supplierId: supplierId || null,
        locationId: locationId || null,
        receivedAs: receivedAs || "RAW",
      },
      include: {
        supplier: { select: { name: true } },
        location: { select: { code: true, zone: true } },
      },
    })

    return NextResponse.json(rawMaterial)
  } catch (error) {
    console.error("Error updating raw material:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update raw material" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    await prisma.rawMaterial.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Raw material deleted successfully" })
  } catch (error) {
    console.error("Error deleting raw material:", error)
    return NextResponse.json({ error: "Failed to delete raw material" }, { status: 500 })
  }
}
