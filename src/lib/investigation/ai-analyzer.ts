/**
 * AI Analyzer — Uses Claude to analyze consolidated investigation data.
 *
 * Consolidates all assets, debts, lawsuits, and corporate links for an investigation,
 * sends them to Claude as a patrimonial analyst prompt, and parses the structured response.
 *
 * Returns: executive summary, patrimony table, corporate network, debts overview,
 * lawsuits overview, risk score 0-100, strategic recommendations, priority assets.
 *
 * Uses the existing @/lib/ai module (anthropic provider, MODEL_CONFIGS)
 * and generateText from the 'ai' package (Vercel AI SDK).
 */

import { db } from "@/lib/db";
import { anthropic, MODEL_CONFIGS } from "@/lib/ai";
import { generateText } from "ai";
import type {
  InvestigationAnalysis,
  PatrimonyEntry,
  CorporateNetworkNode,
  DebtOverview,
  LawsuitOverview,
  PriorityAsset,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Voce e um analista patrimonial senior especializado em recuperacao de credito no Brasil.
Sua funcao e analisar dados consolidados de investigacao patrimonial e produzir um relatorio
estruturado para advogados que atuam em execucoes, recuperacoes judiciais e cobrancas.

Voce deve considerar:
- Legislacao brasileira (CPC, Lei 11.101/2005, Lei 6.830/80, LGPD)
- Impenhorabilidade do bem de familia (Lei 8.009/90)
- Ordem de preferencia de constricao (dinheiro > veiculos > imoveis)
- Alienacao fiduciaria e seus efeitos sobre penhorabilidade
- Desconsideracao da personalidade juridica (Art. 50, CC)
- Fraude contra credores e fraude a execucao
- Particularidades do agronegocio (CPR, penhor rural, alienacao fiduciaria de safra)
- Compliance e PEP (Pessoas Expostas Politicamente)
- Riscos ambientais em propriedades rurais (desmatamento, embargo)

Regras:
1. Sempre responda em portugues brasileiro
2. Retorne APENAS um JSON valido (sem markdown, sem code blocks, sem texto adicional)
3. O JSON deve seguir EXATAMENTE a estrutura especificada
4. Valores monetarios em BRL (numero, sem formatacao)
5. Risk score de 0 (sem risco) a 100 (risco maximo para recuperacao de credito)
6. Seja objetivo e direto nas recomendacoes
7. Priorize ativos penhoraveis e sem restricoes`;

// ═══════════════════════════════════════════════════════════════════════════════
// Prisma row types
// ═══════════════════════════════════════════════════════════════════════════════

type DiscoveredAssetRow = any;
type DiscoveredDebtRow = any;
type DiscoveredLawsuitRow = any;
type CorporateLinkRow = any;

// ═══════════════════════════════════════════════════════════════════════════════
// Main analysis function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consolidates all investigation data and sends to Claude for analysis.
 * Falls back to rule-based analysis if the AI call fails.
 *
 * @param investigationId - The investigation to analyze
 * @returns Structured analysis with risk score, recommendations, etc.
 */
export async function analyzeInvestigation(
  investigationId: string,
): Promise<InvestigationAnalysis> {
  // 1. Load all investigation data
  const investigation = await db.investigation.findUniqueOrThrow({
    where: { id: investigationId },
    include: {
      assets: true,
      debts: true,
      lawsuits: true,
      corporateLinks: true,
      queries: {
        select: {
          provider: true,
          queryType: true,
          status: true,
          responseTimeMs: true,
          cost: true,
        },
      },
    },
  });

  // 2. Try AI-powered analysis first, fall back to rule-based
  try {
    const aiAnalysis = await callClaudeForAnalysis(investigation);
    return aiAnalysis;
  } catch (err) {
    console.warn(
      "[AiAnalyzer] Claude API call failed, falling back to rule-based analysis:",
      err instanceof Error ? err.message : String(err),
    );
    return buildRuleBasedAnalysis(investigation);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Claude API analysis
// ═══════════════════════════════════════════════════════════════════════════════

async function callClaudeForAnalysis(
  investigation: {
    targetName: string;
    targetDocument: string;
    targetType: string;
    assets: DiscoveredAssetRow[];
    debts: DiscoveredDebtRow[];
    lawsuits: DiscoveredLawsuitRow[];
    corporateLinks: CorporateLinkRow[];
    queries: Array<{ provider: string; queryType: string; status: string }>;
  },
): Promise<InvestigationAnalysis> {
  const userPrompt = buildAnalysisPrompt(investigation);
  const modelConfig = MODEL_CONFIGS.standard;

  const { text } = await generateText({
    model: anthropic(modelConfig.model),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: modelConfig.maxOutputTokens,
    temperature: 0.2,
  });

  return parseAnalysisResponse(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Prompt building
// ═══════════════════════════════════════════════════════════════════════════════

function buildAnalysisPrompt(investigation: {
  targetName: string;
  targetDocument: string;
  targetType: string;
  assets: DiscoveredAssetRow[];
  debts: DiscoveredDebtRow[];
  lawsuits: DiscoveredLawsuitRow[];
  corporateLinks: CorporateLinkRow[];
  queries: Array<{ provider: string; queryType: string; status: string }>;
}): string {
  const sections: string[] = [];

  // Header
  const providers = [...new Set(investigation.queries.map((q) => q.provider))].join(", ");
  sections.push(
    `=== DADOS DA INVESTIGACAO ===`,
    `Alvo: ${investigation.targetName}`,
    `Documento: ${investigation.targetDocument}`,
    `Tipo: ${investigation.targetType === "PF" ? "Pessoa Fisica" : "Pessoa Juridica"}`,
    `Fontes consultadas: ${providers}`,
    ``,
  );

  // Assets
  if (investigation.assets.length > 0) {
    sections.push("=== BENS ENCONTRADOS ===");
    for (const asset of investigation.assets) {
      const valor = asset.estimatedValue ? `R$ ${Number(asset.estimatedValue).toLocaleString("pt-BR")}` : "N/I";
      const restricao = asset.hasRestriction
        ? `RESTRICAO: ${asset.restrictionType || "Sim"} - ${asset.restrictionDetail || ""}`
        : "Sem restricao";
      const penhoravel = asset.isSeizable
        ? "PENHORAVEL"
        : `IMPENHORAVEL: ${asset.impenhorabilityReason || "N/I"}`;
      const area = asset.areaHectares ? ` | Area: ${Number(asset.areaHectares)} ha` : "";
      const propriedade = asset.ownershipPercentage ? ` | Participacao: ${Number(asset.ownershipPercentage)}%` : "";

      sections.push(
        `- [${asset.category}] ${asset.description}`,
        `  Valor: ${valor} | Local: ${asset.location || asset.state || "N/I"}${area}${propriedade}`,
        `  ${restricao} | ${penhoravel}`,
      );
    }
    sections.push("");
  }

  // Debts
  if (investigation.debts.length > 0) {
    sections.push("=== DIVIDAS E PROTESTOS ===");
    for (const debt of investigation.debts) {
      const valorOriginal = debt.originalValue ? `R$ ${Number(debt.originalValue).toLocaleString("pt-BR")}` : "N/I";
      const valorAtual = debt.currentValue ? `R$ ${Number(debt.currentValue).toLocaleString("pt-BR")}` : "N/I";

      sections.push(
        `- [${debt.debtType}] ${debt.description || debt.creditor}`,
        `  Credor: ${debt.creditor} | Original: ${valorOriginal} | Atual: ${valorAtual}`,
        `  Status: ${debt.status || "N/I"} | Origem: ${debt.origin || "N/I"}`,
      );
    }
    sections.push("");
  }

  // Lawsuits
  if (investigation.lawsuits.length > 0) {
    sections.push("=== PROCESSOS JUDICIAIS ===");
    for (const lawsuit of investigation.lawsuits) {
      const valor = lawsuit.estimatedValue ? `R$ ${Number(lawsuit.estimatedValue).toLocaleString("pt-BR")}` : "N/I";
      const freeze = lawsuit.hasAssetFreeze ? " [BLOQUEIO DE BENS]" : "";

      sections.push(
        `- [${lawsuit.relevance}] ${lawsuit.caseNumber} - ${lawsuit.court}`,
        `  Classe: ${lawsuit.class_ || "N/I"} | Assunto: ${lawsuit.subject || "N/I"}`,
        `  Papel: ${lawsuit.role} | Valor: ${valor} | Status: ${lawsuit.status || "N/I"}${freeze}`,
      );
    }
    sections.push("");
  }

  // Corporate links
  if (investigation.corporateLinks.length > 0) {
    sections.push("=== REDE SOCIETARIA ===");
    for (const link of investigation.corporateLinks) {
      const capital = link.capitalValue ? `R$ ${Number(link.capitalValue).toLocaleString("pt-BR")}` : "N/I";
      const flags: string[] = [];
      if (link.isOffshore) flags.push("OFFSHORE");
      if (link.isRecentCreation) flags.push("CRIACAO RECENTE");
      if (link.hasIrregularity) flags.push(`IRREGULAR: ${link.irregularityDesc}`);

      sections.push(
        `- ${link.companyName} (${link.companyCnpj})`,
        `  Cargo: ${link.role} | Participacao: ${link.sharePercentage ? Number(link.sharePercentage) + "%" : "N/I"} | Capital: ${capital}`,
        `  Status: ${link.companyStatus || "N/I"} | CNAE: ${link.cnae || "N/I"}`,
        ...(flags.length > 0 ? [`  ALERTAS: ${flags.join(", ")}`] : []),
      );
    }
    sections.push("");
  }

  // Output schema instruction
  sections.push(
    `=== INSTRUCOES DE ANALISE ===`,
    `Analise todos os dados acima e retorne um JSON com esta estrutura exata:`,
    ``,
    `{`,
    `  "executiveSummary": "Resumo executivo de 3-5 paragrafos",`,
    `  "patrimonyTable": [{ "category": "...", "description": "...", "estimatedValue": 0, "location": "...", "seizable": true, "restrictions": "...", "priority": "ALTA|MEDIA|BAIXA" }],`,
    `  "corporateNetwork": [{ "name": "...", "document": "...", "role": "...", "status": "...", "sharePercentage": 0, "riskFlags": ["..."] }],`,
    `  "debtsOverview": { "totalDebts": 0, "byType": [{ "type": "...", "count": 0, "totalValue": 0 }], "significantDebts": ["..."] },`,
    `  "lawsuitsOverview": { "totalLawsuits": 0, "byRole": [{ "role": "...", "count": 0 }], "criticalLawsuits": ["..."], "hasRecuperacaoJudicial": false, "hasExecucaoFiscal": false },`,
    `  "riskScore": 0,`,
    `  "riskClassification": "BAIXO|MODERADO|ALTO|MUITO_ALTO|CRITICO",`,
    `  "strategicRecommendations": ["..."],`,
    `  "priorityAssetsForConstriction": [{ "description": "...", "estimatedValue": 0, "category": "...", "justification": "...", "constraintMethod": "...", "expectedTimeframe": "..." }]`,
    `}`,
    ``,
    `IMPORTANTE: Retorne APENAS o JSON, sem texto adicional, sem markdown code blocks.`,
  );

  return sections.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Response parsing
// ═══════════════════════════════════════════════════════════════════════════════

function parseAnalysisResponse(text: string): InvestigationAnalysis {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  return {
    executiveSummary: String(parsed.executiveSummary || "Analise nao disponivel."),
    patrimonyTable: Array.isArray(parsed.patrimonyTable)
      ? parsed.patrimonyTable.map((e: Record<string, unknown>) => ({
          category: String(e.category || ""),
          description: String(e.description || ""),
          estimatedValue: Number(e.estimatedValue) || 0,
          location: e.location ? String(e.location) : undefined,
          seizable: Boolean(e.seizable),
          restrictions: e.restrictions ? String(e.restrictions) : undefined,
          priority: validatePriority(e.priority),
        }))
      : [],
    corporateNetwork: Array.isArray(parsed.corporateNetwork)
      ? parsed.corporateNetwork.map((n: Record<string, unknown>) => ({
          name: String(n.name || ""),
          document: String(n.document || ""),
          role: String(n.role || ""),
          status: n.status ? String(n.status) : undefined,
          sharePercentage: n.sharePercentage !== undefined ? Number(n.sharePercentage) : undefined,
          riskFlags: Array.isArray(n.riskFlags) ? n.riskFlags.map(String) : [],
        }))
      : [],
    debtsOverview: {
      totalDebts: Number(parsed.debtsOverview?.totalDebts) || 0,
      byType: Array.isArray(parsed.debtsOverview?.byType)
        ? parsed.debtsOverview.byType.map((t: Record<string, unknown>) => ({
            type: String(t.type || ""),
            count: Number(t.count) || 0,
            totalValue: Number(t.totalValue) || 0,
          }))
        : [],
      significantDebts: Array.isArray(parsed.debtsOverview?.significantDebts)
        ? parsed.debtsOverview.significantDebts.map(String)
        : [],
    },
    lawsuitsOverview: {
      totalLawsuits: Number(parsed.lawsuitsOverview?.totalLawsuits) || 0,
      byRole: Array.isArray(parsed.lawsuitsOverview?.byRole)
        ? parsed.lawsuitsOverview.byRole.map((r: Record<string, unknown>) => ({
            role: String(r.role || ""),
            count: Number(r.count) || 0,
          }))
        : [],
      criticalLawsuits: Array.isArray(parsed.lawsuitsOverview?.criticalLawsuits)
        ? parsed.lawsuitsOverview.criticalLawsuits.map(String)
        : [],
      hasRecuperacaoJudicial: Boolean(parsed.lawsuitsOverview?.hasRecuperacaoJudicial),
      hasExecucaoFiscal: Boolean(parsed.lawsuitsOverview?.hasExecucaoFiscal),
    },
    riskScore: Math.min(100, Math.max(0, Number(parsed.riskScore) || 50)),
    riskClassification: validateRiskClassification(parsed.riskClassification),
    strategicRecommendations: Array.isArray(parsed.strategicRecommendations)
      ? parsed.strategicRecommendations.map(String)
      : [],
    priorityAssetsForConstriction: Array.isArray(parsed.priorityAssetsForConstriction)
      ? parsed.priorityAssetsForConstriction.map((a: Record<string, unknown>) => ({
          description: String(a.description || ""),
          estimatedValue: Number(a.estimatedValue) || 0,
          category: String(a.category || ""),
          justification: String(a.justification || ""),
          constraintMethod: String(a.constraintMethod || ""),
          expectedTimeframe: String(a.expectedTimeframe || ""),
        }))
      : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rule-based fallback analysis (when AI is unavailable)
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRuleBasedAnalysis(investigation: Record<string, any>): InvestigationAnalysis {
  const assets: DiscoveredAssetRow[] = investigation.assets ?? [];
  const debts: DiscoveredDebtRow[] = investigation.debts ?? [];
  const lawsuits: DiscoveredLawsuitRow[] = investigation.lawsuits ?? [];
  const links: CorporateLinkRow[] = investigation.corporateLinks ?? [];

  const patrimonyTable = buildPatrimonyTable(assets);
  const corporateNetwork = buildCorporateNetwork(links);
  const debtsOverview = buildDebtsOverview(debts);
  const lawsuitsOverview = buildLawsuitsOverview(lawsuits);
  const riskScore = calculateRiskScore(assets, debts, lawsuits, links);
  const riskClassification = classifyRisk(riskScore);
  const strategicRecommendations = buildRecommendations(assets, debts, lawsuits, links, riskScore);
  const priorityAssetsForConstriction = identifyPriorityAssets(assets);

  const totalAssetValue = patrimonyTable.reduce((sum, p) => sum + p.estimatedValue, 0);
  const totalDebtValue = debtsOverview.byType.reduce((sum, t) => sum + t.totalValue, 0);
  const seizableCount = patrimonyTable.filter((p) => p.seizable).length;
  const seizableValue = patrimonyTable.filter((p) => p.seizable).reduce((sum, p) => sum + p.estimatedValue, 0);

  const executiveSummary = [
    `Investigacao patrimonial do alvo ${investigation.targetName} (${investigation.targetType === "PF" ? "Pessoa Fisica" : "Pessoa Juridica"}).`,
    ``,
    `PATRIMONIO: Foram identificados ${assets.length} bens com valor total estimado de R$${totalAssetValue.toLocaleString("pt-BR")}, dos quais ${seizableCount} sao penhoraveis (R$${seizableValue.toLocaleString("pt-BR")}).`,
    ``,
    `DIVIDAS: O investigado possui ${debtsOverview.totalDebts} dividas registradas${totalDebtValue > 0 ? ` totalizando R$${totalDebtValue.toLocaleString("pt-BR")}` : ""}.`,
    ``,
    `PROCESSOS: Identificados ${lawsuitsOverview.totalLawsuits} processos judiciais${lawsuitsOverview.criticalLawsuits.length > 0 ? `, dos quais ${lawsuitsOverview.criticalLawsuits.length} sao de relevancia critica/alta` : ""}.`,
    ...(lawsuitsOverview.hasRecuperacaoJudicial ? [``, `ALERTA: Investigado em Recuperacao Judicial.`] : []),
    ...(lawsuitsOverview.hasExecucaoFiscal ? [``, `ALERTA: Investigado com Execucao Fiscal em andamento.`] : []),
    ``,
    `RISCO: Classificacao ${riskClassification} (score ${riskScore}/100).`,
  ].join("\n");

  return {
    executiveSummary,
    patrimonyTable,
    corporateNetwork,
    debtsOverview,
    lawsuitsOverview,
    riskScore,
    riskClassification,
    strategicRecommendations,
    priorityAssetsForConstriction,
  };
}

// ── Patrimony table builder ──

function buildPatrimonyTable(assets: DiscoveredAssetRow[]): PatrimonyEntry[] {
  return assets.map((asset) => {
    const value = asset.estimatedValue ? Number(asset.estimatedValue) : 0;
    let priority: "ALTA" | "MEDIA" | "BAIXA" = "MEDIA";
    if (asset.isSeizable && value > 500_000) priority = "ALTA";
    else if (!asset.isSeizable || value < 50_000) priority = "BAIXA";

    return {
      category: asset.category,
      description: asset.description,
      estimatedValue: value,
      location: asset.location ?? undefined,
      seizable: asset.isSeizable,
      restrictions: asset.restrictionType ?? undefined,
      priority,
    };
  });
}

// ── Corporate network builder ──

function buildCorporateNetwork(links: CorporateLinkRow[]): CorporateNetworkNode[] {
  return links.map((link) => {
    const riskFlags: string[] = [];
    if (link.isOffshore) riskFlags.push("OFFSHORE");
    if (link.isRecentCreation) riskFlags.push("CRIACAO_RECENTE");
    if (link.hasIrregularity) riskFlags.push("IRREGULARIDADE");

    return {
      name: link.companyName,
      document: link.companyCnpj,
      role: link.role,
      status: link.companyStatus ?? undefined,
      sharePercentage: link.sharePercentage ? Number(link.sharePercentage) : undefined,
      riskFlags,
    };
  });
}

// ── Debts overview builder ──

function buildDebtsOverview(debts: DiscoveredDebtRow[]): DebtOverview {
  const byTypeMap = new Map<string, { count: number; totalValue: number }>();
  for (const debt of debts) {
    const key = debt.debtType;
    const current = byTypeMap.get(key) ?? { count: 0, totalValue: 0 };
    current.count += 1;
    current.totalValue += debt.currentValue ? Number(debt.currentValue) : 0;
    byTypeMap.set(key, current);
  }

  return {
    totalDebts: debts.length,
    byType: Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      totalValue: data.totalValue,
    })),
    significantDebts: debts
      .filter((d) => d.currentValue && Number(d.currentValue) > 100_000)
      .map((d) => `${d.debtType}: R$${Number(d.currentValue).toLocaleString("pt-BR")} - ${d.creditor}`),
  };
}

// ── Lawsuits overview builder ──

function buildLawsuitsOverview(lawsuits: DiscoveredLawsuitRow[]): LawsuitOverview {
  const byRoleMap = new Map<string, number>();
  for (const l of lawsuits) {
    byRoleMap.set(l.role, (byRoleMap.get(l.role) ?? 0) + 1);
  }

  return {
    totalLawsuits: lawsuits.length,
    byRole: Array.from(byRoleMap.entries()).map(([role, count]) => ({ role, count })),
    criticalLawsuits: lawsuits
      .filter((l) => l.relevance === "CRITICA" || l.relevance === "ALTA")
      .map((l) => `${l.caseNumber} (${l.court}) - ${l.class_ ?? "N/I"} - ${l.status ?? "N/I"}`),
    hasRecuperacaoJudicial: lawsuits.some((l) => l.class_?.toLowerCase().includes("recuperacao judicial")),
    hasExecucaoFiscal: lawsuits.some((l) => l.class_?.toLowerCase().includes("execucao fiscal")),
  };
}

// ── Risk score calculator ──

function calculateRiskScore(
  assets: DiscoveredAssetRow[],
  debts: DiscoveredDebtRow[],
  lawsuits: DiscoveredLawsuitRow[],
  links: CorporateLinkRow[],
): number {
  let score = 30;

  const totalDebt = debts.reduce((sum, d) => sum + (d.currentValue ? Number(d.currentValue) : 0), 0);
  const totalAssets = assets.reduce((sum, a) => sum + (a.estimatedValue ? Number(a.estimatedValue) : 0), 0);

  if (totalDebt > 0 && totalAssets > 0) {
    const ratio = totalDebt / totalAssets;
    if (ratio > 1.0) score += 20;
    else if (ratio > 0.5) score += 10;
  }

  score += Math.min(lawsuits.filter((l) => l.hasAssetFreeze).length * 5, 15);
  score += Math.min(lawsuits.filter((l) => l.relevance === "CRITICA" || l.relevance === "ALTA").length * 3, 15);
  score += Math.min(links.filter((l) => l.isOffshore).length * 10, 20);
  score += Math.min(links.filter((l) => l.hasIrregularity).length * 5, 10);
  score += Math.min(links.filter((l) => l.isRecentCreation).length * 3, 9);

  if (assets.length > 0) {
    const restrictedRatio = assets.filter((a) => a.hasRestriction).length / assets.length;
    if (restrictedRatio > 0.5) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function classifyRisk(score: number): string {
  if (score >= 80) return "CRITICO";
  if (score >= 60) return "ALTO";
  if (score >= 40) return "MODERADO";
  if (score >= 20) return "BAIXO";
  return "MUITO_BAIXO";
}

// ── Strategic recommendations builder ──

function buildRecommendations(
  assets: DiscoveredAssetRow[],
  debts: DiscoveredDebtRow[],
  lawsuits: DiscoveredLawsuitRow[],
  links: CorporateLinkRow[],
  riskScore: number,
): string[] {
  const recs: string[] = [];

  const seizableAssets = assets.filter((a) => a.isSeizable);
  if (seizableAssets.length > 0) {
    const total = seizableAssets.reduce((s, a) => s + (a.estimatedValue ? Number(a.estimatedValue) : 0), 0);
    recs.push(
      `Identificados ${seizableAssets.length} bens penhoraveis com valor estimado total de R$${total.toLocaleString("pt-BR")}. Recomenda-se pedido de penhora prioritario sobre os bens de maior valor.`,
    );
  }

  const properties = assets.filter((a) => a.category === "IMOVEL_URBANO" || a.category === "IMOVEL_RURAL");
  if (properties.length > 0) {
    recs.push(
      `Localizados ${properties.length} imoveis. Verificar matriculas atualizadas e solicitar certidoes de onus reais para confirmar situacao registral.`,
    );
  }

  if (links.filter((l) => l.isOffshore).length > 0) {
    recs.push(
      `Detectadas vinculacoes offshore. Recomenda-se aprofundar investigacao internacional e considerar cooperacao juridica via Haia.`,
    );
  }

  if (links.filter((l) => l.isRecentCreation).length > 0) {
    recs.push(
      `Identificadas empresas de criacao recente, o que pode indicar blindagem patrimonial. Avaliar desconsideracao da personalidade juridica (Art. 50, CC).`,
    );
  }

  if (debts.length > 0) {
    recs.push(
      `O investigado possui ${debts.length} dividas registradas. Verificar se ha creditos concorrentes que possam afetar a satisfacao do credito do cliente.`,
    );
  }

  if (lawsuits.filter((l) => l.hasAssetFreeze).length > 0) {
    recs.push(
      `Existem processos com bloqueio de bens. Verificar se os bloqueios afetam os bens identificados e avaliar pedido de penhora no rosto dos autos.`,
    );
  }

  if (lawsuits.some((l) => l.class_?.toLowerCase().includes("recuperacao judicial"))) {
    recs.push(
      `ATENCAO: Investigado em Recuperacao Judicial. Verificar se o credito do cliente esta sujeito ao plano e avaliar habilitacao/impugnacao de credito conforme Lei 11.101/2005.`,
    );
  }

  if (riskScore >= 60) {
    recs.push(
      `Score de risco elevado (${riskScore}/100). Recomenda-se atuacao celere para garantir bens antes de possivel dilapidacao patrimonial.`,
    );
  }

  if (assets.length === 0) {
    recs.push(
      `Nenhum bem localizado nas fontes consultadas. Considerar investigacao complementar com busca em cartorios de registro de imoveis e DETRAN dos estados de interesse.`,
    );
  }

  return recs;
}

// ── Priority assets identifier ──

function identifyPriorityAssets(assets: DiscoveredAssetRow[]): PriorityAsset[] {
  return assets
    .filter((a) => a.isSeizable)
    .sort((a, b) => {
      const va = a.estimatedValue ? Number(a.estimatedValue) : 0;
      const vb = b.estimatedValue ? Number(b.estimatedValue) : 0;
      return vb - va;
    })
    .slice(0, 10)
    .map((asset) => {
      const value = asset.estimatedValue ? Number(asset.estimatedValue) : 0;
      const cat = asset.category;

      let constraintMethod: string;
      let expectedTimeframe: string;
      let justification: string;

      switch (cat) {
        case "IMOVEL_URBANO":
        case "IMOVEL_RURAL":
          constraintMethod = "Penhora via SREI (registro eletronico de imoveis)";
          expectedTimeframe = "15-30 dias para averbacao";
          justification = `Imovel com valor estimado de R$${value.toLocaleString("pt-BR")}. Bem de alta liquidez para satisfacao do credito.`;
          break;
        case "VEICULO_AUTOMOVEL":
        case "VEICULO_CAMINHAO":
        case "VEICULO_MOTOCICLETA":
        case "VEICULO_OUTRO":
          constraintMethod = "Bloqueio via RENAJUD";
          expectedTimeframe = "Imediato (ordem judicial eletronica)";
          justification = `Veiculo avaliado em R$${value.toLocaleString("pt-BR")}. Constricao rapida via sistema RENAJUD.`;
          break;
        case "FUNDOS_INVESTIMENTO":
        case "ACOES_BOLSA":
        case "DEPOSITO_BANCARIO":
          constraintMethod = "Bloqueio via SISBAJUD (antigo BacenJud)";
          expectedTimeframe = "Imediato (ordem judicial eletronica)";
          justification = `Ativo financeiro de R$${value.toLocaleString("pt-BR")}. Maior liquidez e facilidade de constricao.`;
          break;
        default:
          constraintMethod = "Penhora judicial com mandado";
          expectedTimeframe = "30-60 dias";
          justification = `Bem avaliado em R$${value.toLocaleString("pt-BR")}. Passivel de penhora judicial.`;
          break;
      }

      return {
        description: asset.description,
        estimatedValue: value,
        category: cat,
        justification,
        constraintMethod,
        expectedTimeframe,
      };
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Report generation (public API for report module)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates markdown report content based on analysis.
 * Structure varies by reportType.
 */
export async function generateReportContent(
  investigationId: string,
  reportType: string,
): Promise<string> {
  const analysis = await analyzeInvestigation(investigationId);

  const investigation = await db.investigation.findUniqueOrThrow({
    where: { id: investigationId },
    select: {
      targetName: true,
      targetDocument: true,
      targetType: true,
    },
  });

  const doc = investigation.targetDocument.replace(/\D/g, "");
  const maskedDoc = doc.length === 11
    ? `***.***.*${doc.slice(7)}-${doc.slice(9)}`
    : doc.length === 14
      ? `**.***.***/${doc.slice(8, 12)}-${doc.slice(12)}`
      : investigation.targetDocument;

  const header = [
    `# Relatorio de Investigacao Patrimonial`,
    ``,
    `**Alvo:** ${investigation.targetName}`,
    `**Documento:** ${maskedDoc}`,
    `**Tipo:** ${investigation.targetType === "PF" ? "Pessoa Fisica" : "Pessoa Juridica"}`,
    `**Data:** ${new Date().toLocaleDateString("pt-BR")}`,
    `**Classificacao de Risco:** ${analysis.riskClassification} (Score: ${analysis.riskScore}/100)`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = [
    `## Resumo Executivo`,
    ``,
    analysis.executiveSummary,
    ``,
    `## Bens Prioritarios para Constricao`,
    ``,
    analysis.priorityAssetsForConstriction.length > 0
      ? analysis.priorityAssetsForConstriction
          .map(
            (a, i) =>
              `**${i + 1}. ${a.description}** - R$${a.estimatedValue.toLocaleString("pt-BR")}\n` +
              `   - Metodo: ${a.constraintMethod}\n` +
              `   - Prazo: ${a.expectedTimeframe}\n` +
              `   - Justificativa: ${a.justification}`,
          )
          .join("\n\n")
      : "*Nenhum bem prioritario identificado para constricao.*",
    ``,
    `## Recomendacoes Estrategicas`,
    ``,
    analysis.strategicRecommendations.map((r, i) => `${i + 1}. ${r}`).join("\n"),
    ``,
    `---`,
    `*Relatorio gerado automaticamente pelo sistema JRCLaw.*`,
  ].join("\n");

  return header + body;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Validation helpers
// ═══════════════════════════════════════════════════════════════════════════════

function validatePriority(value: unknown): "ALTA" | "MEDIA" | "BAIXA" {
  const str = String(value || "").toUpperCase();
  if (str === "ALTA" || str === "MEDIA" || str === "BAIXA") return str;
  return "MEDIA";
}

function validateRiskClassification(value: unknown): string {
  const valid = ["BAIXO", "MODERADO", "ALTO", "MUITO_ALTO", "CRITICO", "MUITO_BAIXO"];
  const str = String(value || "").toUpperCase();
  if (valid.includes(str)) return str;
  return "MODERADO";
}
