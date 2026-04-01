const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const ROLE_DEFAULTS = {
  ADMIN: {
    "inbound.view": true, "inbound.create": true, "inbound.edit": true, "inbound.receive": true,
    "outbound.view": true, "outbound.create": true, "outbound.edit": true, "outbound.ship": true, "outbound.delete": true,
    "inventory.view": true, "inventory.edit": true,
    "production.view": true, "production.create": true,
    "reports.view": true, "reports.financials": true,
    "settings.view": true, "users.manage": true,
  },
  MANAGER: {
    "inbound.view": true, "inbound.create": true, "inbound.edit": true, "inbound.receive": true,
    "outbound.view": true, "outbound.create": true, "outbound.edit": true, "outbound.ship": true, "outbound.delete": true,
    "inventory.view": true, "inventory.edit": true,
    "production.view": true, "production.create": true,
    "reports.view": true, "reports.financials": false,
    "settings.view": false, "users.manage": false,
  },
  OPERATOR: {
    "inbound.view": true, "inbound.create": false, "inbound.edit": false, "inbound.receive": true,
    "outbound.view": true, "outbound.create": false, "outbound.edit": false, "outbound.ship": true, "outbound.delete": false,
    "inventory.view": true, "inventory.edit": false,
    "production.view": true, "production.create": false,
    "reports.view": false, "reports.financials": false,
    "settings.view": false, "users.manage": false,
  },
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, permissions: true } })
  console.log(`Found ${users.length} users`)

  for (const user of users) {
    const roleDefaults = ROLE_DEFAULTS[user.role] ?? ROLE_DEFAULTS.OPERATOR
    const stored = user.permissions ?? {}

    // Keep only keys that genuinely differ from the role default
    const trueOverrides = {}
    for (const [key, value] of Object.entries(stored)) {
      if (typeof value === "boolean" && value !== roleDefaults[key]) {
        trueOverrides[key] = value
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { permissions: trueOverrides },
    })

    const overrideCount = Object.keys(trueOverrides).length
    console.log(`✅ ${user.name} (${user.role}) — kept ${overrideCount} override(s): ${JSON.stringify(trueOverrides)}`)
  }

  console.log("Done.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
