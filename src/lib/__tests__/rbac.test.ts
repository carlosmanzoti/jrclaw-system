import { describe, it, expect } from "vitest"
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isRoleAtLeast,
  getPermissions,
} from "../rbac"

describe("RBAC", () => {
  describe("Role hierarchy", () => {
    it("ADMIN has highest level", () => {
      expect(isRoleAtLeast("ADMIN", "ADMIN")).toBe(true)
      expect(isRoleAtLeast("ADMIN", "SOCIO")).toBe(true)
      expect(isRoleAtLeast("ADMIN", "ADVOGADO")).toBe(true)
      expect(isRoleAtLeast("ADMIN", "ESTAGIARIO")).toBe(true)
    })

    it("ESTAGIARIO has lowest level", () => {
      expect(isRoleAtLeast("ESTAGIARIO", "ESTAGIARIO")).toBe(true)
      expect(isRoleAtLeast("ESTAGIARIO", "ADVOGADO")).toBe(false)
      expect(isRoleAtLeast("ESTAGIARIO", "SOCIO")).toBe(false)
      expect(isRoleAtLeast("ESTAGIARIO", "ADMIN")).toBe(false)
    })

    it("unknown roles have no level", () => {
      expect(isRoleAtLeast("UNKNOWN", "ESTAGIARIO")).toBe(false)
    })
  })

  describe("Permission inheritance", () => {
    it("ESTAGIARIO can read cases but not create", () => {
      expect(hasPermission("ESTAGIARIO", "cases:read")).toBe(true)
      expect(hasPermission("ESTAGIARIO", "cases:create")).toBe(false)
    })

    it("ADVOGADO inherits ESTAGIARIO permissions and adds own", () => {
      expect(hasPermission("ADVOGADO", "cases:read")).toBe(true) // inherited
      expect(hasPermission("ADVOGADO", "cases:create")).toBe(true) // own
      expect(hasPermission("ADVOGADO", "cases:delete")).toBe(false) // SOCIO+
    })

    it("SOCIO inherits all lower permissions", () => {
      expect(hasPermission("SOCIO", "cases:read")).toBe(true) // from ESTAGIARIO
      expect(hasPermission("SOCIO", "cases:create")).toBe(true) // from ADVOGADO
      expect(hasPermission("SOCIO", "cases:delete")).toBe(true) // own
      expect(hasPermission("SOCIO", "audit:read")).toBe(true) // own
    })

    it("ADMIN has all permissions", () => {
      expect(hasPermission("ADMIN", "users:delete")).toBe(true)
      expect(hasPermission("ADMIN", "lgpd:delete")).toBe(true)
      expect(hasPermission("ADMIN", "settings:update")).toBe(true)
      expect(hasPermission("ADMIN", "financial:delete")).toBe(true)
    })
  })

  describe("LGPD permissions", () => {
    it("only SOCIO+ can export data", () => {
      expect(hasPermission("ESTAGIARIO", "lgpd:export")).toBe(false)
      expect(hasPermission("ADVOGADO", "lgpd:export")).toBe(false)
      expect(hasPermission("SOCIO", "lgpd:export")).toBe(true)
      expect(hasPermission("ADMIN", "lgpd:export")).toBe(true)
    })

    it("only ADMIN can anonymize data", () => {
      expect(hasPermission("SOCIO", "lgpd:delete")).toBe(false)
      expect(hasPermission("ADMIN", "lgpd:delete")).toBe(true)
    })
  })

  describe("Financial permissions", () => {
    it("ESTAGIARIO cannot see financial data", () => {
      expect(hasPermission("ESTAGIARIO", "financial:read")).toBe(false)
    })

    it("ADVOGADO can read financial data only", () => {
      expect(hasPermission("ADVOGADO", "financial:read")).toBe(true)
      expect(hasPermission("ADVOGADO", "financial:create")).toBe(false)
    })

    it("SOCIO can create and manage finances", () => {
      expect(hasPermission("SOCIO", "financial:create")).toBe(true)
      expect(hasPermission("SOCIO", "financial:update")).toBe(true)
      expect(hasPermission("SOCIO", "financial:reports")).toBe(true)
      expect(hasPermission("SOCIO", "financial:delete")).toBe(false)
    })

    it("ADMIN can delete financial records", () => {
      expect(hasPermission("ADMIN", "financial:delete")).toBe(true)
    })
  })

  describe("hasAllPermissions", () => {
    it("returns true if role has all listed permissions", () => {
      expect(
        hasAllPermissions("ADVOGADO", ["cases:read", "cases:create", "projects:read"])
      ).toBe(true)
    })

    it("returns false if role is missing any permission", () => {
      expect(
        hasAllPermissions("ADVOGADO", ["cases:read", "cases:delete"])
      ).toBe(false)
    })
  })

  describe("hasAnyPermission", () => {
    it("returns true if role has at least one permission", () => {
      expect(
        hasAnyPermission("ESTAGIARIO", ["cases:delete", "cases:read"])
      ).toBe(true)
    })

    it("returns false if role has none of the permissions", () => {
      expect(
        hasAnyPermission("ESTAGIARIO", ["cases:delete", "users:delete"])
      ).toBe(false)
    })
  })

  describe("getPermissions", () => {
    it("returns a Set of all permissions for a role", () => {
      const perms = getPermissions("ADMIN")
      expect(perms).toBeInstanceOf(Set)
      expect(perms.size).toBeGreaterThan(0)
      expect(perms.has("lgpd:delete")).toBe(true)
    })
  })

  describe("Invalid roles", () => {
    it("unknown roles have no permissions", () => {
      expect(hasPermission("UNKNOWN_ROLE", "cases:read")).toBe(false)
    })
  })
})
