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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updateData: any = { ...data }
      if (data.tipo) updateData.tipo = data.tipo
      if (data.area !== undefined) updateData.area = data.area || null
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

  // Search for confecção integration (auto-search by area)
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
})
