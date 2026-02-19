"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft, Paperclip, CheckSquare, Sparkles, MessageSquare,
  Clock, AlertTriangle, Lock, Unlock, RefreshCw, WifiOff,
  Upload, Download, Eye, Trash2, GripVertical, Plus, Send,
  Shield, FileText, Users, ChevronRight, Check, X, RotateCcw,
  Loader2, FileUp, AlertCircle,
} from "lucide-react"
import { DEADLINE_TYPE_LABELS } from "@/lib/constants"

// ─── Types ──────────────────────────────────────────────────
interface AIAnalysis {
  resumo_executivo: string
  teses: Array<{
    titulo: string
    categoria: string
    fundamentacao_legal: string[]
    jurisprudencia: string[]
    forca: string
    justificativa_forca: string
  }>
  pontos_criticos: Array<{
    tipo: string
    descricao: string
  }>
  gerado_em: string
  arquivo_base: string
  aviso_truncamento?: string
}

// ─── Phase Pipeline ──────────────────────────────────────────
const PHASES = [
  { key: "RASCUNHO", label: "Rascunho", icon: "1" },
  { key: "REVISAO", label: "Revisão", icon: "2" },
  { key: "APROVACAO", label: "Aprovação", icon: "3" },
  { key: "PROTOCOLO", label: "Protocolo", icon: "4" },
  { key: "CONCLUIDO", label: "Concluído", icon: "5" },
] as const

function PhasePipeline({
  current,
  viewingPhase,
  onPhaseClick,
}: {
  current: string
  viewingPhase: string
  onPhaseClick: (phase: string) => void
}) {
  const currentIdx = PHASES.findIndex(p => p.key === current)
  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, idx) => {
        const isActive = phase.key === viewingPhase
        const isCurrent = idx === currentIdx
        const isDone = idx < currentIdx
        const isFuture = idx > currentIdx
        const isClickable = !isFuture

        return (
          <div key={phase.key} className="flex items-center gap-1">
            {idx > 0 && (
              <div className={`h-0.5 w-4 ${isDone ? "bg-green-500" : "bg-gray-200"}`} />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    disabled={!isClickable}
                    onClick={() => isClickable && onPhaseClick(phase.key)}
                    className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                      isActive
                        ? isCurrent
                          ? "bg-primary text-white shadow-sm ring-2 ring-primary/30"
                          : isDone
                          ? "bg-green-600 text-white shadow-sm ring-2 ring-green-300"
                          : "bg-gray-500 text-white shadow-sm"
                        : isDone
                        ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                        : isCurrent
                        ? "bg-primary/10 text-primary"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isDone && <Check className="size-3" />}
                    {phase.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isDone ? `${phase.label} — concluída` : isCurrent ? `${phase.label} — fase atual` : phase.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      })}
    </div>
  )
}

// ─── Countdown ──────────────────────────────────────────────
function Countdown({ date }: { date: string | Date }) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" />Vencido há {Math.abs(days)}d</Badge>
  if (days === 0) return <Badge variant="destructive" className="gap-1 animate-pulse"><Clock className="size-3" />HOJE</Badge>
  if (days <= 3) return <Badge className="bg-orange-500 text-white gap-1"><Clock className="size-3" />{days}d</Badge>
  return <Badge variant="secondary" className="gap-1"><Clock className="size-3" />{days}d</Badge>
}

// ─── Error State ────────────────────────────────────────────
function WorkspaceErrorState({ title, message, onRetry, onBack }: { title: string; message: string; onRetry?: () => void; onBack?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <div className="flex flex-col items-center max-w-md text-center space-y-4">
        <div className="size-16 rounded-full bg-red-50 flex items-center justify-center">
          <WifiOff className="size-8 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <div className="flex items-center gap-3">
          {onBack && <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-3.5 mr-1.5" />Voltar</Button>}
          {onRetry && <Button size="sm" onClick={onRetry}><RefreshCw className="size-3.5 mr-1.5" />Tentar novamente</Button>}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-tabs per phase ─────────────────────────────────────
function getSubTabs(phaseKey: string, currentPhase: string) {
  const base = [
    { key: "documentos", label: "Documentos & Juntada", icon: Paperclip },
    { key: "checklist", label: "Checklist", icon: CheckSquare },
    { key: "teses", label: "Teses & Resumo IA", icon: Sparkles },
    { key: "comentarios", label: "Comentários", icon: MessageSquare },
  ]

  if (phaseKey === "APROVACAO") {
    base.push({ key: "aprovadores", label: "Aprovadores", icon: Users })
  }
  if (phaseKey === "PROTOCOLO") {
    base.push({ key: "protocolo", label: "Protocolo", icon: FileUp })
  }
  if (phaseKey === "CONCLUIDO") {
    base.push({ key: "resumo", label: "Resumo", icon: FileText })
  }

  return base
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function WorkspaceView({ deadlineId, onClose }: { deadlineId: string; onClose?: () => void }) {
  const [viewingPhase, setViewingPhase] = useState("RASCUNHO")
  const [activeSubTab, setActiveSubTab] = useState("documentos")
  const utils = trpc.useUtils()

  // Get or create workspace
  const getOrCreate = trpc.deadlines.workspace.getOrCreate.useMutation({
    onSuccess: (data) => {
      if (data.workspace) {
        utils.deadlines.workspace.get.setData({ workspaceId: data.workspace.id }, data.workspace as any)
        setViewingPhase(data.workspace.phase)
      }
    },
  })

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [loadingTooLong, setLoadingTooLong] = useState(false)

  const { data: workspace, isLoading: wsLoading, isError: wsError, error: wsQueryError } = trpc.deadlines.workspace.get.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId, retry: 2, retryDelay: 1000 }
  )

  const { data: stats } = trpc.deadlines.workspace.stats.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId, retry: 1 }
  )

  useEffect(() => {
    setWorkspaceId(null)
    setLoadingTooLong(false)
    getOrCreate.mutate({ deadlineId }, {
      onSuccess: (data) => {
        setWorkspaceId(data.workspace.id)
        setViewingPhase(data.workspace.phase)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineId])

  useEffect(() => {
    if (!workspaceId || wsLoading) {
      const timer = setTimeout(() => setLoadingTooLong(true), 10000)
      return () => clearTimeout(timer)
    }
    setLoadingTooLong(false)
  }, [workspaceId, wsLoading])

  const retryInit = () => {
    setWorkspaceId(null)
    setLoadingTooLong(false)
    getOrCreate.mutate({ deadlineId }, {
      onSuccess: (data) => { setWorkspaceId(data.workspace.id); setViewingPhase(data.workspace.phase) },
    })
  }

  const changePhase = trpc.deadlines.workspace.changePhase.useMutation({
    onSuccess: (_, vars) => {
      if (workspaceId) {
        utils.deadlines.workspace.get.invalidate({ workspaceId })
        utils.deadlines.workspace.stats.invalidate({ workspaceId })
        setViewingPhase(vars.phase)
      }
    },
  })

  const toggleLock = trpc.deadlines.workspace.toggleLock.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.deadlines.workspace.get.invalidate({ workspaceId })
    },
  })

  const invalidateAll = useCallback(() => {
    if (workspaceId) {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
    }
  }, [workspaceId, utils])

  // Error / loading states
  if (getOrCreate.isError) {
    return <WorkspaceErrorState title="Erro ao abrir workspace" message={getOrCreate.error?.message || "Não foi possível inicializar."} onRetry={retryInit} onBack={onClose} />
  }
  if (!workspaceId || getOrCreate.isPending) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /><Skeleton className="h-[500px]" />
        {loadingTooLong && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <p className="text-sm text-muted-foreground">Demorando mais que o esperado...</p>
            <Button variant="outline" size="sm" onClick={retryInit}><RefreshCw className="size-3.5 mr-1.5" />Tentar novamente</Button>
          </div>
        )}
      </div>
    )
  }
  if (wsError) {
    return <WorkspaceErrorState title="Erro ao carregar workspace" message={wsQueryError?.message || "Erro inesperado."} onRetry={() => utils.deadlines.workspace.get.invalidate({ workspaceId })} onBack={onClose} />
  }
  if (!workspace || wsLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-[500px]" /></div>
  }

  const dl = workspace.deadline
  const phase = workspace.phase
  const currentIdx = PHASES.findIndex(p => p.key === phase)
  const viewIdx = PHASES.findIndex(p => p.key === viewingPhase)
  const isViewingPastPhase = viewIdx < currentIdx
  const isReadOnly = isViewingPastPhase || phase === "CONCLUIDO"
  const subTabs = getSubTabs(viewingPhase, phase)

  return (
    <div className="h-full flex flex-col">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 border-b bg-white px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onClose ? (
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}><ArrowLeft className="size-4" /></Button>
            ) : (
              <Button variant="ghost" size="icon" className="shrink-0" asChild><Link href="/prazos"><ArrowLeft className="size-4" /></Link></Button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="shrink-0 font-mono text-xs">{dl?.codigo}</Badge>
                <Badge variant="secondary" className="shrink-0">{DEADLINE_TYPE_LABELS[dl?.tipo || ""] || dl?.tipo}</Badge>
                <h1 className="text-lg font-semibold truncate">{dl?.titulo}</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {dl?.case_ && (
                  <Link href={`/processos/${dl.case_.id}`} className="hover:underline">
                    {dl.case_.numero_processo || "Sem número"} — {dl.case_.cliente?.nome}
                  </Link>
                )}
                {dl?.data_fim_prazo && <Countdown date={dl.data_fim_prazo} />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dl?.responsavel && (
              <div className="flex items-center gap-1.5 text-sm">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {dl.responsavel.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-xs">{dl.responsavel.name?.split(" ")[0]}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={() => toggleLock.mutate({ workspaceId: workspace.id, locked: !workspace.locked })}>
              {workspace.locked ? <Lock className="size-4 text-red-500" /> : <Unlock className="size-4 text-gray-400" />}
            </Button>
          </div>
        </div>

        {/* Phase Pipeline + Stats */}
        <div className="flex items-center justify-between">
          <PhasePipeline current={phase} viewingPhase={viewingPhase} onPhaseClick={(p) => { setViewingPhase(p); setActiveSubTab("documentos") }} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stats && (
              <>
                <span>Checklist: {stats.checklistDone}/{stats.checklistTotal}</span>
                <span>·</span>
                <span>{stats.totalComments} comentário(s)</span>
                <span>·</span>
                <span>{stats.totalDocuments} doc(s)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SUB-TABS + CONTENT ═══ */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="h-full flex flex-col">
          <div className="shrink-0 border-b px-4">
            <TabsList className="h-10">
              {subTabs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 text-xs">
                  <tab.icon className="size-3.5" />
                  {tab.label}
                  {tab.key === "checklist" && stats && stats.blockingUnchecked > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{stats.blockingUnchecked}</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="documentos" className="p-4 m-0">
              <DocumentsTab workspaceId={workspace.id} deadlineId={deadlineId} documents={workspace.documents} isReadOnly={isReadOnly} currentPhase={phase} viewingPhase={viewingPhase} onUpdate={invalidateAll} />
            </TabsContent>
            <TabsContent value="checklist" className="p-4 m-0">
              <ChecklistTab workspaceId={workspace.id} items={workspace.checklist_items} isReadOnly={isReadOnly} />
            </TabsContent>
            <TabsContent value="teses" className="p-4 m-0">
              <TesesAITab workspaceId={workspace.id} deadlineId={deadlineId} workspace={workspace} />
            </TabsContent>
            <TabsContent value="comentarios" className="p-4 m-0">
              <CommentsTab workspaceId={workspace.id} comments={workspace.comments} />
            </TabsContent>
            {viewingPhase === "APROVACAO" && (
              <TabsContent value="aprovadores" className="p-4 m-0">
                <ApproversTab workspaceId={workspace.id} approvals={workspace.approvals} phase={phase} onUpdate={invalidateAll} />
              </TabsContent>
            )}
            {viewingPhase === "PROTOCOLO" && (
              <TabsContent value="protocolo" className="p-4 m-0">
                <ProtocolTab workspaceId={workspace.id} workspace={workspace} stats={stats} onUpdate={invalidateAll} />
              </TabsContent>
            )}
            {viewingPhase === "CONCLUIDO" && (
              <TabsContent value="resumo" className="p-4 m-0">
                <ConclusionTab workspace={workspace} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {/* ═══ PHASE TRANSITION BUTTONS ═══ */}
      {viewingPhase === phase && phase !== "CONCLUIDO" && (
        <PhaseTransitionBar
          phase={phase}
          workspace={workspace}
          stats={stats}
          changePhase={changePhase}
          workspaceId={workspace.id}
          onUpdate={invalidateAll}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PHASE TRANSITION BAR
// ═══════════════════════════════════════════════════════════════

function PhaseTransitionBar({
  phase, workspace, stats, changePhase, workspaceId, onUpdate,
}: {
  phase: string
  workspace: any
  stats: any
  changePhase: any
  workspaceId: string
  onUpdate: () => void
}) {
  const [returnReason, setReturnReason] = useState("")
  const [showReturn, setShowReturn] = useState(false)

  const hasMinuta = workspace.documents?.some((d: any) => d.is_minuta_principal)
  const blockingItems = stats?.blockingUnchecked || 0
  const allApproved = workspace.approvals?.length > 0 && workspace.approvals.every((a: any) => a.status !== "PENDENTE")
  const hasProtocol = !!workspace.protocol_number

  if (phase === "RASCUNHO") {
    const canAdvance = hasMinuta && blockingItems === 0
    return (
      <div className="shrink-0 border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {!hasMinuta && <span className="text-red-500">Junte a minuta principal para avançar</span>}
          {hasMinuta && blockingItems > 0 && <span className="text-amber-600">{blockingItems} item(ns) obrigatório(s) pendente(s)</span>}
        </div>
        <Button
          disabled={!canAdvance || changePhase.isPending}
          onClick={() => changePhase.mutate({ workspaceId, phase: "REVISAO" })}
        >
          {changePhase.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
          Enviar para Revisão
        </Button>
      </div>
    )
  }

  if (phase === "REVISAO") {
    return (
      <div className="shrink-0 border-t bg-gray-50 px-4 py-3 space-y-2">
        {showReturn ? (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 px-3 py-1.5 text-sm border rounded-md"
              placeholder="Motivo da devolução..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => { setShowReturn(false); setReturnReason("") }}>Cancelar</Button>
            <Button variant="destructive" size="sm" disabled={!returnReason.trim()} onClick={() => {
              changePhase.mutate({ workspaceId, phase: "RASCUNHO", motivo: returnReason })
              setShowReturn(false); setReturnReason("")
            }}>Devolver</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setShowReturn(true)}>
              <RotateCcw className="size-3.5 mr-1.5" />Devolver para Rascunho
            </Button>
            <Button onClick={() => changePhase.mutate({ workspaceId, phase: "APROVACAO" })} disabled={changePhase.isPending}>
              {changePhase.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              Aprovar Revisão e Enviar para Aprovação
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (phase === "APROVACAO") {
    const pending = workspace.approvals?.filter((a: any) => a.status === "PENDENTE").length || 0
    return (
      <div className="shrink-0 border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {pending > 0 ? `${pending} aprovação(ões) pendente(s)` : "Todas as aprovações concluídas"}
        </div>
        <Button
          disabled={pending > 0 || changePhase.isPending}
          onClick={() => changePhase.mutate({ workspaceId, phase: "PROTOCOLO" })}
        >
          {changePhase.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileUp className="size-4 mr-2" />}
          Avançar para Protocolo
        </Button>
      </div>
    )
  }

  if (phase === "PROTOCOLO") {
    return (
      <div className="shrink-0 border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {!hasProtocol && "Registre os dados do protocolo para concluir"}
        </div>
        <Button
          disabled={!hasProtocol || changePhase.isPending}
          onClick={() => changePhase.mutate({ workspaceId, phase: "CONCLUIDO" })}
        >
          {changePhase.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
          Confirmar Protocolo e Concluir
        </Button>
      </div>
    )
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: DOCUMENTOS & JUNTADA
// ═══════════════════════════════════════════════════════════════

function DocumentsTab({
  workspaceId, deadlineId, documents, isReadOnly, currentPhase, viewingPhase, onUpdate,
}: {
  workspaceId: string; deadlineId: string; documents: any[]; isReadOnly: boolean; currentPhase: string; viewingPhase: string; onUpdate: () => void
}) {
  const utils = trpc.useUtils()
  const addDoc = trpc.deadlines.workspace.addDocument.useMutation({
    onSuccess: () => { utils.deadlines.workspace.get.invalidate({ workspaceId }); utils.deadlines.workspace.stats.invalidate({ workspaceId }); onUpdate() },
  })
  const replaceMinuta = trpc.deadlines.workspace.replaceMinuta.useMutation({
    onSuccess: () => { utils.deadlines.workspace.get.invalidate({ workspaceId }); utils.deadlines.workspace.stats.invalidate({ workspaceId }); onUpdate() },
  })
  const removeDoc = trpc.deadlines.workspace.removeDocument.useMutation({
    onSuccess: () => { utils.deadlines.workspace.get.invalidate({ workspaceId }); utils.deadlines.workspace.stats.invalidate({ workspaceId }); onUpdate() },
  })
  const updateDoc = trpc.deadlines.workspace.updateDocument.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })

  const [uploading, setUploading] = useState(false)
  const [newAnexoName, setNewAnexoName] = useState("")
  const [showAddAnexo, setShowAddAnexo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const minutaInputRef = useRef<HTMLInputElement>(null)
  const replaceMinutaInputRef = useRef<HTMLInputElement>(null)

  // Permission logic per phase:
  // RASCUNHO: full edit (author)
  // REVISAO/APROVACAO: can add docs and replace minuta, but can't remove/rename docs from earlier phases
  // PROTOCOLO: can add receipt only (handled in protocol tab)
  // CONCLUIDO: read-only
  const isCurrentPhaseView = viewingPhase === currentPhase
  const isApprovalOrReview = isCurrentPhaseView && (currentPhase === "APROVACAO" || currentPhase === "REVISAO")
  const isDraftPhase = isCurrentPhaseView && currentPhase === "RASCUNHO"
  const canAddDocs = !isReadOnly || isApprovalOrReview
  const canReplaceMinuta = isDraftPhase || isApprovalOrReview
  const canFullEdit = isDraftPhase // only in draft: full edit (remove, rename)

  const minuta = documents.find((d: any) => d.is_minuta_principal && !d.is_versao_anterior)
  const previousMinutas = documents.filter((d: any) => d.is_versao_anterior).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const anexos = documents.filter((d: any) => !d.is_minuta_principal && !d.is_versao_anterior).sort((a: any, b: any) => a.order - b.order)

  const FASE_LABELS: Record<string, string> = { RASCUNHO: "Rascunho", REVISAO: "Revisão", APROVACAO: "Aprovação", PROTOCOLO: "Protocolo" }

  const handleUpload = async (file: File, isMinuta: boolean, title?: string) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", workspaceId)

      const res = await fetch("/api/deadlines/workspace/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Erro no upload")
        return
      }

      const data = await res.json()
      addDoc.mutate({
        workspaceId,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        fileUrl: data.url,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        isMinutaPrincipal: isMinuta,
        faseOrigem: currentPhase,
      })
    } catch {
      alert("Erro ao enviar arquivo")
    } finally {
      setUploading(false)
    }
  }

  const handleReplaceMinuta = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", workspaceId)

      const res = await fetch("/api/deadlines/workspace/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Erro no upload")
        return
      }

      const data = await res.json()
      replaceMinuta.mutate({
        workspaceId,
        fileUrl: data.url,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        faseOrigem: currentPhase,
      })
    } catch {
      alert("Erro ao enviar arquivo")
    } finally {
      setUploading(false)
    }
  }

  const totalSize = documents.reduce((acc: number, d: any) => acc + (d.file_size || 0), 0)
  const pendingAnexos = anexos.filter((a: any) => !a.file_url || a.file_url === "pending")

  // For an anexo, can the current user remove/rename it?
  const canEditAnexo = (doc: any) => {
    if (canFullEdit) return true // draft phase: full control
    // In approval/review: can only remove docs added in the current phase
    if (isApprovalOrReview && doc.fase_origem === currentPhase) return true
    return false
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Paperclip className="size-4" /> DOCUMENTOS DO PRAZO
      </h2>

      {/* MINUTA PRINCIPAL */}
      <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minuta Principal</h3>
        {minuta ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <FileText className="size-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{minuta.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {(minuta.file_size / 1024).toFixed(0)} KB · Enviado por {minuta.uploaded_by_name || "—"} em {new Date(minuta.created_at).toLocaleString("pt-BR")}
                {minuta.fase_origem && minuta.fase_origem !== "RASCUNHO" && (
                  <> · <Badge variant="outline" className="text-[10px] ml-1">{FASE_LABELS[minuta.fase_origem] || minuta.fase_origem}</Badge></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {minuta.file_url && (
                <a href={minuta.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="size-7"><Eye className="size-3.5" /></Button>
                </a>
              )}
              {minuta.file_url && (
                <a href={minuta.file_url} download={minuta.file_name}>
                  <Button variant="ghost" size="icon" className="size-7"><Download className="size-3.5" /></Button>
                </a>
              )}
              {canReplaceMinuta && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => replaceMinutaInputRef.current?.click()} disabled={uploading}>
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isApprovalOrReview ? "Substituir por Versão Final" : "Substituir Minuta"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canFullEdit && (
                <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeDoc.mutate({ documentId: minuta.id })}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        ) : canAddDocs ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
            onClick={() => minutaInputRef.current?.click()}
          >
            <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Arraste o arquivo Word da minuta aqui</p>
            <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">Aceita: .docx, .doc, .pdf, .odt</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma minuta juntada</p>
        )}

        {/* Previous minuta versions (history) */}
        {previousMinutas.length > 0 && (
          <div className="space-y-1">
            {previousMinutas.map((old: any) => (
              <div key={old.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-200 opacity-70">
                <FileText className="size-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {old.file_name} — {(old.file_size / 1024).toFixed(0)} KB — {old.uploaded_by_name || "—"} — {new Date(old.created_at).toLocaleString("pt-BR")}
                    <Badge variant="outline" className="text-[9px] ml-1.5">versão anterior</Badge>
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {old.file_url && (
                    <a href={old.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="size-6"><Eye className="size-3" /></Button>
                    </a>
                  )}
                  {old.file_url && (
                    <a href={old.file_url} download={old.file_name}>
                      <Button variant="ghost" size="icon" className="size-6"><Download className="size-3" /></Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={minutaInputRef}
          type="file"
          accept=".docx,.doc,.pdf,.odt"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file, true)
            e.target.value = ""
          }}
        />
        <input
          ref={replaceMinutaInputRef}
          type="file"
          accept=".docx,.doc,.pdf,.odt"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleReplaceMinuta(file)
            e.target.value = ""
          }}
        />
      </div>

      {/* ANEXOS */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anexos</h3>

        {anexos.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Nome do Anexo</th>
                  <th className="px-3 py-2 text-left">Arquivo</th>
                  <th className="px-3 py-2 text-left w-24">Origem</th>
                  <th className="px-3 py-2 text-right w-20">Tamanho</th>
                  <th className="px-3 py-2 text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {anexos.map((doc: any, idx: number) => {
                  const editable = canEditAnexo(doc)
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2">
                        {editable ? (
                          <input
                            className="w-full bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none"
                            defaultValue={doc.title}
                            onBlur={e => {
                              if (e.target.value !== doc.title) {
                                updateDoc.mutate({ documentId: doc.id, title: e.target.value })
                              }
                            }}
                          />
                        ) : (
                          <span>{doc.title}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {doc.file_url ? (
                          <span className="text-xs text-muted-foreground">{doc.file_name}</span>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                            <AlertCircle className="size-3 mr-1" /> Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {FASE_LABELS[doc.fase_origem] || doc.fase_origem || "Rascunho"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="size-6"><Eye className="size-3" /></Button>
                            </a>
                          )}
                          {doc.file_url && (
                            <a href={doc.file_url} download={doc.file_name}>
                              <Button variant="ghost" size="icon" className="size-6"><Download className="size-3" /></Button>
                            </a>
                          )}
                          {editable && (
                            <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeDoc.mutate({ documentId: doc.id })}>
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {canAddDocs && (
          <>
            {showAddAnexo ? (
              <div className="flex items-center gap-2 border rounded-lg p-3">
                <input
                  className="flex-1 px-3 py-1.5 text-sm border rounded-md"
                  placeholder="Nome do anexo (ex: Procuração, Contrato Social...)"
                  value={newAnexoName}
                  onChange={e => setNewAnexoName(e.target.value)}
                  autoFocus
                />
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || !newAnexoName.trim()}>
                  <Upload className="size-3.5 mr-1.5" />{uploading ? "Enviando..." : "Upload"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddAnexo(false); setNewAnexoName("") }}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAddAnexo(true)}>
                <Plus className="size-3.5 mr-1.5" /> Adicionar Documento
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.odt,.jpg,.jpeg,.png,.xls,.xlsx"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, false, newAnexoName.trim() || undefined)
                e.target.value = ""
                setShowAddAnexo(false)
                setNewAnexoName("")
              }}
            />
          </>
        )}

        {/* Info banner for approval/review phase */}
        {isApprovalOrReview && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>Documentos da fase de Rascunho são somente leitura. Você pode adicionar novos documentos ou substituir a minuta por uma versão final.</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>Total: {documents.filter((d: any) => !d.is_versao_anterior).length} documento(s) · {(totalSize / (1024 * 1024)).toFixed(1)} MB</span>
        {pendingAnexos.length > 0 && (
          <span className="text-amber-600">{pendingAnexos.length} anexo(s) pendente(s)</span>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="size-4 animate-spin" /> Enviando arquivo...
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: CHECKLIST
// ═══════════════════════════════════════════════════════════════

function ChecklistTab({ workspaceId, items, isReadOnly }: { workspaceId: string; items: any[]; isReadOnly: boolean }) {
  const utils = trpc.useUtils()
  const toggle = trpc.deadlines.workspace.toggleChecklist.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
    },
  })
  const addItem = trpc.deadlines.workspace.addChecklistItem.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const [newItem, setNewItem] = useState("")

  const categories = [...new Set(items.map((i: any) => i.category))]
  const totalChecked = items.filter((i: any) => i.checked).length
  const progress = items.length > 0 ? Math.round((totalChecked / items.length) * 100) : 0

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso</span>
          <span className="text-muted-foreground">{totalChecked}/{items.length} ({progress}%)</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.replace(/_/g, " ")}</h3>
          <div className="space-y-1">
            {items.filter((i: any) => i.category === cat).map((item: any) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 ${isReadOnly ? "" : "cursor-pointer"} ${
                  item.blocks_protocol && !item.checked ? "border-l-2 border-l-red-400" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={isReadOnly}
                  onChange={() => !isReadOnly && toggle.mutate({ itemId: item.id, checked: !item.checked })}
                  className="size-4 rounded border-gray-300"
                />
                <span className={`text-sm flex-1 ${item.checked ? "line-through text-gray-400" : ""}`}>{item.title}</span>
                {item.blocks_protocol && !item.checked && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">Obrigatório</Badge>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      {!isReadOnly && (
        <div className="flex gap-2 pt-2 border-t">
          <input
            className="flex-1 px-3 py-1.5 text-sm border rounded-md"
            placeholder="Adicionar item ao checklist..."
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newItem.trim()) {
                addItem.mutate({ workspaceId, title: newItem.trim() })
                setNewItem("")
              }
            }}
          />
          <Button size="sm" disabled={!newItem.trim()} onClick={() => { addItem.mutate({ workspaceId, title: newItem.trim() }); setNewItem("") }}>
            Adicionar
          </Button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: TESES & RESUMO IA
// ═══════════════════════════════════════════════════════════════

function TesesAITab({ workspaceId, deadlineId, workspace }: { workspaceId: string; deadlineId: string; workspace: any }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(() => {
    if (workspace.analise_ia) {
      try { return JSON.parse(workspace.analise_ia) } catch { return null }
    }
    return null
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    resumo: true, teses: true, pontos: true,
  })

  const hasMinuta = workspace.documents?.some((d: any) => d.is_minuta_principal)
  const minutaFile = workspace.documents?.find((d: any) => d.is_minuta_principal)
  const needsReanalysis = analysis && minutaFile && analysis.arquivo_base !== minutaFile.file_name

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError("")
    try {
      const res = await fetch(`/api/deadlines/workspace/${deadlineId}/analyze`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Erro na análise")
        return
      }
      const data = await res.json()
      setAnalysis(data.analysis)
    } catch {
      setError("Assistente IA indisponível no momento. Tente novamente em alguns minutos.")
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const forcaBar = (forca: string) => {
    const map: Record<string, { width: string; color: string }> = {
      forte: { width: "100%", color: "bg-green-500" },
      moderada: { width: "66%", color: "bg-amber-500" },
      fraca: { width: "33%", color: "bg-red-500" },
    }
    const f = map[forca.toLowerCase()] || map.moderada
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${f.color}`} style={{ width: f.width }} />
        </div>
        <span className="text-xs capitalize">{forca}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Analysis trigger */}
      {!analysis && !analyzing && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
          <Sparkles className="size-8 mx-auto text-purple-400" />
          {hasMinuta ? (
            <>
              <p className="text-sm font-medium">Analisar minuta com IA</p>
              <p className="text-xs text-muted-foreground">A IA irá gerar um resumo executivo, identificar teses e apontar pontos críticos.</p>
              <Button onClick={handleAnalyze} disabled={analyzing}>
                <Sparkles className="size-4 mr-2" />Analisar Minuta com IA
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Junte a minuta principal na aba &quot;Documentos&quot; para habilitar a análise por IA.</p>
          )}
        </div>
      )}

      {/* Loading */}
      {analyzing && (
        <div className="border rounded-lg p-8 text-center space-y-4">
          <Loader2 className="size-8 mx-auto text-purple-500 animate-spin" />
          <p className="text-sm font-medium">Analisando minuta...</p>
          <p className="text-xs text-muted-foreground">Isso pode levar de 10 a 30 segundos.</p>
          <div className="space-y-2 max-w-xs mx-auto">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <AlertTriangle className="size-4 inline mr-2" />{error}
        </div>
      )}

      {/* Analysis result */}
      {analysis && !analyzing && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-purple-600" /> ANÁLISE DA MINUTA POR IA
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gerada em {new Date(analysis.gerado_em).toLocaleString("pt-BR")} · Baseada em: {analysis.arquivo_base}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {needsReanalysis && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Minuta alterada</Badge>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAnalyze} disabled={analyzing}>
                <RefreshCw className="size-3 mr-1.5" />Reanalisar
              </Button>
            </div>
          </div>

          {analysis.aviso_truncamento && (
            <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700 border-b">
              <AlertTriangle className="size-3 inline mr-1" />{analysis.aviso_truncamento}
            </div>
          )}

          {/* Resumo Executivo */}
          <div className="border-b">
            <button className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50" onClick={() => toggleSection("resumo")}>
              <h4 className="text-sm font-semibold">RESUMO EXECUTIVO</h4>
              <ChevronRight className={`size-4 text-muted-foreground transition-transform ${expandedSections.resumo ? "rotate-90" : ""}`} />
            </button>
            {expandedSections.resumo && (
              <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {analysis.resumo_executivo}
              </div>
            )}
          </div>

          {/* Teses */}
          <div className="border-b">
            <button className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50" onClick={() => toggleSection("teses")}>
              <h4 className="text-sm font-semibold">TESES IDENTIFICADAS ({analysis.teses?.length || 0})</h4>
              <ChevronRight className={`size-4 text-muted-foreground transition-transform ${expandedSections.teses ? "rotate-90" : ""}`} />
            </button>
            {expandedSections.teses && (
              <div className="px-4 pb-4 space-y-3">
                {analysis.teses?.map((tese, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{idx + 1}. {tese.titulo}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{tese.categoria}</Badge>
                    </div>
                    {tese.fundamentacao_legal.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Fund.:</span> {tese.fundamentacao_legal.join(" · ")}
                      </div>
                    )}
                    {tese.jurisprudencia.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Jurisp.:</span> {tese.jurisprudencia.join(" · ")}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {forcaBar(tese.forca)}
                      {tese.justificativa_forca && (
                        <span className="text-[10px] text-muted-foreground max-w-[200px] truncate">{tese.justificativa_forca}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pontos Críticos */}
          <div>
            <button className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50" onClick={() => toggleSection("pontos")}>
              <h4 className="text-sm font-semibold">PONTOS CRÍTICOS ({analysis.pontos_criticos?.length || 0})</h4>
              <ChevronRight className={`size-4 text-muted-foreground transition-transform ${expandedSections.pontos ? "rotate-90" : ""}`} />
            </button>
            {expandedSections.pontos && (
              <div className="px-4 pb-4 space-y-2">
                {analysis.pontos_criticos?.map((ponto, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 mt-0.5">
                      {ponto.tipo === "fragilidade" ? <AlertTriangle className="size-3.5 text-red-500" /> :
                       ponto.tipo === "sugestao" ? <Sparkles className="size-3.5 text-blue-500" /> :
                       <AlertCircle className="size-3.5 text-amber-500" />}
                    </span>
                    <span>{ponto.descricao}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-2 text-[10px] text-muted-foreground text-center border-t">
            Análise gerada por IA — sempre verifique antes de utilizar
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: COMENTÁRIOS (feed simples)
// ═══════════════════════════════════════════════════════════════

function CommentsTab({ workspaceId, comments }: { workspaceId: string; comments: any[] }) {
  const utils = trpc.useUtils()
  const addComment = trpc.deadlines.workspace.addComment.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
    },
  })
  const [newComment, setNewComment] = useState("")

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <MessageSquare className="size-4" /> COMENTÁRIOS
      </h2>

      {/* Comment feed */}
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum comentário ainda.</p>
        )}
        {comments.map((comment: any) => (
          <div key={comment.id} className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Avatar className="size-5">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {(comment.user_id || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-700">{comment.user_id?.slice(0, 8) || "Usuário"}</span>
              <span>·</span>
              <span>{new Date(comment.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      {/* New comment input */}
      <div className="border rounded-lg p-3 space-y-2">
        <textarea
          className="w-full p-2 border rounded-md text-sm min-h-[80px] resize-none"
          placeholder="Escreva um comentário..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
              e.preventDefault()
              addComment.mutate({ workspaceId, content: newComment.trim() })
              setNewComment("")
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!newComment.trim() || addComment.isPending}
            onClick={() => { addComment.mutate({ workspaceId, content: newComment.trim() }); setNewComment("") }}
          >
            {addComment.isPending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Send className="size-3.5 mr-1.5" />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: APROVADORES
// ═══════════════════════════════════════════════════════════════

function ApproversTab({
  workspaceId, approvals, phase, onUpdate,
}: {
  workspaceId: string; approvals: any[]; phase: string; onUpdate: () => void
}) {
  const utils = trpc.useUtils()
  const { data: users } = trpc.deadlines.usersForSelect.useQuery()
  const requestApproval = trpc.deadlines.workspace.requestApproval.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
      onUpdate()
    },
  })
  const decideApproval = trpc.deadlines.workspace.decideApproval.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
      onUpdate()
    },
  })
  const [selectedApprover, setSelectedApprover] = useState("")
  const [feedback, setFeedback] = useState("")

  const statusColors: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-700",
    APROVADO: "bg-green-100 text-green-700",
    REPROVADO: "bg-red-100 text-red-700",
    APROVADO_COM_RESSALVAS: "bg-blue-100 text-blue-700",
  }

  const statusLabels: Record<string, string> = {
    PENDENTE: "Aguardando aprovação",
    APROVADO: "Aprovado",
    REPROVADO: "Reprovado",
    APROVADO_COM_RESSALVAS: "Aprovado com ressalvas",
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Users className="size-4" /> APROVADORES
      </h2>

      {/* Approval cards */}
      {approvals.map((a: any) => (
        <div key={a.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {a.approver_id?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Aprovador (Rodada {a.round})</p>
                <p className="text-xs text-muted-foreground">
                  Enviado em {new Date(a.requested_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
            <Badge className={statusColors[a.status] || ""}>
              {statusLabels[a.status] || a.status}
            </Badge>
          </div>

          {a.feedback && (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Parecer:</p>
              {a.feedback}
            </div>
          )}

          {/* Decision buttons for pending */}
          {a.status === "PENDENTE" && phase === "APROVACAO" && (
            <div className="space-y-2 pt-2 border-t">
              <textarea
                className="w-full p-2 border rounded text-sm min-h-[60px]"
                placeholder="Parecer / ressalvas (obrigatório para reprovar)..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { decideApproval.mutate({ approvalId: a.id, status: "APROVADO", feedback: feedback || undefined }); setFeedback("") }}>
                  <Check className="size-3.5 mr-1.5" />Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { decideApproval.mutate({ approvalId: a.id, status: "APROVADO_COM_RESSALVAS", feedback: feedback || undefined }); setFeedback("") }}>
                  Aprovar com Ressalvas
                </Button>
                <Button size="sm" variant="destructive" disabled={!feedback.trim()} onClick={() => { decideApproval.mutate({ approvalId: a.id, status: "REPROVADO", feedback }); setFeedback("") }}>
                  <X className="size-3.5 mr-1.5" />Reprovar
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add approver */}
      {phase === "APROVACAO" && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h3 className="text-sm font-semibold">Adicionar Aprovador</h3>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={selectedApprover}
            onChange={e => setSelectedApprover(e.target.value)}
          >
            <option value="">Selecione o aprovador...</option>
            {users?.filter((u: any) => u.role === "SOCIO" || u.role === "ADMIN").map((u: any) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <Button size="sm" disabled={!selectedApprover || requestApproval.isPending} onClick={() => { requestApproval.mutate({ workspaceId, approverId: selectedApprover }); setSelectedApprover("") }}>
            <Plus className="size-3.5 mr-1.5" /> Solicitar Aprovação
          </Button>
        </div>
      )}

      {approvals.length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma aprovação solicitada. Adicione um aprovador acima.</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: PROTOCOLO
// ═══════════════════════════════════════════════════════════════

function ProtocolTab({
  workspaceId, workspace, stats, onUpdate,
}: {
  workspaceId: string; workspace: any; stats: any; onUpdate: () => void
}) {
  const utils = trpc.useUtils()
  const registerProtocol = trpc.deadlines.workspace.registerProtocol.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      onUpdate()
    },
  })

  const [protocolNumber, setProtocolNumber] = useState(workspace.protocol_number || "")
  const [protocolDate, setProtocolDate] = useState(workspace.protocol_date ? new Date(workspace.protocol_date).toISOString().slice(0, 16) : "")
  const [protocolSystem, setProtocolSystem] = useState(workspace.protocol_system || "PJe")
  const [uploading, setUploading] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState(workspace.protocol_receipt_url || "")
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const hasMinuta = workspace.documents?.some((d: any) => d.is_minuta_principal)
  const totalDocs = workspace.documents?.length || 0
  const checklistOk = stats ? stats.blockingUnchecked === 0 : false
  const approvalOk = workspace.approvals?.length > 0 && workspace.approvals.every((a: any) => a.status !== "PENDENTE")
  const totalSize = workspace.documents?.reduce((acc: number, d: any) => acc + (d.file_size || 0), 0) || 0

  const handleReceiptUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", workspaceId)
      const res = await fetch("/api/deadlines/workspace/upload", { method: "POST", body: formData })
      if (!res.ok) { alert("Erro no upload"); return }
      const data = await res.json()
      setReceiptUrl(data.url)
    } catch {
      alert("Erro ao enviar comprovante")
    } finally {
      setUploading(false)
    }
  }

  const validations = [
    { ok: hasMinuta, label: `Minuta principal presente (${workspace.documents?.find((d: any) => d.is_minuta_principal)?.file_name || "—"})` },
    { ok: totalDocs > 1 || hasMinuta, label: `Documentos juntados (${totalDocs})` },
    { ok: checklistOk, label: `Checklist ${checklistOk ? "completa" : "incompleta"} (${stats?.checklistDone || 0}/${stats?.checklistTotal || 0})` },
    { ok: approvalOk, label: `Aprovação ${approvalOk ? "concluída" : "pendente"}` },
    { ok: totalSize < 10 * 1024 * 1024, label: `Tamanho total: ${(totalSize / (1024 * 1024)).toFixed(1)}MB`, warn: totalSize >= 6 * 1024 * 1024 && totalSize < 10 * 1024 * 1024 },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <FileUp className="size-4" /> PROTOCOLO
      </h2>

      {/* Validation */}
      <div className="border rounded-lg p-4 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Validação Pré-Protocolo</h3>
        {validations.map((v, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>{v.ok ? (v as any).warn ? "🟡" : "🟢" : "🔴"}</span>
            <span className={v.ok ? "" : "text-red-600"}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Protocol data */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Protocolo</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Sistema</label>
            <select className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={protocolSystem} onChange={e => setProtocolSystem(e.target.value)}>
              <option>PJe</option>
              <option>e-SAJ</option>
              <option>PROJUDI</option>
              <option>EPROC</option>
              <option>Outro</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tribunal</label>
            <input className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={workspace.deadline?.case_?.uf || ""} readOnly />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Nº do Processo</label>
          <input className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={workspace.deadline?.case_?.numero_processo || ""} readOnly />
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">Após protocolar externamente (no PJe/e-SAJ), registre aqui:</p>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nº do Protocolo</label>
            <input className="w-full px-3 py-2 border rounded-md text-sm mt-1" placeholder="2026.001.234567" value={protocolNumber} onChange={e => setProtocolNumber(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Data/Hora do Protocolo</label>
            <input type="datetime-local" className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={protocolDate} onChange={e => setProtocolDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Comprovante</label>
            {receiptUrl ? (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">Comprovante enviado</Badge>
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="h-6 text-xs"><Eye className="size-3 mr-1" />Ver</Button></a>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-1" onClick={() => receiptInputRef.current?.click()} disabled={uploading}>
                <Upload className="size-3.5 mr-1.5" />{uploading ? "Enviando..." : "Upload do comprovante"}
              </Button>
            )}
            <input ref={receiptInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleReceiptUpload(file)
              e.target.value = ""
            }} />
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!protocolNumber.trim() || !protocolDate || registerProtocol.isPending}
          onClick={() => registerProtocol.mutate({
            workspaceId,
            protocolNumber: protocolNumber.trim(),
            protocolDate: new Date(protocolDate),
            protocolSystem,
            receiptUrl: receiptUrl || undefined,
          })}
        >
          {registerProtocol.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
          Registrar Protocolo
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: CONCLUÍDO (Resumo)
// ═══════════════════════════════════════════════════════════════

function ConclusionTab({ workspace }: { workspace: any }) {
  const approvedBy = workspace.approvals?.filter((a: any) => a.status === "APROVADO" || a.status === "APROVADO_COM_RESSALVAS") || []

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border rounded-lg p-6 bg-green-50 border-green-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="size-6 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-green-800">PRAZO CUMPRIDO</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Protocolado em</p>
            <p className="font-medium">{workspace.protocol_date ? new Date(workspace.protocol_date).toLocaleString("pt-BR") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nº Protocolo</p>
            <p className="font-medium">{workspace.protocol_number || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sistema</p>
            <p className="font-medium">{workspace.protocol_system || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comprovante</p>
            {workspace.protocol_receipt_url ? (
              <a href={workspace.protocol_receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                Ver comprovante
              </a>
            ) : <p className="text-muted-foreground">—</p>}
          </div>
        </div>

        {approvedBy.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Aprovado por</p>
            <div className="flex items-center gap-2">
              {approvedBy.map((a: any) => (
                <Badge key={a.id} variant="secondary" className="text-xs">
                  Rodada {a.round} — {a.status === "APROVADO" ? "Aprovado" : "Aprovado c/ ressalvas"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground">Tempo total</p>
          <p className="font-medium text-sm">
            {workspace.created_at && workspace.phase_changed_at
              ? `${Math.ceil((new Date(workspace.phase_changed_at).getTime() - new Date(workspace.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  )
}
