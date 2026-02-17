"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  formatCentavos,
  NEGOTIATION_PHASE_LABELS,
  NEGOTIATION_PHASE_COLORS,
  NEGOTIATION_PHASE_ORDER,
  NEGOTIATION_PRIORITY_LABELS,
  NEGOTIATION_PRIORITY_COLORS,
  NEG_ACTIVITY_TYPE_LABELS,
} from "@/lib/rj-constants";
import { Handshake, Users, DollarSign, TrendingUp, Calendar, MessageSquare } from "lucide-react";

interface NegTabDashboardProps {
  jrcId: string;
}

export function NegTabDashboard({ jrcId }: NegTabDashboardProps) {
  const { data: dashboard, isLoading: loadingDashboard } =
    trpc.rj.negotiations.dashboard.useQuery({ jrc_id: jrcId });

  const { data: negotiations, isLoading: loadingNegotiations } =
    trpc.rj.negotiations.list.useQuery({ jrc_id: jrcId });

  const isLoading = loadingDashboard || loadingNegotiations;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!dashboard || dashboard.total_negotiations === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <Handshake className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold">Nenhuma negociação iniciada</h2>
          <p className="text-sm text-muted-foreground">
            Crie uma rodada de negociação na aba "Rodadas de Negociação" para
            começar a gerenciar as tratativas com credores desta recuperação judicial.
          </p>
        </div>
      </div>
    );
  }

  // KPI data
  const kpis = [
    {
      title: "Total Negociações",
      value: dashboard.total_negotiations.toString(),
      icon: Handshake,
      description: `${dashboard.parceiros} credor(es) parceiro(s)`,
    },
    {
      title: "Credores em Negociação",
      value: dashboard.total_credores.toString(),
      icon: Users,
      description: `${dashboard.total_acordados} acordo(s) fechado(s)`,
    },
    {
      title: "Valor Original Total",
      value: formatCentavos(dashboard.total_valor_original),
      icon: DollarSign,
      description: `Acordado: ${formatCentavos(dashboard.total_valor_acordado)}`,
    },
    {
      title: "Taxa de Acordo",
      value: `${dashboard.taxa_acordo.toFixed(1)}%`,
      icon: TrendingUp,
      description: `${dashboard.total_acordados} de ${dashboard.total_credores} credores`,
    },
  ];

  // Compute max pipeline value for bar scaling
  const maxPhaseCount = Math.max(
    ...NEGOTIATION_PHASE_ORDER.map((phase) => dashboard.by_phase[phase]?.count ?? 0),
    1
  );

  return (
    <div className="space-y-6 p-6">
      {/* Row 1: KPI Cards */}
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

      {/* Row 2: Pipeline + Recent Activities */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline by Phase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline de Negociações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {NEGOTIATION_PHASE_ORDER.map((phase) => {
                const phaseData = dashboard.by_phase[phase];
                const count = phaseData?.count ?? 0;
                const valor = phaseData?.valor ?? 0;
                const barWidth = maxPhaseCount > 0 ? (count / maxPhaseCount) * 100 : 0;

                return (
                  <div key={phase} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {NEGOTIATION_PHASE_LABELS[phase] || phase}
                      </span>
                      <span className="text-muted-foreground">
                        {count} neg. | {formatCentavos(valor)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          NEGOTIATION_PHASE_COLORS[phase]
                            ? NEGOTIATION_PHASE_COLORS[phase].replace("text-", "bg-").split(" ")[0]
                            : "bg-gray-400"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recent_activities.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recent_activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {NEG_ACTIVITY_TYPE_LABELS[activity.tipo] || activity.tipo}
                        </Badge>
                        <span className="truncate text-xs font-medium">
                          {activity.negotiation?.titulo}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {activity.descricao}
                      </p>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {new Date(activity.data_atividade).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Nenhuma atividade registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Negotiations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Negociações</CardTitle>
        </CardHeader>
        <CardContent>
          {negotiations && negotiations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Título</th>
                    <th className="pb-2 pr-4">Fase</th>
                    <th className="pb-2 pr-4">Prioridade</th>
                    <th className="pb-2 pr-4 text-right">Credores</th>
                    <th className="pb-2 pr-4 text-right">Valor</th>
                    <th className="pb-2 pr-4 text-right">Acordados</th>
                    <th className="pb-2">Data Limite</th>
                  </tr>
                </thead>
                <tbody>
                  {negotiations.map((neg) => (
                    <tr key={neg.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{neg.titulo}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          className={`text-xs ${
                            NEGOTIATION_PHASE_COLORS[neg.fase] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {NEGOTIATION_PHASE_LABELS[neg.fase] || neg.fase}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            NEGOTIATION_PRIORITY_COLORS[neg.prioridade] || ""
                          }`}
                        >
                          {NEGOTIATION_PRIORITY_LABELS[neg.prioridade] || neg.prioridade}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">{neg.total_credores}</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCentavos(neg.valor_total_original)}
                      </td>
                      <td className="py-2 pr-4 text-right">{neg.credores_acordados}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {neg.data_limite
                          ? new Date(neg.data_limite).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-[100px] items-center justify-center text-sm text-muted-foreground">
              Nenhuma negociação cadastrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
