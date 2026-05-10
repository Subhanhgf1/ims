const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTargetDays() {
  const items = await prisma.finishedGood.findMany({
    where: {
      sku: { in: ["Semi_Circle", "LPL_MD", "Plain Large"] }
    }
  })

  items.forEach(i => {
    console.log(`${i.name} (${i.sku}): Qty: ${i.quantity}, TargetDays: ${i.targetDays}, MinStock: ${i.minimumStock}`)
  })
}

checkTargetDays()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
