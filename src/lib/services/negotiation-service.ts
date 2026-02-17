import { Prisma, PrismaClient } from "@prisma/client";

type DB = PrismaClient | Prisma.TransactionClient;

// ========== Types ==========

export interface NegotiationDashboard {
  total_negotiations: number;
  por_fase: Record<string, number>;
  total_creditors_in_negotiation: number;
  total_valor_original: bigint;
  total_valor_acordado: bigint;
  agreement_rate: number; // percentage 0-100
  partner_creditors_count: number;
  upcoming_activities: Array<{
    id: string;
    negotiation_id: string;
    negotiation_titulo: string;
    tipo: string;
    descricao: string;
    data_atividade: Date;
    creditor_nome: string | null;
  }>;
}

export interface PipelineItem {
  fase: string;
  count: number;
  valor_total: bigint;
  credores_total: number;
}

export interface PartnerProgramSummary {
  total_parceiros: number;
  valor_original_total: bigint;
  valor_proposto_total: bigint;
  por_negotiation: Array<{
    negotiation_id: string;
    negotiation_titulo: string;
    parceiros_count: number;
    valor_original: bigint;
    valor_proposto: bigint;
  }>;
}

export interface CommunicationSummary {
  total_atividades: number;
  por_tipo: Record<string, number>;
  por_canal: Record<string, number>;
  timeline: Array<{ data: string; count: number }>;
}

// ========== Dashboard ==========

/**
 * Returns a high-level summary of all negotiations for a given JRC case.
 * Aggregates negotiation counts by phase, creditor totals, agreed values,
 * agreement rate, partner creditor count, and upcoming activities.
 */
export async function getNegotiationDashboard(
  db: DB,
  jrcId: string
): Promise<NegotiationDashboard> {
  // Fetch all negotiations for this JRC case
  const negotiations = await db.rJNegotiation.findMany({
    where: { jrc_id: jrcId },
    include: {
      credores: {
        select: {
          id: true,
          status: true,
          valor_original: true,
          valor_acordado: true,
          is_parceiro: true,
        },
      },
    },
  });

  // Aggregate by phase
  const por_fase: Record<string, number> = {};
  for (const neg of negotiations) {
    por_fase[neg.fase] = (por_fase[neg.fase] || 0) + 1;
  }

  // Flatten all negotiation creditors
  const allCreditors = negotiations.flatMap((n) => n.credores);
  const total_creditors_in_negotiation = allCreditors.length;

  // Sum original values
  let total_valor_original = BigInt(0);
  for (const c of allCreditors) {
    total_valor_original += c.valor_original;
  }

  // Count creditors with agreement and sum agreed values
  const agreedStatuses = ["ACORDO_PARCIAL", "ACORDO_TOTAL"] as const;
  const agreedCreditors = allCreditors.filter((c) =>
    (agreedStatuses as readonly string[]).includes(c.status)
  );
  let total_valor_acordado = BigInt(0);
  for (const c of agreedCreditors) {
    total_valor_acordado += c.valor_acordado ?? BigInt(0);
  }

  // Agreement rate as percentage
  const agreement_rate =
    total_creditors_in_negotiation > 0
      ? (agreedCreditors.length / total_creditors_in_negotiation) * 100
      : 0;

  // Partner creditors count
  const partner_creditors_count = allCreditors.filter(
    (c) => c.is_parceiro
  ).length;

  // Upcoming activities (next 30 days, ordered by date)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const negotiationIds = negotiations.map((n) => n.id);

  const upcoming_activities_raw =
    negotiationIds.length > 0
      ? await db.negotiationActivity.findMany({
          where: {
            negotiation_id: { in: negotiationIds },
            data_atividade: { gte: now, lte: thirtyDaysFromNow },
          },
          include: {
            negotiation: { select: { titulo: true } },
          },
          orderBy: { data_atividade: "asc" },
          take: 20,
        })
      : [];

  const upcoming_activities = upcoming_activities_raw.map((a) => ({
    id: a.id,
    negotiation_id: a.negotiation_id,
    negotiation_titulo: a.negotiation.titulo,
    tipo: a.tipo,
    descricao: a.descricao,
    data_atividade: a.data_atividade,
    creditor_nome: a.creditor_nome,
  }));

  return {
    total_negotiations: negotiations.length,
    por_fase,
    total_creditors_in_negotiation,
    total_valor_original,
    total_valor_acordado,
    agreement_rate,
    partner_creditors_count,
    upcoming_activities,
  };
}

// ========== Recalculate Negotiation Totals ==========

/**
 * Recalculates the cached counters on an RJNegotiation record:
 * total_credores, credores_acordados, and valor_acordado.
 * Should be called whenever NegotiationCreditor records are created, updated, or deleted.
 */
export async function recalculateNegotiationTotals(
  db: DB,
  negotiationId: string
): Promise<void> {
  const creditors = await db.negotiationCreditor.findMany({
    where: { negotiation_id: negotiationId },
    select: {
      status: true,
      valor_acordado: true,
    },
  });

  const total_credores = creditors.length;

  const agreedStatuses = ["ACORDO_PARCIAL", "ACORDO_TOTAL"] as const;
  const agreedCreditors = creditors.filter((c) =>
    (agreedStatuses as readonly string[]).includes(c.status)
  );
  const credores_acordados = agreedCreditors.length;

  let valor_acordado = BigInt(0);
  for (const c of agreedCreditors) {
    valor_acordado += c.valor_acordado ?? BigInt(0);
  }

  await db.rJNegotiation.update({
    where: { id: negotiationId },
    data: {
      total_credores,
      credores_acordados,
      valor_acordado,
    },
  });
}

// ========== Negotiation Pipeline ==========

/**
 * Returns negotiation data grouped by phase for pipeline/funnel visualization.
 * Each item includes the phase name, negotiation count, total original value,
 * and total creditor count.
 */
export async function getNegotiationPipeline(
  db: DB,
  jrcId: string
): Promise<PipelineItem[]> {
  const negotiations = await db.rJNegotiation.findMany({
    where: { jrc_id: jrcId },
    select: {
      fase: true,
      valor_total_original: true,
      total_credores: true,
    },
  });

  // Group by phase
  const phaseMap = new Map<
    string,
    { count: number; valor_total: bigint; credores_total: number }
  >();

  for (const neg of negotiations) {
    const existing = phaseMap.get(neg.fase);
    if (existing) {
      existing.count += 1;
      existing.valor_total += neg.valor_total_original;
      existing.credores_total += neg.total_credores;
    } else {
      phaseMap.set(neg.fase, {
        count: 1,
        valor_total: neg.valor_total_original,
        credores_total: neg.total_credores,
      });
    }
  }

  // Define the canonical phase order for consistent pipeline display
  const phaseOrder = [
    "MAPEAMENTO",
    "CONTATO_INICIAL",
    "PROPOSTA_ENVIADA",
    "CONTRAPROPOSTA",
    "MEDIACAO",
    "ACORDO_VERBAL",
    "FORMALIZACAO",
    "HOMOLOGACAO",
    "CONCLUIDA",
    "IMPASSE",
  ];

  const result: PipelineItem[] = [];

  // Add phases in canonical order first
  for (const fase of phaseOrder) {
    const data = phaseMap.get(fase);
    if (data) {
      result.push({ fase, ...data });
      phaseMap.delete(fase);
    }
  }

  // Add any remaining phases not in canonical order
  Array.from(phaseMap.entries()).forEach(([fase, data]) => {
    result.push({ fase, ...data });
  });

  return result;
}

// ========== Partner Program Summary ==========

/**
 * Returns a summary of the partner creditors program across all negotiations
 * for a given JRC case. Includes total partner count, aggregated original
 * and proposed values, and a per-negotiation breakdown.
 */
export async function getPartnerProgramSummary(
  db: DB,
  jrcId: string
): Promise<PartnerProgramSummary> {
  // Get all negotiations for the JRC case that have the partner program enabled
  const negotiations = await db.rJNegotiation.findMany({
    where: { jrc_id: jrcId },
    select: {
      id: true,
      titulo: true,
      credores: {
        where: { is_parceiro: true },
        select: {
          valor_original: true,
          valor_proposto: true,
        },
      },
    },
  });

  let total_parceiros = 0;
  let valor_original_total = BigInt(0);
  let valor_proposto_total = BigInt(0);

  const por_negotiation: PartnerProgramSummary["por_negotiation"] = [];

  for (const neg of negotiations) {
    const parceiros = neg.credores;
    if (parceiros.length === 0) continue;

    let neg_valor_original = BigInt(0);
    let neg_valor_proposto = BigInt(0);

    for (const p of parceiros) {
      neg_valor_original += p.valor_original;
      neg_valor_proposto += p.valor_proposto;
    }

    total_parceiros += parceiros.length;
    valor_original_total += neg_valor_original;
    valor_proposto_total += neg_valor_proposto;

    por_negotiation.push({
      negotiation_id: neg.id,
      negotiation_titulo: neg.titulo,
      parceiros_count: parceiros.length,
      valor_original: neg_valor_original,
      valor_proposto: neg_valor_proposto,
    });
  }

  return {
    total_parceiros,
    valor_original_total,
    valor_proposto_total,
    por_negotiation,
  };
}

// ========== Communication Summary ==========

/**
 * Generates a communication summary for the negotiation dashboard.
 * Counts activities by type and channel in the last 30 days,
 * and groups activity counts by day for a timeline chart.
 */
export async function getCommunicationSummary(
  db: DB,
  jrcId: string
): Promise<CommunicationSummary> {
  // Get negotiation IDs for this JRC case
  const negotiations = await db.rJNegotiation.findMany({
    where: { jrc_id: jrcId },
    select: { id: true },
  });

  const negotiationIds = negotiations.map((n) => n.id);

  if (negotiationIds.length === 0) {
    return {
      total_atividades: 0,
      por_tipo: {},
      por_canal: {},
      timeline: [],
    };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activities = await db.negotiationActivity.findMany({
    where: {
      negotiation_id: { in: negotiationIds },
      data_atividade: { gte: thirtyDaysAgo },
    },
    select: {
      tipo: true,
      canal: true,
      data_atividade: true,
    },
    orderBy: { data_atividade: "asc" },
  });

  const total_atividades = activities.length;

  // Group by type
  const por_tipo: Record<string, number> = {};
  for (const a of activities) {
    por_tipo[a.tipo] = (por_tipo[a.tipo] || 0) + 1;
  }

  // Group by channel
  const por_canal: Record<string, number> = {};
  for (const a of activities) {
    const canal = a.canal ?? "SEM_CANAL";
    por_canal[canal] = (por_canal[canal] || 0) + 1;
  }

  // Group by day for timeline
  const dayMap = new Map<string, number>();
  for (const a of activities) {
    const dayKey = a.data_atividade.toISOString().slice(0, 10); // YYYY-MM-DD
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
  }

  // Build sorted timeline array
  const timeline: Array<{ data: string; count: number }> = [];
  const sortedDays = Array.from(dayMap.keys()).sort();
  for (const data of sortedDays) {
    timeline.push({ data, count: dayMap.get(data)! });
  }

  return {
    total_atividades,
    por_tipo,
    por_canal,
    timeline,
  };
}
