import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ========== Types ==========

export interface CreditorVotingData {
  id: string;
  nome: string;
  classe: string;
  valor_atualizado: bigint | number;
  voto: string | null;
  presente_agc: boolean;
  subclass_id: string | null;
}

export interface VoteOverride {
  voto?: string;
  presente_agc?: boolean;
}

export interface ClassQuorumResult {
  classe: string;
  total_credores: number;
  presentes: number;
  votos_favor_cabecas: number;
  votos_contra_cabecas: number;
  votos_favor_valor: number;
  votos_contra_valor: number;
  total_valor_presentes: number;
  quorum_cabecas: number; // percentage
  quorum_valor: number;   // percentage
  aprovado: boolean;
  regra: string; // description of the voting rule
}

export interface VotingResult {
  por_classe: Record<string, ClassQuorumResult>;
  plano_aprovado: boolean;
  cram_down: CramDownAnalysis;
  pivotal_creditors: PivotalCreditor[];
  resumo: {
    total_credores: number;
    total_presentes: number;
    total_valor: number;
    classes_aprovadas: number;
    classes_rejeitadas: number;
  };
}

export interface CramDownAnalysis {
  viavel: boolean;
  requisitos: CramDownRequisito[];
  bloqueios: string[];
}

export interface CramDownRequisito {
  numero: string;
  descricao: string;
  atendido: boolean;
  detalhe: string;
}

export interface PivotalCreditor {
  id: string;
  nome: string;
  classe: string;
  valor: number;
  impacto: "APROVACAO" | "REJEICAO" | "NEUTRO";
  motivo: string;
}

// ========== Art. 45 Quorum Rules ==========

/**
 * Calculate voting quorum per Art. 45, Lei 11.101/2005:
 * - Class I (Trabalhista): Simple majority by head count of those present
 * - Class II (Garantia Real): Simple majority by value of those present
 * - Class III (Quirografário): DUAL quorum — majority by head AND by value of those present
 * - Class IV (ME/EPP): Simple majority by head count of those present
 */
export function calculateClassQuorum(
  classe: string,
  creditors: CreditorVotingData[],
  overrides?: Record<string, VoteOverride>
): ClassQuorumResult {
  const classCreditors = creditors.filter((c) => c.classe === classe);

  // Apply overrides
  const effectiveCreditors = classCreditors.map((c) => {
    const override = overrides?.[c.id];
    return {
      ...c,
      voto: override?.voto ?? c.voto,
      presente_agc: override?.presente_agc ?? c.presente_agc,
      valor_num: Number(c.valor_atualizado) / 100,
    };
  });

  const total = effectiveCreditors.length;
  const presentes = effectiveCreditors.filter((c) => c.presente_agc);

  const favor_cabecas = presentes.filter((c) => c.voto === "FAVOR").length;
  const contra_cabecas = presentes.filter((c) => c.voto === "CONTRA").length;
  const favor_valor = presentes
    .filter((c) => c.voto === "FAVOR")
    .reduce((s, c) => s + c.valor_num, 0);
  const contra_valor = presentes
    .filter((c) => c.voto === "CONTRA")
    .reduce((s, c) => s + c.valor_num, 0);
  const total_valor_presentes = presentes.reduce((s, c) => s + c.valor_num, 0);

  const votantes = presentes.filter(
    (c) => c.voto === "FAVOR" || c.voto === "CONTRA"
  );
  const total_votantes = votantes.length;
  const total_valor_votantes = votantes.reduce((s, c) => s + c.valor_num, 0);

  const quorum_cabecas =
    total_votantes > 0 ? (favor_cabecas / total_votantes) * 100 : 0;
  const quorum_valor =
    total_valor_votantes > 0 ? (favor_valor / total_valor_votantes) * 100 : 0;

  let aprovado = false;
  let regra = "";

  switch (classe) {
    case "CLASSE_I_TRABALHISTA":
      aprovado = quorum_cabecas > 50;
      regra = "Art. 45, §2º: Maioria simples por cabeça dos presentes";
      break;
    case "CLASSE_II_GARANTIA_REAL":
      aprovado = quorum_valor > 50;
      regra = "Art. 45, §1º: Maioria simples por valor dos presentes";
      break;
    case "CLASSE_III_QUIROGRAFARIO":
      aprovado = quorum_cabecas > 50 && quorum_valor > 50;
      regra =
        "Art. 45, §3º: Quorum duplo — maioria por cabeça E por valor dos presentes";
      break;
    case "CLASSE_IV_ME_EPP":
      aprovado = quorum_cabecas > 50;
      regra = "Art. 45, §2º: Maioria simples por cabeça dos presentes";
      break;
    default:
      regra = "Classe não reconhecida";
  }

  return {
    classe,
    total_credores: total,
    presentes: presentes.length,
    votos_favor_cabecas: favor_cabecas,
    votos_contra_cabecas: contra_cabecas,
    votos_favor_valor: favor_valor,
    votos_contra_valor: contra_valor,
    total_valor_presentes,
    quorum_cabecas,
    quorum_valor,
    aprovado,
    regra,
  };
}

// ========== Full Voting Simulation ==========

export function simulateVoting(
  creditors: CreditorVotingData[],
  overrides?: Record<string, VoteOverride>
): VotingResult {
  const classes = [
    "CLASSE_I_TRABALHISTA",
    "CLASSE_II_GARANTIA_REAL",
    "CLASSE_III_QUIROGRAFARIO",
    "CLASSE_IV_ME_EPP",
  ];

  const por_classe: Record<string, ClassQuorumResult> = {};
  for (const cls of classes) {
    por_classe[cls] = calculateClassQuorum(cls, creditors, overrides);
  }

  const classesPresentes = classes.filter(
    (cls) => por_classe[cls].presentes > 0
  );
  const classes_aprovadas = classesPresentes.filter(
    (cls) => por_classe[cls].aprovado
  ).length;
  const classes_rejeitadas = classesPresentes.filter(
    (cls) => !por_classe[cls].aprovado
  ).length;

  // Plan is approved if ALL classes with present creditors approve
  const plano_aprovado =
    classesPresentes.length > 0 && classes_rejeitadas === 0;

  // Cram down analysis
  const cram_down = analyzeCramDown(por_classe, creditors, overrides);

  // Pivotal creditors
  const pivotal_creditors = identifyPivotalCreditors(
    creditors,
    por_classe,
    overrides
  );

  const total_credores = creditors.length;
  const total_presentes = Object.values(por_classe).reduce(
    (s, r) => s + r.presentes,
    0
  );
  const total_valor = Object.values(por_classe).reduce(
    (s, r) => s + r.total_valor_presentes,
    0
  );

  return {
    por_classe,
    plano_aprovado,
    cram_down,
    pivotal_creditors,
    resumo: {
      total_credores,
      total_presentes,
      total_valor,
      classes_aprovadas,
      classes_rejeitadas,
    },
  };
}

// ========== Cram Down Analysis (Art. 58, §1º) ==========

/**
 * Art. 58, §1º requirements for cram down:
 * 1. At least 1 class approved the plan
 * 2. More than 1/3 of present creditors by value voted in favor in the rejecting class(es)
 * 3. No differential treatment among creditors of the rejecting class
 * 4. Class I payment complies with Art. 54 (1 year term)
 * 5. Class IV receives no superior terms than other classes
 */
function analyzeCramDown(
  por_classe: Record<string, ClassQuorumResult>,
  creditors: CreditorVotingData[],
  overrides?: Record<string, VoteOverride>
): CramDownAnalysis {
  const classesPresentes = Object.entries(por_classe).filter(
    ([, r]) => r.presentes > 0
  );
  const classesAprovadas = classesPresentes.filter(([, r]) => r.aprovado);
  const classesRejeitadas = classesPresentes.filter(([, r]) => !r.aprovado);

  if (classesRejeitadas.length === 0) {
    return {
      viavel: false,
      requisitos: [],
      bloqueios: ["Plano aprovado por todas as classes — cram down não necessário"],
    };
  }

  const requisitos: CramDownRequisito[] = [];
  const bloqueios: string[] = [];

  // Req 1: At least 1 class approved
  const req1 = classesAprovadas.length >= 1;
  requisitos.push({
    numero: "1",
    descricao: "Ao menos 1 classe aprovou o plano",
    atendido: req1,
    detalhe: req1
      ? `${classesAprovadas.length} classe(s) aprovaram`
      : "Nenhuma classe aprovou o plano",
  });
  if (!req1) bloqueios.push("Nenhuma classe aprovou o plano");

  // Req 2: More than 1/3 of value in rejecting classes voted favor
  let req2 = true;
  for (const [cls, result] of classesRejeitadas) {
    const totalValorVotantes = result.votos_favor_valor + result.votos_contra_valor;
    const pctFavor = totalValorVotantes > 0
      ? (result.votos_favor_valor / totalValorVotantes) * 100
      : 0;
    if (pctFavor < 33.33) {
      req2 = false;
      bloqueios.push(
        `${cls}: apenas ${pctFavor.toFixed(1)}% do valor votou a favor (mínimo 33,3%)`
      );
    }
  }
  requisitos.push({
    numero: "2",
    descricao: "Mais de 1/3 do valor na(s) classe(s) rejeitante(s) votou a favor",
    atendido: req2,
    detalhe: req2
      ? "Requisito de 1/3 atendido em todas as classes rejeitantes"
      : "Uma ou mais classes não atingiram o mínimo de 1/3",
  });

  // Req 3: No differential treatment (simplified — check subclass haircut variance)
  // This is a simplified check; real analysis requires examining plan terms
  requisitos.push({
    numero: "3",
    descricao: "Sem tratamento diferenciado na classe rejeitante",
    atendido: true, // Needs manual verification
    detalhe: "Verificação manual necessária — analisar condições do plano",
  });

  // Req 4: Class I complies with Art. 54 (payment within 1 year)
  const classeI = por_classe["CLASSE_I_TRABALHISTA"];
  const req4 = classeI ? classeI.aprovado || classeI.presentes === 0 : true;
  requisitos.push({
    numero: "4",
    descricao: "Classe I: pagamento conforme Art. 54 (prazo de 1 ano)",
    atendido: req4,
    detalhe: req4
      ? "Classe I aprovada ou sem presentes"
      : "Verificar se o plano prevê pagamento da Classe I em até 1 ano",
  });
  if (!req4) {
    bloqueios.push("Classe I rejeitou — verificar Art. 54 (pagamento em até 1 ano)");
  }

  // Req 5: Class IV receives no superior terms
  requisitos.push({
    numero: "5",
    descricao: "Classe IV: sem condições superiores às demais classes",
    atendido: true, // Needs manual verification
    detalhe: "Verificação manual necessária — comparar condições entre classes",
  });

  const viavel = requisitos.every((r) => r.atendido);

  return { viavel, requisitos, bloqueios };
}

// ========== Pivotal Creditors ==========

/**
 * Identifies creditors whose vote change would flip the outcome of a class.
 */
function identifyPivotalCreditors(
  creditors: CreditorVotingData[],
  currentResults: Record<string, ClassQuorumResult>,
  overrides?: Record<string, VoteOverride>
): PivotalCreditor[] {
  const pivotal: PivotalCreditor[] = [];

  const classes = [
    "CLASSE_I_TRABALHISTA",
    "CLASSE_II_GARANTIA_REAL",
    "CLASSE_III_QUIROGRAFARIO",
    "CLASSE_IV_ME_EPP",
  ];

  for (const cls of classes) {
    const result = currentResults[cls];
    if (!result || result.presentes === 0) continue;

    const classCreditors = creditors.filter(
      (c) => c.classe === cls && (overrides?.[c.id]?.presente_agc ?? c.presente_agc)
    );

    for (const cred of classCreditors) {
      const currentVoto = overrides?.[cred.id]?.voto ?? cred.voto;
      if (!currentVoto || currentVoto === "ABSTENCAO" || currentVoto === "AUSENTE") continue;

      // Test: what if this creditor flipped their vote?
      const testOverrides = { ...overrides };
      testOverrides[cred.id] = {
        ...(overrides?.[cred.id] || {}),
        voto: currentVoto === "FAVOR" ? "CONTRA" : "FAVOR",
        presente_agc: true,
      };

      const testResult = calculateClassQuorum(cls, creditors, testOverrides);

      if (testResult.aprovado !== result.aprovado) {
        pivotal.push({
          id: cred.id,
          nome: cred.nome,
          classe: cls,
          valor: Number(cred.valor_atualizado) / 100,
          impacto: currentVoto === "FAVOR" ? "REJEICAO" : "APROVACAO",
          motivo:
            currentVoto === "FAVOR"
              ? `Se votar contra, a ${cls} será rejeitada`
              : `Se votar a favor, a ${cls} será aprovada`,
        });
      }
    }
  }

  // Sort by value descending
  pivotal.sort((a, b) => b.valor - a.valor);

  return pivotal;
}

// ========== What-If Scenario ==========

export function runWhatIfScenario(
  creditors: CreditorVotingData[],
  baseOverrides: Record<string, VoteOverride>,
  changeCreditorId: string,
  newVote: string,
  newPresente: boolean
): VotingResult {
  const modifiedOverrides = { ...baseOverrides };
  modifiedOverrides[changeCreditorId] = {
    voto: newVote,
    presente_agc: newPresente,
  };
  return simulateVoting(creditors, modifiedOverrides);
}

// ========== Quorum Progress Helper ==========

export function calculateQuorumProgress(result: ClassQuorumResult): {
  cabecas_necessarias: number;
  cabecas_faltantes: number;
  valor_necessario: number;
  valor_faltante: number;
  percentual_progresso: number;
} {
  const totalVotantesCabecas =
    result.votos_favor_cabecas + result.votos_contra_cabecas;
  const totalVotantesValor =
    result.votos_favor_valor + result.votos_contra_valor;

  const metadeCabecas = Math.ceil(totalVotantesCabecas / 2) + 1;
  const metadeValor = totalVotantesValor / 2;

  const cabecas_faltantes = Math.max(0, metadeCabecas - result.votos_favor_cabecas);
  const valor_faltante = Math.max(0, metadeValor - result.votos_favor_valor);

  // Progress varies by class type
  let percentual_progresso = 0;
  switch (result.classe) {
    case "CLASSE_I_TRABALHISTA":
    case "CLASSE_IV_ME_EPP":
      percentual_progresso = result.quorum_cabecas;
      break;
    case "CLASSE_II_GARANTIA_REAL":
      percentual_progresso = result.quorum_valor;
      break;
    case "CLASSE_III_QUIROGRAFARIO":
      percentual_progresso = Math.min(result.quorum_cabecas, result.quorum_valor);
      break;
  }

  return {
    cabecas_necessarias: metadeCabecas,
    cabecas_faltantes,
    valor_necessario: metadeValor,
    valor_faltante,
    percentual_progresso: Math.min(100, percentual_progresso),
  };
}
