import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function endOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  // Sunday end of week
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  r.setDate(r.getDate() + daysUntilSunday);
  r.setHours(23, 59, 59, 999);
  return r;
}

export const deadlinesRouter = router({
  /**
   * Stats for KPI cards: today, tomorrow, this week, next 30 days, overdue
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const weekEnd = endOfWeek(now);
    const thirtyDaysEnd = endOfDay(addDays(now, 30));

    const [today, tomorrow, thisWeek, next30, overdue] = await Promise.all([
      ctx.db.deadline.count({
        where: { status: "PENDENTE", data_limite: { gte: todayStart, lte: todayEnd } },
      }),
      ctx.db.deadline.count({
        where: { status: "PENDENTE", data_limite: { gte: tomorrowStart, lte: tomorrowEnd } },
      }),
      ctx.db.deadline.count({
        where: {
          status: "PENDENTE",
          data_limite: { gte: startOfDay(addDays(now, 2)), lte: weekEnd },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: "PENDENTE",
          data_limite: { gte: todayStart, lte: thirtyDaysEnd },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: { in: ["PENDENTE", "PERDIDO"] },
          data_limite: { lt: todayStart },
        },
      }),
    ]);

    return { today, tomorrow, thisWeek, next30, overdue };
  }),

  /**
   * Full list with filters for the prazos page
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDENTE", "CUMPRIDO", "PERDIDO", "CANCELADO"]).optional(),
        tipo: z.enum(["FATAL", "ORDINARIO", "DILIGENCIA", "AUDIENCIA", "ASSEMBLEIA"]).optional(),
        responsavel_id: z.string().optional(),
        case_id: z.string().optional(),
        date_from: z.coerce.date().optional(),
        date_to: z.coerce.date().optional(),
        limit: z.number().min(1).max(200).default(100),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input?.status && { status: input.status }),
        ...(input?.tipo && { tipo: input.tipo }),
        ...(input?.responsavel_id && { responsavel_id: input.responsavel_id }),
        ...(input?.case_id && { case_id: input.case_id }),
        ...((input?.date_from || input?.date_to) && {
          data_limite: {
            ...(input?.date_from && { gte: input.date_from }),
            ...(input?.date_to && { lte: endOfDay(input.date_to) }),
          },
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.deadline.findMany({
          where,
          take: input?.limit ?? 100,
          include: {
            case_: {
              select: {
                id: true,
                numero_processo: true,
                tipo: true,
                uf: true,
                cliente: { select: { id: true, nome: true } },
              },
            },
            responsavel: { select: { id: true, name: true, avatar_url: true } },
          },
          orderBy: { data_limite: "asc" },
        }),
        ctx.db.deadline.count({ where }),
      ]);

      return { items, total };
    }),

  /**
   * Mark a deadline as CUMPRIDO
   */
  complete: protectedProcedure
    .input(z.object({
      id: z.string(),
      documento_cumprimento_id: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deadline.update({
        where: { id: input.id },
        data: {
          status: "CUMPRIDO",
          documento_cumprimento_id: input.documento_cumprimento_id,
        },
      });
    }),

  /**
   * Upcoming deadlines for dashboard widget (next 7 days, pending only)
   */
  upcoming: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      return ctx.db.deadline.findMany({
        where: {
          status: "PENDENTE",
          data_limite: { gte: startOfDay(now), lte: endOfDay(addDays(now, 7)) },
        },
        take: input?.limit ?? 5,
        include: {
          case_: {
            select: {
              id: true,
              numero_processo: true,
              cliente: { select: { nome: true } },
            },
          },
          responsavel: { select: { id: true, name: true } },
        },
        orderBy: { data_limite: "asc" },
      });
    }),

  /**
   * Delete a deadline
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deadline.delete({
        where: { id: input.id },
      });
    }),

  /**
   * List of cases for the "new deadline" modal
   */
  casesForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.case.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        numero_processo: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 100,
    });
  }),
});
