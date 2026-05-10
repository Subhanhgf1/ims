import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    await prisma.skuMapping.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 })
  }
}
