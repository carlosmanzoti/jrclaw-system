import { z } from "zod"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"
import { getProviders, getActiveProvider } from "@/lib/tribunal-api"

export const monitoringRouter = router({
  // ── Feed: list movements across all cases ──
  feed: protectedProcedure
    .input(z.object({
      caseId: z.string().optional(),
      tipo: z.string().optional(),
      lida: z.boolean().optional(),
      page: z.number().default(1),
      perPage: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {}
      if (input.caseId) where.case_id = input.caseId
      if (input.tipo) where.tipo = input.tipo
      if (input.lida !== undefined) where.lida = input.lida

      const [items, total] = await Promise.all([
        ctx.db.caseMovement.findMany({
          where,
          orderBy: { data: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            case_: {
              select: {
                id: true,
                numero_processo: true,
                tipo: true,
                cliente: { select: { id: true, nome: true } },
              },
            },
          },
        }),
        ctx.db.caseMovement.count({ where }),
      ])

      return { items, total, page: input.page, perPage: input.perPage }
    }),

  // ── Unread count ──
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.caseMovement.count({ where: { lida: false } })
    }),

  // ── Mark as read ──
  markRead: protectedProcedure
    .input(z.object({ movementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseMovement.update({
        where: { id: input.movementId },
        data: { lida: true },
      })
    }),

  // ── Mark all as read (optional: for a case) ──
  markAllRead: protectedProcedure
    .input(z.object({ caseId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const where: any = { lida: false }
      if (input.caseId) where.case_id = input.caseId
      return ctx.db.caseMovement.updateMany({ where, data: { lida: true } })
    }),

  // ── Manual insertion ──
  addManual: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      data: z.coerce.date(),
      tipo: z.enum(["DESPACHO", "DECISAO", "SENTENCA", "ACORDAO", "PUBLICACAO", "INTIMACAO", "CITACAO", "ATO_ORDINATORIO", "OUTRO"]),
      descricao: z.string().min(1),
      conteudo_integral: z.string().optional(),
      fonte_url: z.string().optional(),
      notificar_cliente: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const caso = await ctx.db.case.findUnique({ where: { id: input.caseId } })
      if (!caso) throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" })

      return ctx.db.caseMovement.create({
        data: {
          case_id: input.caseId,
          data: input.data,
          tipo: input.tipo,
          descricao: input.descricao,
          conteudo_integral: input.conteudo_integral,
          fonte: "MANUAL",
          fonte_url: input.fonte_url,
          notificar_cliente: input.notificar_cliente,
          lida: false,
        },
      })
    }),

  // ── Fetch from DataJud for a single case (on-demand) ──
  fetchFromDataJud: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caso = await ctx.db.case.findUnique({ where: { id: input.caseId } })
      if (!caso) throw new TRPCError({ code: "NOT_FOUND" })
      if (!caso.numero_processo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Processo sem número CNJ" })
      }

      const provider = getActiveProvider()
      if (!provider) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Nenhum provedor de tribunais configurado (DATAJUD_API_KEY)" })
      }

      const movements = await provider.fetchMovements(caso.numero_processo)
      if (movements.length === 0) return { inserted: 0 }

      // Get existing movements to avoid duplicates
      const existing = await ctx.db.caseMovement.findMany({
        where: { case_id: input.caseId },
        select: { data: true, descricao: true, fonte: true },
      })

      const existingSet = new Set(
        existing.map(e => `${e.data.toISOString()}|${e.descricao}|${e.fonte}`)
      )

      const newMovements = movements.filter(m =>
        !existingSet.has(`${m.data.toISOString()}|${m.descricao}|${m.fonte}`)
      )

      if (newMovements.length === 0) return { inserted: 0 }

      await ctx.db.caseMovement.createMany({
        data: newMovements.map(m => ({
          case_id: input.caseId,
          data: m.data,
          tipo: m.tipo as any,
          descricao: m.descricao,
          conteudo_integral: m.conteudo_integral,
          fonte: m.fonte,
          fonte_url: m.fonte_url,
          lida: false,
        })),
      })

      return { inserted: newMovements.length }
    }),

  // ── Provider status ──
  providerStatus: protectedProcedure
    .query(async () => {
      const providers = getProviders()
      const statuses = await Promise.all(
        providers.map(async p => ({
          name: p.name,
          ...(await p.getStatus()),
        }))
      )
      return statuses
    }),

  // ── Cases list (for filtering) ──
  casesForSelect: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.case.findMany({
        where: { status: "ATIVO" },
        select: {
          id: true,
          numero_processo: true,
          tipo: true,
          cliente: { select: { nome: true } },
        },
        orderBy: { updated_at: "desc" },
        take: 200,
      })
    }),
})
