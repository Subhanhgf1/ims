import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateSKU } from "@/lib/utils"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")

    const where = {
      OR: search
        ? [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }]
        : undefined,
      status: status || undefined,
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      where,
      include: {
        supplier: {
          select: { name: true },
        },
        location: {
          select: { code: true, zone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Update stock status based on quantity
    const updatedMaterials = await Promise.all(
      rawMaterials.map(async (material) => {
        let newStatus = "IN_STOCK"
        if (material.quantity === 0) {
          newStatus = "OUT_OF_STOCK"
        } else if (material.quantity <= material.minimumStock) {
          newStatus = "LOW_STOCK"
        }

        if (material.status !== newStatus) {
          await prisma.rawMaterial.update({
            where: { id: material.id },
            data: { status: newStatus },
          })
          material.status = newStatus
        }

        return material
      }),
    )

    return NextResponse.json(updatedMaterials)
  } catch (error) {
    console.error("Error fetching raw materials:", error)
    return NextResponse.json({ error: "Failed to fetch raw materials" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { name, description, unit, cost, minimumStock, supplierId, locationId } = data

    if (!name || !unit || cost === undefined || !supplierId || !locationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sku = generateSKU("RM")

    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        name,
        sku,
        description,
        unit,
        cost: Number.parseFloat(cost),
        minimumStock: Number.parseInt(minimumStock) || 0,
        supplierId,
        locationId,
      },
      include: {
        supplier: { select: { name: true } },
        location: { select: { code: true, zone: true } },
      },
    })

    return NextResponse.json(rawMaterial, { status: 201 })
  } catch (error) {
    console.error("Error creating raw material:", error)
    return NextResponse.json({ error: "Failed to create raw material" }, { status: 500 })
  }
}
