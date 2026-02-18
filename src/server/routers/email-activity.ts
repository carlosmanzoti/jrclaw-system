import { z } from "zod"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"
import { EmailDataExtractor } from "@/lib/email-parser"
import { MicrosoftGraphCalendarService } from "@/lib/microsoft-graph-calendar"
import type { Prisma } from "@prisma/client"

export const emailActivityRouter = router({
  // ─── Extract data from email (no DB write) ───
  extractData: protectedProcedure
    .input(
      z.object({
        subject: z.string(),
        bodyHtml: z.string(),
        messageId: z.string(),
        from: z.string().optional(),
        receivedAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const extractor = new EmailDataExtractor(input.subject, input.bodyHtml)
      const result = extractor.autoFillActivity()
      return {
        ...result,
        messageId: input.messageId,
        from: input.from,
        receivedAt: input.receivedAt,
      }
    }),

  // ─── Create email activity + optionally create deadline/calendar event ───
  create: protectedProcedure
    .input(
      z.object({
        outlook_message_id: z.string(),
        email_subject: z.string().optional(),
        email_from: z.string().optional(),
        email_received_at: z.string().optional(),
        tipo: z.enum([
          "PRAZO", "AUDIENCIA", "REUNIAO", "DESPACHO",
          "DILIGENCIA", "PETICAO", "RECURSO", "PROVIDENCIA", "OUTRO",
        ]),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        case_id: z.string().optional(),
        project_id: z.string().optional(),
        responsavel_id: z.string().optional(),
        // Deadline fields
        criar_prazo: z.boolean().default(false),
        data_limite: z.coerce.date().optional(),
        contagem_tipo: z.enum(["DIAS_UTEIS", "DIAS_CORRIDOS"]).optional(),
        dias_prazo: z.number().optional(),
        tipo_prazo: z.enum(["FATAL", "ORDINARIO", "DILIGENCIA", "AUDIENCIA"]).optional(),
        // Calendar event fields
        criar_evento: z.boolean().default(false),
        data_evento: z.coerce.date().optional(),
        local_evento: z.string().optional(),
        link_virtual: z.string().optional(),
        sincronizar_outlook: z.boolean().default(false),
        // Reminders
        reminders: z
          .array(
            z.object({
              channel: z.enum(["SISTEMA", "EMAIL", "WHATSAPP"]),
              offset_minutes: z.number(),
            })
          )
          .default([]),
        // Extracted data for reference
        extracted_data: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // 1. Create the EmailActivity
      const activityData: Prisma.EmailActivityCreateInput = {
        outlook_message_id: input.outlook_message_id,
        email_subject: input.email_subject,
        email_from: input.email_from,
        email_received_at: input.email_received_at
          ? new Date(input.email_received_at)
          : undefined,
        tipo: input.tipo,
        titulo: input.titulo,
        descricao: input.descricao,
        status: "PENDENTE",
        data_limite: input.data_limite,
        contagem_tipo: input.contagem_tipo,
        dias_prazo: input.dias_prazo,
        data_evento: input.data_evento,
        local_evento: input.local_evento,
        link_virtual: input.link_virtual,
        extracted_data: input.extracted_data as Prisma.InputJsonValue ?? undefined,
        created_by: { connect: { id: userId } },
      }

      if (input.case_id) {
        activityData.case_ = { connect: { id: input.case_id } }
      }
      if (input.project_id) {
        activityData.project = { connect: { id: input.project_id } }
      }
      if (input.responsavel_id) {
        activityData.responsavel = { connect: { id: input.responsavel_id } }
      }

      const emailActivity = await ctx.db.emailActivity.create({
        data: activityData,
      })

      // 2. Create Deadline if requested
      if (input.criar_prazo && input.data_limite && input.case_id) {
        try {
          const deadline = await ctx.db.deadline.create({
            data: {
              case_id: input.case_id,
              tipo: input.tipo_prazo || "ORDINARIO",
              descricao: input.titulo,
              data_limite: input.data_limite,
              data_alerta: computeAlerts(input.data_limite),
              status: "PENDENTE",
              responsavel_id: input.responsavel_id || userId,
              origem: `Email: ${input.email_subject || input.outlook_message_id}`,
            },
          })

          await ctx.db.emailActivity.update({
            where: { id: emailActivity.id },
            data: { deadline_id: deadline.id },
          })
        } catch (err) {
          console.error("Failed to create deadline from email:", err)
        }
      }

      // 3. Create CalendarEvent if requested
      if (input.criar_evento && input.data_evento) {
        try {
          const eventData: Prisma.CalendarEventCreateInput = {
            tipo_evento: mapToCalendarEventType(input.tipo),
            titulo: input.titulo,
            descricao: input.descricao,
            data_inicio: input.data_evento,
            data_fim: new Date(input.data_evento.getTime() + 60 * 60 * 1000), // +1h
            local: input.local_evento,
            link_virtual: input.link_virtual,
            status: "AGENDADO",
            created_by: { connect: { id: userId } },
          }

          if (input.responsavel_id) {
            eventData.responsavel = { connect: { id: input.responsavel_id } }
          }
          if (input.case_id) {
            eventData.case_ = { connect: { id: input.case_id } }
          }
          if (input.project_id) {
            eventData.project = { connect: { id: input.project_id } }
          }

          // Handle Outlook sync
          if (input.sincronizar_outlook) {
            eventData.sincronizado_outlook = true
            eventData.sync_status = "PENDING_PUSH"
            eventData.last_modified_source = "SYSTEM"
          }

          const calEvent = await ctx.db.calendarEvent.create({
            data: eventData,
          })

          await ctx.db.emailActivity.update({
            where: { id: emailActivity.id },
            data: { calendar_event_id: calEvent.id },
          })

          // Try to push to Outlook immediately
          if (input.sincronizar_outlook) {
            try {
              const calService = new MicrosoftGraphCalendarService(userId)
              const outlookInput = calService.mapToOutlook({
                titulo: input.titulo,
                descricao: input.descricao,
                data_inicio: input.data_evento,
                data_fim: new Date(input.data_evento.getTime() + 60 * 60 * 1000),
                dia_inteiro: false,
                local: input.local_evento,
                link_virtual: input.link_virtual,
              })
              const created = await calService.createEvent(outlookInput)
              await ctx.db.calendarEvent.update({
                where: { id: calEvent.id },
                data: {
                  outlook_event_id: created.id,
                  sync_status: "SYNCED",
                  outlook_last_sync: new Date(),
                },
              })
            } catch {
              // Sync failed — will be picked up by cron
            }
          }
        } catch (err) {
          console.error("Failed to create calendar event from email:", err)
        }
      }

      // 4. Create reminders
      if (input.reminders.length > 0) {
        await ctx.db.emailActivityReminder.createMany({
          data: input.reminders.map((r) => ({
            email_activity_id: emailActivity.id,
            channel: r.channel,
            offset_minutes: r.offset_minutes,
          })),
        })
      }

      return ctx.db.emailActivity.findUnique({
        where: { id: emailActivity.id },
        include: {
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
          deadline: true,
          calendar_event: true,
          responsavel: { select: { id: true, name: true } },
          reminders: true,
        },
      })
    }),

  // ─── List email activities ───
  list: protectedProcedure
    .input(
      z.object({
        outlook_message_id: z.string().optional(),
        case_id: z.string().optional(),
        project_id: z.string().optional(),
        status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.EmailActivityWhereInput = {}

      if (input.outlook_message_id) {
        where.outlook_message_id = input.outlook_message_id
      }
      if (input.case_id) {
        where.case_id = input.case_id
      }
      if (input.project_id) {
        where.project_id = input.project_id
      }
      if (input.status) {
        where.status = input.status
      }

      const items = await ctx.db.emailActivity.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { created_at: "desc" },
        include: {
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
          deadline: { select: { id: true, status: true, data_limite: true } },
          calendar_event: { select: { id: true, data_inicio: true, status: true } },
          responsavel: { select: { id: true, name: true } },
          reminders: true,
        },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const next = items.pop()
        nextCursor = next?.id
      }

      return { items, nextCursor }
    }),

  // ─── Update email activity status ───
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"]).optional(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        responsavel_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.emailActivity.findUnique({ where: { id } })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Atividade não encontrada" })
      }

      return ctx.db.emailActivity.update({
        where: { id },
        data,
        include: {
          case_: { select: { id: true, numero_processo: true } },
          project: { select: { id: true, titulo: true, codigo: true } },
          responsavel: { select: { id: true, name: true } },
        },
      })
    }),

  // ─── Delete email activity ───
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.emailActivity.findUnique({
        where: { id: input.id },
        select: { id: true, deadline_id: true, calendar_event_id: true },
      })

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Atividade não encontrada" })
      }

      // Remove references but don't delete linked items
      await ctx.db.emailActivity.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})

// ─── Helpers ───

function computeAlerts(dataLimite: Date): Date[] {
  const alerts: Date[] = []
  const now = new Date()

  for (const daysBefore of [5, 3, 2, 1, 0]) {
    const alert = new Date(dataLimite)
    alert.setDate(alert.getDate() - daysBefore)
    alert.setHours(9, 0, 0, 0)
    if (alert > now) {
      alerts.push(alert)
    }
  }

  return alerts
}

function mapToCalendarEventType(
  tipo: string
): "REUNIAO" | "AUDIENCIA" | "SUSTENTACAO_ORAL" | "DESPACHO_ORAL" | "PESQUISA_JURIDICA" | "ANALISE_CASO" | "PRAZO_ANTECIPADO" | "PRAZO_FATAL" | "RETORNO_EMAIL" | "ATIVIDADE_GERAL" {
  const map: Record<string, string> = {
    PRAZO: "PRAZO_FATAL",
    AUDIENCIA: "AUDIENCIA",
    REUNIAO: "REUNIAO",
    DESPACHO: "DESPACHO_ORAL",
    DILIGENCIA: "ATIVIDADE_GERAL",
    PETICAO: "ATIVIDADE_GERAL",
    RECURSO: "PRAZO_FATAL",
    PROVIDENCIA: "ATIVIDADE_GERAL",
    OUTRO: "ATIVIDADE_GERAL",
  }
  return (map[tipo] || "ATIVIDADE_GERAL") as ReturnType<typeof mapToCalendarEventType>
}
