import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
            rawMaterial: { select: { name: true, unit: true } },
            finishedGood: { select: { name: true, unit: true } },
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

    // Transform result → add receivedDates array
    const transformedOrders = purchaseOrders.map((order) => {
      const receivingInfo = order.receivingRecords.map((r) => ({
        date: r.receivedDate,
        notes: r.notes,
      }))

      return {
        ...order,
        receivedDates: receivingInfo, // always an array, even if only 1 record
      }
    })

    return NextResponse.json(transformedOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    )
  }
}



export async function POST(request, { params }) {
  try {
    const { id } = params
    const { items, userId } = await request.json()

    if (!items?.length || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Fetch PO outside transaction (faster)
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const poItemUpdates = []
      const receivingData = []
      const inventoryOps = []

      for (const receivedItem of items) {
        const poItem = purchaseOrder.items.find((i) => i.id === receivedItem.itemId)
        if (!poItem) continue

        const receivedQuantity = Number.parseInt(receivedItem.receivedQuantity) || 0
        if (receivedQuantity <= 0) continue

        const newReceivedTotal = poItem.received + receivedQuantity

        // Update PO item received quantity
        poItemUpdates.push(
          tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { received: newReceivedTotal },
          })
        )

        // Collect receiving record for bulk insert
        receivingData.push({
          purchaseOrderId: id,
          quantity: receivedQuantity,
          receivedDate: new Date(),
          notes: receivedItem.notes || "",
          userId,
          rawMaterialId: poItem.rawMaterialId,
          finishedGoodId: poItem.finishedGoodId,
        })

        // Inventory updates
        if (poItem.rawMaterialId) {
          inventoryOps.push(
            tx.rawMaterial.update({
              where: { id: poItem.rawMaterialId },
              data: { quantity: { increment: receivedQuantity } },
            })
          )
        } else if (poItem.finishedGoodId) {
          inventoryOps.push(
            tx.finishedGood.update({
              where: { id: poItem.finishedGoodId },
              data: { quantity: { increment: receivedQuantity } },
            })
          )
        }
      }

      // Execute in parallel
      await Promise.all([
        ...poItemUpdates,
        ...inventoryOps,
        receivingData.length > 0
          ? tx.receivingRecord.createMany({ data: receivingData })
          : Promise.resolve(),
      ])

      // Check updated PO items
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      })

      const allReceived = updatedItems.every((item) => item.received >= item.quantity)
      const someReceived = updatedItems.some((item) => item.received > 0)

      const newStatus = allReceived
        ? "RECEIVED"
        : someReceived
        ? "PARTIALLY_RECEIVED"
        : "PENDING"

      // Update PO status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      })

      return { success: true, status: newStatus }
    }, { timeout: 30000 }) // prevent Prisma timeout

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error receiving items:", error)
    return NextResponse.json({ error: error.message || "Failed to receive items" }, { status: 500 })
  }
}

