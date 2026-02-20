"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft, Gavel, Users, FileText, StickyNote, Plus,
  MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp,
  Phone, Mail, User, Calendar, Hash, BookOpen,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COURT_TYPE_LABELS: Record<string, string> = {
  VARA_CIVEL: "Vara Civel",
  VARA_EMPRESARIAL: "Vara Empresarial",
  VARA_FAZENDA_PUBLICA: "Vara da Fazenda Publica",
  VARA_TRABALHO: "Vara do Trabalho",
  VARA_FEDERAL: "Vara Federal",
  VARA_FAMILIA: "Vara de Familia",
  VARA_CRIMINAL: "Vara Criminal",
  VARA_FALENCIAS_RJ: "Vara de Falencias e RJ",
  JUIZADO_ESPECIAL: "Juizado Especial",
  TURMA_RECURSAL: "Turma Recursal",
  CAMARA_CIVEL: "Camara Civel",
  CAMARA_EMPRESARIAL: "Camara Empresarial",
  TURMA_TRF: "Turma TRF",
  SECAO_TRF: "Secao TRF",
  TURMA_TST: "Turma TST",
  TURMA_STJ: "Turma STJ",
  TURMA_STF: "Turma STF",
  PLENARIO: "Plenario",
  CORTE_ESPECIAL: "Corte Especial",
  OUTRO_COURT: "Outro",
}

const COURT_INSTANCE_LABELS: Record<string, string> = {
  PRIMEIRA: "1a Instancia",
  SEGUNDA: "2a Instancia",
  SUPERIOR: "Tribunal Superior",
  SUPREMO: "STF",
}

const JUDGE_TITLE_LABELS: Record<string, string> = {
  JUIZ: "Juiz de Direito",
  JUIZ_FEDERAL: "Juiz Federal",
  JUIZ_TRABALHO: "Juiz do Trabalho",
  JUIZ_SUBSTITUTO: "Juiz Substituto",
  DESEMBARGADOR_TJ: "Desembargador",
  DESEMBARGADOR_FEDERAL: "Desembargador Federal",
  MINISTRO_STJ: "Ministro do STJ",
  MINISTRO_TST: "Ministro do TST",
  MINISTRO_STF: "Ministro do STF",
}

const JUDGE_TITLE_KEYS = Object.keys(JUDGE_TITLE_LABELS)

const STAFF_ROLE_LABELS: Record<string, string> = {
  ESCRIVAO: "Escrivao(a)",
  ESCREVENTE: "Escrevente",
  ANALISTA_JUDICIARIO: "Analista Judiciario",
  OFICIAL_JUSTICA: "Oficial de Justica",
  ASSESSOR: "Assessor(a)",
  SECRETARIO_CAMARA: "Secretario(a) de Camara",
  CONCILIADOR: "Conciliador(a)",
  PERITO_JUDICIAL: "Perito Judicial",
  CONTADOR_JUDICIAL: "Contador Judicial",
  ESTAGIARIO_COURT: "Estagiario(a)",
  OUTRO_STAFF: "Outro",
}

const STAFF_ROLE_KEYS = Object.keys(STAFF_ROLE_LABELS)

const CASE_STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  ARQUIVADO: "Arquivado",
  ENCERRADO: "Encerrado",
}

const CASE_STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-[#28A745]/10 text-[#28A745]",
  SUSPENSO: "bg-[#C9A961]/10 text-[#C9A961]",
  ARQUIVADO: "bg-gray-100 text-gray-600",
  ENCERRADO: "bg-[#17A2B8]/10 text-[#17A2B8]",
}

const CASE_TYPE_LABELS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "Recuperacao Judicial",
  FALENCIA: "Falencia",
  EXECUCAO: "Execucao",
  COBRANCA: "Cobranca",
  REESTRUTURACAO_EXTRAJUDICIAL: "Reestruturacao Extrajudicial",
  AGRONEGOCIO: "Agronegocio",
  TRABALHISTA: "Trabalhista",
  TRIBUTARIO: "Tributario",
  SOCIETARIO: "Societario",
  CONTRATUAL: "Contratual",
  OUTRO: "Outro",
}

// ---------------------------------------------------------------------------
// Default form states
// ---------------------------------------------------------------------------

const DEFAULT_JUDGE_FORM = {
  name: "",
  title: "",
  email: "",
  phone: "",
  cellphone: "",
  assistantName: "",
  assistantEmail: "",
  assistantPhone: "",
  specialty: "",
  chamber: "",
  startDate: "",
  registration: "",
  tendencyNotes: "",
  relevantDecisions: "",
  notes: "",
}

const DEFAULT_STAFF_FORM = {
  name: "",
  role: "",
  email: "",
  phone: "",
  cellphone: "",
  notes: "",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CourtDetailProps {
  courtId: string
}

export function CourtDetail({ courtId }: CourtDetailProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  // Data
  const { data: court, isLoading } = trpc.court.getById.useQuery({ id: courtId })

  // Active tab
  const [activeTab, setActiveTab] = useState("judges")

  // Judge state
  const [showJudgeDialog, setShowJudgeDialog] = useState(false)
  const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null)
  const [judgeForm, setJudgeForm] = useState(DEFAULT_JUDGE_FORM)
  const [deleteJudgeId, setDeleteJudgeId] = useState<string | null>(null)
  const [expandedJudge, setExpandedJudge] = useState<string | null>(null)
  const [judgeSearch, setJudgeSearch] = useState("")
  const [judgeTitleFilter, setJudgeTitleFilter] = useState("")

  // Staff state
  const [showStaffDialog, setShowStaffDialog] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [staffForm, setStaffForm] = useState(DEFAULT_STAFF_FORM)
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null)

  // Notes state
  const [notesValue, setNotesValue] = useState<string | null>(null)
  const [notesSaving, setNotesSaving] = useState(false)

  // Queries
  const { data: judges, isLoading: loadingJudges } = trpc.court.judges.list.useQuery({
    courtId,
    search: judgeSearch || undefined,
    title: (judgeTitleFilter || undefined) as any,
  })

  const { data: staff, isLoading: loadingStaff } = trpc.court.staff.list.useQuery({
    courtId,
  })

  // Mutations - Judges
  const createJudge = trpc.court.judges.create.useMutation({
    onSuccess: () => {
      utils.court.judges.list.invalidate()
      utils.court.getById.invalidate({ id: courtId })
      closeJudgeDialog()
    },
  })

  const updateJudge = trpc.court.judges.update.useMutation({
    onSuccess: () => {
      utils.court.judges.list.invalidate()
      closeJudgeDialog()
    },
  })

  const deleteJudgeMutation = trpc.court.judges.delete.useMutation({
    onSuccess: () => {
      utils.court.judges.list.invalidate()
      utils.court.getById.invalidate({ id: courtId })
      setDeleteJudgeId(null)
    },
  })

  // Mutations - Staff
  const createStaff = trpc.court.staff.create.useMutation({
    onSuccess: () => {
      utils.court.staff.list.invalidate()
      closeStaffDialog()
    },
  })

  const updateStaff = trpc.court.staff.update.useMutation({
    onSuccess: () => {
      utils.court.staff.list.invalidate()
      closeStaffDialog()
    },
  })

  const deleteStaffMutation = trpc.court.staff.delete.useMutation({
    onSuccess: () => {
      utils.court.staff.list.invalidate()
      setDeleteStaffId(null)
    },
  })

  // Mutations - Court notes
  const updateCourt = trpc.court.update.useMutation({
    onSuccess: () => {
      utils.court.getById.invalidate({ id: courtId })
      setNotesSaving(false)
    },
  })

  // ---------------------------------------------------------------------------
  // Judge helpers
  // ---------------------------------------------------------------------------

  function closeJudgeDialog() {
    setShowJudgeDialog(false)
    setEditingJudgeId(null)
    setJudgeForm(DEFAULT_JUDGE_FORM)
  }

  function openCreateJudge() {
    setEditingJudgeId(null)
    setJudgeForm(DEFAULT_JUDGE_FORM)
    setShowJudgeDialog(true)
  }

  function openEditJudge(judge: any) {
    setEditingJudgeId(judge.id)
    setJudgeForm({
      name: judge.name || "",
      title: judge.title || "",
      email: judge.email || "",
      phone: judge.phone || "",
      cellphone: judge.cellphone || "",
      assistantName: judge.assistantName || "",
      assistantEmail: judge.assistantEmail || "",
      assistantPhone: judge.assistantPhone || "",
      specialty: judge.specialty || "",
      chamber: judge.chamberName || "",
      startDate: judge.appointmentDate ? new Date(judge.appointmentDate).toISOString().slice(0, 10) : "",
      registration: judge.registrationNumber || "",
      tendencyNotes: judge.tendencyNotes || "",
      relevantDecisions: judge.relevantDecisions || "",
      notes: judge.notes || "",
    })
    setShowJudgeDialog(true)
  }

  function handleSubmitJudge() {
    const payload = {
      courtId,
      name: judgeForm.name,
      title: judgeForm.title as any,
      email: judgeForm.email || undefined,
      phone: judgeForm.phone || undefined,
      cellphone: judgeForm.cellphone || undefined,
      assistantName: judgeForm.assistantName || undefined,
      assistantEmail: judgeForm.assistantEmail || undefined,
      assistantPhone: judgeForm.assistantPhone || undefined,
      specialty: judgeForm.specialty || undefined,
      chamberName: judgeForm.chamber || undefined,
      appointmentDate: judgeForm.startDate ? new Date(judgeForm.startDate) : undefined,
      registrationNumber: judgeForm.registration || undefined,
      tendencyNotes: judgeForm.tendencyNotes || undefined,
      relevantDecisions: judgeForm.relevantDecisions || undefined,
      notes: judgeForm.notes || undefined,
    }

    if (editingJudgeId) {
      updateJudge.mutate({ id: editingJudgeId, ...payload } as any)
    } else {
      createJudge.mutate(payload as any)
    }
  }

  // ---------------------------------------------------------------------------
  // Staff helpers
  // ---------------------------------------------------------------------------

  function closeStaffDialog() {
    setShowStaffDialog(false)
    setEditingStaffId(null)
    setStaffForm(DEFAULT_STAFF_FORM)
  }

  function openCreateStaff() {
    setEditingStaffId(null)
    setStaffForm(DEFAULT_STAFF_FORM)
    setShowStaffDialog(true)
  }

  function openEditStaff(s: any) {
    setEditingStaffId(s.id)
    setStaffForm({
      name: s.name || "",
      role: s.role || "",
      email: s.email || "",
      phone: s.phone || "",
      cellphone: s.cellphone || "",
      notes: s.notes || "",
    })
    setShowStaffDialog(true)
  }

  function handleSubmitStaff() {
    const payload = {
      courtId,
      name: staffForm.name,
      role: staffForm.role as any,
      email: staffForm.email || undefined,
      phone: staffForm.phone || undefined,
      cellphone: staffForm.cellphone || undefined,
      notes: staffForm.notes || undefined,
    }

    if (editingStaffId) {
      updateStaff.mutate({ id: editingStaffId, ...payload } as any)
    } else {
      createStaff.mutate(payload as any)
    }
  }

  // ---------------------------------------------------------------------------
  // Notes helpers
  // ---------------------------------------------------------------------------

  function handleSaveNotes() {
    if (notesValue === null) return
    setNotesSaving(true)
    updateCourt.mutate({ id: courtId, notes: notesValue })
  }

  // ---------------------------------------------------------------------------
  // Loading / Not found
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!court) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Gavel className="size-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold">Vara nao encontrada</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/cadastros/varas")}>
          <ArrowLeft className="size-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const courtData = court as any
  const courtCases = courtData.cases ?? []
  const currentNotes = notesValue !== null ? notesValue : (courtData.notes || "")

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => router.push("/cadastros/varas")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{courtData.name}</h1>
              {courtData.shortName && (
                <span className="text-base text-muted-foreground">({courtData.shortName})</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {courtData.comarca || "\u2014"}
              </span>
              {courtData.state && (
                <Badge variant="outline" className="text-xs">{courtData.state}</Badge>
              )}
              {courtData.tribunal && (
                <Badge variant="secondary" className="text-xs">{courtData.tribunal}</Badge>
              )}
              <Badge variant="secondary" className="text-xs bg-[#C9A961]/10 text-[#C9A961]">
                {COURT_TYPE_LABELS[courtData.courtType] || courtData.courtType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {COURT_INSTANCE_LABELS[courtData.instance] || courtData.instance}
              </Badge>
            </div>
            {(courtData.phone || courtData.email) && (
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {courtData.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {courtData.phone}
                  </span>
                )}
                {courtData.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {courtData.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="judges" className="gap-1.5">
            <Gavel className="size-3.5" />
            Juizes e Desembargadores
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <Users className="size-3.5" />
            Servidores
          </TabsTrigger>
          <TabsTrigger value="cases" className="gap-1.5">
            <FileText className="size-3.5" />
            Processos
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="size-3.5" />
            Observacoes
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* TAB: Judges                                                       */}
        {/* ================================================================= */}
        <TabsContent value="judges" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Input
                  placeholder="Buscar juiz..."
                  value={judgeSearch}
                  onChange={(e) => setJudgeSearch(e.target.value)}
                  className="pl-9 w-[220px]"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
              <Select value={judgeTitleFilter} onValueChange={(v) => setJudgeTitleFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Titulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os Titulos</SelectItem>
                  {JUDGE_TITLE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>{JUDGE_TITLE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreateJudge} className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]">
              <Plus className="size-4 mr-2" />
              Novo Juiz
            </Button>
          </div>

          {loadingJudges ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : !judges || judges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Gavel className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhum juiz cadastrado nesta vara.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {judges.map((judge: any) => {
                const isExpanded = expandedJudge === judge.id
                return (
                  <Card key={judge.id} className="bg-card">
                    <CardContent className="p-4">
                      {/* Main row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{judge.name}</span>
                            <Badge variant="secondary" className="text-xs bg-[#C9A961]/10 text-[#C9A961]">
                              {JUDGE_TITLE_LABELS[judge.title] || judge.title}
                            </Badge>
                            {judge.specialty && (
                              <Badge variant="outline" className="text-xs">{judge.specialty}</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                            {judge.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="size-3" /> {judge.email}
                              </span>
                            )}
                            {judge.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3" /> {judge.phone}
                              </span>
                            )}
                            {judge.chamberName && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="size-3" /> {judge.chamberName}
                              </span>
                            )}
                            {judge.avgDecisionDays != null && (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" /> Tempo medio de decisao: {judge.avgDecisionDays} dias
                              </span>
                            )}
                          </div>

                          {/* Assistant info */}
                          {(judge.assistantName || judge.assistantEmail || judge.assistantPhone) && (
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 inline-flex items-center gap-3 flex-wrap">
                              <span className="font-medium">Assessor:</span>
                              {judge.assistantName && <span>{judge.assistantName}</span>}
                              {judge.assistantEmail && <span>{judge.assistantEmail}</span>}
                              {judge.assistantPhone && <span>{judge.assistantPhone}</span>}
                            </div>
                          )}

                          {/* Tendency notes (expandable) */}
                          {judge.tendencyNotes && (
                            <div className="mt-2">
                              <button
                                onClick={() => setExpandedJudge(isExpanded ? null : judge.id)}
                                className="flex items-center gap-1 text-xs text-[#C9A961] hover:underline"
                              >
                                {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                Tendencias
                              </button>
                              {isExpanded && (
                                <div className="mt-2 space-y-2">
                                  <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 whitespace-pre-wrap">
                                    {judge.tendencyNotes}
                                  </div>
                                  {judge.relevantDecisions && (
                                    <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 whitespace-pre-wrap">
                                      <span className="font-medium block mb-1">Decisoes relevantes:</span>
                                      {judge.relevantDecisions}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 shrink-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditJudge(judge)}>
                              <Pencil className="size-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteJudgeId(judge.id)}
                              className="text-[#DC3545] focus:text-[#DC3545]"
                            >
                              <Trash2 className="size-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB: Staff                                                        */}
        {/* ================================================================= */}
        <TabsContent value="staff" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Servidores ({staff?.length ?? 0})
            </h3>
            <Button onClick={openCreateStaff} className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]">
              <Plus className="size-4 mr-2" />
              Novo Servidor
            </Button>
          </div>

          {loadingStaff ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : !staff || staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhum servidor cadastrado.</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Funcao</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="w-[50px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s: any) => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {STAFF_ROLE_LABELS[s.role] || s.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email || "\u2014"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.phone || "\u2014"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditStaff(s)}>
                              <Pencil className="size-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteStaffId(s.id)}
                              className="text-[#DC3545] focus:text-[#DC3545]"
                            >
                              <Trash2 className="size-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB: Cases                                                        */}
        {/* ================================================================= */}
        <TabsContent value="cases" className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Processos nesta vara ({courtCases.length})
          </h3>

          {courtCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhum processo vinculado a esta vara.</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courtCases.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/processos/${c.id}`}
                          className="font-medium text-[#C9A961] hover:underline font-mono text-sm"
                        >
                          {c.numero_processo || "Sem numero"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.cliente?.nome || "\u2014"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {CASE_TYPE_LABELS[c.tipo] || c.tipo || "\u2014"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${CASE_STATUS_COLORS[c.status] || ""}`}>
                          {CASE_STATUS_LABELS[c.status] || c.status || "\u2014"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB: Notes                                                        */}
        {/* ================================================================= */}
        <TabsContent value="notes" className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Observacoes da vara</h3>
          <Textarea
            rows={10}
            placeholder="Adicione observacoes, informacoes relevantes, particularidades desta vara..."
            value={currentNotes}
            onChange={(e) => setNotesValue(e.target.value)}
            className="min-h-[200px]"
          />
          <div className="flex justify-end">
            <Button
              className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]"
              disabled={notesValue === null || notesSaving}
              onClick={handleSaveNotes}
            >
              {notesSaving ? "Salvando..." : "Salvar Observacoes"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================================================================= */}
      {/* DIALOG: Judge create/edit                                         */}
      {/* ================================================================= */}
      <Dialog open={showJudgeDialog} onOpenChange={(open) => { if (!open) closeJudgeDialog() }}>
        <DialogContent className="sm:max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJudgeId ? "Editar Juiz" : "Novo Juiz"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Nome completo do magistrado"
                  value={judgeForm.name}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Titulo *</Label>
                <Select value={judgeForm.title} onValueChange={(v) => setJudgeForm((p) => ({ ...p, title: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {JUDGE_TITLE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>{JUDGE_TITLE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 - Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  placeholder="juiz@tribunal.jus.br"
                  value={judgeForm.email}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="(00) 0000-0000"
                  value={judgeForm.phone}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Celular</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={judgeForm.cellphone}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, cellphone: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 3 - Assistant */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Assessor</Label>
                <Input
                  placeholder="Nome do assessor(a)"
                  value={judgeForm.assistantName}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, assistantName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail do Assessor</Label>
                <Input
                  type="email"
                  placeholder="assessor@tribunal.jus.br"
                  value={judgeForm.assistantEmail}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, assistantEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone do Assessor</Label>
                <Input
                  placeholder="(00) 0000-0000"
                  value={judgeForm.assistantPhone}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, assistantPhone: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 4 - Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Especialidade</Label>
                <Input
                  placeholder="Ex: Empresarial, Civel"
                  value={judgeForm.specialty}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, specialty: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Camara</Label>
                <Input
                  placeholder="Ex: 1a Camara Civel"
                  value={judgeForm.chamber}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, chamber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Posse</Label>
                <Input
                  type="date"
                  value={judgeForm.startDate}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Matricula</Label>
                <Input
                  placeholder="Numero de matricula"
                  value={judgeForm.registration}
                  onChange={(e) => setJudgeForm((p) => ({ ...p, registration: e.target.value }))}
                />
              </div>
            </div>

            {/* Textareas */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tendencias</Label>
              <Textarea
                rows={3}
                placeholder="Descreva tendencias do magistrado em decisoes, posicionamentos recorrentes..."
                value={judgeForm.tendencyNotes}
                onChange={(e) => setJudgeForm((p) => ({ ...p, tendencyNotes: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Decisoes Relevantes</Label>
              <Textarea
                rows={3}
                placeholder="Registre decisoes relevantes, precedentes..."
                value={judgeForm.relevantDecisions}
                onChange={(e) => setJudgeForm((p) => ({ ...p, relevantDecisions: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observacoes</Label>
              <Textarea
                rows={2}
                placeholder="Outras observacoes..."
                value={judgeForm.notes}
                onChange={(e) => setJudgeForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeJudgeDialog}>
              Cancelar
            </Button>
            <Button
              className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]"
              disabled={!judgeForm.name || !judgeForm.title || createJudge.isPending || updateJudge.isPending}
              onClick={handleSubmitJudge}
            >
              {createJudge.isPending || updateJudge.isPending ? "Salvando..." : editingJudgeId ? "Salvar Alteracoes" : "Cadastrar Juiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: Staff create/edit                                         */}
      {/* ================================================================= */}
      <Dialog open={showStaffDialog} onOpenChange={(open) => { if (!open) closeStaffDialog() }}>
        <DialogContent className="sm:max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaffId ? "Editar Servidor" : "Novo Servidor"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Nome completo"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Funcao *</Label>
                <Select value={staffForm.role} onValueChange={(v) => setStaffForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>{STAFF_ROLE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  placeholder="servidor@tribunal.jus.br"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="(00) 0000-0000"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Celular</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={staffForm.cellphone}
                  onChange={(e) => setStaffForm((p) => ({ ...p, cellphone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observacoes</Label>
              <Textarea
                rows={2}
                placeholder="Observacoes sobre o servidor..."
                value={staffForm.notes}
                onChange={(e) => setStaffForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeStaffDialog}>
              Cancelar
            </Button>
            <Button
              className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]"
              disabled={!staffForm.name || !staffForm.role || createStaff.isPending || updateStaff.isPending}
              onClick={handleSubmitStaff}
            >
              {createStaff.isPending || updateStaff.isPending ? "Salvando..." : editingStaffId ? "Salvar Alteracoes" : "Cadastrar Servidor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: Delete Judge confirmation                                 */}
      {/* ================================================================= */}
      <Dialog open={!!deleteJudgeId} onOpenChange={(open) => { if (!open) setDeleteJudgeId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este juiz? Esta acao nao pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteJudgeId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteJudgeMutation.isPending}
              onClick={() => deleteJudgeId && deleteJudgeMutation.mutate({ id: deleteJudgeId })}
            >
              {deleteJudgeMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: Delete Staff confirmation                                 */}
      {/* ================================================================= */}
      <Dialog open={!!deleteStaffId} onOpenChange={(open) => { if (!open) setDeleteStaffId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este servidor? Esta acao nao pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStaffId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteStaffMutation.isPending}
              onClick={() => deleteStaffId && deleteStaffMutation.mutate({ id: deleteStaffId })}
            >
              {deleteStaffMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
