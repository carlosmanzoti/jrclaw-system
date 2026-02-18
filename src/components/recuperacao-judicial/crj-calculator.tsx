"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Calculator,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react";

interface Props {
  negotiationId: string;
}

interface SimulationParams {
  creditAmount: number;
  discountPercent: number;
  installments: number;
  gracePeriodMonths: number;
  interestRateAnnual: number;
  entryPaymentPercent: number;
  correctionIndex: string;
}

interface SimulationResult {
  proposedAmount: number;
  discountAmount: number;
  entryPayment: number;
  monthlyPayment: number;
  totalPaid: number;
  effectiveDiscount: number;
  vpnAt12: number;
  paybackMonths: number;
  schedule: {
    n: number;
    dueDate: string;
    amount: number;
    balance: number;
  }[];
}

const CORRECTION_RATES: Record<string, number> = {
  IPCA: 4.5,
  "IGP-M": 5.0,
  INPC: 4.3,
  TR: 1.5,
  SELIC: 10.5,
  NENHUM: 0,
};

function simulate(params: SimulationParams): SimulationResult {
  const {
    creditAmount,
    discountPercent,
    installments,
    gracePeriodMonths,
    interestRateAnnual,
    entryPaymentPercent,
    correctionIndex,
  } = params;

  const proposedAmount = creditAmount * (1 - discountPercent / 100);
  const discountAmount = creditAmount - proposedAmount;
  const entryPayment = proposedAmount * (entryPaymentPercent / 100);
  const remainingAfterEntry = proposedAmount - entryPayment;

  // Monthly interest
  const monthlyRate = interestRateAnnual / 100 / 12;
  const correctionRate = (CORRECTION_RATES[correctionIndex] || 0) / 100 / 12;
  const effectiveMonthlyRate = monthlyRate + correctionRate;

  // Calculate monthly payment (Price table with interest)
  let monthlyPayment: number;
  if (effectiveMonthlyRate === 0) {
    monthlyPayment = remainingAfterEntry / installments;
  } else {
    monthlyPayment =
      (remainingAfterEntry *
        effectiveMonthlyRate *
        Math.pow(1 + effectiveMonthlyRate, installments)) /
      (Math.pow(1 + effectiveMonthlyRate, installments) - 1);
  }

  // Generate schedule
  const schedule: SimulationResult["schedule"] = [];
  const startDate = new Date();
  let balance = remainingAfterEntry;

  // Entry payment
  if (entryPayment > 0) {
    schedule.push({
      n: 0,
      dueDate: startDate.toISOString().split("T")[0],
      amount: entryPayment,
      balance: balance,
    });
  }

  for (let i = 1; i <= installments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + gracePeriodMonths + i);

    const interest = balance * effectiveMonthlyRate;
    const principal = monthlyPayment - interest;
    balance = Math.max(0, balance - principal);

    schedule.push({
      n: i,
      dueDate: dueDate.toISOString().split("T")[0],
      amount: monthlyPayment,
      balance: balance,
    });
  }

  const totalPaid = entryPayment + monthlyPayment * installments;
  const effectiveDiscount = ((creditAmount - totalPaid) / creditAmount) * 100;

  // VPN at 12% discount rate
  const vpnRate = 0.12 / 12;
  let vpn = entryPayment;
  for (let i = 1; i <= installments; i++) {
    vpn += monthlyPayment / Math.pow(1 + vpnRate, gracePeriodMonths + i);
  }

  // Payback months
  const paybackMonths = gracePeriodMonths + installments;

  return {
    proposedAmount,
    discountAmount,
    entryPayment,
    monthlyPayment,
    totalPaid,
    effectiveDiscount,
    vpnAt12: vpn,
    paybackMonths,
    schedule,
  };
}

export function CRJCalculator({ negotiationId }: Props) {
  const { data: neg } = trpc.crjNeg.negotiations.getById.useQuery({
    id: negotiationId,
  });

  const utils = trpc.useUtils();
  const generateInstallments = trpc.crjNeg.installments.generate.useMutation({
    onSuccess: () => utils.crjNeg.negotiations.invalidate(),
  });

  const [params, setParams] = useState<SimulationParams>({
    creditAmount: 0,
    discountPercent: 30,
    installments: 48,
    gracePeriodMonths: 6,
    interestRateAnnual: 0,
    entryPaymentPercent: 5,
    correctionIndex: "IPCA",
  });

  // Pre-fill from negotiation data
  const initialized = useState(() => {
    if (neg) {
      const credit = Number(neg.credit_amount || 0) / 100;
      const discount = neg.discount_percentage || 30;
      const inst = neg.installments || 48;
      const grace = neg.grace_period_months || 6;

      setParams((p) => ({
        ...p,
        creditAmount: credit,
        discountPercent: discount,
        installments: inst,
        gracePeriodMonths: grace,
        correctionIndex: neg.monetary_correction || "IPCA",
      }));
    }
    return true;
  })[0];

  // Update when neg loads
  if (neg && params.creditAmount === 0) {
    const credit = Number(neg.credit_amount || 0) / 100;
    if (credit > 0) {
      setParams((p) => ({
        ...p,
        creditAmount: credit,
        discountPercent: neg.discount_percentage || p.discountPercent,
        installments: neg.installments || p.installments,
        gracePeriodMonths: neg.grace_period_months || p.gracePeriodMonths,
        correctionIndex: neg.monetary_correction || p.correctionIndex,
      }));
    }
  }

  const result = useMemo(() => simulate(params), [params]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleApplySchedule = () => {
    if (!neg) return;
    const totalAmount = params.creditAmount * (1 - params.discountPercent / 100);
    const entryAmount = totalAmount * (params.entryPaymentPercent / 100);
    const firstDueDate = new Date();
    firstDueDate.setMonth(firstDueDate.getMonth() + params.gracePeriodMonths + 1);

    generateInstallments.mutate({
      negotiation_id: negotiationId,
      total_amount: totalAmount,
      entry_amount: entryAmount > 0 ? entryAmount : undefined,
      entry_date: entryAmount > 0 ? new Date() : undefined,
      num_installments: params.installments,
      first_due_date: firstDueDate,
      periodicity_months: 1,
      grace_months: params.gracePeriodMonths,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="h-4 w-4" />
          Calculadora de Negociação
        </h3>
        {neg && (
          <Badge variant="outline" className="text-[10px]">
            {neg.creditor?.nome}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input parameters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Parâmetros da Simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Valor do crédito (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={params.creditAmount || ""}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    creditAmount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Deságio (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  step="0.1"
                  value={params.discountPercent}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      discountPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="360"
                  value={params.installments}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      installments: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Carência (meses)</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={params.gracePeriodMonths}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      gracePeriodMonths: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Entrada (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={params.entryPaymentPercent}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      entryPaymentPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Juros (% a.a.)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={params.interestRateAnnual}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      interestRateAnnual: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Correção monetária</Label>
                <Select
                  value={params.correctionIndex}
                  onValueChange={(v) =>
                    setParams((p) => ({ ...p, correctionIndex: v }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CORRECTION_RATES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {k} ({v}% a.a.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resultado da Simulação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <DollarSign className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold">{fmt(result.proposedAmount)}</p>
                  <p className="text-[10px] text-muted-foreground">Valor proposto</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <TrendingDown className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-600">
                    {fmt(result.discountAmount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Economia ({params.discountPercent.toFixed(1)}%)
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Calendar className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold">{fmt(result.monthlyPayment)}</p>
                  <p className="text-[10px] text-muted-foreground">Parcela mensal</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <BarChart3 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold">{fmt(result.vpnAt12)}</p>
                  <p className="text-[10px] text-muted-foreground">VPN (12% a.a.)</p>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrada:</span>
                  <span className="font-medium">{fmt(result.entryPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total pago:</span>
                  <span className="font-medium">{fmt(result.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deságio efetivo:</span>
                  <span className="font-medium">
                    {result.effectiveDiscount.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo total:</span>
                  <span className="font-medium">{result.paybackMonths} meses</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="sm"
            onClick={handleApplySchedule}
            disabled={generateInstallments.isPending || params.creditAmount === 0}
          >
            {generateInstallments.isPending ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Gerando...
              </>
            ) : (
              "Aplicar Cronograma de Parcelas"
            )}
          </Button>
        </div>
      </div>

      {/* Schedule preview */}
      {result.schedule.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Pré-visualização do Cronograma ({result.schedule.length}{" "}
              {result.schedule.length === 1 ? "parcela" : "parcelas"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-3 text-left">#</th>
                    <th className="pb-2 pr-3 text-left">Vencimento</th>
                    <th className="pb-2 pr-3 text-right">Valor</th>
                    <th className="pb-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.n} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">
                        {row.n === 0 ? "Entrada" : row.n}
                      </td>
                      <td className="py-1.5 pr-3">
                        {new Date(row.dueDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium">
                        {fmt(row.amount)}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {fmt(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
