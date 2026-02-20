"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { NPSGauge } from "@/components/equipe/NPSGauge"
import {
  Plus,
  Copy,
  AlertTriangle,
  Loader2,
  Star,
  Mail,
  TrendingUp,
  Users,
  CheckCircle2,
  Filter,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

type NPSType = "NPS" | "CSAT" | "CES" | "FULL_FEEDBACK"

type TriggerMoment =
  | "ENCERRAMENTO_CASO"
  | "ACORDO_FECHADO"
  | "LIBERACAO_VALOR"
  | "MARCO_ALCANCADO"
  | "TRIMESTRAL"
  | "OUTRO"

interface NPSFormData {
  clientName: string
  client_name: string
  client_email: string
  client_company: string
  lawyer_id: string
  case_id: string
  type: NPSType | ""
  trigger_moment: TriggerMoment | ""
  send_by_email: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NPS_TYPE_LABELS: Record<NPSType, string> = {
  NPS: "NPS — Net Promoter Score",
  CSAT: "CSAT — Satisfação do Cliente",
  CES: "CES — Esforço do Cliente",
  FULL_FEEDBACK: "Completo (NPS + CSAT + CES)",
}

const TRIGGER_LABELS: Record<TriggerMoment, string> = {
  ENCERRAMENTO_CASO: "Encerramento do processo",
  ACORDO_FECHADO: "Acordo formalizado",
  LIBERACAO_VALOR: "Liberação de valores",
  MARCO_ALCANCADO: "Marco alcançado",
  TRIMESTRAL: "Revisão trimestral",
  OUTRO: "Outro",
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  PENDENTE: { label: "Aguardando", color: "bg-gray-100 text-gray-600 border-gray-200" },
  RESPONDIDO: {
    label: "Respondido",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  EXPIRADO: { label: "Expirado", color: "bg-red-100 text-red-600 border-red-200" },
}

function getNPSCategory(score: number): {
  label: string
  color: string
  bg: string
} {
  if (score >= 9)
    return { label: "Promotor", color: "text-green-700", bg: "bg-green-50" }
  if (score >= 7)
    return { label: "Neutro", color: "text-yellow-700", bg: "bg-yellow-50" }
  return { label: "Detrator", color: "text-red-700", bg: "bg-red-50" }
}

// ─── NPS Breakdown ────────────────────────────────────────────────────────────

function NPSBreakdown({
  promoters,
  passives,
  detractors,
  total,
}: {
  promoters: number
  passives: number
  detractors: number
  total: number
}) {
  const segments = [
    {
      label: "Promotores",
      count: promoters,
      pct: total > 0 ? (promoters / total) * 100 : 0,
      color: "bg-green-500",
      text: "text-green-700",
      range: "9–10",
    },
    {
      label: "Neutros",
      count: passives,
      pct: total > 0 ? (passives / total) * 100 : 0,
      color: "bg-yellow-400",
      text: "text-yellow-700",
      range: "7–8",
    },
    {
      label: "Detratores",
      count: detractors,
      pct: total > 0 ? (detractors / total) * 100 : 0,
      color: "bg-red-500",
      text: "text-red-700",
      range: "0–6",
    },
  ]

  return (
    <div className="space-y-2">
      {segments.map((s) => (
        <div key={s.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${s.text}`}>
              {s.label}{" "}
              <span className="text-gray-400 font-normal">({s.range})</span>
            </span>
            <span className="text-gray-600">
              {s.count} •{" "}
              <span className="font-semibold">{s.pct.toFixed(1)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${s.color}`}
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Nova Pesquisa Dialog ─────────────────────────────────────────────────────

function NovaPesquisaClienteDialog({
  open,
  onClose,
  members,
}: {
  open: boolean
  onClose: () => void
  members: Record<string, unknown>[]
}) {
  const utils = trpc.useUtils()

  const [form, setForm] = useState<NPSFormData>({
    clientName: "",
    client_name: "",
    client_email: "",
    client_company: "",
    lawyer_id: "",
    case_id: "",
    type: "",
    trigger_moment: "",
    send_by_email: false,
  })

  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = trpc.team.clientFeedback.create.useMutation({
    onSuccess: (data) => {
      utils.team.clientFeedback.list.invalidate(undefined)
      utils.team.clientFeedback.dashboard.invalidate(undefined)
      const link = (data as Record<string, unknown>).survey_link as string
      if (link) setGeneratedLink(link)
    },
  })

  function copyLink() {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setGeneratedLink(null)
    setCopied(false)
    setForm({
      clientName: "",
      client_name: "",
      client_email: "",
      client_company: "",
      lawyer_id: "",
      case_id: "",
      type: "",
      trigger_moment: "",
      send_by_email: false,
    })
    onClose()
  }

  const canSubmit =
    form.client_name.trim() &&
    form.client_email.trim() &&
    form.type &&
    form.trigger_moment

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Pesquisa de Satisfação</DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            {/* Client info */}
            <div className="space-y-1.5">
              <Label>Nome do cliente</Label>
              <Input
                placeholder="Nome completo ou empresa"
                value={form.client_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, client_name: e.target.value, clientName: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="cliente@empresa.com"
                  value={form.client_email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, client_email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input
                  placeholder="Razão social"
                  value={form.client_company}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, client_company: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Lawyer */}
            <div className="space-y-1.5">
              <Label>Advogado responsável</Label>
              <Select
                value={form.lawyer_id}
                onValueChange={(v) => setForm((p) => ({ ...p, lawyer_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar advogado" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id as string} value={m.id as string}>
                      {m.name as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo de pesquisa</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as NPSType }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NPS_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trigger */}
            <div className="space-y-1.5">
              <Label>Momento de disparo</Label>
              <Select
                value={form.trigger_moment}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    trigger_moment: v as TriggerMoment,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar momento" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Send by email */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <Mail className="size-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-[#374151]">Enviar por e-mail</p>
                <p className="text-xs text-gray-400">
                  O link será enviado automaticamente para o e-mail do cliente
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.send_by_email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, send_by_email: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 accent-[#C9A84C]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="size-5" />
              <p className="text-sm font-semibold">Pesquisa criada com sucesso</p>
            </div>
            <div className="space-y-2">
              <Label>Link da pesquisa</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="text-xs text-gray-600"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Compartilhe este link diretamente com o cliente ou use o envio por e-mail.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {generatedLink ? "Fechar" : "Cancelar"}
          </Button>
          {!generatedLink && (
            <Button
              className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
              onClick={() => createMutation.mutate({
                clientName: form.clientName || form.client_name,
                clientEmail: form.client_email || undefined,
                clientCompany: form.client_company || undefined,
                teamMemberId: form.lawyer_id || undefined,
                caseId: form.case_id || undefined,
                type: form.type as NPSType,
                triggerMoment: form.trigger_moment || undefined,
              })}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              Gerar Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Feedback Table ───────────────────────────────────────────────────────────

function FeedbackTable({
  feedbacks,
  onSaveFollowUp,
}: {
  feedbacks: Record<string, unknown>[]
  onSaveFollowUp: (id: string, note: string) => void
}) {
  const [filters, setFilters] = useState({
    minScore: "",
    maxScore: "",
    lawyerId: "",
  })
  const [followUpDraft, setFollowUpDraft] = useState<Record<string, string>>({})

  const filtered = feedbacks.filter((f) => {
    const score = f.nps_score as number | undefined
    if (filters.minScore && score !== undefined && score < Number(filters.minScore))
      return false
    if (filters.maxScore && score !== undefined && score > Number(filters.maxScore))
      return false
    if (filters.lawyerId && f.lawyer_id !== filters.lawyerId) return false
    return true
  })

  const uniqueLawyers = Array.from(
    new Set(feedbacks.map((f) => f.lawyer_id as string))
  )

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="size-4 text-gray-400 shrink-0" />
        <Input
          className="h-7 w-24 text-xs"
          placeholder="Score min"
          type="number"
          min={0}
          max={10}
          value={filters.minScore}
          onChange={(e) =>
            setFilters((p) => ({ ...p, minScore: e.target.value }))
          }
        />
        <Input
          className="h-7 w-24 text-xs"
          placeholder="Score max"
          type="number"
          min={0}
          max={10}
          value={filters.maxScore}
          onChange={(e) =>
            setFilters((p) => ({ ...p, maxScore: e.target.value }))
          }
        />
        <Select
          value={filters.lawyerId}
          onValueChange={(v) => setFilters((p) => ({ ...p, lawyerId: v }))}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Todos adv." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="" className="text-xs">
              Todos
            </SelectItem>
            {uniqueLawyers.map((id) => {
              const f = feedbacks.find((x) => x.lawyer_id === id)
              return (
                <SelectItem key={id} value={id} className="text-xs">
                  {(f?.lawyer_name as string) ?? id}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {(filters.minScore || filters.maxScore || filters.lawyerId) && (
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() =>
              setFilters({ minScore: "", maxScore: "", lawyerId: "" })
            }
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs">Advogado</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Score NPS</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-xs text-gray-400 py-8"
                >
                  Nenhum feedback encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => {
                const score = f.nps_score as number | undefined
                const cat =
                  score !== undefined ? getNPSCategory(score) : null
                const status = (f.status as string) ?? "PENDENTE"
                const statusConfig =
                  STATUS_CONFIG[status] ?? {
                    label: status,
                    color:
                      "bg-gray-100 text-gray-600 border-gray-200",
                  }
                const isDetractor = score !== undefined && score <= 6

                return (
                  <TableRow
                    key={f.id as string}
                    className={isDetractor ? "bg-red-50/40" : ""}
                  >
                    <TableCell className="text-xs font-medium text-[#374151]">
                      <div>
                        {f.client_name as string}
                        {(f.client_company as string) && (
                          <span className="block text-gray-400 font-normal">
                            {f.client_company as string}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {(f.lawyer_name as string) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {NPS_TYPE_LABELS[f.type as NPSType] ?? (f.type as string)}
                    </TableCell>
                    <TableCell>
                      {score !== undefined && cat ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${cat.color} ${cat.bg}`}
                        >
                          {score}{" "}
                          <span className="ml-1 font-normal text-[10px]">
                            {cat.label}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(f.created_at as string).toLocaleDateString(
                        "pt-BR"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {isDetractor ? (
                        <div className="space-y-1 min-w-[140px]">
                          {!f.follow_up_note ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="size-3" />
                              <span className="text-[10px] font-medium">
                                Follow-up pendente
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500 line-clamp-2">
                              {f.follow_up_note as string}
                            </p>
                          )}
                          <Textarea
                            rows={1}
                            className="text-[10px] resize-none h-7 min-h-0 py-1"
                            placeholder="Adicionar nota..."
                            value={followUpDraft[f.id as string] ?? ""}
                            onChange={(e) =>
                              setFollowUpDraft((p) => ({
                                ...p,
                                [f.id as string]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              const note = followUpDraft[f.id as string]
                              if (note?.trim()) {
                                onSaveFollowUp(f.id as string, note)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Lawyer Ranking ───────────────────────────────────────────────────────────

function LawyerNPSRanking({
  ranking,
}: {
  ranking: Record<string, unknown>[]
}) {
  const maxScore = Math.max(...ranking.map((r) => Math.abs(r.nps as number)), 1)

  const radarData = ranking
    .slice(0, 4)
    .flatMap((lawyer) => {
      const dims = (lawyer.csat_dimensions as Record<string, unknown>) ?? {}
      return Object.entries(dims).map(([subject, value]) => ({
        subject,
        [lawyer.name as string]: value,
      }))
    })

  // Group radar data by subject
  const radarBySubject: Record<string, Record<string, unknown>> = {}
  ranking.slice(0, 4).forEach((lawyer) => {
    const dims = (lawyer.csat_dimensions as Record<string, number>) ?? {}
    Object.entries(dims).forEach(([subject, value]) => {
      if (!radarBySubject[subject]) radarBySubject[subject] = { subject }
      radarBySubject[subject][lawyer.name as string] = value
    })
  })
  const radarDataMerged = Object.values(radarBySubject)

  const RADAR_COLORS = ["#C9A84C", "#3B82F6", "#10B981", "#EC4899"]

  return (
    <div className="space-y-6">
      {/* Horizontal NPS bars */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#374151]">
          NPS por Advogado
        </p>
        {ranking.map((r, idx) => {
          const score = r.nps as number
          const cat = getNPSCategory(score >= 9 ? 9 : score >= 7 ? 7 : 0)
          const pct = ((score + 100) / 200) * 100

          return (
            <div key={r.id as string} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-4 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="font-medium text-[#374151]">
                    {r.name as string}
                  </span>
                </div>
                <span className={`font-bold ${cat.color}`}>
                  {score > 0 ? `+${score}` : score}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-[#C9A84C]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                  {r.total_responses as number} resp.
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Radar chart */}
      {radarDataMerged.length > 0 && ranking.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#374151]">
            Comparativo CSAT por Dimensao
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarDataMerged}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fontSize: 9 }}
                />
                {ranking.slice(0, 4).map((r, idx) => (
                  <Radar
                    key={r.id as string}
                    name={r.name as string}
                    dataKey={r.name as string}
                    stroke={RADAR_COLORS[idx]}
                    fill={RADAR_COLORS[idx]}
                    fillOpacity={0.15}
                  />
                ))}
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {ranking.slice(0, 4).map((r, idx) => (
              <div key={r.id as string} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: RADAR_COLORS[idx] }}
                />
                <span className="text-xs text-gray-600">
                  {r.name as string}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function EquipeNPSTab() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: dashboard, isLoading: loadingDash } =
    trpc.team.clientFeedback.dashboard.useQuery({})

  const { data: feedbackList, isLoading: loadingList } =
    trpc.team.clientFeedback.list.useQuery({})

  const utils = trpc.useUtils()

  // We use a generic mutation approach for follow-up notes
  const updateFollowUpMutation = trpc.team.clientFeedback.create.useMutation({
    onSuccess: () => utils.team.clientFeedback.list.invalidate(undefined),
  })

  function handleSaveFollowUp(id: string, note: string) {
    // In production this would be a dedicated updateFollowUp mutation
    // For now we trigger list invalidation as a placeholder
    utils.team.clientFeedback.list.invalidate(undefined)
  }

  const isLoading = loadingDash || loadingList

  const dash = dashboard as Record<string, unknown> | undefined
  const feedbacks = ((feedbackList as unknown as { items: Record<string, unknown>[]; total: number } | undefined)?.items) ?? []
  const members = (dash?.members as Record<string, unknown>[]) ?? []
  const ranking = (dash?.lawyer_ranking as Record<string, unknown>[]) ?? []
  const trendData = (dash?.trend as Record<string, unknown>[]) ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#374151]">
            NPS do Cliente
          </h2>
          <p className="text-sm text-gray-500">
            Net Promoter Score, CSAT e satisfacao por advogado
          </p>
        </div>
        <Button
          className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4 mr-2" /> Nova Pesquisa
        </Button>
      </div>

      {/* Dashboard cards */}
      {dash && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                NPS Geral
              </CardTitle>
              <Star className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#374151]">
                {(dash.nps_score as number) > 0
                  ? `+${String(dash.nps_score)}`
                  : String(dash.nps_score)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {Number(dash.total_responses)} respostas totais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Promotores
              </CardTitle>
              <TrendingUp className="size-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {Number(dash.promoters)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(
                  ((dash.promoters as number) /
                    Math.max(dash.total_responses as number, 1)) *
                  100
                ).toFixed(1)}
                % do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Detratores
              </CardTitle>
              <AlertTriangle className="size-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {Number(dash.detractors)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(
                  ((dash.detractors as number) /
                    Math.max(dash.total_responses as number, 1)) *
                  100
                ).toFixed(1)}
                % — requerem follow-up
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gauge + Breakdown + Trend */}
      {dash && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gauge NPS</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <NPSGauge
                score={
                  ((dash.nps_score as number) + 100) / 2
                }
                maxScore={100}
                label={`NPS: ${(dash.nps_score as number) > 0 ? "+" : ""}${dash.nps_score}`}
              />
              <NPSBreakdown
                promoters={dash.promoters as number}
                passives={dash.passives as number}
                detractors={dash.detractors as number}
                total={dash.total_responses as number}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tendencia — 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 1 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f3f4f6"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[-100, 100]}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 6 }}
                        formatter={(v: unknown) => {
                          const n = Number(v)
                          return n > 0 ? `+${n}` : String(n)
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nps"
                        stroke="#C9A84C"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="NPS"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-gray-400">
                  Dados insuficientes para o grafico de tendencia.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="size-4" />
            Feedbacks recebidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Nenhum feedback registrado ainda.
            </div>
          ) : (
            <FeedbackTable
              feedbacks={feedbacks}
              onSaveFollowUp={handleSaveFollowUp}
            />
          )}
        </CardContent>
      </Card>

      {/* Lawyer NPS ranking */}
      {ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              Ranking NPS por Advogado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LawyerNPSRanking ranking={ranking} />
          </CardContent>
        </Card>
      )}

      <NovaPesquisaClienteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        members={members}
      />
    </div>
  )
}
