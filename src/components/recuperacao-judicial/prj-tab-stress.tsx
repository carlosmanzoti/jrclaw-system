"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface PRJTabStressProps {
  jrcId: string;
}

const DEFAULT_PARAMS = {
  anos_projecao: 5,
  receita_ano_base: 10000000,
  taxa_crescimento: 5,
  margem_ebitda: 20,
  capex_percentual: 5,
  capital_giro_pct: 10,
  taxa_desconto: 12,
  aliquota_ir: 34,
};

export function PRJTabStress({ jrcId }: PRJTabStressProps) {
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const { data: stressData, isLoading: loadingStress } = trpc.rj.projections.stressTest.useQuery(
    { jrc_id: jrcId, params },
    { enabled: !!jrcId }
  );

  const { data: sensitivityData, isLoading: loadingSensitivity } = trpc.rj.projections.sensitivity.useQuery(
    { jrc_id: jrcId, params },
    { enabled: !!jrcId }
  );

  const currencyFormatter = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  const updateParam = (key: string, value: string) => {
    setParams((p) => ({ ...p, [key]: parseFloat(value) || 0 }));
  };

  const isLoading = loadingStress || loadingSensitivity;

  return (
    <div className="space-y-6 p-6">
      {/* Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" /> Parâmetros Base para Stress Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Receita Ano Base (R$)</Label>
              <Input
                type="number"
                value={params.receita_ano_base}
                onChange={(e) => updateParam("receita_ano_base", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Crescimento (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={params.taxa_crescimento}
                onChange={(e) => updateParam("taxa_crescimento", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margem EBITDA (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={params.margem_ebitda}
                onChange={(e) => updateParam("margem_ebitda", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Anos</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={params.anos_projecao}
                onChange={(e) => updateParam("anos_projecao", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {/* Stress Test Results */}
          {stressData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4" /> Cenários de Stress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stressData.stressTests.map((test) => (
                    <div
                      key={test.cenario}
                      className={`rounded-lg border p-4 ${test.viavel ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {test.viavel ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <h3 className="text-sm font-semibold">{test.cenario}</h3>
                            <p className="text-xs text-muted-foreground">{test.descricao}</p>
                          </div>
                        </div>
                        <Badge className={test.viavel ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                          {test.viavel ? "Viável" : "Inviável"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">DSCR Mínimo</p>
                          <p className={`text-sm font-bold ${test.dscr_minimo >= 1.0 ? "text-emerald-600" : "text-red-600"}`}>
                            {test.dscr_minimo < 100 ? `${test.dscr_minimo.toFixed(2)}x` : ">100x"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">FCL Mínimo</p>
                          <p className={`text-sm font-bold ${test.fluxo_caixa_minimo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {currencyFormatter(test.fluxo_caixa_minimo)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Anos Negativos</p>
                          <p className={`text-sm font-bold ${test.anos_negativos === 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {test.anos_negativos}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reverse Stress Test */}
          {stressData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4" /> Stress Reverso — Limites de Quebra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-xs text-muted-foreground">
                  Indica o quanto cada variável pode deteriorar antes que o plano se torne inviável (DSCR &lt; 1.0x).
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {stressData.reverseStress.map((rs) => (
                    <div key={rs.variavel} className="rounded-lg border p-4 text-center">
                      <p className="text-xs text-muted-foreground">{rs.variavel}</p>
                      <p className="mt-1 text-2xl font-bold text-red-600">
                        {rs.limite_quebra.toFixed(1)}{rs.unidade.includes("%") ? "%" : "pp"}
                      </p>
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Margem de Segurança</span>
                          <span>{rs.margem_seguranca.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full ${rs.margem_seguranca > 20 ? "bg-emerald-500" : rs.margem_seguranca > 10 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, rs.margem_seguranca * 2)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sensitivity Analysis Charts */}
          {sensitivityData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" /> Análise de Sensibilidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* DSCR Sensitivity */}
                  <div>
                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">DSCR Médio por Variação</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="variacao"
                          type="number"
                          domain={[-30, 30]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                        />
                        <YAxis domain={[0, "auto"]} />
                        <Tooltip formatter={(value) => `${Number(value).toFixed(2)}x`} />
                        <Legend />
                        <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="5 5" />
                        <Line data={sensitivityData.receita} type="monotone" dataKey="dscr_medio" name="Receita" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line data={sensitivityData.margem} type="monotone" dataKey="dscr_medio" name="Margem" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line data={sensitivityData.crescimento} type="monotone" dataKey="dscr_medio" name="Crescimento" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* NPV Sensitivity */}
                  <div>
                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">VPL por Variação</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="variacao"
                          type="number"
                          domain={[-30, 30]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                        />
                        <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                        <Tooltip formatter={(value) => currencyFormatter(Number(value))} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                        <Line data={sensitivityData.receita} type="monotone" dataKey="npv" name="Receita" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line data={sensitivityData.margem} type="monotone" dataKey="npv" name="Margem" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line data={sensitivityData.crescimento} type="monotone" dataKey="npv" name="Crescimento" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sensitivity Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 pr-4 text-left">Variável</th>
                        <th className="pb-2 pr-4 text-left">Variação</th>
                        <th className="pb-2 pr-4 text-right">DSCR Médio</th>
                        <th className="pb-2 pr-4 text-right">VPL</th>
                        <th className="pb-2 text-center">Viável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...sensitivityData.receita, ...sensitivityData.margem, ...sensitivityData.crescimento]
                        .filter((r) => r.variacao !== 0)
                        .sort((a, b) => a.dscr_medio - b.dscr_medio)
                        .slice(0, 12)
                        .map((r, i) => (
                          <tr key={`${r.variavel}-${r.variacao}-${i}`} className="border-b last:border-0">
                            <td className="py-1.5 pr-4">{r.variavel}</td>
                            <td className="py-1.5 pr-4">{r.variacao > 0 ? "+" : ""}{r.variacao}%</td>
                            <td className={`py-1.5 pr-4 text-right font-medium ${r.dscr_medio >= 1.0 ? "text-emerald-600" : "text-red-600"}`}>
                              {r.dscr_medio.toFixed(2)}x
                            </td>
                            <td className="py-1.5 pr-4 text-right">{currencyFormatter(r.npv)}</td>
                            <td className="py-1.5 text-center">
                              {r.aprovado ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="mx-auto h-4 w-4 text-red-500" />
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
