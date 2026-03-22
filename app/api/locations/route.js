import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { code: "asc" },
    })

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { code, zone, type, capacity } = data

    if (!code || !zone || !type || !capacity) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const location = await prisma.location.create({
      data: {
        code,
        zone,
        type,
        capacity: Number.parseInt(capacity),
        occupied: 0,
        status: "ACTIVE",
      },
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error("Error creating location:", error)
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 })
  }
}
