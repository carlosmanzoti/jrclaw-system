/**
 * Query Orchestrator — The brain of the investigation system.
 *
 * Determines which queries to run based on investigation depth,
 * executes them in parallel (respecting rate limits), normalizes results,
 * saves to DB, and triggers AI analysis.
 *
 * DEPTH MAPPING:
 *   BASICA      = BrasilAPI + DataJud
 *   PADRAO      = + InfoSimples + CENPROT + PGFN
 *   APROFUNDADA = + Escavador + CVM + MapBiomas
 *   COMPLETA    = + ComplyAdvantage + OpenCorporates
 */

import type {
  ApiProvider,
  QueryType,
  InvestigationDepth,
  LgpdLegalBasis,
} from "@prisma/client";

import { db } from "@/lib/db";

import type {
  ProviderQuery,
  ProviderResult,
  NormalizedAsset,
  NormalizedDebt,
  NormalizedLawsuit,
  NormalizedCorporateLink,
  InvestigationProgress,
  DepthProviderMap,
} from "./types";

import { getRegistry } from "./provider-registry";
import { trackCost } from "./cost-tracker";
import { LgpdLogger } from "./lgpd-logger";
import { analyzeInvestigation } from "./ai-analyzer";

// ═══════════════════════════════════════════════════════════════════════════════
// Depth -> Provider mapping
// ═══════════════════════════════════════════════════════════════════════════════

const DEPTH_PROVIDER_MAP: Record<InvestigationDepth, DepthProviderMap> = {
  BASICA: {
    providers: ["BRASILAPI", "DATAJUD"],
    queryTypes: ["CONSULTA_CNPJ", "CONSULTA_CPF", "CONSULTA_PROCESSO"],
  },
  PADRAO: {
    providers: ["BRASILAPI", "DATAJUD", "INFOSIMPLES", "CENPROT", "PGFN"],
    queryTypes: [
      "CONSULTA_CNPJ", "CONSULTA_CPF", "CONSULTA_PROCESSO",
      "CONSULTA_VEICULO", "CONSULTA_IMOVEL", "CONSULTA_PROTESTO",
      "CONSULTA_DIVIDA_ATIVA",
    ],
  },
  APROFUNDADA: {
    providers: [
      "BRASILAPI", "DATAJUD", "INFOSIMPLES", "CENPROT", "PGFN",
      "ESCAVADOR", "CVM_DADOS_ABERTOS", "MAPBIOMAS",
    ],
    queryTypes: [
      "CONSULTA_CNPJ", "CONSULTA_CPF", "CONSULTA_PROCESSO",
      "CONSULTA_VEICULO", "CONSULTA_IMOVEL", "CONSULTA_PROTESTO",
      "CONSULTA_DIVIDA_ATIVA", "CONSULTA_CVM", "CONSULTA_SATELITE",
      "CONSULTA_RURAL",
    ],
  },
  COMPLETA: {
    providers: [
      "BRASILAPI", "DATAJUD", "INFOSIMPLES", "CENPROT", "PGFN",
      "ESCAVADOR", "CVM_DADOS_ABERTOS", "MAPBIOMAS",
      "COMPLYADVANTAGE", "OPENCORPORATES",
    ],
    queryTypes: [
      "CONSULTA_CNPJ", "CONSULTA_CPF", "CONSULTA_PROCESSO",
      "CONSULTA_VEICULO", "CONSULTA_IMOVEL", "CONSULTA_PROTESTO",
      "CONSULTA_DIVIDA_ATIVA", "CONSULTA_CVM", "CONSULTA_SATELITE",
      "CONSULTA_RURAL", "CONSULTA_PEP_SANCOES", "CONSULTA_SOCIETARIA",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QueryOrchestrator
// ═══════════════════════════════════════════════════════════════════════════════

export class QueryOrchestrator {
  /**
   * Execute a full investigation at the given depth.
   *
   * Steps:
   * 1. Load investigation from DB
   * 2. Determine queries based on depth
   * 3. Execute queries in parallel (respecting rate limits)
   * 4. Normalize and save results to DB
   * 5. Trigger AI analysis
   * 6. Update investigation status
   */
  static async executeFullInvestigation(
    investigationId: string,
    depth: InvestigationDepth,
    userId: string,
    legalBasis: LgpdLegalBasis = "PROTECAO_CREDITO",
  ): Promise<InvestigationProgress> {
    const startTime = Date.now();

    // 1. Load investigation
    const investigation = await db.investigation.findUnique({
      where: { id: investigationId },
    });

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    // Update status to EM_ANDAMENTO
    await db.investigation.update({
      where: { id: investigationId },
      data: { status: "EM_ANDAMENTO", depth },
    });

    const depthMap = DEPTH_PROVIDER_MAP[depth];
    const registry = getRegistry();

    // 2. Determine which (provider, queryType) pairs to execute
    const queryPlan = QueryOrchestrator.buildQueryPlan(
      depthMap,
      investigation.targetDocument,
      investigation.targetType as "PF" | "PJ",
      registry,
    );

    const progress: InvestigationProgress = {
      investigationId,
      totalQueries: queryPlan.length,
      completedQueries: 0,
      failedQueries: 0,
      status: "RUNNING",
      startedAt: new Date(),
    };

    // 3. Execute queries in parallel batches (max 5 concurrent to respect rate limits)
    const BATCH_SIZE = 5;
    const allResults: Array<{
      result: ProviderResult;
      queryId: string;
      provider: ApiProvider;
      queryType: QueryType;
    }> = [];

    for (let i = 0; i < queryPlan.length; i += BATCH_SIZE) {
      const batch = queryPlan.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (plan) => {
          const provider = registry.getProvider(plan.providerName);
          if (!provider) {
            throw new Error(`Provider ${plan.providerName} not found in registry`);
          }

          // Create InvestigationQuery record
          const queryRecord = await db.investigationQuery.create({
            data: {
              investigationId,
              provider: plan.providerName,
              endpoint: plan.queryType,
              queryType: plan.queryType,
              inputParams: {
                targetDocument: investigation.targetDocument,
                targetType: investigation.targetType,
                params: plan.params,
              } as any,
              status: "EXECUTANDO",
              legalBasis,
              executedById: userId,
            },
          });

          progress.currentProvider = plan.providerName;

          try {
            // Execute the query
            const result = await provider.execute(plan.query);

            // Track cost
            if (result.cost > 0) {
              await trackCost(plan.providerName, result.cost);
            }

            // Update query record
            await db.investigationQuery.update({
              where: { id: queryRecord.id },
              data: {
                status: result.success
                  ? (result.isMock ? "MOCK" : "CONCLUIDA")
                  : "ERRO",
                rawResponse: result.rawResponse as any,
                parsedData: result.data as any,
                responseTimeMs: result.responseTimeMs,
                cost: result.cost,
                errorMessage: result.errorMessage,
              },
            });

            // LGPD log
            await LgpdLogger.logQuery(
              {
                queryType: plan.queryType,
                provider: plan.providerName,
                targetDocument: investigation.targetDocument,
                investigationQueryId: queryRecord.id,
              },
              result,
              userId,
              legalBasis,
            );

            return {
              result,
              queryId: queryRecord.id,
              provider: plan.providerName,
              queryType: plan.queryType,
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);

            await db.investigationQuery.update({
              where: { id: queryRecord.id },
              data: {
                status: "ERRO",
                errorMessage: message,
              },
            });

            throw err;
          }
        }),
      );

      // Process batch results
      for (const settled of batchResults) {
        if (settled.status === "fulfilled") {
          allResults.push(settled.value);
          progress.completedQueries++;
        } else {
          progress.failedQueries++;
          console.error("[Orchestrator] Query failed:", settled.reason);
        }
      }
    }

    // 4. Normalize and save results to DB
    await QueryOrchestrator.saveNormalizedResults(investigationId, allResults);

    // 5. Update investigation status and trigger AI analysis
    const allSuccessful = progress.failedQueries === 0;
    await db.investigation.update({
      where: { id: investigationId },
      data: {
        status: "CONSULTAS_CONCLUIDAS",
        lastFullScanAt: new Date(),
      },
    });

    // Trigger AI analysis (fire-and-forget, updates status to ANALISE_IA -> CONCLUIDA)
    QueryOrchestrator.triggerAiAnalysis(investigationId, userId).catch((err) => {
      console.error("[Orchestrator] AI analysis failed:", err);
    });

    // LGPD: log the full investigation
    await LgpdLogger.logInvestigation(
      investigationId,
      userId,
      investigation.targetDocument,
      progress.completedQueries,
      legalBasis,
    );

    progress.status = allSuccessful ? "COMPLETED" : "PARTIAL";
    progress.estimatedCompletionMs = Date.now() - startTime;

    return progress;
  }

  /**
   * Execute a single query against a specific provider.
   */
  static async executeSingleQuery(
    investigationId: string,
    providerName: ApiProvider,
    queryType: QueryType,
    userId: string,
    legalBasis: LgpdLegalBasis = "PROTECAO_CREDITO",
    params?: Record<string, unknown>,
  ): Promise<ProviderResult> {
    const investigation = await db.investigation.findUnique({
      where: { id: investigationId },
    });

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    const registry = getRegistry();
    const provider = registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found in registry`);
    }

    const query: ProviderQuery = {
      type: queryType,
      targetDocument: investigation.targetDocument,
      targetType: investigation.targetType as "PF" | "PJ",
      params,
    };

    // Create query record
    const queryRecord = await db.investigationQuery.create({
      data: {
        investigationId,
        provider: providerName,
        endpoint: queryType,
        queryType,
        inputParams: {
          targetDocument: investigation.targetDocument,
          targetType: investigation.targetType,
          params,
        } as any,
        status: "EXECUTANDO",
        legalBasis,
        executedById: userId,
      },
    });

    try {
      const result = await provider.execute(query);

      // Track cost
      if (result.cost > 0) {
        await trackCost(providerName, result.cost);
      }

      // Update query record
      await db.investigationQuery.update({
        where: { id: queryRecord.id },
        data: {
          status: result.success ? (result.isMock ? "MOCK" : "CONCLUIDA") : "ERRO",
          rawResponse: result.rawResponse as any,
          parsedData: result.data as any,
          responseTimeMs: result.responseTimeMs,
          cost: result.cost,
          errorMessage: result.errorMessage,
        },
      });

      // Save normalized results
      await QueryOrchestrator.saveNormalizedResults(investigationId, [
        { result, queryId: queryRecord.id, provider: providerName, queryType },
      ]);

      // LGPD log
      await LgpdLogger.logQuery(
        {
          queryType,
          provider: providerName,
          targetDocument: investigation.targetDocument,
          investigationQueryId: queryRecord.id,
        },
        result,
        userId,
        legalBasis,
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await db.investigationQuery.update({
        where: { id: queryRecord.id },
        data: {
          status: "ERRO",
          errorMessage: message,
        },
      });

      throw err;
    }
  }

  /**
   * Retry all failed queries for an investigation.
   */
  static async retryFailedQueries(
    investigationId: string,
    userId: string,
    legalBasis: LgpdLegalBasis = "PROTECAO_CREDITO",
  ): Promise<InvestigationProgress> {
    const failedQueries = await db.investigationQuery.findMany({
      where: {
        investigationId,
        status: { in: ["ERRO", "TIMEOUT"] },
      },
    });

    if (failedQueries.length === 0) {
      return {
        investigationId,
        totalQueries: 0,
        completedQueries: 0,
        failedQueries: 0,
        status: "COMPLETED",
        startedAt: new Date(),
      };
    }

    const investigation = await db.investigation.findUnique({
      where: { id: investigationId },
    });

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    const registry = getRegistry();
    const progress: InvestigationProgress = {
      investigationId,
      totalQueries: failedQueries.length,
      completedQueries: 0,
      failedQueries: 0,
      status: "RUNNING",
      startedAt: new Date(),
    };

    for (const fq of failedQueries) {
      const provider = registry.getProvider(fq.provider);
      if (!provider) {
        progress.failedQueries++;
        continue;
      }

      const query: ProviderQuery = {
        type: fq.queryType,
        targetDocument: investigation.targetDocument,
        targetType: investigation.targetType as "PF" | "PJ",
        params: (fq.inputParams as Record<string, unknown>)?.params as Record<string, unknown> | undefined,
      };

      try {
        const result = await provider.execute(query);

        if (result.cost > 0) {
          await trackCost(fq.provider, result.cost);
        }

        await db.investigationQuery.update({
          where: { id: fq.id },
          data: {
            status: result.success ? (result.isMock ? "MOCK" : "CONCLUIDA") : "ERRO",
            rawResponse: result.rawResponse as any,
            parsedData: result.data as any,
            responseTimeMs: result.responseTimeMs,
            cost: result.cost,
            errorMessage: result.errorMessage,
          },
        });

        await QueryOrchestrator.saveNormalizedResults(investigationId, [
          { result, queryId: fq.id, provider: fq.provider, queryType: fq.queryType },
        ]);

        await LgpdLogger.logQuery(
          {
            queryType: fq.queryType,
            provider: fq.provider,
            targetDocument: investigation.targetDocument,
            investigationQueryId: fq.id,
          },
          result,
          userId,
          legalBasis,
        );

        progress.completedQueries++;
      } catch {
        progress.failedQueries++;
      }
    }

    progress.status = progress.failedQueries === 0 ? "COMPLETED" : "PARTIAL";
    return progress;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Build the list of (provider, queryType, query) tuples to execute.
   */
  private static buildQueryPlan(
    depthMap: DepthProviderMap,
    targetDocument: string,
    targetType: "PF" | "PJ",
    registry: ReturnType<typeof getRegistry>,
  ): Array<{
    providerName: ApiProvider;
    queryType: QueryType;
    query: ProviderQuery;
    params?: Record<string, unknown>;
  }> {
    const plan: Array<{
      providerName: ApiProvider;
      queryType: QueryType;
      query: ProviderQuery;
      params?: Record<string, unknown>;
    }> = [];

    // Deduplicate: for each queryType, pick the best provider (first match in depth list)
    const assignedTypes = new Set<string>();

    for (const providerName of depthMap.providers) {
      const provider = registry.getProvider(providerName);
      if (!provider) continue;

      const queryTypes = provider.getAvailableQueries();

      for (const qt of queryTypes) {
        // Only include query types that are in the depth's allowed list
        if (!depthMap.queryTypes.includes(qt)) continue;

        // Skip if this query type is already assigned to a provider
        // (except CONSULTA_PROCESSO which benefits from multiple sources)
        const key = `${qt}`;
        if (assignedTypes.has(key) && qt !== "CONSULTA_PROCESSO") continue;

        // Skip CPF queries for PJ targets and vice versa
        if (qt === "CONSULTA_CPF" && targetType === "PJ") continue;
        if (qt === "CONSULTA_CNPJ" && targetType === "PF") continue;

        assignedTypes.add(key);

        const query: ProviderQuery = {
          type: qt,
          targetDocument,
          targetType,
        };

        plan.push({
          providerName,
          queryType: qt,
          query,
        });
      }
    }

    return plan;
  }

  /**
   * Save normalized assets, debts, lawsuits, and corporate links to DB.
   */
  private static async saveNormalizedResults(
    investigationId: string,
    results: Array<{
      result: ProviderResult;
      queryId: string;
      provider: ApiProvider;
      queryType: QueryType;
    }>,
  ): Promise<void> {
    for (const { result, queryId } of results) {
      if (!result.success) continue;

      try {
        // Save assets
        if (result.normalizedAssets && result.normalizedAssets.length > 0) {
          await db.discoveredAsset.createMany({
            data: result.normalizedAssets.map((a: NormalizedAsset) => ({
              investigationId,
              category: a.category,
              subcategory: a.subcategory,
              description: a.description,
              registrationId: a.registrationId,
              location: a.location,
              state: a.state,
              city: a.city,
              estimatedValue: a.estimatedValue,
              valuationMethod: a.valuationMethod,
              valuationDate: a.valuationDate,
              hasRestriction: a.hasRestriction,
              restrictionType: a.restrictionType,
              restrictionDetail: a.restrictionDetail,
              isSeizable: a.isSeizable,
              impenhorabilityReason: a.impenhorabilityReason,
              ownershipPercentage: a.ownershipPercentage,
              coOwners: a.coOwners as any,
              sourceProvider: a.sourceProvider,
              sourceQueryId: queryId,
              rawSourceData: a.rawSourceData as any,
              latitude: a.latitude,
              longitude: a.longitude,
              areaHectares: a.areaHectares,
              carCode: a.carCode,
            })),
            skipDuplicates: true,
          });
        }

        // Save debts
        if (result.normalizedDebts && result.normalizedDebts.length > 0) {
          await db.discoveredDebt.createMany({
            data: result.normalizedDebts.map((d: NormalizedDebt) => ({
              investigationId,
              debtType: d.debtType,
              creditor: d.creditor,
              creditorDocument: d.creditorDocument,
              originalValue: d.originalValue,
              currentValue: d.currentValue,
              inscriptionDate: d.inscriptionDate,
              dueDate: d.dueDate,
              description: d.description,
              caseNumber: d.caseNumber,
              status: d.status,
              origin: d.origin,
              sourceProvider: d.sourceProvider,
              rawSourceData: d.rawSourceData as any,
            })),
            skipDuplicates: true,
          });
        }

        // Save lawsuits
        if (result.normalizedLawsuits && result.normalizedLawsuits.length > 0) {
          await db.discoveredLawsuit.createMany({
            data: result.normalizedLawsuits.map((l: NormalizedLawsuit) => ({
              investigationId,
              caseNumber: l.caseNumber,
              court: l.court,
              vara: l.vara,
              subject: l.subject,
              class_: l.class_,
              role: l.role,
              otherParties: l.otherParties as any,
              estimatedValue: l.estimatedValue,
              status: l.status,
              lastMovement: l.lastMovement,
              lastMovementDate: l.lastMovementDate,
              distributionDate: l.distributionDate,
              relevance: l.relevance,
              hasAssetFreeze: l.hasAssetFreeze,
              notes: l.notes,
              sourceProvider: l.sourceProvider,
              rawSourceData: l.rawSourceData as any,
            })),
            skipDuplicates: true,
          });
        }

        // Save corporate links
        if (result.normalizedCorporateLinks && result.normalizedCorporateLinks.length > 0) {
          await db.corporateLink.createMany({
            data: result.normalizedCorporateLinks.map((c: NormalizedCorporateLink) => ({
              investigationId,
              companyName: c.companyName,
              companyCnpj: c.companyCnpj,
              companyStatus: c.companyStatus,
              cnae: c.cnae,
              openDate: c.openDate,
              role: c.role,
              sharePercentage: c.sharePercentage,
              capitalValue: c.capitalValue,
              entryDate: c.entryDate,
              exitDate: c.exitDate,
              isOffshore: c.isOffshore,
              isRecentCreation: c.isRecentCreation,
              hasIrregularity: c.hasIrregularity,
              irregularityDesc: c.irregularityDesc,
              sourceProvider: c.sourceProvider,
              rawSourceData: c.rawSourceData as any,
            })),
            skipDuplicates: true,
          });
        }
      } catch (err) {
        console.error(
          `[Orchestrator] Failed to save normalized results for query ${queryId}:`,
          err,
        );
      }
    }

    // Update total estimated value on the investigation
    await QueryOrchestrator.updateInvestigationTotals(investigationId);
  }

  /**
   * Recalculate and update the total estimated value and total debts.
   */
  private static async updateInvestigationTotals(
    investigationId: string,
  ): Promise<void> {
    try {
      const [assetSum, debtSum] = await Promise.all([
        db.discoveredAsset.aggregate({
          where: { investigationId },
          _sum: { estimatedValue: true },
        }),
        db.discoveredDebt.aggregate({
          where: { investigationId },
          _sum: { currentValue: true },
        }),
      ]);

      await db.investigation.update({
        where: { id: investigationId },
        data: {
          totalEstimatedValue: assetSum._sum.estimatedValue ?? 0,
          totalDebts: debtSum._sum.currentValue ?? 0,
        },
      });
    } catch (err) {
      console.error("[Orchestrator] Failed to update investigation totals:", err);
    }
  }

  /**
   * Trigger AI analysis in the background.
   */
  private static async triggerAiAnalysis(
    investigationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await db.investigation.update({
        where: { id: investigationId },
        data: { status: "ANALISE_IA" },
      });

      const analysis = await analyzeInvestigation(investigationId);

      await db.investigation.update({
        where: { id: investigationId },
        data: {
          status: "CONCLUIDA",
          riskScore: analysis.riskScore,
          riskClassification: analysis.riskClassification,
          aiSummary: analysis.executiveSummary,
        },
      });

      // Create investigation report
      await db.investigationReport.create({
        data: {
          investigationId,
          reportType: "DOSSIE_COMPLETO",
          title: "Dossie Patrimonial - Analise IA",
          content: JSON.stringify(analysis),
          aiGenerated: true,
          generatedById: userId,
        },
      });
    } catch (err) {
      console.error("[Orchestrator] AI analysis failed:", err);

      await db.investigation.update({
        where: { id: investigationId },
        data: {
          status: "CONSULTAS_CONCLUIDAS",
          notes: `AI analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      });
    }
  }
}
