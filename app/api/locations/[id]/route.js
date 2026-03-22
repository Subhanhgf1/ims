import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { code, zone, type, capacity } = data

    if (!code || !zone || !type || !capacity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        code,
        zone,
        type,
        capacity: Number.parseInt(capacity),
      },
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error("Error updating location:", error)
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if location is used by any inventory items
    const rawMaterials = await prisma.rawMaterial.count({
      where: { locationId: id },
    })

    const finishedGoods = await prisma.finishedGood.count({
      where: { locationId: id },
    })

    if (rawMaterials > 0 || finishedGoods > 0) {
      return NextResponse.json({ error: "Cannot delete location that contains inventory items" }, { status: 400 })
    }

    await prisma.location.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Location deleted successfully" })
  } catch (error) {
    console.error("Error deleting location:", error)
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 })
  }
}
