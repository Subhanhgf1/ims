import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    let settings = await prisma.warehouseSettings.findFirst()

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.warehouseSettings.create({
        data: {
          name: "Main Distribution Center",
          code: "WH001",
          address: "123 Industrial Blvd, Manufacturing City, MC 12345",
          manager: "Warehouse Manager",
          contact: "+1-555-0100",
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching warehouse settings:", error)
    return NextResponse.json({ error: "Failed to fetch warehouse settings" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { name, code, address, manager, contact } = data

    let settings = await prisma.warehouseSettings.findFirst()

    if (settings) {
      settings = await prisma.warehouseSettings.update({
        where: { id: settings.id },
        data: { name, code, address, manager, contact },
      })
    } else {
      settings = await prisma.warehouseSettings.create({
        data: { name, code, address, manager, contact },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error updating warehouse settings:", error)
    return NextResponse.json({ error: "Failed to update warehouse settings" }, { status: 500 })
  }
}
