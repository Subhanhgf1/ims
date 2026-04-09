import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params
    const bundle = await prisma.productBundle.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            finishedGood: true
          }
        }
      }
    })
    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }
    return NextResponse.json(bundle)
  } catch (error) {
    console.error("Error fetching bundle:", error)
    return NextResponse.json({ error: "Failed to fetch bundle" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { name, sku, description, price, cost, status, items, components, unit, minimumStock, locationId } = data
    const finalItems = items || components

    const bundle = await prisma.productBundle.update({
      where: { id },
      data: {
        name,
        sku,
        description,
        unit: unit || "pcs",
        price: Number.parseFloat(price) || 0,
        cost: Number.parseFloat(cost) || 0,
        minimumStock: Number.parseInt(minimumStock) || 0,
        locationId: locationId || null,
        status: status || "IN_STOCK",
        items: {
          deleteMany: {},
          create: finalItems?.map(item => ({
            finishedGoodId: item.finishedGoodId,
            quantity: Number.parseInt(item.quantity) || 1
          })) || []
        }
      },
      include: {
        items: {
          include: {
            finishedGood: true
          }
        }
      }
    })

    return NextResponse.json(bundle)
  } catch (error) {
    console.error("Error updating bundle:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bundle SKU already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update bundle" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    await prisma.productBundle.delete({
      where: { id }
    })
    return NextResponse.json({ message: "Bundle deleted successfully" })
  } catch (error) {
    console.error("Error deleting bundle:", error)
    return NextResponse.json({ error: "Failed to delete bundle" }, { status: 500 })
  }
}
