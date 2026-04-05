export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const { name } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json(category)
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if any finished goods use this category
    const inUse = await prisma.finishedGood.count({ where: { categoryId: id } })
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${inUse} product(s) use this category` },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ message: "Category deleted" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
