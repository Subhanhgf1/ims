import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    let preferences = await prisma.systemPreferences.findFirst()

    if (!preferences) {
      // Create default preferences if none exist
      preferences = await prisma.systemPreferences.create({
        data: {
          autoGenerateSKU: true,
          lowStockAlerts: true,
          qualityCheckRequired: true,
          barcodeScanning: false,
        },
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error fetching system preferences:", error)
    return NextResponse.json({ error: "Failed to fetch system preferences" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { autoGenerateSKU, lowStockAlerts, qualityCheckRequired, barcodeScanning } = data

    let preferences = await prisma.systemPreferences.findFirst()

    if (preferences) {
      preferences = await prisma.systemPreferences.update({
        where: { id: preferences.id },
        data: { autoGenerateSKU, lowStockAlerts, qualityCheckRequired, barcodeScanning },
      })
    } else {
      preferences = await prisma.systemPreferences.create({
        data: { autoGenerateSKU, lowStockAlerts, qualityCheckRequired, barcodeScanning },
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error updating system preferences:", error)
    return NextResponse.json({ error: "Failed to update system preferences" }, { status: 500 })
  }
}
