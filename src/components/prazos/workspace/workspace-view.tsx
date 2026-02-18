"use client"

import { useState, useEffect } from "react"
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
  ArrowLeft, FileText, CheckSquare, Scale, MessageSquare,
  Paperclip, Shield, Activity, Clock, AlertTriangle, Lock, Unlock,
} from "lucide-react"
import { DEADLINE_TYPE_LABELS } from "@/lib/constants"
import { WorkspaceCommandPalette } from "./workspace-command-palette"

// ─── Phase Pipeline ──────────────────────────────────────────────
const PHASES = [
  { key: "RASCUNHO", label: "Rascunho", color: "bg-gray-400" },
  { key: "REVISAO", label: "Revisão", color: "bg-blue-500" },
  { key: "APROVACAO", label: "Aprovação", color: "bg-amber-500" },
  { key: "PROTOCOLO", label: "Protocolo", color: "bg-purple-500" },
  { key: "CONCLUIDO", label: "Concluído", color: "bg-green-500" },
] as const

function PhasePipeline({ current }: { current: string }) {
  const currentIdx = PHASES.findIndex(p => p.key === current)
  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, idx) => {
        const isActive = idx === currentIdx
        const isDone = idx < currentIdx
        return (
          <div key={phase.key} className="flex items-center gap-1">
            {idx > 0 && (
              <div className={`h-0.5 w-4 ${isDone ? "bg-green-500" : "bg-gray-200"}`} />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className={`h-7 px-3 rounded-full text-xs font-medium flex items-center transition-all ${
                      isActive
                        ? `${phase.color} text-white shadow-sm`
                        : isDone
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {phase.label}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{phase.label}</TooltipContent>
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

// ─── Main Component ──────────────────────────────────────────
export function WorkspaceView({ deadlineId }: { deadlineId: string }) {
  const [activeTab, setActiveTab] = useState("editor")
  const utils = trpc.useUtils()

  // Get or create workspace
  const getOrCreate = trpc.deadlines.workspace.getOrCreate.useMutation({
    onSuccess: (data) => {
      if (data.workspace) {
        utils.deadlines.workspace.get.setData({ workspaceId: data.workspace.id }, data.workspace as any)
      }
    },
  })

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const { data: workspace, isLoading: wsLoading } = trpc.deadlines.workspace.get.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  )

  const { data: stats } = trpc.deadlines.workspace.stats.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  )

  // Initialize workspace on mount
  useEffect(() => {
    getOrCreate.mutate({ deadlineId }, {
      onSuccess: (data) => {
        setWorkspaceId(data.workspace.id)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineId])

  const changePhase = trpc.deadlines.workspace.changePhase.useMutation({
    onSuccess: () => {
      if (workspaceId) {
        utils.deadlines.workspace.get.invalidate({ workspaceId })
        utils.deadlines.workspace.stats.invalidate({ workspaceId })
      }
    },
  })

  const toggleLock = trpc.deadlines.workspace.toggleLock.useMutation({
    onSuccess: () => {
      if (workspaceId) utils.deadlines.workspace.get.invalidate({ workspaceId })
    },
  })

  if (!workspaceId || getOrCreate.isPending) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    )
  }

  if (!workspace || wsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    )
  }

  const dl = workspace.deadline
  const phase = workspace.phase

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="shrink-0 border-b bg-white px-4 py-3 space-y-3">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/prazos"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 font-mono text-xs">{dl?.codigo}</Badge>
                <Badge variant="secondary" className="shrink-0">
                  {DEADLINE_TYPE_LABELS[dl?.tipo || ""] || dl?.tipo}
                </Badge>
                <h1 className="text-lg font-semibold truncate">{dl?.titulo}</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {dl?.case_ && (
                  <Link href={`/processos/${dl.case_.id}`} className="hover:underline">
                    {dl.case_.numero_processo || "Sem número"} — {dl.case_.cliente?.nome}
                  </Link>
                )}
                {dl?.data_fim_prazo && (
                  <Countdown date={dl.data_fim_prazo} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Responsible */}
            {dl?.responsavel && (
              <div className="flex items-center gap-1.5 text-sm">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {dl.responsavel.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{dl.responsavel.name?.split(" ")[0]}</span>
              </div>
            )}

            {/* Lock toggle */}
            <Button
              variant="ghost" size="icon" className="size-8"
              onClick={() => toggleLock.mutate({ workspaceId: workspace.id, locked: !workspace.locked })}
            >
              {workspace.locked ? <Lock className="size-4 text-red-500" /> : <Unlock className="size-4 text-gray-400" />}
            </Button>
          </div>
        </div>

        {/* Phase Pipeline */}
        <div className="flex items-center justify-between">
          <PhasePipeline current={phase} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stats && (
              <>
                <span>Checklist: {stats.checklistDone}/{stats.checklistTotal}</span>
                <span>·</span>
                <span>{stats.openComments} comentário(s)</span>
                <span>·</span>
                <span>{stats.totalDocuments} doc(s)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="shrink-0 border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="editor" className="gap-1.5 text-xs">
                <FileText className="size-3.5" />Editor
              </TabsTrigger>
              <TabsTrigger value="checklist" className="gap-1.5 text-xs">
                <CheckSquare className="size-3.5" />Checklist
                {stats && stats.blockingUnchecked > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{stats.blockingUnchecked}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="teses" className="gap-1.5 text-xs">
                <Scale className="size-3.5" />Teses
              </TabsTrigger>
              <TabsTrigger value="comentarios" className="gap-1.5 text-xs">
                <MessageSquare className="size-3.5" />Comentários
                {stats && stats.openComments > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{stats.openComments}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documentos" className="gap-1.5 text-xs">
                <Paperclip className="size-3.5" />Documentos
              </TabsTrigger>
              <TabsTrigger value="aprovacao" className="gap-1.5 text-xs">
                <Shield className="size-3.5" />Aprovação
              </TabsTrigger>
              <TabsTrigger value="atividades" className="gap-1.5 text-xs">
                <Activity className="size-3.5" />Atividades
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="editor" className="h-full m-0">
              <WorkspaceEditorTab workspaceId={workspace.id} content={workspace.editor_content} locked={workspace.locked} />
            </TabsContent>
            <TabsContent value="checklist" className="p-4 m-0">
              <WorkspaceChecklistTab workspaceId={workspace.id} items={workspace.checklist_items} />
            </TabsContent>
            <TabsContent value="teses" className="p-4 m-0">
              <WorkspaceThesesTab workspaceId={workspace.id} theses={workspace.theses} />
            </TabsContent>
            <TabsContent value="comentarios" className="p-4 m-0">
              <WorkspaceCommentsTab workspaceId={workspace.id} comments={workspace.comments} />
            </TabsContent>
            <TabsContent value="documentos" className="p-4 m-0">
              <WorkspaceDocumentsTab workspaceId={workspace.id} documents={workspace.documents} />
            </TabsContent>
            <TabsContent value="aprovacao" className="p-4 m-0">
              <WorkspaceApprovalTab workspaceId={workspace.id} approvals={workspace.approvals} phase={phase} />
            </TabsContent>
            <TabsContent value="atividades" className="p-4 m-0">
              <WorkspaceActivitiesTab workspaceId={workspace.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Command Palette (Ctrl+K) */}
      <WorkspaceCommandPalette
        workspaceId={workspace.id}
        deadlineId={deadlineId}
        phase={phase}
        onAction={(action, payload) => {
          if (action === "setTab" && payload?.tab) {
            setActiveTab(payload.tab as string)
          } else if (action === "saveVersion") {
            // Trigger save version via trpc
          } else if (action === "toggleLock") {
            toggleLock.mutate({ workspaceId: workspace.id, locked: !workspace.locked })
          } else if (action === "advancePhase") {
            const idx = PHASES.findIndex(p => p.key === phase)
            if (idx < PHASES.length - 1) {
              changePhase.mutate({ workspaceId: workspace.id, phase: PHASES[idx + 1].key as any })
            }
          }
        }}
      />
    </div>
  )
}

// ─── Tab Components (inline, lightweight) ────────────────────────

function WorkspaceEditorTab({ workspaceId, content, locked }: { workspaceId: string; content: string | null; locked: boolean }) {
  const utils = trpc.useUtils()
  const saveMutation = trpc.deadlines.workspace.saveContent.useMutation()
  const saveVersion = trpc.deadlines.workspace.saveVersion.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })

  const [editorReady, setEditorReady] = useState(false)

  // Dynamic import of Tiptap to avoid SSR
  const [TiptapEditor, setTiptapEditor] = useState<any>(null)
  useEffect(() => {
    import("./workspace-editor").then(mod => {
      setTiptapEditor(() => mod.WorkspaceEditor)
      setEditorReady(true)
    })
  }, [])

  const handleSave = (json: string, html: string, wordCount: number, charCount: number) => {
    saveMutation.mutate({ workspaceId, contentJson: json, contentHtml: html, wordCount, charCount })
  }

  const handleSaveVersion = () => {
    saveVersion.mutate({ workspaceId, changeSummary: "Versão salva manualmente" })
  }

  if (!editorReady || !TiptapEditor) {
    return <div className="p-6"><Skeleton className="h-[500px]" /></div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-gray-50/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saveMutation.isPending && <span className="text-blue-500">Salvando...</span>}
          {!saveMutation.isPending && saveMutation.isSuccess && <span className="text-green-500">Salvo</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSaveVersion} disabled={saveVersion.isPending}>
            Salvar Versão
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <TiptapEditor initialContent={content} onSave={handleSave} readOnly={locked} />
      </div>
    </div>
  )
}

function WorkspaceChecklistTab({ workspaceId, items }: { workspaceId: string; items: any[] }) {
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

  const categories = [...new Set(items.map(i => i.category))]

  return (
    <div className="space-y-6 max-w-2xl">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.replace(/_/g, " ")}</h3>
          <div className="space-y-1">
            {items.filter(i => i.category === cat).map(item => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${
                  item.blocks_protocol && !item.checked ? "border-l-2 border-l-red-400" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggle.mutate({ itemId: item.id, checked: !item.checked })}
                  className="size-4 rounded border-gray-300"
                />
                <span className={`text-sm flex-1 ${item.checked ? "line-through text-gray-400" : ""}`}>
                  {item.title}
                </span>
                {item.blocks_protocol && !item.checked && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">Obrigatório</Badge>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Add custom item */}
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
        <Button
          size="sm"
          disabled={!newItem.trim()}
          onClick={() => { addItem.mutate({ workspaceId, title: newItem.trim() }); setNewItem("") }}
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}

function WorkspaceThesesTab({ workspaceId, theses }: { workspaceId: string; theses: any[] }) {
  const utils = trpc.useUtils()
  const addThesis = trpc.deadlines.workspace.addThesis.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const updateThesis = trpc.deadlines.workspace.updateThesis.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const deleteThesis = trpc.deadlines.workspace.deleteThesis.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState("MERITO")

  const typeColors: Record<string, string> = {
    PRELIMINAR: "bg-amber-100 text-amber-700",
    PREJUDICIAL: "bg-purple-100 text-purple-700",
    MERITO: "bg-blue-100 text-blue-700",
    SUBSIDIARIA: "bg-gray-100 text-gray-600",
  }
  const strengthColors: Record<string, string> = {
    FORTE: "text-green-600",
    MEDIA: "text-amber-600",
    FRACA: "text-red-600",
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Teses e Argumentos (IRAC)</h2>
        <Button size="sm" onClick={() => setShowNew(true)}>+ Nova Tese</Button>
      </div>

      {showNew && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Título da tese..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <div className="flex gap-2">
            {["PRELIMINAR", "PREJUDICIAL", "MERITO", "SUBSIDIARIA"].map(t => (
              <button key={t} onClick={() => setNewType(t)} className={`px-3 py-1 rounded-full text-xs font-medium ${newType === t ? typeColors[t] : "bg-gray-100 text-gray-500"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowNew(false); setNewTitle("") }}>Cancelar</Button>
            <Button size="sm" disabled={!newTitle.trim()} onClick={() => {
              addThesis.mutate({ workspaceId, title: newTitle.trim(), type: newType })
              setNewTitle(""); setShowNew(false)
            }}>Adicionar</Button>
          </div>
        </div>
      )}

      {theses.map(thesis => (
        <div key={thesis.id} className="border rounded-lg overflow-hidden">
          <div
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => setExpanded(expanded === thesis.id ? null : thesis.id)}
          >
            <Badge className={typeColors[thesis.type] || ""}>{thesis.type}</Badge>
            <span className="font-medium text-sm flex-1">{thesis.title}</span>
            {thesis.strength && <span className={`text-xs font-medium ${strengthColors[thesis.strength] || ""}`}>{thesis.strength}</span>}
            <Badge variant="outline" className="text-[10px]">{thesis.status}</Badge>
          </div>

          {expanded === thesis.id && (
            <div className="border-t p-4 space-y-3 bg-gray-50/50">
              {[
                { label: "Issue (Questão)", field: "issue" as const },
                { label: "Rule (Fundamento)", field: "rule" as const },
                { label: "Analysis (Argumentação)", field: "analysis" as const },
                { label: "Conclusion (Conclusão)", field: "conclusion" as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded-md text-sm min-h-[60px]"
                    defaultValue={thesis[field] || ""}
                    onBlur={e => {
                      if (e.target.value !== (thesis[field] || "")) {
                        updateThesis.mutate({ thesisId: thesis.id, [field]: e.target.value })
                      }
                    }}
                  />
                </div>
              ))}

              {thesis.legal_refs.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Referências legais</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {thesis.legal_refs.map((ref: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{ref}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <div className="flex gap-2">
                  {["RASCUNHO", "REVISAO", "APROVADA", "DESCARTADA"].map(s => (
                    <button
                      key={s}
                      onClick={() => updateThesis.mutate({ thesisId: thesis.id, status: s })}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${thesis.status === s ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => deleteThesis.mutate({ thesisId: thesis.id })}>
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {theses.length === 0 && !showNew && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma tese adicionada. Clique em &quot;+ Nova Tese&quot; para começar.
        </div>
      )}
    </div>
  )
}

function WorkspaceCommentsTab({ workspaceId, comments }: { workspaceId: string; comments: any[] }) {
  const utils = trpc.useUtils()
  const addComment = trpc.deadlines.workspace.addComment.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const resolveComment = trpc.deadlines.workspace.resolveComment.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  return (
    <div className="space-y-4 max-w-2xl">
      {/* New comment */}
      <div className="border rounded-lg p-3 space-y-2">
        <textarea
          className="w-full p-2 border rounded-md text-sm min-h-[80px]"
          placeholder="Adicionar comentário..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!newComment.trim()}
            onClick={() => {
              addComment.mutate({ workspaceId, content: newComment.trim() })
              setNewComment("")
            }}
          >
            Comentar
          </Button>
        </div>
      </div>

      {/* Comment list */}
      {comments.map(comment => (
        <div key={comment.id} className={`border rounded-lg p-3 space-y-2 ${comment.resolved ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-[10px]">{comment.type}</Badge>
              <span className="text-muted-foreground">{new Date(comment.created_at).toLocaleString("pt-BR")}</span>
            </div>
            {!comment.resolved && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => resolveComment.mutate({ commentId: comment.id })}>
                Resolver
              </Button>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          {comment.anchor_text && (
            <div className="bg-amber-50 border-l-2 border-l-amber-400 px-3 py-1 text-xs italic text-amber-700">
              &ldquo;{comment.anchor_text}&rdquo;
            </div>
          )}

          {/* Replies */}
          {comment.replies?.map((reply: any) => (
            <div key={reply.id} className="ml-6 border-l-2 border-l-gray-200 pl-3 py-1">
              <p className="text-sm">{reply.content}</p>
              <span className="text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}

          {/* Reply input */}
          {replyTo === comment.id ? (
            <div className="ml-6 flex gap-2">
              <input
                className="flex-1 px-2 py-1 text-sm border rounded"
                placeholder="Responder..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && replyText.trim()) {
                    addComment.mutate({ workspaceId, content: replyText.trim(), parentId: comment.id })
                    setReplyText(""); setReplyTo(null)
                  }
                }}
              />
              <Button size="sm" className="h-7 text-xs" onClick={() => { setReplyTo(null); setReplyText("") }}>Cancelar</Button>
            </div>
          ) : (
            <button className="text-xs text-primary hover:underline ml-6" onClick={() => setReplyTo(comment.id)}>
              Responder
            </button>
          )}
        </div>
      ))}

      {comments.length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">Nenhum comentário ainda.</p>
      )}
    </div>
  )
}

function WorkspaceDocumentsTab({ workspaceId, documents }: { workspaceId: string; documents: any[] }) {
  const utils = trpc.useUtils()
  const validateDoc = trpc.deadlines.workspace.validateDocument.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })
  const removeDoc = trpc.deadlines.workspace.removeDocument.useMutation({
    onSuccess: () => utils.deadlines.workspace.get.invalidate({ workspaceId }),
  })

  const catColors: Record<string, string> = {
    ANEXO: "bg-blue-100 text-blue-700",
    PROVA: "bg-green-100 text-green-700",
    PROCURACAO: "bg-purple-100 text-purple-700",
    GUIA: "bg-amber-100 text-amber-700",
    JURISPRUDENCIA: "bg-cyan-100 text-cyan-700",
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Documentos e Anexos</h2>
        <Button size="sm" variant="outline" onClick={() => alert("Upload via integração com GED (em desenvolvimento)")}>
          + Upload
        </Button>
      </div>

      {documents.map(doc => (
        <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
          <Paperclip className="size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground">{doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB</p>
          </div>
          <Badge className={catColors[doc.category] || "bg-gray-100 text-gray-600"} variant="secondary">
            {doc.category}
          </Badge>
          {doc.is_validated ? (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Validado</Badge>
          ) : (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => validateDoc.mutate({ documentId: doc.id, validated: true })}>
              Validar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeDoc.mutate({ documentId: doc.id })}>
            <span className="text-xs">×</span>
          </Button>
        </div>
      ))}

      {documents.length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">Nenhum documento anexado.</p>
      )}
    </div>
  )
}

function WorkspaceApprovalTab({ workspaceId, approvals, phase }: { workspaceId: string; approvals: any[]; phase: string }) {
  const utils = trpc.useUtils()
  const { data: users } = trpc.deadlines.usersForSelect.useQuery()
  const requestApproval = trpc.deadlines.workspace.requestApproval.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
    },
  })
  const decideApproval = trpc.deadlines.workspace.decideApproval.useMutation({
    onSuccess: () => {
      utils.deadlines.workspace.get.invalidate({ workspaceId })
      utils.deadlines.workspace.stats.invalidate({ workspaceId })
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Request approval */}
      {(phase === "REVISAO" || phase === "RASCUNHO") && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h3 className="text-sm font-semibold">Solicitar Aprovação</h3>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={selectedApprover}
            onChange={e => setSelectedApprover(e.target.value)}
          >
            <option value="">Selecione o aprovador...</option>
            {users?.filter(u => u.role === "SOCIO" || u.role === "ADMIN").map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedApprover || requestApproval.isPending}
            onClick={() => requestApproval.mutate({ workspaceId, approverId: selectedApprover })}
          >
            Solicitar Aprovação
          </Button>
        </div>
      )}

      {/* Approval history */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Histórico de Aprovações</h3>
        {approvals.map(a => (
          <div key={a.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rodada {a.round}</span>
                <Badge className={statusColors[a.status] || ""}>{a.status}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(a.requested_at).toLocaleString("pt-BR")}
              </span>
            </div>

            {a.feedback && <p className="text-sm bg-gray-50 p-2 rounded">{a.feedback}</p>}
            {a.corrections_required && (
              <div className="bg-red-50 p-2 rounded text-sm">
                <span className="font-medium text-red-700">Correções necessárias:</span> {a.corrections_required}
              </div>
            )}

            {/* Decision buttons for pending approvals */}
            {a.status === "PENDENTE" && (
              <div className="space-y-2 pt-2 border-t">
                <textarea
                  className="w-full p-2 border rounded text-sm"
                  placeholder="Feedback (opcional)..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => { decideApproval.mutate({ approvalId: a.id, status: "APROVADO", feedback }); setFeedback("") }}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { decideApproval.mutate({ approvalId: a.id, status: "APROVADO_COM_RESSALVAS", feedback }); setFeedback("") }}
                  >
                    Aprovar com Ressalvas
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { decideApproval.mutate({ approvalId: a.id, status: "REPROVADO", feedback, correctionsRequired: feedback }); setFeedback("") }}
                  >
                    Reprovar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {approvals.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma aprovação solicitada.</p>
        )}
      </div>
    </div>
  )
}

function WorkspaceActivitiesTab({ workspaceId }: { workspaceId: string }) {
  const { data } = trpc.deadlines.workspace.listActivities.useQuery({ workspaceId })

  const actionIcons: Record<string, string> = {
    CREATED: "🆕",
    PHASE_CHANGED: "📋",
    CONTENT_EDITED: "✏️",
    VERSION_SAVED: "💾",
    COMMENT_ADDED: "💬",
    COMMENT_RESOLVED: "✅",
    THESIS_ADDED: "⚖️",
    THESIS_UPDATED: "⚖️",
    CHECKLIST_CHECKED: "☑️",
    APPROVAL_REQUESTED: "🔐",
    APPROVAL_DECIDED: "✅",
    DOCUMENT_UPLOADED: "📎",
    DOCUMENT_VALIDATED: "✔️",
    LOCKED: "🔒",
    UNLOCKED: "🔓",
    DELEGATED: "👥",
    PROTOCOL_REGISTERED: "📝",
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-sm font-semibold mb-4">Timeline de Atividades</h2>
      <div className="space-y-0">
        {data?.items.map((a, idx) => (
          <div key={a.id} className="flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <span className="text-lg">{actionIcons[a.action] || "📌"}</span>
              {idx < (data?.items.length || 0) - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-sm">{a.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {a.user_name && <span>{a.user_name}</span>}
                <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          </div>
        ))}

        {(!data?.items || data.items.length === 0) && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma atividade registrada.</p>
        )}
      </div>
    </div>
  )
}
