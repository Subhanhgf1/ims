export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.inventorySettings.findMany({
      include: {
        finishedGood: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unit: true,
            price: true,
            cost: true,
          },
        },
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching inventory settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { finishedGoodId, reorderPoint, reorderQuantity, maxStockLevel, leadTimeDays } = body;

    // Check if settings already exist
    const existing = await prisma.inventorySettings.findUnique({
      where: { finishedGoodId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Settings already exist for this finished good' },
        { status: 400 }
      );
    }

    const settings = await prisma.inventorySettings.create({
      data: {
        finishedGoodId,
        reorderPoint: parseInt(reorderPoint),
        reorderQuantity: parseInt(reorderQuantity),
        maxStockLevel: parseInt(maxStockLevel),
        leadTimeDays: parseInt(leadTimeDays) || 7,
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

    return NextResponse.json(settings, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory settings:', error);
    return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
  }
}

