"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import {
  CASE_PHASE_LABELS, CASE_PHASE_COLORS, CASE_STATUS_LABELS, CASE_STATUS_COLORS,
  CASE_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  INVESTIGATION_TYPE_LABELS, INVESTIGATION_STATUS_LABELS, INVESTIGATION_STATUS_COLORS,
  SEARCH_SYSTEM_LABELS, SEARCH_SYSTEM_COLORS, SEARCH_STATUS_LABELS, SEARCH_STATUS_COLORS,
  ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS,
  COLLECTION_ACTION_TYPE_LABELS, ACTION_CATEGORY_LABELS, ACTION_CATEGORY_COLORS, ACTION_STATUS_LABELS,
  PENHORA_TYPE_LABELS, PENHORA_STATUS_LABELS,
  AGREEMENT_TYPE_LABELS, AGREEMENT_STATUS_LABELS, INSTALLMENT_STATUS_LABELS,
  DESCONSIDERACAO_TYPE_LABELS, DESCONSIDERACAO_TEORIA_LABELS, DESCONSIDERACAO_STATUS_LABELS,
  MONITORING_TYPE_LABELS, ALERT_TYPE_LABELS, ALERT_SEVERITY_LABELS, ALERT_SEVERITY_COLORS,
  EVENT_TYPE_LABELS,
  formatCurrency, getScoreColor, getScoreLabel, formatDateShort, daysFromNow,
  SEARCH_SYSTEMS, SEARCH_TYPES, COLLECTION_ACTION_TYPES, ACTION_CATEGORIES, PENHORA_TYPES,
  AGREEMENT_TYPES, DESCONSIDERACAO_TYPES, DESCONSIDERACAO_TEORIAS, MONITORING_TYPES,
  MONITORING_SOURCES, MONITORING_FREQUENCIES, EVENT_TYPES, ALERT_SEVERITIES,
} from "@/lib/recovery-constants"
import { InvestigationWizard } from "@/components/recovery/investigation-wizard"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft, Plus, Shield, DollarSign, Target, Search, AlertTriangle, Eye,
  CheckCircle, Clock, FileText, Users, BarChart3, RefreshCw, Sparkles,
  Gavel, Scale, Handshake, Bell, TrendingUp, MapPin, Car, Home,
  Activity, ChevronRight, X, ExternalLink
} from "lucide-react"

// ---------------------------------------------------------------------------
// Score Gauge SVG
// ---------------------------------------------------------------------------
function ScoreGauge({ score, size = 64 }: { score: number | null | undefined; size?: number }) {
  const s = score ?? 0
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (s / 100) * circ
  const color = getScoreColor(s)
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center" fill={color} fontSize={size * 0.28} fontWeight="bold">
        {s}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
interface RecoveryDetailProps { caseId: string }

export function RecoveryDetail({ caseId }: RecoveryDetailProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  // Data
  const { data: caseData, isLoading } = trpc.recovery.cases.getById.useQuery({ id: caseId })
  const { data: eventsData } = trpc.recovery.events.list.useQuery({ recovery_case_id: caseId, pageSize: 100 })

  // Dialogs
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showPenhoraDialog, setShowPenhoraDialog] = useState(false)
  const [showAgreementDialog, setShowAgreementDialog] = useState(false)
  const [showIncidentDialog, setShowIncidentDialog] = useState(false)
  const [showMonitoringDialog, setShowMonitoringDialog] = useState(false)
  const [showInvestigationWizard, setShowInvestigationWizard] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  // Event form
  const [eventForm, setEventForm] = useState({ tipo: "NOTA", descricao: "", data: new Date().toISOString().slice(0, 10), valor_mencionado: "" })
  // Action form
  const [actionForm, setActionForm] = useState({ tipo: "NOTIFICACAO_EXTRAJUDICIAL", categoria: "EXTRAJUDICIAL", descricao: "", data_acao: new Date().toISOString().slice(0, 10), status: "PLANEJADA", valor_envolvido: "" })
  // Search form
  const [searchForm, setSearchForm] = useState({ sistema: "SISBAJUD", tipo_consulta: "INFORMACAO", cpf_cnpj_consultado: "", observacoes: "" })
  // Penhora form
  const [penhoraForm, setPenhoraForm] = useState({ tipo: "ONLINE_SISBAJUD", valor_solicitado: "", data_solicitacao: new Date().toISOString().slice(0, 10), observacoes: "" })
  // Agreement form
  const [agreementForm, setAgreementForm] = useState({ tipo: "PARCELAMENTO", valor_divida_original: "", valor_acordo: "", desconto_percentual: "", entrada: "", parcelas: "12", valor_parcela: "", data_proposta: new Date().toISOString().slice(0, 10) })
  // Incident form
  const [incidentForm, setIncidentForm] = useState({ tipo: "DIRETA", teoria: "MAIOR_CC50", hipotese: "CONFUSAO_PATRIMONIAL", fundamento_legal: "Art. 50 do Código Civil", alvos: "[]" })
  // Monitoring form
  const [monitoringForm, setMonitoringForm] = useState({ tipo: "PROCESSO_JUDICIAL", fonte: "DATAJUD", frequencia: "DIARIO" })

  // Mutations
  const createEvent = trpc.recovery.events.create.useMutation({
    onSuccess: () => { utils.recovery.events.list.invalidate(); utils.recovery.cases.getById.invalidate(); setShowEventDialog(false) }
  })
  const createAction = trpc.recovery.actions.create.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate(); setShowActionDialog(false) }
  })
  const createSearch = trpc.recovery.searches.create.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate(); setShowSearchDialog(false) }
  })
  const createPenhora = trpc.recovery.penhoras.create.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate(); setShowPenhoraDialog(false) }
  })
  const createAgreement = trpc.recovery.agreements.create.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate(); setShowAgreementDialog(false) }
  })
  const createIncident = trpc.recovery.desconsideracao.create.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate(); setShowIncidentDialog(false) }
  })
  const createMonitoring = trpc.recovery.monitoring.create.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate(); setShowMonitoringDialog(false) }
  })
  const markAlertRead = trpc.recovery.alerts.markRead.useMutation({
    onSuccess: () => { utils.recovery.cases.getById.invalidate() }
  })

  // AI Analysis
  const handleAnalyzeAI = async () => {
    setAiAnalyzing(true)
    try {
      await fetch("/api/ai/recovery/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCaseId: caseId, type: "scoring" }),
      })
      utils.recovery.cases.getById.invalidate()
    } catch { /* ignore */ }
    setAiAnalyzing(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="size-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Caso não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/recuperacao-credito")}>
          <ArrowLeft className="size-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const c = caseData as Record<string, any>
  const events = (eventsData as any)?.items ?? []
  const investigations = c.investigacoes ?? []
  const allAssets = c.bens ?? []
  const allActions = c.acoes_cobranca ?? []
  const allPenhoras = c.penhoras ?? []
  const allAgreements = c.acordos ?? []
  const allIncidents = c.incidentes_desconsidera ?? []
  const allMonitorings = c.monitoramentos ?? []
  const allJointDebtors = c.devedores_solidarios ?? []
  const recoveryPct = c.valor_total_execucao ? ((c.valor_recuperado ?? 0) / c.valor_total_execucao * 100) : 0

  // Flatten searches from investigations
  const allSearches = investigations.flatMap((inv: any) => (inv.buscas ?? []).map((b: any) => ({ ...b, investigationCode: inv.codigo })))

  // Flatten alerts
  const allAlerts = allMonitorings.flatMap((m: any) => (m.alertas ?? []).map((a: any) => ({ ...a, monitoringTipo: m.tipo })))

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/recuperacao-credito")}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#2A2A2A]">{c.titulo}</h1>
            <Badge style={{ backgroundColor: CASE_PHASE_COLORS[c.fase] ?? "#6B7280", color: "#fff" }}>
              {CASE_PHASE_LABELS[c.fase] ?? c.fase}
            </Badge>
            <Badge variant="outline" style={{ borderColor: CASE_STATUS_COLORS[c.status] ?? "#6B7280", color: CASE_STATUS_COLORS[c.status] ?? "#6B7280" }}>
              {CASE_STATUS_LABELS[c.status] ?? c.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{c.codigo} • Devedor: <span className="font-medium text-[#2A2A2A]">{c.devedor_nome ?? c.person?.nome ?? "—"}</span> • {c.devedor_cpf_cnpj ?? c.person?.cpf_cnpj ?? ""}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Recuperado:</span>
            <Progress value={recoveryPct} className="h-2 w-40" />
            <span className="text-xs font-medium">{recoveryPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ScoreGauge score={c.score_recuperacao} size={72} />
          <div className="text-center">
            <p className="text-xs text-gray-500">Score</p>
            <p className="font-bold text-lg" style={{ color: getScoreColor(c.score_recuperacao ?? 0) }}>
              {getScoreLabel(c.score_recuperacao ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Value cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white"><CardContent className="p-3">
          <p className="text-xs text-gray-500">Total Execução</p>
          <p className="text-lg font-bold text-[#2A2A2A]">{formatCurrency(c.valor_total_execucao)}</p>
        </CardContent></Card>
        <Card className="bg-white"><CardContent className="p-3">
          <p className="text-xs text-gray-500">Bloqueado</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(c.valor_bloqueado)}</p>
        </CardContent></Card>
        <Card className="bg-white"><CardContent className="p-3">
          <p className="text-xs text-gray-500">Penhorado</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(c.valor_penhorado)}</p>
        </CardContent></Card>
        <Card className="bg-white"><CardContent className="p-3">
          <p className="text-xs text-gray-500">Recuperado</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(c.valor_recuperado)}</p>
        </CardContent></Card>
      </div>

      {/* AI Bar */}
      <Card className="bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E] text-white">
        <CardContent className="p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#C9A961]" />
            <span className="text-xs text-gray-300">Estratégia IA:</span>
            <span className="text-sm">{c.estrategia_ia ? (c.estrategia_ia as string).slice(0, 120) + "..." : "Nenhuma análise ainda"}</span>
          </div>
          {c.proxima_acao && (
            <div className="flex items-center gap-2 ml-auto">
              <Clock className="size-3 text-[#C9A961]" />
              <span className="text-xs">{c.proxima_acao}</span>
            </div>
          )}
          <Button size="sm" variant="outline" className="border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961]/10"
            onClick={handleAnalyzeAI} disabled={aiAnalyzing}>
            <RefreshCw className={`size-3 mr-1 ${aiAnalyzing ? "animate-spin" : ""}`} />
            {aiAnalyzing ? "Analisando..." : "Atualizar IA"}
          </Button>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setShowEventDialog(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
          <Plus className="size-3 mr-1" /> Registrar Evento
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowActionDialog(true)}>
          <Gavel className="size-3 mr-1" /> Nova Ação
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowInvestigationWizard(true)}>
          <Search className="size-3 mr-1" /> Nova Investigação
        </Button>
        <Button size="sm" variant="outline" onClick={handleAnalyzeAI} disabled={aiAnalyzing}>
          <Sparkles className="size-3 mr-1" /> Analisar com IA
        </Button>
      </div>

      {/* 8 TABS */}
      <Tabs defaultValue="visao_geral" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="w-full justify-start bg-gray-100 h-auto flex-wrap">
            <TabsTrigger value="visao_geral" className="text-xs">Visão Geral</TabsTrigger>
            <TabsTrigger value="investigacao" className="text-xs">Investigação</TabsTrigger>
            <TabsTrigger value="buscas" className="text-xs">Buscas</TabsTrigger>
            <TabsTrigger value="acoes" className="text-xs">Ações</TabsTrigger>
            <TabsTrigger value="penhoras" className="text-xs">Penhoras</TabsTrigger>
            <TabsTrigger value="acordos" className="text-xs">Acordos</TabsTrigger>
            <TabsTrigger value="fraude" className="text-xs">Fraude</TabsTrigger>
            <TabsTrigger value="monitoramento" className="text-xs">Monitoramento</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* TAB 1 — VISÃO GERAL */}
        <TabsContent value="visao_geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Info card */}
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dados do Crédito</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tipo:</span><span>{CASE_TYPE_LABELS[c.tipo] ?? c.tipo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Título:</span><span>{c.titulo_tipo ?? "—"} {c.titulo_numero ?? ""}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor Original:</span><span className="font-medium">{formatCurrency(c.valor_original)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor Atualizado:</span><span className="font-medium">{formatCurrency(c.valor_atualizado)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Honorários:</span><span>{formatCurrency(c.valor_honorarios)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Custas:</span><span>{formatCurrency(c.valor_custas)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Vencimento:</span><span>{formatDateShort(c.data_vencimento)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Prescrição:</span>
                  <span className={c.titulo_data_prescricao && daysFromNow(c.titulo_data_prescricao) !== null && (daysFromNow(c.titulo_data_prescricao) ?? 999) < 90 ? "text-red-600 font-medium" : ""}>
                    {formatDateShort(c.titulo_data_prescricao)} {c.titulo_data_prescricao ? `(${daysFromNow(c.titulo_data_prescricao)} dias)` : ""}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Prioridade:</span>
                  <Badge style={{ backgroundColor: PRIORITY_COLORS[c.prioridade] ?? "#6B7280", color: "#fff" }} className="text-xs">
                    {PRIORITY_LABELS[c.prioridade] ?? c.prioridade}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Devedor card */}
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Devedor</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Nome:</span><span className="font-medium">{c.devedor_nome ?? c.person?.nome ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CPF/CNPJ:</span><span>{c.devedor_cpf_cnpj ?? c.person?.cpf_cnpj ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tipo:</span><span>{c.devedor_tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Atividade:</span><span>{c.devedor_atividade ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Endereço:</span><span className="text-right max-w-[200px] truncate">{c.devedor_endereco ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Telefone:</span><span>{c.devedor_telefone ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">E-mail:</span><span>{c.devedor_email ?? "—"}</span></div>
                {c.person_id && (
                  <Button variant="link" size="sm" className="p-0 text-[#C9A961]" onClick={() => router.push(`/pessoas/${c.person_id}`)}>
                    Ver cadastro completo <ExternalLink className="size-3 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Joint debtors */}
          {allJointDebtors.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="size-4" /> Corresponsáveis ({allJointDebtors.length})</CardTitle></CardHeader>
              <CardContent>
                <Table><TableHeader><TableRow>
                  <TableHead className="text-xs">Nome</TableHead><TableHead className="text-xs">CPF/CNPJ</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead><TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Patrimônio Est.</TableHead>
                </TableRow></TableHeader><TableBody>
                  {allJointDebtors.map((jd: any) => (
                    <TableRow key={jd.id}><TableCell className="text-xs">{jd.nome}</TableCell>
                      <TableCell className="text-xs">{jd.cpf_cnpj ?? "—"}</TableCell>
                      <TableCell className="text-xs">{jd.tipo_responsabilidade}</TableCell>
                      <TableCell className="text-xs">{jd.status}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(jd.patrimonio_estimado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </CardContent>
            </Card>
          )}

          {/* AI Strategy */}
          {c.estrategia_ia && (
            <Card className="border-[#C9A961]/30"><CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="size-4 text-[#C9A961]" /> Análise Estratégica IA</CardTitle>
            </CardHeader><CardContent>
              <p className="text-sm whitespace-pre-wrap">{c.estrategia_ia}</p>
            </CardContent></Card>
          )}

          {/* Recent events */}
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="size-4" /> Últimos Eventos</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? <p className="text-sm text-gray-400">Nenhum evento registrado</p> : (
                <div className="space-y-2">
                  {events.slice(0, 10).map((ev: any) => (
                    <div key={ev.id} className="flex items-start gap-3 border-b border-gray-100 pb-2">
                      <div className="w-16 text-xs text-gray-400 pt-0.5">{formatDateShort(ev.data)}</div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{EVENT_TYPE_LABELS[ev.tipo] ?? ev.tipo}</Badge>
                      <p className="text-xs flex-1">{ev.descricao}</p>
                      {ev.sentimento && (
                        <Badge className={`text-[10px] ${ev.sentimento === "POSITIVO" ? "bg-green-100 text-green-700" : ev.sentimento === "NEGATIVO" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                          {ev.sentimento}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 — INVESTIGAÇÃO */}
        <TabsContent value="investigacao" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Investigações Patrimoniais</h3>
            <Button size="sm" onClick={() => setShowInvestigationWizard(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
              <Plus className="size-3 mr-1" /> Nova Investigação
            </Button>
          </div>

          {investigations.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">
              <Search className="size-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma investigação realizada</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {investigations.map((inv: any) => (
                <Card key={inv.id}><CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{inv.codigo}</span>
                      <Badge style={{ backgroundColor: INVESTIGATION_STATUS_COLORS[inv.status] ?? "#6B7280", color: "#fff" }} className="text-[10px]">
                        {INVESTIGATION_STATUS_LABELS[inv.status] ?? inv.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{INVESTIGATION_TYPE_LABELS[inv.tipo] ?? inv.tipo}</Badge>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateShort(inv.data_solicitacao)}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-gray-500">Bens encontrados:</span> <span className="font-medium">{inv.total_bens_encontrados ?? 0}</span></div>
                    <div><span className="text-gray-500">Valor total:</span> <span className="font-medium">{formatCurrency(inv.valor_total_estimado)}</span></div>
                    <div><span className="text-gray-500">Penhorável:</span> <span className="font-medium">{formatCurrency(inv.valor_penhoravel_estimado)}</span></div>
                    <div>
                      {inv.indicio_fraude && <Badge className="bg-red-100 text-red-700 text-[10px]">⚠ Fraude</Badge>}
                      {inv.indicio_ocultacao && <Badge className="bg-orange-100 text-orange-700 text-[10px] ml-1">⚠ Ocultação</Badge>}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}

          {/* Assets table */}
          {allAssets.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bens Encontrados ({allAssets.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table><TableHeader><TableRow>
                    <TableHead className="text-xs">Tipo</TableHead><TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Titular</TableHead><TableHead className="text-xs">Valor Est.</TableHead>
                    <TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Penhorável</TableHead>
                  </TableRow></TableHeader><TableBody>
                    {allAssets.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{ASSET_TYPE_LABELS[a.tipo] ?? a.tipo}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{a.descricao}</TableCell>
                        <TableCell className="text-xs">{a.titular_nome ?? "—"}</TableCell>
                        <TableCell className="text-xs font-medium">{formatCurrency(a.valor_estimado)}</TableCell>
                        <TableCell className="text-xs"><Badge style={{ backgroundColor: ASSET_STATUS_COLORS[a.status] ?? "#6B7280", color: "#fff" }} className="text-[10px]">{ASSET_STATUS_LABELS[a.status] ?? a.status}</Badge></TableCell>
                        <TableCell className="text-xs">{a.penhoravel ? "✅" : a.motivo_impenhoravel ? `❌ ${a.motivo_impenhoravel}` : "❌"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Red Flags */}
          {investigations.some((inv: any) => inv.red_flags) && (
            <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="size-4" /> Red Flags</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {investigations.flatMap((inv: any) => {
                  try { return Array.isArray(inv.red_flags) ? inv.red_flags : JSON.parse(inv.red_flags) } catch { return [] }
                }).map((rf: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500">{"⭐".repeat(rf.severidade ?? 1)}</span>
                    <div><p className="text-sm font-medium">{rf.tipo}</p><p className="text-xs text-gray-600">{rf.descricao}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3 — BUSCAS */}
        <TabsContent value="buscas" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Buscas Judiciais ({allSearches.length})</h3>
            <Button size="sm" onClick={() => { setSearchForm(p => ({ ...p, cpf_cnpj_consultado: c.devedor_cpf_cnpj ?? "" })); setShowSearchDialog(true) }} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
              <Plus className="size-3 mr-1" /> Nova Busca
            </Button>
          </div>

          {allSearches.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400"><p>Nenhuma busca registrada</p></CardContent></Card>
          ) : (
            <div className="overflow-x-auto">
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Sistema</TableHead><TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">CPF/CNPJ</TableHead><TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Valor Enc.</TableHead>
                <TableHead className="text-xs">Bloqueado</TableHead>
              </TableRow></TableHeader><TableBody>
                {allSearches.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><Badge style={{ backgroundColor: SEARCH_SYSTEM_COLORS[s.sistema] ?? "#6B7280", color: "#fff" }} className="text-[10px]">{SEARCH_SYSTEM_LABELS[s.sistema] ?? s.sistema}</Badge></TableCell>
                    <TableCell className="text-xs">{s.tipo_consulta}</TableCell>
                    <TableCell className="text-xs">{s.cpf_cnpj_consultado}</TableCell>
                    <TableCell className="text-xs">{formatDateShort(s.data_consulta)}</TableCell>
                    <TableCell><Badge style={{ backgroundColor: SEARCH_STATUS_COLORS[s.status] ?? "#6B7280", color: "#fff" }} className="text-[10px]">{SEARCH_STATUS_LABELS[s.status] ?? s.status}</Badge></TableCell>
                    <TableCell className="text-xs font-medium">{formatCurrency(s.valor_encontrado)}</TableCell>
                    <TableCell className="text-xs font-medium text-orange-600">{formatCurrency(s.valor_bloqueado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </div>
          )}

          {/* Teimosinha highlight */}
          {allSearches.some((s: any) => s.teimosinha_ativa) && (
            <Card className="border-blue-200 bg-blue-50"><CardContent className="p-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Teimosinha SISBAJUD Ativa</span>
                {allSearches.filter((s: any) => s.teimosinha_ativa).map((s: any) => (
                  <Badge key={s.id} className="bg-blue-600 text-white text-[10px]">{s.teimosinha_dias ?? 0} dias restantes • {s.teimosinha_reiteracoes ?? 0} reiterações</Badge>
                ))}
              </div>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* TAB 4 — AÇÕES DE COBRANÇA */}
        <TabsContent value="acoes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Ações de Cobrança ({allActions.length})</h3>
            <Button size="sm" onClick={() => setShowActionDialog(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
              <Plus className="size-3 mr-1" /> Nova Ação
            </Button>
          </div>

          {allActions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400"><p>Nenhuma ação registrada</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {allActions.sort((a: any, b: any) => new Date(b.data_acao).getTime() - new Date(a.data_acao).getTime()).map((act: any) => (
                <Card key={act.id}><CardContent className="p-3 flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-400">{formatDateShort(act.data_acao)}</div>
                  <Badge style={{ backgroundColor: ACTION_CATEGORY_COLORS[act.categoria] ?? "#6B7280", color: "#fff" }} className="text-[10px] shrink-0">
                    {ACTION_CATEGORY_LABELS[act.categoria] ?? act.categoria}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] shrink-0">{COLLECTION_ACTION_TYPE_LABELS[act.tipo] ?? act.tipo}</Badge>
                  <p className="text-xs flex-1 truncate">{act.descricao}</p>
                  <Badge variant="outline" className="text-[10px]">{ACTION_STATUS_LABELS[act.status] ?? act.status}</Badge>
                  {act.valor_envolvido && <span className="text-xs font-medium">{formatCurrency(act.valor_envolvido)}</span>}
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 5 — PENHORAS */}
        <TabsContent value="penhoras" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Penhoras ({allPenhoras.length})</h3>
            <Button size="sm" onClick={() => setShowPenhoraDialog(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
              <Plus className="size-3 mr-1" /> Registrar Penhora
            </Button>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Total Solicitado</p>
              <p className="text-lg font-bold">{formatCurrency(allPenhoras.reduce((s: number, p: any) => s + (p.valor_solicitado ?? 0), 0))}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Total Efetivado</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(allPenhoras.reduce((s: number, p: any) => s + (p.valor_efetivado ?? 0), 0))}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Excesso</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(allPenhoras.reduce((s: number, p: any) => s + (p.valor_excesso ?? 0), 0))}</p>
            </CardContent></Card>
          </div>

          {allPenhoras.map((p: any) => (
            <Card key={p.id}><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{PENHORA_TYPE_LABELS[p.tipo] ?? p.tipo}</Badge>
                  <Badge variant="outline" className="text-[10px]">{PENHORA_STATUS_LABELS[p.status] ?? p.status}</Badge>
                </div>
                <span className="text-xs text-gray-400">{formatDateShort(p.data_solicitacao)}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-gray-500">Solicitado:</span> <span className="font-medium">{formatCurrency(p.valor_solicitado)}</span></div>
                <div><span className="text-gray-500">Efetivado:</span> <span className="font-medium text-orange-600">{formatCurrency(p.valor_efetivado)}</span></div>
                {p.avaliacao_valor && <div><span className="text-gray-500">Avaliação:</span> <span className="font-medium">{formatCurrency(p.avaliacao_valor)}</span></div>}
                {p.asset && <div><span className="text-gray-500">Bem:</span> <span className="font-medium">{p.asset.descricao}</span></div>}
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* TAB 6 — ACORDOS */}
        <TabsContent value="acordos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Acordos ({allAgreements.length})</h3>
            <Button size="sm" onClick={() => setShowAgreementDialog(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
              <Plus className="size-3 mr-1" /> Novo Acordo
            </Button>
          </div>

          {allAgreements.map((ag: any) => (
            <Card key={ag.id}><CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{AGREEMENT_TYPE_LABELS[ag.tipo] ?? ag.tipo}</Badge>
                  <Badge className={`text-[10px] ${ag.status === "CUMPRIDO" ? "bg-green-600" : ag.status === "DESCUMPRIDO" ? "bg-red-600" : "bg-blue-600"} text-white`}>
                    {AGREEMENT_STATUS_LABELS[ag.status] ?? ag.status}
                  </Badge>
                </div>
                <span className="text-xs text-gray-400">{formatDateShort(ag.data_proposta)}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-gray-500">Dívida:</span> <span className="font-medium">{formatCurrency(ag.valor_divida_original)}</span></div>
                <div><span className="text-gray-500">Acordo:</span> <span className="font-medium text-green-600">{formatCurrency(ag.valor_acordo)}</span></div>
                <div><span className="text-gray-500">Desconto:</span> <span className="font-medium">{ag.desconto_percentual ? `${ag.desconto_percentual}%` : "—"}</span></div>
                <div><span className="text-gray-500">Parcelas:</span> <span className="font-medium">{ag.parcelas_pagas ?? 0}/{ag.parcelas ?? 0}</span></div>
              </div>
              {/* Installments */}
              {ag.parcelas_detalhes && ag.parcelas_detalhes.length > 0 && (
                <div className="overflow-x-auto mt-2">
                  <Table><TableHeader><TableRow>
                    <TableHead className="text-[10px]">#</TableHead><TableHead className="text-[10px]">Valor</TableHead>
                    <TableHead className="text-[10px]">Vencimento</TableHead><TableHead className="text-[10px]">Status</TableHead>
                    <TableHead className="text-[10px]">Pagamento</TableHead>
                  </TableRow></TableHeader><TableBody>
                    {ag.parcelas_detalhes.slice(0, 12).map((inst: any) => (
                      <TableRow key={inst.id}>
                        <TableCell className="text-[10px]">{inst.numero}</TableCell>
                        <TableCell className="text-[10px]">{formatCurrency(inst.valor)}</TableCell>
                        <TableCell className="text-[10px]">{formatDateShort(inst.data_vencimento)}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${inst.status === "PAGA" || inst.status === "PAGA_COM_ATRASO" ? "bg-green-100 text-green-700" : inst.status === "ATRASADA" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {INSTALLMENT_STATUS_LABELS[inst.status] ?? inst.status}
                        </Badge></TableCell>
                        <TableCell className="text-[10px]">{formatDateShort(inst.data_pagamento)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              )}
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* TAB 7 — FRAUDE E DESCONSIDERAÇÃO */}
        <TabsContent value="fraude" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Fraude e Desconsideração ({allIncidents.length})</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                fetch("/api/ai/recovery/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ recoveryCaseId: caseId, type: "fraud_detection" }) }).catch(() => {})
              }}>
                <Sparkles className="size-3 mr-1" /> Analisar Fraude com IA
              </Button>
              <Button size="sm" onClick={() => setShowIncidentDialog(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
                <Plus className="size-3 mr-1" /> Novo Incidente
              </Button>
            </div>
          </div>

          {allIncidents.map((inc: any) => (
            <Card key={inc.id} className="border-l-4" style={{ borderLeftColor: inc.status === "DEFERIDO" ? "#10B981" : inc.status === "INDEFERIDO" ? "#EF4444" : "#F59E0B" }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">{DESCONSIDERACAO_TYPE_LABELS[inc.tipo] ?? inc.tipo}</Badge>
                  <Badge variant="outline" className="text-[10px]">{DESCONSIDERACAO_TEORIA_LABELS[inc.teoria] ?? inc.teoria}</Badge>
                  <Badge variant="outline" className="text-[10px]">{DESCONSIDERACAO_STATUS_LABELS[inc.status] ?? inc.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-1"><span className="font-medium">Fundamento:</span> {inc.fundamento_legal}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Hipótese:</span> {inc.hipotese}</p>
                {inc.alvos && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Alvos:</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(inc.alvos) ? inc.alvos : []).map((alvo: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{alvo.nome} ({alvo.relacao})</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {inc.decisao_resumo && <p className="text-xs mt-2 p-2 bg-gray-50 rounded">{inc.decisao_resumo}</p>}
              </CardContent>
            </Card>
          ))}

          {allIncidents.length === 0 && (
            <Card><CardContent className="py-8 text-center text-gray-400">
              <Scale className="size-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhum incidente de desconsideração</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* TAB 8 — MONITORAMENTO */}
        <TabsContent value="monitoramento" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Monitoramento ({allMonitorings.length})</h3>
            <Button size="sm" onClick={() => setShowMonitoringDialog(true)} className="bg-[#C9A961] hover:bg-[#B8943F] text-white">
              <Plus className="size-3 mr-1" /> Novo Monitoramento
            </Button>
          </div>

          {/* Active monitorings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allMonitorings.map((m: any) => (
              <Card key={m.id} className={m.ativo ? "" : "opacity-50"}><CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{MONITORING_TYPE_LABELS[m.tipo] ?? m.tipo}</Badge>
                    <Badge className={`text-[10px] ${m.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Fonte: {m.fonte} • Freq: {m.frequencia}</p>
                  {m.ultima_verificacao && <p className="text-[10px] text-gray-400">Última: {formatDateShort(m.ultima_verificacao)}</p>}
                </div>
                {(m.alertas_pendentes ?? 0) > 0 && (
                  <Badge className="bg-red-600 text-white">{m.alertas_pendentes}</Badge>
                )}
              </CardContent></Card>
            ))}
          </div>

          {/* Alerts feed */}
          {allAlerts.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="size-4" /> Alertas ({allAlerts.filter((a: any) => !a.lido).length} não lidos)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {allAlerts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((alert: any) => (
                  <div key={alert.id} className={`flex items-start gap-3 p-2 rounded ${alert.lido ? "bg-gray-50" : "bg-yellow-50 border border-yellow-200"}`}>
                    <Badge style={{ backgroundColor: ALERT_SEVERITY_COLORS[alert.severidade] ?? "#6B7280", color: "#fff" }} className="text-[10px] shrink-0">
                      {ALERT_SEVERITY_LABELS[alert.severidade] ?? alert.severidade}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.titulo}</p>
                      <p className="text-xs text-gray-500">{alert.descricao}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDateShort(alert.created_at)} • {ALERT_TYPE_LABELS[alert.tipo] ?? alert.tipo}</p>
                    </div>
                    {!alert.lido && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => markAlertRead.mutate({ id: alert.id })}>
                        <CheckCircle className="size-3 mr-1" /> Lido
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= DIALOGS ================= */}

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Evento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo</Label>
              <Select value={eventForm.tipo} onValueChange={v => setEventForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Data</Label>
              <Input type="date" className="bg-[#F2F2F2]" value={eventForm.data} onChange={e => setEventForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Descrição</Label>
              <Textarea className="bg-[#F2F2F2]" rows={3} value={eventForm.descricao} onChange={e => setEventForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Valor mencionado (opcional)</Label>
              <Input type="number" className="bg-[#F2F2F2]" value={eventForm.valor_mencionado} onChange={e => setEventForm(p => ({ ...p, valor_mencionado: e.target.value }))} />
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={!eventForm.descricao || createEvent.isPending}
              onClick={() => createEvent.mutate({ recovery_case_id: caseId, tipo: eventForm.tipo, data: new Date(eventForm.data), descricao: eventForm.descricao, valor_mencionado: eventForm.valor_mencionado ? parseFloat(eventForm.valor_mencionado) : undefined })}>
              {createEvent.isPending ? "Salvando..." : "Registrar Evento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Ação de Cobrança</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo</Label>
              <Select value={actionForm.tipo} onValueChange={v => setActionForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{COLLECTION_ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{COLLECTION_ACTION_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Categoria</Label>
              <Select value={actionForm.categoria} onValueChange={v => setActionForm(p => ({ ...p, categoria: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_CATEGORIES.map(t => <SelectItem key={t} value={t}>{ACTION_CATEGORY_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Data</Label>
              <Input type="date" className="bg-[#F2F2F2]" value={actionForm.data_acao} onChange={e => setActionForm(p => ({ ...p, data_acao: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Descrição</Label>
              <Textarea className="bg-[#F2F2F2]" rows={3} value={actionForm.descricao} onChange={e => setActionForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Valor envolvido</Label>
              <Input type="number" className="bg-[#F2F2F2]" value={actionForm.valor_envolvido} onChange={e => setActionForm(p => ({ ...p, valor_envolvido: e.target.value }))} />
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={!actionForm.descricao || createAction.isPending}
              onClick={() => createAction.mutate({ recovery_case_id: caseId, tipo: actionForm.tipo, categoria: actionForm.categoria, data_acao: actionForm.data_acao ? new Date(actionForm.data_acao) : undefined, descricao: actionForm.descricao, status: actionForm.status, valor_envolvido: actionForm.valor_envolvido ? parseFloat(actionForm.valor_envolvido) : undefined })}>
              {createAction.isPending ? "Salvando..." : "Registrar Ação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Busca</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Sistema</Label>
              <Select value={searchForm.sistema} onValueChange={v => setSearchForm(p => ({ ...p, sistema: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{SEARCH_SYSTEMS.map(t => <SelectItem key={t} value={t}>{SEARCH_SYSTEM_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Tipo de Consulta</Label>
              <Select value={searchForm.tipo_consulta} onValueChange={v => setSearchForm(p => ({ ...p, tipo_consulta: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{SEARCH_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">CPF/CNPJ</Label>
              <Input className="bg-[#F2F2F2]" value={searchForm.cpf_cnpj_consultado} onChange={e => setSearchForm(p => ({ ...p, cpf_cnpj_consultado: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Observações</Label>
              <Textarea className="bg-[#F2F2F2]" rows={2} value={searchForm.observacoes} onChange={e => setSearchForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={!searchForm.cpf_cnpj_consultado || createSearch.isPending}
              onClick={() => {
                const invId = investigations[0]?.id
                if (!invId) return
                createSearch.mutate({ investigation_id: invId, sistema: searchForm.sistema, tipo_consulta: searchForm.tipo_consulta, cpf_cnpj_consultado: searchForm.cpf_cnpj_consultado, data_consulta: new Date(), status: "SOLICITADA", observacoes: searchForm.observacoes || undefined })
              }}>
              {createSearch.isPending ? "Salvando..." : "Registrar Busca"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Penhora Dialog */}
      <Dialog open={showPenhoraDialog} onOpenChange={setShowPenhoraDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Penhora</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo</Label>
              <Select value={penhoraForm.tipo} onValueChange={v => setPenhoraForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{PENHORA_TYPES.map(t => <SelectItem key={t} value={t}>{PENHORA_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Valor Solicitado</Label>
              <Input type="number" className="bg-[#F2F2F2]" value={penhoraForm.valor_solicitado} onChange={e => setPenhoraForm(p => ({ ...p, valor_solicitado: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Data Solicitação</Label>
              <Input type="date" className="bg-[#F2F2F2]" value={penhoraForm.data_solicitacao} onChange={e => setPenhoraForm(p => ({ ...p, data_solicitacao: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Observações</Label>
              <Textarea className="bg-[#F2F2F2]" rows={2} value={penhoraForm.observacoes} onChange={e => setPenhoraForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={createPenhora.isPending}
              onClick={() => createPenhora.mutate({ recovery_case_id: caseId, tipo: penhoraForm.tipo, status: "SOLICITADA", valor_solicitado: penhoraForm.valor_solicitado ? parseFloat(penhoraForm.valor_solicitado) : undefined, data_solicitacao: penhoraForm.data_solicitacao ? new Date(penhoraForm.data_solicitacao) : undefined, observacoes: penhoraForm.observacoes || undefined })}>
              {createPenhora.isPending ? "Salvando..." : "Registrar Penhora"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agreement Dialog */}
      <Dialog open={showAgreementDialog} onOpenChange={setShowAgreementDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Acordo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo</Label>
              <Select value={agreementForm.tipo} onValueChange={v => setAgreementForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{AGREEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{AGREEMENT_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Valor da Dívida</Label>
                <Input type="number" className="bg-[#F2F2F2]" value={agreementForm.valor_divida_original} onChange={e => setAgreementForm(p => ({ ...p, valor_divida_original: e.target.value }))} />
              </div>
              <div><Label className="text-xs">Valor do Acordo</Label>
                <Input type="number" className="bg-[#F2F2F2]" value={agreementForm.valor_acordo} onChange={e => setAgreementForm(p => ({ ...p, valor_acordo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Desconto %</Label>
                <Input type="number" className="bg-[#F2F2F2]" value={agreementForm.desconto_percentual} onChange={e => setAgreementForm(p => ({ ...p, desconto_percentual: e.target.value }))} />
              </div>
              <div><Label className="text-xs">Entrada</Label>
                <Input type="number" className="bg-[#F2F2F2]" value={agreementForm.entrada} onChange={e => setAgreementForm(p => ({ ...p, entrada: e.target.value }))} />
              </div>
              <div><Label className="text-xs">Parcelas</Label>
                <Input type="number" className="bg-[#F2F2F2]" value={agreementForm.parcelas} onChange={e => setAgreementForm(p => ({ ...p, parcelas: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={!agreementForm.valor_divida_original || !agreementForm.valor_acordo || createAgreement.isPending}
              onClick={() => createAgreement.mutate({ recovery_case_id: caseId, tipo: agreementForm.tipo, status: "PROPOSTA", valor_divida_original: parseFloat(agreementForm.valor_divida_original), valor_acordo: parseFloat(agreementForm.valor_acordo), desconto_percentual: agreementForm.desconto_percentual ? parseFloat(agreementForm.desconto_percentual) : undefined, entrada: agreementForm.entrada ? parseFloat(agreementForm.entrada) : undefined, parcelas: agreementForm.parcelas ? parseInt(agreementForm.parcelas) : undefined, data_proposta: new Date() })}>
              {createAgreement.isPending ? "Salvando..." : "Criar Acordo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Incidente de Desconsideração</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo</Label>
              <Select value={incidentForm.tipo} onValueChange={v => setIncidentForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{DESCONSIDERACAO_TYPES.map(t => <SelectItem key={t} value={t}>{DESCONSIDERACAO_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Teoria</Label>
              <Select value={incidentForm.teoria} onValueChange={v => setIncidentForm(p => ({ ...p, teoria: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{DESCONSIDERACAO_TEORIAS.map(t => <SelectItem key={t} value={t}>{DESCONSIDERACAO_TEORIA_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Fundamento Legal</Label>
              <Input className="bg-[#F2F2F2]" value={incidentForm.fundamento_legal} onChange={e => setIncidentForm(p => ({ ...p, fundamento_legal: e.target.value }))} />
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={createIncident.isPending}
              onClick={() => createIncident.mutate({ recovery_case_id: caseId, tipo: incidentForm.tipo, status: "ANALISE_VIABILIDADE", teoria: incidentForm.teoria || "MAIOR_CC50", fundamento_legal: incidentForm.fundamento_legal || "Art. 50, CC", hipotese: incidentForm.hipotese || "CONFUSAO_PATRIMONIAL" })}>
              {createIncident.isPending ? "Salvando..." : "Criar Incidente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monitoring Dialog */}
      <Dialog open={showMonitoringDialog} onOpenChange={setShowMonitoringDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Monitoramento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo</Label>
              <Select value={monitoringForm.tipo} onValueChange={v => setMonitoringForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONITORING_TYPES.map(t => <SelectItem key={t} value={t}>{MONITORING_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Fonte</Label>
              <Select value={monitoringForm.fonte} onValueChange={v => setMonitoringForm(p => ({ ...p, fonte: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONITORING_SOURCES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Frequência</Label>
              <Select value={monitoringForm.frequencia} onValueChange={v => setMonitoringForm(p => ({ ...p, frequencia: v }))}>
                <SelectTrigger className="bg-[#F2F2F2]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONITORING_FREQUENCIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-[#C9A961] hover:bg-[#B8943F] text-white" disabled={createMonitoring.isPending}
              onClick={() => createMonitoring.mutate({ recovery_case_id: caseId, tipo: monitoringForm.tipo, fonte: monitoringForm.fonte, frequencia: monitoringForm.frequencia })}>
              {createMonitoring.isPending ? "Salvando..." : "Criar Monitoramento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investigation Wizard Dialog */}
      <Dialog open={showInvestigationWizard} onOpenChange={setShowInvestigationWizard}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <InvestigationWizard
            recoveryCaseId={caseId}
            devedorNome={c.devedor_nome ?? c.person?.nome}
            devedorCpfCnpj={c.devedor_cpf_cnpj ?? c.person?.cpf_cnpj}
            devedorTipo={c.devedor_tipo}
            onClose={() => setShowInvestigationWizard(false)}
            onSuccess={() => { utils.recovery.cases.getById.invalidate(); setShowInvestigationWizard(false) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
