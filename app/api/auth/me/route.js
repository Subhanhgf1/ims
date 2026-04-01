export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        permissions: true,
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account inactive" }, { status: 403 })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching current user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
