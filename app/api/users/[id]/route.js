import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()
    const { name, email, role, status, password } = data

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const updateData = {
      name,
      email,
      role,
      status: status || "ACTIVE",
    }

    // Only update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if user has any associated records
    const userRecords = await prisma.user.findUnique({
      where: { id },
      include: {
        createdPurchaseOrders: true,
        createdSalesOrders: true,
        inventoryAdjustments: true,
      },
    })

    if (!userRecords) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (
      userRecords.createdPurchaseOrders.length > 0 ||
      userRecords.createdSalesOrders.length > 0 ||
      userRecords.inventoryAdjustments.length > 0
    ) {
      return NextResponse.json(
        { error: "Cannot delete user with associated records. Deactivate instead." },
        { status: 400 },
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
