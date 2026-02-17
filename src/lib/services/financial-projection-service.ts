import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ========== Types ==========

export interface ProjectionInput {
  anos_projecao: number;
  receita_ano_base: number; // BRL
  taxa_crescimento: number; // % annual
  margem_ebitda: number;    // %
  capex_percentual: number; // % of revenue
  capital_giro_pct: number; // % of revenue
  taxa_desconto: number;    // % annual (WACC)
  aliquota_ir: number;      // % (IRPJ + CSLL)
}

export interface DRELine {
  ano: number;
  receita_liquida: number;
  custos_despesas: number;
  ebitda: number;
  depreciacao: number;
  ebit: number;
  ir_csll: number;
  lucro_liquido: number;
  margem_ebitda_pct: number;
  margem_liquida_pct: number;
}

export interface CashFlowLine {
  ano: number;
  ebitda: number;
  ir_csll: number;
  capex: number;
  variacao_capital_giro: number;
  fluxo_caixa_livre: number;
  fluxo_caixa_acumulado: number;
  servico_divida: number;
  fluxo_apos_divida: number;
}

export interface DSCRLine {
  ano: number;
  fluxo_caixa_livre: number;
  servico_divida: number;
  dscr: number;
  status: "SAUDAVEL" | "ALERTA" | "CRITICO";
}

export interface SensitivityResult {
  variavel: string;
  variacao: number; // percentage change from base
  dscr_medio: number;
  npv: number;
  aprovado: boolean;
}

export interface StressTestResult {
  cenario: string;
  descricao: string;
  dscr_minimo: number;
  fluxo_caixa_minimo: number;
  anos_negativos: number;
  viavel: boolean;
}

export interface ReverseStressResult {
  variavel: string;
  limite_quebra: number; // the threshold value that causes plan failure
  margem_seguranca: number; // % distance from base to break
  unidade: string;
}

// ========== DRE Projection ==========

export function projectDRE(input: ProjectionInput): DRELine[] {
  const result: DRELine[] = [];

  for (let i = 0; i < input.anos_projecao; i++) {
    const ano = i + 1;
    const fatorCrescimento = new Decimal(1 + input.taxa_crescimento / 100).pow(i);
    const receita = new Decimal(input.receita_ano_base).times(fatorCrescimento);
    const ebitda = receita.times(input.margem_ebitda / 100);
    const custos_despesas = receita.minus(ebitda);
    const depreciacao = receita.times(input.capex_percentual / 100).times(0.1); // simplified
    const ebit = ebitda.minus(depreciacao);
    const ir_csll = Decimal.max(0, ebit.times(input.aliquota_ir / 100));
    const lucro = ebit.minus(ir_csll);

    result.push({
      ano,
      receita_liquida: receita.toNumber(),
      custos_despesas: custos_despesas.toNumber(),
      ebitda: ebitda.toNumber(),
      depreciacao: depreciacao.toNumber(),
      ebit: ebit.toNumber(),
      ir_csll: ir_csll.toNumber(),
      lucro_liquido: lucro.toNumber(),
      margem_ebitda_pct: ebitda.div(receita).times(100).toNumber(),
      margem_liquida_pct: receita.greaterThan(0)
        ? lucro.div(receita).times(100).toNumber()
        : 0,
    });
  }

  return result;
}

// ========== Cash Flow Projection ==========

export function projectCashFlow(
  input: ProjectionInput,
  servicoDividaAnual: number[]
): CashFlowLine[] {
  const dre = projectDRE(input);
  const result: CashFlowLine[] = [];
  let acumulado = new Decimal(0);
  let receitaAnterior = new Decimal(input.receita_ano_base);

  for (let i = 0; i < dre.length; i++) {
    const d = dre[i];
    const receita = new Decimal(d.receita_liquida);
    const ebitda = new Decimal(d.ebitda);
    const irCsll = new Decimal(d.ir_csll);
    const capex = receita.times(input.capex_percentual / 100);
    const cgAtual = receita.times(input.capital_giro_pct / 100);
    const cgAnterior = receitaAnterior.times(input.capital_giro_pct / 100);
    const variacaoCG = cgAtual.minus(cgAnterior);

    const fcl = ebitda.minus(irCsll).minus(capex).minus(variacaoCG);
    acumulado = acumulado.plus(fcl);

    const servDiv = new Decimal(servicoDividaAnual[i] || 0);
    const fclAposDivida = fcl.minus(servDiv);

    result.push({
      ano: d.ano,
      ebitda: d.ebitda,
      ir_csll: d.ir_csll,
      capex: capex.toNumber(),
      variacao_capital_giro: variacaoCG.toNumber(),
      fluxo_caixa_livre: fcl.toNumber(),
      fluxo_caixa_acumulado: acumulado.toNumber(),
      servico_divida: servDiv.toNumber(),
      fluxo_apos_divida: fclAposDivida.toNumber(),
    });

    receitaAnterior = receita;
  }

  return result;
}

// ========== DSCR Calculation ==========

export function calculateDSCRProjection(
  input: ProjectionInput,
  servicoDividaAnual: number[]
): DSCRLine[] {
  const cf = projectCashFlow(input, servicoDividaAnual);

  return cf.map((line) => {
    const dscr =
      line.servico_divida > 0
        ? new Decimal(line.fluxo_caixa_livre)
            .div(line.servico_divida)
            .toNumber()
        : 999;

    let status: DSCRLine["status"];
    if (dscr >= 1.2) status = "SAUDAVEL";
    else if (dscr >= 1.0) status = "ALERTA";
    else status = "CRITICO";

    return {
      ano: line.ano,
      fluxo_caixa_livre: line.fluxo_caixa_livre,
      servico_divida: line.servico_divida,
      dscr,
      status,
    };
  });
}

// ========== Sensitivity Analysis ==========

export function runSensitivityAnalysis(
  baseInput: ProjectionInput,
  servicoDividaAnual: number[],
  variacoes: number[] = [-30, -20, -10, 0, 10, 20, 30]
): {
  receita: SensitivityResult[];
  margem: SensitivityResult[];
  crescimento: SensitivityResult[];
} {
  const results = {
    receita: [] as SensitivityResult[],
    margem: [] as SensitivityResult[],
    crescimento: [] as SensitivityResult[],
  };

  for (const v of variacoes) {
    // Revenue sensitivity
    const receitaInput = {
      ...baseInput,
      receita_ano_base: baseInput.receita_ano_base * (1 + v / 100),
    };
    const receitaDscr = calculateDSCRProjection(receitaInput, servicoDividaAnual);
    const receitaDscrMedio = avgDscr(receitaDscr);
    const receitaNpv = calculateProjectionNPV(receitaInput, servicoDividaAnual);
    results.receita.push({
      variavel: "Receita",
      variacao: v,
      dscr_medio: receitaDscrMedio,
      npv: receitaNpv,
      aprovado: receitaDscrMedio >= 1.0,
    });

    // EBITDA margin sensitivity
    const margemInput = {
      ...baseInput,
      margem_ebitda: baseInput.margem_ebitda * (1 + v / 100),
    };
    const margemDscr = calculateDSCRProjection(margemInput, servicoDividaAnual);
    const margemDscrMedio = avgDscr(margemDscr);
    const margemNpv = calculateProjectionNPV(margemInput, servicoDividaAnual);
    results.margem.push({
      variavel: "Margem EBITDA",
      variacao: v,
      dscr_medio: margemDscrMedio,
      npv: margemNpv,
      aprovado: margemDscrMedio >= 1.0,
    });

    // Growth rate sensitivity
    const crescInput = {
      ...baseInput,
      taxa_crescimento: baseInput.taxa_crescimento + v / 10, // e.g., base 5% + variation in pp
    };
    const crescDscr = calculateDSCRProjection(crescInput, servicoDividaAnual);
    const crescDscrMedio = avgDscr(crescDscr);
    const crescNpv = calculateProjectionNPV(crescInput, servicoDividaAnual);
    results.crescimento.push({
      variavel: "Crescimento",
      variacao: v,
      dscr_medio: crescDscrMedio,
      npv: crescNpv,
      aprovado: crescDscrMedio >= 1.0,
    });
  }

  return results;
}

// ========== Stress Testing ==========

export function runStressTests(
  baseInput: ProjectionInput,
  servicoDividaAnual: number[]
): StressTestResult[] {
  const scenarios: { nome: string; descricao: string; input: ProjectionInput }[] = [
    {
      nome: "Queda de receita -20%",
      descricao: "Receita cai 20% em relação ao cenário base",
      input: { ...baseInput, receita_ano_base: baseInput.receita_ano_base * 0.8 },
    },
    {
      nome: "Compressão de margem -5pp",
      descricao: "Margem EBITDA reduz 5 pontos percentuais",
      input: {
        ...baseInput,
        margem_ebitda: Math.max(0, baseInput.margem_ebitda - 5),
      },
    },
    {
      nome: "Estagnação (crescimento 0%)",
      descricao: "Receita não cresce ao longo do período",
      input: { ...baseInput, taxa_crescimento: 0 },
    },
    {
      nome: "Recessão (-10% receita, -3pp margem)",
      descricao: "Cenário combinado de queda de receita e compressão de margem",
      input: {
        ...baseInput,
        receita_ano_base: baseInput.receita_ano_base * 0.9,
        margem_ebitda: Math.max(0, baseInput.margem_ebitda - 3),
        taxa_crescimento: Math.max(-5, baseInput.taxa_crescimento - 3),
      },
    },
    {
      nome: "Cenário extremo (-30% receita, -8pp margem)",
      descricao: "Cenário severo de crise econômica prolongada",
      input: {
        ...baseInput,
        receita_ano_base: baseInput.receita_ano_base * 0.7,
        margem_ebitda: Math.max(0, baseInput.margem_ebitda - 8),
        taxa_crescimento: -5,
      },
    },
  ];

  return scenarios.map((s) => {
    const dscr = calculateDSCRProjection(s.input, servicoDividaAnual);
    const dscrMinimo = Math.min(...dscr.map((d) => d.dscr));
    const cf = projectCashFlow(s.input, servicoDividaAnual);
    const fclMinimo = Math.min(...cf.map((c) => c.fluxo_apos_divida));
    const anosNegativos = cf.filter((c) => c.fluxo_apos_divida < 0).length;

    return {
      cenario: s.nome,
      descricao: s.descricao,
      dscr_minimo: dscrMinimo,
      fluxo_caixa_minimo: fclMinimo,
      anos_negativos: anosNegativos,
      viavel: dscrMinimo >= 1.0 && anosNegativos === 0,
    };
  });
}

// ========== Reverse Stress Test ==========

export function runReverseStressTest(
  baseInput: ProjectionInput,
  servicoDividaAnual: number[]
): ReverseStressResult[] {
  const results: ReverseStressResult[] = [];

  // Find revenue break point
  const receitaBreak = findBreakPoint(
    -50, 0, 0.5,
    (pct) => {
      const input = {
        ...baseInput,
        receita_ano_base: baseInput.receita_ano_base * (1 + pct / 100),
      };
      const dscr = calculateDSCRProjection(input, servicoDividaAnual);
      return Math.min(...dscr.map((d) => d.dscr));
    },
    1.0
  );
  results.push({
    variavel: "Receita",
    limite_quebra: receitaBreak,
    margem_seguranca: Math.abs(receitaBreak),
    unidade: "% de queda",
  });

  // Find EBITDA margin break point
  const margemBreak = findBreakPoint(
    -20, 0, 0.5,
    (pp) => {
      const input = {
        ...baseInput,
        margem_ebitda: baseInput.margem_ebitda + pp,
      };
      const dscr = calculateDSCRProjection(input, servicoDividaAnual);
      return Math.min(...dscr.map((d) => d.dscr));
    },
    1.0
  );
  results.push({
    variavel: "Margem EBITDA",
    limite_quebra: margemBreak,
    margem_seguranca: Math.abs(margemBreak),
    unidade: "pp de queda",
  });

  // Find growth break point
  const crescBreak = findBreakPoint(
    -15, 0, 0.5,
    (pp) => {
      const input = {
        ...baseInput,
        taxa_crescimento: baseInput.taxa_crescimento + pp,
      };
      const dscr = calculateDSCRProjection(input, servicoDividaAnual);
      return Math.min(...dscr.map((d) => d.dscr));
    },
    1.0
  );
  results.push({
    variavel: "Crescimento",
    limite_quebra: crescBreak,
    margem_seguranca: Math.abs(crescBreak),
    unidade: "pp de queda",
  });

  return results;
}

// ========== Helpers ==========

function avgDscr(dscr: DSCRLine[]): number {
  if (dscr.length === 0) return 0;
  return dscr.reduce((s, d) => s + d.dscr, 0) / dscr.length;
}

function calculateProjectionNPV(
  input: ProjectionInput,
  servicoDividaAnual: number[]
): number {
  const cf = projectCashFlow(input, servicoDividaAnual);
  const monthlyRate = new Decimal(input.taxa_desconto).div(100);

  let npv = new Decimal(0);
  for (let i = 0; i < cf.length; i++) {
    const factor = monthlyRate.plus(1).pow(i + 1);
    npv = npv.plus(new Decimal(cf[i].fluxo_caixa_livre).div(factor));
  }

  return npv.toNumber();
}

/**
 * Binary search to find the threshold value where DSCR drops below target.
 */
function findBreakPoint(
  min: number,
  max: number,
  precision: number,
  dscrFn: (value: number) => number,
  target: number
): number {
  let lo = min;
  let hi = max;

  // Check if base scenario already fails
  if (dscrFn(0) < target) return 0;

  // Check if even maximum stress doesn't break
  if (dscrFn(min) >= target) return min;

  while (hi - lo > precision) {
    const mid = (lo + hi) / 2;
    const dscr = dscrFn(mid);
    if (dscr >= target) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return lo;
}

// ========== Aggregated Debt Service from Creditor Data ==========

export function estimateDebtService(
  creditors: Array<{
    valor_atualizado: number;
    desagio_percentual: number | null;
    parcelas: number | null;
    carencia_meses: number | null;
  }>,
  anosProjecao: number
): number[] {
  const servicoPorAno = new Array(anosProjecao).fill(0);

  for (const c of creditors) {
    const parcelas = c.parcelas || 1;
    const carencia = c.carencia_meses || 0;
    const desagio = c.desagio_percentual || 0;
    const valorComDesagio = c.valor_atualizado * (1 - desagio / 100);
    const parcelaMensal = valorComDesagio / parcelas;

    for (let i = 0; i < parcelas; i++) {
      const mesReal = carencia + i + 1;
      const anoIndex = Math.floor(mesReal / 12);
      if (anoIndex < anosProjecao) {
        servicoPorAno[anoIndex] += parcelaMensal;
      }
    }
  }

  return servicoPorAno;
}
