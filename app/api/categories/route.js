//api/categories/route.js
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: "desc", // latest first (optional)
      },
    })

    return new Response(
      JSON.stringify({
        data: categories,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error(error)

    return new Response(
      JSON.stringify({ error: "Failed to fetch categories" }),
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    // Expecting: { categories: ["Cat 1", "Cat 2"] }
    if (!body.categories || !Array.isArray(body.categories)) {
      return new Response(
        JSON.stringify({ error: "categories must be an array" }),
        { status: 400 }
      )
    }

    // Prepare data for Prisma
    const data = body.categories.map((name) => ({
      name,
    }))

    const result = await prisma.category.createMany({
      data,
      skipDuplicates: true, // optional (requires unique constraint if you want true dedup)
    })

    return new Response(
      JSON.stringify({
        message: "Categories added successfully",
        count: result.count,
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error(error)

    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500 }
    )
  }
}