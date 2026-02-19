"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Plus, Check, Trash2, Loader2, Receipt, CreditCard,
  BarChart3,
} from "lucide-react"

const FEE_TYPE_LABELS: Record<string, string> = {
  FIXO: "Fixo",
  EXITO: "Exito",
  MENSAL: "Mensal",
  POR_ATO: "Por Ato",
  AD_EXITUM_RJ: "Ad Exitum RJ",
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  CUSTAS: "Custas",
  HONORARIOS_PERITO: "Hon. Perito",
  CERTIDOES: "Certidoes",
  DILIGENCIA: "Diligencia",
  VIAGEM: "Viagem",
  REGISTRO: "Registro",
  CORREIOS: "Correios",
  COPIA: "Copias",
  PUBLICACAO: "Publicacao",
  OUTRO: "Outro",
}

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-700",
  PAGO: "bg-green-100 text-green-700",
  ATRASADO: "bg-red-100 text-red-700",
  CANCELADO: "bg-gray-100 text-gray-500",
}

function formatCurrency(val: number | string) {
  return `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FinanceiroView() {
  const { data: dashboard, isLoading } = trpc.financial.dashboard.useQuery({})

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
            <DollarSign className="size-6" /> Financeiro
          </h1>
          <p className="text-muted-foreground text-sm">
            Honorarios, despesas e resultado do escritorio.
          </p>
        </div>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Faturamento" value={formatCurrency(dashboard.faturamento)} icon={TrendingUp} color="text-green-600" />
            <KPICard title="A Receber" value={formatCurrency(dashboard.aReceber)} icon={CreditCard} color="text-blue-600" />
            <KPICard title="Despesas" value={formatCurrency(dashboard.despesas)} icon={TrendingDown} color="text-red-600" />
            <KPICard title="Resultado" value={formatCurrency(dashboard.resultado)} icon={BarChart3} color={dashboard.resultado >= 0 ? "text-green-600" : "text-red-600"} />
            <KPICard title="Inadimplencia" value={formatCurrency(dashboard.inadimplencia)} icon={AlertTriangle} color="text-amber-600" />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="honorarios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="honorarios" className="gap-1.5">
              <DollarSign className="size-3.5" /> Honorarios
            </TabsTrigger>
            <TabsTrigger value="despesas" className="gap-1.5">
              <Receipt className="size-3.5" /> Despesas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="honorarios">
            <FeesTab />
          </TabsContent>

          <TabsContent value="despesas">
            <ExpensesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
        <Icon className={`size-4 ${color}`} />
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FEES TAB
// ═══════════════════════════════════════════════════════════

function FeesTab() {
  const utils = trpc.useUtils()
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = trpc.financial.fees.list.useQuery({
    status: statusFilter || undefined,
    page,
    perPage: 30,
  })

  const markPaid = trpc.financial.fees.markPaid.useMutation({
    onSuccess: () => {
      utils.financial.fees.list.invalidate()
      utils.financial.dashboard.invalidate()
    },
  })
  const deleteFee = trpc.financial.fees.delete.useMutation({
    onSuccess: () => {
      utils.financial.fees.list.invalidate()
      utils.financial.dashboard.invalidate()
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 border rounded-md text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="ATRASADO">Atrasado</option>
          </select>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-3.5 mr-1.5" /> Novo Honorario</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Honorario</DialogTitle>
            </DialogHeader>
            <FeeForm onSuccess={() => { setShowCreate(false); utils.financial.fees.list.invalidate(); utils.financial.dashboard.invalidate() }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.items?.length ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <DollarSign className="size-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum honorario registrado.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Descricao</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Processo/Projeto</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((fee: any) => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{fee.descricao}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{FEE_TYPE_LABELS[fee.tipo] || fee.tipo}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {fee.case_?.numero_processo || fee.project?.titulo || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(fee.valor)}</td>
                  <td className="px-3 py-2 text-xs">{new Date(fee.data_vencimento).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_COLORS[fee.status] || ""}>{fee.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {fee.status !== "PAGO" && (
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => markPaid.mutate({ feeId: fee.id })} title="Marcar pago">
                          <Check className="size-3.5 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteFee.mutate({ feeId: fee.id })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// EXPENSES TAB
// ═══════════════════════════════════════════════════════════

function ExpensesTab() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = trpc.financial.expenses.list.useQuery({ perPage: 50 })

  const deleteExpense = trpc.financial.expenses.delete.useMutation({
    onSuccess: () => {
      utils.financial.expenses.list.invalidate()
      utils.financial.dashboard.invalidate()
    },
  })
  const markReimbursed = trpc.financial.expenses.markReimbursed.useMutation({
    onSuccess: () => utils.financial.expenses.list.invalidate(),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-3.5 mr-1.5" /> Nova Despesa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Despesa</DialogTitle>
            </DialogHeader>
            <ExpenseForm onSuccess={() => { setShowCreate(false); utils.financial.expenses.list.invalidate(); utils.financial.dashboard.invalidate() }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.items?.length ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Receipt className="size-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Descricao</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Reemb.</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((exp: any) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{exp.descricao}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{EXPENSE_CATEGORIES[exp.categoria] || exp.categoria}</Badge></td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(exp.valor)}</td>
                  <td className="px-3 py-2 text-xs">{new Date(exp.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2">
                    {exp.reembolsavel ? (
                      exp.reembolsado ? (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">Reembolsado</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => markReimbursed.mutate({ expenseId: exp.id })}>
                          Marcar reembolsado
                        </Button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteExpense.mutate({ expenseId: exp.id })}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════

function FeeForm({ onSuccess }: { onSuccess: () => void }) {
  const [tipo, setTipo] = useState("FIXO")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [parcelas, setParcelas] = useState("1")
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10))

  const create = trpc.financial.fees.create.useMutation({ onSuccess })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao.trim() || !valor) return
    create.mutate({
      tipo: tipo as any,
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      parcelas: parseInt(parcelas) || 1,
      dataVencimento: new Date(vencimento),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={tipo} onChange={e => setTipo(e.target.value)}>
            {Object.entries(FEE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
          <input type="number" min="1" max="60" className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={parcelas} onChange={e => setParcelas(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Descricao *</label>
        <input className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={descricao} onChange={e => setDescricao(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
          <input type="number" step="0.01" min="0.01" className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={valor} onChange={e => setValor(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Vencimento *</label>
          <input type="date" className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={vencimento} onChange={e => setVencimento(e.target.value)} required />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
        Criar Honorario {parseInt(parcelas) > 1 ? `(${parcelas}x)` : ""}
      </Button>
    </form>
  )
}

function ExpenseForm({ onSuccess }: { onSuccess: () => void }) {
  const [categoria, setCategoria] = useState("CUSTAS")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [reembolsavel, setReembolsavel] = useState(false)

  const create = trpc.financial.expenses.create.useMutation({ onSuccess })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao.trim() || !valor) return
    create.mutate({
      categoria,
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      data: new Date(data),
      reembolsavel,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Categoria</label>
        <select className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={categoria} onChange={e => setCategoria(e.target.value)}>
          {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Descricao *</label>
        <input className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={descricao} onChange={e => setDescricao(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
          <input type="number" step="0.01" min="0.01" className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={valor} onChange={e => setValor(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Data *</label>
          <input type="date" className="w-full px-3 py-2 border rounded-md text-sm mt-1" value={data} onChange={e => setData(e.target.value)} required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={reembolsavel} onChange={e => setReembolsavel(e.target.checked)} className="rounded" />
        Despesa reembolsavel pelo cliente
      </label>
      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
        Criar Despesa
      </Button>
    </form>
  )
}
