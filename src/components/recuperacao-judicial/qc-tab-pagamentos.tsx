"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Calculator,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_CHART_COLORS,
  formatCentavos,
  formatPercentage,
} from "@/lib/rj-constants";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface QCTabPagamentosProps {
  jrcId: string;
}

export function QCTabPagamentos({ jrcId }: QCTabPagamentosProps) {
  const [projectionParams, setProjectionParams] = useState({
    dataInicio: new Date().toISOString().split("T")[0],
    taxaDesconto: 12,
  });

  const { data: summary, isLoading } = trpc.rj.creditors.summary.useQuery({ jrc_id: jrcId });
  const { data: creditors } = trpc.rj.creditors.list.useQuery({ jrc_id: jrcId, limit: 500 });

  // Generate payment projection data from creditors
  const projectionData = useMemo(() => {
    if (!creditors?.items) return [];

    const yearlyPayments: Record<number, Record<string, number>> = {};
    const startDate = new Date(projectionParams.dataInicio);
    const startYear = startDate.getFullYear();

    for (const c of creditors.items) {
      const parcelas = (c as { parcelas: number | null }).parcelas || 1;
      const carencia = (c as { carencia_meses: number | null }).carencia_meses || 0;
      const desagio = (c as { desagio_percentual: number | null }).desagio_percentual || 0;
      const valorAtualizado = Number((c as { valor_atualizado: bigint }).valor_atualizado) / 100;
      const valorComDesagio = valorAtualizado * (1 - desagio / 100);
      const parcelaMensal = valorComDesagio / parcelas;
      const classe = (c as { classe: string }).classe;

      for (let i = 0; i < parcelas; i++) {
        const mesReal = carencia + i + 1;
        const year = startYear + Math.floor((startDate.getMonth() + mesReal) / 12);

        if (!yearlyPayments[year]) yearlyPayments[year] = {};
        if (!yearlyPayments[year][classe]) yearlyPayments[year][classe] = 0;
        yearlyPayments[year][classe] += parcelaMensal;
      }
    }

    return Object.entries(yearlyPayments)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, classes]) => ({
        ano: year,
        ...classes,
        total: Object.values(classes).reduce((s, v) => s + v, 0),
      }));
  }, [creditors, projectionParams.dataInicio]);

  // Calculate DSCR indicators
  const totalAnualPagamento = projectionData.length > 0
    ? projectionData.reduce((s, d) => s + (d.total || 0), 0) / projectionData.length
    : 0;

  // RJ vs Bankruptcy comparison
  const { data: rjComparison } = trpc.rj.calculations.rjVsBankruptcy.useQuery(
    {
      totalAtivos: 0,
      custosProcessuais: 0,
      creditosTrabalhistas: Number(summary?.por_classe?.CLASSE_I_TRABALHISTA?.valor ?? 0) / 100,
      creditosGarantiaReal: Number(summary?.por_classe?.CLASSE_II_GARANTIA_REAL?.valor ?? 0) / 100,
      creditosQuirografarios: Number(summary?.por_classe?.CLASSE_III_QUIROGRAFARIO?.valor ?? 0) / 100,
      creditosMEEPP: Number(summary?.por_classe?.CLASSE_IV_ME_EPP?.valor ?? 0) / 100,
      creditosFiscais: 0,
    },
    { enabled: !!summary }
  );

  const currencyFormatter = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4" /> Parâmetros de Projeção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={projectionParams.dataInicio}
                onChange={(e) =>
                  setProjectionParams((p) => ({ ...p, dataInicio: e.target.value }))
                }
                className="h-8 w-40 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taxa de Desconto (%a.a.)</Label>
              <Input
                type="number"
                step="0.5"
                value={projectionParams.taxaDesconto}
                onChange={(e) =>
                  setProjectionParams((p) => ({
                    ...p,
                    taxaDesconto: parseFloat(e.target.value) || 0,
                  }))
                }
                className="h-8 w-28 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Projeção de Pagamentos por Ano</CardTitle>
        </CardHeader>
        <CardContent>
          {projectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$ ${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => currencyFormatter(Number(value))} />
                <Legend />
                {Object.entries(CREDIT_CLASS_CHART_COLORS).map(([key, color]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={CREDIT_CLASS_SHORT_LABELS[key] || key}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Sem dados para projeção. Defina condições de pagamento nos credores.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consolidated Table */}
      {projectionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tabela Consolidada por Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 text-left">Ano</th>
                    {Object.entries(CREDIT_CLASS_SHORT_LABELS).map(([k, v]) => (
                      <th key={k} className="pb-2 pr-4 text-right">
                        {v}
                      </th>
                    ))}
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((row) => (
                    <tr key={row.ano} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.ano}</td>
                      {Object.keys(CREDIT_CLASS_SHORT_LABELS).map((k) => (
                        <td key={k} className="py-2 pr-4 text-right text-xs">
                          {(row as unknown as Record<string, number>)[k]
                            ? currencyFormatter((row as unknown as Record<string, number>)[k])
                            : "—"}
                        </td>
                      ))}
                      <td className="py-2 text-right font-semibold">
                        {currencyFormatter(row.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="pt-2 pr-4">Total</td>
                    {Object.keys(CREDIT_CLASS_SHORT_LABELS).map((k) => {
                      const total = projectionData.reduce(
                        (s, r) => s + ((r as unknown as Record<string, number>)[k] || 0),
                        0
                      );
                      return (
                        <td key={k} className="pt-2 pr-4 text-right text-xs">
                          {total > 0 ? currencyFormatter(total) : "—"}
                        </td>
                      );
                    })}
                    <td className="pt-2 text-right">
                      {currencyFormatter(
                        projectionData.reduce((s, r) => s + (r.total || 0), 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DSCR Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" /> Indicadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-center">
              <DollarSign className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-1 text-lg font-bold">
                {summary ? formatCentavos(summary.total_credito) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Dívida Total (Valor Atualizado)</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold">
                {summary ? formatPercentage(summary.media_desagio) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Deságio Médio</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-lg font-bold">
                {totalAnualPagamento > 0 ? currencyFormatter(totalAnualPagamento) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Pagamento Médio Anual</p>
            </div>
          </div>

          {totalAnualPagamento > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                O pagamento médio anual projetado é de{" "}
                <strong>{currencyFormatter(totalAnualPagamento)}</strong>.
                Para manter um DSCR saudável (&gt; 1.2x), a empresa deve gerar no mínimo{" "}
                <strong>{currencyFormatter(totalAnualPagamento * 1.2)}</strong> em fluxo de caixa
                livre anualmente para o serviço da dívida.
              </p>
              {totalAnualPagamento > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-amber-700">
                    Verifique a capacidade de pagamento antes de submeter o plano à AGC.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
