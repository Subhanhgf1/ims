import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePONumber } from "@/lib/utils"

export async function GET() {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: {
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
          },
        },
        receivingRecords: {
          include: {
            user: { select: { name: true } },
            rawMaterial: { select: { name: true } },
            finishedGood: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    console.log ("here is data", data)
    const { supplierId, expectedDate, notes, items } = data

    if (!supplierId || !expectedDate || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the first user as default
    const defaultUser = await prisma.user.findFirst()
    if (!defaultUser) {
      return NextResponse.json({ error: "No users found in system" }, { status: 400 })
    }

    const poNumber = generatePONumber()

    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        expectedDate: new Date(expectedDate),
        notes,
        totalValue,
        createdById: defaultUser.id,
        items: {
          create: items.map((item) => ({
            itemType: item.itemType,
            quantity: Number.parseInt(item.quantity),
            unitCost: Number.parseFloat(item.unitCost),
            totalCost: Number.parseInt(item.quantity) * Number.parseFloat(item.unitCost),
            rawMaterialId: item.itemType === "raw_material" ? item.itemId : null,
            finishedGoodId: item.itemType === "finished_good" ? item.itemId : null,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: {
          include: {
            rawMaterial: { select: { name: true, unit: true } },
            finishedGood: { select: { name: true, unit: true } },
          },
        },
      },
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
