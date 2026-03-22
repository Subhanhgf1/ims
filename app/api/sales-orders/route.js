export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const salesOrders = await prisma.salesOrder.findMany({
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: {
          include: {
            finishedGood: { select: { name: true, sku: true } },
            rawMaterial: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(salesOrders);
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales orders" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { customerId, shipDate, priority, items, shippingAddress, notes, createdById } = data

    if (!customerId || !shipDate || !items?.length || !createdById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check inventory availability
    for (const item of items) {
      if (item.itemType === "finished_good") {
        const finishedGood = await prisma.finishedGood.findUnique({
          where: { id: item.itemId },
        })

        if (!finishedGood || finishedGood.quantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient inventory for ${finishedGood?.name || "finished good"}` },
            { status: 400 },
          )
        }
      } else if (item.itemType === "raw_material") {
        const rawMaterial = await prisma.rawMaterial.findUnique({
          where: { id: item.itemId },
        })

        if (!rawMaterial || rawMaterial.quantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient inventory for ${rawMaterial?.name || "raw material"}` },
            { status: 400 },
          )
        }
      }
    }

    const soNumber = `SO${Date.now()}`
    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNumber,
        shipDate: new Date(shipDate),
        priority: priority || "MEDIUM",
        totalValue,
        shippingAddress,
        notes,
        customerId,
        createdById,
        items: {
          create: items.map((item) => {
            const unitPrice = Number(item.unitPrice) || 0
const quantity = Number(item.quantity) 

const base = {
  quantity,
  unitPrice,
  totalPrice: quantity * (unitPrice === 0 ? 1 : unitPrice),
}
            if (item.itemType === "finished_good") {
              return { ...base, finishedGoodId: item.itemId }
            } else if (item.itemType === "raw_material") {
              return { ...base, rawMaterialId: item.itemId }
            }
          }),
        },
      },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: {
          include: {
            finishedGood: { select: { name: true, sku: true } },
            rawMaterial: { select: { name: true, sku: true } },
          },
        },
      },
    })

    return NextResponse.json(salesOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating sales order:", error)
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 })
  }
}

