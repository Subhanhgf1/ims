/**
 * Permission keys used across the app.
 * Format: "module.action"
 */
export const PERMISSIONS = {
  // Inbound
  INBOUND_VIEW:    "inbound.view",
  INBOUND_CREATE:  "inbound.create",
  INBOUND_EDIT:    "inbound.edit",
  INBOUND_RECEIVE: "inbound.receive",

  // Outbound
  OUTBOUND_VIEW:   "outbound.view",
  OUTBOUND_CREATE: "outbound.create",
  OUTBOUND_EDIT:   "outbound.edit",
  OUTBOUND_SHIP:   "outbound.ship",
  OUTBOUND_DELETE: "outbound.delete",

  // Inventory
  INVENTORY_VIEW:  "inventory.view",
  INVENTORY_EDIT:  "inventory.edit",

  // Production
  PRODUCTION_VIEW:   "production.view",
  PRODUCTION_CREATE: "production.create",

  // Reports
  REPORTS_VIEW:       "reports.view",
  REPORTS_FINANCIALS: "reports.financials",

  // Settings
  SETTINGS_VIEW: "settings.view",

  // Users
  USERS_MANAGE: "users.manage",
}

/**
 * Default permissions per role.
 * true  = allowed
 * false = denied
 */
const ROLE_DEFAULTS = {
  ADMIN: {
    "inbound.view":       true,
    "inbound.create":     true,
    "inbound.edit":       true,
    "inbound.receive":    true,
    "outbound.view":      true,
    "outbound.create":    true,
    "outbound.edit":      true,
    "outbound.ship":      true,
    "outbound.delete":    true,
    "inventory.view":     true,
    "inventory.edit":     true,
    "production.view":    true,
    "production.create":  true,
    "reports.view":       true,
    "reports.financials": true,
    "settings.view":      true,
    "users.manage":       true,
  },
  MANAGER: {
    "inbound.view":       true,
    "inbound.create":     true,
    "inbound.edit":       true,
    "inbound.receive":    true,
    "outbound.view":      true,
    "outbound.create":    true,
    "outbound.edit":      true,
    "outbound.ship":      true,
    "outbound.delete":    true,
    "inventory.view":     true,
    "inventory.edit":     true,
    "production.view":    true,
    "production.create":  true,
    "reports.view":       true,
    "reports.financials": false,
    "settings.view":      false,
    "users.manage":       false,
  },
  OPERATOR: {
    "inbound.view":       true,
    "inbound.create":     false,
    "inbound.edit":       false,
    "inbound.receive":    true,
    "outbound.view":      true,
    "outbound.create":    false,
    "outbound.edit":      false,
    "outbound.ship":      true,
    "outbound.delete":    false,
    "inventory.view":     true,
    "inventory.edit":     false,
    "production.view":    true,
    "production.create":  false,
    "reports.view":       false,
    "reports.financials": false,
    "settings.view":      false,
    "users.manage":       false,
  },
}

/**
 * Resolves the final permission set for a user.
 *
 * Logic:
 * 1. Start with role defaults
 * 2. Apply per-user overrides from user.permissions (Json field)
 *    - true  = explicitly granted regardless of role
 *    - false = explicitly denied regardless of role
 *    - key missing = fall back to role default
 *
 * @param {object} user - user object with .role and optional .permissions
 * @returns {object} - final resolved permissions map { "module.action": boolean }
 */
export function resolvePermissions(user) {
  if (!user) return {}

  const roleDefaults = ROLE_DEFAULTS[user.role] ?? ROLE_DEFAULTS.OPERATOR
  const overrides = user.permissions ?? {}

  const resolved = { ...roleDefaults }

  // Only apply overrides that explicitly DIFFER from the role default
  // This prevents stale full-blob permissions from overwriting genuine changes
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "boolean" && value !== roleDefaults[key]) {
      resolved[key] = value
    }
  }

  return resolved
}

/**
 * Check if a user has a specific permission.
 *
 * @param {object} user - user object with .role and optional .permissions
 * @param {string} permission - permission key e.g. "inbound.create"
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  const resolved = resolvePermissions(user)
  return resolved[permission] === true
}
