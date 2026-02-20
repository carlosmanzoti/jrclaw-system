import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

export const casesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.enum(["ATIVO", "SUSPENSO", "ARQUIVADO", "ENCERRADO"]).optional(),
          tipo: z.string().optional(),
          advogado_id: z.string().optional(),
          cliente_id: z.string().optional(),
          uf: z.string().optional(),
          tribunal: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const search = input?.search?.trim();

      const where = {
        ...(input?.status && { status: input.status }),
        ...(input?.tipo && { tipo: input.tipo as never }),
        ...(input?.advogado_id && { advogado_responsavel_id: input.advogado_id }),
        ...(input?.cliente_id && { cliente_id: input.cliente_id }),
        ...(input?.uf && { uf: input.uf }),
        ...(input?.tribunal && { tribunal: { contains: input.tribunal, mode: "insensitive" as const } }),
        ...(search && {
          OR: [
            { numero_processo: { contains: search, mode: "insensitive" as const } },
            { cliente: { nome: { contains: search, mode: "insensitive" as const } } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.case.findMany({
          take: limit + 1,
          cursor: input?.cursor ? { id: input.cursor } : undefined,
          where,
          include: {
            cliente: { select: { id: true, nome: true } },
            advogado_responsavel: { select: { id: true, name: true } },
            prazos: {
              where: { status: "PENDENTE" },
              orderBy: { data_limite: "asc" },
              take: 1,
            },
          },
          orderBy: { updated_at: "desc" },
        }),
        ctx.db.case.count({ where }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor, total };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const caso = await ctx.db.case.findUnique({
        where: { id: input.id },
        include: {
          cliente: true,
          juiz: { select: { id: true, nome: true, tipo: true } },
          advogado_responsavel: { select: { id: true, name: true, email: true, oab_number: true } },
          projeto: { select: { id: true, titulo: true, codigo: true, status: true } },
          partes: { include: { person: { select: { id: true, nome: true, cpf_cnpj: true, tipo: true, subtipo: true } } } },
          equipe: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          prazos: { orderBy: { data_limite: "asc" }, include: { responsavel: { select: { id: true, name: true } } } },
          movimentacoes: { orderBy: { data: "desc" } },
          documentos: { orderBy: { created_at: "desc" }, include: { criado_por: { select: { id: true, name: true } } } },
          atividades: { orderBy: { data: "desc" }, take: 50, include: { user: { select: { id: true, name: true } } } },
          credores: { include: { person: { select: { id: true, nome: true } } } },
          court: { select: { id: true, name: true, shortName: true, comarca: true, state: true, tribunal: true, courtType: true } },
          caseJudges: { where: { isCurrent: true }, include: { judge: { select: { id: true, name: true, title: true, specialty: true, avgDecisionDays: true, tendencyNotes: true } } } },
          caseAdministrators: { include: { administrator: { select: { id: true, companyName: true, tradeName: true, mainContactName: true, mainContactPhone: true } } } },
        },
      });
      if (!caso) throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
      return caso;
    }),

  create: protectedProcedure
    .input(
      z.object({
        numero_processo: z.string().optional().nullable(),
        tipo: z.string(),
        status: z.string().optional(),
        fase_processual: z.string().optional().nullable(),
        vara: z.string().optional().nullable(),
        comarca: z.string().optional().nullable(),
        tribunal: z.string().optional().nullable(),
        uf: z.string().optional().nullable(),
        juiz_id: z.string().optional().nullable(),
        valor_causa: z.number().optional().nullable(),
        valor_risco: z.number().optional().nullable(),
        cliente_id: z.string(),
        advogado_responsavel_id: z.string(),
        projeto_id: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.numero_processo) {
        const existing = await ctx.db.case.findUnique({ where: { numero_processo: input.numero_processo } });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Já existe um processo com este número" });
      }
      return ctx.db.case.create({
        data: {
          ...input,
          tipo: input.tipo as never,
          status: (input.status as never) || ("ATIVO" as never),
          valor_causa: input.valor_causa ?? undefined,
          valor_risco: input.valor_risco ?? undefined,
          tags: input.tags || [],
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        numero_processo: z.string().optional().nullable(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        fase_processual: z.string().optional().nullable(),
        vara: z.string().optional().nullable(),
        comarca: z.string().optional().nullable(),
        tribunal: z.string().optional().nullable(),
        uf: z.string().optional().nullable(),
        juiz_id: z.string().optional().nullable(),
        valor_causa: z.number().optional().nullable(),
        valor_risco: z.number().optional().nullable(),
        cliente_id: z.string().optional(),
        advogado_responsavel_id: z.string().optional(),
        projeto_id: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.case.update({
        where: { id },
        data: {
          ...data,
          tipo: data.tipo as never,
          status: data.status as never,
          valor_causa: data.valor_causa ?? undefined,
          valor_risco: data.valor_risco ?? undefined,
        },
      });
    }),

  // ─── Parties ─────────────────────────────────────────

  addParty: protectedProcedure
    .input(z.object({ case_id: z.string(), person_id: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseParty.create({ data: { case_id: input.case_id, person_id: input.person_id, role: input.role as never } });
    }),

  removeParty: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseParty.delete({ where: { id: input.id } });
    }),

  // ─── Movements ───────────────────────────────────────

  addMovement: protectedProcedure
    .input(
      z.object({
        case_id: z.string(),
        data: z.coerce.date(),
        tipo: z.string(),
        descricao: z.string().min(1),
        conteudo_integral: z.string().optional().nullable(),
        fonte: z.string().optional().nullable(),
        fonte_url: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseMovement.create({
        data: { ...input, tipo: input.tipo as never },
      });
    }),

  // ─── Deadlines ───────────────────────────────────────

  addDeadline: protectedProcedure
    .input(
      z.object({
        case_id: z.string(),
        tipo: z.string(),
        descricao: z.string().min(1),
        data_limite: z.coerce.date(),
        responsavel_id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const alertDays = input.tipo === "FATAL" ? [5, 3, 2, 1, 0] : [3, 1, 0];
      const dataLimite = new Date(input.data_limite);
      const data_alerta = alertDays.map((d) => {
        const dt = new Date(dataLimite);
        dt.setDate(dt.getDate() - d);
        return dt;
      });
      return ctx.db.deadline.create({
        data: { ...input, tipo: input.tipo as never, data_alerta },
      });
    }),

  updateDeadline: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["PENDENTE", "CUMPRIDO", "PERDIDO", "CANCELADO"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deadline.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  // ─── Team ────────────────────────────────────────────

  addTeamMember: protectedProcedure
    .input(z.object({ case_id: z.string(), user_id: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseTeam.create({ data: { case_id: input.case_id, user_id: input.user_id, role: input.role as never } });
    }),

  removeTeamMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseTeam.delete({ where: { id: input.id } });
    }),
});
