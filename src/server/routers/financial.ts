import { z } from "zod"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"

export const financialRouter = router({
  // ── Dashboard KPIs ──
  dashboard: protectedProcedure
    .input(z.object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const start = input.startDate || new Date(now.getFullYear(), now.getMonth(), 1)
      const end = input.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const [feesPaid, feesPending, feesOverdue, expenses, monthlyFees] = await Promise.all([
        ctx.db.fee.aggregate({
          where: { status: "PAGO", data_pagamento: { gte: start, lte: end } },
          _sum: { valor: true },
        }),
        ctx.db.fee.aggregate({
          where: { status: "PENDENTE" },
          _sum: { valor: true },
        }),
        ctx.db.fee.aggregate({
          where: { status: "ATRASADO" },
          _sum: { valor: true },
        }),
        ctx.db.expense.aggregate({
          where: { data: { gte: start, lte: end } },
          _sum: { valor: true },
        }),
        // Monthly breakdown (last 6 months)
        ctx.db.$queryRaw`
          SELECT
            DATE_TRUNC('month', data_vencimento) as mes,
            SUM(CASE WHEN status = 'PAGO' THEN valor ELSE 0 END) as pago,
            SUM(CASE WHEN status = 'PENDENTE' THEN valor ELSE 0 END) as pendente,
            SUM(CASE WHEN status = 'ATRASADO' THEN valor ELSE 0 END) as atrasado
          FROM fees
          WHERE data_vencimento >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', data_vencimento)
          ORDER BY mes DESC
          LIMIT 6
        ` as Promise<any[]>,
      ])

      return {
        faturamento: Number(feesPaid._sum.valor || 0),
        aReceber: Number(feesPending._sum.valor || 0),
        despesas: Number(expenses._sum.valor || 0),
        resultado: Number(feesPaid._sum.valor || 0) - Number(expenses._sum.valor || 0),
        inadimplencia: Number(feesOverdue._sum.valor || 0),
        monthly: monthlyFees.map((m: any) => ({
          mes: m.mes,
          pago: Number(m.pago || 0),
          pendente: Number(m.pendente || 0),
          atrasado: Number(m.atrasado || 0),
        })),
      }
    }),

  // ── Fees CRUD ──
  fees: router({
    list: protectedProcedure
      .input(z.object({
        caseId: z.string().optional(),
        projectId: z.string().optional(),
        status: z.string().optional(),
        page: z.number().default(1),
        perPage: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const where: any = {}
        if (input.caseId) where.case_id = input.caseId
        if (input.projectId) where.project_id = input.projectId
        if (input.status) where.status = input.status

        const [items, total] = await Promise.all([
          ctx.db.fee.findMany({
            where,
            orderBy: { data_vencimento: "desc" },
            skip: (input.page - 1) * input.perPage,
            take: input.perPage,
            include: {
              case_: { select: { id: true, numero_processo: true, cliente: { select: { nome: true } } } },
              project: { select: { id: true, titulo: true } },
            },
          }),
          ctx.db.fee.count({ where }),
        ])

        return { items, total }
      }),

    create: protectedProcedure
      .input(z.object({
        caseId: z.string().optional(),
        projectId: z.string().optional(),
        personId: z.string().optional(),
        tipo: z.enum(["FIXO", "EXITO", "MENSAL", "POR_ATO", "AD_EXITUM_RJ"]),
        descricao: z.string().min(1),
        valor: z.number().positive(),
        parcelas: z.number().min(1).default(1),
        recorrente: z.boolean().default(false),
        recorrencia: z.string().optional(),
        dataVencimento: z.coerce.date(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // If multiple installments, create parent + children
        if (input.parcelas > 1) {
          const valorParcela = input.valor / input.parcelas
          const fees = []

          for (let i = 0; i < input.parcelas; i++) {
            const venc = new Date(input.dataVencimento)
            venc.setMonth(venc.getMonth() + i)

            fees.push({
              case_id: input.caseId,
              project_id: input.projectId,
              person_id: input.personId,
              tipo: input.tipo,
              descricao: `${input.descricao} (${i + 1}/${input.parcelas})`,
              valor: valorParcela,
              parcelas: input.parcelas,
              parcela_atual: i + 1,
              data_vencimento: venc,
              created_by_id: ctx.session.user.id,
            })
          }

          await ctx.db.fee.createMany({ data: fees as any })
          return { created: input.parcelas }
        }

        return ctx.db.fee.create({
          data: {
            case_id: input.caseId,
            project_id: input.projectId,
            person_id: input.personId,
            tipo: input.tipo,
            descricao: input.descricao,
            valor: input.valor,
            recorrente: input.recorrente,
            recorrencia: input.recorrencia,
            data_vencimento: input.dataVencimento,
            observacoes: input.observacoes,
            created_by_id: ctx.session.user.id,
          },
        })
      }),

    markPaid: protectedProcedure
      .input(z.object({
        feeId: z.string(),
        dataPagamento: z.coerce.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.fee.update({
          where: { id: input.feeId },
          data: {
            status: "PAGO",
            data_pagamento: input.dataPagamento || new Date(),
          },
        })
      }),

    delete: protectedProcedure
      .input(z.object({ feeId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.fee.delete({ where: { id: input.feeId } })
      }),
  }),

  // ── Expenses CRUD ──
  expenses: router({
    list: protectedProcedure
      .input(z.object({
        caseId: z.string().optional(),
        projectId: z.string().optional(),
        categoria: z.string().optional(),
        page: z.number().default(1),
        perPage: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const where: any = {}
        if (input.caseId) where.case_id = input.caseId
        if (input.projectId) where.project_id = input.projectId
        if (input.categoria) where.categoria = input.categoria

        const [items, total] = await Promise.all([
          ctx.db.expense.findMany({
            where,
            orderBy: { data: "desc" },
            skip: (input.page - 1) * input.perPage,
            take: input.perPage,
            include: {
              case_: { select: { id: true, numero_processo: true } },
              project: { select: { id: true, titulo: true } },
            },
          }),
          ctx.db.expense.count({ where }),
        ])

        return { items, total }
      }),

    create: protectedProcedure
      .input(z.object({
        caseId: z.string().optional(),
        projectId: z.string().optional(),
        categoria: z.string(),
        descricao: z.string().min(1),
        valor: z.number().positive(),
        data: z.coerce.date(),
        reembolsavel: z.boolean().default(false),
        comprovanteUrl: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.expense.create({
          data: {
            case_id: input.caseId,
            project_id: input.projectId,
            categoria: input.categoria,
            descricao: input.descricao,
            valor: input.valor,
            data: input.data,
            reembolsavel: input.reembolsavel,
            comprovante_url: input.comprovanteUrl,
            observacoes: input.observacoes,
            created_by_id: ctx.session.user.id,
          },
        })
      }),

    markReimbursed: protectedProcedure
      .input(z.object({ expenseId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.expense.update({
          where: { id: input.expenseId },
          data: { reembolsado: true, data_reembolso: new Date() },
        })
      }),

    delete: protectedProcedure
      .input(z.object({ expenseId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.expense.delete({ where: { id: input.expenseId } })
      }),
  }),
})
