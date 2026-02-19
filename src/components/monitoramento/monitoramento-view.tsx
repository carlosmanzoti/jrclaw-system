"use client"

import { useState } from "react"
import Link from "next/link"
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
  Radar, Eye, EyeOff, Plus, RefreshCw, ExternalLink,
  Loader2, CheckCircle, AlertCircle, Circle, ChevronDown,
  Gavel, FileText, Scale, BookOpen, Bell, Newspaper,
} from "lucide-react"

// ── Type colors ──────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Gavel }> = {
  DESPACHO: { label: "Despacho", color: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
  DECISAO: { label: "Decisao", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Gavel },
  SENTENCA: { label: "Sentenca", color: "bg-red-100 text-red-700 border-red-200", icon: Scale },
  ACORDAO: { label: "Acordao", color: "bg-purple-100 text-purple-700 border-purple-200", icon: BookOpen },
  PUBLICACAO: { label: "Publicacao", color: "bg-green-100 text-green-700 border-green-200", icon: Newspaper },
  INTIMACAO: { label: "Intimacao", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Bell },
  CITACAO: { label: "Citacao", color: "bg-pink-100 text-pink-700 border-pink-200", icon: Bell },
  ATO_ORDINATORIO: { label: "Ato Ordinatorio", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
  OUTRO: { label: "Outro", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  DATAJUD: { label: "DataJud", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LEGAL_ONE: { label: "Legal One", className: "bg-blue-50 text-blue-700 border-blue-200" },
  MANUAL: { label: "Manual", className: "bg-gray-50 text-gray-600 border-gray-200" },
  IMPORTACAO: { label: "Importacao", className: "bg-violet-50 text-violet-700 border-violet-200" },
}

// ═══════════════════════════════════════════════════════════
// MAIN VIEW
// ═══════════════════════════════════════════════════════════

export function MonitoramentoView() {
  const [caseFilter, setCaseFilter] = useState<string>("")
  const [tipoFilter, setTipoFilter] = useState<string>("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [showInsertModal, setShowInsertModal] = useState(false)

  const utils = trpc.useUtils()

  const { data: feedData, isLoading } = trpc.monitoring.feed.useQuery({
    caseId: caseFilter || undefined,
    tipo: tipoFilter || undefined,
    lida: unreadOnly ? false : undefined,
    page,
    perPage: 30,
  })

  const { data: unreadCount } = trpc.monitoring.unreadCount.useQuery()
  const { data: providerStatus } = trpc.monitoring.providerStatus.useQuery()
  const { data: cases } = trpc.monitoring.casesForSelect.useQuery()

  const markRead = trpc.monitoring.markRead.useMutation({
    onSuccess: () => {
      utils.monitoring.feed.invalidate()
      utils.monitoring.unreadCount.invalidate()
    },
  })
  const markAllRead = trpc.monitoring.markAllRead.useMutation({
    onSuccess: () => {
      utils.monitoring.feed.invalidate()
      utils.monitoring.unreadCount.invalidate()
    },
  })

  const items = feedData?.items || []
  const total = feedData?.total || 0
  const totalPages = Math.ceil(total / 30)

  const dataJudStatus = providerStatus?.find(p => p.name === "DataJud")

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
              <Radar className="size-6" />
              Monitoramento
            </h1>
            <p className="text-muted-foreground text-sm">
              Movimentacoes processuais captadas dos tribunais e inseridas manualmente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Provider status indicator */}
            {dataJudStatus && (
              <Badge variant="outline" className={`text-xs ${dataJudStatus.healthy ? "text-green-600 border-green-300" : "text-gray-400 border-gray-200"}`}>
                {dataJudStatus.healthy ? <CheckCircle className="size-3 mr-1" /> : <AlertCircle className="size-3 mr-1" />}
                DataJud {dataJudStatus.healthy ? "OK" : dataJudStatus.configured ? "Erro" : "N/C"}
              </Badge>
            )}
            {unreadCount !== undefined && unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} nao lida(s)
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="feed" className="gap-1.5">
              <Radar className="size-3.5" /> Movimentacoes
              {unreadCount ? <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{unreadCount}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="publicacoes" className="gap-1.5">
              <Newspaper className="size-3.5" /> Publicacoes DJe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {/* TOOLBAR */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className="px-3 py-1.5 border rounded-md text-sm"
                value={caseFilter}
                onChange={e => { setCaseFilter(e.target.value); setPage(1) }}
              >
                <option value="">Todos os processos</option>
                {cases?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero_processo || "Sem numero"} — {c.cliente?.nome}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-1.5 border rounded-md text-sm"
                value={tipoFilter}
                onChange={e => { setTipoFilter(e.target.value); setPage(1) }}
              >
                <option value="">Todos os tipos</option>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>

              <Button
                variant={unreadOnly ? "default" : "outline"}
                size="sm"
                onClick={() => { setUnreadOnly(!unreadOnly); setPage(1) }}
              >
                {unreadOnly ? <EyeOff className="size-3.5 mr-1.5" /> : <Eye className="size-3.5 mr-1.5" />}
                {unreadOnly ? "Nao lidas" : "Todas"}
              </Button>

              <div className="flex-1" />

              <Button variant="outline" size="sm" onClick={() => markAllRead.mutate({ caseId: caseFilter || undefined })}>
                <CheckCircle className="size-3.5 mr-1.5" /> Marcar todas lidas
              </Button>

              <Dialog open={showInsertModal} onOpenChange={setShowInsertModal}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-3.5 mr-1.5" /> Inserir Manual
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Inserir Movimentacao Manual</DialogTitle>
                  </DialogHeader>
                  <ManualInsertForm
                    cases={cases || []}
                    onSuccess={() => {
                      setShowInsertModal(false)
                      utils.monitoring.feed.invalidate()
                      utils.monitoring.unreadCount.invalidate()
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* FEED TIMELINE */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 border rounded-lg border-dashed">
                <Radar className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Nenhuma movimentacao encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {caseFilter || tipoFilter || unreadOnly ? "Ajuste os filtros ou " : ""}
                  Insira movimentacoes manualmente ou configure a integracao DataJud.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((mov: any) => (
                  <MovementCard key={mov.id} movement={mov} onMarkRead={() => markRead.mutate({ movementId: mov.id })} />
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">{total} movimentacao(es)</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <span className="text-xs px-2">{page}/{totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Proxima</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="publicacoes">
            <div className="text-center py-16 border rounded-lg border-dashed">
              <Newspaper className="size-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Publicacoes do DJe</p>
              <p className="text-xs text-muted-foreground mt-1">
                Integracao com Diario de Justica Eletronico sera implementada em versao futura.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MOVEMENT CARD
// ═══════════════════════════════════════════════════════════

function MovementCard({ movement, onMarkRead }: { movement: any; onMarkRead: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const config = TYPE_CONFIG[movement.tipo] || TYPE_CONFIG.OUTRO
  const source = SOURCE_BADGE[movement.fonte] || SOURCE_BADGE.MANUAL
  const Icon = config.icon

  return (
    <div className={`flex gap-3 p-3 rounded-lg border hover:bg-gray-50/50 transition-colors ${!movement.lida ? "bg-blue-50/30 border-blue-200" : "border-gray-100"}`}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className={`size-8 rounded-full flex items-center justify-center ${!movement.lida ? "bg-blue-100" : "bg-gray-100"}`}>
          <Icon className={`size-4 ${!movement.lida ? "text-blue-600" : "text-gray-400"}`} />
        </div>
        {!movement.lida && (
          <Circle className="size-2.5 fill-blue-500 text-blue-500 mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${config.color}`}>{config.label}</Badge>
          <Badge variant="outline" className={`text-[10px] ${source.className}`}>{source.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(movement.data).toLocaleDateString("pt-BR")} {new Date(movement.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <p className={`text-sm ${!movement.lida ? "font-medium" : ""}`}>{movement.descricao}</p>

        {/* Case link */}
        {movement.case_ && (
          <div className="text-xs text-muted-foreground">
            <Link href={`/processos/${movement.case_.id}`} className="hover:underline hover:text-primary">
              {movement.case_.numero_processo || "Sem numero"} — {movement.case_.cliente?.nome}
            </Link>
          </div>
        )}

        {/* Expandable content */}
        {movement.conteudo_integral && (
          <>
            <button
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Ocultar conteudo" : "Ver conteudo integral"}
            </button>
            {expanded && (
              <div className="bg-gray-50 p-3 rounded text-xs whitespace-pre-wrap mt-1 border">
                {movement.conteudo_integral}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 shrink-0">
        {!movement.lida && (
          <Button variant="ghost" size="icon" className="size-7" onClick={onMarkRead} title="Marcar como lida">
            <Eye className="size-3.5" />
          </Button>
        )}
        {movement.fonte_url && (
          <a href={movement.fonte_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="size-7" title="Abrir fonte">
              <ExternalLink className="size-3.5" />
            </Button>
          </a>
        )}
        {movement.case_ && (
          <Link href={`/processos/${movement.case_.id}`}>
            <Button variant="ghost" size="icon" className="size-7" title="Ir para processo">
              <Scale className="size-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MANUAL INSERT FORM
// ═══════════════════════════════════════════════════════════

function ManualInsertForm({ cases, onSuccess }: { cases: any[]; onSuccess: () => void }) {
  const [caseId, setCaseId] = useState("")
  const [data, setData] = useState(new Date().toISOString().slice(0, 16))
  const [tipo, setTipo] = useState("DESPACHO")
  const [descricao, setDescricao] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [notificar, setNotificar] = useState(false)

  const addManual = trpc.monitoring.addManual.useMutation({ onSuccess })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId || !descricao.trim()) return
    addManual.mutate({
      caseId,
      data: new Date(data),
      tipo: tipo as any,
      descricao: descricao.trim(),
      conteudo_integral: conteudo.trim() || undefined,
      notificar_cliente: notificar,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Processo *</label>
        <select
          className="w-full px-3 py-2 border rounded-md text-sm mt-1"
          value={caseId}
          onChange={e => setCaseId(e.target.value)}
          required
        >
          <option value="">Selecione o processo...</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>
              {c.numero_processo || "Sem numero"} — {c.cliente?.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Data/Hora *</label>
          <input
            type="datetime-local"
            className="w-full px-3 py-2 border rounded-md text-sm mt-1"
            value={data}
            onChange={e => setData(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo *</label>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm mt-1"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Descricao *</label>
        <input
          className="w-full px-3 py-2 border rounded-md text-sm mt-1"
          placeholder="Ex: Decisao interlocutoria — indeferiu tutela de urgencia"
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Conteudo integral (opcional)</label>
        <textarea
          className="w-full px-3 py-2 border rounded-md text-sm mt-1 min-h-[80px] resize-none"
          placeholder="Cole o texto completo da movimentacao..."
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notificar} onChange={e => setNotificar(e.target.checked)} className="rounded" />
        Notificar cliente sobre esta movimentacao
      </label>

      <Button type="submit" className="w-full" disabled={!caseId || !descricao.trim() || addManual.isPending}>
        {addManual.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
        Inserir Movimentacao
      </Button>
    </form>
  )
}
