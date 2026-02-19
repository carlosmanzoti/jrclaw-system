/**
 * RBAC — Role-Based Access Control
 *
 * Hierarchy: ADMIN > SOCIO > ADVOGADO > ESTAGIARIO
 * Each role inherits permissions from roles below it.
 */

export type Role = "ADMIN" | "SOCIO" | "ADVOGADO" | "ESTAGIARIO"

const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 100,
  SOCIO: 75,
  ADVOGADO: 50,
  ESTAGIARIO: 25,
}

export type Permission =
  // Cases
  | "cases:read" | "cases:create" | "cases:update" | "cases:delete"
  // Projects
  | "projects:read" | "projects:create" | "projects:update" | "projects:delete"
  // Persons
  | "persons:read" | "persons:create" | "persons:update" | "persons:delete"
  // Documents
  | "documents:read" | "documents:create" | "documents:update" | "documents:delete"
  // Financial
  | "financial:read" | "financial:create" | "financial:update" | "financial:delete" | "financial:reports"
  // Deadlines
  | "deadlines:read" | "deadlines:create" | "deadlines:update" | "deadlines:delete"
  // Calendar
  | "calendar:read" | "calendar:create" | "calendar:update" | "calendar:delete"
  // Users / Admin
  | "users:read" | "users:create" | "users:update" | "users:delete"
  // Settings
  | "settings:read" | "settings:update"
  // Audit
  | "audit:read"
  // LGPD
  | "lgpd:export" | "lgpd:delete"
  // Portal
  | "portal:manage"
  // Reports
  | "reports:read" | "reports:create"
  // WhatsApp
  | "whatsapp:read" | "whatsapp:send"
  // Monitoring
  | "monitoring:read" | "monitoring:manage"
  // Recovery/RJ
  | "recovery:read" | "recovery:manage"

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ESTAGIARIO: [
    "cases:read",
    "projects:read",
    "persons:read",
    "documents:read", "documents:create",
    "deadlines:read",
    "calendar:read", "calendar:create",
    "reports:read",
    "whatsapp:read",
    "monitoring:read",
    "recovery:read",
  ],
  ADVOGADO: [
    // Inherits ESTAGIARIO +
    "cases:create", "cases:update",
    "projects:create", "projects:update",
    "persons:create", "persons:update",
    "documents:update",
    "financial:read",
    "deadlines:create", "deadlines:update",
    "calendar:update",
    "reports:create",
    "whatsapp:send",
    "monitoring:manage",
    "recovery:manage",
  ],
  SOCIO: [
    // Inherits ADVOGADO +
    "cases:delete",
    "projects:delete",
    "persons:delete",
    "documents:delete",
    "financial:create", "financial:update", "financial:reports",
    "deadlines:delete",
    "calendar:delete",
    "users:read",
    "settings:read",
    "audit:read",
    "portal:manage",
    "lgpd:export",
  ],
  ADMIN: [
    // Inherits SOCIO +
    "financial:delete",
    "users:create", "users:update", "users:delete",
    "settings:update",
    "lgpd:delete",
  ],
}

/**
 * Get all permissions for a role (including inherited ones)
 */
export function getPermissions(role: Role): Set<Permission> {
  const perms = new Set<Permission>()
  const roleLevel = ROLE_LEVEL[role]

  for (const [r, level] of Object.entries(ROLE_LEVEL)) {
    if (level <= roleLevel) {
      for (const p of ROLE_PERMISSIONS[r as Role]) {
        perms.add(p)
      }
    }
  }

  return perms
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role | string, permission: Permission): boolean {
  if (!ROLE_LEVEL[role as Role]) return false
  return getPermissions(role as Role).has(permission)
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: Role | string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(role: Role | string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Compare role levels
 */
export function isRoleAtLeast(role: Role | string, minimumRole: Role): boolean {
  return (ROLE_LEVEL[role as Role] || 0) >= ROLE_LEVEL[minimumRole]
}
