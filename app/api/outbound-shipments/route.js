import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateShipmentNumber } from "@/lib/utils"

export async function GET() {
  try {
    const shipments = await prisma.outboundShipment.findMany({
      include: {
        customer: {
          select: { name: true },
        },
        createdBy: {
          select: { name: true },
        },
        items: {
          include: {
            rawMaterial: {
              select: { name: true, unit: true },
            },
            finishedGood: {
              select: { name: true, unit: true },
            },
            location: {
              select: { code: true, zone: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(shipments)
  } catch (error) {
    console.error("Error fetching outbound shipments:", error)
    return NextResponse.json({ error: "Failed to fetch outbound shipments" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { customerId, shipDate, shippingAddress, notes, items, createdById } = data

    if (!customerId || !shipDate || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const shipmentNumber = generateShipmentNumber()

    const shipment = await prisma.outboundShipment.create({
      data: {
        shipmentNumber,
        customerId,
        shipDate: new Date(shipDate),
        shippingAddress,
        notes,
        createdById,
        items: {
          create: items.map((item) => ({
            itemType: item.itemType,
            quantity: Number.parseInt(item.quantity),
            locationId: item.locationId,
            rawMaterialId: item.itemType === "raw_material" ? item.itemId : null,
            finishedGoodId: item.itemType === "finished_good" ? item.itemId : null,
          })),
        },
      },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: {
          include: {
            rawMaterial: { select: { name: true, unit: true } },
            finishedGood: { select: { name: true, unit: true } },
            location: { select: { code: true, zone: true } },
          },
        },
      },
    })

    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    console.error("Error creating outbound shipment:", error)
    return NextResponse.json({ error: "Failed to create outbound shipment" }, { status: 500 })
  }
}
