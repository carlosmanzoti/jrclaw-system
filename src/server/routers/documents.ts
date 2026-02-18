import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const documentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        case_id: z.string().optional(),
        project_id: z.string().optional(),
        person_id: z.string().optional(),
        tipo: z.array(z.string()).optional(),
        gerado_por_ia: z.boolean().optional(),
        search: z.string().optional(),
        date_from: z.coerce.date().optional(),
        date_to: z.coerce.date().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.case_id) where.case_id = input.case_id;
      if (input.project_id) where.project_id = input.project_id;
      if (input.person_id) where.person_id = input.person_id;
      if (input.tipo && input.tipo.length > 0) where.tipo = { in: input.tipo };
      if (input.gerado_por_ia !== undefined) where.gerado_por_ia = input.gerado_por_ia;

      if (input.date_from || input.date_to) {
        where.created_at = {
          ...(input.date_from && { gte: input.date_from }),
          ...(input.date_to && { lte: input.date_to }),
        };
      }

      if (input.tags && input.tags.length > 0) {
        where.tags = { hasSome: input.tags };
      }

      if (input.search) {
        where.OR = [
          { titulo: { contains: input.search, mode: "insensitive" } },
          { tags: { hasSome: [input.search] } },
        ];
      }

      const items = await ctx.db.document.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        include: {
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
          criado_por: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.document.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
          criado_por: { select: { id: true, name: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        titulo: z.string().min(1),
        tipo: z.string(),
        arquivo_url: z.string(),
        case_id: z.string().optional().nullable(),
        project_id: z.string().optional().nullable(),
        person_id: z.string().optional().nullable(),
        task_id: z.string().optional().nullable(),
        tags: z.array(z.string()).default([]),
        gerado_por_ia: z.boolean().default(false),
        compartilhado_portal: z.boolean().default(false),
        parent_document_id: z.string().optional().nullable(),
        versao: z.number().default(1),
        onedrive_item_id: z.string().optional().nullable(),
        onedrive_web_url: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.create({
        data: {
          titulo: input.titulo,
          tipo: input.tipo as never,
          arquivo_url: input.arquivo_url,
          case_id: input.case_id,
          project_id: input.project_id,
          person_id: input.person_id,
          task_id: input.task_id,
          tags: input.tags,
          gerado_por_ia: input.gerado_por_ia,
          compartilhado_portal: input.compartilhado_portal,
          versao: input.versao,
          onedrive_item_id: input.onedrive_item_id,
          onedrive_web_url: input.onedrive_web_url,
          criado_por_id: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        tipo: z.string().optional(),
        tags: z.array(z.string()).optional(),
        compartilhado_portal: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.document.update({
        where: { id },
        data: {
          ...(data.titulo && { titulo: data.titulo }),
          ...(data.tipo && { tipo: data.tipo as never }),
          ...(data.tags && { tags: data.tags }),
          ...(data.compartilhado_portal !== undefined && { compartilhado_portal: data.compartilhado_portal }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.delete({ where: { id: input.id } });
    }),

  casesForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.case.findMany({
      where: { status: "ATIVO" },
      select: { id: true, numero_processo: true, cliente: { select: { nome: true } } },
      orderBy: { updated_at: "desc" },
      take: 100,
    });
  }),

  projectsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      select: { id: true, titulo: true, codigo: true },
      orderBy: { updated_at: "desc" },
      take: 100,
    });
  }),
});
