import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const orders = await prisma.warehouseOrder.findMany({
      include: {
        finishedGood: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching warehouse orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { finishedGoodId, quantity, notes } = body;

    // Generate order number
    const orderCount = await prisma.warehouseOrder.count();
    const orderNumber = `WO-${Date.now()}-${orderCount + 1}`;

    const order = await prisma.warehouseOrder.create({
      data: {
        orderNumber,
        finishedGoodId,
        quantity: parseInt(quantity),
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        finishedGood: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unit: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating warehouse order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
