const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCustomers() {
  const customers = await prisma.customer.findMany()
  console.log(JSON.stringify(customers, null, 2))
}

checkCustomers()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
