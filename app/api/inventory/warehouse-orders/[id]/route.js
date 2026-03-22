export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, receivedDate, notes } = body;

    const order = await prisma.warehouseOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(receivedDate && { receivedDate: new Date(receivedDate) }),
        ...(notes !== undefined && { notes }),
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

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating warehouse order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    await prisma.warehouseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
