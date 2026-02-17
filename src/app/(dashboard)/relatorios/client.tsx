"use client"

import { useState, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  Briefcase,
  Activity,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  Download,
  Save,
  Share2,
  ArrowRight,
  ArrowLeft,
  Mail,
  MessageCircle,
} from "lucide-react"
import { formatCurrency, CASE_TYPE_LABELS, ACTIVITY_TYPE_LABELS } from "@/lib/constants"
// Lazy import to avoid SSR issues with @react-pdf/renderer
const lazyDownloadReportPDF = async (...args: Parameters<typeof import("@/lib/pdf/generate-report-pdf")["downloadReportPDF"]>) => {
  const { downloadReportPDF } = await import("@/lib/pdf/generate-report-pdf")
  return downloadReportPDF(...args)
}
import type { ReportData } from "@/types/reports"

const STEPS = ["Cliente", "Período", "Preview", "Exportar"]
const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#06b6d4", "#f97316"]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center size-8 rounded-full text-xs font-medium ${
              i <= current ? "bg-primary text-primary-foreground" : "bg-muted text-[#666666]"
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-sm ${i <= current ? "font-medium" : "text-[#666666]"}`}>{step}</span>
          {i < STEPS.length - 1 && <ArrowRight className="size-4 text-[#666666] mx-1" />}
        </div>
      ))}
    </div>
  )
}

function KPICard({ icon: Icon, label, value, format }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; format?: "currency" | "percent" | "number" }) {
  const formatted = format === "currency"
    ? formatCurrency(value)
    : format === "percent"
      ? `${value}%`
      : value.toLocaleString("pt-BR")

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatted}</p>
            <p className="text-xs text-[#666666]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReportsPageClient() {
  const [step, setStep] = useState(0)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [nextSteps, setNextSteps] = useState("")
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data: clients } = trpc.reports.clientsForSelect.useQuery()
  const selectedClient = clients?.find((c) => c.id === selectedClientId)

  const { data: reportData, isLoading: reportLoading } = trpc.reports.generateData.useQuery(
    {
      person_id: selectedClientId,
      date_from: new Date(dateFrom),
      date_to: new Date(dateTo),
    },
    { enabled: step >= 2 && !!selectedClientId && !!dateFrom && !!dateTo }
  )

  const saveMutation = trpc.reports.saveSnapshot.useMutation({
    onSuccess: () => setStep(3),
  })

  // Period presets
  const setPreset = (preset: string) => {
    const now = new Date()
    let start: Date
    const end = now

    switch (preset) {
      case "month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        break
      case "quarter":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case "semester":
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case "year":
        start = new Date(now.getFullYear(), 0, 1)
        break
      default:
        return
    }

    setDateFrom(start.toISOString().slice(0, 10))
    setDateTo(end.toISOString().slice(0, 10))
  }

  const prazosPercent = reportData?.kpis
    ? reportData.kpis.prazos_total > 0
      ? Math.round((reportData.kpis.prazos_cumpridos / reportData.kpis.prazos_total) * 100)
      : 100
    : 0

  return (
    <div className="space-y-4">
      <StepIndicator current={step} />

      {/* STEP 1: Select Client */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Selecionar Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedClientId}
              onValueChange={(v) => {
                setSelectedClientId(v)
                setStep(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} {c.cpf_cnpj ? `(${c.cpf_cnpj})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Select Period */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Relatório para: {selectedClient?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset("month")}>Último mês</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("quarter")}>Último trimestre</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("semester")}>Último semestre</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("year")}>Ano corrente</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-1.5">
                <Label>De</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Até</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="size-4 mr-1" />Voltar
              </Button>
              <Button onClick={() => setStep(2)} disabled={!dateFrom || !dateTo}>
                Gerar Preview <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Preview */}
      {step === 2 && (
        <>
          {reportLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Action bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedClient?.nome}</h3>
                  <p className="text-xs text-[#666666]">
                    {new Date(dateFrom).toLocaleDateString("pt-BR")} — {new Date(dateTo).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-3 mr-1" />Voltar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      saveMutation.mutate({
                        person_id: selectedClientId,
                        period_start: new Date(dateFrom),
                        period_end: new Date(dateTo),
                        executive_summary: executiveSummary,
                        next_steps: nextSteps,
                        kpis_data: reportData.kpis as unknown as Record<string, unknown>,
                        report_data: reportData as unknown as Record<string, unknown>,
                      })
                    }}
                    disabled={saveMutation.isPending}
                  >
                    <Save className="size-3 mr-1" />
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={pdfLoading || !reportData}
                    onClick={async () => {
                      if (!reportData || !selectedClient) return
                      setPdfLoading(true)
                      try {
                        await lazyDownloadReportPDF({
                          data: reportData,
                          clientName: selectedClient.nome,
                          periodLabel: `${new Date(dateFrom).toLocaleDateString("pt-BR")} — ${new Date(dateTo).toLocaleDateString("pt-BR")}`,
                          executiveSummary,
                          nextSteps,
                        })
                      } finally {
                        setPdfLoading(false)
                      }
                    }}
                  >
                    <Download className="size-3 mr-1" />
                    {pdfLoading ? "Gerando..." : "Gerar PDF"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert("Em desenvolvimento")}
                  >
                    <Share2 className="size-3 mr-1" />
                    Compartilhar no Portal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert("Em desenvolvimento")}
                  >
                    <Mail className="size-3 mr-1" />
                    Enviar por E-mail
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert("Em desenvolvimento")}
                  >
                    <MessageCircle className="size-3 mr-1" />
                    Enviar por WhatsApp
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="visao-geral">
                <TabsList>
                  <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                  <TabsTrigger value="processos">Processos</TabsTrigger>
                  <TabsTrigger value="projetos">Projetos</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
                </TabsList>

                {/* VISAO GERAL */}
                <TabsContent value="visao-geral" className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard icon={Briefcase} label="Processos Ativos" value={reportData.kpis.processos_ativos} />
                    <KPICard icon={Activity} label="Atividades" value={reportData.kpis.atividades_realizadas} />
                    <KPICard icon={DollarSign} label="Valor em Disputas" value={reportData.kpis.valor_disputas} format="currency" />
                    <KPICard icon={Users} label="Reuniões" value={reportData.kpis.reunioes} />
                    <KPICard icon={FileText} label="Documentos" value={reportData.kpis.documentos_gerados} />
                    <KPICard icon={CheckCircle} label="Prazos Cumpridos" value={prazosPercent} format="percent" />
                    <KPICard icon={TrendingUp} label="Liberações" value={reportData.kpis.liberacoes} format="currency" />
                    <KPICard icon={FileText} label="E-mails Enviados" value={reportData.kpis.emails_enviados} />
                  </div>

                  {/* Executive Summary */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Resumo Executivo</CardTitle></CardHeader>
                    <CardContent>
                      <Textarea
                        value={executiveSummary}
                        onChange={(e) => setExecutiveSummary(e.target.value)}
                        placeholder="Escreva o resumo executivo do período..."
                        rows={4}
                      />
                    </CardContent>
                  </Card>

                  {/* Charts */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Activity bar chart */}
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Atividades por Mês</CardTitle></CardHeader>
                      <CardContent>
                        {reportData.grafico_atividades_mes.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={reportData.grafico_atividades_mes}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="mes" fontSize={12} />
                              <YAxis fontSize={12} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="peticoes" stackId="a" fill="#6366f1" name="Petições" />
                              <Bar dataKey="audiencias" stackId="a" fill="#a855f7" name="Audiências" />
                              <Bar dataKey="reunioes" stackId="a" fill="#22c55e" name="Reuniões" />
                              <Bar dataKey="diligencias" stackId="a" fill="#f59e0b" name="Diligências" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-[#666666] text-center py-8">Sem dados no período</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Value area chart */}
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Valor em Disputas</CardTitle></CardHeader>
                      <CardContent>
                        {reportData.grafico_valor_disputas_mes.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={reportData.grafico_valor_disputas_mes}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="mes" fontSize={12} />
                              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                              <Area type="monotone" dataKey="valor" fill="#6366f180" stroke="#6366f1" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-[#666666] text-center py-8">Sem dados no período</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Type distribution pie */}
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Processos por Tipo</CardTitle></CardHeader>
                      <CardContent>
                        {reportData.distribuicao_tipo.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={reportData.distribuicao_tipo}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }: { name?: string; percent?: number }) => `${CASE_TYPE_LABELS[name ?? ""] || name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                              >
                                {reportData.distribuicao_tipo.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-[#666666] text-center py-8">Sem dados</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Risk distribution */}
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Distribuição de Risco</CardTitle></CardHeader>
                      <CardContent>
                        {reportData.distribuicao_risco.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={reportData.distribuicao_risco}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label
                              >
                                {reportData.distribuicao_risco.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-[#666666] text-center py-8">Sem dados de risco</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* PROCESSOS */}
                <TabsContent value="processos" className="space-y-4 mt-4">
                  {reportData.processos.length === 0 ? (
                    <p className="text-sm text-[#666666] text-center py-8">Nenhum processo ativo no período.</p>
                  ) : (
                    reportData.processos.map((proc) => (
                      <Card key={proc.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-mono text-sm font-medium">{proc.numero}</p>
                              <p className="text-xs text-[#666666]">
                                {CASE_TYPE_LABELS[proc.tipo] || proc.tipo} — {proc.vara}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatCurrency(proc.valor)}</p>
                              <Badge variant="secondary" className="text-xs">{proc.status}</Badge>
                            </div>
                          </div>
                          {proc.fase && (
                            <p className="text-xs"><span className="text-[#666666]">Fase:</span> {proc.fase}</p>
                          )}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-muted rounded">
                              <p className="text-lg font-bold">{proc.movimentacoes_count}</p>
                              <p className="text-[10px] text-[#666666]">Movimentações</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-lg font-bold">{proc.prazos_cumpridos}/{proc.prazos_total}</p>
                              <p className="text-[10px] text-[#666666]">Prazos</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-lg font-bold">{proc.atividades.length}</p>
                              <p className="text-[10px] text-[#666666]">Atividades</p>
                            </div>
                          </div>
                          {proc.atividades.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-[#666666]">Atividades no período:</p>
                              {proc.atividades.map((a) => (
                                <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0">
                                  <span className="text-[#666666] font-mono w-20 shrink-0">
                                    {new Date(a.data).toLocaleDateString("pt-BR")}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {ACTIVITY_TYPE_LABELS[a.tipo] || a.tipo}
                                  </Badge>
                                  <span className="truncate">{a.title}</span>
                                  {a.priority >= 1 && <span>{a.priority >= 2 ? "🔥" : "⭐"}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* PROJETOS */}
                <TabsContent value="projetos" className="space-y-4 mt-4">
                  {reportData.projetos.length === 0 ? (
                    <p className="text-sm text-[#666666] text-center py-8">Nenhum projeto no período.</p>
                  ) : (
                    reportData.projetos.map((proj) => (
                      <Card key={proj.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{proj.codigo} — {proj.titulo}</p>
                            </div>
                            <Badge variant="secondary">{proj.status}</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Progresso</span>
                              <span className="font-medium">{proj.progresso}%</span>
                            </div>
                            <Progress value={proj.progresso} className="h-2" />
                          </div>
                          <p className="text-xs text-[#666666]">
                            Tarefas concluídas no período: {proj.tarefas_concluidas}/{proj.tarefas_total}
                          </p>
                          {proj.marcos.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-[#666666]">Marcos:</p>
                              {proj.marcos.map((m, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span>
                                    {m.status === "ALCANCADO" ? "✅" : m.status === "ATRASADO" ? "⏰" : "⏳"}
                                  </span>
                                  <span>{m.nome}</span>
                                  {m.data && (
                                    <span className="text-[#666666]">
                                      ({new Date(m.data).toLocaleDateString("pt-BR")})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* FINANCEIRO */}
                <TabsContent value="financeiro" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{formatCurrency(reportData.kpis.valor_disputas)}</p>
                        <p className="text-xs text-[#666666]">Total em Disputas</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#28A745]">{formatCurrency(reportData.kpis.liberacoes)}</p>
                        <p className="text-xs text-[#666666]">Já Liberado</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#C9A961]">
                          {formatCurrency(
                            reportData.valores
                              .filter((v) => v.status !== "LIBERADO" && v.status !== "CANCELADO")
                              .reduce((sum, v) => sum + v.valor, 0)
                          )}
                        </p>
                        <p className="text-xs text-[#666666]">Pendente</p>
                      </CardContent>
                    </Card>
                  </div>

                  {reportData.valores.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Número</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data Prevista</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.valores.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell><Badge variant="outline">{v.tipo}</Badge></TableCell>
                              <TableCell className="font-mono text-sm">{v.numero}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(v.valor)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={
                                    v.status === "LIBERADO" ? "bg-[#28A745]/10 text-[#28A745]" :
                                    v.status === "PENDENTE" ? "bg-[#C9A961]/10 text-[#C9A961]" :
                                    v.status === "BLOQUEADO" ? "bg-[#DC3545]/10 text-[#DC3545]" : ""
                                  }
                                >
                                  {v.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-[#666666]">
                                {v.data_prevista ? new Date(v.data_prevista).toLocaleDateString("pt-BR") : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-[#666666] text-center py-8">Nenhuma liberação financeira registrada.</p>
                  )}
                </TabsContent>

                {/* COMUNICACAO */}
                <TabsContent value="comunicacao" className="space-y-4 mt-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{reportData.kpis.emails_enviados}</p>
                        <p className="text-[10px] text-[#666666]">E-mails</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{reportData.kpis.relatorios_entregues}</p>
                        <p className="text-[10px] text-[#666666]">Relatórios</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{reportData.kpis.reunioes}</p>
                        <p className="text-[10px] text-[#666666]">Reuniões</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{reportData.kpis.comunicados}</p>
                        <p className="text-[10px] text-[#666666]">Comunicados</p>
                      </CardContent>
                    </Card>
                  </div>

                  {reportData.comunicacoes.length > 0 ? (
                    <div className="space-y-2">
                      {reportData.comunicacoes.map((com) => (
                        <div key={com.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="text-xs text-[#666666] font-mono w-20 shrink-0 pt-0.5">
                            {new Date(com.data).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {ACTIVITY_TYPE_LABELS[com.tipo] || com.tipo}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1">{com.title}</p>
                            {com.recipients.length > 0 && (
                              <p className="text-xs text-[#666666] mt-0.5">
                                Para: {com.recipients.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#666666] text-center py-8">Nenhuma comunicação no período.</p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Next Steps (fixed block at bottom) */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Próximos Passos</CardTitle></CardHeader>
                <CardContent>
                  <Textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="Descreva os próximos passos e plano de ação..."
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* STEP 4: Export */}
      {step === 3 && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="size-12 text-[#28A745] mx-auto" />
            <h3 className="text-lg font-semibold">Relatório Salvo</h3>
            <p className="text-sm text-[#666666]">
              O relatório de {selectedClient?.nome} foi salvo com sucesso.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => alert("Em desenvolvimento")}
              >
                <Share2 className="size-4 mr-1" />
                Compartilhar no Portal
              </Button>
              <Button
                disabled={pdfLoading || !reportData}
                onClick={async () => {
                  if (!reportData || !selectedClient) return
                  setPdfLoading(true)
                  try {
                    await lazyDownloadReportPDF({
                      data: reportData,
                      clientName: selectedClient.nome,
                      periodLabel: `${new Date(dateFrom).toLocaleDateString("pt-BR")} — ${new Date(dateTo).toLocaleDateString("pt-BR")}`,
                      executiveSummary,
                      nextSteps,
                    })
                  } finally {
                    setPdfLoading(false)
                  }
                }}
              >
                <Download className="size-4 mr-1" />
                {pdfLoading ? "Gerando..." : "Gerar PDF"}
              </Button>
              <Button
                variant="outline"
                onClick={() => alert("Em desenvolvimento")}
              >
                <Mail className="size-4 mr-1" />
                Enviar por E-mail
              </Button>
              <Button
                variant="outline"
                onClick={() => alert("Em desenvolvimento")}
              >
                <MessageCircle className="size-4 mr-1" />
                Enviar por WhatsApp
              </Button>
              <Button variant="outline" onClick={() => { setStep(0); setSelectedClientId(""); }}>
                Novo Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
