import { z } from "zod"
import { Prisma } from "@prisma/client"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"
import {
  validateMappedRows,
  checkDuplicates,
  executeBulkImport,
  rollbackImport,
  type MappedRow,
} from "@/lib/services/import-service"
import type { ImportEntityTypeKey } from "@/lib/import-constants"

const entityTypeEnum = z.enum(["PERSON", "CASE", "DEADLINE", "CASE_MOVEMENT", "RJ_CREDITOR"])

const mappedRowSchema = z.object({
  _rowIndex: z.number(),
  _confidence: z.number(),
  _warnings: z.array(z.string()),
  _errors: z.array(z.string()),
  _selected: z.boolean(),
}).passthrough()

// ===== Templates =====

const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.importTemplate.findMany({
      where: { ativo: true },
      orderBy: { created_at: "desc" },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.importTemplate.findUniqueOrThrow({
        where: { id: input.id },
      })
    }),

  create: protectedProcedure
    .input(z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
      entity_type: entityTypeEnum,
      field_mapping: z.record(z.string(), z.string()),
      ai_prompt_hint: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.importTemplate.create({
        data: {
          nome: input.nome,
          descricao: input.descricao,
          entity_type: input.entity_type as never,
          field_mapping: input.field_mapping,
          ai_prompt_hint: input.ai_prompt_hint,
          created_by_id: ctx.session.user.id,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      field_mapping: z.record(z.string(), z.string()).optional(),
      ai_prompt_hint: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.importTemplate.update({
        where: { id },
        data: data as never,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.importTemplate.update({
        where: { id: input.id },
        data: { ativo: false },
      })
    }),
})

// ===== History =====

const historyRouter = router({
  list: protectedProcedure
    .input(z.object({
      entity_type: entityTypeEnum.optional(),
      status: z.enum(["PENDENTE", "PROCESSANDO", "CONCLUIDO", "CONCLUIDO_PARCIAL", "ERRO", "REVERTIDO"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { entity_type, status, page = 1, limit = 20 } = input || {}
      const where: Record<string, unknown> = {}
      if (entity_type) where.entity_type = entity_type
      if (status) where.status = status

      const [items, total] = await Promise.all([
        ctx.db.importLog.findMany({
          where: where as never,
          orderBy: { created_at: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: { template: { select: { nome: true } } },
        }),
        ctx.db.importLog.count({ where: where as never }),
      ])

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.importLog.findUniqueOrThrow({
        where: { id: input.id },
        include: { template: true },
      })
    }),

  rollback: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await rollbackImport(ctx.db, input.id)
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao reverter importação"
        throw new TRPCError({ code: "BAD_REQUEST", message })
      }
    }),
})

// ===== Execute =====

export const importRouter = router({
  templates: templatesRouter,
  history: historyRouter,

  validate: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      rows: z.array(mappedRowSchema),
    }))
    .mutation(({ input }) => {
      return validateMappedRows(
        input.entityType as ImportEntityTypeKey,
        input.rows as MappedRow[]
      )
    }),

  checkDuplicates: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      rows: z.array(mappedRowSchema),
      contextId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return checkDuplicates(
        ctx.db,
        input.entityType as ImportEntityTypeKey,
        input.rows as MappedRow[],
        input.contextId
      )
    }),

  execute: protectedProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      rows: z.array(mappedRowSchema),
      duplicateHandling: z.enum(["skip", "update", "create"]),
      contextId: z.string().optional(),
      defaultValues: z.record(z.string(), z.unknown()).optional(),
      templateId: z.string().optional(),
      fileName: z.string(),
      fileType: z.string(),
      aiAnalysis: z.unknown().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create import log
      const log = await ctx.db.importLog.create({
        data: {
          entity_type: input.entityType as never,
          status: "PROCESSANDO" as never,
          arquivo_nome: input.fileName,
          arquivo_tipo: input.fileType,
          total_linhas: input.rows.length,
          template_id: input.templateId || null,
          ai_analysis: input.aiAnalysis ? (input.aiAnalysis as Prisma.InputJsonValue) : Prisma.JsonNull,
          created_by_id: ctx.session.user.id,
        },
      })

      try {
        const selectedRows = (input.rows as MappedRow[]).filter((r) => r._selected)

        const result = await executeBulkImport(
          ctx.db,
          input.entityType as ImportEntityTypeKey,
          selectedRows,
          {
            duplicateHandling: input.duplicateHandling,
            contextId: input.contextId,
            defaultValues: input.defaultValues,
            createdById: ctx.session.user.id,
          }
        )

        const finalStatus = result.errors > 0
          ? (result.imported > 0 ? "CONCLUIDO_PARCIAL" : "ERRO")
          : "CONCLUIDO"

        await ctx.db.importLog.update({
          where: { id: log.id },
          data: {
            status: finalStatus as never,
            importados: result.imported,
            erros: result.errors,
            ignorados: result.ignored,
            detalhes: {
              created_ids: result.created_ids,
              errors: result.error_details,
            },
          },
        })

        return { logId: log.id, ...result }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro na importação"
        await ctx.db.importLog.update({
          where: { id: log.id },
          data: {
            status: "ERRO" as never,
            detalhes: { errors: [{ row: 0, message }] },
          },
        })
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message })
      }
    }),
})
