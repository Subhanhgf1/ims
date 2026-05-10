export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params
    const finishedGood = await prisma.finishedGood.findUnique({
      where: { id },
      include: {
        location: {
          select: { code: true, zone: true },
        },
      },
    })

    if (!finishedGood) {
      return NextResponse.json({ error: "Finished good not found" }, { status: 404 })
    }

    return NextResponse.json(finishedGood)
  } catch (error) {
    console.error("Error fetching finished good:", error)
    return NextResponse.json({ error: "Failed to fetch finished good" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { 
      name, sku, description, unit, cost, price, 
      minimumStock, locationId, imageUrl, categoryId,
      isBundle, components, receivedAs 
    } = data

    const finishedGood = await prisma.finishedGood.update({
      where: { id },
      data: {
        name: name?.trim(),
        sku,
        description,
        unit,
        cost: Number.parseFloat(cost) || 0,
        price: Number.parseFloat(price) || 0,
        minimumStock: Number.parseInt(minimumStock) || 0,
        locationId: locationId || null,
        imageUrl: imageUrl || null,
        categoryId: categoryId || null,
        receivedAs: receivedAs || "FINISHED",
      },
      include: {
        location: {
          select: { code: true, zone: true },
        },
      },
    })

    return NextResponse.json(finishedGood)
  } catch (error) {
    console.error("Error updating finished good:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update finished good" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    await prisma.finishedGood.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Finished good deleted successfully" })
  } catch (error) {
    console.error("Error deleting finished good:", error)
    return NextResponse.json({ error: "Failed to delete finished good" }, { status: 500 })
  }
}
