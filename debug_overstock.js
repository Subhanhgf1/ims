const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugOverstock() {
  const items = await prisma.finishedGood.findMany({
    include: {
      inventorySettings: true
    }
  })

  console.log(`Found ${items.length} total items.`)
  
  const overstocked = items.filter(item => {
    const maxLevel = item.inventorySettings?.maxStockLevel
    const isOver = maxLevel && maxLevel > 0 && item.quantity > maxLevel
    if (isOver) {
      console.log(`OVERSTOCK DETECTED: ${item.name} (${item.sku}) - Qty: ${item.quantity}, Max: ${maxLevel}`)
    }
    return isOver
  })

  if (overstocked.length === 0) {
    console.log("No overstocked items found based on maxStockLevel settings.")
    // Check items with high quantity but NO settings
    const highQtyNoSettings = items.filter(item => !item.inventorySettings && item.quantity > 50)
    if (highQtyNoSettings.length > 0) {
      console.log(`${highQtyNoSettings.length} items have quantity > 50 but NO Inventory Settings (and thus no Max Stock Level).`)
      highQtyNoSettings.forEach(i => console.log(`- ${i.name} (${i.sku}): ${i.quantity}`))
    }
  }
}

debugOverstock()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
