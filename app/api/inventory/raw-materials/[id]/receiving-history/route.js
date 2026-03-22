export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request, { params }) {
  try {
    const { id } = params

    const receivingHistory = await prisma.receivingRecord.findMany({
      where: { rawMaterialId: id },
      include: {
        purchaseOrder: { select: { poNumber: true } },
        user: { select: { name: true } },
      },
      orderBy: { receivedDate: "desc" },
      take: 20,
    })

    return NextResponse.json(receivingHistory)
  } catch (error) {
    console.error("Error fetching receiving history:", error)
    return NextResponse.json({ error: "Failed to fetch receiving history" }, { status: 500 })
  }
}
