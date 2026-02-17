import { Prisma, PrismaClient } from "@prisma/client";

type DB = PrismaClient | Prisma.TransactionClient;

interface ObjectiveCriterion {
  descricao: string;
  tipo: string; // e.g., "FAIXA_VALOR", "NATUREZA_CREDITO", "TIPO_GARANTIA", "SETOR", etc.
  valor?: string;
  potestativo: boolean;
}

// ========== STJ Validation (REsp 1.634.844/SP) ==========

interface STJValidationResult {
  valid: boolean;
  requirements: {
    criterios_objetivos: { met: boolean; issues: string[] };
    interesse_homogeneo: { met: boolean; issues: string[] };
    protecao_direitos: { met: boolean; issues: string[] };
  };
  warnings: string[];
}

export function validateSubclassSTJ(data: {
  criterios_objetivos: ObjectiveCriterion[] | null;
  justificativa_interesse_homogeneo: string | null;
  protecao_direitos: string | null;
}): STJValidationResult {
  const result: STJValidationResult = {
    valid: true,
    requirements: {
      criterios_objetivos: { met: true, issues: [] },
      interesse_homogeneo: { met: true, issues: [] },
      protecao_direitos: { met: true, issues: [] },
    },
    warnings: [],
  };

  // Requirement 1: Objective criteria (not potestative)
  const criterios = data.criterios_objetivos || [];
  if (criterios.length === 0) {
    result.requirements.criterios_objetivos.met = false;
    result.requirements.criterios_objetivos.issues.push(
      "É obrigatório definir ao menos um critério objetivo de diferenciação."
    );
    result.valid = false;
  } else {
    const potestativos = criterios.filter((c) => c.potestativo);
    if (potestativos.length > 0) {
      result.requirements.criterios_objetivos.met = false;
      result.requirements.criterios_objetivos.issues.push(
        `${potestativos.length} critério(s) potestativo(s) detectado(s). Critérios potestativos são vedados pelo STJ.`
      );
      potestativos.forEach((p) => {
        result.requirements.criterios_objetivos.issues.push(
          `  → "${p.descricao}" — critério potestativo (depende exclusivamente da vontade do devedor)`
        );
      });
      result.valid = false;
    }
  }

  // Requirement 2: Homogeneous interests
  if (!data.justificativa_interesse_homogeneo?.trim()) {
    result.requirements.interesse_homogeneo.met = false;
    result.requirements.interesse_homogeneo.issues.push(
      "É obrigatório justificar a existência de interesses homogêneos entre os credores da subclasse."
    );
    result.valid = false;
  } else if (data.justificativa_interesse_homogeneo.trim().length < 50) {
    result.requirements.interesse_homogeneo.met = false;
    result.requirements.interesse_homogeneo.issues.push(
      "A justificativa de interesses homogêneos é insuficiente. Detalhe como os credores compartilham situação fática e jurídica semelhante."
    );
    result.valid = false;
  }

  // Requirement 3: Protection of rights (no excessive prejudice)
  if (!data.protecao_direitos?.trim()) {
    result.requirements.protecao_direitos.met = false;
    result.requirements.protecao_direitos.issues.push(
      "É obrigatório demonstrar que a subclassificação não prejudica excessivamente os credores."
    );
    result.valid = false;
  } else if (data.protecao_direitos.trim().length < 50) {
    result.requirements.protecao_direitos.met = false;
    result.requirements.protecao_direitos.issues.push(
      "A demonstração de proteção de direitos é insuficiente."
    );
    result.valid = false;
  }

  return result;
}

// ========== Cram Down Risk ==========

export interface CramDownAnalysis {
  risk: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  details: string[];
  maxHaircutDiff: number;
  subclassComparisons: Array<{
    subclass_a: string;
    subclass_b: string;
    haircut_a: number;
    haircut_b: number;
    diff: number;
  }>;
}

export function analyzeCramDownRisk(
  subclasses: Array<{
    id: string;
    nome: string;
    classe_base: string;
    desagio_percentual: number | null;
    total_credores: number;
    total_valor: bigint;
  }>
): CramDownAnalysis {
  const result: CramDownAnalysis = {
    risk: "BAIXO",
    details: [],
    maxHaircutDiff: 0,
    subclassComparisons: [],
  };

  // Group by class
  const byClass: Record<string, typeof subclasses> = {};
  for (const sc of subclasses) {
    if (!byClass[sc.classe_base]) byClass[sc.classe_base] = [];
    byClass[sc.classe_base].push(sc);
  }

  for (const [classe, scs] of Object.entries(byClass)) {
    if (scs.length < 2) continue;

    // Compare haircuts within same class
    for (let i = 0; i < scs.length; i++) {
      for (let j = i + 1; j < scs.length; j++) {
        const a = scs[i];
        const b = scs[j];
        const ha = a.desagio_percentual ?? 0;
        const hb = b.desagio_percentual ?? 0;
        const diff = Math.abs(ha - hb);

        result.subclassComparisons.push({
          subclass_a: a.nome,
          subclass_b: b.nome,
          haircut_a: ha,
          haircut_b: hb,
          diff,
        });

        if (diff > result.maxHaircutDiff) {
          result.maxHaircutDiff = diff;
        }

        if (diff > 50) {
          result.details.push(
            `${classe}: Diferença de ${diff.toFixed(1)}% entre "${a.nome}" (${ha}%) e "${b.nome}" (${hb}%) — risco de cram down elevado.`
          );
        } else if (diff > 30) {
          result.details.push(
            `${classe}: Diferença de ${diff.toFixed(1)}% entre "${a.nome}" e "${b.nome}" — atenção moderada.`
          );
        }
      }
    }
  }

  // Determine risk level
  if (result.maxHaircutDiff > 60) {
    result.risk = "CRITICO";
  } else if (result.maxHaircutDiff > 40) {
    result.risk = "ALTO";
  } else if (result.maxHaircutDiff > 20) {
    result.risk = "MEDIO";
  } else {
    result.risk = "BAIXO";
  }

  return result;
}

// ========== Recalculate Subclass Stats ==========

export async function recalculateSubclassStats(db: DB, subclassId: string) {
  const creditors = await db.rJCreditor.findMany({
    where: { subclass_id: subclassId, status: { not: "EXCLUIDO" } },
    select: { valor_atualizado: true, valor_original: true },
  });

  const total_credores = creditors.length;
  const total_valor = creditors.reduce(
    (sum, c) => sum + (c.valor_atualizado || c.valor_original),
    BigInt(0)
  );

  await db.creditorSubclass.update({
    where: { id: subclassId },
    data: { total_credores, total_valor },
  });
}
