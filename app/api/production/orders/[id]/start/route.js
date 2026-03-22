export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request, { params }) {
  try {
    const { id } = params

    const productionOrder = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { rawMaterial: true },
        },
      },
    })

    if (!productionOrder) {
      return NextResponse.json({ error: "Production order not found" }, { status: 404 })
    }

    if (productionOrder.status !== "PENDING") {
      return NextResponse.json({ error: "Production order is not pending" }, { status: 400 })
    }

    // Check if we have enough raw materials
    for (const item of productionOrder.items) {
      if (item.rawMaterial.quantity < item.requiredQuantity) {
        return NextResponse.json({ error: `Insufficient quantity for ${item.rawMaterial.name}` }, { status: 400 })
      }
    }

    const updatedOrder = await prisma.productionOrder.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        startDate: new Date(),
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

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error starting production order:", error)
    return NextResponse.json({ error: "Failed to start production order" }, { status: 500 })
  }
}
