export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const finishedGoods = await prisma.finishedGood.findMany({
      include: {
        location: {
          select: { code: true, zone: true },
        },
        category: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        }
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(finishedGoods)
  } catch (error) {
    console.error("Error fetching finished goods:", error)
    return NextResponse.json({ error: "Failed to fetch finished goods" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { 
      name, sku, description, unit, cost, price, 
      minimumStock, locationId, imageUrl, 
      isBundle, components, receivedAs // components: [{id, quantity}]
    } = data

    if (!name || !sku || !unit || cost === undefined || price === undefined || !locationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const finishedGood = await prisma.finishedGood.create({
      data: {
        name,
        sku,
        description,
        unit,
        cost: Number.parseFloat(cost),
        price: Number.parseFloat(price),
        minimumStock: Number.parseInt(minimumStock) || 0,
        locationId,
        imageUrl: imageUrl || null,
        receivedAs,
      },
      include: {
        location: {
          select: { code: true, zone: true },
        }
      },
    })

    return NextResponse.json(finishedGood, { status: 201 })
  } catch (error) {
    console.error("Error creating finished good:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create finished good" }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 })
    }

    await prisma.finishedGood.deleteMany({
      where: {
        id: { in: ids },
      },
    })

    return NextResponse.json({ message: "Finished goods deleted successfully" })
  } catch (error) {
    console.error("Error deleting finished goods:", error)
    return NextResponse.json({ error: "Failed to delete finished goods" }, { status: 500 })
  }
}

