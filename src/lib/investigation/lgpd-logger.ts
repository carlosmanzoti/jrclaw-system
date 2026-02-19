/**
 * LGPD Logger — LGPD compliance audit logging for investigation queries.
 *
 * Every external data query must be logged with:
 * - Who requested it (userId)
 * - Why (legalBasis: EXERCICIO_DIREITOS, PROTECAO_CREDITO, etc.)
 * - What was queried (provider, queryType, targetDocument)
 * - Result status and timing
 * - Retention period (5 years judicial, 2 years cadastral)
 *
 * Uses the existing audit.ts utility for the underlying audit log entry.
 * Supports LGPD Art. 18 (data subject access) and Art. 16 (data deletion).
 */

import { Prisma } from "@prisma/client";
import type { ApiProvider, QueryType, QueryStatus, LgpdLegalBasis } from "@prisma/client";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { ProviderResult, LgpdQueryLog } from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// Retention Policies
// ═══════════════════════════════════════════════════════════════════════════════

/** Default retention periods in years by query category */
const RETENTION_YEARS: Record<string, number> = {
  // Judicial queries: 5 years (Art. 206, CC + LGPD Art. 16, IV)
  CONSULTA_PROCESSO: 5,
  CONSULTA_DIVIDA_ATIVA: 5,
  CONSULTA_PEP_SANCOES: 5,
  CONSULTA_PROTESTO: 5,

  // Cadastral queries: 2 years
  CONSULTA_CPF: 2,
  CONSULTA_CNPJ: 2,
  CONSULTA_VEICULO: 2,
  CONSULTA_IMOVEL: 2,
  CONSULTA_SCORING: 2,
  CONSULTA_SOCIETARIA: 2,
  CONSULTA_CVM: 2,
  CONSULTA_SATELITE: 2,
  CONSULTA_RURAL: 2,
  CONSULTA_MARCAS: 2,
  MONITORAMENTO: 2,
};

/**
 * Computes the retention expiry date based on query type.
 */
export function computeRetentionDate(queryType: QueryType): Date {
  const years = RETENTION_YEARS[queryType] ?? 2;
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LgpdLogger — class with static methods (used by orchestrator)
// ═══════════════════════════════════════════════════════════════════════════════

export class LgpdLogger {
  /**
   * Log a query execution for LGPD compliance.
   *
   * This method:
   * 1. Writes a record to the audit log via the existing audit utility
   * 2. Updates the InvestigationQuery record with retention date and legal basis
   *
   * Follows fire-and-forget pattern so it never blocks business logic.
   */
  static async logQuery(
    query: {
      queryType: QueryType;
      provider: ApiProvider;
      targetDocument: string;
      investigationQueryId?: string;
    },
    result: ProviderResult,
    userId: string,
    legalBasis: LgpdLegalBasis = "EXERCICIO_DIREITOS",
    ip?: string,
  ): Promise<void> {
    const retentionUntil = computeRetentionDate(query.queryType);

    // 1. Write to audit log (fire-and-forget via audit utility)
    audit({
      userId,
      action: "READ",
      resource: "investigation_query",
      resourceId: query.investigationQueryId,
      description: `LGPD: ${query.queryType} via ${query.provider} para documento ${maskDocument(query.targetDocument)}`,
      metadata: {
        lgpd: true,
        queryType: query.queryType,
        provider: query.provider,
        targetDocumentHash: hashDocument(query.targetDocument),
        legalBasis,
        resultStatus: result.success ? "CONCLUIDA" : "ERRO",
        isMock: result.isMock,
        responseTimeMs: result.responseTimeMs,
        cost: result.cost,
        retentionUntil: retentionUntil.toISOString(),
        ip,
      },
      success: result.success,
      error: result.errorMessage,
    });

    // 2. Update InvestigationQuery record with LGPD metadata
    if (query.investigationQueryId) {
      try {
        await db.investigationQuery.update({
          where: { id: query.investigationQueryId },
          data: {
            legalBasis,
            retentionUntil,
          },
        });
      } catch (err) {
        console.error("[LgpdLogger] Failed to update query LGPD metadata:", err);
      }
    }
  }

  /**
   * Log a bulk investigation execution (for the full investigation orchestration).
   */
  static async logInvestigation(
    investigationId: string,
    userId: string,
    targetDocument: string,
    queriesExecuted: number,
    legalBasis: LgpdLegalBasis = "PROTECAO_CREDITO",
    ip?: string,
  ): Promise<void> {
    audit({
      userId,
      action: "READ",
      resource: "investigation",
      resourceId: investigationId,
      description: `LGPD: Investigacao patrimonial completa para ${maskDocument(targetDocument)} - ${queriesExecuted} consultas executadas`,
      metadata: {
        lgpd: true,
        investigationId,
        targetDocumentHash: hashDocument(targetDocument),
        legalBasis,
        queriesExecuted,
        ip,
      },
      success: true,
    });
  }

  /**
   * Log when investigation data is accessed (read/viewed).
   */
  static async logDataAccess(
    investigationId: string,
    userId: string,
    accessType: "VIEW" | "EXPORT" | "SHARE",
    details?: string,
  ): Promise<void> {
    audit({
      userId,
      action: accessType === "EXPORT" ? "EXPORT" : "READ",
      resource: "investigation",
      resourceId: investigationId,
      description: `LGPD: ${accessType} de dados de investigacao ${investigationId}${details ? ` - ${details}` : ""}`,
      metadata: {
        lgpd: true,
        accessType,
        investigationId,
      },
      success: true,
    });
  }

  /**
   * Log data deletion (when retention period expires).
   */
  static async logDataDeletion(
    investigationId: string,
    userId: string,
    reason: "RETENTION_EXPIRED" | "USER_REQUEST" | "ADMIN_ORDER",
    recordsDeleted: number,
  ): Promise<void> {
    audit({
      userId,
      action: "DELETE",
      resource: "investigation",
      resourceId: investigationId,
      description: `LGPD: Exclusao de dados de investigacao ${investigationId} - motivo: ${reason} - ${recordsDeleted} registros removidos`,
      metadata: {
        lgpd: true,
        reason,
        recordsDeleted,
        investigationId,
      },
      success: true,
    });
  }

  // ─── LGPD Art. 18 — Data subject access ────────────────────────────────────

  /**
   * Returns all queries made for a specific document (CPF or CNPJ).
   * Fulfills LGPD Art. 18 (data subject right to know what data was processed).
   */
  static async getQueryLog(
    targetDocument: string,
  ): Promise<Array<{
    id: string;
    createdAt: Date;
    provider: string;
    queryType: string;
    status: string;
    legalBasis: string;
    retentionUntil: Date | null;
    executedById: string;
  }>> {
    const investigations = await db.investigation.findMany({
      where: { targetDocument },
      select: { id: true },
    });

    if (investigations.length === 0) return [];

    const investigationIds = investigations.map((inv) => inv.id);

    return db.investigationQuery.findMany({
      where: { investigationId: { in: investigationIds } },
      select: {
        id: true,
        createdAt: true,
        provider: true,
        queryType: true,
        status: true,
        legalBasis: true,
        retentionUntil: true,
        executedById: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── LGPD Art. 16 — Data deletion / retention expiry ──────────────────────

  /**
   * Purges raw data from InvestigationQuery records whose retention has expired.
   * Returns the number of records purged.
   */
  static async purgeExpiredData(): Promise<number> {
    const now = new Date();

    try {
      const result = await db.investigationQuery.updateMany({
        where: {
          retentionUntil: { not: null, lte: now },
        },
        data: {
          rawResponse: Prisma.DbNull,
          parsedData: Prisma.DbNull,
          errorMessage: null,
        },
      });

      if (result.count > 0) {
        console.info(
          `[LgpdLogger] Purged PII from ${result.count} expired InvestigationQuery records.`,
        );
      }

      return result.count;
    } catch (error) {
      console.error("[LgpdLogger] Failed to purge expired data:", error);
      return 0;
    }
  }

  static maskDocument(doc: string): string {
    return maskDocument(doc);
  }

  static hashDocument(doc: string): string {
    return hashDocument(doc);
  }
}

// ─── Utility: document masking/hashing ─────────────────────────────────────

function maskDocument(doc: string): string {
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 11) return `***.***${clean.slice(6)}`;
  if (clean.length === 14) return `**.***.***/${clean.slice(8)}`;
  const half = Math.ceil(clean.length / 2);
  return "*".repeat(half) + clean.slice(half);
}

function hashDocument(doc: string): string {
  const clean = doc.replace(/\D/g, "");
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `doc_${hash.toString(16)}`;
}
