"use client";

import { useState } from "react";
import {
  Search,
  DollarSign,
  Shield,
  AlertTriangle,
  CreditCard,
  Zap,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── BRL formatter ──────────────────────────────────────────────
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const brlFull = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ── Amber palette for pie chart ────────────────────────────────
const AMBER_PALETTE = [
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#92400e",
  "#78350f",
  "#fbbf24",
  "#fcd34d",
  "#fde68a",
];

// ── Custom Recharts tooltip ────────────────────────────────────
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background p-2 shadow-sm text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-amber-600">{brlFull.format(payload[0].value)}</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background p-2 shadow-sm text-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-amber-600">{brlFull.format(payload[0].value)}</p>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function InvestigationDashboard() {
  const { data, isLoading, error } = trpc.investigation.getDashboardStats.useQuery({});

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertTriangle className="size-5 text-destructive" />
          <p className="text-sm text-destructive">
            Erro ao carregar dashboard de investigacao: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const raw = data as any ?? {};
  const stats = {
    totalInvestigations: raw.totalInvestigations ?? 0,
    trackedPatrimony: raw.totalPatrimonyTracked ?? 0,
    seizablePatrimony: 0,
    pendingAlerts: raw.pendingAlerts ?? 0,
    monthlyCost: raw.totalQueryCosts ?? 0,
    topProvider: "N/A",
    topDebtors: [] as { name: string; value: number }[],
    assetDistribution: (raw.assetSummary ?? []).map((s: any) => ({
      name: s.category,
      value: s.totalValue,
    })),
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Investigacoes"
          value={String(stats.totalInvestigations)}
          icon={Search}
          subtitle="em andamento e concluidas"
        />
        <KpiCard
          title="Patrimonio Rastreado"
          value={brl.format(stats.trackedPatrimony)}
          icon={DollarSign}
          subtitle="valor total descoberto"
        />
        <KpiCard
          title="Patrimonio Penhoravel"
          value={brl.format(stats.seizablePatrimony)}
          icon={Shield}
          subtitle="apto a constrição"
        />
        <KpiCard
          title="Alertas Pendentes"
          value={String(stats.pendingAlerts)}
          icon={AlertTriangle}
          subtitle="requerem atenção"
        />
        <KpiCard
          title="Custo Consultas (mes)"
          value={brlFull.format(stats.monthlyCost)}
          icon={CreditCard}
          subtitle="gasto com APIs"
        />
        <KpiCard
          title="Provider Mais Usado"
          value={stats.topProvider}
          icon={Zap}
          subtitle="neste periodo"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart — Top 5 debtors by patrimony */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top 5 Devedores por Patrimonio
            </CardTitle>
            <CardDescription>
              Patrimonio total rastreado por investigado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topDebtors && stats.topDebtors.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.topDebtors}
                  layout="vertical"
                  margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => brl.format(v)}
                    className="text-xs"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Nenhum dado disponivel
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart — Asset distribution by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribuicao de Ativos por Categoria
            </CardTitle>
            <CardDescription>
              Composicao patrimonial dos investigados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.assetDistribution && stats.assetDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.assetDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    label={({ name, percent }: any) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {stats.assetDistribution.map(
                      (_: { name: string; value: number }, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={AMBER_PALETTE[index % AMBER_PALETTE.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Nenhum dado disponivel
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
