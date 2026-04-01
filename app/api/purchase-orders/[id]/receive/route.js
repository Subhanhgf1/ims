export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminNotificationOnGroup } from "@/lib/utils"
import { se } from "date-fns/locale"
import { send } from "process"

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

    // Fetch PO, its items (with names), the user, and the supplier in one shot
    const [purchaseOrder, user] = await Promise.all([
      prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              rawMaterial: { select: { name: true, sku: true } },
              finishedGood: { select: { name: true, sku: true } },
            },
          },
          supplier: { select: { name: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
    ])

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const poItemUpdates = []
      const receivingData = []
      const inventoryOps = []
      const receivedSummary = []

      for (const receivedItem of items) {
        const poItem = purchaseOrder.items.find((i) => i.id === receivedItem.itemId)
        if (!poItem) continue

        const receivedQuantity = Number.parseInt(receivedItem.receivedQuantity) || 0
        if (receivedQuantity <= 0) continue

        const newReceivedTotal = poItem.received + receivedQuantity

        poItemUpdates.push(
          tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { received: newReceivedTotal },
          })
        )

        receivingData.push({
          purchaseOrderId: id,
          quantity: receivedQuantity,
          receivedDate: new Date(),
          notes: receivedItem.notes || "",
          userId,
          rawMaterialId: poItem.rawMaterialId,
          finishedGoodId: poItem.finishedGoodId,
        })

        // Resolve item name and SKU from the included relation
        const itemName = poItem.rawMaterial?.name ?? poItem.finishedGood?.name ?? "Unknown Item"
        const itemSku  = poItem.rawMaterial?.sku  ?? poItem.finishedGood?.sku  ?? ""

        receivedSummary.push({
          name: itemName,
          sku: itemSku,
          qty: receivedQuantity,
          ordered: poItem.quantity,
          totalReceived: newReceivedTotal,
        })

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

      await Promise.all([
        ...poItemUpdates,
        ...inventoryOps,
        receivingData.length > 0
          ? tx.receivingRecord.createMany({ data: receivingData })
          : Promise.resolve(),
      ])

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      })

      const allReceived  = updatedItems.every((item) => item.received >= item.quantity)
      const someReceived = updatedItems.some((item) => item.received > 0)

      const newStatus = allReceived
        ? "RECEIVED"
        : someReceived
        ? "PARTIALLY_RECEIVED"
        : "PENDING"

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      })

      return { success: true, status: newStatus, receivedSummary }
    }, { timeout: 30000 })

    if (result.status === "RECEIVED" || result.status === "PARTIALLY_RECEIVED") {
      const divider = "─────────────────────"

      const itemLines = result.receivedSummary
        .map((item) =>
          `*${item.name}*\n` +
          `  SKU: ${item.sku}\n` +
          `  Received: ${item.qty} unit(s)\n` +
          `  Progress: ${item.totalReceived}/${item.ordered} total`
        )
        .join("\n\n")

      const statusLabel =
        result.status === "RECEIVED" ? "✅ Fully Received" : "🔄 Partially Received"

      const message =
        `📦 *Inv Inbound Received*\n` +
        `${divider}\n` +
        `*PO:* #${purchaseOrder.poNumber}\n` +
        `*Supplier:* ${purchaseOrder.supplier.name}\n` +
        `*Received by:* ${user?.name ?? "Unknown"}\n` +
        `*Time:* ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}\n` +
        `${divider}\n\n` +
        `*Items*\n\n` +
        `${itemLines}\n\n` +
        `${divider}\n` +
        `*Status:* ${statusLabel}\n\n`

        // console.log("Prepared WhatsApp message:", message)
      sendAdminNotificationOnGroup(message).catch((err) =>
        console.error("WhatsApp notification failed:", err)
      )
    }

    return NextResponse.json({ success: result.success, status: result.status })
  } catch (error) {
    console.error("Error receiving items:", error)
    return NextResponse.json({ error: error.message || "Failed to receive items" }, { status: 500 })
  }
}