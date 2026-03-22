import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    let notifications = await prisma.notificationSettings.findFirst()

    if (!notifications) {
      // Create default notification settings if none exist
      notifications = await prisma.notificationSettings.create({
        data: {
          lowStockNotifications: true,
          overstockNotifications: false,
          expiryAlerts: true,
          newOrderAlerts: true,
          shipmentUpdates: true,
          deliveryConfirmations: false,
          systemMaintenance: true,
          securityAlerts: true,
        },
      })
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notification settings:", error)
    return NextResponse.json({ error: "Failed to fetch notification settings" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()

    let notifications = await prisma.notificationSettings.findFirst()

    if (notifications) {
      notifications = await prisma.notificationSettings.update({
        where: { id: notifications.id },
        data,
      })
    } else {
      notifications = await prisma.notificationSettings.create({
        data,
      })
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error updating notification settings:", error)
    return NextResponse.json({ error: "Failed to update notification settings" }, { status: 500 })
  }
}
