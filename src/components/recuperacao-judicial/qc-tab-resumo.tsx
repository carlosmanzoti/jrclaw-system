"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_CHART_COLORS,
  CREDIT_STATUS_LABELS,
  formatCentavos,
  formatPercentage,
} from "@/lib/rj-constants";
import { Users, DollarSign, TrendingDown, BarChart } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface QCTabResumoProps {
  jrcId: string;
}

export function QCTabResumo({ jrcId }: QCTabResumoProps) {
  const { data: summary, isLoading } = trpc.rj.creditors.summary.useQuery({ jrc_id: jrcId });
  const { data: jrc } = trpc.rj.cases.getById.useQuery({ id: jrcId });
  const { data: creditors } = trpc.rj.creditors.list.useQuery({ jrc_id: jrcId, limit: 500 });

  if (isLoading) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
        <Skeleton className="col-span-2 h-64" />
        <Skeleton className="col-span-2 h-64" />
      </div>
    );
  }

  if (!summary) return null;

  // KPI cards
  const kpis = [
    {
      title: "Total de Credores",
      value: summary.total_credores.toString(),
      icon: Users,
      description: `${Object.keys(summary.por_status).length} status diferentes`,
    },
    {
      title: "D\u00edvida Total",
      value: formatCentavos(summary.total_credito),
      icon: DollarSign,
      description: "Valor atualizado",
    },
    {
      title: "Des\u00e1gio M\u00e9dio",
      value: formatPercentage(summary.media_desagio),
      icon: TrendingDown,
      description: "M\u00e9dia ponderada do plano",
    },
    {
      title: "Classes",
      value: Object.keys(summary.por_classe).length.toString(),
      icon: BarChart,
      description: `de 4 classes previstas`,
    },
  ];

  // Donut chart data
  const donutData = Object.entries(summary.por_classe).map(([key, val]) => ({
    name: CREDIT_CLASS_SHORT_LABELS[key] || key,
    value: Number(val.valor) / 100,
    count: val.count,
    fill: CREDIT_CLASS_CHART_COLORS[key] || "#6b7280",
  }));

  // Top 10 creditors for bar chart
  const top10 = (creditors?.items || [])
    .sort((a, b) => Number(b.valor_atualizado) - Number(a.valor_atualizado))
    .slice(0, 10)
    .map((c) => ({
      nome: c.nome.length > 25 ? c.nome.substring(0, 25) + "..." : c.nome,
      valor: Number(c.valor_atualizado) / 100,
    }));

  // Status summary
  const statusData = Object.entries(summary.por_status).map(([key, count]) => ({
    status: CREDIT_STATUS_LABELS[key] || key,
    count,
  }));

  // Custom tooltip for Recharts
  const currencyFormatter = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut Chart - By Class */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribui\u00e7\u00e3o por Classe</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => currencyFormatter(Number(value))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Nenhum credor cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Creditors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 10 Maiores Credores</CardTitle>
          </CardHeader>
          <CardContent>
            {top10.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RechartsBarChart
                  data={top10}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => currencyFormatter(Number(value))} />
                  <Bar dataKey="valor" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Nenhum credor cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table by Class */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resumo por Classe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Classe</th>
                  <th className="pb-2 pr-4 text-right">Credores</th>
                  <th className="pb-2 pr-4 text-right">Valor Total</th>
                  <th className="pb-2 text-right">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.por_classe).map(([key, val]) => {
                  const pct = Number(summary.total_credito) > 0
                    ? (Number(val.valor) / Number(summary.total_credito)) * 100
                    : 0;
                  return (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={CREDIT_CLASS_CHART_COLORS[key] ? "" : ""}>
                          {CREDIT_CLASS_SHORT_LABELS[key] || key}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">{val.count}</td>
                      <td className="py-2 pr-4 text-right font-medium">{formatCentavos(val.valor)}</td>
                      <td className="py-2 text-right">{formatPercentage(pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="pt-2 pr-4">Total</td>
                  <td className="pt-2 pr-4 text-right">{summary.total_credores}</td>
                  <td className="pt-2 pr-4 text-right">{formatCentavos(summary.total_credito)}</td>
                  <td className="pt-2 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      {statusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Credores por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {statusData.map((s) => (
                <div key={s.status} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="text-sm font-medium">{s.count}</span>
                  <span className="text-xs text-muted-foreground">{s.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
