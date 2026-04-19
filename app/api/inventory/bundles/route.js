import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const bundles = await prisma.productBundle.findMany({
      include: {
        items: {
          include: {
            finishedGood: {
              select: { id: true, name: true, sku: true, unit: true, quantity: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(bundles)
  } catch (error) {
    console.error("Error fetching bundles:", error)
    return NextResponse.json({ error: "Failed to fetch bundles" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { name, sku, description, price, cost, status, items, components, unit, minimumStock, locationId, receivedAs } = data
    const finalItems = items || components

    if (!name || !sku || !finalItems || !Array.isArray(finalItems)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const bundle = await prisma.productBundle.create({
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
        receivedAs: receivedAs || "FINISHED",
        items: {
          create: finalItems.map(item => ({
            finishedGoodId: item.finishedGoodId,
            quantity: Number.parseInt(item.quantity) || 1
          }))
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

    return NextResponse.json(bundle, { status: 201 })
  } catch (error) {
    console.error("Error creating bundle:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bundle SKU already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 })
  }
}
