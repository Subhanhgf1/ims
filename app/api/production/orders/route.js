export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const productionOrders = await prisma.productionOrder.findMany({
      include: {
        finishedGood: {
          select: { name: true, sku: true },
        },
        items: {
          include: {
            rawMaterial: {
              select: { name: true, sku: true, quantity: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(productionOrders)
  } catch (error) {
    console.error("Error fetching production orders:", error)
    return NextResponse.json({ error: "Failed to fetch production orders" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { finishedGoodId, targetQuantity, rawMaterials, notes } = data

    if (!finishedGoodId || !targetQuantity || !rawMaterials?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if we have enough raw materials
    for (const item of rawMaterials) {
      const rawMaterial = await prisma.rawMaterial.findUnique({
        where: { id: item.rawMaterialId },
      })

      if (!rawMaterial || rawMaterial.quantity < item.requiredQuantity) {
        return NextResponse.json(
          { error: `Insufficient quantity for ${rawMaterial?.name || "material"}` },
          { status: 400 },
        )
      }
    }

    const productionNumber = `PROD${Date.now()}`

    const productionOrder = await prisma.productionOrder.create({
      data: {
        productionNumber,
        targetQuantity: Number.parseInt(targetQuantity),
        finishedGoodId,
        notes,
        items: {
          create: rawMaterials.map((item) => ({
            rawMaterialId: item.rawMaterialId,
            requiredQuantity: Number.parseInt(item.requiredQuantity),
          })),
        },
      },
      include: {
        finishedGood: { select: { name: true, sku: true } },
        items: {
          include: {
            rawMaterial: { select: { name: true, sku: true } },
          },
        },
      },
    })

    return NextResponse.json(productionOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating production order:", error)
    return NextResponse.json({ error: "Failed to create production order" }, { status: 500 })
  }
}

