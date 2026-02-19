/**
 * Investigation Orchestrator — Orchestrates multi-provider queries for an investigation.
 *
 * Manages depth-based provider selection, parallel query execution,
 * result persistence, and progress tracking.
 */

import { db } from "@/lib/db";
import { getRegistry } from "./provider-registry";
import type {
  ProviderResult,
  InvestigationProgress,
  DepthLevel,
  DepthProviderMap,
  ProviderQuery,
} from "./types";
import type { ApiProvider, QueryType } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════════════════════
// Depth map — which providers and query types each depth level uses
// ═══════════════════════════════════════════════════════════════════════════════

const DEPTH_MAP: Record<DepthLevel, DepthProviderMap> = {
  BASICA: {
    providers: ["BRASILAPI", "DATAJUD"],
    queryTypes: ["CONSULTA_CNPJ", "CONSULTA_CPF", "CONSULTA_PROCESSO"],
  },
  PADRAO: {
    providers: [
      "BRASILAPI",
      "DATAJUD",
      "CNPJA",
      "CVM_DADOS_ABERTOS",
      "BACEN",
      "OPENSANCTIONS",
    ],
    queryTypes: [
      "CONSULTA_CNPJ",
      "CONSULTA_CPF",
      "CONSULTA_PROCESSO",
      "CONSULTA_CVM",
      "CONSULTA_PEP_SANCOES",
      "CONSULTA_SOCIETARIA",
    ],
  },
  APROFUNDADA: {
    providers: [
      "BRASILAPI",
      "DATAJUD",
      "CNPJA",
      "CVM_DADOS_ABERTOS",
      "BACEN",
      "OPENSANCTIONS",
      "INFOSIMPLES",
      "ESCAVADOR",
      "ASSERTIVA",
    ],
    queryTypes: [
      "CONSULTA_CNPJ",
      "CONSULTA_CPF",
      "CONSULTA_PROCESSO",
      "CONSULTA_CVM",
      "CONSULTA_PEP_SANCOES",
      "CONSULTA_SOCIETARIA",
      "CONSULTA_IMOVEL",
      "CONSULTA_VEICULO",
      "CONSULTA_PROTESTO",
      "CONSULTA_DIVIDA_ATIVA",
    ],
  },
  COMPLETA: {
    providers: [
      "BRASILAPI",
      "DATAJUD",
      "CNPJA",
      "CVM_DADOS_ABERTOS",
      "BACEN",
      "OPENSANCTIONS",
      "INFOSIMPLES",
      "ESCAVADOR",
      "ASSERTIVA",
      "DENATRAN_SERPRO",
      "COMPLYADVANTAGE",
      "OPENCORPORATES",
      "MAPBIOMAS",
    ],
    queryTypes: [
      "CONSULTA_CNPJ",
      "CONSULTA_CPF",
      "CONSULTA_PROCESSO",
      "CONSULTA_CVM",
      "CONSULTA_PEP_SANCOES",
      "CONSULTA_SOCIETARIA",
      "CONSULTA_IMOVEL",
      "CONSULTA_VEICULO",
      "CONSULTA_PROTESTO",
      "CONSULTA_DIVIDA_ATIVA",
      "CONSULTA_RURAL",
      "CONSULTA_SATELITE",
      "CONSULTA_MARCAS",
      "CONSULTA_SCORING",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Query plan — determines which (provider, queryType) pairs to execute
// ═══════════════════════════════════════════════════════════════════════════════

interface PlannedQuery {
  provider: ApiProvider;
  queryType: QueryType;
}

/**
 * Builds the list of (provider, queryType) pairs to execute for a given depth.
 * Only includes pairs where the provider actually supports the query type.
 */
function buildQueryPlan(depth: DepthLevel): PlannedQuery[] {
  const depthConfig = DEPTH_MAP[depth];
  const registry = getRegistry();
  const plan: PlannedQuery[] = [];

  for (const providerName of depthConfig.providers) {
    const provider = registry.getProvider(providerName);
    if (!provider) continue;

    const available = provider.getAvailableQueries();
    for (const qt of depthConfig.queryTypes) {
      if (available.includes(qt)) {
        plan.push({ provider: providerName, queryType: qt });
      }
    }
  }

  return plan;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full scan execution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Runs a full investigation scan for the given investigation ID and depth level.
 *
 * 1. Loads the investigation from DB
 * 2. Builds a query plan based on the depth level
 * 3. Executes all queries in parallel (Promise.allSettled)
 * 4. Persists results: InvestigationQuery, DiscoveredAsset, DiscoveredDebt,
 *    DiscoveredLawsuit, CorporateLink records from normalized data
 * 5. Updates investigation status and totals
 * 6. Returns all results
 */
export async function runFullScan(
  investigationId: string,
  depth: DepthLevel,
): Promise<ProviderResult[]> {
  // 1. Load investigation
  const investigation = await db.investigation.findUniqueOrThrow({
    where: { id: investigationId },
  });

  // Mark as in progress
  await db.investigation.update({
    where: { id: investigationId },
    data: { status: "EM_ANDAMENTO" },
  });

  const registry = getRegistry();
  const plan = buildQueryPlan(depth);
  const startTime = Date.now();

  // 2. Build ProviderQuery objects
  const providerQueries: Array<{ planned: PlannedQuery; query: ProviderQuery }> =
    plan.map((planned) => ({
      planned,
      query: {
        type: planned.queryType,
        targetDocument: investigation.targetDocument,
        targetType: investigation.targetType as "PF" | "PJ",
      },
    }));

  // 3. Execute all queries in parallel
  const settled = await Promise.allSettled(
    providerQueries.map(async ({ planned, query }) => {
      const provider = registry.getProvider(planned.provider);
      if (!provider) {
        throw new Error(`Provider ${planned.provider} not found in registry`);
      }
      const result = await provider.execute(query);
      return { planned, result };
    }),
  );

  // 4. Process results and persist to DB
  const results: ProviderResult[] = [];

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      const { planned, result } = outcome.value;
      results.push(result);

      await persistQueryResult(investigationId, planned, result, investigation.requestedById);
    } else {
      // Promise.allSettled rejected — should not happen because provider.execute
      // always returns (falls back to mock), but handle defensively.
      const errorMsg = outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);

      console.error(
        `[Orchestrator] Unexpected rejection in query execution: ${errorMsg}`,
      );
    }
  }

  // 5. Update investigation status and totals
  await updateInvestigationTotals(investigationId, startTime);

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Persist a single query result to the database
// ═══════════════════════════════════════════════════════════════════════════════

async function persistQueryResult(
  investigationId: string,
  planned: PlannedQuery,
  result: ProviderResult,
  executedById: string,
): Promise<void> {
  try {
    // Create InvestigationQuery record
    const queryRecord = await db.investigationQuery.create({
      data: {
        investigationId,
        provider: planned.provider,
        endpoint: `${planned.provider}/${planned.queryType}`,
        queryType: planned.queryType,
        inputParams: { targetDocument: result.data } as any,
        rawResponse: (result.rawResponse ?? undefined) as any,
        parsedData: (result.data ?? undefined) as any,
        status: result.success
          ? (result.isMock ? "MOCK" : "CONCLUIDA")
          : "ERRO",
        errorMessage: result.errorMessage ?? null,
        responseTimeMs: result.responseTimeMs,
        cost: result.cost,
        legalBasis: "EXERCICIO_DIREITOS",
        retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        executedById,
      },
    });

    const sourceQueryId = queryRecord.id;

    // Persist normalized assets
    if (result.normalizedAssets && result.normalizedAssets.length > 0) {
      await db.discoveredAsset.createMany({
        data: result.normalizedAssets.map((asset): any => ({
          investigationId,
          category: asset.category,
          subcategory: asset.subcategory ?? null,
          description: asset.description,
          registrationId: asset.registrationId ?? null,
          location: asset.location ?? null,
          state: asset.state ?? null,
          city: asset.city ?? null,
          estimatedValue: asset.estimatedValue ?? null,
          valuationMethod: asset.valuationMethod ?? null,
          valuationDate: asset.valuationDate ?? null,
          hasRestriction: asset.hasRestriction,
          restrictionType: asset.restrictionType ?? null,
          restrictionDetail: asset.restrictionDetail ?? null,
          isSeizable: asset.isSeizable,
          impenhorabilityReason: asset.impenhorabilityReason ?? null,
          ownershipPercentage: asset.ownershipPercentage ?? null,
          coOwners: asset.coOwners ?? undefined,
          sourceProvider: asset.sourceProvider,
          sourceQueryId,
          rawSourceData: asset.rawSourceData as Record<string, unknown> | undefined,
          latitude: asset.latitude ?? null,
          longitude: asset.longitude ?? null,
          areaHectares: asset.areaHectares ?? null,
          carCode: asset.carCode ?? null,
        })),
      });
    }

    // Persist normalized debts
    if (result.normalizedDebts && result.normalizedDebts.length > 0) {
      await db.discoveredDebt.createMany({
        data: result.normalizedDebts.map((debt): any => ({
          investigationId,
          debtType: debt.debtType,
          creditor: debt.creditor,
          creditorDocument: debt.creditorDocument ?? null,
          originalValue: debt.originalValue ?? null,
          currentValue: debt.currentValue ?? null,
          inscriptionDate: debt.inscriptionDate ?? null,
          dueDate: debt.dueDate ?? null,
          description: debt.description ?? null,
          caseNumber: debt.caseNumber ?? null,
          status: debt.status ?? null,
          origin: debt.origin ?? null,
          sourceProvider: debt.sourceProvider,
          rawSourceData: debt.rawSourceData as Record<string, unknown> | undefined,
        })),
      });
    }

    // Persist normalized lawsuits
    if (result.normalizedLawsuits && result.normalizedLawsuits.length > 0) {
      await db.discoveredLawsuit.createMany({
        data: result.normalizedLawsuits.map((lawsuit): any => ({
          investigationId,
          caseNumber: lawsuit.caseNumber,
          court: lawsuit.court,
          vara: lawsuit.vara ?? null,
          subject: lawsuit.subject ?? null,
          class_: lawsuit.class_ ?? null,
          role: lawsuit.role,
          otherParties: lawsuit.otherParties ?? undefined,
          estimatedValue: lawsuit.estimatedValue ?? null,
          status: lawsuit.status ?? null,
          lastMovement: lawsuit.lastMovement ?? null,
          lastMovementDate: lawsuit.lastMovementDate ?? null,
          distributionDate: lawsuit.distributionDate ?? null,
          relevance: lawsuit.relevance,
          hasAssetFreeze: lawsuit.hasAssetFreeze,
          notes: lawsuit.notes ?? null,
          sourceProvider: lawsuit.sourceProvider,
          rawSourceData: lawsuit.rawSourceData as Record<string, unknown> | undefined,
        })),
      });
    }

    // Persist normalized corporate links
    if (result.normalizedCorporateLinks && result.normalizedCorporateLinks.length > 0) {
      await db.corporateLink.createMany({
        data: result.normalizedCorporateLinks.map((link): any => ({
          investigationId,
          companyName: link.companyName,
          companyCnpj: link.companyCnpj,
          companyStatus: link.companyStatus ?? null,
          cnae: link.cnae ?? null,
          openDate: link.openDate ?? null,
          role: link.role,
          sharePercentage: link.sharePercentage ?? null,
          capitalValue: link.capitalValue ?? null,
          entryDate: link.entryDate ?? null,
          exitDate: link.exitDate ?? null,
          isOffshore: link.isOffshore,
          isRecentCreation: link.isRecentCreation,
          hasIrregularity: link.hasIrregularity,
          irregularityDesc: link.irregularityDesc ?? null,
          sourceProvider: link.sourceProvider,
          rawSourceData: link.rawSourceData as Record<string, unknown> | undefined,
        })),
      });
    }
  } catch (error) {
    console.error(
      `[Orchestrator] Failed to persist result for ${planned.provider}/${planned.queryType}:`,
      error,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update investigation totals after scan
// ═══════════════════════════════════════════════════════════════════════════════

async function updateInvestigationTotals(
  investigationId: string,
  startTime: number,
): Promise<void> {
  try {
    // Aggregate asset values
    const assetAgg = await db.discoveredAsset.aggregate({
      where: { investigationId },
      _sum: { estimatedValue: true },
    });

    // Aggregate debt values
    const debtAgg = await db.discoveredDebt.aggregate({
      where: { investigationId },
      _sum: { currentValue: true },
    });

    // Count queries by status
    const queryStats = await db.investigationQuery.groupBy({
      by: ["status"],
      where: { investigationId },
      _count: true,
    });

    const failedCount = queryStats
      .filter((s) => s.status === "ERRO" || s.status === "TIMEOUT")
      .reduce((sum, s) => sum + s._count, 0);

    const totalCount = queryStats.reduce((sum, s) => sum + s._count, 0);

    // Determine final status
    const allFailed = failedCount === totalCount && totalCount > 0;
    const status = allFailed ? "EM_ANDAMENTO" : "CONSULTAS_CONCLUIDAS";

    const totalEstimated = assetAgg._sum.estimatedValue
      ? Number(assetAgg._sum.estimatedValue)
      : null;

    const totalDebts = debtAgg._sum.currentValue
      ? Number(debtAgg._sum.currentValue)
      : null;

    await db.investigation.update({
      where: { id: investigationId },
      data: {
        status,
        totalEstimatedValue: totalEstimated,
        totalDebts,
        lastFullScanAt: new Date(),
      },
    });

    const elapsed = Date.now() - startTime;
    console.info(
      `[Orchestrator] Investigation ${investigationId} scan completed in ${elapsed}ms ` +
      `(${totalCount} queries, ${failedCount} failed)`,
    );
  } catch (error) {
    console.error(
      `[Orchestrator] Failed to update investigation totals for ${investigationId}:`,
      error,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Progress tracking
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the current progress of an investigation scan.
 * Counts completed, failed, and total queries.
 */
export async function getProgress(
  investigationId: string,
): Promise<InvestigationProgress> {
  const investigation = await db.investigation.findUniqueOrThrow({
    where: { id: investigationId },
    select: {
      id: true,
      status: true,
      depth: true,
      createdAt: true,
    },
  });

  const queryStats = await db.investigationQuery.groupBy({
    by: ["status"],
    where: { investigationId },
    _count: true,
  });

  const completedQueries = queryStats
    .filter((s) => s.status === "CONCLUIDA" || s.status === "MOCK" || s.status === "SEM_DADOS")
    .reduce((sum, s) => sum + s._count, 0);

  const failedQueries = queryStats
    .filter((s) => s.status === "ERRO" || s.status === "TIMEOUT")
    .reduce((sum, s) => sum + s._count, 0);

  const runningQueries = queryStats
    .filter((s) => s.status === "EXECUTANDO" || s.status === "PENDENTE")
    .reduce((sum, s) => sum + s._count, 0);

  const totalQueries = queryStats.reduce((sum, s) => sum + s._count, 0);

  // Determine progress status
  let progressStatus: InvestigationProgress["status"];
  if (runningQueries > 0) {
    progressStatus = "RUNNING";
  } else if (failedQueries === totalQueries && totalQueries > 0) {
    progressStatus = "FAILED";
  } else if (failedQueries > 0) {
    progressStatus = "PARTIAL";
  } else {
    progressStatus = "COMPLETED";
  }

  // Estimate completion based on depth
  const depth = investigation.depth as DepthLevel;
  const plan = buildQueryPlan(depth);
  const expectedTotal = plan.length;
  const elapsedMs = Date.now() - investigation.createdAt.getTime();
  const estimatedCompletionMs =
    completedQueries > 0
      ? Math.round((elapsedMs / completedQueries) * (expectedTotal - completedQueries))
      : undefined;

  return {
    investigationId,
    totalQueries: Math.max(totalQueries, expectedTotal),
    completedQueries,
    failedQueries,
    status: progressStatus,
    startedAt: investigation.createdAt,
    estimatedCompletionMs,
  };
}

/** Re-export the depth map for use by other modules */
export { DEPTH_MAP };
