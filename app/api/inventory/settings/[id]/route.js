export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { reorderPoint, reorderQuantity, maxStockLevel, leadTimeDays, status } = body;

    const settings = await prisma.inventorySettings.update({
      where: { id },
      data: {
        ...(reorderPoint !== undefined && { reorderPoint: parseInt(reorderPoint) }),
        ...(reorderQuantity !== undefined && { reorderQuantity: parseInt(reorderQuantity) }),
        ...(maxStockLevel !== undefined && { maxStockLevel: parseInt(maxStockLevel) }),
        ...(leadTimeDays !== undefined && { leadTimeDays: parseInt(leadTimeDays) }),
        ...(status !== undefined && { status }),
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

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating inventory settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    await prisma.inventorySettings.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Settings deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory settings:', error);
    return NextResponse.json({ error: 'Failed to delete settings' }, { status: 500 });
  }
}
