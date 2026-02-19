import { z } from "zod"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"
import { hasPermission } from "@/lib/rbac"

export const auditRouter = router({
  list: protectedProcedure
    .input(z.object({
      action: z.string().optional(),
      resource: z.string().optional(),
      userId: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      page: z.number().default(1),
      perPage: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role
      if (!hasPermission(role, "audit:read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para visualizar logs de auditoria" })
      }

      const where: any = {}
      if (input.action) where.action = input.action
      if (input.resource) where.resource = input.resource
      if (input.userId) where.user_id = input.userId
      if (input.startDate || input.endDate) {
        where.timestamp = {}
        if (input.startDate) where.timestamp.gte = input.startDate
        if (input.endDate) where.timestamp.lte = input.endDate
      }

      const [items, total] = await Promise.all([
        ctx.db.auditLog.findMany({
          where,
          orderBy: { timestamp: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
        }),
        ctx.db.auditLog.count({ where }),
      ])

      return { items, total }
    }),

  // Stats for dashboard
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const role = (ctx.session.user as any).role
      if (!hasPermission(role, "audit:read")) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const now = new Date()
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [last24h, lastWeek, failedLogins] = await Promise.all([
        ctx.db.auditLog.count({ where: { timestamp: { gte: dayAgo } } }),
        ctx.db.auditLog.count({ where: { timestamp: { gte: weekAgo } } }),
        ctx.db.auditLog.count({
          where: { action: "LOGIN", success: false, timestamp: { gte: weekAgo } },
        }),
      ])

      return { last24h, lastWeek, failedLogins }
    }),
})
