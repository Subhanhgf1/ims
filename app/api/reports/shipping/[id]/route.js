export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { name: true, email: true } },
        items: {
          include: {
            finishedGood: { select: { name: true, sku: true, unit: true } },
            rawMaterial: { select: { name: true, sku: true, unit: true } },
          },
        },
      },
    })

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 })
    }

    const totalOrdered = salesOrder.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalShipped = salesOrder.items.reduce((sum, item) => sum + (item.shipped || 0), 0)

    const reportData = {
      salesOrder,
      summary: {
        totalItems: salesOrder.items.length,
        totalOrdered,
        totalShipped,
        completionPercentage: totalOrdered > 0
          ? Math.round((totalShipped / totalOrdered) * 100)
          : 0,
        totalValue: salesOrder.totalValue,
      },
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating shipping report:", error)
    return NextResponse.json({ error: "Failed to generate shipping report" }, { status: 500 })
  }
}