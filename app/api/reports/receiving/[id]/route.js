import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    // Fetch purchase order with all related data using Promise.all for better performance
    const [purchaseOrder, receivingRecords] = await Promise.all([
      prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          createdBy: { select: { name: true, email: true } },
          items: {
            include: {
              rawMaterial: { select: { name: true, sku: true, unit: true } },
              finishedGood: { select: { name: true, sku: true, unit: true } },
            },
          },
        },
      }),
      prisma.receivingRecord.findMany({
        where: { purchaseOrderId: id },
        include: {
          user: { select: { name: true } },
          rawMaterial: { select: { name: true, sku: true } },
          finishedGood: { select: { name: true, sku: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    // Generate report data
    const reportData = {
      purchaseOrder,
      receivingRecords,
      summary: {
        totalItems: purchaseOrder.items.length,
        totalOrdered: purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0),
        totalReceived: purchaseOrder.items.reduce((sum, item) => sum + item.received, 0),
        completionPercentage: Math.round(
          (purchaseOrder.items.reduce((sum, item) => sum + item.received, 0) /
            purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0)) *
            100,
        ),
        totalValue: purchaseOrder.totalValue,
      },
      generatedAt: new Date().toISOString(),
    }

    // Return JSON data for PDF generation on frontend
    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating receiving report:", error)
    return NextResponse.json({ error: "Failed to generate receiving report" }, { status: 500 })
  }
}
