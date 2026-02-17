import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import type { Prisma } from "@prisma/client";
import type { ReportData, ReportKPIs } from "@/types/reports";

export const reportsRouter = router({
  generateData: protectedProcedure
    .input(
      z.object({
        person_id: z.string(),
        date_from: z.coerce.date(),
        date_to: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { person_id, date_from, date_to } = input;
      const db = ctx.db;

      // Find all cases for this client
      const clientCases = await db.case.findMany({
        where: {
          OR: [
            { cliente_id: person_id },
            { partes: { some: { person_id } } },
          ],
        },
        select: { id: true },
      });
      const caseIds = clientCases.map((c) => c.id);

      // Find all projects for this client
      const clientProjects = await db.project.findMany({
        where: {
          OR: [
            { cliente_id: person_id },
            { stakeholders: { some: { person_id } } },
          ],
        },
        select: { id: true },
      });
      const projectIds = clientProjects.map((p) => p.id);

      const activityWhere = {
        OR: [
          { person_id },
          ...(caseIds.length > 0 ? [{ case_id: { in: caseIds } }] : []),
          ...(projectIds.length > 0 ? [{ project_id: { in: projectIds } }] : []),
        ],
        data: { gte: date_from, lte: date_to },
      };

      // KPIs
      const [
        processosAtivos,
        atividadesCount,
        valorDisputas,
        reunioesCount,
        docsCount,
        prazosCumpridos,
        prazosTotal,
        liberacoes,
        emailsCount,
        comunicadosCount,
        relatoriosCount,
      ] = await Promise.all([
        db.case.count({
          where: {
            OR: [{ cliente_id: person_id }, { partes: { some: { person_id } } }],
            status: { notIn: ["ARQUIVADO", "ENCERRADO"] },
          },
        }),
        db.activity.count({ where: activityWhere }),
        db.case.aggregate({
          where: {
            OR: [{ cliente_id: person_id }, { partes: { some: { person_id } } }],
            status: { notIn: ["ARQUIVADO", "ENCERRADO"] },
          },
          _sum: { valor_causa: true },
        }),
        db.activity.count({
          where: { ...activityWhere, tipo: { in: ["REUNIAO", "AUDIENCIA"] } },
        }),
        db.document.count({
          where: {
            OR: [
              ...(caseIds.length > 0 ? [{ case_id: { in: caseIds } }] : []),
              ...(projectIds.length > 0 ? [{ project_id: { in: projectIds } }] : []),
            ],
            created_at: { gte: date_from, lte: date_to },
          },
        }),
        db.deadline.count({
          where: {
            case_id: { in: caseIds },
            status: "CUMPRIDO",
            updated_at: { gte: date_from, lte: date_to },
          },
        }),
        db.deadline.count({
          where: {
            case_id: { in: caseIds },
            data_limite: { gte: date_from, lte: date_to },
          },
        }),
        db.financialRelease.aggregate({
          where: { person_id, status: "LIBERADO", data_liberacao: { gte: date_from, lte: date_to } },
          _sum: { valor: true },
        }),
        db.activity.count({
          where: { ...activityWhere, tipo: "EMAIL" },
        }),
        db.activity.count({
          where: { ...activityWhere, tipo: { in: ["OUTRO"] }, communication_type: "COMUNICADO" },
        }),
        db.activity.count({
          where: { ...activityWhere, tipo: { in: ["OUTRO"] }, communication_type: "RELATORIO" },
        }),
      ]);

      const kpis: ReportKPIs = {
        processos_ativos: processosAtivos,
        atividades_realizadas: atividadesCount,
        valor_disputas: Number(valorDisputas._sum.valor_causa || 0),
        reunioes: reunioesCount,
        documentos_gerados: docsCount,
        prazos_cumpridos: prazosCumpridos,
        prazos_total: prazosTotal,
        liberacoes: Number(liberacoes._sum.valor || 0),
        emails_enviados: emailsCount,
        comunicados: comunicadosCount,
        relatorios_entregues: relatoriosCount,
      };

      // Processes detail
      const processos = await db.case.findMany({
        where: {
          OR: [{ cliente_id: person_id }, { partes: { some: { person_id } } }],
          status: { notIn: ["ARQUIVADO", "ENCERRADO"] },
        },
        include: {
          atividades: {
            where: { data: { gte: date_from, lte: date_to }, include_in_report: true },
            orderBy: { data: "desc" },
            include: { user: { select: { name: true } } },
          },
          movimentacoes: {
            where: { created_at: { gte: date_from, lte: date_to } },
            select: { id: true },
          },
          prazos: {
            where: { data_limite: { gte: date_from, lte: date_to } },
            select: { id: true, status: true },
          },
        },
        orderBy: { numero_processo: "asc" },
      });

      const processosData = processos.map((c) => ({
        id: c.id,
        numero: c.numero_processo || "",
        tipo: c.tipo,
        vara: c.vara || "",
        valor: Number(c.valor_causa || 0),
        status: c.status,
        fase: c.fase_processual || "",
        atividades: c.atividades.map((a) => ({
          id: a.id,
          data: a.data.toISOString(),
          tipo: a.tipo,
          title: a.descricao,
          description: a.descricao,
          result: a.resultado || "",
          priority: a.report_priority,
        })),
        movimentacoes_count: c.movimentacoes.length,
        prazos_cumpridos: c.prazos.filter((p) => p.status === "CUMPRIDO").length,
        prazos_total: c.prazos.length,
      }));

      // Projects detail
      const projetos = await db.project.findMany({
        where: {
          OR: [{ cliente_id: person_id }, { stakeholders: { some: { person_id } } }],
          status: { notIn: ["CANCELADO"] },
        },
        include: {
          tarefas: { select: { id: true, status: true, data_conclusao: true } },
          marcos: { orderBy: { data_prevista: "asc" } },
        },
      });

      const projetosData = projetos.map((p) => {
        const total = p.tarefas.length;
        const concluidas = p.tarefas.filter((t) =>
          t.status === "CONCLUIDA" && t.data_conclusao && t.data_conclusao >= date_from && t.data_conclusao <= date_to
        ).length;
        const totalConcluidas = p.tarefas.filter((t) => t.status === "CONCLUIDA").length;
        return {
          id: p.id,
          codigo: p.codigo,
          titulo: p.titulo,
          status: p.status,
          progresso: total > 0 ? Math.round((totalConcluidas / total) * 100) : 0,
          tarefas_concluidas: concluidas,
          tarefas_total: total,
          marcos: p.marcos.map((m) => ({
            nome: m.titulo,
            data: m.data_prevista?.toISOString() || "",
            status: m.status,
          })),
        };
      });

      // Financial releases
      const releases = await db.financialRelease.findMany({
        where: { person_id },
        orderBy: { data_prevista: "asc" },
      });

      const valores = releases.map((fr) => ({
        id: fr.id,
        tipo: fr.tipo,
        numero: fr.numero_referencia,
        valor: Number(fr.valor),
        status: fr.status,
        data_prevista: fr.data_prevista?.toISOString() || null,
        data_liberacao: fr.data_liberacao?.toISOString() || null,
      }));

      // Communications
      const comunicacoes = await db.activity.findMany({
        where: {
          ...activityWhere,
          tipo: { in: ["EMAIL", "REUNIAO", "AUDIENCIA", "TELEFONEMA", "OUTRO"] },
          communication_type: { not: null },
        },
        orderBy: { data: "desc" },
        take: 50,
      });

      const comunicacoesData = comunicacoes.map((a) => ({
        id: a.id,
        data: a.data.toISOString(),
        tipo: a.tipo,
        title: a.descricao,
        description: a.descricao,
        recipients: a.recipients,
        result: a.resultado || "",
      }));

      // Chart: activities by month (last 6 months)
      const sixMonthsAgo = new Date(date_from);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const allActivities = await db.activity.findMany({
        where: {
          OR: [
            { person_id },
            ...(caseIds.length > 0 ? [{ case_id: { in: caseIds } }] : []),
            ...(projectIds.length > 0 ? [{ project_id: { in: projectIds } }] : []),
          ],
          data: { gte: sixMonthsAgo, lte: date_to },
        },
        select: { data: true, tipo: true },
      });

      const monthMap = new Map<string, { peticoes: number; audiencias: number; reunioes: number; diligencias: number; total: number }>();
      for (const a of allActivities) {
        const key = `${a.data.getFullYear()}-${String(a.data.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, { peticoes: 0, audiencias: 0, reunioes: 0, diligencias: 0, total: 0 });
        const m = monthMap.get(key)!;
        m.total++;
        if (a.tipo === "PETICAO") m.peticoes++;
        else if (a.tipo === "AUDIENCIA") m.audiencias++;
        else if (a.tipo === "REUNIAO") m.reunioes++;
        else if (a.tipo === "DILIGENCIA") m.diligencias++;
      }

      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const grafico_atividades_mes = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({
          mes: monthNames[parseInt(key.split("-")[1]) - 1],
          ...v,
        }));

      // Chart: case value over time (simplified)
      const grafico_valor_disputas_mes = grafico_atividades_mes.map((m) => ({
        mes: m.mes,
        valor: Number(valorDisputas._sum.valor_causa || 0),
      }));

      // Distribution charts
      const riskDistribution = await db.case.groupBy({
        by: ["tipo"],
        where: {
          OR: [{ cliente_id: person_id }, { partes: { some: { person_id } } }],
          status: { notIn: ["ARQUIVADO", "ENCERRADO"] },
        },
        _count: true,
      });

      const distribuicao_tipo = riskDistribution.map((r) => ({
        name: r.tipo,
        value: r._count,
      }));

      const reportData: ReportData = {
        kpis,
        processos: processosData,
        projetos: projetosData,
        valores,
        comunicacoes: comunicacoesData,
        grafico_atividades_mes,
        grafico_valor_disputas_mes,
        distribuicao_risco: [], // Would need risk_level field
        distribuicao_tipo,
      };

      return reportData;
    }),

  saveSnapshot: protectedProcedure
    .input(
      z.object({
        person_id: z.string(),
        period_start: z.coerce.date(),
        period_end: z.coerce.date(),
        executive_summary: z.string().optional(),
        next_steps: z.string().optional(),
        kpis_data: z.record(z.string(), z.unknown()).optional(),
        report_data: z.record(z.string(), z.unknown()).optional(),
        pdf_path: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.reportSnapshot.create({
        data: {
          person_id: input.person_id,
          period_start: input.period_start,
          period_end: input.period_end,
          executive_summary: input.executive_summary,
          next_steps: input.next_steps,
          kpis_data: input.kpis_data as Prisma.InputJsonValue | undefined,
          report_data: input.report_data as Prisma.InputJsonValue | undefined,
          pdf_path: input.pdf_path,
          created_by_id: ctx.session.user.id,
        },
      });
    }),

  listSnapshots: protectedProcedure
    .input(z.object({ person_id: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.reportSnapshot.findMany({
        where: input.person_id ? { person_id: input.person_id } : {},
        include: {
          person: { select: { id: true, nome: true } },
          created_by: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
        take: 50,
      });
    }),

  clientsForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.person.findMany({
      where: { tipo: "CLIENTE" },
      select: { id: true, nome: true, cpf_cnpj: true, subtipo: true },
      orderBy: { nome: "asc" },
      take: 200,
    });
  }),
});
