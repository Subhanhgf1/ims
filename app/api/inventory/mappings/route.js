import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const mappings = await prisma.skuMapping.findMany({
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(mappings)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { externalSku, internalSku, platform, description } = data
    
    const mapping = await prisma.skuMapping.create({
      data: {
        externalSku,
        internalSku,
        platform,
        description
      }
    })
    return NextResponse.json(mapping)
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "External SKU already mapped" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create mapping" }, { status: 500 })
  }
}
