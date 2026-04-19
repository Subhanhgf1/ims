// app/api/chat/route.js
import { google } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages } from 'ai'; // ✅ import convertToModelMessages
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();
  // ✅ Convert UIMessage[] → ModelMessage[] before passing to streamText
  // This handles the `parts` format that useChat sends
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: modelMessages, // ✅ now correctly typed
    system: `You are Antigravity, the AI Assistant for Nakson IMS (Inventory Management System).
    You have access to real-time inventory data, stock levels, and order history.
    Your tone should be professional, helpful, and concise.
    When users ask about stock, use the provided tools to fetch accurate data.
    If a user asks for stats, provide them in a clear, structured way.
    Always prioritize accuracy over speed.`,
    tools: {
      getInventorySummary: tool({
        description: 'Get a high-level summary of the current inventory (Finished Goods and Raw Materials)',
        inputSchema: z.object({}), // ✅ v5 uses inputSchema, not parameters
        execute: async () => {
          const [finishedGoodsCount, rawMaterialsCount] = await Promise.all([
            prisma.finishedGood.count(),
            prisma.rawMaterial.count(),
          ]);
          return {
            finishedGoods: finishedGoodsCount,
            rawMaterials: rawMaterialsCount,
            message: `Currently tracking ${finishedGoodsCount} Finished Goods and ${rawMaterialsCount} Raw Materials.`,
          };
        },
      }),

      getLowStockItems: tool({
        description: 'List items that are below their minimum stock or maintenance levels',
        inputSchema: z.object({ // ✅ inputSchema
          limit: z.number().optional().default(10),
        }),
        execute: async ({ limit }) => {
          const finishedGoods = await prisma.finishedGood.findMany({
            where: {
              OR: [{ quantity: { lte: 0 } }, { quantity: { lte: 10 } }],
            },
            take: limit,
            select: { name: true, sku: true, quantity: true, minimumStock: true },
          });
          const rawMaterials = await prisma.rawMaterial.findMany({
            where: { quantity: { lte: 10 } },
            take: limit,
            select: { name: true, sku: true, quantity: true, minimumStock: true },
          });
          return { finishedGoods, rawMaterials };
        },
      }),

      getItemDetails: tool({
        description: 'Get detailed information about a specific item by SKU or Name',
        inputSchema: z.object({ // ✅ inputSchema
          query: z.string().describe('The SKU or Name of the item to look up'),
        }),
        execute: async ({ query }) => {
          const fg = await prisma.finishedGood.findFirst({
            where: {
              OR: [
                { sku: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
              ],
            },
            include: { category: true, location: true },
          });
          if (fg) return { type: 'Finished Good', ...fg };

          const rm = await prisma.rawMaterial.findFirst({
            where: {
              OR: [
                { sku: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
              ],
            },
            include: { supplier: true, location: true },
          });
          if (rm) return { type: 'Raw Material', ...rm };

          return { error: 'Item not found' };
        },
      }),

      getRecentOrders: tool({
        description: 'Get a summary of the most recent purchase orders and sales orders',
        inputSchema: z.object({ // ✅ inputSchema
          count: z.number().optional().default(5),
        }),
        execute: async ({ count }) => {
          const [purchaseOrders, salesOrders] = await Promise.all([
            prisma.purchaseOrder.findMany({
              take: count,
              orderBy: { createdAt: 'desc' },
              include: { supplier: true },
            }),
            prisma.salesOrder.findMany({
              take: count,
              orderBy: { createdAt: 'desc' },
              include: { customer: true },
            }),
          ]);
          return {
            recentInbound: purchaseOrders.map(po => ({
              id: po.poNumber,
              supplier: po.supplier.name,
              status: po.status,
              date: po.createdAt,
            })),
            recentOutbound: salesOrders.map(so => ({
              id: so.soNumber,
              customer: so.customer.name,
              status: so.status,
              date: so.createdAt,
            })),
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse(); // ✅ already correct for v5
}