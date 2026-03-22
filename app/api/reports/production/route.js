import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request) {
  try {
        const { searchParams } =  const searchParams = request.nextUrl.searchParams

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const finishedGoodId = searchParams.get("finishedGoodId")

    // Build where clause
    const where = {}
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    if (finishedGoodId) {
      where.finishedGoodId = finishedGoodId
    }

    // Fetch data using Promise.all for better performance
    const [productionOrders, finishedGoods] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        include: {
          finishedGood: { select: { name: true, sku: true, unit: true } },
          items: {
            include: {
              rawMaterial: { select: { name: true, sku: true, unit: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.finishedGood.findMany({
        select: { id: true, name: true, sku: true },
      }),
    ])

    // Calculate summary statistics
    const summary = {
      totalOrders: productionOrders.length,
      totalTargetQuantity: productionOrders.reduce((sum, order) => sum + order.targetQuantity, 0),
      totalProducedQuantity: productionOrders.reduce((sum, order) => sum + order.producedQuantity, 0),
      averageEfficiency:
        productionOrders.length > 0
          ? Math.round(
              productionOrders.reduce((sum, order) => sum + (order.producedQuantity / order.targetQuantity) * 100, 0) /
                productionOrders.length,
            )
          : 0,
      statusBreakdown: {
        pending: productionOrders.filter((order) => order.status === "PENDING").length,
        inProgress: productionOrders.filter((order) => order.status === "IN_PROGRESS").length,
        completed: productionOrders.filter((order) => order.status === "COMPLETED").length,
      },
      productBreakdown: finishedGoods.map((product) => {
        const productOrders = productionOrders.filter((order) => order.finishedGoodId === product.id)
        return {
          name: product.name,
          sku: product.sku,
          orderCount: productOrders.length,
          totalProduced: productOrders.reduce((sum, order) => sum + order.producedQuantity, 0),
          totalTarget: productOrders.reduce((sum, order) => sum + order.targetQuantity, 0),
        }
      }),
    }

    const reportData = {
      productionOrders,
      summary,
      filters: { startDate, endDate, finishedGoodId },
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating production report:", error)
    return NextResponse.json({ error: "Failed to generate production report" }, { status: 500 })
  }
}
