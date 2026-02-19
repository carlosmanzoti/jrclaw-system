/**
 * Investigation Provider Layer — Shared Types
 *
 * Defines all interfaces used across the investigation provider system:
 * provider contracts, query/result shapes, and normalized data structures
 * that map to Prisma models (DiscoveredAsset, DiscoveredDebt, etc.).
 */

import type {
  ApiProvider,
  ApiCategory,
  QueryType,
  QueryStatus,
  AssetCategory,
  DebtType,
  LawsuitRelevance,
  LgpdLegalBasis,
} from "@prisma/client";

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Interface
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvestigationProvider {
  /** Prisma enum identifier */
  name: ApiProvider;

  /** Human-readable name shown in UI */
  displayName: string;

  /** API category (CADASTRAL, JUDICIAL, etc.) */
  category: ApiCategory;

  /** Whether the provider has valid API credentials configured */
  isConfigured(): Promise<boolean>;

  /** Query types this provider can answer */
  getAvailableQueries(): QueryType[];

  /** Execute a query against this provider */
  execute(query: ProviderQuery): Promise<ProviderResult>;

  /** Estimate cost in BRL for a single query of the given type */
  estimateCost(queryType: QueryType): Promise<number>;

  /** Current rate limit info */
  getRateLimit(): Promise<RateLimitInfo>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Query & Result
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderQuery {
  /** Which kind of query to run */
  type: QueryType;

  /** CPF or CNPJ of the investigation target */
  targetDocument: string;

  /** Person type: Pessoa Fisica or Pessoa Juridica */
  targetType: "PF" | "PJ";

  /** Optional extra parameters (e.g. date range, state filter) */
  params?: Record<string, unknown>;
}

export interface ProviderResult {
  /** Whether the query executed without errors */
  success: boolean;

  /** Which provider returned this result */
  provider: ApiProvider;

  /** The query type that was executed */
  queryType: QueryType;

  /** Parsed response data (provider-specific shape) */
  data: Record<string, unknown>;

  /** Normalized asset records ready for DB insertion */
  normalizedAssets?: NormalizedAsset[];

  /** Normalized debt records ready for DB insertion */
  normalizedDebts?: NormalizedDebt[];

  /** Normalized lawsuit records ready for DB insertion */
  normalizedLawsuits?: NormalizedLawsuit[];

  /** Normalized corporate link records ready for DB insertion */
  normalizedCorporateLinks?: NormalizedCorporateLink[];

  /** The raw, unparsed API response */
  rawResponse: unknown;

  /** How long the API call took in milliseconds */
  responseTimeMs: number;

  /** Cost in BRL for this query */
  cost: number;

  /** Whether this result came from the mock data generator */
  isMock: boolean;

  /** Error message if success === false */
  errorMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitInfo {
  /** Requests allowed per minute */
  requestsPerMinute: number | null;

  /** Requests allowed per day */
  requestsPerDay: number | null;

  /** Requests already made in the current minute window */
  currentMinuteUsage: number;

  /** Requests already made today */
  currentDayUsage: number;

  /** Whether the provider is currently rate-limited */
  isLimited: boolean;

  /** When the rate limit resets (if limited) */
  resetsAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Normalized Data — maps to Prisma DiscoveredAsset
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedAsset {
  category: AssetCategory;
  subcategory?: string;
  description: string;
  registrationId?: string;
  location?: string;
  state?: string;
  city?: string;

  estimatedValue?: number;
  valuationMethod?: string;
  valuationDate?: Date;

  hasRestriction: boolean;
  restrictionType?: string;
  restrictionDetail?: string;
  isSeizable: boolean;
  impenhorabilityReason?: string;

  ownershipPercentage?: number;
  coOwners?: Record<string, unknown>[];

  sourceProvider: ApiProvider;
  sourceQueryId?: string;
  rawSourceData?: unknown;

  /** Geospatial fields for rural properties */
  latitude?: number;
  longitude?: number;
  areaHectares?: number;
  carCode?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Normalized Data — maps to Prisma DiscoveredDebt
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedDebt {
  debtType: DebtType;
  creditor: string;
  creditorDocument?: string;

  originalValue?: number;
  currentValue?: number;

  inscriptionDate?: Date;
  dueDate?: Date;

  description?: string;
  caseNumber?: string;
  status?: string;
  origin?: string;

  sourceProvider: ApiProvider;
  rawSourceData?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Normalized Data — maps to Prisma DiscoveredLawsuit
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedLawsuit {
  caseNumber: string;
  court: string;
  vara?: string;
  subject?: string;
  class_?: string;
  role: string;
  otherParties?: Record<string, unknown>[];

  estimatedValue?: number;
  status?: string;
  lastMovement?: string;
  lastMovementDate?: Date;
  distributionDate?: Date;

  relevance: LawsuitRelevance;
  hasAssetFreeze: boolean;
  notes?: string;

  sourceProvider: ApiProvider;
  rawSourceData?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Normalized Data — maps to Prisma CorporateLink
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedCorporateLink {
  companyName: string;
  companyCnpj: string;
  companyStatus?: string;
  cnae?: string;
  openDate?: Date;

  role: string;
  sharePercentage?: number;
  capitalValue?: number;
  entryDate?: Date;
  exitDate?: Date;

  isOffshore: boolean;
  isRecentCreation: boolean;
  hasIrregularity: boolean;
  irregularityDesc?: string;

  sourceProvider: ApiProvider;
  rawSourceData?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration & Budget
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderConfig {
  provider: ApiProvider;
  displayName: string;
  category: ApiCategory;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  extraConfig?: Record<string, unknown>;
  isActive: boolean;
  isConfigured: boolean;
  monthlyBudget?: number;
  monthlySpent: number;
  costPerQuery?: number;
  rateLimitPerMin?: number;
  rateLimitPerDay?: number;
}

export interface BudgetAlert {
  provider: ApiProvider;
  percentUsed: number;
  monthlyBudget: number;
  monthlySpent: number;
  message: string;
  severity: "WARNING" | "CRITICAL";
}

// ═══════════════════════════════════════════════════════════════════════════════
// LGPD Audit
// ═══════════════════════════════════════════════════════════════════════════════

export interface LgpdQueryLog {
  queryType: QueryType;
  provider: ApiProvider;
  targetDocument: string;
  userId: string;
  legalBasis: LgpdLegalBasis;
  ip?: string;
  retentionUntil: Date;
  resultStatus: QueryStatus;
  responseTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI Analysis
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvestigationAnalysis {
  executiveSummary: string;
  patrimonyTable: PatrimonyEntry[];
  corporateNetwork: CorporateNetworkNode[];
  debtsOverview: DebtOverview;
  lawsuitsOverview: LawsuitOverview;
  riskScore: number;
  riskClassification: string;
  strategicRecommendations: string[];
  priorityAssetsForConstriction: PriorityAsset[];
}

export interface PatrimonyEntry {
  category: string;
  description: string;
  estimatedValue: number;
  location?: string;
  seizable: boolean;
  restrictions?: string;
  priority: "ALTA" | "MEDIA" | "BAIXA";
}

export interface CorporateNetworkNode {
  name: string;
  document: string;
  role: string;
  status?: string;
  sharePercentage?: number;
  riskFlags: string[];
}

export interface DebtOverview {
  totalDebts: number;
  byType: { type: string; count: number; totalValue: number }[];
  significantDebts: string[];
}

export interface LawsuitOverview {
  totalLawsuits: number;
  byRole: { role: string; count: number }[];
  criticalLawsuits: string[];
  hasRecuperacaoJudicial: boolean;
  hasExecucaoFiscal: boolean;
}

export interface PriorityAsset {
  description: string;
  estimatedValue: number;
  category: string;
  justification: string;
  constraintMethod: string;
  expectedTimeframe: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvestigationProgress {
  investigationId: string;
  totalQueries: number;
  completedQueries: number;
  failedQueries: number;
  currentProvider?: ApiProvider;
  status: "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
  startedAt: Date;
  estimatedCompletionMs?: number;
}

export type DepthLevel = "BASICA" | "PADRAO" | "APROFUNDADA" | "COMPLETA";

export interface DepthProviderMap {
  providers: ApiProvider[];
  queryTypes: QueryType[];
}
