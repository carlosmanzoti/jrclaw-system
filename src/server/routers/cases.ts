import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const casesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["ATIVO", "SUSPENSO", "ARQUIVADO", "ENCERRADO"]).optional(),
          tipo: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const items = await ctx.db.case.findMany({
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        where: {
          ...(input?.status && { status: input.status }),
          ...(input?.tipo && { tipo: input.tipo as never }),
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
      return ctx.db.case.findUnique({
        where: { id: input.id },
        include: {
          cliente: true,
          advogado_responsavel: { select: { id: true, name: true, email: true } },
          partes: { include: { person: true } },
          equipe: { include: { user: { select: { id: true, name: true, email: true } } } },
          prazos: { orderBy: { data_limite: "asc" } },
          credores: { include: { person: true } },
        },
      });
    }),
});
