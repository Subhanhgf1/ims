export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import bcrypt from "bcryptjs"


export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        password: true,
      },
    })

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Invalid credentials or inactive account" }, { status: 401 })
    }

    // is password is = to user.password then return true
    const isValidPassword = user && password === user.password

if (!isValidPassword) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
}

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      message: "Login successful",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

