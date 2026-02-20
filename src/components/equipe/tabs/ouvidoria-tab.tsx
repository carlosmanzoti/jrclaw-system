"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TimelineVertical } from "@/components/equipe/TimelineVertical"
import { COMPLAINT_CATEGORY_LABELS } from "@/lib/constants/competencies"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Inbox,
  Loader2,
  MessageSquarePlus,
  ShieldAlert,
  Users,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplaintStatus =
  | "RECEIVED"
  | "UNDER_ANALYSIS"
  | "INVESTIGATING"
  | "ACTION_TAKEN"
  | "RESOLVED_COMPLAINT"
  | "DISMISSED"
  | "ARCHIVED_COMPLAINT"

type ComplaintSeverity = "LOW_SEV" | "MEDIUM_SEV" | "HIGH_SEV" | "CRITICAL_SEV"

type ComplaintCategory =
  | "ASSEDIO_MORAL"
  | "ASSEDIO_SEXUAL"
  | "DISCRIMINACAO"
  | "DESVIO_ETICO"
  | "CONFLITO_INTERESSES"
  | "IRREGULARIDADE_FINANCEIRA"
  | "CONDICOES_TRABALHO"
  | "RELACAO_INTERPESSOAL"
  | "SUGESTAO_MELHORIA"
  | "ELOGIO"
  | "OUTRO_COMPLAINT"

interface Complaint {
  id: string
  trackingCode: string
  category: string
  severity: ComplaintSeverity
  status: ComplaintStatus
  title: string
  description: string
  isAnonymous: boolean
  responsibleId?: string
  responsibleName?: string
  internalNotes?: string
  resolution?: string
  createdAt: string | Date
  updatedAt: string | Date
  timeline?: Array<{
    id: string
    date: string
    title: string
    description?: string
  }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PIPELINE: ComplaintStatus[] = [
  "RECEIVED",
  "UNDER_ANALYSIS",
  "INVESTIGATING",
  "ACTION_TAKEN",
  "RESOLVED_COMPLAINT",
  "DISMISSED",
  "ARCHIVED_COMPLAINT",
]

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  RECEIVED: "Recebida",
  UNDER_ANALYSIS: "Em Análise",
  INVESTIGATING: "Investigando",
  ACTION_TAKEN: "Providência",
  RESOLVED_COMPLAINT: "Resolvida",
  DISMISSED: "Indeferida",
  ARCHIVED_COMPLAINT: "Arquivada",
}

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  RECEIVED: "#6366F1",
  UNDER_ANALYSIS: "#F59E0B",
  INVESTIGATING: "#F97316",
  ACTION_TAKEN: "#3B82F6",
  RESOLVED_COMPLAINT: "#10B981",
  DISMISSED: "#9CA3AF",
  ARCHIVED_COMPLAINT: "#6B7280",
}

const SEVERITY_CONFIG: Record<
  ComplaintSeverity,
  { label: string; className: string }
> = {
  LOW_SEV: {
    label: "Baixa",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  MEDIUM_SEV: {
    label: "Média",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  HIGH_SEV: {
    label: "Alta",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  CRITICAL_SEV: {
    label: "Crítica",
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

const CATEGORY_KEYS = Object.keys(COMPLAINT_CATEGORY_LABELS)

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPipeline({ current }: { current: ComplaintStatus }) {
  const currentIdx = STATUS_PIPELINE.indexOf(current)
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {STATUS_PIPELINE.map((status, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx
        const color = STATUS_COLORS[status]
        return (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all"
                style={{
                  backgroundColor:
                    isPast || isCurrent ? color : "#e5e7eb",
                  opacity: isPast ? 0.6 : 1,
                  boxShadow: isCurrent
                    ? `0 0 0 3px ${color}40`
                    : undefined,
                }}
              >
                {isPast ? "✓" : idx + 1}
              </div>
              <span
                className="text-[10px] text-center leading-tight"
                style={{
                  color: isCurrent
                    ? color
                    : isPast
                    ? "#9ca3af"
                    : "#d1d5db",
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            {idx < STATUS_PIPELINE.length - 1 && (
              <div
                className="flex-1 h-0.5 mb-5 min-w-[12px]"
                style={{
                  backgroundColor:
                    idx < currentIdx ? STATUS_COLORS[status] : "#e5e7eb",
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ComplaintSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </CardContent>
    </Card>
  )
}

// ─── Complaint Detail Panel ───────────────────────────────────────────────────

interface ComplaintDetailProps {
  complaint: Complaint
  members: Array<{ id: string; name: string }>
  onClose: () => void
}

function ComplaintDetail({
  complaint,
  members,
  onClose,
}: ComplaintDetailProps) {
  const utils = trpc.useUtils()

  const [internalNotes, setInternalNotes] = React.useState(
    complaint.internalNotes ?? ""
  )
  const [responsibleId, setResponsibleId] = React.useState(
    complaint.responsibleId ?? ""
  )
  const [resolution, setResolution] = React.useState(
    complaint.resolution ?? ""
  )
  const [status, setStatus] = React.useState<ComplaintStatus>(
    complaint.status
  )

  const updateMutation = trpc.team.complaints.update.useMutation({
    onSuccess: () => {
      utils.team.complaints.list.invalidate()
    },
  })

  function handleSave() {
    updateMutation.mutate({
      id: complaint.id,
      status,
      assigneeId: responsibleId || null,
      resolution: resolution || undefined,
    })
  }

  function handleResolve() {
    updateMutation.mutate({
      id: complaint.id,
      status: "RESOLVED_COMPLAINT",
      resolution,
      assigneeId: responsibleId || null,
    })
  }

  const timelineItems = (complaint.timeline ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    title: t.title,
    description: t.description,
  }))

  return (
    <div className="space-y-6">
      {/* Pipeline */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Pipeline de Status
        </p>
        <StatusPipeline current={status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-1">Categoria</p>
          <Badge variant="outline" className="text-xs">
            {COMPLAINT_CATEGORY_LABELS[complaint.category] ??
              complaint.category}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Severidade</p>
          <Badge
            className={`text-xs border ${
              SEVERITY_CONFIG[complaint.severity].className
            }`}
          >
            {SEVERITY_CONFIG[complaint.severity].label}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Código</p>
          <code className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
            {complaint.trackingCode}
          </code>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Anônimo</p>
          <span className="text-xs text-gray-700 flex items-center gap-1">
            {complaint.isAnonymous ? (
              <>
                <EyeOff className="h-3 w-3" /> Sim
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" /> Não
              </>
            )}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Relato
        </p>
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">
          {complaint.description}
        </p>
      </div>

      {/* Assign Responsible */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Responsável
        </p>
        <Select value={responsibleId} onValueChange={setResponsibleId}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Atribuir responsável..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Não atribuído</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status change */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Alterar Status
        </p>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ComplaintStatus)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_PIPELINE.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Internal Notes */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
          <EyeOff className="h-3 w-3" />
          Notas Internas (não visíveis ao denunciante)
        </p>
        <Textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Anotações internas sobre a investigação..."
          className="text-sm min-h-[80px]"
        />
      </div>

      {/* Resolution */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Resolução
        </p>
        <Textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Descreva as medidas adotadas e o encerramento..."
          className="text-sm min-h-[80px]"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          )}
          Salvar
        </Button>
        <Button
          size="sm"
          onClick={handleResolve}
          disabled={updateMutation.isPending || status === "RESOLVED_COMPLAINT"}
          className="bg-green-600 hover:bg-green-700"
        >
          Marcar como Resolvida
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>

      {/* Timeline */}
      {timelineItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Histórico de Ações
          </p>
          <TimelineVertical items={timelineItems} />
        </div>
      )}
    </div>
  )
}

// ─── Submit Complaint Form ─────────────────────────────────────────────────────

function SubmitComplaintForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [category, setCategory] = React.useState("")
  const [severity, setSeverity] = React.useState<ComplaintSeverity>("MEDIUM_SEV")
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [evidence, setEvidence] = React.useState("")

  const createMutation = trpc.team.complaints.create.useMutation({
    onSuccess: () => {
      setCategory("")
      setSeverity("MEDIUM_SEV")
      setTitle("")
      setDescription("")
      setEvidence("")
      onSuccess?.()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !title || !description) return
    createMutation.mutate({
      isAnonymous,
      category: category as ComplaintCategory,
      severity,
      title,
      description,
      evidence: evidence || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Anonymous toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-sm text-gray-700 flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-gray-400" />
          Denúncia anônima
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnonymous}
          onClick={() => setIsAnonymous((v) => !v)}
          className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none ${
            isAnonymous ? "bg-[#C9A84C]" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              isAnonymous ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Categoria <span className="text-red-500">*</span>
        </label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione a categoria..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {COMPLAINT_CATEGORY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Severity */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Severidade
        </label>
        <Select
          value={severity}
          onValueChange={(v) => setSeverity(v as ComplaintSeverity)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SEVERITY_CONFIG) as ComplaintSeverity[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {SEVERITY_CONFIG[key].label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumo em uma linha..."
          required
          className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Descrição detalhada <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o ocorrido com datas, locais e envolvidos (se souber)..."
          required
          className="text-sm min-h-[100px]"
        />
      </div>

      {/* Evidence */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Evidências / Informações adicionais
        </label>
        <Textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Links, arquivos ou testemunhas (opcional)..."
          className="text-sm min-h-[60px]"
        />
      </div>

      {createMutation.isError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {createMutation.error?.message ?? "Erro ao enviar. Tente novamente."}
        </p>
      )}

      {createMutation.isSuccess && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Denúncia enviada com sucesso. Anote o código de rastreamento gerado.
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Enviar Denúncia / Sugestão
          </>
        )}
      </Button>
    </form>
  )
}

// ─── Compliance Report Dialog ─────────────────────────────────────────────────

function ComplianceReportDialog() {
  const [open, setOpen] = React.useState(false)

  const reportQuery = trpc.team.complaints.report.useQuery({}, {
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Gerar Relatório de Compliance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#C9A84C]" />
            Relatório de Compliance — Canal de Ouvidoria
          </DialogTitle>
        </DialogHeader>

        {reportQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Gerando relatório...</p>
          </div>
        )}

        {reportQuery.isError && (
          <p className="text-sm text-red-600 text-center py-8">
            Erro ao gerar relatório. Tente novamente.
          </p>
        )}

        {reportQuery.data && (
          <div className="space-y-5 text-sm">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">
                Período do Relatório
              </p>
              <p className="text-amber-900 font-medium">
                {"Últimos 90 dias"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">
                  {reportQuery.data.totalComplaints ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Total de registros
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {reportQuery.data.resolvedCount ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Resolvidas</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {reportQuery.data.openCount ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Em aberto</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {reportQuery.data.avgResolutionDays ?? "—"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Dias médios de resolução</p>
              </div>
            </div>

            {reportQuery.data.byCategory && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">
                  Distribuição por Categoria
                </p>
                <div className="space-y-2">
                  {Object.entries(reportQuery.data.byCategory).map(
                    ([cat, count]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-40 shrink-0">
                          {COMPLAINT_CATEGORY_LABELS[cat] ?? cat}
                        </span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A84C] rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                ((count as number) /
                                  Math.max(
                                    1,
                                    reportQuery.data.totalComplaints ?? 1
                                  )) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-6 text-right">
                          {count as number}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <p className="text-[10px] text-gray-400 text-center border-t pt-3">
              Relatório gerado automaticamente em{" "}
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              . Documento confidencial — uso interno.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EquipeOuvidoriaTab() {
  const [statusFilter, setStatusFilter] = React.useState<string>("TODOS")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("TODAS")
  const [severityFilter, setSeverityFilter] = React.useState<string>("TODAS")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false)

  const { data, isLoading, isError, error } =
    trpc.team.complaints.list.useQuery(
      {
        status: statusFilter !== "TODOS" ? (statusFilter as "RECEIVED" | "UNDER_ANALYSIS" | "INVESTIGATING" | "ACTION_TAKEN" | "RESOLVED_COMPLAINT" | "DISMISSED" | "ARCHIVED_COMPLAINT") : undefined,
        category: categoryFilter !== "TODAS" ? (categoryFilter as ComplaintCategory) : undefined,
        severity: severityFilter !== "TODAS" ? (severityFilter as ComplaintSeverity) : undefined,
      },
      { staleTime: 2 * 60 * 1000 }
    )

  const complaints: Complaint[] = (data?.items ?? []) as unknown as Complaint[]
  const members: Array<{ id: string; name: string }> = []

  // ── Indicators ─────────────────────────────────────────────────────────────

  const totalByCategory = React.useMemo(() => {
    const map: Record<string, number> = {}
    complaints.forEach((c) => {
      map[c.category] = (map[c.category] ?? 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [complaints])

  const openCount = complaints.filter((c) => c.status !== "RESOLVED_COMPLAINT" && c.status !== "DISMISSED" && c.status !== "ARCHIVED_COMPLAINT").length
  const avgResolutionDays = "—"

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-36" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ComplaintSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 p-6 text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar ouvidoria</p>
            <p className="text-sm text-red-600 mt-0.5">
              {error?.message ?? "Tente novamente em alguns instantes."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Top actions ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Canal de Ouvidoria
        </h2>
        <div className="flex items-center gap-2">
          <ComplianceReportDialog />
          <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Nova Denúncia / Sugestão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5 text-[#C9A84C]" />
                  Registrar no Canal de Ouvidoria
                </DialogTitle>
              </DialogHeader>
              <SubmitComplaintForm
                onSuccess={() => setSubmitDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Indicators ──────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Indicadores
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{openCount}</p>
              <p className="text-xs text-gray-500 mt-1">Denúncias em aberto</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">
                {avgResolutionDays}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tempo médio de resolução
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-800">
                {complaints.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total de registros</p>
            </CardContent>
          </Card>
        </div>

        {/* By category horizontal bars */}
        {totalByCategory.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {totalByCategory.map(([cat, count]) => {
                const pct = Math.round(
                  (count / Math.max(1, complaints.length)) * 100
                )
                return (
                  <div key={cat} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-600 w-44 shrink-0">
                      {COMPLAINT_CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#C9A84C] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                      {count}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {STATUS_PIPELINE.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as categorias</SelectItem>
              {CATEGORY_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {COMPLAINT_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as severidades</SelectItem>
              {(Object.keys(SEVERITY_CONFIG) as ComplaintSeverity[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {SEVERITY_CONFIG[key].label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* ── Complaints list ─────────────────────────────────────────────── */}
        {complaints.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Inbox className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhum registro encontrado.</p>
              <p className="text-xs">
                Ajuste os filtros ou registre uma nova denúncia.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => {
              const isExpanded = expandedId === complaint.id
              const severityCfg = SEVERITY_CONFIG[complaint.severity]
              return (
                <Card
                  key={complaint.id}
                  className="transition-shadow hover:shadow-md"
                >
                  {/* Row header */}
                  <CardContent className="p-4">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 text-left focus-visible:outline-none"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : complaint.id)
                      }
                    >
                      {/* Tracking code */}
                      <code className="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded shrink-0">
                        {complaint.trackingCode}
                      </code>

                      {/* Category */}
                      <Badge variant="outline" className="text-xs shrink-0">
                        {COMPLAINT_CATEGORY_LABELS[complaint.category] ??
                          complaint.category}
                      </Badge>

                      {/* Severity */}
                      <Badge
                        className={`text-xs border shrink-0 ${severityCfg.className}`}
                      >
                        <Flag className="h-2.5 w-2.5 mr-1" />
                        {severityCfg.label}
                      </Badge>

                      {/* Status dot */}
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            STATUS_COLORS[complaint.status],
                        }}
                        title={STATUS_LABELS[complaint.status]}
                      />
                      <span className="text-xs text-gray-500 shrink-0">
                        {STATUS_LABELS[complaint.status]}
                      </span>

                      {/* Title */}
                      <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                        {complaint.title}
                      </span>

                      {/* Date */}
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(complaint.createdAt).toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>

                      {/* Expand */}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Detail panel */}
                    {isExpanded && (
                      <div className="mt-4 border-t pt-4">
                        <ComplaintDetail
                          complaint={complaint}
                          members={members}
                          onClose={() => setExpandedId(null)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <Users className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          O canal de ouvidoria garante sigilo ao denunciante. Denúncias anônimas
          não registram identificação no sistema. Todos os dados são tratados de
          acordo com as normas de compliance e LGPD.
        </span>
      </div>
    </div>
  )
}
