import { z } from "zod"
import { router, protectedProcedure } from "@/server/trpc"
import { TRPCError } from "@trpc/server"

// ═══════════════════════════════════════════════════════════
// Zod Schemas
// ═══════════════════════════════════════════════════════════

const TargetTypeEnum = z.enum(["PF", "PJ"])

const InvestigationStatusEnum = z.enum([
  "PENDENTE",
  "EM_ANDAMENTO",
  "CONSULTAS_CONCLUIDAS",
  "ANALISE_IA",
  "CONCLUIDA",
  "ARQUIVADA",
])

const InvestigationDepthEnum = z.enum(["BASICA", "PADRAO", "APROFUNDADA", "COMPLETA"])

const PriorityEnum = z.enum(["CRITICA", "ALTA", "MEDIA", "BAIXA"])

const MonitorFrequencyEnum = z.enum(["DIARIO", "SEMANAL", "QUINZENAL", "MENSAL"])

const ApiProviderEnum = z.enum([
  "BRASILAPI",
  "CNPJA",
  "DATAJUD",
  "CVM_DADOS_ABERTOS",
  "BACEN",
  "RECEITA_FEDERAL",
  "PGFN",
  "INPI",
  "INFOSIMPLES",
  "ESCAVADOR",
  "JUDIT",
  "ASSERTIVA",
  "NEOWAY",
  "BIGDATACORP",
  "JUSBRASIL",
  "SERASA",
  "BOA_VISTA",
  "QUOD",
  "DENATRAN_SERPRO",
  "ONR_SREI",
  "CENPROT",
  "INCRA_SIGEF",
  "SICAR",
  "MAPBIOMAS",
  "GOOGLE_EARTH_ENGINE",
  "PLANET_LABS",
  "SENTINEL_HUB",
  "INPE_TERRABRASILIS",
  "COMPLYADVANTAGE",
  "REFINITIV_WORLDCHECK",
  "OPENCORPORATES",
  "SAYARI",
  "DNB",
  "CHAINALYSIS",
  "OPENSANCTIONS",
  "SANCTIONS_IO",
  "MANUAL",
])

const QueryTypeEnum = z.enum([
  "CONSULTA_CPF",
  "CONSULTA_CNPJ",
  "CONSULTA_PROCESSO",
  "CONSULTA_VEICULO",
  "CONSULTA_IMOVEL",
  "CONSULTA_PROTESTO",
  "CONSULTA_DIVIDA_ATIVA",
  "CONSULTA_SCORING",
  "CONSULTA_PEP_SANCOES",
  "CONSULTA_SOCIETARIA",
  "CONSULTA_CVM",
  "CONSULTA_SATELITE",
  "CONSULTA_RURAL",
  "CONSULTA_MARCAS",
  "MONITORAMENTO",
])

const AssetCategoryEnum = z.enum([
  "IMOVEL_URBANO",
  "IMOVEL_RURAL",
  "VEICULO_AUTOMOVEL",
  "VEICULO_CAMINHAO",
  "VEICULO_MOTOCICLETA",
  "VEICULO_OUTRO",
  "EMBARCACAO",
  "AERONAVE",
  "PARTICIPACAO_SOCIETARIA",
  "ACOES_BOLSA",
  "FUNDOS_INVESTIMENTO",
  "DEPOSITO_BANCARIO",
  "CREDITOS_RECEBER",
  "MARCAS_PATENTES",
  "MAQUINAS_EQUIPAMENTOS",
  "CRIPTOATIVOS",
  "OUTROS",
])

const AlertSeverityEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"])

const ReportTypeEnum = z.enum([
  "DOSSIE_COMPLETO",
  "RESUMO_PATRIMONIAL",
  "RELATORIO_BENS",
  "RELATORIO_PROCESSOS",
  "RELATORIO_SOCIETARIO",
  "RELATORIO_COMPLIANCE",
  "PETICAO_MEDIDA_CONSTRITIVA",
  "LAUDO_AVALIACAO",
])

const ApiCategoryEnum = z.enum([
  "CADASTRAL",
  "JUDICIAL",
  "PATRIMONIAL",
  "VEICULAR",
  "IMOBILIARIO",
  "RURAL_SATELITE",
  "CREDITICIO",
  "COMPLIANCE",
  "SOCIETARIO",
  "PROTESTOS",
])

// ═══════════════════════════════════════════════════════════
// Estimated query counts per depth level (for cost estimation)
// ═══════════════════════════════════════════════════════════

const DEPTH_QUERY_MAP: Record<string, { queries: number; costPerQuery: number }> = {
  BASICA: { queries: 3, costPerQuery: 0.5 },
  PADRAO: { queries: 8, costPerQuery: 0.5 },
  APROFUNDADA: { queries: 15, costPerQuery: 0.75 },
  COMPLETA: { queries: 25, costPerQuery: 1.0 },
}

// ═══════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════

export const investigationRouter = router({
  // -------------------------------------------------------
  // 1) investigation.create — Create new investigation
  // -------------------------------------------------------
  create: protectedProcedure
    .input(
      z.object({
        targetDocument: z.string().min(1, "Documento do alvo é obrigatório"),
        targetType: TargetTypeEnum,
        targetName: z.string().min(1, "Nome do alvo é obrigatório"),
        creditCaseId: z.string().optional(),
        caseId: z.string().optional(),
        projectId: z.string().optional(),
        depth: InvestigationDepthEnum,
        priority: PriorityEnum,
        autoMonitor: z.boolean().optional().default(false),
        monitorFrequency: MonitorFrequencyEnum.optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const investigation = await ctx.db.investigation.create({
        data: {
          targetDocument: input.targetDocument,
          targetType: input.targetType,
          targetName: input.targetName,
          creditCaseId: input.creditCaseId ?? null,
          caseId: input.caseId ?? null,
          projectId: input.projectId ?? null,
          depth: input.depth,
          priority: input.priority,
          autoMonitor: input.autoMonitor,
          monitorFrequency: input.autoMonitor ? (input.monitorFrequency ?? null) : null,
          notes: input.notes ?? null,
          status: "PENDENTE",
          requestedById: userId,
          assignedToId: userId,
        },
      })

      return investigation
    }),

  // -------------------------------------------------------
  // 2) investigation.startScan — Start full investigation scan
  // -------------------------------------------------------
  startScan: protectedProcedure
    .input(
      z.object({
        investigationId: z.string(),
        depth: InvestigationDepthEnum.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const investigation = await ctx.db.investigation.findUnique({
        where: { id: input.investigationId },
      })

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigação não encontrada",
        })
      }

      const effectiveDepth = input.depth ?? investigation.depth
      const depthInfo = DEPTH_QUERY_MAP[effectiveDepth] ?? DEPTH_QUERY_MAP.PADRAO

      // Update investigation status to EM_ANDAMENTO
      await ctx.db.investigation.update({
        where: { id: input.investigationId },
        data: {
          status: "EM_ANDAMENTO",
          depth: effectiveDepth,
          lastFullScanAt: new Date(),
        },
      })

      return {
        started: true,
        investigationId: input.investigationId,
        estimatedQueries: depthInfo.queries,
        estimatedCost: parseFloat((depthInfo.queries * depthInfo.costPerQuery).toFixed(2)),
      }
    }),

  // -------------------------------------------------------
  // 3) investigation.executeSingleQuery — Execute one provider query
  // -------------------------------------------------------
  executeSingleQuery: protectedProcedure
    .input(
      z.object({
        investigationId: z.string(),
        provider: ApiProviderEnum,
        queryType: QueryTypeEnum,
        params: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const investigation = await ctx.db.investigation.findUnique({
        where: { id: input.investigationId },
      })

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigação não encontrada",
        })
      }

      // Create the query record with status EXECUTANDO
      const query = await ctx.db.investigationQuery.create({
        data: {
          investigationId: input.investigationId,
          provider: input.provider,
          endpoint: `${input.provider.toLowerCase()}/${input.queryType.toLowerCase()}`,
          queryType: input.queryType,
          inputParams: {
            targetDocument: investigation.targetDocument,
            targetName: investigation.targetName,
            targetType: investigation.targetType,
            ...(input.params ?? {}),
          },
          status: "EXECUTANDO",
          executedById: userId,
          legalBasis: "EXERCICIO_DIREITOS",
          retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      })

      // Mock response: set status to MOCK with placeholder parsed data
      const mockParsedData = {
        _mock: true,
        provider: input.provider,
        queryType: input.queryType,
        targetDocument: investigation.targetDocument,
        targetName: investigation.targetName,
        resultCount: Math.floor(Math.random() * 10),
        timestamp: new Date().toISOString(),
        summary: `Consulta mock para ${input.provider} - ${input.queryType}`,
      }

      const updatedQuery = await ctx.db.investigationQuery.update({
        where: { id: query.id },
        data: {
          status: "MOCK",
          parsedData: mockParsedData,
          rawResponse: mockParsedData,
          responseTimeMs: Math.floor(Math.random() * 2000) + 200,
          cost: parseFloat((Math.random() * 2).toFixed(4)),
        },
      })

      return updatedQuery
    }),

  // -------------------------------------------------------
  // 4) investigation.getById — Full investigation detail
  // -------------------------------------------------------
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const investigation = await ctx.db.investigation.findUnique({
        where: { id: input.id },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          creditCase: {
            select: { id: true, codigo: true, titulo: true },
          },
          case_: {
            select: { id: true, numero_processo: true },
          },
          project: {
            select: { id: true, titulo: true, codigo: true },
          },
          queries: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          assets: {
            orderBy: { estimatedValue: "desc" },
          },
          debts: {
            orderBy: { currentValue: "desc" },
          },
          lawsuits: {
            orderBy: { createdAt: "desc" },
          },
          corporateLinks: {
            orderBy: { createdAt: "desc" },
          },
          alerts: {
            orderBy: [{ read: "asc" }, { createdAt: "desc" }],
          },
          reports: {
            orderBy: { createdAt: "desc" },
          },
          relatedPersons: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigação não encontrada",
        })
      }

      return investigation
    }),

  // -------------------------------------------------------
  // 5) investigation.list — List investigations with filters
  // -------------------------------------------------------
  list: protectedProcedure
    .input(
      z.object({
        creditCaseId: z.string().optional(),
        status: InvestigationStatusEnum.optional(),
        assignedToId: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, search, ...filters } = input
      const skip = (page - 1) * perPage

      const where: any = {}

      if (filters.status) where.status = filters.status
      if (filters.assignedToId) where.assignedToId = filters.assignedToId
      if (filters.creditCaseId) where.creditCaseId = filters.creditCaseId

      if (search) {
        where.OR = [
          { targetName: { contains: search, mode: "insensitive" } },
          { targetDocument: { contains: search, mode: "insensitive" } },
        ]
      }

      const [items, total] = await Promise.all([
        ctx.db.investigation.findMany({
          where,
          include: {
            requestedBy: {
              select: { id: true, name: true },
            },
            assignedTo: {
              select: { id: true, name: true },
            },
            creditCase: {
              select: { id: true, codigo: true, titulo: true },
            },
            _count: {
              select: {
                queries: true,
                assets: true,
                debts: true,
                lawsuits: true,
                alerts: true,
                reports: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: perPage,
        }),
        ctx.db.investigation.count({ where }),
      ])

      return { items, total }
    }),

  // -------------------------------------------------------
  // 6) investigation.getAssets — List assets with filters
  // -------------------------------------------------------
  getAssets: protectedProcedure
    .input(
      z.object({
        investigationId: z.string(),
        category: AssetCategoryEnum.optional(),
        verified: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        investigationId: input.investigationId,
      }

      if (input.category) where.category = input.category
      if (input.verified !== undefined) where.verified = input.verified

      const items = await ctx.db.discoveredAsset.findMany({
        where,
        orderBy: { estimatedValue: "desc" },
      })

      const total = items.length

      // Calculate total value sum
      const aggregation = await ctx.db.discoveredAsset.aggregate({
        where,
        _sum: {
          estimatedValue: true,
        },
      })

      const totalValue = aggregation._sum.estimatedValue
        ? parseFloat(aggregation._sum.estimatedValue.toString())
        : 0

      return { items, total, totalValue }
    }),

  // -------------------------------------------------------
  // 7) investigation.getTimeline — Chronological timeline
  // -------------------------------------------------------
  getTimeline: protectedProcedure
    .input(z.object({ investigationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [queries, assets, alerts] = await Promise.all([
        ctx.db.investigationQuery.findMany({
          where: { investigationId: input.investigationId },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.discoveredAsset.findMany({
          where: { investigationId: input.investigationId },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.investigationAlert.findMany({
          where: { investigationId: input.investigationId },
          orderBy: { createdAt: "desc" },
        }),
      ])

      const timeline: Array<{
        date: Date
        type: "query" | "asset" | "alert"
        title: string
        description: string
        provider?: string
        data?: Record<string, unknown>
      }> = []

      // Add queries to timeline
      for (const q of queries) {
        timeline.push({
          date: q.createdAt,
          type: "query",
          title: `Consulta ${q.provider} — ${q.queryType}`,
          description: `Status: ${q.status}${q.responseTimeMs ? ` (${q.responseTimeMs}ms)` : ""}`,
          provider: q.provider,
          data: {
            id: q.id,
            status: q.status,
            cost: q.cost ? parseFloat(q.cost.toString()) : null,
            responseTimeMs: q.responseTimeMs,
          },
        })
      }

      // Add assets to timeline
      for (const a of assets) {
        timeline.push({
          date: a.createdAt,
          type: "asset",
          title: `Bem identificado: ${a.category}`,
          description: a.description,
          provider: a.sourceProvider,
          data: {
            id: a.id,
            category: a.category,
            estimatedValue: a.estimatedValue ? parseFloat(a.estimatedValue.toString()) : null,
            verified: a.verified,
            hasRestriction: a.hasRestriction,
          },
        })
      }

      // Add alerts to timeline
      for (const al of alerts) {
        timeline.push({
          date: al.createdAt,
          type: "alert",
          title: `[${al.severity}] ${al.title}`,
          description: al.description,
          provider: al.sourceProvider ?? undefined,
          data: {
            id: al.id,
            alertType: al.alertType,
            severity: al.severity,
            read: al.read,
          },
        })
      }

      // Sort by date descending
      timeline.sort((a, b) => b.date.getTime() - a.date.getTime())

      return timeline
    }),

  // -------------------------------------------------------
  // 8) investigation.generateReport — Generate AI report
  // -------------------------------------------------------
  generateReport: protectedProcedure
    .input(
      z.object({
        investigationId: z.string(),
        reportType: ReportTypeEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const investigation = await ctx.db.investigation.findUnique({
        where: { id: input.investigationId },
        include: {
          assets: true,
          debts: true,
          lawsuits: true,
          corporateLinks: true,
          relatedPersons: true,
          queries: {
            where: { status: { in: ["CONCLUIDA", "MOCK"] } },
          },
        },
      })

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigação não encontrada",
        })
      }

      // Build report title based on type
      const reportTitleMap: Record<string, string> = {
        DOSSIE_COMPLETO: "Dossiê Completo",
        RESUMO_PATRIMONIAL: "Resumo Patrimonial",
        RELATORIO_BENS: "Relatório de Bens",
        RELATORIO_PROCESSOS: "Relatório de Processos",
        RELATORIO_SOCIETARIO: "Relatório Societário",
        RELATORIO_COMPLIANCE: "Relatório de Compliance",
        PETICAO_MEDIDA_CONSTRITIVA: "Petição para Medida Constritiva",
        LAUDO_AVALIACAO: "Laudo de Avaliação",
      }

      const reportTitle = `${reportTitleMap[input.reportType] ?? input.reportType} — ${investigation.targetName}`

      // Build placeholder content with investigation summary
      const assetCount = investigation.assets.length
      const debtCount = investigation.debts.length
      const lawsuitCount = investigation.lawsuits.length
      const corporateLinkCount = investigation.corporateLinks.length
      const queryCount = investigation.queries.length

      const placeholderContent = [
        `# ${reportTitle}`,
        "",
        `**Alvo:** ${investigation.targetName} (${investigation.targetDocument})`,
        `**Tipo:** ${investigation.targetType}`,
        `**Data do Relatório:** ${new Date().toLocaleDateString("pt-BR")}`,
        `**Tipo de Relatório:** ${reportTitleMap[input.reportType] ?? input.reportType}`,
        "",
        "## Resumo Executivo",
        "",
        `Este relatório foi gerado com base em ${queryCount} consultas realizadas junto a diversas fontes.`,
        `Foram identificados ${assetCount} bens, ${debtCount} dívidas, ${lawsuitCount} processos judiciais e ${corporateLinkCount} vínculos societários.`,
        "",
        investigation.aiSummary
          ? `### Análise de Risco\n\n${investigation.aiSummary}`
          : "### Análise de Risco\n\n*Análise de IA ainda não foi executada. Execute a análise para obter insights detalhados.*",
        "",
        "## Patrimônio Identificado",
        "",
        assetCount > 0
          ? investigation.assets
              .map(
                (a) =>
                  `- **${a.category}**: ${a.description}${a.estimatedValue ? ` — R$ ${parseFloat(a.estimatedValue.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}`
              )
              .join("\n")
          : "*Nenhum bem identificado até o momento.*",
        "",
        "## Dívidas e Passivos",
        "",
        debtCount > 0
          ? investigation.debts
              .map(
                (d) =>
                  `- **${d.debtType}** — Credor: ${d.creditor}${d.currentValue ? ` — R$ ${parseFloat(d.currentValue.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}`
              )
              .join("\n")
          : "*Nenhuma dívida identificada até o momento.*",
        "",
        "## Processos Judiciais",
        "",
        lawsuitCount > 0
          ? investigation.lawsuits
              .map(
                (l) =>
                  `- **${l.caseNumber}** — ${l.court} — Papel: ${l.role}${l.subject ? ` — ${l.subject}` : ""}`
              )
              .join("\n")
          : "*Nenhum processo identificado até o momento.*",
        "",
        "## Vínculos Societários",
        "",
        corporateLinkCount > 0
          ? investigation.corporateLinks
              .map(
                (c) =>
                  `- **${c.companyName}** (${c.companyCnpj}) — ${c.role}${c.sharePercentage ? ` — ${c.sharePercentage}%` : ""}`
              )
              .join("\n")
          : "*Nenhum vínculo societário identificado até o momento.*",
        "",
        "---",
        "",
        "*Relatório gerado automaticamente pelo sistema JRCLaw. Conteúdo placeholder — a integração com IA gerará conteúdo analítico completo.*",
      ].join("\n")

      const report = await ctx.db.investigationReport.create({
        data: {
          investigationId: input.investigationId,
          reportType: input.reportType,
          title: reportTitle,
          content: placeholderContent,
          aiGenerated: true,
          generatedById: userId,
        },
      })

      return report
    }),

  // -------------------------------------------------------
  // 9) investigation.analyzeWithAI — Run AI analysis
  // -------------------------------------------------------
  analyzeWithAI: protectedProcedure
    .input(z.object({ investigationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const investigation = await ctx.db.investigation.findUnique({
        where: { id: input.investigationId },
        include: {
          assets: true,
          debts: true,
          lawsuits: true,
          corporateLinks: true,
        },
      })

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigação não encontrada",
        })
      }

      // Placeholder AI analysis: random risk score between 30-80
      const riskScore = Math.floor(Math.random() * 51) + 30

      let riskClassification: string
      if (riskScore <= 40) {
        riskClassification = "BAIXO"
      } else if (riskScore <= 55) {
        riskClassification = "MODERADO"
      } else if (riskScore <= 70) {
        riskClassification = "ALTO"
      } else {
        riskClassification = "MUITO_ALTO"
      }

      // Calculate totals for summary
      const totalAssets = investigation.assets.reduce((sum, a) => {
        return sum + (a.estimatedValue ? parseFloat(a.estimatedValue.toString()) : 0)
      }, 0)

      const totalDebts = investigation.debts.reduce((sum, d) => {
        return sum + (d.currentValue ? parseFloat(d.currentValue.toString()) : 0)
      }, 0)

      const aiSummary = [
        `## Análise Patrimonial — ${investigation.targetName}`,
        "",
        `**Score de Risco:** ${riskScore}/100 (${riskClassification})`,
        "",
        `### Patrimônio Estimado`,
        `- Total de bens identificados: ${investigation.assets.length}`,
        `- Valor estimado total: R$ ${totalAssets.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        "",
        `### Passivo Identificado`,
        `- Total de dívidas/passivos: ${investigation.debts.length}`,
        `- Valor total de débitos: R$ ${totalDebts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        "",
        `### Processos Judiciais`,
        `- Total de processos: ${investigation.lawsuits.length}`,
        `- Processos com bloqueio de bens: ${investigation.lawsuits.filter((l) => l.hasAssetFreeze).length}`,
        "",
        `### Estrutura Societária`,
        `- Vínculos societários: ${investigation.corporateLinks.length}`,
        `- Empresas offshore: ${investigation.corporateLinks.filter((c) => c.isOffshore).length}`,
        `- Empresas com irregularidade: ${investigation.corporateLinks.filter((c) => c.hasIrregularity).length}`,
        "",
        `### Patrimônio Líquido Estimado`,
        `R$ ${(totalAssets - totalDebts).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        "",
        "*Esta análise é um placeholder. A integração com IA (Claude) produzirá insights detalhados sobre riscos, oportunidades de constrição e recomendações estratégicas.*",
      ].join("\n")

      const updated = await ctx.db.investigation.update({
        where: { id: input.investigationId },
        data: {
          riskScore,
          riskClassification,
          aiSummary,
          totalEstimatedValue: totalAssets,
          totalDebts: totalDebts,
          status: investigation.status === "EM_ANDAMENTO" ? "ANALISE_IA" : investigation.status,
        },
      })

      return updated
    }),

  // -------------------------------------------------------
  // 10) investigation.compareTargets — Compare multiple targets
  // -------------------------------------------------------
  compareTargets: protectedProcedure
    .input(
      z.object({
        investigationIds: z.array(z.string()).min(1).max(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const investigations = await ctx.db.investigation.findMany({
        where: { id: { in: input.investigationIds } },
        include: {
          assets: true,
          debts: true,
          lawsuits: true,
          corporateLinks: true,
          _count: {
            select: {
              queries: true,
              alerts: true,
              reports: true,
              relatedPersons: true,
            },
          },
        },
      })

      if (investigations.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhuma investigação encontrada com os IDs fornecidos",
        })
      }

      const comparison = investigations.map((inv) => {
        const totalAssetValue = inv.assets.reduce((sum, a) => {
          return sum + (a.estimatedValue ? parseFloat(a.estimatedValue.toString()) : 0)
        }, 0)

        const totalDebtValue = inv.debts.reduce((sum, d) => {
          return sum + (d.currentValue ? parseFloat(d.currentValue.toString()) : 0)
        }, 0)

        const assetsByCategory: Record<string, number> = {}
        for (const a of inv.assets) {
          const val = a.estimatedValue ? parseFloat(a.estimatedValue.toString()) : 0
          assetsByCategory[a.category] = (assetsByCategory[a.category] ?? 0) + val
        }

        const debtsByType: Record<string, number> = {}
        for (const d of inv.debts) {
          const val = d.currentValue ? parseFloat(d.currentValue.toString()) : 0
          debtsByType[d.debtType] = (debtsByType[d.debtType] ?? 0) + val
        }

        return {
          investigationId: inv.id,
          targetName: inv.targetName,
          targetDocument: inv.targetDocument,
          targetType: inv.targetType,
          status: inv.status,
          riskScore: inv.riskScore,
          riskClassification: inv.riskClassification,
          totalAssetValue,
          totalDebtValue,
          netWorth: totalAssetValue - totalDebtValue,
          assetCount: inv.assets.length,
          debtCount: inv.debts.length,
          lawsuitCount: inv.lawsuits.length,
          corporateLinkCount: inv.corporateLinks.length,
          assetsByCategory,
          debtsByType,
          queriesCount: inv._count.queries,
          alertsCount: inv._count.alerts,
          reportsCount: inv._count.reports,
          relatedPersonsCount: inv._count.relatedPersons,
          hasAssetFreeze: inv.lawsuits.some((l) => l.hasAssetFreeze),
          hasOffshoreLinks: inv.corporateLinks.some((c) => c.isOffshore),
        }
      })

      return comparison
    }),

  // -------------------------------------------------------
  // 11) investigation.getAlerts — List alerts
  // -------------------------------------------------------
  getAlerts: protectedProcedure
    .input(
      z.object({
        investigationId: z.string().optional(),
        read: z.boolean().optional(),
        severity: AlertSeverityEnum.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {}

      if (input.investigationId) where.investigationId = input.investigationId
      if (input.read !== undefined) where.read = input.read
      if (input.severity) where.severity = input.severity

      const alerts = await ctx.db.investigationAlert.findMany({
        where,
        include: {
          investigation: {
            select: { id: true, targetName: true, targetDocument: true },
          },
        },
        orderBy: [{ read: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
      })

      return alerts
    }),

  // investigation.markAlertRead — Mark alert as read
  markAlertRead: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.db.investigationAlert.findUnique({
        where: { id: input.alertId },
      })

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alerta não encontrado",
        })
      }

      const updated = await ctx.db.investigationAlert.update({
        where: { id: input.alertId },
        data: {
          read: true,
          readAt: new Date(),
          readById: ctx.session.user.id,
        },
      })

      return updated
    }),

  // -------------------------------------------------------
  // 12) investigation.configureProvider — Configure API provider
  // -------------------------------------------------------
  configureProvider: protectedProcedure
    .input(
      z.object({
        provider: ApiProviderEnum,
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        baseUrl: z.string().url().optional().or(z.literal("")),
        monthlyBudget: z.number().min(0).optional(),
        isActive: z.boolean(),
        displayName: z.string().optional(),
        category: ApiCategoryEnum.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role
      if (role !== "ADMIN" && role !== "SOCIO") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores e sócios podem configurar provedores de API",
        })
      }

      const isConfigured = !!(input.apiKey || input.apiSecret || input.baseUrl)

      const config = await ctx.db.apiProviderConfig.upsert({
        where: { provider: input.provider },
        create: {
          provider: input.provider,
          displayName: input.displayName ?? input.provider,
          category: input.category ?? "CADASTRAL",
          apiKey: input.apiKey ?? null,
          apiSecret: input.apiSecret ?? null,
          baseUrl: input.baseUrl || null,
          monthlyBudget: input.monthlyBudget ?? null,
          isActive: input.isActive,
          isConfigured,
        },
        update: {
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.apiKey !== undefined && { apiKey: input.apiKey || null }),
          ...(input.apiSecret !== undefined && { apiSecret: input.apiSecret || null }),
          ...(input.baseUrl !== undefined && { baseUrl: input.baseUrl || null }),
          ...(input.monthlyBudget !== undefined && { monthlyBudget: input.monthlyBudget }),
          isActive: input.isActive,
          isConfigured,
        },
      })

      return config
    }),

  // -------------------------------------------------------
  // 13) investigation.getDashboardStats — Dashboard metrics
  // -------------------------------------------------------
  getDashboardStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const periodDays = input.period === "7d" ? 7 : input.period === "90d" ? 90 : 30
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - periodDays)

      // Count investigations by status
      const statusCounts = await ctx.db.investigation.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { createdAt: { gte: dateFrom } },
      })

      const byStatus: Record<string, number> = {}
      for (const s of statusCounts) {
        byStatus[s.status] = s._count.id
      }

      // Sum assets by category
      const assetsByCategory = await ctx.db.discoveredAsset.groupBy({
        by: ["category"],
        _sum: { estimatedValue: true },
        _count: { id: true },
        where: { createdAt: { gte: dateFrom } },
      })

      const assetSummary = assetsByCategory.map((a) => ({
        category: a.category,
        count: a._count.id,
        totalValue: a._sum.estimatedValue ? parseFloat(a._sum.estimatedValue.toString()) : 0,
      }))

      // Total patrimony tracked (all-time)
      const totalPatrimony = await ctx.db.discoveredAsset.aggregate({
        _sum: { estimatedValue: true },
      })

      // Total query costs in period
      const totalQueryCosts = await ctx.db.investigationQuery.aggregate({
        where: { createdAt: { gte: dateFrom } },
        _sum: { cost: true },
      })

      // Pending alerts count
      const pendingAlerts = await ctx.db.investigationAlert.count({
        where: { read: false },
      })

      // Total investigations
      const totalInvestigations = await ctx.db.investigation.count()

      // Active investigations
      const activeInvestigations = await ctx.db.investigation.count({
        where: { status: { in: ["PENDENTE", "EM_ANDAMENTO", "ANALISE_IA"] } },
      })

      // Completed in period
      const completedInPeriod = await ctx.db.investigation.count({
        where: {
          status: "CONCLUIDA",
          updatedAt: { gte: dateFrom },
        },
      })

      return {
        period: input.period,
        byStatus,
        assetSummary,
        totalPatrimonyTracked: totalPatrimony._sum.estimatedValue
          ? parseFloat(totalPatrimony._sum.estimatedValue.toString())
          : 0,
        totalQueryCosts: totalQueryCosts._sum.cost
          ? parseFloat(totalQueryCosts._sum.cost.toString())
          : 0,
        pendingAlerts,
        totalInvestigations,
        activeInvestigations,
        completedInPeriod,
      }
    }),

  // -------------------------------------------------------
  // 14) investigation.exportData — Export investigation data
  // -------------------------------------------------------
  exportData: protectedProcedure
    .input(
      z.object({
        investigationId: z.string(),
        format: z.enum(["json"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const investigation = await ctx.db.investigation.findUnique({
        where: { id: input.investigationId },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          creditCase: {
            select: { id: true, codigo: true, titulo: true },
          },
          case_: {
            select: { id: true, numero_processo: true },
          },
          project: {
            select: { id: true, titulo: true, codigo: true },
          },
          queries: {
            orderBy: { createdAt: "desc" },
          },
          assets: {
            orderBy: { estimatedValue: "desc" },
          },
          debts: {
            orderBy: { currentValue: "desc" },
          },
          lawsuits: {
            orderBy: { createdAt: "desc" },
          },
          corporateLinks: {
            orderBy: { createdAt: "desc" },
          },
          relatedPersons: {
            orderBy: { createdAt: "desc" },
          },
          alerts: {
            orderBy: { createdAt: "desc" },
          },
          reports: {
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigação não encontrada",
        })
      }

      // Build structured export
      const exportData = {
        exportedAt: new Date().toISOString(),
        format: input.format,
        investigation: {
          id: investigation.id,
          createdAt: investigation.createdAt,
          updatedAt: investigation.updatedAt,
          target: {
            name: investigation.targetName,
            document: investigation.targetDocument,
            type: investigation.targetType,
            email: investigation.targetEmail,
            phone: investigation.targetPhone,
          },
          status: investigation.status,
          priority: investigation.priority,
          depth: investigation.depth,
          riskScore: investigation.riskScore,
          riskClassification: investigation.riskClassification,
          aiSummary: investigation.aiSummary,
          totalEstimatedValue: investigation.totalEstimatedValue
            ? parseFloat(investigation.totalEstimatedValue.toString())
            : null,
          totalDebts: investigation.totalDebts
            ? parseFloat(investigation.totalDebts.toString())
            : null,
          autoMonitor: investigation.autoMonitor,
          monitorFrequency: investigation.monitorFrequency,
          lastFullScanAt: investigation.lastFullScanAt,
          notes: investigation.notes,
          cadastralData: investigation.cadastralData,
          corporateStructure: investigation.corporateStructure,
        },
        linkedEntities: {
          requestedBy: investigation.requestedBy,
          assignedTo: investigation.assignedTo,
          creditCase: investigation.creditCase,
          case: investigation.case_,
          project: investigation.project,
        },
        queries: investigation.queries.map((q) => ({
          id: q.id,
          createdAt: q.createdAt,
          provider: q.provider,
          endpoint: q.endpoint,
          queryType: q.queryType,
          status: q.status,
          responseTimeMs: q.responseTimeMs,
          cost: q.cost ? parseFloat(q.cost.toString()) : null,
          errorMessage: q.errorMessage,
          parsedData: q.parsedData,
        })),
        assets: investigation.assets.map((a) => ({
          id: a.id,
          createdAt: a.createdAt,
          category: a.category,
          subcategory: a.subcategory,
          description: a.description,
          registrationId: a.registrationId,
          location: a.location,
          state: a.state,
          city: a.city,
          estimatedValue: a.estimatedValue ? parseFloat(a.estimatedValue.toString()) : null,
          valuationMethod: a.valuationMethod,
          valuationDate: a.valuationDate,
          hasRestriction: a.hasRestriction,
          restrictionType: a.restrictionType,
          restrictionDetail: a.restrictionDetail,
          isSeizable: a.isSeizable,
          impenhorabilityReason: a.impenhorabilityReason,
          ownershipPercentage: a.ownershipPercentage
            ? parseFloat(a.ownershipPercentage.toString())
            : null,
          coOwners: a.coOwners,
          verified: a.verified,
          verifiedAt: a.verifiedAt,
          sourceProvider: a.sourceProvider,
        })),
        debts: investigation.debts.map((d) => ({
          id: d.id,
          createdAt: d.createdAt,
          debtType: d.debtType,
          creditor: d.creditor,
          creditorDocument: d.creditorDocument,
          originalValue: d.originalValue ? parseFloat(d.originalValue.toString()) : null,
          currentValue: d.currentValue ? parseFloat(d.currentValue.toString()) : null,
          inscriptionDate: d.inscriptionDate,
          dueDate: d.dueDate,
          description: d.description,
          caseNumber: d.caseNumber,
          status: d.status,
          origin: d.origin,
          sourceProvider: d.sourceProvider,
        })),
        lawsuits: investigation.lawsuits.map((l) => ({
          id: l.id,
          createdAt: l.createdAt,
          caseNumber: l.caseNumber,
          court: l.court,
          vara: l.vara,
          subject: l.subject,
          class: l.class_,
          role: l.role,
          otherParties: l.otherParties,
          estimatedValue: l.estimatedValue ? parseFloat(l.estimatedValue.toString()) : null,
          status: l.status,
          lastMovement: l.lastMovement,
          lastMovementDate: l.lastMovementDate,
          distributionDate: l.distributionDate,
          relevance: l.relevance,
          hasAssetFreeze: l.hasAssetFreeze,
          notes: l.notes,
          sourceProvider: l.sourceProvider,
        })),
        corporateLinks: investigation.corporateLinks.map((c) => ({
          id: c.id,
          createdAt: c.createdAt,
          companyName: c.companyName,
          companyCnpj: c.companyCnpj,
          companyStatus: c.companyStatus,
          cnae: c.cnae,
          openDate: c.openDate,
          role: c.role,
          sharePercentage: c.sharePercentage ? parseFloat(c.sharePercentage.toString()) : null,
          capitalValue: c.capitalValue ? parseFloat(c.capitalValue.toString()) : null,
          entryDate: c.entryDate,
          exitDate: c.exitDate,
          isOffshore: c.isOffshore,
          isRecentCreation: c.isRecentCreation,
          hasIrregularity: c.hasIrregularity,
          irregularityDesc: c.irregularityDesc,
          sourceProvider: c.sourceProvider,
        })),
        relatedPersons: investigation.relatedPersons.map((rp) => ({
          id: rp.id,
          createdAt: rp.createdAt,
          name: rp.name,
          document: rp.document,
          relationship: rp.relationship,
          shouldInvestigate: rp.shouldInvestigate,
          childInvestigationId: rp.childInvestigationId,
          riskFlag: rp.riskFlag,
          sourceProvider: rp.sourceProvider,
        })),
        alerts: investigation.alerts.map((al) => ({
          id: al.id,
          createdAt: al.createdAt,
          alertType: al.alertType,
          severity: al.severity,
          title: al.title,
          description: al.description,
          sourceProvider: al.sourceProvider,
          triggeredBy: al.triggeredBy,
          read: al.read,
          readAt: al.readAt,
          actionTaken: al.actionTaken,
          dismissed: al.dismissed,
        })),
        reports: investigation.reports.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          reportType: r.reportType,
          title: r.title,
          content: r.content,
          aiGenerated: r.aiGenerated,
          fileUrl: r.fileUrl,
          fileName: r.fileName,
        })),
      }

      return exportData
    }),
})
