"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, Plus, Pin, Trash2, Send, CheckCircle2,
  AlertTriangle, Calendar, User, Loader2, MessageSquare,
  ListTodo, ChevronRight, Star, ArrowUp, Minus, Phone,
  Mail, Users, Target, Columns3, LayoutList, DollarSign,
  Clock, Pencil, Link2,
} from "lucide-react"
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_CATEGORY_LABELS,
  PRIORITY_LABELS, PRIORITY_COLORS, PROJECT_TASK_TYPE_LABELS,
  PROJECT_TASK_STATUS_LABELS, PROJECT_TASK_STATUS_COLORS,
  PROJECT_PHASE_STATUS_LABELS, MILESTONE_STATUS_LABELS,
  MILESTONE_IMPACT_LABELS, STAKEHOLDER_ROLE_LABELS,
  PROJECT_TEAM_ROLE_LABELS, EXPENSE_CATEGORY_LABELS,
  CASE_TYPE_LABELS, CASE_STATUS_LABELS,
  formatCurrency, formatCNJ, daysUntil, deadlineColor,
} from "@/lib/constants"
import { TiptapEditor, TiptapViewer } from "@/components/ui/tiptap-editor"
import { ActivityTimeline } from "@/components/atividades/activity-timeline"

interface ProjectDetailProps {
  projectId: string
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter()
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId })
  const { data: users } = trpc.users.list.useQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projeto nao encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/projetos")}>Voltar</Button>
      </div>
    )
  }

  const totalTasks = project.tarefas.length
  const doneTasks = project.tarefas.filter((t) => t.status === "CONCLUIDA").length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const overdueTasks = project.tarefas.filter(
    (t) => t.data_limite && new Date(t.data_limite) < new Date() && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  )
  const upcomingMilestones = project.marcos.filter((m) => m.status === "PENDENTE")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/projetos")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground font-mono">{project.codigo}</span>
            <Badge variant="secondary" className={PROJECT_STATUS_COLORS[project.status] || ""}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <Badge variant="secondary" className={PRIORITY_COLORS[project.prioridade] || ""}>
              {PRIORITY_LABELS[project.prioridade]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{project.titulo}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.cliente.nome} &bull; {PROJECT_CATEGORY_LABELS[project.categoria]}
            {project.advogado_responsavel && ` \u2022 Resp: ${project.advogado_responsavel.name}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="resumo">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-9">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="marcos">Marcos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="comunicacoes">Comunicacoes</TabsTrigger>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
          </TabsList>
        </div>

        {/* ─── RESUMO ──────────────────────────────────────── */}
        <TabsContent value="resumo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Progresso Geral</div>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={progress} className="h-3 flex-1" />
                  <span className="text-lg font-bold">{progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{doneTasks}/{totalTasks} tarefas concluidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Valor Envolvido</div>
                <div className="text-lg font-bold mt-1">{formatCurrency(project.valor_envolvido)}</div>
                <p className="text-xs text-muted-foreground">Honorarios: {formatCurrency(project.valor_honorarios)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Periodo</div>
                <div className="text-sm font-medium mt-1">
                  {project.data_inicio ? new Date(project.data_inicio).toLocaleDateString("pt-BR") : "\u2014"}
                  {" \u2192 "}
                  {project.data_prevista_conclusao ? new Date(project.data_prevista_conclusao).toLocaleDateString("pt-BR") : "\u2014"}
                </div>
                {project.data_conclusao_real && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Concluido em {new Date(project.data_conclusao_real).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {(overdueTasks.length > 0 || upcomingMilestones.length > 0) && (
            <div className="space-y-2">
              {overdueTasks.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertTriangle className="size-4 text-red-600" />
                  <span className="text-sm text-red-700">{overdueTasks.length} tarefa(s) atrasada(s)</span>
                </div>
              )}
              {upcomingMilestones.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <Target className="size-4 text-blue-600" />
                  <span className="text-sm text-blue-700">{upcomingMilestones.length} marco(s) pendente(s)</span>
                </div>
              )}
            </div>
          )}

          {project.descricao && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Descricao</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{project.descricao}</p></CardContent>
            </Card>
          )}

          {project.anotacoes.filter((n) => n.fixada).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Pin className="size-3" /> Notas Fixadas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {project.anotacoes.filter((n) => n.fixada).map((note) => (
                  <div key={note.id} className="rounded border p-3 bg-amber-50/50">
                    <TiptapViewer content={note.conteudo} />
                    <p className="text-xs text-muted-foreground mt-2">
                      {note.user.name} - {new Date(note.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {project.marcos.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Marcos</CardTitle></CardHeader>
              <CardContent>
                <MilestonesTimeline marcos={project.marcos} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── TAREFAS ─────────────────────────────────────── */}
        <TabsContent value="tarefas">
          <TasksTab project={project} users={users || []} projectId={projectId} />
        </TabsContent>

        {/* ─── MARCOS ──────────────────────────────────────── */}
        <TabsContent value="marcos">
          <MilestonesTab project={project} projectId={projectId} />
        </TabsContent>

        {/* ─── FINANCEIRO ──────────────────────────────────── */}
        <TabsContent value="financeiro">
          <FinanceiroTab project={project} projectId={projectId} />
        </TabsContent>

        {/* ─── COMUNICAÇÕES ────────────────────────────────── */}
        <TabsContent value="comunicacoes">
          <ComunicacoesTab project={project} projectId={projectId} />
        </TabsContent>

        {/* ─── PROCESSOS ───────────────────────────────────── */}
        <TabsContent value="processos">
          <ProcessosTab project={project} projectId={projectId} />
        </TabsContent>

        {/* ─── EQUIPE ──────────────────────────────────────── */}
        <TabsContent value="equipe">
          <TeamTab project={project} users={users || []} projectId={projectId} />
        </TabsContent>

        {/* ─── NOTAS ───────────────────────────────────────── */}
        <TabsContent value="notas">
          <NotesTab project={project} projectId={projectId} />
        </TabsContent>

        {/* ─── ATIVIDADES ──────────────────────────────────── */}
        <TabsContent value="atividades">
          <ActivityTimeline projectId={projectId} showFilters groupByDate />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Horizontal Milestones Timeline
// ──────────────────────────────────────────────────────────
function MilestonesTimeline({ marcos }: {
  marcos: Array<{ id: string; titulo: string; status: string; impacto: string; data_prevista?: Date | string | null; data_alcancada?: Date | string | null }>
}) {
  const now = new Date()

  function getColor(m: { status: string; data_prevista?: Date | string | null }) {
    if (m.status === "ALCANCADO") return { bg: "#38a169", ring: "ring-emerald-200" }
    if (m.status === "CANCELADO") return { bg: "#a0aec0", ring: "ring-gray-200" }
    if (m.data_prevista && new Date(m.data_prevista) < now && m.status === "PENDENTE") return { bg: "#e53e3e", ring: "ring-red-200" }
    if (m.data_prevista) {
      const diff = Math.ceil((new Date(m.data_prevista).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (diff <= 7) return { bg: "#d69e2e", ring: "ring-yellow-200" }
    }
    return { bg: "#a0aec0", ring: "ring-gray-200" }
  }

  function getImpactIcon(impacto: string) {
    if (impacto === "CRITICO") return <Star className="size-3 text-white" />
    if (impacto === "ALTO") return <ArrowUp className="size-3 text-white" />
    return <Minus className="size-2.5 text-white" />
  }

  return (
    <div className="overflow-x-auto py-2">
      <div className="relative flex items-center min-w-[500px]">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border -translate-y-1/2" />
        <div className="flex items-start justify-between w-full relative">
          {marcos.map((m) => {
            const colors = getColor(m)
            return (
              <Popover key={m.id}>
                <PopoverTrigger asChild>
                  <button className="flex flex-col items-center gap-2 min-w-[80px] relative z-10 group">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center ring-4 ${colors.ring} cursor-pointer group-hover:scale-110 transition-transform`}
                      style={{ backgroundColor: colors.bg }}
                    >
                      {getImpactIcon(m.impacto)}
                    </div>
                    <div className="text-center max-w-[100px]">
                      <p className="text-[10px] font-medium leading-tight truncate">{m.titulo}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {m.status === "ALCANCADO" && m.data_alcancada
                          ? `Alcancado ${new Date(m.data_alcancada).toLocaleDateString("pt-BR")}`
                          : m.data_prevista ? new Date(m.data_prevista).toLocaleDateString("pt-BR") : "Sem data"}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">{m.titulo}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{MILESTONE_STATUS_LABELS[m.status]}</Badge>
                      <Badge variant="outline" className="text-[10px]">{MILESTONE_IMPACT_LABELS[m.impacto]}</Badge>
                    </div>
                    {m.data_prevista && (
                      <p className="text-xs text-muted-foreground">
                        Previsto: {new Date(m.data_prevista).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {m.data_alcancada && (
                      <p className="text-xs text-emerald-600">
                        Alcancado: {new Date(m.data_alcancada).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Tasks Tab (unchanged from before)
// ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TasksTab({ project, users, projectId }: { project: any; users: Array<{ id: string; name: string }>; projectId: string }) {
  const utils = trpc.useUtils()
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskPhaseId, setNewTaskPhaseId] = useState<string | null>(null)

  const addTask = trpc.projects.addTask.useMutation({
    onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setShowNewTask(false) },
  })
  const updateTaskStatus = trpc.projects.updateTaskStatus.useMutation({
    onSuccess: () => utils.projects.getById.invalidate({ id: projectId }),
  })

  const KANBAN_COLS = [
    { key: "BACKLOG", label: "Backlog" },
    { key: "A_FAZER", label: "A Fazer" },
    { key: "EM_ANDAMENTO", label: "Em Andamento" },
    { key: "EM_REVISAO", label: "Revisao" },
    { key: "AGUARDANDO", label: "Aguardando" },
    { key: "CONCLUIDA", label: "Concluida" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")}><LayoutList className="size-4 mr-1" /> Lista</Button>
          <Button size="sm" variant={viewMode === "kanban" ? "secondary" : "ghost"} onClick={() => setViewMode("kanban")}><Columns3 className="size-4 mr-1" /> Kanban</Button>
        </div>
        <Button size="sm" onClick={() => { setShowNewTask(true); setNewTaskPhaseId(null) }}><Plus className="size-4 mr-1" /> Nova Tarefa</Button>
      </div>
      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} projectId={projectId} phaseId={newTaskPhaseId} phases={project.etapas} users={users} onSubmit={(data) => addTask.mutate(data)} isPending={addTask.isPending} />
      {viewMode === "list" ? (
        <div className="space-y-4">
          {project.etapas.map((phase: PhaseItem) => (
            <Accordion key={phase.id} type="single" collapsible defaultValue={phase.id}>
              <AccordionItem value={phase.id} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="font-medium">{phase.titulo}</span>
                    <Badge variant="secondary" className="text-[10px]">{PROJECT_PHASE_STATUS_LABELS[phase.status]}</Badge>
                    <div className="flex items-center gap-1 ml-auto mr-2">
                      <Progress value={phase.percentual_conclusao} className="h-1.5 w-16" />
                      <span className="text-xs text-muted-foreground">{phase.percentual_conclusao}%</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {phase.tarefas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">Nenhuma tarefa nesta etapa.</p>
                    ) : phase.tarefas.map((task) => (
                      <TaskRow key={task.id} task={task} onStatusChange={(status) => updateTaskStatus.mutate({ id: task.id, status })} />
                    ))}
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setNewTaskPhaseId(phase.id); setShowNewTask(true) }}>
                      <Plus className="size-3 mr-1" /> Adicionar tarefa
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
          {project.tarefas.filter((t: TaskItem) => !t.phase).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Tarefas Avulsas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {project.tarefas.filter((t: TaskItem) => !t.phase).map((task: TaskItem) => (
                  <TaskRow key={task.id} task={task} onStatusChange={(status) => updateTaskStatus.mutate({ id: task.id, status })} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {KANBAN_COLS.map((col) => {
            const colTasks = project.tarefas.filter((t: TaskItem) => t.status === col.key)
            return (
              <div key={col.key} className="rounded-lg bg-muted/30 p-2 min-h-[200px]">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold">{col.label}</h4>
                  <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task: TaskItem) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface PhaseItem { id: string; titulo: string; status: string; percentual_conclusao: number; tarefas: TaskItem[] }
interface TaskItem {
  id: string; titulo: string; descricao?: string | null; tipo: string; status: string; prioridade: string
  data_limite?: Date | string | null; responsavel?: { id: string; name: string } | null
  phase?: { id: string; titulo: string } | null
  checklist: Array<{ id: string; descricao: string; concluido: boolean }>
  _count: { comentarios: number; documentos: number }
}

function TaskRow({ task, onStatusChange }: { task: TaskItem; onStatusChange: (s: string) => void }) {
  const isOverdue = task.data_limite && new Date(task.data_limite) < new Date() && !["CONCLUIDA", "CANCELADA"].includes(task.status)
  const checkDone = task.checklist.filter((c) => c.concluido).length
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${isOverdue ? "border-red-200 bg-red-50/50" : ""}`}>
      <Checkbox checked={task.status === "CONCLUIDA"} onCheckedChange={(checked) => onStatusChange(checked ? "CONCLUIDA" : "A_FAZER")} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.status === "CONCLUIDA" ? "line-through text-muted-foreground" : ""}`}>{task.titulo}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] ${PROJECT_TASK_STATUS_COLORS[task.status] || ""}`}>{PROJECT_TASK_STATUS_LABELS[task.status]}</Badge>
          <Badge variant="outline" className="text-[10px]">{PROJECT_TASK_TYPE_LABELS[task.tipo]}</Badge>
          {task.checklist.length > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><ListTodo className="size-3" />{checkDone}/{task.checklist.length}</span>}
          {task._count.comentarios > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MessageSquare className="size-3" />{task._count.comentarios}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.responsavel && <span className="text-xs text-muted-foreground">{task.responsavel.name}</span>}
        {task.data_limite && <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{new Date(task.data_limite).toLocaleDateString("pt-BR")}</span>}
        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[task.prioridade] || ""}`}>{PRIORITY_LABELS[task.prioridade]?.[0]}</Badge>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: TaskItem }) {
  const isOverdue = task.data_limite && new Date(task.data_limite) < new Date() && !["CONCLUIDA", "CANCELADA"].includes(task.status)
  const checkDone = task.checklist.filter((c) => c.concluido).length
  return (
    <Card className={`cursor-pointer hover:shadow-sm ${isOverdue ? "border-red-200" : ""}`}>
      <CardContent className="p-2 space-y-1">
        <p className="text-xs font-medium">{task.titulo}</p>
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="secondary" className={`text-[9px] ${PRIORITY_COLORS[task.prioridade] || ""}`}>{PRIORITY_LABELS[task.prioridade]?.[0]}</Badge>
          {task.checklist.length > 0 && <span className="text-[9px] text-muted-foreground">{checkDone}/{task.checklist.length}</span>}
        </div>
        <div className="flex items-center justify-between">
          {task.responsavel && <span className="text-[9px] text-muted-foreground">{task.responsavel.name}</span>}
          {task.data_limite && <span className={`text-[9px] ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>{new Date(task.data_limite).toLocaleDateString("pt-BR")}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NewTaskDialog({ open, onOpenChange, projectId, phaseId, phases, users, onSubmit, isPending }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; phaseId: string | null; phases: Array<{ id: string; titulo: string }>; users: Array<{ id: string; name: string }>; onSubmit: (d: any) => void; isPending: boolean }) {
  const [titulo, setTitulo] = useState(""); const [descricao, setDescricao] = useState(""); const [tipo, setTipo] = useState("OUTRO")
  const [prioridade, setPrioridade] = useState("MEDIA"); const [responsavelId, setResponsavelId] = useState(""); const [selectedPhaseId, setSelectedPhaseId] = useState(phaseId || ""); const [dataLimite, setDataLimite] = useState("")
  const handleSubmit = () => { if (!titulo.trim()) return; onSubmit({ project_id: projectId, titulo, descricao: descricao || null, tipo, prioridade, responsavel_id: responsavelId || null, phase_id: selectedPhaseId || null, data_limite: dataLimite || null }); setTitulo(""); setDescricao(""); setTipo("OUTRO"); setPrioridade("MEDIA"); setResponsavelId(""); setDataLimite("") }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Titulo *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Titulo da tarefa..." /></div>
          <div><Label>Descricao</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PROJECT_TASK_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Prioridade</Label><Select value={prioridade} onValueChange={setPrioridade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Etapa</Label><Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}><SelectTrigger><SelectValue placeholder="Avulsa" /></SelectTrigger><SelectContent><SelectItem value="">Avulsa (sem etapa)</SelectItem>{phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Responsavel</Label><Select value={responsavelId} onValueChange={setResponsavelId}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Prazo</Label><Input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !titulo.trim()}>{isPending && <Loader2 className="size-4 mr-1 animate-spin" />}Criar Tarefa</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────────────────────────────────────
// MARCOS TAB (enhanced)
// ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MilestonesTab({ project, projectId }: { project: any; projectId: string }) {
  const utils = trpc.useUtils()
  const [showNew, setShowNew] = useState(false)
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline")
  const [newTitulo, setNewTitulo] = useState(""); const [newDescricao, setNewDescricao] = useState(""); const [newData, setNewData] = useState(""); const [newImpacto, setNewImpacto] = useState("MEDIO"); const [newNotificar, setNewNotificar] = useState(false)

  const addMilestone = trpc.projects.addMilestone.useMutation({
    onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setShowNew(false); setNewTitulo(""); setNewDescricao(""); setNewData(""); setNewNotificar(false) },
  })
  const updateMilestone = trpc.projects.updateMilestone.useMutation({
    onSuccess: () => utils.projects.getById.invalidate({ id: projectId }),
  })
  const deleteMilestone = trpc.projects.deleteMilestone.useMutation({
    onSuccess: () => utils.projects.getById.invalidate({ id: projectId }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={viewMode === "timeline" ? "secondary" : "ghost"} onClick={() => setViewMode("timeline")}>Timeline</Button>
          <Button size="sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")}>Lista</Button>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="size-4 mr-1" /> Novo Marco</Button>
      </div>

      {showNew && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Titulo *</Label><Input value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} placeholder="Ex: Alvara expedido" /></div>
              <div><Label>Data Prevista</Label><Input type="date" value={newData} onChange={(e) => setNewData(e.target.value)} /></div>
            </div>
            <div><Label>Descricao</Label><Textarea value={newDescricao} onChange={(e) => setNewDescricao(e.target.value)} rows={2} /></div>
            <div className="flex items-center gap-6">
              <div className="w-[200px]"><Label>Impacto</Label><Select value={newImpacto} onValueChange={setNewImpacto}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MILESTONE_IMPACT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center gap-2 pt-5"><Checkbox id="notificar" checked={newNotificar} onCheckedChange={(v) => setNewNotificar(!!v)} /><Label htmlFor="notificar" className="cursor-pointer">Notificar cliente ao alcancar</Label></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button size="sm" disabled={addMilestone.isPending || !newTitulo.trim()} onClick={() => addMilestone.mutate({ project_id: projectId, titulo: newTitulo, descricao: newDescricao || null, data_prevista: newData || null, impacto: newImpacto, notificar_cliente: newNotificar })}>Criar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {project.marcos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum marco definido.</p>
      ) : viewMode === "timeline" ? (
        <Card>
          <CardContent className="pt-6 pb-4">
            <MilestonesTimeline marcos={project.marcos} />
            <div className="mt-6 space-y-3">
              {project.marcos.map((m: MilestoneItem) => (
                <MilestoneCard key={m.id} m={m} onAchieve={() => updateMilestone.mutate({ id: m.id, status: "ALCANCADO", notificar_cliente: m.notificar_cliente })} onDelete={() => deleteMilestone.mutate({ id: m.id })} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Alcancado em</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.marcos.map((m: MilestoneItem) => (
                <TableRow key={m.id}>
                  <TableCell><div><p className="font-medium text-sm">{m.titulo}</p>{m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}</div></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{MILESTONE_STATUS_LABELS[m.status]}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{MILESTONE_IMPACT_LABELS[m.impacto]}</Badge></TableCell>
                  <TableCell className="text-sm">{m.data_prevista ? new Date(m.data_prevista).toLocaleDateString("pt-BR") : "\u2014"}</TableCell>
                  <TableCell className="text-sm text-emerald-600">{m.data_alcancada ? new Date(m.data_alcancada).toLocaleDateString("pt-BR") : "\u2014"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {m.status === "PENDENTE" && <Button size="sm" variant="outline" onClick={() => updateMilestone.mutate({ id: m.id, status: "ALCANCADO", notificar_cliente: m.notificar_cliente })}><CheckCircle2 className="size-3" /></Button>}
                      <Button size="icon" variant="ghost" className="size-7 text-red-500" onClick={() => deleteMilestone.mutate({ id: m.id })}><Trash2 className="size-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

interface MilestoneItem { id: string; titulo: string; descricao?: string | null; status: string; impacto: string; data_prevista?: Date | string | null; data_alcancada?: Date | string | null; notificar_cliente: boolean }

function MilestoneCard({ m, onAchieve, onDelete }: { m: MilestoneItem; onAchieve: () => void; onDelete: () => void }) {
  const SC: Record<string, string> = { PENDENTE: "border-l-gray-400", ALCANCADO: "border-l-emerald-500", ATRASADO: "border-l-red-500", CANCELADO: "border-l-gray-300" }
  return (
    <Card className={`border-l-4 ${SC[m.status] || ""}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><h4 className="font-medium">{m.titulo}</h4><Badge variant="secondary" className="text-[10px]">{MILESTONE_STATUS_LABELS[m.status]}</Badge><Badge variant="outline" className="text-[10px]">{MILESTONE_IMPACT_LABELS[m.impacto]}</Badge></div>
            {m.descricao && <p className="text-sm text-muted-foreground mt-1">{m.descricao}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {m.data_prevista && <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(m.data_prevista).toLocaleDateString("pt-BR")}</span>}
              {m.data_alcancada && <span className="text-emerald-600">Alcancado em {new Date(m.data_alcancada).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {m.status === "PENDENTE" && <Button size="sm" variant="outline" onClick={onAchieve}><CheckCircle2 className="size-3 mr-1" />Alcancado</Button>}
            <Button size="icon" variant="ghost" className="size-7 text-red-500" onClick={onDelete}><Trash2 className="size-3" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────
// FINANCEIRO TAB
// ──────────────────────────────────────────────────────────
const VALOR_HORA_DEFAULT = 350

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FinanceiroTab({ project, projectId }: { project: any; projectId: string }) {
  const utils = trpc.useUtils()
  const { data: expenses } = trpc.projects.listExpenses.useQuery({ project_id: projectId })
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [expDesc, setExpDesc] = useState(""); const [expValor, setExpValor] = useState(""); const [expData, setExpData] = useState(new Date().toISOString().split("T")[0]); const [expCat, setExpCat] = useState("OUTRO")

  const addExpense = trpc.projects.addExpense.useMutation({
    onSuccess: () => { utils.projects.listExpenses.invalidate({ project_id: projectId }); setShowNewExpense(false); setExpDesc(""); setExpValor(""); setExpCat("OUTRO") },
  })
  const deleteExpense = trpc.projects.deleteExpense.useMutation({
    onSuccess: () => utils.projects.listExpenses.invalidate({ project_id: projectId }),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + parseFloat(e.valor || 0), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalHoras = project.tarefas.reduce((sum: number, t: any) => sum + parseFloat(t.horas_gastas || 0), 0)
  const custoInterno = totalHoras * VALOR_HORA_DEFAULT
  const honorariosPrev = parseFloat(project.valor_honorarios || 0)
  const resultado = honorariosPrev - totalExpenses - custoInterno

  // Alvara tracking
  const isAlvara = project.categoria === "ALVARA_LIBERACAO"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alvaraTasks = project.tarefas.filter((t: any) => t.tipo === "OBTENCAO_ALVARA" || t.tipo === "LIBERACAO_VALORES")
  const ALVARA_STEPS = ["PETICIONADO", "DEFERIDO", "EXPEDIDO", "ENVIADO_BANCO", "LIBERADO"]
  const ALVARA_LABELS: Record<string, string> = { PETICIONADO: "Peticionado", DEFERIDO: "Deferido", EXPEDIDO: "Expedido", ENVIADO_BANCO: "Enviado ao Banco", LIBERADO: "Liberado" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getAlvaraStep(task: any): string {
    const campos = task.campos_especificos
    if (campos && typeof campos === "object" && "status_liberacao" in campos) return campos.status_liberacao
    if (task.status === "CONCLUIDA") return "LIBERADO"
    return "PETICIONADO"
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="size-4" />Valor da Operacao</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(project.valor_envolvido)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Honorarios</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(project.valor_honorarios)}</div>
            <Progress value={honorariosPrev > 0 ? 0 : 0} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Previsto (recebimento a implementar)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" />Horas Investidas</div>
            <div className="text-xl font-bold mt-1">{totalHoras.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Custo interno: {formatCurrency(custoInterno)} (R$ {VALOR_HORA_DEFAULT}/h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Resultado</div>
            <div className={`text-xl font-bold mt-1 ${resultado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(resultado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Honorarios - Custos - Horas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alvara tracking */}
      {isAlvara && alvaraTasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Rastreamento da Liberacao</CardTitle></CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {alvaraTasks.map((task: any) => {
              const currentStep = getAlvaraStep(task)
              const currentIdx = ALVARA_STEPS.indexOf(currentStep)
              return (
                <div key={task.id} className="mb-4 last:mb-0">
                  <p className="text-sm font-medium mb-3">{task.titulo}</p>
                  <div className="flex items-center gap-0">
                    {ALVARA_STEPS.map((step, idx) => {
                      const isActive = idx <= currentIdx
                      const isCurrent = idx === currentIdx
                      return (
                        <div key={step} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"} ${isCurrent ? "ring-4 ring-emerald-200" : ""}`}>
                              {idx + 1}
                            </div>
                            <p className={`text-[10px] mt-1 text-center ${isActive ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>
                              {ALVARA_LABELS[step]}
                            </p>
                          </div>
                          {idx < ALVARA_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 ${idx < currentIdx ? "bg-emerald-500" : "bg-gray-200"}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Expenses table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Custos Incorridos</CardTitle>
          <Button size="sm" onClick={() => setShowNewExpense(!showNewExpense)}><Plus className="size-4 mr-1" />Nova Despesa</Button>
        </CardHeader>
        <CardContent>
          {showNewExpense && (
            <div className="p-3 bg-muted/30 rounded-lg mb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Descricao *</Label><Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Descricao..." /></div>
                <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={expValor} onChange={(e) => setExpValor(e.target.value)} /></div>
                <div><Label>Data</Label><Input type="date" value={expData} onChange={(e) => setExpData(e.target.value)} /></div>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-[200px]"><Label>Categoria</Label><Select value={expCat} onValueChange={setExpCat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
                <Button size="sm" disabled={addExpense.isPending || !expDesc.trim() || !expValor} onClick={() => addExpense.mutate({ project_id: projectId, descricao: expDesc, valor: parseFloat(expValor), data: expData, categoria: expCat })}>Adicionar</Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewExpense(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {!expenses || expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa registrada.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {expenses.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.descricao}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{EXPENSE_CATEGORY_LABELS[e.categoria] || e.categoria}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(e.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(e.valor)}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="size-7 text-red-500" onClick={() => deleteExpense.mutate({ id: e.id })}><Trash2 className="size-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-2 pr-12">
                <span className="text-sm font-bold">Total: {formatCurrency(totalExpenses)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// COMUNICAÇÕES TAB
// ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComunicacoesTab({ project, projectId }: { project: any; projectId: string }) {
  const utils = trpc.useUtils()
  const [showModal, setShowModal] = useState<"telefonema" | "email" | "reuniao" | null>(null)
  const [filterStakeholder, setFilterStakeholder] = useState("")
  const [desc, setDesc] = useState(""); const [resultado, setResultado] = useState(""); const [duracao, setDuracao] = useState("")

  const addComm = trpc.projects.addCommunication.useMutation({
    onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setShowModal(null); setDesc(""); setResultado(""); setDuracao("") },
  })

  const COMM_TYPES = ["REUNIAO", "TELEFONEMA", "EMAIL", "NEGOCIACAO"]
  const commActivities = project.atividades.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => COMM_TYPES.includes(a.tipo)
  )

  const COMM_ICONS: Record<string, typeof Phone> = { TELEFONEMA: Phone, EMAIL: Mail, REUNIAO: Users, NEGOCIACAO: Target }
  const COMM_COLORS: Record<string, string> = { TELEFONEMA: "bg-green-100 text-green-700", EMAIL: "bg-blue-100 text-blue-700", REUNIAO: "bg-purple-100 text-purple-700", NEGOCIACAO: "bg-amber-100 text-amber-700" }
  const COMM_LABELS: Record<string, string> = { TELEFONEMA: "Telefonema", EMAIL: "E-mail", REUNIAO: "Reuniao", NEGOCIACAO: "Negociacao" }

  const tipoMap: Record<string, string> = { telefonema: "TELEFONEMA", email: "EMAIL", reuniao: "REUNIAO" }
  const modalTitles: Record<string, string> = { telefonema: "Registrar Telefonema", email: "Registrar E-mail", reuniao: "Registrar Reuniao" }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {project.stakeholders.length > 0 && (
            <Select value={filterStakeholder} onValueChange={setFilterStakeholder}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar stakeholder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {project.stakeholders.map((s: any) => <SelectItem key={s.id} value={s.person.nome}>{s.person.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowModal("telefonema")}><Phone className="size-4 mr-1" />Telefonema</Button>
          <Button size="sm" variant="outline" onClick={() => setShowModal("email")}><Mail className="size-4 mr-1" />E-mail</Button>
          <Button size="sm" variant="outline" onClick={() => setShowModal("reuniao")}><Users className="size-4 mr-1" />Reuniao</Button>
        </div>
      </div>

      {/* Registration modal */}
      <Dialog open={!!showModal} onOpenChange={() => setShowModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showModal ? modalTitles[showModal] : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descricao / Assunto *</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder={showModal === "email" ? "Destinatario, assunto, resumo..." : showModal === "reuniao" ? "Participantes, pauta..." : "Contato, assunto..."} /></div>
            <div><Label>Resultado</Label><Textarea value={resultado} onChange={(e) => setResultado(e.target.value)} rows={2} placeholder="Resultado / conclusoes..." /></div>
            {showModal === "telefonema" && <div className="w-[150px]"><Label>Duracao (min)</Label><Input type="number" value={duracao} onChange={(e) => setDuracao(e.target.value)} /></div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(null)}>Cancelar</Button>
              <Button disabled={addComm.isPending || !desc.trim()} onClick={() => addComm.mutate({ project_id: projectId, tipo: tipoMap[showModal!], descricao: desc, resultado: resultado || null, duracao_minutos: duracao ? parseInt(duracao) : null })}>
                {addComm.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {commActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma comunicacao registrada.</p>
      ) : (
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {commActivities.filter((a: any) => !filterStakeholder || a.descricao.toLowerCase().includes(filterStakeholder.toLowerCase())).map((a: any) => {
            const Icon = COMM_ICONS[a.tipo] || MessageSquare
            return (
              <div key={a.id} className="relative pb-4">
                <div className={`absolute -left-4 top-1 size-6 rounded-full flex items-center justify-center ${COMM_COLORS[a.tipo] || "bg-gray-100"}`}>
                  <Icon className="size-3" />
                </div>
                <div className="rounded-lg border p-3 ml-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">{COMM_LABELS[a.tipo] || a.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(a.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-xs text-muted-foreground">por {a.user.name}</span>
                  </div>
                  <p className="text-sm">{a.descricao}</p>
                  {a.resultado && <p className="text-xs text-muted-foreground mt-1">Resultado: {a.resultado}</p>}
                  {a.duracao_minutos && <p className="text-xs text-muted-foreground">Duracao: {a.duracao_minutos} min</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// PROCESSOS TAB (enhanced)
// ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProcessosTab({ project, projectId }: { project: any; projectId: string }) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [showLink, setShowLink] = useState(false)
  const { data: availableCases } = trpc.projects.casesForLinkByClient.useQuery(
    { cliente_id: project.cliente_id, exclude_project_id: projectId },
    { enabled: showLink }
  )
  const linkCase = trpc.projects.linkCase.useMutation({
    onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setShowLink(false) },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowLink(!showLink)}>
          <Link2 className="size-4 mr-1" />Vincular Processo
        </Button>
        <Button size="sm" onClick={() => router.push(`/processos/novo?projeto_id=${projectId}`)}>
          <Plus className="size-4 mr-1" />Criar Novo Processo
        </Button>
      </div>

      {showLink && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-3">Processos ativos do cliente {project.cliente.nome}:</p>
            {!availableCases || availableCases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum processo disponivel para vincular.</p>
            ) : (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {availableCases.filter((c: any) => c.projeto_id !== projectId).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="text-sm font-mono">{formatCNJ(c.numero_processo)}</p>
                      <div className="flex gap-2 mt-1"><Badge variant="secondary" className="text-[10px]">{CASE_TYPE_LABELS[c.tipo] || c.tipo}</Badge><Badge variant="secondary" className="text-[10px]">{CASE_STATUS_LABELS[c.status]}</Badge></div>
                    </div>
                    <Button size="sm" disabled={linkCase.isPending} onClick={() => linkCase.mutate({ case_id: c.id, project_id: projectId })}>Vincular</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Processos Vinculados ({project.processos.length})</CardTitle></CardHeader>
        <CardContent>
          {project.processos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum processo vinculado.</p>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {project.processos.map((c: any) => {
                const nextDeadline = c.prazos?.[0]
                return (
                  <Link key={c.id} href={`/processos/${c.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-mono">{formatCNJ(c.numero_processo)}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{CASE_TYPE_LABELS[c.tipo] || c.tipo}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{CASE_STATUS_LABELS[c.status]}</Badge>
                        {c.advogado_responsavel && <span className="text-[10px] text-muted-foreground">{c.advogado_responsavel.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {nextDeadline && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${deadlineColor(nextDeadline.data_limite)}`}>
                          {new Date(nextDeadline.data_limite).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <ChevronRight className="size-3 text-muted-foreground" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// EQUIPE TAB
// ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TeamTab({ project, users, projectId }: { project: any; users: Array<{ id: string; name: string }>; projectId: string }) {
  const utils = trpc.useUtils()
  const [showAdd, setShowAdd] = useState(false); const [userId, setUserId] = useState(""); const [role, setRole] = useState("MEMBRO")
  const addMember = trpc.projects.addTeamMember.useMutation({ onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setShowAdd(false); setUserId("") } })
  const removeMember = trpc.projects.removeTeamMember.useMutation({ onSuccess: () => utils.projects.getById.invalidate({ id: projectId }) })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Equipe ({project.equipe.length})</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="size-4 mr-1" />Adicionar</Button>
        </CardHeader>
        <CardContent>
          {showAdd && (
            <div className="flex items-end gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1"><Label>Membro</Label><Select value={userId} onValueChange={setUserId}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="w-[160px]"><Label>Papel</Label><Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PROJECT_TEAM_ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
              <Button size="sm" onClick={() => addMember.mutate({ project_id: projectId, user_id: userId, role })} disabled={!userId}>Adicionar</Button>
            </div>
          )}
          {project.equipe.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro na equipe.</p>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {project.equipe.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-3"><div className="size-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="size-4 text-primary" /></div><div><p className="text-sm font-medium">{m.user.name}</p>{m.user.email && <p className="text-xs text-muted-foreground">{m.user.email}</p>}</div></div>
                  <div className="flex items-center gap-2"><Badge variant="secondary" className="text-[10px]">{PROJECT_TEAM_ROLE_LABELS[m.role]}</Badge><Button size="icon" variant="ghost" className="size-7 text-red-500" onClick={() => removeMember.mutate({ id: m.id })}><Trash2 className="size-3" /></Button></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Stakeholders ({project.stakeholders.length})</CardTitle></CardHeader>
        <CardContent>
          {project.stakeholders.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum stakeholder registrado.</p> : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {project.stakeholders.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded border p-3"><div><p className="text-sm font-medium">{s.person.nome}</p><p className="text-xs text-muted-foreground">{s.person.tipo}</p></div><Badge variant="secondary" className="text-[10px]">{STAKEHOLDER_ROLE_LABELS[s.role]}</Badge></div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// NOTAS TAB (with TipTap)
// ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotesTab({ project, projectId }: { project: any; projectId: string }) {
  const utils = trpc.useUtils()
  const [newNote, setNewNote] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const addNote = trpc.projects.addNote.useMutation({ onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setNewNote("") } })
  const updateNote = trpc.projects.updateNote.useMutation({ onSuccess: () => { utils.projects.getById.invalidate({ id: projectId }); setEditingId(null) } })
  const deleteNote = trpc.projects.deleteNote.useMutation({ onSuccess: () => utils.projects.getById.invalidate({ id: projectId }) })

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <TiptapEditor content={newNote} onChange={setNewNote} placeholder="Escreva uma anotacao..." />
          <div className="flex justify-end mt-2">
            <Button size="sm" disabled={addNote.isPending || !newNote.trim() || newNote === "<p></p>"} onClick={() => addNote.mutate({ project_id: projectId, conteudo: newNote })}>
              <Send className="size-3 mr-1" /> Salvar Nota
            </Button>
          </div>
        </CardContent>
      </Card>

      {project.anotacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma anotacao.</p>
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {project.anotacoes.map((note: any) => (
            <Card key={note.id} className={note.fixada ? "border-amber-200 bg-amber-50/30" : ""}>
              <CardContent className="pt-4">
                {editingId === note.id ? (
                  <div>
                    <TiptapEditor content={editContent} onChange={setEditContent} />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                      <Button size="sm" disabled={updateNote.isPending} onClick={() => updateNote.mutate({ id: note.id, conteudo: editContent })}>Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <TiptapViewer content={note.conteudo} />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className={`size-7 ${note.fixada ? "text-amber-600" : ""}`} onClick={() => updateNote.mutate({ id: note.id, fixada: !note.fixada })}><Pin className="size-3" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditingId(note.id); setEditContent(note.conteudo) }}><Pencil className="size-3" /></Button>
                      <Button size="icon" variant="ghost" className="size-7 text-red-500" onClick={() => deleteNote.mutate({ id: note.id })}><Trash2 className="size-3" /></Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center"><User className="size-3 text-primary" /></div>
                  <p className="text-xs text-muted-foreground">
                    {note.user.name} - {new Date(note.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {note.fixada && <Pin className="size-3 text-amber-500" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
