import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    // For finished goods, usage would be from sales orders
    const usageHistory = await prisma.salesOrderItem.findMany({
      where: { finishedGoodId: id },
      include: {
        salesOrder: {
          select: {
            soNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { salesOrder: { createdAt: "desc" } },
      take: 20,
    })

    return NextResponse.json(usageHistory)
  } catch (error) {
    console.error("Error fetching usage history:", error)
    return NextResponse.json({ error: "Failed to fetch usage history" }, { status: 500 })
  }
}
