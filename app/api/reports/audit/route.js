export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page")) || 1
    const limit = parseInt(searchParams.get("limit")) || 20
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || "ALL"
    
    const skip = (page - 1) * limit

    const where = {
      AND: [
        type !== "ALL" ? { type } : {},
        search ? {
          OR: [
            { reason: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
            {
              rawMaterial: {
                name: { contains: search, mode: "insensitive" }
              }
            },
            {
              finishedGood: {
                name: { contains: search, mode: "insensitive" }
              }
            }
          ]
        } : {}
      ]
    }

    const [adjustments, total] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          rawMaterial: { select: { id: true, name: true, sku: true } },
          finishedGood: { select: { id: true, name: true, sku: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventoryAdjustment.count({ where })
    ])

    return NextResponse.json({
      data: adjustments.map(adj => ({
        id: adj.id,
        type: adj.type,
        quantity: adj.quantity,
        balanceAfter: adj.balanceAfter,
        reason: adj.reason,
        reference: adj.reference,
        createdAt: adj.createdAt,
        user: adj.user,
        item: adj.rawMaterial || adj.finishedGood,
        itemType: adj.rawMaterial ? "Raw Material" : "Finished Good"
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
