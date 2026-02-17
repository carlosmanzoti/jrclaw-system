import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const activitiesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        case_id: z.string().optional(),
        project_id: z.string().optional(),
        person_id: z.string().optional(),
        user_id: z.string().optional(),
        tipo: z.array(z.string()).optional(),
        include_in_report: z.boolean().optional(),
        date_from: z.coerce.date().optional(),
        date_to: z.coerce.date().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.case_id) where.case_id = input.case_id;
      if (input.project_id) where.project_id = input.project_id;
      if (input.person_id) where.person_id = input.person_id;
      if (input.user_id) where.user_id = input.user_id;
      if (input.tipo && input.tipo.length > 0) where.tipo = { in: input.tipo };
      if (input.include_in_report !== undefined) where.include_in_report = input.include_in_report;

      if (input.date_from || input.date_to) {
        where.data = {
          ...(input.date_from && { gte: input.date_from }),
          ...(input.date_to && { lte: input.date_to }),
        };
      }

      if (input.search) {
        where.OR = [
          { descricao: { contains: input.search, mode: "insensitive" } },
          { resultado: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const items = await ctx.db.activity.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
          person: { select: { id: true, nome: true } },
          task: { select: { id: true, titulo: true } },
        },
        orderBy: { data: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tipo: z.string(),
        subtipo: z.string().optional(),
        descricao: z.string().min(1),
        resultado: z.string().optional(),
        data: z.coerce.date(),
        duracao_minutos: z.number().optional(),
        case_id: z.string().optional().nullable(),
        project_id: z.string().optional().nullable(),
        person_id: z.string().optional().nullable(),
        task_id: z.string().optional().nullable(),
        visivel_portal: z.boolean().default(false),
        faturavel: z.boolean().default(true),
        valor_hora: z.number().optional(),
        include_in_report: z.boolean().default(true),
        report_priority: z.number().default(0),
        communication_type: z.string().optional(),
        recipients: z.array(z.string()).default([]),
        financial_impact: z.number().optional(),
        financial_type: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.activity.create({
        data: {
          tipo: input.tipo as never,
          subtipo: input.subtipo,
          descricao: input.descricao,
          resultado: input.resultado,
          data: input.data,
          duracao_minutos: input.duracao_minutos,
          case_id: input.case_id,
          project_id: input.project_id,
          person_id: input.person_id,
          task_id: input.task_id,
          user_id: ctx.session.user.id!,
          visivel_portal: input.visivel_portal,
          faturavel: input.faturavel,
          valor_hora: input.valor_hora,
          include_in_report: input.include_in_report,
          report_priority: input.report_priority,
          communication_type: input.communication_type,
          recipients: input.recipients,
          financial_impact: input.financial_impact,
          financial_type: input.financial_type,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        subtipo: z.string().optional().nullable(),
        descricao: z.string().optional(),
        resultado: z.string().optional().nullable(),
        data: z.coerce.date().optional(),
        duracao_minutos: z.number().optional().nullable(),
        case_id: z.string().optional().nullable(),
        project_id: z.string().optional().nullable(),
        person_id: z.string().optional().nullable(),
        visivel_portal: z.boolean().optional(),
        faturavel: z.boolean().optional(),
        include_in_report: z.boolean().optional(),
        report_priority: z.number().optional(),
        financial_impact: z.number().optional().nullable(),
        financial_type: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.activity.update({
        where: { id },
        data: {
          ...(data.tipo && { tipo: data.tipo as never }),
          ...(data.subtipo !== undefined && { subtipo: data.subtipo }),
          ...(data.descricao && { descricao: data.descricao }),
          ...(data.resultado !== undefined && { resultado: data.resultado }),
          ...(data.data && { data: data.data }),
          ...(data.duracao_minutos !== undefined && { duracao_minutos: data.duracao_minutos }),
          ...(data.case_id !== undefined && { case_id: data.case_id }),
          ...(data.project_id !== undefined && { project_id: data.project_id }),
          ...(data.person_id !== undefined && { person_id: data.person_id }),
          ...(data.visivel_portal !== undefined && { visivel_portal: data.visivel_portal }),
          ...(data.faturavel !== undefined && { faturavel: data.faturavel }),
          ...(data.include_in_report !== undefined && { include_in_report: data.include_in_report }),
          ...(data.report_priority !== undefined && { report_priority: data.report_priority }),
          ...(data.financial_impact !== undefined && { financial_impact: data.financial_impact }),
          ...(data.financial_type !== undefined && { financial_type: data.financial_type }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.activity.delete({ where: { id: input.id } });
    }),
});
