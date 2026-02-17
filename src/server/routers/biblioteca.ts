import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { Prisma } from "@prisma/client"

export const bibliotecaRouter = router({
  // List with search + filters + pagination
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tipo: z.array(z.string()).optional(),
        area: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        favorito: z.boolean().optional(),
        relevanciaMin: z.number().optional(),
        orderBy: z.enum(["recentes", "antigos", "relevancia", "titulo"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.LibraryEntryWhereInput = {}

      if (input.tipo && input.tipo.length > 0) {
        where.tipo = { in: input.tipo as any }
      }

      if (input.area && input.area.length > 0) {
        where.area = { in: input.area as any }
      }

      if (input.favorito) {
        where.favorito = true
      }

      if (input.relevanciaMin) {
        where.relevancia = { gte: input.relevanciaMin }
      }

      if (input.tags && input.tags.length > 0) {
        where.tags = { hasSome: input.tags }
      }

      if (input.search) {
        where.OR = [
          { titulo: { contains: input.search, mode: "insensitive" } },
          { resumo: { contains: input.search, mode: "insensitive" } },
          { conteudo: { contains: input.search, mode: "insensitive" } },
          { fonte: { contains: input.search, mode: "insensitive" } },
        ]
      }

      let orderBy: Prisma.LibraryEntryOrderByWithRelationInput = { created_at: "desc" }
      if (input.orderBy === "antigos") orderBy = { created_at: "asc" }
      else if (input.orderBy === "relevancia") orderBy = { relevancia: "desc" }
      else if (input.orderBy === "titulo") orderBy = { titulo: "asc" }

      const skip = (input.page - 1) * input.limit

      const [items, total] = await Promise.all([
        ctx.db.libraryEntry.findMany({
          where,
          orderBy,
          skip,
          take: input.limit,
          include: {
            _count: {
              select: {
                utilizado_em_casos: true,
                utilizado_em_projetos: true,
              },
            },
          },
        }),
        ctx.db.libraryEntry.count({ where }),
      ])

      return {
        items,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  // Get by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.libraryEntry.findUnique({
        where: { id: input.id },
        include: {
          utilizado_em_casos: { select: { id: true, numero_processo: true } },
          utilizado_em_projetos: { select: { id: true, codigo: true, titulo: true } },
        },
      })
    }),

  // Create
  create: protectedProcedure
    .input(
      z.object({
        tipo: z.string(),
        titulo: z.string().min(1),
        resumo: z.string().optional(),
        conteudo: z.string().optional(),
        fonte: z.string().optional(),
        url_fonte: z.string().optional(),
        area: z.string().optional(),
        tags: z.array(z.string()).default([]),
        arquivo_url: z.string().optional(),
        relevancia: z.number().min(0).max(5).default(0),
        favorito: z.boolean().default(false),
        metadata: z.any().optional(),
        arquivo_tipo: z.string().optional(),
        arquivo_tamanho: z.number().optional(),
        case_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.libraryEntry.create({
        data: {
          tipo: input.tipo as any,
          titulo: input.titulo,
          resumo: input.resumo,
          conteudo: input.conteudo,
          fonte: input.fonte,
          url_fonte: input.url_fonte,
          area: input.area ? (input.area as any) : null,
          tags: input.tags,
          arquivo_url: input.arquivo_url,
          relevancia: input.relevancia,
          favorito: input.favorito,
          metadata: input.metadata || undefined,
          arquivo_tipo: input.arquivo_tipo,
          arquivo_tamanho: input.arquivo_tamanho,
          case_id: input.case_id || null,
          created_by_id: ctx.session.user.id,
        },
      })
    }),

  // Update
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        titulo: z.string().optional(),
        resumo: z.string().optional(),
        conteudo: z.string().optional(),
        fonte: z.string().optional(),
        url_fonte: z.string().optional(),
        area: z.string().nullish(),
        tags: z.array(z.string()).optional(),
        arquivo_url: z.string().optional(),
        relevancia: z.number().optional(),
        favorito: z.boolean().optional(),
        metadata: z.any().optional(),
        arquivo_tipo: z.string().optional(),
        arquivo_tamanho: z.number().optional(),
        case_id: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updateData: any = { ...data }
      if (data.tipo) updateData.tipo = data.tipo
      if (data.area !== undefined) updateData.area = data.area || null
      if (data.case_id !== undefined) updateData.case_id = data.case_id || null
      return ctx.db.libraryEntry.update({
        where: { id },
        data: updateData,
      })
    }),

  // Toggle favorite
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.libraryEntry.findUnique({ where: { id: input.id } })
      if (!entry) throw new Error("Entry not found")
      return ctx.db.libraryEntry.update({
        where: { id: input.id },
        data: { favorito: !entry.favorito },
      })
    }),

  // Delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.libraryEntry.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // Distinct tags for autocomplete
  allTags: protectedProcedure.query(async ({ ctx }) => {
    const entries = await ctx.db.libraryEntry.findMany({
      select: { tags: true },
    })
    const tagSet = new Set<string>()
    for (const e of entries) {
      for (const t of e.tags) tagSet.add(t)
    }
    return Array.from(tagSet).sort()
  }),

  // Counts by type
  countsByType: protectedProcedure.query(async ({ ctx }) => {
    const entries = await ctx.db.libraryEntry.groupBy({
      by: ["tipo"],
      _count: true,
    })
    return entries.map((e) => ({ tipo: e.tipo, count: e._count }))
  }),

  // Search for confecção integration (auto-search by area) — LEGACY
  searchForContext: protectedProcedure
    .input(
      z.object({
        areas: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.LibraryEntryWhereInput = {}

      if (input.areas && input.areas.length > 0) {
        where.area = { in: input.areas as any }
      }
      if (input.tags && input.tags.length > 0) {
        where.tags = { hasSome: input.tags }
      }

      return ctx.db.libraryEntry.findMany({
        where,
        orderBy: { relevancia: "desc" },
        take: input.limit,
        select: {
          id: true,
          titulo: true,
          tipo: true,
          area: true,
          resumo: true,
          conteudo: true,
          fonte: true,
          tags: true,
          relevancia: true,
        },
      })
    }),

  // Smart search — AI-grade search for Harvey Specter integration
  smartSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        areas: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        tipoDocumento: z.string().optional(),
        caseId: z.string().optional(),
        projectId: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions: Prisma.LibraryEntryWhereInput[] = []

      // Text search across title, summary, content, source
      if (input.query) {
        const terms = input.query.split(/\s+/).filter((t) => t.length > 2)
        if (terms.length > 0) {
          conditions.push({
            OR: terms.flatMap((term) => [
              { titulo: { contains: term, mode: "insensitive" as const } },
              { resumo: { contains: term, mode: "insensitive" as const } },
              { conteudo: { contains: term, mode: "insensitive" as const } },
              { fonte: { contains: term, mode: "insensitive" as const } },
            ]),
          })
        }
      }

      // Area filter
      if (input.areas && input.areas.length > 0) {
        conditions.push({ area: { in: input.areas as any } })
      }

      // Tags filter
      if (input.tags && input.tags.length > 0) {
        conditions.push({ tags: { hasSome: input.tags } })
      }

      // Case-linked entries
      if (input.caseId) {
        conditions.push({
          OR: [
            { case_id: input.caseId },
            { utilizado_em_casos: { some: { id: input.caseId } } },
          ],
        })
      }

      // Project-linked entries
      if (input.projectId) {
        conditions.push({
          utilizado_em_projetos: { some: { id: input.projectId } },
        })
      }

      // Combine: any condition match (OR across groups) plus favorites as boost
      const where: Prisma.LibraryEntryWhereInput =
        conditions.length > 0 ? { OR: conditions } : {}

      const entries = await ctx.db.libraryEntry.findMany({
        where,
        orderBy: [{ favorito: "desc" }, { relevancia: "desc" }, { created_at: "desc" }],
        take: input.limit,
        select: {
          id: true,
          titulo: true,
          tipo: true,
          area: true,
          resumo: true,
          conteudo: true,
          fonte: true,
          tags: true,
          relevancia: true,
          metadata: true,
          favorito: true,
        },
      })

      return entries
    }),

  // Bulk create — create multiple entries at once
  bulkCreate: protectedProcedure
    .input(
      z.object({
        entries: z.array(
          z.object({
            tipo: z.string(),
            titulo: z.string().min(1),
            resumo: z.string().optional(),
            conteudo: z.string().optional(),
            fonte: z.string().optional(),
            area: z.string().optional(),
            tags: z.array(z.string()).default([]),
            arquivo_url: z.string().optional(),
            arquivo_tipo: z.string().optional(),
            arquivo_tamanho: z.number().optional(),
            relevancia: z.number().min(0).max(5).default(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let created = 0
      for (const entry of input.entries) {
        await ctx.db.libraryEntry.create({
          data: {
            tipo: entry.tipo as any,
            titulo: entry.titulo,
            resumo: entry.resumo,
            conteudo: entry.conteudo,
            fonte: entry.fonte,
            area: entry.area ? (entry.area as any) : null,
            tags: entry.tags,
            arquivo_url: entry.arquivo_url,
            arquivo_tipo: entry.arquivo_tipo,
            arquivo_tamanho: entry.arquivo_tamanho,
            relevancia: entry.relevancia,
            created_by_id: ctx.session.user.id,
          },
        })
        created++
      }
      return { created }
    }),

  // Log a Biblioteca search
  logSearch: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        resultsCount: z.number(),
        entriesUsed: z.array(z.string()).default([]),
        documentGeneratedId: z.string().optional(),
        context: z.string(), // CHAT | DOCUMENTO | REVISAO | MANUAL
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.librarySearchLog.create({
        data: {
          user_id: ctx.session.user.id,
          query: input.query,
          results_count: input.resultsCount,
          entries_used: input.entriesUsed,
          document_generated_id: input.documentGeneratedId,
          context: input.context,
        },
      })
    }),

  // Usage analytics
  usageAnalytics: protectedProcedure.query(async ({ ctx }) => {
    // Most consulted entries (by entries_used in logs)
    const logs = await ctx.db.librarySearchLog.findMany({
      select: { entries_used: true, query: true, context: true },
      take: 500,
      orderBy: { created_at: "desc" },
    })

    // Count entry usage
    const entryUsageCount: Record<string, number> = {}
    for (const log of logs) {
      for (const entryId of log.entries_used) {
        entryUsageCount[entryId] = (entryUsageCount[entryId] || 0) + 1
      }
    }

    // Top 10 most used entries
    const topEntryIds = Object.entries(entryUsageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    const topEntries = topEntryIds.length > 0
      ? await ctx.db.libraryEntry.findMany({
          where: { id: { in: topEntryIds } },
          select: { id: true, titulo: true, tipo: true },
        })
      : []

    // Most searched terms
    const termCount: Record<string, number> = {}
    for (const log of logs) {
      const q = log.query.toLowerCase().trim()
      if (q) termCount[q] = (termCount[q] || 0) + 1
    }
    const topTerms = Object.entries(termCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Searches by context
    const contextCount: Record<string, number> = {}
    for (const log of logs) {
      contextCount[log.context] = (contextCount[log.context] || 0) + 1
    }

    return {
      topEntries: topEntries.map((e) => ({
        ...e,
        usageCount: entryUsageCount[e.id] || 0,
      })),
      topTerms: topTerms.map(([term, count]) => ({ term, count })),
      searchesByContext: contextCount,
      totalSearches: logs.length,
    }
  }),
})
