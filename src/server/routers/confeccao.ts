import { z } from "zod"
import { router, protectedProcedure } from "../trpc"

export const confeccaoRouter = router({
  // Chat sessions list
  chatSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.chatMessage.findMany({
      where: { userId: ctx.session.user.id },
      distinct: ["sessionId"],
      orderBy: { createdAt: "desc" },
      select: {
        sessionId: true,
        createdAt: true,
        caseId: true,
        projectId: true,
        content: true,
      },
      take: 30,
    })
    return sessions.map((s) => ({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      caseId: s.caseId,
      projectId: s.projectId,
      preview: s.content.substring(0, 80),
    }))
  }),

  // Get messages for a session
  chatMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chatMessage.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          metadata: true,
        },
      })
    }),

  // Delete a chat session
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.chatMessage.deleteMany({
        where: { sessionId: input.sessionId },
      })
      return { success: true }
    }),

  // Cases for select (context binding)
  casesForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.case.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        numero_processo: true,
        tipo: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 100,
    })
  }),

  // Projects for select (context binding)
  projectsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      select: {
        id: true,
        titulo: true,
        codigo: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 100,
    })
  }),

  // Load case context for sidebar
  caseContext: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.case.findUnique({
        where: { id: input.caseId },
        include: {
          cliente: { select: { nome: true, cpf_cnpj: true } },
          juiz: { select: { nome: true } },
          partes: {
            include: { person: { select: { nome: true } } },
          },
          credores: {
            include: { person: { select: { nome: true } } },
            take: 20,
          },
        },
      })
    }),

  // Load project context for sidebar
  projectContext: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          cliente: { select: { nome: true } },
          documentos: { select: { titulo: true, tipo: true }, take: 10 },
        },
      })
    }),

  // AI usage stats — enhanced with cost and model breakdown
  usageStats: protectedProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const where = {
      userId: ctx.session.user.id,
      createdAt: { gte: thirtyDaysAgo },
    }

    // Aggregate totals
    const totals = await ctx.db.aIUsageLog.aggregate({
      where,
      _sum: { tokensIn: true, tokensOut: true, costEstimated: true },
      _count: true,
    })

    // Breakdown by model
    const byModel = await ctx.db.aIUsageLog.groupBy({
      by: ["model"],
      where,
      _sum: { tokensIn: true, tokensOut: true, costEstimated: true },
      _count: true,
    })

    // Breakdown by action type
    const byAction = await ctx.db.aIUsageLog.groupBy({
      by: ["actionType"],
      where,
      _sum: { tokensIn: true, tokensOut: true, costEstimated: true },
      _count: true,
    })

    return {
      totalRequests: totals._count,
      tokensIn: totals._sum.tokensIn || 0,
      tokensOut: totals._sum.tokensOut || 0,
      totalCost: Number(totals._sum.costEstimated || 0),
      byModel: byModel.map((m) => ({
        model: m.model,
        requests: m._count,
        tokensIn: m._sum.tokensIn || 0,
        tokensOut: m._sum.tokensOut || 0,
        cost: Number(m._sum.costEstimated || 0),
      })),
      byAction: byAction.map((a) => ({
        actionType: a.actionType,
        requests: a._count,
        tokensIn: a._sum.tokensIn || 0,
        tokensOut: a._sum.tokensOut || 0,
        cost: Number(a._sum.costEstimated || 0),
      })),
    }
  }),
})
