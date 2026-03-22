import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create users
  const hashedPassword = await bcrypt.hash("admin123", 10)
  const hashedManagerPassword = await bcrypt.hash("manager123", 10)
  const hashedOperatorPassword = await bcrypt.hash("operator123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@wms.com" },
    update: {},
    create: {
      email: "admin@wms.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: "manager@wms.com" },
    update: {},
    create: {
      email: "manager@wms.com",
      name: "Manager User",
      password: hashedManagerPassword,
      role: "MANAGER",
      status: "ACTIVE",
    },
  })

  const operator = await prisma.user.upsert({
    where: { email: "operator@wms.com" },
    update: {},
    create: {
      email: "operator@wms.com",
      name: "Operator User",
      password: hashedOperatorPassword,
      role: "OPERATOR",
      status: "ACTIVE",
    },
  })

  // Create suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: "Steel Corp",
      email: "supplier@steelcorp.com",
      phone: "+1-555-0101",
      address: "123 Industrial Ave, Steel City, SC 12345",
      rating: 4.8,
      status: "ACTIVE",
    },
  })

  const supplier2 = await prisma.supplier.create({
    data: {
      name: "Metal Works",
      email: "orders@metalworks.com",
      phone: "+1-555-0102",
      address: "456 Manufacturing Blvd, Metal Town, MT 67890",
      rating: 4.5,
      status: "ACTIVE",
    },
  })

  // Create customers
  const customer1 = await prisma.customer.create({
    data: {
      name: "ABC Manufacturing",
      email: "orders@abcmfg.com",
      phone: "+1-555-0201",
      address: "789 Business Park, Manufacturing City, MC 11111",
      status: "ACTIVE",
    },
  })

  const customer2 = await prisma.customer.create({
    data: {
      name: "XYZ Industries",
      email: "purchasing@xyzind.com",
      phone: "+1-555-0202",
      address: "321 Corporate Dr, Industry Town, IT 22222",
      status: "ACTIVE",
    },
  })

  // Create locations
  const location1 = await prisma.location.create({
    data: {
      code: "A1-01",
      zone: "Raw Materials",
      type: "SHELF",
      capacity: 1000,
      occupied: 750,
      status: "ACTIVE",
    },
  })

  const location2 = await prisma.location.create({
    data: {
      code: "A1-02",
      zone: "Raw Materials",
      type: "SHELF",
      capacity: 800,
      occupied: 450,
      status: "ACTIVE",
    },
  })

  const location3 = await prisma.location.create({
    data: {
      code: "B1-01",
      zone: "Finished Goods",
      type: "PALLET",
      capacity: 500,
      occupied: 350,
      status: "ACTIVE",
    },
  })

  // Create raw materials
  const rawMaterial1 = await prisma.rawMaterial.create({
    data: {
      name: "Steel Sheets",
      sku: "RM001",
      description: "High-grade steel sheets for manufacturing",
      quantity: 500,
      unit: "sheets",
      cost: 25.5,
      minimumStock: 100,
      status: "IN_STOCK",
      supplierId: supplier1.id,
      locationId: location1.id,
    },
  })

  const rawMaterial2 = await prisma.rawMaterial.create({
    data: {
      name: "Aluminum Rods",
      sku: "RM002",
      description: "Aluminum rods for component manufacturing",
      quantity: 45,
      unit: "rods",
      cost: 15.75,
      minimumStock: 50,
      status: "LOW_STOCK",
      supplierId: supplier2.id,
      locationId: location2.id,
    },
  })

  // Create finished goods
  const finishedGood1 = await prisma.finishedGood.create({
    data: {
      name: "Product Alpha",
      sku: "FG001",
      description: "Premium manufactured product",
      quantity: 150,
      unit: "units",
      cost: 125.0,
      price: 199.99,
      minimumStock: 50,
      status: "IN_STOCK",
      locationId: location3.id,
    },
  })

  const finishedGood2 = await prisma.finishedGood.create({
    data: {
      name: "Product Beta",
      sku: "FG002",
      description: "Standard manufactured product",
      quantity: 25,
      unit: "units",
      cost: 85.5,
      price: 149.99,
      minimumStock: 30,
      status: "LOW_STOCK",
      locationId: location3.id,
    },
  })

  console.log("Database seeded successfully!")
  console.log("Demo accounts created:")
  console.log("Admin: admin@wms.com / admin123")
  console.log("Manager: manager@wms.com / manager123")
  console.log("Operator: operator@wms.com / operator123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
