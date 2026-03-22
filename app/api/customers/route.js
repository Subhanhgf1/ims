export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { name, email, phone, address } = data

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        status: "ACTIVE",
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}

