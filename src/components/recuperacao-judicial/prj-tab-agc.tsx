"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_CHART_COLORS,
  AGC_CHECKLIST_ITEMS,
  formatCentavos,
  formatPercentage,
} from "@/lib/rj-constants";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface PRJTabAGCProps {
  jrcId: string;
}

export function PRJTabAGC({ jrcId }: PRJTabAGCProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const { data: jrc, isLoading: loadingJrc } = trpc.rj.cases.getById.useQuery({ id: jrcId });
  const { data: summary, isLoading: loadingSummary } = trpc.rj.creditors.summary.useQuery({ jrc_id: jrcId });
  const { data: votingResult } = trpc.rj.voting.simulate.useQuery(
    { jrc_id: jrcId },
    { enabled: !!jrcId }
  );

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistProgress = AGC_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;
  const checklistTotal = AGC_CHECKLIST_ITEMS.length;

  const dataAGC = jrc?.data_agc;
  const daysUntilAGC = dataAGC
    ? Math.ceil((new Date(dataAGC).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const presenceData = votingResult
    ? [
        { name: "Presentes", value: votingResult.resumo.total_presentes, fill: "#3b82f6" },
        {
          name: "Ausentes",
          value: votingResult.resumo.total_credores - votingResult.resumo.total_presentes,
          fill: "#d1d5db",
        },
      ].filter((d) => d.value > 0)
    : [];

  if (loadingJrc || loadingSummary) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* AGC Header / Countdown */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CalendarDays className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold">Assembleia Geral de Credores</h2>
                {dataAGC ? (
                  <p className="text-sm text-muted-foreground">
                    Data: {new Date(dataAGC).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Data da AGC não definida</p>
                )}
              </div>
            </div>
            {daysUntilAGC !== null && (
              <div className="text-center">
                <p className={`text-3xl font-bold ${daysUntilAGC <= 7 ? "text-red-600" : daysUntilAGC <= 30 ? "text-amber-600" : "text-blue-600"}`}>
                  {daysUntilAGC > 0 ? daysUntilAGC : 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {daysUntilAGC > 0 ? "dias restantes" : daysUntilAGC === 0 ? "HOJE" : "dias atrás"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Credores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_credores || 0}</div>
            <p className="text-xs text-muted-foreground">
              {votingResult?.resumo.total_presentes || 0} confirmados presentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dívida Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? formatCentavos(summary.total_credito) : "—"}</div>
            <p className="text-xs text-muted-foreground">Valor atualizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checklist</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checklistProgress}/{checklistTotal}</div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${(checklistProgress / checklistTotal) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Plano</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jrc?.plano_aprovado ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-lg">Aprovado</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 text-lg">Pendente</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Versão {jrc?.plano_versao || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pre-AGC Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Checklist Pré-AGC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AGC_CHECKLIST_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => toggleChecklist(item.key)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                {checklist[item.key] ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                )}
                <span className={`text-sm ${checklist[item.key] ? "text-muted-foreground line-through" : ""}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Presence Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Presença Confirmada</CardTitle>
          </CardHeader>
          <CardContent>
            {presenceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={presenceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {presenceData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-3 space-y-2">
                  {Object.entries(votingResult?.por_classe || {}).map(([cls, r]) => (
                    <div key={cls} className="flex items-center justify-between">
                      <span className="text-xs">{CREDIT_CLASS_SHORT_LABELS[cls]}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.total_credores > 0 ? (r.presentes / r.total_credores) * 100 : 0}%`,
                              backgroundColor: CREDIT_CLASS_CHART_COLORS[cls] || "#6b7280",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {r.presentes}/{r.total_credores}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Sem dados de presença
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Voting Summary */}
      {votingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resultado da Votação (Simulação Atual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-3">
              {votingResult.plano_aprovado ? (
                <Badge className="bg-emerald-100 text-emerald-700">Plano Aprovado</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700">Plano Rejeitado</Badge>
              )}
              {!votingResult.plano_aprovado && votingResult.cram_down.viavel && (
                <Badge className="bg-purple-100 text-purple-700">Cram Down Viável</Badge>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 text-left">Classe</th>
                    <th className="pb-2 pr-4 text-right">Presentes</th>
                    <th className="pb-2 pr-4 text-right">A Favor</th>
                    <th className="pb-2 pr-4 text-right">Contra</th>
                    <th className="pb-2 pr-4 text-right">Quorum Cabeça</th>
                    <th className="pb-2 pr-4 text-right">Quorum Valor</th>
                    <th className="pb-2 text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(votingResult.por_classe).map(([cls, r]) => (
                    <tr key={cls} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{CREDIT_CLASS_SHORT_LABELS[cls]}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">{r.presentes}/{r.total_credores}</td>
                      <td className="py-2 pr-4 text-right text-emerald-600">{r.votos_favor_cabecas}</td>
                      <td className="py-2 pr-4 text-right text-red-600">{r.votos_contra_cabecas}</td>
                      <td className="py-2 pr-4 text-right">{formatPercentage(r.quorum_cabecas)}</td>
                      <td className="py-2 pr-4 text-right">{formatPercentage(r.quorum_valor)}</td>
                      <td className="py-2 text-center">
                        {r.presentes === 0 ? (
                          <Badge variant="outline">N/A</Badge>
                        ) : r.aprovado ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Aprovado</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Rejeitado</Badge>
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

      {/* Warnings */}
      {votingResult && !votingResult.plano_aprovado && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {votingResult.resumo.classes_rejeitadas > 0 && (
              <p className="text-xs text-amber-700">
                {votingResult.resumo.classes_rejeitadas} classe(s) rejeitou(aram) o plano.
                {votingResult.cram_down.viavel
                  ? " O cram down (Art. 58) pode ser viável."
                  : " O cram down (Art. 58) NÃO é viável nas condições atuais."}
              </p>
            )}
            {votingResult.pivotal_creditors.length > 0 && (
              <p className="text-xs text-amber-700">
                Há {votingResult.pivotal_creditors.length} credor(es) pivotal(is) cujo voto pode alterar o resultado.
                Considere estratégias de negociação.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
