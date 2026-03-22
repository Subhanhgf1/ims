export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { rawMaterialId: id },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(adjustments)
  } catch (error) {
    console.error("Error fetching adjustments:", error)
    return NextResponse.json({ error: "Failed to fetch adjustments" }, { status: 500 })
  }
}
