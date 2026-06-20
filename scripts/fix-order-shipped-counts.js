/**
 * ONE-TIME FIX SCRIPT
 * 
 * Problem: For order EXT-MomDaughts WEB-202605230921, inventory was deducted
 * but SalesOrderItem.shipped counts were never updated (stayed at 0).
 * 
 * This script: sets shipped = quantity for all items on that order,
 * then marks the order as SHIPPED.
 * 
 * Run with: node scripts/fix-order-shipped-counts.js
 */

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const SO_NUMBER = "EXT-MomDaughts WEB-202605230921"

async function main() {
  console.log(`\n🔧 Fixing order: ${SO_NUMBER}\n`)

  // 1. Find the order
  const order = await prisma.salesOrder.findUnique({
    where: { soNumber: SO_NUMBER },
    include: {
      items: {
        include: {
          finishedGood: { select: { name: true, sku: true } },
          rawMaterial:  { select: { name: true, sku: true } },
        },
      },
      customer: { select: { name: true } },
    },
  })

  if (!order) {
    console.error(`❌ Order not found: ${SO_NUMBER}`)
    process.exit(1)
  }

  console.log(`✅ Found order: ${order.soNumber}`)
  console.log(`   Customer : ${order.customer?.name}`)
  console.log(`   Status   : ${order.status}`)
  console.log(`   Items    : ${order.items.length}\n`)

  // 2. Print current state
  console.log("Current item state:")
  for (const item of order.items) {
    const name = item.finishedGood?.name ?? item.rawMaterial?.name ?? "Unknown"
    console.log(`   ${name.padEnd(45)} ordered=${item.quantity}  shipped=${item.shipped}`)
  }

  // 3. Confirm before applying
  console.log("\n⚠️  This will set shipped = quantity for ALL items and mark order as SHIPPED.")
  console.log("   Press Ctrl+C within 5 seconds to cancel...\n")
  await new Promise((r) => setTimeout(r, 5000))

  // 4. Update each item individually (no transaction to avoid timeout)
  console.log("Applying fix...")
  for (const item of order.items) {
    const name = item.finishedGood?.name ?? item.rawMaterial?.name ?? "Unknown"
    await prisma.salesOrderItem.update({
      where: { id: item.id },
      data: { shipped: item.quantity },
    })
    console.log(`   ✓ Updated: ${name} → shipped = ${item.quantity}`)
  }

  // 5. Update order status
  await prisma.salesOrder.update({
    where: { id: order.id },
    data: { status: "SHIPPED" },
  })
  console.log(`\n   ✓ Order status → SHIPPED`)

  console.log("\n✅ Fix applied successfully!\n")
  console.log("NOTE: Inventory was already deducted during the failed shipment.")
  console.log("      No additional inventory changes are needed.\n")
}

main()
  .catch((err) => {
    console.error("\n❌ Script failed:", err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
