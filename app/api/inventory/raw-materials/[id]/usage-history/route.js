import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    const usageHistory = await prisma.productionItem.findMany({
      where: { rawMaterialId: id },
      include: {
        productionOrder: {
          select: {
            productionNumber: true,
            finishedGood: { select: { name: true } },
          },
        },
      },
      orderBy: { productionOrder: { createdAt: "desc" } },
      take: 20,
    })

    return NextResponse.json(usageHistory)
  } catch (error) {
    console.error("Error fetching usage history:", error)
    return NextResponse.json({ error: "Failed to fetch usage history" }, { status: 500 })
  }
}
