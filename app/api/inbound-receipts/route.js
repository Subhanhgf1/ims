import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateReceiptNumber } from "@/lib/utils"

export async function GET() {
  try {
    const receipts = await prisma.inboundReceipt.findMany({
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
            location: {
              select: { code: true, zone: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(receipts)
  } catch (error) {
    console.error("Error fetching inbound receipts:", error)
    return NextResponse.json({ error: "Failed to fetch inbound receipts" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { supplierId, receivedDate, notes, items } = data

    if (!supplierId || !receivedDate || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the first user as default (in a real app, this would come from authentication)
    const defaultUser = await prisma.user.findFirst()
    if (!defaultUser) {
      return NextResponse.json({ error: "No users found in system" }, { status: 400 })
    }

    const receiptNumber = generateReceiptNumber()

    const receipt = await prisma.inboundReceipt.create({
      data: {
        receiptNumber,
        supplierId,
        receivedDate: new Date(receivedDate),
        notes,
        createdById: defaultUser.id,
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
        supplier: { select: { name: true } },
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

    return NextResponse.json(receipt, { status: 201 })
  } catch (error) {
    console.error("Error creating inbound receipt:", error)
    return NextResponse.json({ error: "Failed to create inbound receipt" }, { status: 500 })
  }
}
