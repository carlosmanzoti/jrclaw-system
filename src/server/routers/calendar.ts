import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import type { ActivityType, Prisma } from "@prisma/client";
import { MicrosoftGraphCalendarService } from "@/lib/microsoft-graph-calendar";

const EVENT_TYPE_TO_ACTIVITY_TYPE: Record<string, ActivityType> = {
  REUNIAO: "REUNIAO",
  AUDIENCIA: "AUDIENCIA",
  SUSTENTACAO_ORAL: "SUSTENTACAO",
  DESPACHO_ORAL: "DESPACHO",
  PESQUISA_JURIDICA: "PESQUISA",
  ANALISE_CASO: "ANALISE",
  PRAZO_ANTECIPADO: "OUTRO",
  PRAZO_FATAL: "OUTRO",
  RETORNO_EMAIL: "EMAIL",
  ATIVIDADE_GERAL: "OUTRO",
};

async function tryPushToOutlook(
  userId: string,
  event: {
    titulo: string;
    descricao?: string | null;
    data_inicio: Date;
    data_fim?: Date | null;
    dia_inteiro: boolean;
    local?: string | null;
    link_virtual?: string | null;
    lembrete_minutos?: number | null;
    participantes_externos?: string[];
    outlook_event_id?: string | null;
  }
): Promise<{ outlook_event_id?: string; error?: string }> {
  try {
    const calService = new MicrosoftGraphCalendarService(userId);
    const outlookInput = calService.mapToOutlook(event);

    if (event.outlook_event_id) {
      await calService.updateEvent(event.outlook_event_id, outlookInput);
      return { outlook_event_id: event.outlook_event_id };
    } else {
      const created = await calService.createEvent(outlookInput);
      return { outlook_event_id: created.id };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha na sincronização" };
  }
}

export const calendarRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        date_from: z.coerce.date(),
        date_to: z.coerce.date(),
        tipo_evento: z.array(z.string()).optional(),
        responsavel_id: z.string().optional(),
        case_id: z.string().optional(),
        project_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        data_inicio: { lte: input.date_to },
        OR: [
          { data_fim: { gte: input.date_from } },
          { data_fim: null, data_inicio: { gte: input.date_from } },
        ],
      };

      if (input.tipo_evento && input.tipo_evento.length > 0) {
        where.tipo_evento = { in: input.tipo_evento };
      }
      if (input.responsavel_id) {
        where.responsavel_id = input.responsavel_id;
      }
      if (input.case_id) {
        where.case_id = input.case_id;
      }
      if (input.project_id) {
        where.project_id = input.project_id;
      }

      return ctx.db.calendarEvent.findMany({
        where,
        include: {
          case_: {
            select: {
              id: true,
              numero_processo: true,
              cliente: { select: { id: true, nome: true } },
            },
          },
          project: {
            select: { id: true, titulo: true, codigo: true },
          },
          task: {
            select: { id: true, titulo: true },
          },
          responsavel: {
            select: { id: true, name: true, avatar_url: true },
          },
        },
        orderBy: { data_inicio: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.calendarEvent.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          case_: {
            select: {
              id: true,
              numero_processo: true,
              tipo: true,
              cliente: { select: { id: true, nome: true } },
            },
          },
          project: {
            select: { id: true, titulo: true, codigo: true },
          },
          task: {
            select: { id: true, titulo: true },
          },
          responsavel: {
            select: { id: true, name: true, avatar_url: true },
          },
          created_by: {
            select: { id: true, name: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        tipo_evento: z.string(),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        data_inicio: z.coerce.date(),
        data_fim: z.coerce.date().optional().nullable(),
        dia_inteiro: z.boolean().default(false),
        local: z.string().optional(),
        link_virtual: z.string().optional(),
        campos_especificos: z.record(z.string(), z.unknown()).optional().nullable(),
        responsavel_id: z.string().optional().nullable(),
        participantes_internos: z.array(z.string()).default([]),
        participantes_externos: z.array(z.string()).default([]),
        lembrete_minutos: z.number().optional().nullable(),
        case_id: z.string().optional().nullable(),
        project_id: z.string().optional().nullable(),
        task_id: z.string().optional().nullable(),
        cor: z.string().optional().nullable(),
        sincronizar_outlook: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.calendarEvent.create({
        data: {
          tipo_evento: input.tipo_evento as never,
          titulo: input.titulo,
          descricao: input.descricao,
          data_inicio: input.data_inicio,
          data_fim: input.data_fim,
          dia_inteiro: input.dia_inteiro,
          local: input.local,
          link_virtual: input.link_virtual,
          campos_especificos: (input.campos_especificos ?? undefined) as Prisma.InputJsonValue | undefined,
          responsavel_id: input.responsavel_id,
          participantes_internos: input.participantes_internos,
          participantes_externos: input.participantes_externos,
          lembrete_minutos: input.lembrete_minutos,
          case_id: input.case_id,
          project_id: input.project_id,
          task_id: input.task_id,
          cor: input.cor,
          created_by_id: ctx.session.user.id,
          sincronizado_outlook: input.sincronizar_outlook,
          ...(input.sincronizar_outlook && {
            last_modified_source: "SYSTEM",
            sync_status: "PENDING_PUSH",
          }),
        },
      });

      // Attempt immediate push to Outlook
      if (input.sincronizar_outlook) {
        const result = await tryPushToOutlook(ctx.session.user.id, {
          ...input,
          data_inicio: input.data_inicio,
          data_fim: input.data_fim,
        });

        if (result.outlook_event_id) {
          await ctx.db.calendarEvent.update({
            where: { id: event.id },
            data: {
              outlook_event_id: result.outlook_event_id,
              sync_status: "SYNCED",
              outlook_last_sync: new Date(),
              outlook_sync_error: null,
            },
          });
        } else {
          await ctx.db.calendarEvent.update({
            where: { id: event.id },
            data: { outlook_sync_error: result.error },
          });
        }
      }

      return event;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo_evento: z.string().optional(),
        titulo: z.string().min(1).optional(),
        descricao: z.string().optional().nullable(),
        data_inicio: z.coerce.date().optional(),
        data_fim: z.coerce.date().optional().nullable(),
        dia_inteiro: z.boolean().optional(),
        local: z.string().optional().nullable(),
        link_virtual: z.string().optional().nullable(),
        campos_especificos: z.record(z.string(), z.unknown()).optional().nullable(),
        status: z.string().optional(),
        responsavel_id: z.string().optional().nullable(),
        participantes_internos: z.array(z.string()).optional(),
        participantes_externos: z.array(z.string()).optional(),
        lembrete_minutos: z.number().optional().nullable(),
        case_id: z.string().optional().nullable(),
        project_id: z.string().optional().nullable(),
        task_id: z.string().optional().nullable(),
        cor: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if status is changing to CONCLUIDO
      let shouldCreateActivity = false;
      if (data.status === "CONCLUIDO") {
        const existing = await ctx.db.calendarEvent.findUnique({
          where: { id },
          select: { status: true },
        });
        if (existing && existing.status !== "CONCLUIDO") {
          shouldCreateActivity = true;
        }
      }

      // Fetch current event to check sync status
      const current = await ctx.db.calendarEvent.findUnique({
        where: { id },
        select: { sincronizado_outlook: true, outlook_event_id: true },
      });

      const syncUpdates = current?.sincronizado_outlook && current?.outlook_event_id
        ? { last_modified_source: "SYSTEM", sync_status: "PENDING_PUSH" }
        : {};

      const updated = await ctx.db.calendarEvent.update({
        where: { id },
        data: {
          ...(data.tipo_evento && { tipo_evento: data.tipo_evento as never }),
          ...(data.titulo && { titulo: data.titulo }),
          ...(data.descricao !== undefined && { descricao: data.descricao }),
          ...(data.data_inicio && { data_inicio: data.data_inicio }),
          ...(data.data_fim !== undefined && { data_fim: data.data_fim }),
          ...(data.dia_inteiro !== undefined && { dia_inteiro: data.dia_inteiro }),
          ...(data.local !== undefined && { local: data.local }),
          ...(data.link_virtual !== undefined && { link_virtual: data.link_virtual }),
          ...(data.campos_especificos !== undefined && {
            campos_especificos: (data.campos_especificos ?? undefined) as Prisma.InputJsonValue | undefined,
          }),
          ...(data.status && { status: data.status as never }),
          ...(data.responsavel_id !== undefined && { responsavel_id: data.responsavel_id }),
          ...(data.participantes_internos && {
            participantes_internos: data.participantes_internos,
          }),
          ...(data.participantes_externos && {
            participantes_externos: data.participantes_externos,
          }),
          ...(data.lembrete_minutos !== undefined && {
            lembrete_minutos: data.lembrete_minutos,
          }),
          ...(data.case_id !== undefined && { case_id: data.case_id }),
          ...(data.project_id !== undefined && { project_id: data.project_id }),
          ...(data.task_id !== undefined && { task_id: data.task_id }),
          ...(data.cor !== undefined && { cor: data.cor }),
          ...syncUpdates,
        },
        include: {
          case_: { select: { id: true } },
          project: { select: { id: true } },
          task: { select: { id: true } },
        },
      });

      // Attempt immediate push to Outlook if synced
      if (current?.sincronizado_outlook && current?.outlook_event_id) {
        const result = await tryPushToOutlook(ctx.session.user.id, {
          titulo: updated.titulo,
          descricao: updated.descricao,
          data_inicio: updated.data_inicio,
          data_fim: updated.data_fim,
          dia_inteiro: updated.dia_inteiro,
          local: updated.local,
          link_virtual: updated.link_virtual,
          lembrete_minutos: updated.lembrete_minutos,
          participantes_externos: updated.participantes_externos,
          outlook_event_id: current.outlook_event_id,
        });

        if (result.outlook_event_id) {
          await ctx.db.calendarEvent.update({
            where: { id },
            data: {
              sync_status: "SYNCED",
              outlook_last_sync: new Date(),
              outlook_sync_error: null,
            },
          });
        } else {
          await ctx.db.calendarEvent.update({
            where: { id },
            data: { outlook_sync_error: result.error },
          });
        }
      }

      // Auto-create Activity when event is completed
      if (shouldCreateActivity) {
        const activityType =
          EVENT_TYPE_TO_ACTIVITY_TYPE[updated.tipo_evento] || "OUTRO";

        const duracao =
          updated.data_fim && updated.data_inicio
            ? Math.round(
                (updated.data_fim.getTime() - updated.data_inicio.getTime()) /
                  60000
              )
            : undefined;

        await ctx.db.activity.create({
          data: {
            calendar_event_id: updated.id,
            case_id: updated.case_id,
            project_id: updated.project_id,
            task_id: updated.task_id,
            user_id: ctx.session.user.id,
            tipo: activityType,
            descricao: updated.titulo,
            data: updated.data_inicio,
            duracao_minutos: duracao && duracao > 0 ? duracao : undefined,
            resultado:
              (updated.campos_especificos as Record<string, string> | null)
                ?.resultado || undefined,
            visivel_portal: false,
            faturavel: true,
          },
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        delete_from_outlook: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If requested, delete from Outlook first
      if (input.delete_from_outlook) {
        const event = await ctx.db.calendarEvent.findUnique({
          where: { id: input.id },
          select: { outlook_event_id: true, sincronizado_outlook: true },
        });

        if (event?.sincronizado_outlook && event?.outlook_event_id) {
          try {
            const calService = new MicrosoftGraphCalendarService(ctx.session.user.id);
            await calService.deleteEvent(event.outlook_event_id);
          } catch {
            // Continue with local delete even if Outlook delete fails
          }
        }
      }

      return ctx.db.calendarEvent.delete({ where: { id: input.id } });
    }),

  updateDateTime: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data_inicio: z.coerce.date(),
        data_fim: z.coerce.date().optional().nullable(),
        dia_inteiro: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.calendarEvent.update({
        where: { id: input.id },
        data: {
          data_inicio: input.data_inicio,
          data_fim: input.data_fim,
          ...(input.dia_inteiro !== undefined && { dia_inteiro: input.dia_inteiro }),
        },
      });

      // Push date change to Outlook if synced
      if (event.sincronizado_outlook && event.outlook_event_id) {
        const result = await tryPushToOutlook(ctx.session.user.id, {
          titulo: event.titulo,
          descricao: event.descricao,
          data_inicio: event.data_inicio,
          data_fim: event.data_fim,
          dia_inteiro: event.dia_inteiro,
          local: event.local,
          link_virtual: event.link_virtual,
          lembrete_minutos: event.lembrete_minutos,
          participantes_externos: event.participantes_externos,
          outlook_event_id: event.outlook_event_id,
        });

        await ctx.db.calendarEvent.update({
          where: { id: input.id },
          data: result.outlook_event_id
            ? { sync_status: "SYNCED", outlook_last_sync: new Date(), outlook_sync_error: null }
            : { outlook_sync_error: result.error, sync_status: "PENDING_PUSH" },
        });
      }

      return event;
    }),

  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.calendarEvent.groupBy({
      by: ["sync_status"],
      where: {
        sincronizado_outlook: true,
        created_by_id: ctx.session.user.id,
      },
      _count: true,
    });

    const result: Record<string, number> = {
      SYNCED: 0,
      PENDING_PUSH: 0,
      PENDING_PULL: 0,
      CONFLICT: 0,
    };

    for (const c of counts) {
      if (c.sync_status) result[c.sync_status] = c._count;
    }

    return result;
  }),

  getConflicts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.calendarEvent.findMany({
      where: {
        sincronizado_outlook: true,
        sync_status: "CONFLICT",
        created_by_id: ctx.session.user.id,
      },
      include: {
        case_: { select: { id: true, numero_processo: true } },
        project: { select: { id: true, titulo: true, codigo: true } },
      },
      orderBy: { updated_at: "desc" },
    });
  }),

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

  projectsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      select: {
        id: true,
        titulo: true,
        codigo: true,
      },
      orderBy: { updated_at: "desc" },
      take: 100,
    });
  }),

  tasksForProject: protectedProcedure
    .input(z.object({ project_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.projectTask.findMany({
        where: {
          project_id: input.project_id,
          status: { notIn: ["CONCLUIDA", "CANCELADA"] },
        },
        select: {
          id: true,
          titulo: true,
        },
        orderBy: { created_at: "desc" },
        take: 50,
      });
    }),
});
