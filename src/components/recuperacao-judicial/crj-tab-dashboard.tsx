"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  CRJ_STATUS_LABELS,
  CRJ_STATUS_COLORS,
  CRJ_STATUS_ORDER,
  CRJ_EVENT_TYPE_LABELS,
  formatBRL,
  formatPercent,
  daysSince,
} from "@/lib/crj-constants";
import {
  Handshake,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Plus,
  RefreshCw,
  Send,
  Inbox,
  Users,
  Phone,
  Mail,
  MailOpen,
  FileText,
  MessageSquare,
  Bell,
  UserCheck,
} from "lucide-react";

// Icon map for event types
const EVENT_ICONS: Record<string, React.ReactNode> = {
  CRIACAO: <Plus className="h-3.5 w-3.5" />,
  MUDANCA_STATUS: <RefreshCw className="h-3.5 w-3.5" />,
  PROPOSTA_ENVIADA: <Send className="h-3.5 w-3.5" />,
  PROPOSTA_RECEBIDA: <Inbox className="h-3.5 w-3.5" />,
  REUNIAO: <Users className="h-3.5 w-3.5" />,
  LIGACAO: <Phone className="h-3.5 w-3.5" />,
  EMAIL_ENVIADO: <Mail className="h-3.5 w-3.5" />,
  EMAIL_RECEBIDO: <MailOpen className="h-3.5 w-3.5" />,
  DOCUMENTO_GERADO: <FileText className="h-3.5 w-3.5" />,
  ACORDO: <CheckCircle className="h-3.5 w-3.5" />,
  OBSERVACAO: <MessageSquare className="h-3.5 w-3.5" />,
  LEMBRETE: <Bell className="h-3.5 w-3.5" />,
  CONTATO_CREDOR: <UserCheck className="h-3.5 w-3.5" />,
};

interface CRJTabDashboardProps {
  jrcId: string;
}

export function CRJTabDashboard({ jrcId }: CRJTabDashboardProps) {
  const { data: dashboard, isLoading } =
    trpc.crjNeg.negotiations.dashboard.useQuery({ jrc_id: jrcId });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!dashboard || dashboard.total === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <Handshake className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold">Nenhuma negociação individual</h2>
          <p className="text-sm text-muted-foreground">
            Crie uma nova negociação ou importe credores do QGC (Quadro Geral de
            Credores) para começar a gerenciar as tratativas individuais.
          </p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Total de Negociações",
      value: dashboard.total.toString(),
      icon: Handshake,
      description: `${dashboard.active} ativa(s) | ${dashboard.concluded} concluída(s)`,
      color: "text-blue-600",
    },
    {
      title: "Crédito Total em Negociação",
      value: formatBRL(dashboard.totalCreditAmount),
      icon: DollarSign,
      description: `Proposto: ${formatBRL(dashboard.totalProposedAmount)}`,
      color: "text-emerald-600",
    },
    {
      title: "Taxa de Acordo",
      value: formatPercent(dashboard.agreementRate),
      icon: Target,
      description: `${dashboard.concluded} de ${dashboard.total} negociações`,
      color: "text-amber-600",
    },
    {
      title: "Deságio Médio",
      value: formatPercent(dashboard.avgDiscount),
      icon: TrendingUp,
      description: dashboard.totalAgreedAmount
        ? `Acordado: ${formatBRL(dashboard.totalAgreedAmount)}`
        : "Nenhum acordo fechado",
      color: "text-purple-600",
    },
  ];

  // Pipeline data: count per status
  const maxStatusCount = Math.max(
    ...CRJ_STATUS_ORDER.map((s) => dashboard.byStatus[s] || 0),
    1
  );

  // Identify negotiations needing attention
  const staleNegotiations = (dashboard.negotiations || []).filter((n) => {
    const days = daysSince(n.updated_at);
    return (
      days > 7 &&
      !["CONCLUIDA", "CANCELADA", "SUSPENSA"].includes(n.status)
    );
  });

  const upcomingDeadlines = (dashboard.negotiations || []).filter((n) => {
    if (!n.target_date) return false;
    const days = daysSince(n.target_date);
    return (
      days > -15 &&
      days < 1 &&
      !["CONCLUIDA", "CANCELADA"].includes(n.status)
    );
  });

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
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Horizontal Pipeline (Kanban-style) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pipeline de Negociações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 overflow-x-auto pb-2">
            {CRJ_STATUS_ORDER.map((status, i) => {
              const count = dashboard.byStatus[status] || 0;
              const barHeight = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
              const colorClass = CRJ_STATUS_COLORS[status] || "bg-gray-100 text-gray-700";
              const bgClass = colorClass.split(" ")[0];

              return (
                <div key={status} className="flex flex-col items-center">
                  <div className="flex min-w-[80px] flex-col items-center gap-1">
                    <span className="text-lg font-bold">{count}</span>
                    <div
                      className={`w-full rounded-t ${bgClass} transition-all`}
                      style={{ height: `${Math.max(barHeight, 8)}px`, minHeight: "8px" }}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                      {CRJ_STATUS_LABELS[status]}
                    </span>
                    {i < CRJ_STATUS_ORDER.length - 1 && (
                      <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Recent Activity + Next Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentEvents && dashboard.recentEvents.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      {EVENT_ICONS[event.type] || (
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {CRJ_EVENT_TYPE_LABELS[event.type] || event.type}
                        </Badge>
                        <span className="truncate text-xs font-medium">
                          {event.negotiation?.title}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {event.description}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {event.user?.name && <span>{event.user.name}</span>}
                        <span>
                          {new Date(event.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
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

        {/* Next Actions / Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Ações Necessárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Stale negotiations */}
              {staleNegotiations.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-medium text-amber-600">
                    <Clock className="h-3 w-3" />
                    Sem movimentação há +7 dias ({staleNegotiations.length})
                  </p>
                  <div className="space-y-1.5">
                    {staleNegotiations.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between rounded-md border px-3 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {n.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {n.creditor?.nome} — {daysSince(n.updated_at)} dias
                          </p>
                        </div>
                        <Badge
                          className={`shrink-0 text-[10px] ${
                            CRJ_STATUS_COLORS[n.status] || ""
                          }`}
                        >
                          {CRJ_STATUS_LABELS[n.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming deadlines */}
              {upcomingDeadlines.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-medium text-red-600">
                    <Target className="h-3 w-3" />
                    Prazo limite próximo ({upcomingDeadlines.length})
                  </p>
                  <div className="space-y-1.5">
                    {upcomingDeadlines.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between rounded-md border border-red-100 px-3 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {n.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {n.creditor?.nome}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium text-red-600">
                          {n.target_date
                            ? new Date(n.target_date).toLocaleDateString("pt-BR")
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staleNegotiations.length === 0 && upcomingDeadlines.length === 0 && (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                    <p>Nenhuma ação pendente</p>
                    <p className="text-xs">Todas as negociações estão em dia</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Status breakdown by class */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Distribuição por Classe de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.negotiations && dashboard.negotiations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Classe</th>
                    <th className="pb-2 pr-4 text-right">Qtd</th>
                    <th className="pb-2 pr-4 text-right">Crédito Total</th>
                    <th className="pb-2 pr-4 text-right">Proposto</th>
                    <th className="pb-2 pr-4 text-right">Acordado</th>
                    <th className="pb-2 text-right">Deságio Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const byClass: Record<
                      string,
                      {
                        count: number;
                        credit: bigint;
                        proposed: bigint;
                        agreed: bigint;
                        discountSum: number;
                        discountCount: number;
                      }
                    > = {};

                    for (const n of dashboard.negotiations) {
                      const cls = n.creditor?.classe || "OUTRO";
                      if (!byClass[cls]) {
                        byClass[cls] = {
                          count: 0,
                          credit: BigInt(0),
                          proposed: BigInt(0),
                          agreed: BigInt(0),
                          discountSum: 0,
                          discountCount: 0,
                        };
                      }
                      byClass[cls].count++;
                      byClass[cls].credit += BigInt(n.credit_amount?.toString() || "0");
                      if (n.proposed_amount) byClass[cls].proposed += BigInt(n.proposed_amount.toString());
                      if (n.agreed_amount) byClass[cls].agreed += BigInt(n.agreed_amount.toString());
                      if (n.discount_percentage != null) {
                        byClass[cls].discountSum += n.discount_percentage;
                        byClass[cls].discountCount++;
                      }
                    }

                    return Object.entries(byClass)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([cls, data]) => (
                        <tr key={cls} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium text-xs">{cls}</td>
                          <td className="py-2 pr-4 text-right">{data.count}</td>
                          <td className="py-2 pr-4 text-right">{formatBRL(data.credit)}</td>
                          <td className="py-2 pr-4 text-right">{formatBRL(data.proposed)}</td>
                          <td className="py-2 pr-4 text-right">{formatBRL(data.agreed)}</td>
                          <td className="py-2 text-right">
                            {data.discountCount > 0
                              ? formatPercent(data.discountSum / data.discountCount)
                              : "—"}
                          </td>
                        </tr>
                      ));
                  })()}
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
