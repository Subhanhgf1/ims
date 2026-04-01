"use client"

import { useAuth } from "@/lib/auth"
import { resolvePermissions, PERMISSIONS } from "@/lib/permissions"

/**
 * Returns a `can(permission)` checker and the full resolved permissions map
 * for the currently logged-in user.
 *
 * Usage:
 *   const { can } = usePermissions()
 *   can(PERMISSIONS.INBOUND_CREATE)  // true | false
 */
export function usePermissions() {
  const { user } = useAuth()
  const resolved = resolvePermissions(user)

  const can = (permission) => resolved[permission] === true

  return { can, permissions: resolved, PERMISSIONS }
}
