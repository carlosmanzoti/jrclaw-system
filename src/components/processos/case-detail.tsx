"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Scale, Users, FileText, Clock, FolderOpen, UserCog,
  Activity, Landmark, Handshake, Plus, Trash2, Check, X, AlertTriangle,
  ChevronRight,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
  MOVEMENT_TYPE_LABELS, DOCUMENT_TYPE_LABELS, ACTIVITY_TYPE_LABELS,
  formatCurrency, formatCNJ, daysUntil, deadlineColor,
} from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700",
  SUSPENSO: "bg-amber-100 text-amber-700",
  ARQUIVADO: "bg-gray-100 text-gray-600",
  ENCERRADO: "bg-blue-100 text-blue-700",
}

const TYPE_COLORS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "bg-purple-100 text-purple-700",
  FALENCIA: "bg-red-100 text-red-700",
  EXECUCAO: "bg-orange-100 text-orange-700",
  AGRARIO: "bg-green-100 text-green-700",
  TRIBUTARIO: "bg-sky-100 text-sky-700",
}

const DEADLINE_STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-700",
  CUMPRIDO: "bg-emerald-100 text-emerald-700",
  PERDIDO: "bg-red-100 text-red-700",
  CANCELADO: "bg-gray-100 text-gray-600",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any

export function CaseDetail({ caseId }: { caseId: string }) {
  const router = useRouter()
  const { data: caso, isLoading } = trpc.cases.getById.useQuery({ id: caseId })
  const { data: users } = trpc.users.list.useQuery()
  const utils = trpc.useUtils()

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
        <Scale className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Processo nao encontrado</h3>
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
    { value: "movimentacoes", label: "Movimentacoes", icon: Activity },
    { value: "prazos", label: "Prazos", icon: Clock },
    { value: "documentos", label: "Documentos", icon: FolderOpen },
    { value: "equipe", label: "Equipe", icon: UserCog },
    { value: "atividades", label: "Atividades", icon: FileText },
    ...(isRJ ? [
      { value: "credores", label: "Credores", icon: Landmark },
      { value: "negociacoes", label: "Negociacoes", icon: Handshake },
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
                {formatCNJ(caso.numero_processo) || "Sem numero"}
              </h1>
              <Badge variant="secondary" className={TYPE_COLORS[caso.tipo] || ""}>
                {CASE_TYPE_LABELS[caso.tipo] || caso.tipo}
              </Badge>
              <Badge variant="secondary" className={STATUS_COLORS[caso.status] || ""}>
                {CASE_STATUS_LABELS[caso.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Cliente: <Link href={`/pessoas/${caso.cliente.id}`} className="text-primary hover:underline">{caso.cliente.nome}</Link>
              {caso.vara && <> &middot; {caso.vara}</>}
              {caso.comarca && <> &middot; {caso.comarca}</>}
              {caso.uf && <>/{caso.uf}</>}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(`/processos/${caseId}?edit=true`)}>
          Editar
        </Button>
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

        <TabsContent value="resumo" className="mt-6">
          <ResumoTab caso={caso} />
        </TabsContent>

        <TabsContent value="partes" className="mt-6">
          <PartesTab caso={caso} caseId={caseId} utils={utils} />
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-6">
          <MovimentacoesTab caso={caso} caseId={caseId} utils={utils} />
        </TabsContent>

        <TabsContent value="prazos" className="mt-6">
          <PrazosTab caso={caso} caseId={caseId} users={users} utils={utils} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <DocumentosTab caso={caso} />
        </TabsContent>

        <TabsContent value="equipe" className="mt-6">
          <EquipeTab caso={caso} caseId={caseId} users={users} utils={utils} />
        </TabsContent>

        <TabsContent value="atividades" className="mt-6">
          <ActivityTimeline caseId={caseId} showFilters groupByDate />
        </TabsContent>

        {isRJ && (
          <TabsContent value="credores" className="mt-6">
            <PlaceholderTab
              icon={Landmark}
              title="Quadro de Credores"
              description="O modulo de credores sera implementado no modulo de Recuperacao Judicial."
            />
          </TabsContent>
        )}

        {isRJ && (
          <TabsContent value="negociacoes" className="mt-6">
            <PlaceholderTab
              icon={Handshake}
              title="Negociacoes"
              description="O modulo de negociacoes sera implementado no modulo de Recuperacao Judicial."
            />
          </TabsContent>
        )}
      </Tabs>
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
            <p className="text-xs text-muted-foreground">Valor da Causa</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(caso.valor_causa)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Valor de Risco</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(caso.valor_risco)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Advogado Responsavel</p>
            <p className="text-sm font-medium">{caso.advogado_responsavel.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vara / Comarca</p>
            <p className="text-sm font-medium">
              {[caso.vara, caso.comarca, caso.uf].filter(Boolean).join(" / ") || "—"}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Projeto Vinculado</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Proximos Prazos</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum prazo pendente.</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Ultimas Movimentacoes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentacao registrada.</p>
            ) : (
              <div className="space-y-3">
                {recentMovements.map((m: CaseData) => (
                  <div key={m.id} className="flex gap-3">
                    <div className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground mb-1">Juiz(a)</p>
            <Link href={`/pessoas/${caso.juiz.id}`} className="text-sm font-medium text-primary hover:underline">
              {caso.juiz.nome}
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Partes do Processo</h3>
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
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
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
                  <TableCell className="font-mono text-sm">{p.person.cpf_cnpj || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CASE_PARTY_ROLE_LABELS[p.role] || p.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => removeParty.mutate({ id: p.id })}>
                      <Trash2 className="size-3.5 text-red-500" />
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
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Movimentacoes Tab ───────────────────────────────────────────

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
        <h3 className="text-sm font-medium text-muted-foreground">
          {(caso.movimentacoes as CaseData[]).length} movimentacao(oes)
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-3.5" />Nova Movimentacao
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {(caso.movimentacoes as CaseData[]).length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma movimentacao registrada.</p>
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
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(m.data).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {MOVEMENT_TYPE_LABELS[m.tipo] || m.tipo}
                  </Badge>
                  {m.fonte && <span className="text-xs text-muted-foreground">via {m.fonte}</span>}
                </div>
                <p className="text-sm mt-1">{m.descricao}</p>
                {m.conteudo_integral && (
                  <details className="mt-2">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                      Ver conteudo integral
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
            <DialogTitle>Nova Movimentacao</DialogTitle>
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
              <Label>Descricao *</Label>
              <Textarea
                value={movData.descricao}
                onChange={(e) => setMovData({ ...movData, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Conteudo Integral</Label>
              <Textarea
                value={movData.conteudo_integral}
                onChange={(e) => setMovData({ ...movData, conteudo_integral: e.target.value })}
                rows={5}
                placeholder="Cole o conteudo completo da movimentacao..."
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Prazos Tab ──────────────────────────────────────────────────

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
        <h3 className="text-sm font-medium text-muted-foreground">
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
              <TableHead>Descricao</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caso.prazos as CaseData[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
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
                          <AlertTriangle className="size-3.5 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {DEADLINE_TYPE_LABELS[p.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">{p.descricao}</TableCell>
                    <TableCell className="text-sm">{p.responsavel?.name || "—"}</TableCell>
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
                            <Check className="size-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="size-7"
                            title="Cancelar prazo"
                            onClick={() => updateDeadline.mutate({ id: p.id, status: "CANCELADO" })}
                          >
                            <X className="size-3.5 text-red-500" />
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
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
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
              <Label>Descricao *</Label>
              <Input
                value={prazoData.descricao}
                onChange={(e) => setPrazoData({ ...prazoData, descricao: e.target.value })}
                placeholder="Descreva o prazo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Responsavel *</Label>
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Documentos Tab ──────────────────────────────────────────────

function DocumentosTab({ caso }: { caso: CaseData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {(caso.documentos as CaseData[]).length} documento(s)
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled>
            Gerar com IA
          </Button>
          <Button size="sm" disabled>
            <Plus className="mr-1 size-3.5" />Upload
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caso.documentos as CaseData[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  Nenhum documento. O modulo de upload sera implementado na fase de Documentos.
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
                  <TableCell className="text-sm">{d.criado_por?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
          <p className="text-xs text-muted-foreground mb-1">Advogado Responsavel</p>
          <p className="text-sm font-medium">
            {caso.advogado_responsavel.name}
            {caso.advogado_responsavel.oab_number && (
              <span className="text-muted-foreground"> (OAB {caso.advogado_responsavel.oab_number})</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{caso.advogado_responsavel.email}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Membros da Equipe</h3>
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
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
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
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => removeMember.mutate({ id: m.id })}>
                      <Trash2 className="size-3.5 text-red-500" />
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
              <Label>Usuario</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Selecionar usuario" /></SelectTrigger>
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
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// AtividadesTab replaced by ActivityTimeline component

// ─── Placeholder Tab ─────────────────────────────────────────────

function PlaceholderTab({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
      <Icon className="size-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{description}</p>
    </div>
  )
}
