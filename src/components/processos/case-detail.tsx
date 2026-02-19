"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Scale, Users, FileText, Clock, FolderOpen, UserCog,
  Activity, Landmark, Handshake, Plus, Trash2, Check, X, AlertTriangle,
  ChevronRight, Archive, Pencil, Download, Eye, Wand2, Upload,
  ExternalLink, FileUp,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PersonCombobox } from "@/components/pessoas/person-combobox"
import { ActivityTimeline } from "@/components/atividades/activity-timeline"
import {
  CASE_TYPE_LABELS, CASE_STATUS_LABELS, CASE_PARTY_ROLE_LABELS,
  CASE_TEAM_ROLE_LABELS, DEADLINE_TYPE_LABELS, DEADLINE_STATUS_LABELS,
  MOVEMENT_TYPE_LABELS, DOCUMENT_TYPE_LABELS,
  formatCurrency, formatCNJ, daysUntil, deadlineColor,
} from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-[#28A745]/10 text-[#28A745]",
  SUSPENSO: "bg-[#C9A961]/10 text-[#C9A961]",
  ARQUIVADO: "bg-gray-100 text-gray-600",
  ENCERRADO: "bg-[#17A2B8]/10 text-[#17A2B8]",
}

const TYPE_COLORS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "bg-[#C9A961]/10 text-[#C9A961]",
  FALENCIA: "bg-[#DC3545]/10 text-[#DC3545]",
  EXECUCAO: "bg-orange-100 text-orange-700",
  AGRONEGOCIO: "bg-[#28A745]/10 text-[#28A745]",
  TRIBUTARIO: "bg-sky-100 text-sky-700",
}

const DEADLINE_STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-[#C9A961]/10 text-[#C9A961]",
  CUMPRIDO: "bg-[#28A745]/10 text-[#28A745]",
  PERDIDO: "bg-[#DC3545]/10 text-[#DC3545]",
  CANCELADO: "bg-gray-100 text-gray-600",
}

const CREDITOR_CLASS_LABELS: Record<string, string> = {
  I_TRABALHISTA: "I - Trabalhista",
  II_GARANTIA_REAL: "II - Garantia Real",
  III_QUIROGRAFARIO: "III - Quirografário",
  IV_ME_EPP: "IV - ME/EPP",
}

const CREDITOR_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  HABILITADO: "Habilitado",
  IMPUGNADO: "Impugnado",
  RETIFICADO: "Retificado",
  EXCLUIDO: "Excluído",
}

const CREDITOR_STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-[#C9A961]/10 text-[#C9A961]",
  HABILITADO: "bg-[#28A745]/10 text-[#28A745]",
  IMPUGNADO: "bg-[#DC3545]/10 text-[#DC3545]",
  RETIFICADO: "bg-[#17A2B8]/10 text-[#17A2B8]",
  EXCLUIDO: "bg-gray-100 text-gray-600",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any

function displayValue(value: unknown, fallback = "Não informado"): React.ReactNode {
  if (value == null || value === "" || value === "—") {
    return <span className="text-[#999999] italic">{fallback}</span>
  }
  return String(value)
}

function displayCurrency(value: unknown): React.ReactNode {
  const formatted = formatCurrency(value)
  if (formatted === "—") {
    return <span className="text-[#999999] italic">Não informado</span>
  }
  return formatted
}

export function CaseDetail({ caseId }: { caseId: string }) {
  const router = useRouter()
  const { data: caso, isLoading } = trpc.cases.getById.useQuery({ id: caseId })
  const { data: users } = trpc.users.list.useQuery()
  const utils = trpc.useUtils()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const updateCase = trpc.cases.update.useMutation({
    onSuccess: () => utils.cases.getById.invalidate({ id: caseId }),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!caso) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Scale className="size-12 text-[#666666]/50" />
        <h3 className="mt-4 text-lg font-semibold">Processo não encontrado</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/processos")}>
          Voltar para lista
        </Button>
      </div>
    )
  }

  const isRJ = caso.tipo === "RECUPERACAO_JUDICIAL"

  const tabItems = [
    { value: "resumo", label: "Resumo", icon: Scale },
    { value: "partes", label: "Partes", icon: Users },
    { value: "movimentacoes", label: "Movimentações", icon: Activity },
    { value: "prazos", label: "Prazos", icon: Clock },
    { value: "documentos", label: "Documentos", icon: FolderOpen },
    { value: "equipe", label: "Equipe", icon: UserCog },
    { value: "atividades", label: "Atividades", icon: FileText },
    ...(isRJ ? [
      { value: "credores", label: "Credores", icon: Landmark },
      { value: "negociacoes", label: "Negociações", icon: Handshake },
    ] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/processos")} className="mt-0.5 shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {formatCNJ(caso.numero_processo) || <span className="text-[#999999] italic text-lg font-sans font-normal">Sem número</span>}
              </h1>
              <Badge variant="secondary" className={TYPE_COLORS[caso.tipo] || ""}>
                {CASE_TYPE_LABELS[caso.tipo] || caso.tipo}
              </Badge>
              <Badge variant="secondary" className={STATUS_COLORS[caso.status] || ""}>
                {CASE_STATUS_LABELS[caso.status]}
              </Badge>
            </div>
            <p className="text-[#666666] mt-1">
              Cliente: <Link href={`/pessoas/${caso.cliente.id}`} className="text-primary hover:underline">{caso.cliente.nome}</Link>
              {caso.vara && <> &middot; {caso.vara}</>}
              {caso.comarca && <> &middot; {caso.comarca}</>}
              {caso.uf && <>/{caso.uf}</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => router.push(`/processos/${caseId}?edit=true`)}>
            <Pencil className="mr-2 size-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={() => setArchiveOpen(true)}
          >
            <Archive className="mr-2 size-4" />
            Arquivar
          </Button>
          <Button variant="outline" className="text-[#DC3545] hover:text-[#DC3545] border-[#DC3545]/30 hover:bg-[#DC3545]/5" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 size-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabItems.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <ResumoTab caso={caso} />
        </TabsContent>

        <TabsContent value="partes" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <PartesTab caso={caso} caseId={caseId} utils={utils} />
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <MovimentacoesTab caso={caso} caseId={caseId} utils={utils} />
        </TabsContent>

        <TabsContent value="prazos" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <PrazosTab caso={caso} caseId={caseId} users={users} utils={utils} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <DocumentosTab caso={caso} caseId={caseId} utils={utils} />
        </TabsContent>

        <TabsContent value="equipe" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <EquipeTab caso={caso} caseId={caseId} users={users} utils={utils} />
        </TabsContent>

        <TabsContent value="atividades" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <ActivityTimeline caseId={caseId} showFilters groupByDate />
        </TabsContent>

        {isRJ && (
          <TabsContent value="credores" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
            <CredoresTab caso={caso} caseId={caseId} />
          </TabsContent>
        )}

        {isRJ && (
          <TabsContent value="negociacoes" className="mt-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
            <NegociacoesTab caseId={caseId} />
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Processo</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                alert("Exclusão em desenvolvimento")
                setDeleteOpen(false)
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar Processo</DialogTitle>
            <DialogDescription>
              O processo será marcado como arquivado. Você poderá reativá-lo posteriormente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancelar</Button>
            <Button
              disabled={updateCase.isPending}
              onClick={() => {
                updateCase.mutate(
                  { id: caseId, status: "ARQUIVADO" },
                  { onSuccess: () => setArchiveOpen(false) }
                )
              }}
            >
              {updateCase.isPending ? "Arquivando..." : "Arquivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Resumo Tab ──────────────────────────────────────────────────

function ResumoTab({ caso }: { caso: CaseData }) {
  const pendingDeadlines = (caso.prazos as CaseData[]).filter((p: CaseData) => p.status === "PENDENTE").slice(0, 3)
  const recentMovements = (caso.movimentacoes as CaseData[]).slice(0, 5)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[#666666]">Valor da Causa</p>
            <p className="text-lg font-bold font-mono">{displayCurrency(caso.valor_causa)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[#666666]">Valor de Risco</p>
            <p className="text-lg font-bold font-mono">{displayCurrency(caso.valor_risco)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[#666666]">Advogado Responsável</p>
            <p className="text-sm font-medium">{displayValue(caso.advogado_responsavel?.name)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[#666666]">Vara / Comarca</p>
            <p className="text-sm font-medium">
              {[caso.vara, caso.comarca, caso.uf].filter(Boolean).join(" / ") || (
                <span className="text-[#999999] italic">Não informado</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Linked Project */}
        {caso.projeto && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#666666]">Projeto Vinculado</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/projetos/${caso.projeto.id}`} className="flex items-center gap-2 text-primary hover:underline">
                <Badge variant="outline">{caso.projeto.codigo}</Badge>
                {caso.projeto.titulo}
                <ChevronRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Next Deadlines */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#666666]">Próximos Prazos</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingDeadlines.length === 0 ? (
              <p className="text-sm text-[#666666]">Nenhum prazo pendente.</p>
            ) : (
              <div className="space-y-2">
                {pendingDeadlines.map((p: CaseData) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${deadlineColor(p.data_limite)}`}>
                        {new Date(p.data_limite).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="truncate">{p.descricao}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {DEADLINE_TYPE_LABELS[p.tipo]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#666666]">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-sm text-[#666666]">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="space-y-3">
                {recentMovements.map((m: CaseData) => (
                  <div key={m.id} className="flex gap-3">
                    <div className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#666666]">
                          {new Date(m.data).toLocaleDateString("pt-BR")}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {MOVEMENT_TYPE_LABELS[m.tipo] || m.tipo}
                        </Badge>
                      </div>
                      <p className="text-sm mt-0.5 line-clamp-2">{m.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Partes Tab ──────────────────────────────────────────────────

function PartesTab({ caso, caseId, utils }: { caso: CaseData; caseId: string; utils: ReturnType<typeof trpc.useUtils> }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState("")
  const [selectedRole, setSelectedRole] = useState("")

  const addParty = trpc.cases.addParty.useMutation({
    onSuccess: () => {
      utils.cases.getById.invalidate({ id: caseId })
      setDialogOpen(false)
      setSelectedPerson("")
      setSelectedRole("")
    },
  })

  const removeParty = trpc.cases.removeParty.useMutation({
    onSuccess: () => utils.cases.getById.invalidate({ id: caseId }),
  })

  return (
    <div className="space-y-4">
      {/* Judge */}
      {caso.juiz && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[#666666] mb-1">Juiz(a)</p>
            <Link href={`/pessoas/${caso.juiz.id}`} className="text-sm font-medium text-primary hover:underline">
              {caso.juiz.nome}
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#666666]">Partes do Processo</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-3.5" />Adicionar Parte
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caso.partes as CaseData[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-[#666666]">
                  Nenhuma parte adicionada.
                </TableCell>
              </TableRow>
            ) : (
              (caso.partes as CaseData[]).map((p: CaseData) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/pessoas/${p.person.id}`} className="text-primary hover:underline">
                      {p.person.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.person.cpf_cnpj || <span className="text-[#999999] italic">Não informado</span>}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CASE_PARTY_ROLE_LABELS[p.role] || p.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      disabled={removeParty.isPending}
                      onClick={() => {
                        if (confirm("Remover esta parte do processo?")) {
                          removeParty.mutate({ id: p.id })
                        }
                      }}
                    >
                      <Trash2 className="size-3.5 text-[#DC3545]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Party Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Parte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pessoa</Label>
              <PersonCombobox
                value={selectedPerson || undefined}
                onSelect={(id) => setSelectedPerson(id)}
                placeholder="Buscar pessoa..."
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_PARTY_ROLE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!selectedPerson || !selectedRole || addParty.isPending}
              onClick={() => addParty.mutate({ case_id: caseId, person_id: selectedPerson, role: selectedRole })}
            >
              {addParty.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Movimentações Tab ───────────────────────────────────────────

function MovimentacoesTab({ caso, caseId, utils }: { caso: CaseData; caseId: string; utils: ReturnType<typeof trpc.useUtils> }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [movData, setMovData] = useState({ data: "", tipo: "", descricao: "", conteudo_integral: "" })

  const addMovement = trpc.cases.addMovement.useMutation({
    onSuccess: () => {
      utils.cases.getById.invalidate({ id: caseId })
      setDialogOpen(false)
      setMovData({ data: "", tipo: "", descricao: "", conteudo_integral: "" })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#666666]">
          {(caso.movimentacoes as CaseData[]).length} movimentação(ões)
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-3.5" />Nova Movimentação
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {(caso.movimentacoes as CaseData[]).length === 0 ? (
          <p className="text-sm text-[#666666] py-8 text-center">Nenhuma movimentação registrada.</p>
        ) : (
          (caso.movimentacoes as CaseData[]).map((m: CaseData, i: number) => (
            <div key={m.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="size-3 rounded-full bg-primary border-2 border-background mt-1.5" />
                {i < (caso.movimentacoes as CaseData[]).length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="pb-6 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#666666] font-mono">
                    {new Date(m.data).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {MOVEMENT_TYPE_LABELS[m.tipo] || m.tipo}
                  </Badge>
                  {m.fonte && <span className="text-xs text-[#666666]">via {m.fonte}</span>}
                </div>
                <p className="text-sm mt-1">{m.descricao}</p>
                {m.conteudo_integral && (
                  <details className="mt-2">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                      Ver conteúdo integral
                    </summary>
                    <pre className="mt-2 text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {m.conteudo_integral}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={movData.data} onChange={(e) => setMovData({ ...movData, data: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={movData.tipo} onValueChange={(v) => setMovData({ ...movData, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOVEMENT_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={movData.descricao}
                onChange={(e) => setMovData({ ...movData, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo Integral</Label>
              <Textarea
                value={movData.conteudo_integral}
                onChange={(e) => setMovData({ ...movData, conteudo_integral: e.target.value })}
                rows={5}
                placeholder="Cole o conteúdo completo da movimentação..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!movData.data || !movData.tipo || !movData.descricao || addMovement.isPending}
              onClick={() => addMovement.mutate({
                case_id: caseId,
                data: new Date(movData.data),
                tipo: movData.tipo,
                descricao: movData.descricao,
                conteudo_integral: movData.conteudo_integral || null,
              })}
            >
              {addMovement.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Prazos Tab ──────────────────────────────────────────────────

// Category labels for grouping deadline types
const DEADLINE_CATEGORY_LABELS: Record<string, string> = {
  DEFESA_RESPOSTA: "Defesa e Resposta",
  RECURSAL: "Recursos",
  FATAL_PEREMPTORIO: "Fatais e Peremptórios",
  AUDIENCIA_SESSAO: "Audiências e Sessões",
  RECUPERACAO_JUDICIAL: "Recuperação Judicial",
  EXECUCAO_CUMPRIMENTO: "Execução e Cumprimento",
  ADMINISTRATIVO_DILIGENCIA: "Administrativo e Diligências",
  EXTRAJUDICIAL_CONTRATUAL: "Extrajudiciais e Contratuais",
  TRIBUTARIO: "Tributários",
  TAREFA_INTERNA: "Tarefas Internas",
  OUTRO: "Outros",
}

function PrazosTab({
  caso, caseId, users, utils,
}: {
  caso: CaseData
  caseId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[] | undefined
  utils: ReturnType<typeof trpc.useUtils>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prazoData, setPrazoData] = useState({ tipo: "", descricao: "", data_limite: "", responsavel_id: "" })

  const { data: catalog } = trpc.deadlines.getTypeCatalog.useQuery()

  // Group catalog by category
  const catalogByCategory = useMemo(() => {
    if (!catalog) return {}
    const grouped: Record<string, typeof catalog> = {}
    for (const item of catalog) {
      const cat = item.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }
    return grouped
  }, [catalog])

  const addDeadline = trpc.cases.addDeadline.useMutation({
    onSuccess: () => {
      utils.cases.getById.invalidate({ id: caseId })
      setDialogOpen(false)
      setPrazoData({ tipo: "", descricao: "", data_limite: "", responsavel_id: "" })
    },
  })

  const updateDeadline = trpc.cases.updateDeadline.useMutation({
    onSuccess: () => utils.cases.getById.invalidate({ id: caseId }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#666666]">
          {(caso.prazos as CaseData[]).length} prazo(s)
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-3.5" />Novo Prazo
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prazo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caso.prazos as CaseData[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-[#666666]">
                  Nenhum prazo registrado.
                </TableCell>
              </TableRow>
            ) : (
              (caso.prazos as CaseData[]).map((p: CaseData) => {
                const days = daysUntil(p.data_limite)
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${deadlineColor(p.data_limite)}`}>
                          {new Date(p.data_limite).toLocaleDateString("pt-BR")}
                        </span>
                        {p.status === "PENDENTE" && days < 0 && (
                          <AlertTriangle className="size-3.5 text-[#DC3545]" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {DEADLINE_TYPE_LABELS[p.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">{p.descricao}</TableCell>
                    <TableCell className="text-sm">{p.responsavel?.name || <span className="text-[#999999] italic">Não atribuído</span>}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={DEADLINE_STATUS_COLORS[p.status] || ""}>
                        {DEADLINE_STATUS_LABELS[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "PENDENTE" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="icon" className="size-7"
                            title="Marcar como cumprido"
                            onClick={() => updateDeadline.mutate({ id: p.id, status: "CUMPRIDO" })}
                          >
                            <Check className="size-3.5 text-[#28A745]" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="size-7"
                            title="Cancelar prazo"
                            onClick={() => updateDeadline.mutate({ id: p.id, status: "CANCELADO" })}
                          >
                            <X className="size-3.5 text-[#DC3545]" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Deadline Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Prazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={prazoData.tipo} onValueChange={(v) => setPrazoData({ ...prazoData, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar tipo de prazo" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Object.entries(catalogByCategory).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-[#666666] bg-muted/50 sticky top-0">
                          {DEADLINE_CATEGORY_LABELS[cat] || cat}
                        </div>
                        {items.map((item) => (
                          <SelectItem key={item.type} value={item.type} className="text-sm">
                            <span className="flex items-center gap-2">
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              {item.displayName}
                              {item.isFatal && <span className="text-[10px] text-red-600 font-medium">FATAL</span>}
                            </span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Limite *</Label>
                <Input
                  type="date"
                  value={prazoData.data_limite}
                  onChange={(e) => setPrazoData({ ...prazoData, data_limite: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={prazoData.descricao}
                onChange={(e) => setPrazoData({ ...prazoData, descricao: e.target.value })}
                placeholder="Descreva o prazo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={prazoData.responsavel_id} onValueChange={(v) => setPrazoData({ ...prazoData, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!prazoData.tipo || !prazoData.data_limite || !prazoData.descricao || !prazoData.responsavel_id || addDeadline.isPending}
              onClick={() => addDeadline.mutate({
                case_id: caseId,
                tipo: prazoData.tipo,
                descricao: prazoData.descricao,
                data_limite: new Date(prazoData.data_limite),
                responsavel_id: prazoData.responsavel_id,
              })}
            >
              {addDeadline.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Documentos Tab ──────────────────────────────────────────────

function DocumentosTab({ caso, caseId, utils }: { caso: CaseData; caseId: string; utils: ReturnType<typeof trpc.useUtils> }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState("")
  const [docType, setDocType] = useState("")
  const [docTags, setDocTags] = useState("")

  const createDoc = trpc.documents.create.useMutation({
    onSuccess: () => {
      utils.cases.getById.invalidate({ id: caseId })
      resetUploadForm()
    },
  })

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.cases.getById.invalidate({ id: caseId })
      setDeleteId(null)
    },
  })

  const resetUploadForm = () => {
    setUploadOpen(false)
    setUploadFile(null)
    setDocTitle("")
    setDocType("")
    setDocTags("")
    setUploading(false)
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }, [docTitle])

  const handleUpload = async () => {
    if (!uploadFile || !docTitle || !docType) return
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("folder", `processos/${caseId}`)

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Falha no upload do arquivo")
      const { url } = await res.json()

      await createDoc.mutateAsync({
        titulo: docTitle,
        tipo: docType,
        arquivo_url: url,
        case_id: caseId,
        tags: docTags ? docTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer upload"
      alert(message)
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#666666]">
          {(caso.documentos as CaseData[]).length} documento(s)
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/confeccao?case_id=${caseId}`)}>
            <Wand2 className="mr-1 size-3.5" />Gerar com Harvey Specter
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1 size-3.5" />Upload
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caso.documentos as CaseData[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-[#666666]">
                  Nenhum documento. Clique em &quot;Upload&quot; ou &quot;Gerar com Harvey Specter&quot; para adicionar.
                </TableCell>
              </TableRow>
            ) : (
              (caso.documentos as CaseData[]).map((d: CaseData) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.titulo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {DOCUMENT_TYPE_LABELS[d.tipo] || d.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{d.criado_por?.name || <span className="text-[#999999] italic">Não informado</span>}</TableCell>
                  <TableCell className="text-sm text-[#666666]">
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        title="Visualizar"
                        onClick={() => {
                          if (d.arquivo_url) {
                            window.open(d.arquivo_url, "_blank")
                          }
                        }}
                        disabled={!d.arquivo_url}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        title="Baixar"
                        onClick={() => {
                          if (d.arquivo_url) {
                            const link = document.createElement("a")
                            link.href = d.arquivo_url
                            link.download = d.titulo || "documento"
                            link.click()
                          }
                        }}
                        disabled={!d.arquivo_url}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        title="Excluir"
                        onClick={() => setDeleteId(d.id)}
                      >
                        <Trash2 className="size-3.5 text-[#DC3545]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open) resetUploadForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* File drop zone */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-[#C9A961] hover:bg-[#C9A961]/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  setUploadFile(file)
                  if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ""))
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.png,.jpg,.jpeg,.gif"
              />
              {uploadFile ? (
                <div className="flex items-center gap-3">
                  <FileUp className="size-8 text-[#C9A961]" />
                  <div>
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-[#666666]">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-[#666666]/50 mb-2" />
                  <p className="text-sm text-[#666666]">Clique ou arraste um arquivo aqui</p>
                  <p className="text-xs text-[#999999] mt-1">PDF, Word, Excel, CSV, imagens, etc.</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Nome do documento" />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={docTags} onChange={(e) => setDocTags(e.target.value)} placeholder="Ex: urgente, minuta, versão final" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetUploadForm} disabled={uploading}>Cancelar</Button>
            <Button
              disabled={!uploadFile || !docTitle || !docType || uploading}
              onClick={handleUpload}
            >
              {uploading ? "Enviando..." : "Enviar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Documento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteDoc.isPending}
              onClick={() => {
                if (deleteId) deleteDoc.mutate({ id: deleteId })
              }}
            >
              {deleteDoc.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Equipe Tab ──────────────────────────────────────────────────

function EquipeTab({
  caso, caseId, users, utils,
}: {
  caso: CaseData
  caseId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[] | undefined
  utils: ReturnType<typeof trpc.useUtils>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedRole, setSelectedRole] = useState("")

  const addMember = trpc.cases.addTeamMember.useMutation({
    onSuccess: () => {
      utils.cases.getById.invalidate({ id: caseId })
      setDialogOpen(false)
      setSelectedUser("")
      setSelectedRole("")
    },
  })

  const removeMember = trpc.cases.removeTeamMember.useMutation({
    onSuccess: () => utils.cases.getById.invalidate({ id: caseId }),
  })

  return (
    <div className="space-y-4">
      {/* Responsible */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-[#666666] mb-1">Advogado Responsável</p>
          <p className="text-sm font-medium">
            {caso.advogado_responsavel.name}
            {caso.advogado_responsavel.oab_number && (
              <span className="text-[#666666]"> (OAB {caso.advogado_responsavel.oab_number})</span>
            )}
          </p>
          <p className="text-xs text-[#666666]">{caso.advogado_responsavel.email}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#666666]">Membros da Equipe</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-3.5" />Adicionar Membro
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caso.equipe as CaseData[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-[#666666]">
                  Nenhum membro adicionado.
                </TableCell>
              </TableRow>
            ) : (
              (caso.equipe as CaseData[]).map((m: CaseData) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.user.name}</TableCell>
                  <TableCell className="text-sm">{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CASE_TEAM_ROLE_LABELS[m.role] || m.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      disabled={removeMember.isPending}
                      onClick={() => {
                        if (confirm("Remover este membro da equipe?")) {
                          removeMember.mutate({ id: m.id })
                        }
                      }}
                    >
                      <Trash2 className="size-3.5 text-[#DC3545]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_TEAM_ROLE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!selectedUser || !selectedRole || addMember.isPending}
              onClick={() => addMember.mutate({ case_id: caseId, user_id: selectedUser, role: selectedRole })}
            >
              {addMember.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Credores Tab ────────────────────────────────────────────────

function CredoresTab({ caso, caseId }: { caso: CaseData; caseId: string }) {
  const credores = (caso.credores as CaseData[]) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#666666]">
          {credores.length} credor(es)
        </h3>
        <Button size="sm" variant="outline" asChild>
          <Link href="/recuperacao-judicial/quadro-credores">
            <ExternalLink className="mr-1 size-3.5" />Gerenciar no Módulo RJ
          </Link>
        </Button>
      </div>

      {credores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Landmark className="size-12 text-[#666666]/50" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum credor cadastrado</h3>
          <p className="mt-2 text-sm text-[#666666] text-center max-w-md">
            Gerencie o quadro de credores completo no módulo de Recuperação Judicial.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/recuperacao-judicial/quadro-credores">
              <ExternalLink className="mr-2 size-4" />Ir para Quadro de Credores
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credor</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Valor Original</TableHead>
                <TableHead className="text-right">Valor Atualizado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credores.map((c: CaseData) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.person ? (
                      <Link href={`/pessoas/${c.person.id}`} className="text-primary hover:underline">
                        {c.person.nome}
                      </Link>
                    ) : (
                      <span className="text-[#999999] italic">Sem pessoa vinculada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {CREDITOR_CLASS_LABELS[c.classe] || c.classe}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {displayCurrency(c.valor_original)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {displayCurrency(c.valor_atualizado)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={CREDITOR_STATUS_COLORS[c.status_credito] || ""}>
                      {CREDITOR_STATUS_LABELS[c.status_credito] || c.status_credito}
                    </Badge>
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

// ─── Negociações Tab ─────────────────────────────────────────────

function NegociacoesTab({ caseId }: { caseId: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
      <Handshake className="size-12 text-[#666666]/50" />
      <h3 className="mt-4 text-lg font-semibold">Negociações com Credores</h3>
      <p className="mt-2 text-sm text-[#666666] text-center max-w-md">
        Gerencie as rodadas de negociação, propostas e contrapropostas no módulo de Recuperação Judicial.
      </p>
      <Button className="mt-4" variant="outline" asChild>
        <Link href="/recuperacao-judicial/negociacoes">
          <ExternalLink className="mr-2 size-4" />Ir para Negociações
        </Link>
      </Button>
    </div>
  )
}
