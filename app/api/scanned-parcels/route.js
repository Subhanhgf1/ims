export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"

/**
 * Helper to get the user from the request headers
 * In this project's pattern, we pass x-user-id for simplicity in some places
 * or the client sends it in the body. For GET, we'll check a header.
 */
async function getAuthenticatedUser(request) {
  const userId = request.headers.get("x-user-id")
  if (!userId) return null
  
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, permissions: true }
  })
}

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !hasPermission(user, "failed_delivery.view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const parcels = await prisma.scannedParcel.findMany({
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(parcels)
  } catch (error) {
    console.error("Error fetching scanned parcels:", error)
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { trackingNumber, orderData, isFlagged, userId } = data

    // Verify user & permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, permissions: true }
    })

    if (!user || !hasPermission(user, "failed_delivery.scan")) {
      return NextResponse.json({ error: "Unauthorized to scan" }, { status: 403 })
    }

    if (!trackingNumber || !orderData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if already in queue to prevent exact duplicates (optional)
    const existing = await prisma.scannedParcel.findFirst({
      where: { trackingNumber }
    })

    if (existing) {
      return NextResponse.json({ error: "Parcel already in scan queue" }, { status: 400 })
    }

    const parcel = await prisma.scannedParcel.create({
      data: {
        trackingNumber,
        orderData,
        isFlagged: !!isFlagged,
        userId
      },
      include: {
        user: { select: { name: true } }
      }
    })

    return NextResponse.json(parcel, { status: 201 })
  } catch (error) {
    console.error("Error saving scanned parcel:", error)
    return NextResponse.json({ error: "Failed to save parcel" }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const trackingNumber = searchParams.get("trackingNumber")
    const userId = request.headers.get("x-user-id")

    // Verify user & permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, permissions: true }
    })

    // Delete usually requires delete permission, but if it's aftermath of process, 
    // we allow it if they have process permission. 
    // To keep it simple, we'll check either FAILED_DELIVERY_DELETE or FAILED_DELIVERY_PROCESS.
    if (!user || (!hasPermission(user, "failed_delivery.delete") && !hasPermission(user, "failed_delivery.process"))) {
      return NextResponse.json({ error: "Unauthorized to delete" }, { status: 403 })
    }

    if (id) {
      await prisma.scannedParcel.delete({ where: { id } })
    } else if (trackingNumber) {
      await prisma.scannedParcel.deleteMany({ where: { trackingNumber } })
    } else {
      return NextResponse.json({ error: "ID or Tracking Number required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting scanned parcel:", error)
    return NextResponse.json({ error: "Failed to remove parcel" }, { status: 500 })
  }
}
