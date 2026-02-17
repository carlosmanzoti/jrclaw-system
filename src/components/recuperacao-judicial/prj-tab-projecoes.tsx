"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Calculator,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatPercentage } from "@/lib/rj-constants";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

interface PRJTabProjecoesProps {
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

export function PRJTabProjecoes({ jrcId }: PRJTabProjecoesProps) {
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const { data: projection, isLoading } = trpc.rj.projections.runProjection.useQuery(
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

  return (
    <div className="space-y-6 p-6">
      {/* Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4" /> Parâmetros da Projeção
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
              <Label className="text-xs">Crescimento Anual (%)</Label>
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
              <Label className="text-xs">Anos de Projeção</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={params.anos_projecao}
                onChange={(e) => updateParam("anos_projecao", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CAPEX (% da Receita)</Label>
              <Input
                type="number"
                step="0.5"
                value={params.capex_percentual}
                onChange={(e) => updateParam("capex_percentual", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Capital de Giro (% da Receita)</Label>
              <Input
                type="number"
                step="0.5"
                value={params.capital_giro_pct}
                onChange={(e) => updateParam("capital_giro_pct", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taxa de Desconto (% a.a.)</Label>
              <Input
                type="number"
                step="0.5"
                value={params.taxa_desconto}
                onChange={(e) => updateParam("taxa_desconto", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IR + CSLL (%)</Label>
              <Input
                type="number"
                step="1"
                value={params.aliquota_ir}
                onChange={(e) => updateParam("aliquota_ir", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : projection ? (
        <>
          {/* DRE Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" /> DRE Projetada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projection.dre}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} tickFormatter={(v) => `Ano ${v}`} />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => currencyFormatter(Number(value))} />
                  <Legend />
                  <Bar dataKey="receita_liquida" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ebitda" name="EBITDA" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro_liquido" name="Lucro Líquido" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* DRE Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 pr-4 text-left">Item</th>
                      {projection.dre.map((d) => (
                        <th key={d.ano} className="pb-2 pr-2 text-right">Ano {d.ano}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "receita_liquida", label: "Receita Líquida" },
                      { key: "custos_despesas", label: "(-) Custos e Despesas" },
                      { key: "ebitda", label: "= EBITDA" },
                      { key: "depreciacao", label: "(-) Depreciação" },
                      { key: "ebit", label: "= EBIT" },
                      { key: "ir_csll", label: "(-) IR/CSLL" },
                      { key: "lucro_liquido", label: "= Lucro Líquido" },
                    ].map((item) => (
                      <tr key={item.key} className={`border-b ${item.key === "ebitda" || item.key === "lucro_liquido" ? "font-semibold" : ""}`}>
                        <td className="py-1.5 pr-4">{item.label}</td>
                        {projection.dre.map((d) => (
                          <td key={d.ano} className="py-1.5 pr-2 text-right">
                            {currencyFormatter((d as unknown as Record<string, number>)[item.key] || 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b">
                      <td className="py-1.5 pr-4">Margem EBITDA</td>
                      {projection.dre.map((d) => (
                        <td key={d.ano} className="py-1.5 pr-2 text-right">
                          {formatPercentage(d.margem_ebitda_pct)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" /> Fluxo de Caixa Livre vs. Serviço da Dívida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={projection.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} tickFormatter={(v) => `Ano ${v}`} />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => currencyFormatter(Number(value))} />
                  <Legend />
                  <Area type="monotone" dataKey="fluxo_caixa_livre" name="FCL" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="servico_divida" name="Serviço da Dívida" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="fluxo_apos_divida" name="FCL Após Dívida" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>

              {/* Cash Flow Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 pr-4 text-left">Item</th>
                      {projection.cashFlow.map((d) => (
                        <th key={d.ano} className="pb-2 pr-2 text-right">Ano {d.ano}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "ebitda", label: "EBITDA" },
                      { key: "ir_csll", label: "(-) IR/CSLL" },
                      { key: "capex", label: "(-) CAPEX" },
                      { key: "variacao_capital_giro", label: "(-) Var. Capital de Giro" },
                      { key: "fluxo_caixa_livre", label: "= Fluxo de Caixa Livre" },
                      { key: "servico_divida", label: "(-) Serviço da Dívida" },
                      { key: "fluxo_apos_divida", label: "= FCL Após Dívida" },
                    ].map((item) => (
                      <tr key={item.key} className={`border-b ${item.key === "fluxo_caixa_livre" || item.key === "fluxo_apos_divida" ? "font-semibold" : ""}`}>
                        <td className="py-1.5 pr-4">{item.label}</td>
                        {projection.cashFlow.map((d) => (
                          <td key={d.ano} className={`py-1.5 pr-2 text-right ${item.key === "fluxo_apos_divida" && (d as unknown as Record<string, number>)[item.key] < 0 ? "text-red-600" : ""}`}>
                            {currencyFormatter((d as unknown as Record<string, number>)[item.key] || 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* DSCR Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" /> DSCR (Debt Service Coverage Ratio)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={projection.dscr}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} tickFormatter={(v) => `Ano ${v}`} />
                  <YAxis domain={[0, "auto"]} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}x`} />
                  <Legend />
                  <ReferenceLine y={1.2} stroke="#f59e0b" strokeDasharray="5 5" label="Saudável (1.2x)" />
                  <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="5 5" label="Mínimo (1.0x)" />
                  <Line type="monotone" dataKey="dscr" name="DSCR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-3 grid gap-3 sm:grid-cols-3 md:grid-cols-5">
                {projection.dscr.map((d) => (
                  <div key={d.ano} className="rounded-lg border p-2 text-center">
                    <p className="text-xs text-muted-foreground">Ano {d.ano}</p>
                    <p className={`text-lg font-bold ${d.status === "SAUDAVEL" ? "text-emerald-600" : d.status === "ALERTA" ? "text-amber-600" : "text-red-600"}`}>
                      {d.dscr < 100 ? `${d.dscr.toFixed(2)}x` : ">100x"}
                    </p>
                    <Badge className={`text-[10px] ${d.status === "SAUDAVEL" ? "bg-emerald-100 text-emerald-700" : d.status === "ALERTA" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {d.status === "SAUDAVEL" ? "Saudável" : d.status === "ALERTA" ? "Alerta" : "Crítico"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
