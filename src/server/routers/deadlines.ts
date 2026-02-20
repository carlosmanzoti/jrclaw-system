import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { workspaceRouter } from "./deadline-workspace";

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

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
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  r.setDate(r.getDate() + daysUntilSunday);
  r.setHours(23, 59, 59, 999);
  return r;
}

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Generate sequential deadline code PRZ-YYYY-XXXX */
async function generateDeadlineCodigo(
  db: { deadlineNew: { count: (args: { where: { codigo: { startsWith: string } } }) => Promise<number> } },
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRZ-${year}-`;
  const count = await db.deadlineNew.count({
    where: { codigo: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

/** Snapshot key fields of a DeadlineNew for history tracking */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapshotDeadline(dl: Record<string, unknown>): any {
  const keys = [
    "status", "prioridade", "titulo", "descricao", "tipo", "categoria",
    "contagem_tipo", "prazo_dias", "prazo_dias_efetivo", "prazo_horas",
    "dobra_aplicada", "dobra_motivo", "dobra_fator",
    "data_evento_gatilho", "data_inicio_contagem", "data_fim_prazo",
    "data_fim_prazo_fatal", "data_cumprimento",
    "responsavel_id", "responsavel_backup_id",
    "interrompido_embargos", "embargos_data_oposicao", "embargos_data_decisao",
    "dias_restantes_pre_embargos", "prazo_reiniciou",
    "suspensoes_aplicadas", "recesso_impactou", "observacoes",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap: Record<string, any> = {};
  for (const k of keys) {
    if (k in dl) {
      const v = dl[k];
      // Convert Date objects to ISO strings for JSON storage
      snap[k] = v instanceof Date ? v.toISOString() : v;
    }
  }
  return snap;
}

// ---------------------------------------------------------------------------
// Shared include fragments for DeadlineNew queries
// ---------------------------------------------------------------------------

const deadlineNewIncludes = {
  responsavel: { select: { id: true, name: true, avatar_url: true, role: true } },
  responsavel_backup: { select: { id: true, name: true, avatar_url: true } },
  case_: {
    select: {
      id: true,
      numero_processo: true,
      tipo: true,
      uf: true,
      vara: true,
      cliente: { select: { id: true, nome: true } },
    },
  },
} as const;

const deadlineNewFullIncludes = {
  ...deadlineNewIncludes,
  notificacoes: { orderBy: { created_at: "desc" as const }, take: 50 },
  historico: { orderBy: { created_at: "desc" as const }, take: 100 },
  parent_deadline: { select: { id: true, codigo: true, titulo: true, status: true } },
  child_deadlines: {
    select: { id: true, codigo: true, titulo: true, status: true, data_fim_prazo: true },
    orderBy: { data_fim_prazo: "asc" as const },
  },
} as const;

// ---------------------------------------------------------------------------
// Active status filter (deadlines that are not yet resolved)
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = ["FUTURO", "CORRENDO", "PROXIMO", "URGENTE", "HOJE", "VENCIDO", "SUSPENSO", "INTERROMPIDO"];
const PENDING_STATUSES = ["CORRENDO", "PROXIMO", "URGENTE", "HOJE"];

// ===========================================================================
// ROUTER
// ===========================================================================

export const deadlinesRouter = router({
  // ============================================================
  // LEGACY ENDPOINTS (old Deadline model — backward compatibility)
  // ============================================================

  /**
   * Stats for the legacy KPI cards: today, tomorrow, this week, next 30 days, overdue
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
   * Legacy full list with filters (old Deadline model)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDENTE", "CUMPRIDO", "PERDIDO", "CANCELADO"]).optional(),
          tipo: z.string().optional(),
          responsavel_id: z.string().optional(),
          case_id: z.string().optional(),
          date_from: z.coerce.date().optional(),
          date_to: z.coerce.date().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input?.status && { status: input.status }),
        ...(input?.tipo && { tipo: input.tipo as never }),
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
   * Legacy mark as CUMPRIDO
   */
  complete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        documento_cumprimento_id: z.string().optional(),
      }),
    )
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
   * Legacy upcoming deadlines for dashboard widget (next 7 days)
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
   * Legacy delete
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deadline.delete({ where: { id: input.id } });
    }),

  // ============================================================
  // NEW MODULE ENDPOINTS (DeadlineNew model)
  // ============================================================

  /**
   * Dashboard stats for the new prazos page
   */
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const threeDaysEnd = endOfDay(addDays(now, 3));
    const weekEnd = endOfWeek(now);
    const thirtyDaysEnd = endOfDay(addDays(now, 30));

    // Query both tables (DeadlineNew and Deadline/legacy) and sum results
    const NOT_RESOLVED_NEW = ["CUMPRIDO", "CANCELADO"];
    const NOT_RESOLVED_LEGACY = ["CUMPRIDO", "PERDIDO", "CANCELADO"];

    const [
      vencidos_new, hoje_new, proximos3dias_new, estaSemana_new, proximos30dias_new, fatais_new, total_new,
      vencidos_leg, hoje_leg, proximos3dias_leg, estaSemana_leg, proximos30dias_leg, fatais_leg, total_leg,
    ] = await Promise.all([
      // --- DeadlineNew table ---
      // Vencidos: date-based (overdue = data_fim_prazo < today AND not resolved)
      ctx.db.deadlineNew.count({
        where: {
          data_fim_prazo: { lt: todayStart },
          status: { notIn: NOT_RESOLVED_NEW },
        },
      }),
      ctx.db.deadlineNew.count({
        where: {
          status: { notIn: NOT_RESOLVED_NEW },
          data_fim_prazo: { gte: todayStart, lte: todayEnd },
        },
      }),
      ctx.db.deadlineNew.count({
        where: {
          status: { notIn: NOT_RESOLVED_NEW },
          data_fim_prazo: { gte: todayStart, lte: threeDaysEnd },
        },
      }),
      ctx.db.deadlineNew.count({
        where: {
          status: { notIn: NOT_RESOLVED_NEW },
          data_fim_prazo: { gte: todayStart, lte: weekEnd },
        },
      }),
      ctx.db.deadlineNew.count({
        where: {
          status: { notIn: NOT_RESOLVED_NEW },
          data_fim_prazo: { gte: todayStart, lte: thirtyDaysEnd },
        },
      }),
      ctx.db.deadlineNew.count({
        where: {
          status: { notIn: NOT_RESOLVED_NEW },
          prioridade: "FATAL",
        },
      }),
      ctx.db.deadlineNew.count({
        where: { status: { notIn: NOT_RESOLVED_NEW } },
      }),
      // --- Legacy Deadline table ---
      ctx.db.deadline.count({
        where: {
          dueDate: { lt: todayStart },
          status: { notIn: NOT_RESOLVED_LEGACY as never },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: { notIn: NOT_RESOLVED_LEGACY as never },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: { notIn: NOT_RESOLVED_LEGACY as never },
          dueDate: { gte: todayStart, lte: threeDaysEnd },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: { notIn: NOT_RESOLVED_LEGACY as never },
          dueDate: { gte: todayStart, lte: weekEnd },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: { notIn: NOT_RESOLVED_LEGACY as never },
          dueDate: { gte: todayStart, lte: thirtyDaysEnd },
        },
      }),
      ctx.db.deadline.count({
        where: {
          status: { notIn: NOT_RESOLVED_LEGACY as never },
          priority: "CRITICA",
        },
      }),
      ctx.db.deadline.count({
        where: { status: { notIn: NOT_RESOLVED_LEGACY as never } },
      }),
    ]);

    return {
      vencidos: vencidos_new + vencidos_leg,
      hoje: hoje_new + hoje_leg,
      proximos3dias: proximos3dias_new + proximos3dias_leg,
      estaSemana: estaSemana_new + estaSemana_leg,
      proximos30dias: proximos30dias_new + proximos30dias_leg,
      fatais_pendentes: fatais_new + fatais_leg,
      total_pendentes: total_new + total_leg,
    };
  }),

  /**
   * Full list with advanced filters and pagination (DeadlineNew)
   */
  listNew: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          tipo: z.string().optional(),
          prioridade: z.string().optional(),
          responsavel_id: z.string().optional(),
          case_id: z.string().optional(),
          tribunal_codigo: z.string().optional(),
          uf: z.string().optional(),
          date_from: z.coerce.date().optional(),
          date_to: z.coerce.date().optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          per_page: z.number().min(1).max(200).default(50),
          sort_by: z.string().default("data_fim_prazo"),
          sort_dir: z.enum(["asc", "desc"]).default("asc"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const perPage = input?.per_page ?? 50;
      const skip = (page - 1) * perPage;

      // Build dynamic where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      if (input?.status) {
        where.status = input.status as never;
      }
      if (input?.tipo) {
        where.tipo = input.tipo as never;
      }
      if (input?.prioridade) {
        where.prioridade = input.prioridade as never;
      }
      if (input?.responsavel_id) {
        where.responsavel_id = input.responsavel_id;
      }
      if (input?.case_id) {
        where.case_id = input.case_id;
      }
      if (input?.tribunal_codigo) {
        where.tribunal_codigo = input.tribunal_codigo;
      }
      if (input?.uf) {
        where.uf = input.uf;
      }
      if (input?.date_from || input?.date_to) {
        where.data_fim_prazo = {
          ...(input?.date_from && { gte: startOfDay(input.date_from) }),
          ...(input?.date_to && { lte: endOfDay(input.date_to) }),
        };
      }
      if (input?.search) {
        where.OR = [
          { titulo: { contains: input.search, mode: "insensitive" } },
          { descricao: { contains: input.search, mode: "insensitive" } },
          { codigo: { contains: input.search, mode: "insensitive" } },
          { numero_processo: { contains: input.search, mode: "insensitive" } },
        ];
      }

      // Build orderBy
      const sortField = input?.sort_by ?? "data_fim_prazo";
      const sortDir = input?.sort_dir ?? "asc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderBy: Record<string, any> = { [sortField]: sortDir };

      // Also query legacy Deadline table and merge results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legacyWhere: Record<string, any> = {};
      if (input?.status) {
        // Map DeadlineNew statuses to legacy statuses
        const statusMap: Record<string, string> = {
          CORRENDO: "PENDENTE", PROXIMO: "PENDENTE", URGENTE: "PENDENTE",
          HOJE: "PENDENTE", VENCIDO: "PERDIDO", FUTURO: "PENDENTE",
        };
        legacyWhere.status = (statusMap[input.status] ?? input.status) as never;
      }
      if (input?.tipo) legacyWhere.tipo = input.tipo as never;
      if (input?.responsavel_id) legacyWhere.responsavel_id = input.responsavel_id;
      if (input?.case_id) legacyWhere.case_id = input.case_id;
      if (input?.uf) {
        legacyWhere.case_ = { uf: input.uf };
      }
      if (input?.date_from || input?.date_to) {
        legacyWhere.dueDate = {
          ...(input?.date_from && { gte: startOfDay(input.date_from) }),
          ...(input?.date_to && { lte: endOfDay(input.date_to) }),
        };
      }
      if (input?.search) {
        legacyWhere.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { descricao: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [newItems, newTotal, legacyItems, legacyTotal] = await Promise.all([
        ctx.db.deadlineNew.findMany({
          where,
          skip,
          take: perPage,
          include: deadlineNewIncludes,
          orderBy,
        }),
        ctx.db.deadlineNew.count({ where }),
        ctx.db.deadline.findMany({
          where: legacyWhere,
          skip,
          take: perPage,
          include: {
            case_: {
              select: {
                id: true,
                numero_processo: true,
                tipo: true,
                uf: true,
                vara: true,
                cliente: { select: { id: true, nome: true } },
              },
            },
            responsavel: { select: { id: true, name: true, avatar_url: true, role: true } },
            client: { select: { id: true, nome: true } },
          },
          orderBy: { dueDate: sortDir },
        }),
        ctx.db.deadline.count({ where: legacyWhere }),
      ]);

      // Normalize legacy items to match DeadlineNew shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedLegacy = legacyItems.map((d: any) => ({
        ...d,
        _source: "legacy" as const,
        codigo: `LEG-${d.id.slice(-6)}`,
        titulo: d.title || d.descricao || "Prazo sem titulo",
        tipo: String(d.tipo),
        categoria: "PARTE",
        contagem_tipo: d.countingType || "DIAS_UTEIS",
        prazo_dias: d.calculatedDays || d.originalDays || 0,
        prazo_dias_efetivo: d.calculatedDays || 0,
        data_evento_gatilho: d.startDate || d.created_at,
        data_inicio_contagem: d.startDate || d.created_at,
        data_fim_prazo: d.dueDate || d.data_limite,
        data_fim_prazo_fatal: d.fatalDueDate || d.dueDate || d.data_limite,
        data_cumprimento: null,
        status: d.dueDate && new Date(d.dueDate) < new Date() && d.status === "PENDENTE"
          ? "VENCIDO" : d.status === "PENDENTE" ? "CORRENDO" : d.status === "PERDIDO" ? "VENCIDO" : d.status,
        prioridade: d.priority || "MEDIA",
        responsavel_backup: null,
        numero_processo: d.case_?.numero_processo || null,
        descricao: d.descricao,
        observacoes: null,
      }));

      // Merge, sort by data_fim_prazo, and paginate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allItems = [...newItems, ...normalizedLegacy].sort((a: any, b: any) => {
        const dateA = new Date(a.data_fim_prazo || 0).getTime();
        const dateB = new Date(b.data_fim_prazo || 0).getTime();
        return sortDir === "asc" ? dateA - dateB : dateB - dateA;
      }).slice(0, perPage);

      const total = newTotal + legacyTotal;

      return {
        items: allItems,
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      };
    }),

  /**
   * Get single deadline by ID with all relations
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const deadline = await ctx.db.deadlineNew.findUnique({
        where: { id: input.id },
        include: deadlineNewFullIncludes,
      });

      if (!deadline) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      return deadline;
    }),

  /**
   * Create new deadline (DeadlineNew)
   */
  create: protectedProcedure
    .input(
      z.object({
        case_id: z.string().optional(),
        rj_case_id: z.string().optional(),
        recovery_case_id: z.string().optional(),
        negotiation_id: z.string().optional(),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        tipo: z.string(),
        categoria: z.string().default("PARTE"),
        contagem_tipo: z.string().default("DIAS_UTEIS"),
        prazo_dias: z.number().int(),
        prazo_dias_efetivo: z.number().int().optional(),
        prazo_horas: z.number().int().optional(),
        dobra_aplicada: z.boolean().default(false),
        dobra_motivo: z.string().optional(),
        dobra_fator: z.number().optional(),
        lei_especifica_prazo: z.boolean().default(false),
        data_evento_gatilho: z.coerce.date(),
        metodo_intimacao: z.string().optional(),
        data_disponibilizacao: z.coerce.date().optional(),
        data_publicacao: z.coerce.date().optional(),
        data_inicio_contagem: z.coerce.date(),
        data_fim_prazo: z.coerce.date(),
        data_fim_prazo_fatal: z.coerce.date().optional(),
        status: z.string().default("CORRENDO"),
        prioridade: z.string().default("ALTA"),
        tribunal_codigo: z.string().optional(),
        tribunal_nome: z.string().optional(),
        uf: z.string().optional(),
        municipio: z.string().optional(),
        municipio_ibge: z.string().optional(),
        vara: z.string().optional(),
        numero_processo: z.string().optional(),
        responsavel_id: z.string().optional(),
        responsavel_backup_id: z.string().optional(),
        parent_deadline_id: z.string().optional(),
        suspensoes_aplicadas: z.any().optional(),
        recesso_impactou: z.boolean().default(false),
        log_calculo: z.any().optional(),
        sugestao_ia: z.string().optional(),
        risco_ia: z.string().optional(),
        observacoes: z.string().optional(),
        documento_id: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const codigo = await generateDeadlineCodigo(ctx.db);
      const userId = ctx.session.user.id;

      const deadline = await ctx.db.deadlineNew.create({
        data: {
          codigo,
          titulo: input.titulo,
          descricao: input.descricao,
          tipo: input.tipo as never,
          categoria: input.categoria as never,
          contagem_tipo: input.contagem_tipo as never,
          prazo_dias: input.prazo_dias,
          prazo_dias_efetivo: input.prazo_dias_efetivo,
          prazo_horas: input.prazo_horas,
          dobra_aplicada: input.dobra_aplicada,
          dobra_motivo: input.dobra_motivo,
          dobra_fator: input.dobra_fator,
          lei_especifica_prazo: input.lei_especifica_prazo,
          data_evento_gatilho: input.data_evento_gatilho,
          metodo_intimacao: input.metodo_intimacao,
          data_disponibilizacao: input.data_disponibilizacao,
          data_publicacao: input.data_publicacao,
          data_inicio_contagem: input.data_inicio_contagem,
          data_fim_prazo: input.data_fim_prazo,
          data_fim_prazo_fatal: input.data_fim_prazo_fatal,
          status: input.status as never,
          prioridade: input.prioridade as never,
          tribunal_codigo: input.tribunal_codigo,
          tribunal_nome: input.tribunal_nome,
          uf: input.uf,
          municipio: input.municipio,
          municipio_ibge: input.municipio_ibge,
          vara: input.vara,
          numero_processo: input.numero_processo,
          responsavel_id: input.responsavel_id,
          responsavel_backup_id: input.responsavel_backup_id,
          parent_deadline_id: input.parent_deadline_id,
          suspensoes_aplicadas: input.suspensoes_aplicadas ?? undefined,
          recesso_impactou: input.recesso_impactou,
          log_calculo: input.log_calculo ?? undefined,
          sugestao_ia: input.sugestao_ia,
          risco_ia: input.risco_ia,
          observacoes: input.observacoes,
          documento_id: input.documento_id,
          calculado_por: userId,
          calculado_em: new Date(),
          case_id: input.case_id,
          rj_case_id: input.rj_case_id,
          recovery_case_id: input.recovery_case_id,
          negotiation_id: input.negotiation_id,
        },
        include: deadlineNewIncludes,
      });

      // Create history entry
      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: deadline.id,
          acao: "CRIADO",
          dados_depois: snapshotDeadline(deadline as unknown as Record<string, unknown>),
          usuario_id: userId,
        },
      });

      return deadline;
    }),

  /**
   * Update existing deadline (DeadlineNew)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        tipo: z.string().optional(),
        categoria: z.string().optional(),
        contagem_tipo: z.string().optional(),
        prazo_dias: z.number().int().optional(),
        prazo_dias_efetivo: z.number().int().optional(),
        prazo_horas: z.number().int().optional(),
        dobra_aplicada: z.boolean().optional(),
        dobra_motivo: z.string().optional(),
        dobra_fator: z.number().optional(),
        lei_especifica_prazo: z.boolean().optional(),
        data_evento_gatilho: z.coerce.date().optional(),
        metodo_intimacao: z.string().optional(),
        data_disponibilizacao: z.coerce.date().optional(),
        data_publicacao: z.coerce.date().optional(),
        data_inicio_contagem: z.coerce.date().optional(),
        data_fim_prazo: z.coerce.date().optional(),
        data_fim_prazo_fatal: z.coerce.date().optional(),
        status: z.string().optional(),
        prioridade: z.string().optional(),
        tribunal_codigo: z.string().optional(),
        tribunal_nome: z.string().optional(),
        uf: z.string().optional(),
        municipio: z.string().optional(),
        municipio_ibge: z.string().optional(),
        vara: z.string().optional(),
        numero_processo: z.string().optional(),
        responsavel_id: z.string().optional(),
        responsavel_backup_id: z.string().optional(),
        parent_deadline_id: z.string().nullable().optional(),
        suspensoes_aplicadas: z.any().optional(),
        recesso_impactou: z.boolean().optional(),
        log_calculo: z.any().optional(),
        sugestao_ia: z.string().optional(),
        risco_ia: z.string().optional(),
        observacoes: z.string().optional(),
        documento_id: z.string().optional(),
        case_id: z.string().nullable().optional(),
        rj_case_id: z.string().nullable().optional(),
        recovery_case_id: z.string().nullable().optional(),
        negotiation_id: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const userId = ctx.session.user.id;

      // Fetch current state for history snapshot
      const current = await ctx.db.deadlineNew.findUnique({ where: { id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      // Build update payload, only including fields that were provided
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      const updated = await ctx.db.deadlineNew.update({
        where: { id },
        data: updateData as never,
        include: deadlineNewIncludes,
      });

      // Create history entry
      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: id,
          acao: "EDITADO_MANUAL",
          dados_antes: dadosAntes,
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
        },
      });

      return updated;
    }),

  /**
   * Mark deadline as CUMPRIDO (completed)
   */
  completar: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        documento_id: z.string().optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: {
          status: "CUMPRIDO" as never,
          data_cumprimento: new Date(),
          documento_id: input.documento_id ?? current.documento_id,
          observacoes: input.observacoes
            ? current.observacoes
              ? `${current.observacoes}\n---\n${input.observacoes}`
              : input.observacoes
            : current.observacoes,
        },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "CUMPRIDO",
          dados_antes: dadosAntes,
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
          motivo: input.observacoes,
        },
      });

      return updated;
    }),

  /**
   * Cancel a deadline
   */
  cancelar: protectedProcedure
    .input(z.object({ id: z.string(), motivo: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: { status: "CANCELADO" as never },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "CANCELADO",
          dados_antes: dadosAntes,
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
          motivo: input.motivo,
        },
      });

      return updated;
    }),

  /**
   * Mark as verified (conferido) by a second person
   */
  verificar: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: {
          conferido_por: userId,
          conferido_em: new Date(),
        },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "CONFERIDO",
          dados_antes: snapshotDeadline(current as unknown as Record<string, unknown>),
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
        },
      });

      return updated;
    }),

  /**
   * Suspend a deadline (recesso, greve, indisponibilidade, etc.)
   */
  suspender: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        motivo: z.string().min(1),
        data_retomada: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: {
          status: "SUSPENSO" as never,
          observacoes: current.observacoes
            ? `${current.observacoes}\n---\nSuspenso: ${input.motivo}`
            : `Suspenso: ${input.motivo}`,
        },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "SUSPENSO_RECESSO",
          dados_antes: dadosAntes,
          dados_depois: {
            ...snapshotDeadline(updated as unknown as Record<string, unknown>),
            data_retomada_prevista: input.data_retomada?.toISOString() ?? null,
          },
          usuario_id: userId,
          motivo: input.motivo,
        },
      });

      return updated;
    }),

  /**
   * Resume a suspended deadline
   */
  retomar: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nova_data_fim: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }
      if (current.status !== "SUSPENSO") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Prazo nao esta suspenso" });
      }

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: {
          status: "CORRENDO" as never,
          data_fim_prazo: input.nova_data_fim,
        },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "RETOMADO_RECESSO",
          dados_antes: dadosAntes,
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
        },
      });

      return updated;
    }),

  /**
   * Interrupt deadline due to embargos de declaracao
   */
  interromperEmbargos: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data_oposicao: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      // Calculate remaining days before interruption
      const now = new Date();
      const fimPrazo = new Date(current.data_fim_prazo);
      const diffMs = fimPrazo.getTime() - now.getTime();
      const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: {
          status: "INTERROMPIDO" as never,
          interrompido_embargos: true,
          embargos_data_oposicao: input.data_oposicao,
          dias_restantes_pre_embargos: diasRestantes,
        },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "INTERROMPIDO_EMBARGOS",
          dados_antes: dadosAntes,
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
          motivo: `Embargos de declaracao opostos em ${input.data_oposicao.toISOString().slice(0, 10)}. ${diasRestantes} dias restantes.`,
        },
      });

      return updated;
    }),

  /**
   * Resume deadline after embargos de declaracao decided
   */
  retomarEmbargos: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data_decisao: z.coerce.date(),
        nova_data_fim: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }
      if (!current.interrompido_embargos) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Prazo nao esta interrompido por embargos",
        });
      }

      const dadosAntes = snapshotDeadline(current as unknown as Record<string, unknown>);

      const updated = await ctx.db.deadlineNew.update({
        where: { id: input.id },
        data: {
          status: "CORRENDO" as never,
          embargos_data_decisao: input.data_decisao,
          prazo_reiniciou: true,
          data_fim_prazo: input.nova_data_fim,
        },
        include: deadlineNewIncludes,
      });

      await ctx.db.deadlineHistory.create({
        data: {
          deadline_id: input.id,
          acao: "REINICIADO_EMBARGOS",
          dados_antes: dadosAntes,
          dados_depois: snapshotDeadline(updated as unknown as Record<string, unknown>),
          usuario_id: userId,
          motivo: `Embargos decididos em ${input.data_decisao.toISOString().slice(0, 10)}. Novo fim: ${input.nova_data_fim.toISOString().slice(0, 10)}.`,
        },
      });

      return updated;
    }),

  /**
   * Delete a DeadlineNew record
   */
  deleteNew: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.deadlineNew.findUnique({ where: { id: input.id } });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo nao encontrado" });
      }

      // Cascade deletes history and notifications via schema onDelete: Cascade
      return ctx.db.deadlineNew.delete({ where: { id: input.id } });
    }),

  /**
   * Timeline view: deadlines grouped by date for the next N days
   */
  timeline: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const now = new Date();
      const from = startOfDay(now);
      const to = endOfDay(addDays(now, days));

      const deadlines = await ctx.db.deadlineNew.findMany({
        where: {
          status: { in: ACTIVE_STATUSES as never },
          data_fim_prazo: { gte: from, lte: to },
        },
        include: deadlineNewIncludes,
        orderBy: { data_fim_prazo: "asc" },
      });

      // Group by date key (YYYY-MM-DD)
      const grouped: Record<string, typeof deadlines> = {};
      for (const dl of deadlines) {
        const key = formatDateKey(new Date(dl.data_fim_prazo));
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(dl);
      }

      // Convert to sorted array
      const timeline = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, items]) => ({ date, items, count: items.length }));

      return { timeline, total: deadlines.length };
    }),

  /**
   * Calendar view: all deadlines and holidays for a given month
   */
  calendarView: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const monthStart = new Date(input.year, input.month - 1, 1);
      const monthEnd = endOfDay(new Date(input.year, input.month, 0)); // last day of month

      const [deadlines, holidays] = await Promise.all([
        ctx.db.deadlineNew.findMany({
          where: {
            data_fim_prazo: { gte: monthStart, lte: monthEnd },
          },
          include: deadlineNewIncludes,
          orderBy: { data_fim_prazo: "asc" },
        }),
        ctx.db.holiday.findMany({
          where: {
            data: { gte: monthStart, lte: monthEnd },
          },
          orderBy: { data: "asc" },
        }),
      ]);

      // Also fetch court holidays for this month
      const courtHolidays = await ctx.db.courtHoliday.findMany({
        where: {
          data: { gte: monthStart, lte: monthEnd },
        },
        include: {
          calendar: { select: { tribunal_codigo: true, tribunal_nome: true, uf: true } },
        },
        orderBy: { data: "asc" },
      });

      return { deadlines, holidays, courtHolidays, year: input.year, month: input.month };
    }),

  /**
   * History entries for a specific deadline
   */
  history: protectedProcedure
    .input(z.object({ deadline_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deadlineHistory.findMany({
        where: { deadline_id: input.deadline_id },
        orderBy: { created_at: "desc" },
      });
    }),

  // ============================================================
  // CATALOG SUB-ROUTER (DeadlineCatalog)
  // ============================================================

  catalog: router({
    /**
     * List all active catalog entries with optional filters
     */
    list: protectedProcedure
      .input(
        z
          .object({
            categoria: z.string().optional(),
            lei: z.string().optional(),
            search: z.string().optional(),
            tipo_prazo: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = { ativo: true };

        if (input?.categoria) {
          where.categoria = input.categoria as never;
        }
        if (input?.lei) {
          where.lei = { contains: input.lei, mode: "insensitive" };
        }
        if (input?.tipo_prazo) {
          where.tipo_prazo = input.tipo_prazo as never;
        }
        if (input?.search) {
          where.OR = [
            { nome: { contains: input.search, mode: "insensitive" } },
            { descricao: { contains: input.search, mode: "insensitive" } },
            { codigo: { contains: input.search, mode: "insensitive" } },
            { artigo: { contains: input.search, mode: "insensitive" } },
          ];
        }

        return ctx.db.deadlineCatalog.findMany({
          where,
          orderBy: [{ categoria: "asc" }, { nome: "asc" }],
        });
      }),

    /**
     * Get single catalog entry by ID
     */
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const entry = await ctx.db.deadlineCatalog.findUnique({
          where: { id: input.id },
        });

        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item do catalogo nao encontrado" });
        }

        return entry;
      }),

    /**
     * Get catalog entry by codigo
     */
    getByCodigo: protectedProcedure
      .input(z.object({ codigo: z.string() }))
      .query(async ({ ctx, input }) => {
        const entry = await ctx.db.deadlineCatalog.findUnique({
          where: { codigo: input.codigo },
        });

        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item do catalogo nao encontrado" });
        }

        return entry;
      }),

    /**
     * Create a new catalog entry (user-created, is_system=false)
     */
    create: protectedProcedure
      .input(
        z.object({
          codigo: z.string().min(1),
          nome: z.string().min(1),
          descricao: z.string().min(1),
          dias: z.number().int().min(0),
          contagem_tipo: z.string(),
          tipo_prazo: z.string(),
          categoria: z.string(),
          subcategoria: z.string().optional(),
          artigo: z.string().min(1),
          lei: z.string().min(1),
          paragrafos: z.string().optional(),
          admite_dobra: z.boolean().default(true),
          excecao_dobra: z.string().optional(),
          admite_litisconsorcio: z.boolean().default(true),
          excecao_litisconsorcio: z.string().optional(),
          efeito_nao_cumprimento: z.string().optional(),
          efeito_recursal: z.string().optional(),
          termo_inicial: z.string().min(1),
          observacoes: z.string().optional(),
          jurisprudencia: z.string().optional(),
          prazo_resposta_dias: z.number().int().optional(),
          prazo_resposta_ref: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.deadlineCatalog.findUnique({
          where: { codigo: input.codigo },
        });
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: `Codigo "${input.codigo}" ja existe no catalogo` });
        }
        return ctx.db.deadlineCatalog.create({
          data: { ...input, is_system: false },
        });
      }),

    /**
     * Update an existing catalog entry
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          codigo: z.string().min(1).optional(),
          nome: z.string().min(1).optional(),
          descricao: z.string().min(1).optional(),
          dias: z.number().int().min(0).optional(),
          contagem_tipo: z.string().optional(),
          tipo_prazo: z.string().optional(),
          categoria: z.string().optional(),
          subcategoria: z.string().nullable().optional(),
          artigo: z.string().min(1).optional(),
          lei: z.string().min(1).optional(),
          paragrafos: z.string().nullable().optional(),
          admite_dobra: z.boolean().optional(),
          excecao_dobra: z.string().nullable().optional(),
          admite_litisconsorcio: z.boolean().optional(),
          excecao_litisconsorcio: z.string().nullable().optional(),
          efeito_nao_cumprimento: z.string().nullable().optional(),
          efeito_recursal: z.string().nullable().optional(),
          termo_inicial: z.string().min(1).optional(),
          observacoes: z.string().nullable().optional(),
          jurisprudencia: z.string().nullable().optional(),
          prazo_resposta_dias: z.number().int().nullable().optional(),
          prazo_resposta_ref: z.string().nullable().optional(),
          ativo: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.deadlineCatalog.update({
          where: { id },
          data,
        });
      }),

    /**
     * Delete a catalog entry (only non-system entries can be deleted)
     */
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const entry = await ctx.db.deadlineCatalog.findUnique({
          where: { id: input.id },
        });
        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item do catalogo nao encontrado" });
        }
        if (entry.is_system) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nao e possivel excluir prazos do sistema. Desative-o em vez disso." });
        }
        return ctx.db.deadlineCatalog.delete({
          where: { id: input.id },
        });
      }),
  }),

  // ============================================================
  // COURT CALENDAR SUB-ROUTER
  // ============================================================

  courtCalendar: router({
    /**
     * List court calendars with optional filters
     */
    list: protectedProcedure
      .input(
        z
          .object({
            ano: z.number().int().optional(),
            tribunal_tipo: z.string().optional(),
            uf: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};

        if (input?.ano) {
          where.ano = input.ano;
        }
        if (input?.tribunal_tipo) {
          where.tribunal_tipo = input.tribunal_tipo as never;
        }
        if (input?.uf) {
          where.uf = input.uf;
        }

        return ctx.db.courtCalendar.findMany({
          where,
          include: {
            _count: { select: { feriados: true, suspensoes: true } },
          },
          orderBy: [{ ano: "desc" }, { tribunal_nome: "asc" }],
        });
      }),

    /**
     * Get single court calendar with all holidays and suspensions
     */
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const calendar = await ctx.db.courtCalendar.findUnique({
          where: { id: input.id },
          include: {
            feriados: { orderBy: { data: "asc" } },
            suspensoes: { orderBy: { data_inicio: "asc" } },
          },
        });

        if (!calendar) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Calendario nao encontrado" });
        }

        return calendar;
      }),

    /**
     * List holidays with optional filters
     */
    holidays: protectedProcedure
      .input(
        z
          .object({
            calendar_id: z.string().optional(),
            date_from: z.coerce.date().optional(),
            date_to: z.coerce.date().optional(),
            uf: z.string().optional(),
            tipo: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};

        if (input?.calendar_id) {
          where.calendar_id = input.calendar_id;
        }
        if (input?.uf) {
          where.OR = [{ uf: input.uf }, { uf: null }]; // include national holidays
        }
        if (input?.tipo) {
          where.tipo = input.tipo as never;
        }
        if (input?.date_from || input?.date_to) {
          where.data = {
            ...(input?.date_from && { gte: startOfDay(input.date_from) }),
            ...(input?.date_to && { lte: endOfDay(input.date_to) }),
          };
        }

        return ctx.db.courtHoliday.findMany({
          where,
          include: {
            calendar: { select: { tribunal_codigo: true, tribunal_nome: true } },
          },
          orderBy: { data: "asc" },
        });
      }),

    /**
     * List suspensions with optional filters
     */
    suspensions: protectedProcedure
      .input(
        z
          .object({
            calendar_id: z.string().optional(),
            date_from: z.coerce.date().optional(),
            date_to: z.coerce.date().optional(),
            tipo: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};

        if (input?.calendar_id) {
          where.calendar_id = input.calendar_id;
        }
        if (input?.tipo) {
          where.tipo = input.tipo as never;
        }
        if (input?.date_from || input?.date_to) {
          // Suspensions that overlap with the requested period
          where.AND = [];
          if (input?.date_from) {
            where.AND.push({ data_fim: { gte: input.date_from } });
          }
          if (input?.date_to) {
            where.AND.push({ data_inicio: { lte: input.date_to } });
          }
          if (where.AND.length === 0) delete where.AND;
        }

        return ctx.db.courtSuspension.findMany({
          where,
          include: {
            calendar: { select: { tribunal_codigo: true, tribunal_nome: true, uf: true } },
          },
          orderBy: { data_inicio: "asc" },
        });
      }),

    /**
     * Calculate business days between two dates, considering holidays
     * and court suspensions for a specific jurisdiction
     */
    calculateBusinessDays: protectedProcedure
      .input(
        z.object({
          data_inicio: z.coerce.date(),
          data_fim: z.coerce.date(),
          uf: z.string(),
          tribunal_codigo: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const from = startOfDay(input.data_inicio);
        const to = startOfDay(input.data_fim);

        if (to < from) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "data_fim deve ser posterior a data_inicio" });
        }

        // Fetch holidays for the period (national + state-specific)
        const [generalHolidays, courtHolidays, suspensions] = await Promise.all([
          ctx.db.holiday.findMany({
            where: {
              data: { gte: from, lte: to },
              OR: [{ uf: null }, { uf: input.uf }],
            },
          }),
          input.tribunal_codigo
            ? ctx.db.courtHoliday.findMany({
                where: {
                  data: { gte: from, lte: to },
                  prazos_prorrogados: true,
                  calendar: { tribunal_codigo: input.tribunal_codigo },
                },
              })
            : Promise.resolve([]),
          input.tribunal_codigo
            ? ctx.db.courtSuspension.findMany({
                where: {
                  suspende_prazos: true,
                  data_inicio: { lte: to },
                  data_fim: { gte: from },
                  calendar: { tribunal_codigo: input.tribunal_codigo },
                },
              })
            : Promise.resolve([]),
        ]);

        // Build a Set of non-working date strings
        const nonWorkingDays = new Set<string>();

        for (const h of generalHolidays) {
          nonWorkingDays.add(formatDateKey(new Date(h.data)));
        }
        for (const h of courtHolidays) {
          nonWorkingDays.add(formatDateKey(new Date(h.data)));
        }

        // Add suspension date ranges
        for (const s of suspensions) {
          const sStart = startOfDay(new Date(s.data_inicio));
          const sEnd = startOfDay(new Date(s.data_fim));
          let cursor = new Date(sStart);
          while (cursor <= sEnd && cursor <= to) {
            nonWorkingDays.add(formatDateKey(cursor));
            cursor = addDays(cursor, 1);
          }
        }

        // Count days
        let diasCorridos = 0;
        let diasUteis = 0;
        let feriadosNoPeriodo = 0;
        let suspensoesNoPeriodo = 0;

        let cursor = new Date(from);
        while (cursor <= to) {
          diasCorridos++;
          const key = formatDateKey(cursor);
          const dayOfWeek = cursor.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isNonWorking = nonWorkingDays.has(key);

          if (!isWeekend && !isNonWorking) {
            diasUteis++;
          }

          if (isNonWorking && !isWeekend) {
            // Only count holidays/suspensions that fall on weekdays
            feriadosNoPeriodo++;
          }

          cursor = addDays(cursor, 1);
        }

        // Rough breakdown: suspensions that overlap
        for (const s of suspensions) {
          const sStart = startOfDay(new Date(s.data_inicio));
          const sEnd = startOfDay(new Date(s.data_fim));
          let sCursor = new Date(Math.max(sStart.getTime(), from.getTime()));
          const sEndClamped = new Date(Math.min(sEnd.getTime(), to.getTime()));
          while (sCursor <= sEndClamped) {
            const dow = sCursor.getDay();
            if (dow !== 0 && dow !== 6) {
              suspensoesNoPeriodo++;
            }
            sCursor = addDays(sCursor, 1);
          }
        }

        return {
          dias_corridos: diasCorridos,
          dias_uteis: diasUteis,
          feriados_no_periodo: feriadosNoPeriodo,
          suspensoes_no_periodo: suspensoesNoPeriodo,
        };
      }),

    /**
     * Create a court calendar with holidays and suspensions
     */
    createCalendar: protectedProcedure
      .input(
        z.object({
          tribunal_codigo: z.string(),
          tribunal_nome: z.string(),
          tribunal_tipo: z.string(),
          uf: z.string().nullable(),
          ano: z.number().int(),
          portaria_numero: z.string().optional(),
          portaria_data: z.coerce.date().optional(),
          portaria_url: z.string().optional(),
          feriados: z
            .array(
              z.object({
                data: z.coerce.date(),
                nome: z.string(),
                tipo: z.string(),
                uf: z.string().nullable().optional(),
                suspende_expediente: z.boolean().default(true),
                prazos_prorrogados: z.boolean().default(true),
                fundamento_legal: z.string().optional(),
                observacoes: z.string().optional(),
              }),
            )
            .optional()
            .default([]),
          suspensoes: z
            .array(
              z.object({
                tipo: z.string(),
                data_inicio: z.coerce.date(),
                data_fim: z.coerce.date(),
                nome: z.string(),
                suspende_prazos: z.boolean().default(true),
                suspende_audiencias: z.boolean().default(true),
                suspende_sessoes: z.boolean().default(true),
                plantao_disponivel: z.boolean().default(false),
                fundamento_legal: z.string().optional(),
                observacoes: z.string().optional(),
              }),
            )
            .optional()
            .default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Upsert: if a calendar already exists for this tribunal+year, update it
        const existing = await ctx.db.courtCalendar.findUnique({
          where: {
            tribunal_codigo_ano: {
              tribunal_codigo: input.tribunal_codigo,
              ano: input.ano,
            },
          },
        });

        if (existing) {
          // Delete old holidays and suspensions then recreate
          await ctx.db.courtHoliday.deleteMany({ where: { calendar_id: existing.id } });
          await ctx.db.courtSuspension.deleteMany({ where: { calendar_id: existing.id } });

          const updated = await ctx.db.courtCalendar.update({
            where: { id: existing.id },
            data: {
              tribunal_nome: input.tribunal_nome,
              tribunal_tipo: input.tribunal_tipo,
              uf: input.uf,
              portaria_numero: input.portaria_numero,
              portaria_data: input.portaria_data,
              portaria_url: input.portaria_url,
              atualizado_em: new Date(),
              atualizado_por: ctx.session?.user?.id ?? null,
              feriados: {
                create: input.feriados.map((f) => ({
                  data: f.data,
                  nome: f.nome,
                  tipo: f.tipo,
                  uf: f.uf ?? null,
                  suspende_expediente: f.suspende_expediente,
                  prazos_prorrogados: f.prazos_prorrogados,
                  fundamento_legal: f.fundamento_legal,
                  observacoes: f.observacoes,
                })),
              },
              suspensoes: {
                create: input.suspensoes.map((s) => ({
                  tipo: s.tipo,
                  data_inicio: s.data_inicio,
                  data_fim: s.data_fim,
                  nome: s.nome,
                  suspende_prazos: s.suspende_prazos,
                  suspende_audiencias: s.suspende_audiencias,
                  suspende_sessoes: s.suspende_sessoes,
                  plantao_disponivel: s.plantao_disponivel,
                  fundamento_legal: s.fundamento_legal,
                  observacoes: s.observacoes,
                })),
              },
            },
            include: { _count: { select: { feriados: true, suspensoes: true } } },
          });
          return updated;
        }

        return ctx.db.courtCalendar.create({
          data: {
            tribunal_codigo: input.tribunal_codigo,
            tribunal_nome: input.tribunal_nome,
            tribunal_tipo: input.tribunal_tipo,
            uf: input.uf,
            ano: input.ano,
            portaria_numero: input.portaria_numero,
            portaria_data: input.portaria_data,
            portaria_url: input.portaria_url,
            atualizado_em: new Date(),
            atualizado_por: ctx.session?.user?.id ?? null,
            feriados: {
              create: input.feriados.map((f) => ({
                data: f.data,
                nome: f.nome,
                tipo: f.tipo,
                uf: f.uf ?? null,
                suspende_expediente: f.suspende_expediente,
                prazos_prorrogados: f.prazos_prorrogados,
                fundamento_legal: f.fundamento_legal,
                observacoes: f.observacoes,
              })),
            },
            suspensoes: {
              create: input.suspensoes.map((s) => ({
                tipo: s.tipo,
                data_inicio: s.data_inicio,
                data_fim: s.data_fim,
                nome: s.nome,
                suspende_prazos: s.suspende_prazos,
                suspende_audiencias: s.suspende_audiencias,
                suspende_sessoes: s.suspende_sessoes,
                plantao_disponivel: s.plantao_disponivel,
                fundamento_legal: s.fundamento_legal,
                observacoes: s.observacoes,
              })),
            },
          },
          include: { _count: { select: { feriados: true, suspensoes: true } } },
        });
      }),

    /**
     * List calendar repository entries with filters
     */
    repositoryList: protectedProcedure
      .input(
        z
          .object({
            tribunal_tipo: z.string().optional(),
            uf: z.string().optional(),
            ano: z.number().int().optional(),
            status: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};
        if (input?.tribunal_tipo) where.tribunal_tipo = input.tribunal_tipo;
        if (input?.uf) where.uf = input.uf;
        if (input?.ano) where.ano = input.ano;
        if (input?.status) where.status = input.status;

        return ctx.db.calendarRepository.findMany({
          where,
          include: {
            calendar: { select: { id: true, tribunal_codigo: true, tribunal_nome: true } },
          },
          orderBy: [{ created_at: "desc" }],
        });
      }),

    /**
     * Create a calendar repository entry
     */
    repositoryCreate: protectedProcedure
      .input(
        z.object({
          tribunal_codigo: z.string(),
          tribunal_nome: z.string(),
          tribunal_tipo: z.string(),
          uf: z.string().nullable(),
          ano: z.number().int(),
          tipo_documento: z.string(),
          numero_documento: z.string().optional(),
          data_documento: z.coerce.date().optional(),
          ementa: z.string().optional(),
          arquivo_url: z.string().optional(),
          arquivo_nome: z.string().optional(),
          texto_extraido: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return ctx.db.calendarRepository.create({
          data: {
            ...input,
            uploaded_by: ctx.session?.user?.id ?? null,
          },
        });
      }),

    /**
     * Update repository entry status (after AI processing)
     */
    repositoryUpdateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.string(),
          feriados_extraidos: z.number().int().optional(),
          suspensoes_extraidas: z.number().int().optional(),
          calendar_id: z.string().optional(),
          processado_por_ia: z.boolean().optional(),
          erro_processamento: z.string().nullable().optional(),
          texto_extraido: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.calendarRepository.update({
          where: { id },
          data,
        });
      }),

    /**
     * Coverage stats: how many tribunals have calendars for a given year
     */
    coverageStats: protectedProcedure
      .input(z.object({ ano: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const calendars = await ctx.db.courtCalendar.findMany({
          where: { ano: input.ano },
          select: {
            tribunal_codigo: true,
            tribunal_nome: true,
            tribunal_tipo: true,
            uf: true,
            _count: { select: { feriados: true, suspensoes: true } },
          },
        });

        const calendarMap = new Map(
          calendars.map((c) => [c.tribunal_codigo, c]),
        );

        return {
          ano: input.ano,
          total_tribunais: 92,
          total_com_calendario: calendars.length,
          percentual_cobertura: Math.round((calendars.length / 92) * 100),
          calendars: calendars.map((c) => ({
            tribunal_codigo: c.tribunal_codigo,
            tribunal_nome: c.tribunal_nome,
            tribunal_tipo: c.tribunal_tipo,
            uf: c.uf,
            feriados: c._count.feriados,
            suspensoes: c._count.suspensoes,
          })),
          calendarMap: Object.fromEntries(calendarMap),
        };
      }),

    /**
     * Returns the full list of Brazilian tribunals (static data)
     */
    tribunalsList: protectedProcedure.query(() => {
      // Import dynamically to keep router clean
      const { TRIBUNAIS_BRASIL } = require("@/lib/tribunais-brasil");
      return TRIBUNAIS_BRASIL;
    }),
  }),

  // ============================================================
  // PROCESS PARTIES SUB-ROUTER
  // ============================================================

  parties: router({
    /**
     * List all process parties for a case
     */
    list: protectedProcedure
      .input(z.object({ case_id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.processParty.findMany({
          where: { case_id: input.case_id },
          include: {
            person: { select: { id: true, nome: true, cpf_cnpj: true } },
          },
          orderBy: [{ polo: "asc" }, { nome: "asc" }],
        });
      }),

    /**
     * Create a process party
     */
    create: protectedProcedure
      .input(
        z.object({
          case_id: z.string(),
          person_id: z.string().optional(),
          nome: z.string().min(1),
          cpf_cnpj: z.string().optional(),
          polo: z.string(),
          tipo_parte: z.string(),
          prazo_dobro: z.boolean().default(false),
          fundamento_dobro: z.string().optional(),
          advogado_escritorio: z.string().optional(),
          advogados_diferentes: z.boolean().default(false),
          processo_eletronico: z.boolean().default(true),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return ctx.db.processParty.create({
          data: {
            case_id: input.case_id,
            person_id: input.person_id,
            nome: input.nome,
            cpf_cnpj: input.cpf_cnpj,
            polo: input.polo as never,
            tipo_parte: input.tipo_parte as never,
            prazo_dobro: input.prazo_dobro,
            fundamento_dobro: input.fundamento_dobro,
            advogado_escritorio: input.advogado_escritorio,
            advogados_diferentes: input.advogados_diferentes,
            processo_eletronico: input.processo_eletronico,
          },
          include: {
            person: { select: { id: true, nome: true, cpf_cnpj: true } },
          },
        });
      }),

    /**
     * Update a process party
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          nome: z.string().optional(),
          cpf_cnpj: z.string().optional(),
          polo: z.string().optional(),
          tipo_parte: z.string().optional(),
          prazo_dobro: z.boolean().optional(),
          fundamento_dobro: z.string().nullable().optional(),
          advogado_escritorio: z.string().nullable().optional(),
          advogados_diferentes: z.boolean().optional(),
          processo_eletronico: z.boolean().optional(),
          person_id: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        // Build update payload with only provided fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) {
            updateData[key] = value;
          }
        }

        return ctx.db.processParty.update({
          where: { id },
          data: updateData as never,
          include: {
            person: { select: { id: true, nome: true, cpf_cnpj: true } },
          },
        });
      }),

    /**
     * Delete a process party
     */
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.processParty.delete({ where: { id: input.id } });
      }),
  }),

  // ============================================================
  // NOTIFICATIONS SUB-ROUTER
  // ============================================================

  notifications: router({
    /**
     * List notifications, optionally filtered by deadline or status
     */
    list: protectedProcedure
      .input(
        z
          .object({
            deadline_id: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().min(1).max(200).default(50),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};

        if (input?.deadline_id) {
          where.deadline_id = input.deadline_id;
        }
        if (input?.status) {
          where.status = input.status as never;
        }

        return ctx.db.deadlineNotification.findMany({
          where,
          take: input?.limit ?? 50,
          include: {
            deadline: {
              select: { id: true, codigo: true, titulo: true, data_fim_prazo: true, status: true },
            },
          },
          orderBy: { created_at: "desc" },
        });
      }),

    /**
     * Mark a notification as read
     */
    markRead: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.deadlineNotification.update({
          where: { id: input.id },
          data: {
            data_leitura: new Date(),
            status: "LIDO" as never,
          },
        });
      }),

    /**
     * Mark multiple notifications as read at once
     */
    markManyRead: protectedProcedure
      .input(z.object({ ids: z.array(z.string()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.deadlineNotification.updateMany({
          where: { id: { in: input.ids } },
          data: {
            data_leitura: new Date(),
            status: "LIDO" as never,
          },
        });
      }),

    /**
     * Count unread notifications for the current user
     */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      return ctx.db.deadlineNotification.count({
        where: {
          destinatario_id: userId,
          data_leitura: null,
          status: { not: "ERRO" },
        },
      });
    }),
  }),

  // ============================================================
  // HELPER ENDPOINTS
  // ============================================================

  /**
   * Users available for responsavel / backup select dropdowns
   */
  usersForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { active: true },
      select: { id: true, name: true, avatar_url: true, role: true },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Active cases for linking deadlines (used in both legacy and new module)
   */
  casesForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.case.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        numero_processo: true,
        tipo: true,
        uf: true,
        vara: true,
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 200,
    });
  }),

  /**
   * Clients for select dropdown (only persons with type CLIENTE)
   */
  clientsForSelect: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const search = input?.search?.trim();
      return ctx.db.person.findMany({
        where: {
          tipo: "CLIENTE",
          ...(search && {
            OR: [
              { nome: { contains: search, mode: "insensitive" as const } },
              { razao_social: { contains: search, mode: "insensitive" as const } },
              { cpf_cnpj: { contains: search } },
            ],
          }),
        },
        select: {
          id: true,
          nome: true,
          razao_social: true,
          cpf_cnpj: true,
          subtipo: true,
        },
        orderBy: { nome: "asc" },
        take: 50,
      });
    }),

  // ============================================================
  // TYPE CATALOG & TRIGGERS (DeadlineTypeCatalog + DeadlinePieceTrigger)
  // ============================================================

  /**
   * Get the full type catalog (with optional category filter)
   */
  getTypeCatalog: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          activeOnly: z.boolean().default(true),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};
      if (input?.activeOnly !== false) {
        where.isActive = true;
      }
      if (input?.category) {
        where.category = input.category as never;
      }

      return ctx.db.deadlineTypeCatalog.findMany({
        where,
        include: {
          triggeredByPieces: {
            select: {
              id: true,
              triggerPieceType: true,
              triggerDescription: true,
              targetRole: true,
              isSuggestion: true,
              isDefault: true,
              notes: true,
            },
          },
        },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      });
    }),

  /**
   * Get a single catalog entry by deadline type
   */
  getCatalogByType: protectedProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.deadlineTypeCatalog.findUnique({
        where: { type: input.type as never },
        include: {
          triggeredByPieces: true,
        },
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tipo nao encontrado no catalogo" });
      }

      return entry;
    }),

  /**
   * Get suggested deadline types for a given piece type (trigger mapping)
   */
  getSuggestedTypes: protectedProcedure
    .input(
      z.object({
        pieceType: z.string(),
        partyRole: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        triggerPieceType: input.pieceType as never,
      };

      if (input.partyRole) {
        where.targetRole = { in: [input.partyRole as never, "AMBOS" as never] };
      }

      const triggers = await ctx.db.deadlinePieceTrigger.findMany({
        where,
        include: {
          deadlineTypeCatalog: {
            select: {
              type: true,
              displayName: true,
              shortName: true,
              category: true,
              legalBasis: true,
              defaultDays: true,
              countingType: true,
              isFatal: true,
              defaultPriority: true,
              color: true,
              icon: true,
              doubleForPublicEntity: true,
              doubleForDefensoria: true,
            },
          },
        },
        orderBy: [{ isDefault: "desc" }, { deadlineType: "asc" }],
      });

      return triggers.map((t) => ({
        triggerId: t.id,
        deadlineType: t.deadlineType,
        triggerPieceType: t.triggerPieceType,
        triggerDescription: t.triggerDescription,
        targetRole: t.targetRole,
        isSuggestion: t.isSuggestion,
        isDefault: t.isDefault,
        notes: t.notes,
        catalog: t.deadlineTypeCatalog,
      }));
    }),

  /**
   * Simulate deadline calculation (preview without saving)
   */
  simulate: protectedProcedure
    .input(
      z.object({
        deadlineType: z.string(),
        startMethod: z.string().default("MANUAL"),
        disponibilizacaoDate: z.coerce.date().optional(),
        publicacaoDate: z.coerce.date().optional(),
        intimacaoDate: z.coerce.date().optional(),
        cienciaDate: z.coerce.date().optional(),
        startDate: z.coerce.date().optional(),
        customDays: z.number().int().optional(),
        customCountingType: z.string().optional(),
        isPublicEntity: z.boolean().default(false),
        isDefensoria: z.boolean().default(false),
        isMP: z.boolean().default(false),
        isElectronic: z.boolean().default(true),
        uf: z.string().optional(),
        tribunal: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get catalog entry for defaults
      const catalog = await ctx.db.deadlineTypeCatalog.findUnique({
        where: { type: input.deadlineType as never },
      });

      if (!catalog) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tipo nao encontrado no catalogo" });
      }

      const days = input.customDays ?? catalog.defaultDays;
      const countingType = (input.customCountingType ?? catalog.countingType) as string;
      const uf = input.uf ?? "PR";

      // Determine effective start date based on start method
      let effectiveStart: Date;
      const log: { step: number; rule: string; description: string; dateBefore?: string; dateAfter?: string }[] = [];
      let stepNum = 1;

      if (input.startMethod === "PUBLICACAO_DJE" && input.disponibilizacaoDate) {
        // DJE Flow: Disponibilização → Publicação (1º útil após) → Início (1º útil após publicação)
        const disponibilizacao = new Date(input.disponibilizacaoDate);
        disponibilizacao.setHours(0, 0, 0, 0);

        log.push({
          step: stepNum++,
          rule: "DJE_DISPONIBILIZACAO",
          description: `Disponibilização no DJE: ${disponibilizacao.toISOString().slice(0, 10)}`,
        });

        // Publication = first business day after disponibilização
        const pubDate = input.publicacaoDate ? new Date(input.publicacaoDate) : addDays(disponibilizacao, 1);
        pubDate.setHours(0, 0, 0, 0);

        log.push({
          step: stepNum++,
          rule: "DJE_PUBLICACAO",
          description: `Publicação (Art. 224, §2º): ${pubDate.toISOString().slice(0, 10)}`,
        });

        // Start = first business day after publication
        effectiveStart = addDays(pubDate, 1);

        log.push({
          step: stepNum++,
          rule: "INICIO_CONTAGEM",
          description: `Início da contagem (1º útil após publicação): ${effectiveStart.toISOString().slice(0, 10)}`,
        });
      } else if (input.startDate) {
        effectiveStart = new Date(input.startDate);
        effectiveStart.setHours(0, 0, 0, 0);

        log.push({
          step: stepNum++,
          rule: "DATA_INICIO",
          description: `Data de início manual: ${effectiveStart.toISOString().slice(0, 10)}`,
        });
      } else if (input.intimacaoDate) {
        effectiveStart = addDays(new Date(input.intimacaoDate), 1);
        effectiveStart.setHours(0, 0, 0, 0);

        log.push({
          step: stepNum++,
          rule: "INTIMACAO",
          description: `Intimação: ${new Date(input.intimacaoDate).toISOString().slice(0, 10)} → Início: ${effectiveStart.toISOString().slice(0, 10)}`,
        });
      } else if (input.cienciaDate) {
        effectiveStart = addDays(new Date(input.cienciaDate), 1);
        effectiveStart.setHours(0, 0, 0, 0);

        log.push({
          step: stepNum++,
          rule: "CIENCIA",
          description: `Ciência: ${new Date(input.cienciaDate).toISOString().slice(0, 10)} → Início: ${effectiveStart.toISOString().slice(0, 10)}`,
        });
      } else {
        effectiveStart = new Date();
        effectiveStart.setHours(0, 0, 0, 0);

        log.push({
          step: stepNum++,
          rule: "DATA_HOJE",
          description: `Sem data de início especificada, usando hoje: ${effectiveStart.toISOString().slice(0, 10)}`,
        });
      }

      // Apply doubling rules
      let effectiveDays = days;
      let isDoubled = false;
      let doubleReason: string | null = null;

      if (input.isPublicEntity && catalog.doubleForPublicEntity) {
        effectiveDays *= 2;
        isDoubled = true;
        doubleReason = "Fazenda Pública (Art. 183, CPC)";
        log.push({
          step: stepNum++,
          rule: "DOBRA_FAZENDA",
          description: `Prazo em dobro — ${doubleReason}: ${days} → ${effectiveDays} dias`,
        });
      } else if (input.isDefensoria && catalog.doubleForDefensoria) {
        effectiveDays *= 2;
        isDoubled = true;
        doubleReason = "Defensoria Pública (Art. 186, CPC)";
        log.push({
          step: stepNum++,
          rule: "DOBRA_DEFENSORIA",
          description: `Prazo em dobro — ${doubleReason}: ${days} → ${effectiveDays} dias`,
        });
      } else if (input.isMP) {
        effectiveDays *= 2;
        isDoubled = true;
        doubleReason = "Ministério Público (Art. 180, CPC)";
        log.push({
          step: stepNum++,
          rule: "DOBRA_MP",
          description: `Prazo em dobro — ${doubleReason}: ${days} → ${effectiveDays} dias`,
        });
      }

      // Calculate due date
      let dueDate: Date;

      if (countingType === "DIAS_UTEIS") {
        // Count business days (Art. 219 CPC)
        const { calcularPrazo: calcPrazo } = await import("@/lib/prazos");
        dueDate = await calcPrazo(effectiveStart, effectiveDays, uf);

        log.push({
          step: stepNum++,
          rule: "CONTAGEM_DIAS_UTEIS",
          description: `${effectiveDays} dias úteis a partir de ${effectiveStart.toISOString().slice(0, 10)} = ${dueDate.toISOString().slice(0, 10)} (Art. 219, CPC)`,
        });
      } else if (countingType === "DIAS_CORRIDOS") {
        // Calendar days
        dueDate = addDays(effectiveStart, effectiveDays);

        // If final day is non-business, extend to next business day (Art. 224, §1º)
        const { proximoDiaUtil: proxDiaUtil } = await import("@/lib/prazos");
        const adjustedDue = await proxDiaUtil(dueDate, uf);
        if (adjustedDue.getTime() !== dueDate.getTime()) {
          log.push({
            step: stepNum++,
            rule: "EXTENSAO_DIA_UTIL",
            description: `Dia final (${dueDate.toISOString().slice(0, 10)}) não é dia útil → estendido para ${adjustedDue.toISOString().slice(0, 10)} (Art. 224, §1º)`,
          });
          dueDate = adjustedDue;
        }

        log.push({
          step: stepNum++,
          rule: "CONTAGEM_DIAS_CORRIDOS",
          description: `${effectiveDays} dias corridos a partir de ${effectiveStart.toISOString().slice(0, 10)} = ${dueDate.toISOString().slice(0, 10)}`,
        });
      } else {
        // SEM_PRAZO or HORAS — just use the start date
        dueDate = new Date(effectiveStart);
      }

      // Check for recesso forense (Dec 20 - Jan 20)
      const recessoStart = new Date(dueDate.getFullYear(), 11, 20); // Dec 20
      const recessoEnd = new Date(dueDate.getFullYear() + 1, 0, 20); // Jan 20
      const warnings: string[] = [];

      if (dueDate >= recessoStart && dueDate <= recessoEnd) {
        warnings.push("O prazo final cai durante o recesso forense (20/dez a 20/jan). Verifique se o prazo fica suspenso durante este período (Art. 220, CPC).");
      }

      // Internal due date (2 business days before)
      const { calcularPrazo: calcPrazo2 } = await import("@/lib/prazos");
      let internalDue: Date;
      if (countingType === "DIAS_UTEIS" || countingType === "DIAS_CORRIDOS") {
        // Go 2 business days back
        const tempDate = new Date(dueDate);
        let counted = 0;
        const { isDiaUtil: isDU } = await import("@/lib/prazos");
        while (counted < 2) {
          tempDate.setDate(tempDate.getDate() - 1);
          if (await isDU(tempDate, uf)) {
            counted++;
          }
        }
        internalDue = tempDate;
      } else {
        internalDue = dueDate;
      }

      // Business days remaining
      const { diasUteisAte: diasUteis } = await import("@/lib/prazos");
      const businessDaysRemaining = await diasUteis(dueDate, uf);

      if (catalog.isFatal && businessDaysRemaining <= 3 && businessDaysRemaining > 0) {
        warnings.push(`Atenção: prazo FATAL com apenas ${businessDaysRemaining} dia(s) útil(eis) restante(s)!`);
      }

      return {
        startDate: effectiveStart,
        dueDate,
        internalDueDate: internalDue,
        originalDays: days,
        effectiveDays,
        countingType,
        isDoubled,
        doubleReason,
        businessDaysRemaining,
        calculationLog: log,
        warnings,
        legalBasis: catalog.legalBasis,
        isFatal: catalog.isFatal,
        displayName: catalog.displayName,
        category: catalog.category,
        color: catalog.color,
        icon: catalog.icon,
        defaultPriority: catalog.defaultPriority,
      };
    }),

  /**
   * Create deadline using the expanded Deadline model with full calculation
   */
  createExpanded: protectedProcedure
    .input(
      z.object({
        // Required
        deadlineType: z.string(),
        case_id: z.string().optional(),
        clientId: z.string().optional(),

        // Start method and dates
        startMethod: z.string().default("MANUAL"),
        startDate: z.coerce.date().optional(),
        disponibilizacaoDate: z.coerce.date().optional(),
        publicacaoDate: z.coerce.date().optional(),
        intimacaoDate: z.coerce.date().optional(),
        cienciaDate: z.coerce.date().optional(),

        // Calculation overrides
        customDays: z.number().int().optional(),
        customCountingType: z.string().optional(),

        // Trigger piece
        triggerPieceType: z.string().optional(),
        triggerPieceDesc: z.string().optional(),
        triggerDocumentId: z.string().optional(),
        triggerMovementId: z.string().optional(),

        // Context
        isPublicEntity: z.boolean().default(false),
        isDefensoria: z.boolean().default(false),
        isMP: z.boolean().default(false),
        isElectronic: z.boolean().default(true),
        uf: z.string().optional(),
        tribunal: z.string().optional(),

        // Override
        title: z.string().optional(),
        descricao: z.string().optional(),
        priority: z.string().optional(),
        responsavel_id: z.string().optional(),
        dueDate: z.coerce.date().optional(), // manual override
        manualDueDate: z.coerce.date().optional(), // advogado's target date

        // Notifications
        notifyClientEmail: z.boolean().default(false),
        notifyClientWhatsapp: z.boolean().default(false),
        reminderBefore: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get catalog entry for defaults
      const catalog = await ctx.db.deadlineTypeCatalog.findUnique({
        where: { type: input.deadlineType as never },
      });

      // Use catalog defaults or fallback
      const days = input.customDays ?? catalog?.defaultDays ?? 15;
      const countingType = (input.customCountingType ?? catalog?.countingType ?? "DIAS_UTEIS") as string;
      const uf = input.uf ?? "PR";

      // Determine start date
      let effectiveStart: Date;
      const calcLog: unknown[] = [];

      if (input.startMethod === "PUBLICACAO_DJE" && input.disponibilizacaoDate) {
        const pub = input.publicacaoDate
          ? new Date(input.publicacaoDate)
          : addDays(new Date(input.disponibilizacaoDate), 1);
        effectiveStart = addDays(pub, 1);
      } else if (input.startDate) {
        effectiveStart = new Date(input.startDate);
      } else if (input.intimacaoDate) {
        effectiveStart = addDays(new Date(input.intimacaoDate), 1);
      } else if (input.cienciaDate) {
        effectiveStart = addDays(new Date(input.cienciaDate), 1);
      } else {
        effectiveStart = new Date();
      }
      effectiveStart.setHours(0, 0, 0, 0);

      // Apply doubling
      let effectiveDays = days;
      let isDoubled = false;
      let doubleReason: string | null = null;

      if (input.isPublicEntity && catalog?.doubleForPublicEntity) {
        effectiveDays *= 2;
        isDoubled = true;
        doubleReason = "Fazenda Pública (Art. 183, CPC)";
      } else if (input.isDefensoria && catalog?.doubleForDefensoria) {
        effectiveDays *= 2;
        isDoubled = true;
        doubleReason = "Defensoria Pública (Art. 186, CPC)";
      } else if (input.isMP) {
        effectiveDays *= 2;
        isDoubled = true;
        doubleReason = "Ministério Público (Art. 180, CPC)";
      }

      // Calculate due date (or use manual override)
      let dueDate: Date;
      if (input.dueDate) {
        dueDate = new Date(input.dueDate);
      } else if (countingType === "DIAS_UTEIS") {
        const { calcularPrazo: calcPrazo } = await import("@/lib/prazos");
        dueDate = await calcPrazo(effectiveStart, effectiveDays, uf);
      } else if (countingType === "DIAS_CORRIDOS") {
        dueDate = addDays(effectiveStart, effectiveDays);
        const { proximoDiaUtil: proxDiaUtil } = await import("@/lib/prazos");
        dueDate = await proxDiaUtil(dueDate, uf);
      } else {
        dueDate = new Date(effectiveStart);
      }

      // Internal due date (2 business days before)
      const { isDiaUtil: isDU } = await import("@/lib/prazos");
      const tempDate = new Date(dueDate);
      let counted = 0;
      while (counted < 2 && tempDate.getTime() > effectiveStart.getTime()) {
        tempDate.setDate(tempDate.getDate() - 1);
        if (await isDU(tempDate, uf)) {
          counted++;
        }
      }
      const internalDueDate = tempDate;

      // Auto-infer clientId from case if not provided
      let resolvedClientId = input.clientId;
      let clientName: string | null = null;
      let caseNumber: string | null = null;

      if (input.case_id) {
        const linkedCase = await ctx.db.case.findUnique({
          where: { id: input.case_id },
          select: {
            numero_processo: true,
            cliente_id: true,
            cliente: { select: { id: true, nome: true } },
          },
        });
        if (linkedCase) {
          if (!resolvedClientId) resolvedClientId = linkedCase.cliente_id;
          clientName = linkedCase.cliente?.nome ?? null;
          caseNumber = linkedCase.numero_processo;
        }
      }

      if (resolvedClientId && !clientName) {
        const person = await ctx.db.person.findUnique({
          where: { id: resolvedClientId },
          select: { nome: true },
        });
        clientName = person?.nome ?? null;
      }

      // Build title: "ShortCNJ — Cliente — TipoPrazo"
      const catalogName = catalog?.displayName ?? input.deadlineType;
      let autoTitleStr = catalogName;
      if (clientName || caseNumber) {
        const shortCNJ = caseNumber
          ? caseNumber.replace(/^(\d{7}-\d{2})\..*/, "$1")
          : "";
        const shortClient = clientName && clientName.length > 30
          ? clientName.substring(0, 30) + "..."
          : clientName || "";
        const parts = [shortCNJ, shortClient, catalogName].filter(Boolean);
        autoTitleStr = parts.join(" — ");
      }
      const title = input.title || autoTitleStr;

      // Calculate effective dueDate: use manualDueDate if provided, else calculated
      const fatalDueDate = dueDate;
      const effectiveDueDate = input.manualDueDate ?? dueDate;

      const deadline = await ctx.db.deadline.create({
        data: {
          tipo: input.deadlineType as never,
          case_id: input.case_id,
          clientId: resolvedClientId,
          title,
          autoTitle: !input.title,
          descricao: input.descricao,

          triggerPieceType: input.triggerPieceType as never ?? undefined,
          triggerPieceDesc: input.triggerPieceDesc,
          triggerDocumentId: input.triggerDocumentId,
          triggerMovementId: input.triggerMovementId,

          startMethod: input.startMethod as never,
          startDate: effectiveStart,
          disponibilizacaoDate: input.disponibilizacaoDate,
          publicacaoDate: input.publicacaoDate,
          intimacaoDate: input.intimacaoDate,
          cienciaDate: input.cienciaDate,

          calculatedDays: effectiveDays,
          countingType: countingType as never,
          isDoubled,
          doubleReason,
          originalDays: days,

          dueDate: effectiveDueDate,
          fatalDueDate,
          manualDueDate: input.manualDueDate ?? null,
          internalDueDate,
          calculationLog: calcLog.length > 0 ? (calcLog as any) : undefined,

          data_limite: effectiveDueDate,
          data_alerta: [],
          status: "PENDENTE",
          responsavel_id: input.responsavel_id,
          origem: "MANUAL",

          isPublicEntity: input.isPublicEntity,
          isDefensoria: input.isDefensoria,
          isMP: input.isMP,
          isElectronic: input.isElectronic,

          priority: input.priority ?? catalog?.defaultPriority ?? "MEDIA",

          notifyClientEmail: input.notifyClientEmail,
          notifyClientWhatsapp: input.notifyClientWhatsapp,
          reminderBefore: input.reminderBefore,
        },
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
          client: { select: { id: true, nome: true } },
        },
      });

      return deadline;
    }),

  // Workspace sub-router
  workspace: workspaceRouter,
});
