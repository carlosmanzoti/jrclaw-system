import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const projectsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          categoria: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const items = await ctx.db.project.findMany({
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        where: {
          ...(input?.status && { status: input.status as never }),
          ...(input?.categoria && { categoria: input.categoria as never }),
        },
        include: {
          cliente: { select: { id: true, nome: true } },
          advogado_responsavel: { select: { id: true, name: true } },
        },
        orderBy: { updated_at: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          cliente: true,
          advogado_responsavel: { select: { id: true, name: true, email: true } },
          equipe: { include: { user: { select: { id: true, name: true } } } },
          stakeholders: { include: { person: true } },
          etapas: { orderBy: { ordem: "asc" }, include: { tarefas: true } },
          marcos: { orderBy: { data_prevista: "asc" } },
          tarefas: { orderBy: { created_at: "desc" } },
          processos: { select: { id: true, numero_processo: true, tipo: true, status: true } },
        },
      });
    }),
});
