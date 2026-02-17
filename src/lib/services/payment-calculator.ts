import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ========== Payment Schedule Generation ==========

export interface PaymentScheduleInput {
  valorOriginal: number; // in BRL (not centavos)
  desagioPercentual: number; // 0-100
  carenciaMeses: number;
  parcelas: number;
  jurosAnual: number; // annual rate, e.g. 3.0 for 3%
  indexador: string;
  dataInicio: Date;
}

export interface Installment {
  numero: number;
  dataVencimento: Date;
  principal: number;
  juros: number;
  correcao: number;
  total: number;
  saldoDevedor: number;
}

export function generatePaymentSchedule(input: PaymentScheduleInput): Installment[] {
  const { valorOriginal, desagioPercentual, carenciaMeses, parcelas, jurosAnual, dataInicio } = input;

  if (parcelas <= 0) return [];

  const valorComDesagio = new Decimal(valorOriginal).times(1 - desagioPercentual / 100);
  const taxaMensal = new Decimal(jurosAnual).div(1200); // annual to monthly simple
  const amortizacao = valorComDesagio.div(parcelas); // SAC system

  const installments: Installment[] = [];
  let saldoDevedor = valorComDesagio;

  for (let i = 1; i <= parcelas; i++) {
    const mesReal = carenciaMeses + i;
    const dataVencimento = new Date(dataInicio);
    dataVencimento.setMonth(dataVencimento.getMonth() + mesReal);

    const juros = saldoDevedor.times(taxaMensal);
    const principal = amortizacao;
    const total = principal.plus(juros);

    saldoDevedor = saldoDevedor.minus(principal);
    if (saldoDevedor.lessThan(0)) saldoDevedor = new Decimal(0);

    installments.push({
      numero: i,
      dataVencimento,
      principal: principal.toNumber(),
      juros: juros.toNumber(),
      correcao: 0, // placeholder - would need actual index data
      total: total.toNumber(),
      saldoDevedor: saldoDevedor.toNumber(),
    });
  }

  return installments;
}

// ========== NPV Calculation ==========

export function calculateNPV(cashflows: number[], discountRateAnnual: number): number {
  const monthlyRate = new Decimal(discountRateAnnual).div(1200);

  let npv = new Decimal(0);
  for (let i = 0; i < cashflows.length; i++) {
    const factor = monthlyRate.plus(1).pow(i + 1);
    npv = npv.plus(new Decimal(cashflows[i]).div(factor));
  }

  return npv.toNumber();
}

// ========== RJ vs Bankruptcy Comparison ==========

export interface WaterfallInput {
  totalAtivos: number;
  custosProcessuais: number;
  creditosTrabalhistas: number; // Class I values
  creditosGarantiaReal: number;
  creditosQuirografarios: number;
  creditosMEEPP: number;
  creditosFiscais: number;
}

export interface WaterfallResult {
  label: string;
  saldoDisponivel: number;
  valorPago: number;
  percentualRecuperacao: number;
}

export function compareRJvsBankruptcy(input: WaterfallInput): {
  falencia: WaterfallResult[];
  totalRecuperacao: number;
  percentualMedioFalencia: number;
} {
  const results: WaterfallResult[] = [];
  let saldo = new Decimal(input.totalAtivos).minus(input.custosProcessuais);

  // Order per Lei 11.101: Trabalhista (150 SM cap) → Fiscal → Garantia Real → Quirografário → ME/EPP
  const classes = [
    { label: "Trabalhistas (até 150 SM)", valor: input.creditosTrabalhistas },
    { label: "Créditos Fiscais", valor: input.creditosFiscais },
    { label: "Garantia Real", valor: input.creditosGarantiaReal },
    { label: "Quirografários", valor: input.creditosQuirografarios },
    { label: "ME/EPP", valor: input.creditosMEEPP },
  ];

  for (const cls of classes) {
    const pagamento = Decimal.min(saldo, new Decimal(cls.valor));
    const pago = pagamento.greaterThan(0) ? pagamento.toNumber() : 0;
    const pct = cls.valor > 0 ? (pago / cls.valor) * 100 : 0;

    results.push({
      label: cls.label,
      saldoDisponivel: saldo.toNumber(),
      valorPago: pago,
      percentualRecuperacao: pct,
    });

    saldo = saldo.minus(pagamento);
    if (saldo.lessThan(0)) saldo = new Decimal(0);
  }

  const totalCredito = classes.reduce((s, c) => s + c.valor, 0);
  const totalPago = results.reduce((s, r) => s + r.valorPago, 0);
  const percentualMedio = totalCredito > 0 ? (totalPago / totalCredito) * 100 : 0;

  return {
    falencia: results,
    totalRecuperacao: totalPago,
    percentualMedioFalencia: percentualMedio,
  };
}

// ========== DSCR (Debt Service Coverage Ratio) ==========

export function calculateDSCR(
  receitaAnual: number,
  custosOperacionais: number,
  servicoDivida: number
): number {
  if (servicoDivida <= 0) return 999;
  return new Decimal(receitaAnual).minus(custosOperacionais).div(servicoDivida).toNumber();
}

// ========== Art. 50-A Tax Impact ==========

export function calculateHaircutTaxImpact(
  valorOriginal: number,
  desagioPercentual: number,
  aliquotaIRPJ: number = 25,
  aliquotaCSLL: number = 9,
): {
  ganhoDesagio: number;
  tributacao: number;
  ganhLiquido: number;
} {
  const ganho = new Decimal(valorOriginal).times(desagioPercentual).div(100);
  const tributacaoTotal = new Decimal(aliquotaIRPJ).plus(aliquotaCSLL).div(100);
  const tributo = ganho.times(tributacaoTotal);

  return {
    ganhoDesagio: ganho.toNumber(),
    tributacao: tributo.toNumber(),
    ganhLiquido: ganho.minus(tributo).toNumber(),
  };
}
