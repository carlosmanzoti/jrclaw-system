"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, BarChart3, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCentavos } from "@/lib/rj-constants";

interface NegTabComparativoProps {
  jrcId: string;
}

export function NegTabComparativo({ jrcId }: NegTabComparativoProps) {
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [custosProcessuais, setCustosProcessuais] = useState(0);
  const [creditosTrabalhistas, setCreditosTrabalhistas] = useState(0);
  const [creditosGarantiaReal, setCreditosGarantiaReal] = useState(0);
  const [creditosQuirografarios, setCreditosQuirografarios] = useState(0);
  const [creditosMEEPP, setCreditosMEEPP] = useState(0);
  const [creditosFiscais, setCreditosFiscais] = useState(0);
  const [queryEnabled, setQueryEnabled] = useState(false);

  const { data: summary, isLoading: loadingSummary } =
    trpc.rj.creditors.summary.useQuery({ jrc_id: jrcId });

  useEffect(() => {
    if (!summary) return;
    const classeI = summary.por_classe["CLASSE_I_TRABALHISTA"];
    const classeII = summary.por_classe["CLASSE_II_GARANTIA_REAL"];
    const classeIII = summary.por_classe["CLASSE_III_QUIROGRAFARIO"];
    const classeIV = summary.por_classe["CLASSE_IV_ME_EPP"];
    if (classeI) setCreditosTrabalhistas(Number(classeI.valor) / 100);
    if (classeII) setCreditosGarantiaReal(Number(classeII.valor) / 100);
    if (classeIII) setCreditosQuirografarios(Number(classeIII.valor) / 100);
    if (classeIV) setCreditosMEEPP(Number(classeIV.valor) / 100);
  }, [summary]);

  useEffect(() => {
    setQueryEnabled(totalAtivos > 0);
  }, [totalAtivos]);

  const { data: comparison, isLoading: loadingComparison } =
    trpc.rj.calculations.rjVsBankruptcy.useQuery(
      {
        totalAtivos,
        custosProcessuais,
        creditosTrabalhistas,
        creditosGarantiaReal,
        creditosQuirografarios,
        creditosMEEPP,
        creditosFiscais,
      },
      { enabled: queryEnabled }
    );

  if (loadingSummary) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalCreditos =
    creditosTrabalhistas + creditosGarantiaReal + creditosQuirografarios + creditosMEEPP + creditosFiscais;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Comparativo: Recuperação Judicial vs Falência</h2>
        <p className="text-sm text-muted-foreground">
          Simule o resultado para credores em cada cenário e avalie a viabilidade da recuperação judicial.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" /> Parâmetros da Simulação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div>
              <Label>Total de Ativos (R$)</Label>
              <Input type="number" min={0} step={1000} value={totalAtivos || ""} onChange={(e) => setTotalAtivos(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
            <div>
              <Label>Custos Processuais (R$)</Label>
              <Input type="number" min={0} step={1000} value={custosProcessuais || ""} onChange={(e) => setCustosProcessuais(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
            <div>
              <Label>Créditos Trabalhistas (R$)</Label>
              <Input type="number" min={0} step={1000} value={creditosTrabalhistas || ""} onChange={(e) => setCreditosTrabalhistas(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
            <div>
              <Label>Créditos com Garantia Real (R$)</Label>
              <Input type="number" min={0} step={1000} value={creditosGarantiaReal || ""} onChange={(e) => setCreditosGarantiaReal(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
            <div>
              <Label>Créditos Quirografários (R$)</Label>
              <Input type="number" min={0} step={1000} value={creditosQuirografarios || ""} onChange={(e) => setCreditosQuirografarios(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
            <div>
              <Label>Créditos ME/EPP (R$)</Label>
              <Input type="number" min={0} step={1000} value={creditosMEEPP || ""} onChange={(e) => setCreditosMEEPP(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
            <div>
              <Label>Créditos Fiscais (R$)</Label>
              <Input type="number" min={0} step={1000} value={creditosFiscais || ""} onChange={(e) => setCreditosFiscais(Number(e.target.value) || 0)} placeholder="0,00" />
            </div>
          </div>
          {summary && (
            <p className="mt-3 text-xs text-muted-foreground">
              Valores dos créditos pré-preenchidos a partir do Quadro de Credores ({formatCentavos(summary.total_credito)} total).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loadingComparison && queryEnabled && (
        <Skeleton className="h-64 w-full" />
      )}

      {comparison && queryEnabled && (
        <>
          {/* Waterfall Table */}
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Scale className="h-4 w-4 text-red-600" />
                Cascata de Pagamentos na Falência (Art. 83, Lei 11.101/2005)
                <Badge className="ml-auto bg-red-100 text-red-700">
                  {comparison.percentualMedioFalencia.toFixed(1)}% recuperação média
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 text-left">Classe</th>
                      <th className="pb-2 pr-4 text-right">Saldo Disponível</th>
                      <th className="pb-2 pr-4 text-right">Valor Pago</th>
                      <th className="pb-2 pr-4 text-right">Recuperação</th>
                      <th className="pb-2 text-left">Barra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.falencia.map((row) => (
                      <tr key={row.label} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.label}</td>
                        <td className="py-2 pr-4 text-right">{formatBRL(row.saldoDisponivel)}</td>
                        <td className="py-2 pr-4 text-right">{formatBRL(row.valorPago)}</td>
                        <td className={`py-2 pr-4 text-right font-semibold ${row.percentualRecuperacao >= 50 ? "text-emerald-600" : row.percentualRecuperacao > 0 ? "text-amber-600" : "text-red-600"}`}>
                          {row.percentualRecuperacao.toFixed(1)}%
                        </td>
                        <td className="py-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${Math.min(row.percentualRecuperacao, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4" /> Análise Comparativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Total Créditos</p>
                  <p className="text-lg font-bold">{formatBRL(totalCreditos)}</p>
                </div>
                <div className="rounded-lg border border-red-200 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Recuperação na Falência</p>
                  <p className="text-lg font-bold text-red-600">{formatBRL(comparison.totalRecuperacao)}</p>
                  <p className="text-xs text-muted-foreground">{comparison.percentualMedioFalencia.toFixed(1)}% do total</p>
                </div>
                <div className="rounded-lg border border-blue-200 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Perda na Falência</p>
                  <p className="text-lg font-bold text-amber-600">{formatBRL(totalCreditos - comparison.totalRecuperacao)}</p>
                  <p className="text-xs text-muted-foreground">{totalCreditos > 0 ? ((1 - comparison.totalRecuperacao / totalCreditos) * 100).toFixed(1) : 0}% do total</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <p className="text-sm">
                  <strong>Conclusão:</strong> Na hipótese de falência, os credores receberiam em média apenas{" "}
                  <strong>{comparison.percentualMedioFalencia.toFixed(1)}%</strong> de seus créditos.
                  {comparison.percentualMedioFalencia < 50 && (
                    <> A baixa taxa de recuperação na falência fortalece o argumento pela aprovação do plano de recuperação judicial.</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!queryEnabled && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Informe o total de ativos para gerar a comparação.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
