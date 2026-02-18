"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search, BookOpen, Clock, Scale, ArrowLeft, ChevronRight,
  Filter, X, LayoutGrid, List, AlertTriangle, CheckCircle2,
  XCircle, Info, Gavel,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

// ─── Constants ────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  TODOS: "Todos",
  CPC_GERAL: "CPC Geral",
  CPC_RECURSOS: "CPC Recursos",
  CPC_EXECUCAO: "CPC Execução",
  LEI_11101: "Lei 11.101 (RJ)",
  CLT: "CLT",
  CTN: "CTN",
  ESPECIAIS: "Especiais",
}

const CATEGORY_FILTERS: Record<string, { lei?: string; categoria?: string }> = {
  TODOS: {},
  CPC_GERAL: { lei: "CPC", categoria: "PARTE" },
  CPC_RECURSOS: { lei: "CPC", categoria: "RECURSAL" },
  CPC_EXECUCAO: { lei: "CPC", categoria: "AUXILIAR" },
  LEI_11101: { lei: "Lei 11.101/2005" },
  CLT: { lei: "CLT" },
  CTN: { lei: "CTN" },
  ESPECIAIS: { categoria: "RJ_ESTATUTARIO" },
}

const CATEGORY_COLORS: Record<string, string> = {
  CPC_GERAL: "bg-blue-100 text-blue-700",
  CPC_RECURSOS: "bg-indigo-100 text-indigo-700",
  CPC_EXECUCAO: "bg-purple-100 text-purple-700",
  LEI_11101: "bg-[#C9A961]/10 text-[#C9A961]",
  CLT: "bg-emerald-100 text-emerald-700",
  CTN: "bg-orange-100 text-orange-700",
  ESPECIAIS: "bg-rose-100 text-rose-700",
}

const TIPO_PRAZO_LABELS: Record<string, string> = {
  PEREMPTORIO: "Peremptorio",
  DILATATORIO: "Dilatorio",
  IMPROPRIO: "Improprio",
}

const TIPO_PRAZO_COLORS: Record<string, string> = {
  PEREMPTORIO: "bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/30",
  DILATATORIO: "bg-amber-100 text-amber-700 border-amber-300",
  IMPROPRIO: "bg-gray-100 text-gray-600 border-gray-300",
}

const CONTAGEM_LABELS: Record<string, string> = {
  DIAS_UTEIS: "dias uteis",
  DIAS_CORRIDOS: "dias corridos",
}

const LEI_OPTIONS = [
  { value: "ALL", label: "Todas as leis" },
  { value: "CPC", label: "CPC/2015" },
  { value: "Lei 11.101/2005", label: "Lei 11.101/2005" },
  { value: "CLT", label: "CLT" },
  { value: "CTN", label: "CTN" },
  { value: "CF/88", label: "CF/88" },
  { value: "CDC", label: "CDC" },
  { value: "Lei 8.906/94", label: "Lei 8.906/94 (EOAB)" },
]

const TIPO_PRAZO_OPTIONS = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "PEREMPTORIO", label: "Peremptorio" },
  { value: "DILATATORIO", label: "Dilatorio" },
  { value: "IMPROPRIO", label: "Improprio" },
]

// ─── Types ────────────────────────────────────────────────────────

interface CatalogEntry {
  id: string
  codigo: string
  nome: string
  descricao: string
  dias: number
  contagem_tipo: string
  tipo_prazo: string
  categoria: string
  subcategoria: string | null
  artigo: string
  lei: string
  paragrafos: string | null
  admite_dobra: boolean
  excecao_dobra: string | null
  admite_litisconsorcio: boolean
  excecao_litisconsorcio: string | null
  efeito_nao_cumprimento: string | null
  efeito_recursal: string | null
  termo_inicial: string
  observacoes: string | null
  jurisprudencia: string | null
  prazo_resposta_dias: number | null
  prazo_resposta_ref: string | null
}

// ─── Main Component ───────────────────────────────────────────────

export function CatalogoDePrazos() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("TODOS")
  const [leiFilter, setLeiFilter] = useState("ALL")
  const [tipoPrazoFilter, setTipoPrazoFilter] = useState("ALL")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null)

  // Build query params from category + extra filters
  const queryParams = useMemo(() => {
    const catFilter = CATEGORY_FILTERS[activeCategory] ?? {}
    return {
      categoria: catFilter.categoria || undefined,
      lei: leiFilter !== "ALL" ? leiFilter : catFilter.lei || undefined,
      search: searchTerm || undefined,
    }
  }, [activeCategory, leiFilter, searchTerm])

  const { data: catalogItems, isLoading } = trpc.deadlines.catalog.list.useQuery(queryParams)

  // Client-side filter by tipo_prazo (the API may not support it directly)
  const filteredItems = useMemo(() => {
    if (!catalogItems) return []
    let items = catalogItems as CatalogEntry[]
    if (tipoPrazoFilter !== "ALL") {
      items = items.filter((item) => item.tipo_prazo === tipoPrazoFilter)
    }
    return items
  }, [catalogItems, tipoPrazoFilter])

  const totalResults = filteredItems.length

  const clearFilters = () => {
    setSearchTerm("")
    setActiveCategory("TODOS")
    setLeiFilter("ALL")
    setTipoPrazoFilter("ALL")
  }

  const hasActiveFilters = searchTerm || activeCategory !== "TODOS" || leiFilter !== "ALL" || tipoPrazoFilter !== "ALL"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link href="/prazos">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="size-6 text-[#C9A961]" />
              Catalogo de Prazos Legais
            </h1>
            <p className="text-[#666666] mt-1">
              Referência completa de prazos processuais e legais
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {totalResults} prazo(s)
          </Badge>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-r-none"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#666666]" />
          <Input
            placeholder="Buscar por nome, descricao, artigo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => setSearchTerm("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={leiFilter} onValueChange={setLeiFilter}>
            <SelectTrigger className="w-[180px] bg-white h-9">
              <Scale className="size-3.5 mr-1.5 text-[#666666]" />
              <SelectValue placeholder="Filtrar por lei" />
            </SelectTrigger>
            <SelectContent>
              {LEI_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tipoPrazoFilter} onValueChange={setTipoPrazoFilter}>
            <SelectTrigger className="w-[180px] bg-white h-9">
              <Clock className="size-3.5 mr-1.5 text-[#666666]" />
              <SelectValue placeholder="Tipo de prazo" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_PRAZO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="size-3.5 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="whitespace-nowrap">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {/* Content area (same for all tabs — filtering done in query) */}
        {Object.keys(CATEGORY_LABELS).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            {viewMode === "cards" ? (
              <CatalogCardGrid
                items={filteredItems}
                isLoading={isLoading}
                onSelect={setSelectedEntry}
              />
            ) : (
              <CatalogTable
                items={filteredItems}
                isLoading={isLoading}
                onSelect={setSelectedEntry}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <CatalogDetailDialog
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}

// ─── Card Grid View ───────────────────────────────────────────────

function CatalogCardGrid({
  items,
  isLoading,
  onSelect,
}: {
  items: CatalogEntry[]
  isLoading: boolean
  onSelect: (entry: CatalogEntry) => void
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-5 space-y-3">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#666666]">
        <BookOpen className="size-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Nenhum prazo encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou a busca.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <CatalogCard key={item.id} entry={item} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ─── Single Card ──────────────────────────────────────────────────

function CatalogCard({
  entry,
  onSelect,
}: {
  entry: CatalogEntry
  onSelect: (entry: CatalogEntry) => void
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-t-4"
      style={{ borderTopColor: entry.tipo_prazo === "PEREMPTORIO" ? "#DC3545" : entry.tipo_prazo === "DILATATORIO" ? "#C9A961" : "#9CA3AF" }}
      onClick={() => onSelect(entry)}
    >
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Top row: code + tipo prazo */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono text-xs bg-[#FAFAFA]">
            {entry.codigo}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${TIPO_PRAZO_COLORS[entry.tipo_prazo] || "bg-gray-100 text-gray-600"}`}
          >
            {TIPO_PRAZO_LABELS[entry.tipo_prazo] || entry.tipo_prazo}
          </Badge>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
          {entry.nome}
        </h3>

        {/* Days + counting type */}
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[#C9A961]" />
          <span className="text-lg font-bold text-[#C9A961]">{entry.dias}</span>
          <span className="text-sm text-[#666666]">
            {CONTAGEM_LABELS[entry.contagem_tipo] || entry.contagem_tipo}
          </span>
        </div>

        {/* Article + Law */}
        <div className="flex items-center gap-1.5 text-xs text-[#666666]">
          <Scale className="size-3.5 shrink-0" />
          <span>
            {entry.artigo} - {entry.lei}
          </span>
        </div>

        {/* Termo inicial */}
        <p className="text-xs text-[#666666] line-clamp-2">
          <span className="font-medium text-gray-700">Termo inicial:</span>{" "}
          {entry.termo_inicial}
        </p>

        {/* Effect of non-compliance */}
        {entry.efeito_nao_cumprimento && (
          <div className="flex items-start gap-1.5 text-xs">
            <AlertTriangle className="size-3.5 text-[#DC3545] shrink-0 mt-0.5" />
            <span className="text-[#DC3545] line-clamp-1">
              {entry.efeito_nao_cumprimento}
            </span>
          </div>
        )}

        {/* Bottom: admite dobra + button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${entry.admite_dobra ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                >
                  {entry.admite_dobra ? (
                    <><CheckCircle2 className="size-3 mr-1" /> Admite dobra</>
                  ) : (
                    <><XCircle className="size-3 mr-1" /> Sem dobra</>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {entry.admite_dobra
                  ? "Prazo em dobro para a Fazenda Publica e o MP (art. 183 e 180 CPC)"
                  : "Este prazo nao admite dobra"}
                {entry.excecao_dobra && ` - Excecao: ${entry.excecao_dobra}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
            <Link href={`/prazos?usar_catalogo=${entry.id}`}>
              <ChevronRight className="size-3" />
              Usar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Table View ───────────────────────────────────────────────────

function CatalogTable({
  items,
  isLoading,
  onSelect,
}: {
  items: CatalogEntry[]
  isLoading: boolean
  onSelect: (entry: CatalogEntry) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Artigo / Lei</TableHead>
              <TableHead>Dobra</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <div className="h-5 w-full animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#666666]">
        <BookOpen className="size-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Nenhum prazo encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou a busca.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <ScrollArea className="max-h-[calc(100vh-22rem)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead className="min-w-[200px]">Nome</TableHead>
              <TableHead className="w-[130px]">Prazo</TableHead>
              <TableHead className="w-[110px]">Tipo</TableHead>
              <TableHead className="w-[160px]">Artigo / Lei</TableHead>
              <TableHead className="w-[100px]">Termo Inicial</TableHead>
              <TableHead className="w-[90px]">Dobra</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-[#FAFAFA]"
                onClick={() => onSelect(item)}
              >
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.codigo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium line-clamp-1">{item.nome}</p>
                  {item.efeito_nao_cumprimento && (
                    <p className="text-[10px] text-[#DC3545] line-clamp-1 mt-0.5">
                      {item.efeito_nao_cumprimento}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-bold text-[#C9A961]">{item.dias}</span>{" "}
                  <span className="text-xs text-[#666666]">
                    {CONTAGEM_LABELS[item.contagem_tipo] || item.contagem_tipo}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${TIPO_PRAZO_COLORS[item.tipo_prazo] || ""}`}
                  >
                    {TIPO_PRAZO_LABELS[item.tipo_prazo] || item.tipo_prazo}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[#666666]">
                  {item.artigo} - {item.lei}
                </TableCell>
                <TableCell className="text-xs text-[#666666] max-w-[160px] truncate">
                  {item.termo_inicial}
                </TableCell>
                <TableCell>
                  {item.admite_dobra ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-gray-400" />
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <Link
                      href={`/prazos?usar_catalogo=${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Usar
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────

function CatalogDetailDialog({
  entry,
  onClose,
}: {
  entry: CatalogEntry | null
  onClose: () => void
}) {
  if (!entry) return null

  return (
    <Dialog open={!!entry} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-xs bg-[#FAFAFA]">
              {entry.codigo}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${TIPO_PRAZO_COLORS[entry.tipo_prazo] || ""}`}
            >
              {TIPO_PRAZO_LABELS[entry.tipo_prazo] || entry.tipo_prazo}
            </Badge>
          </div>
          <DialogTitle className="text-lg">{entry.nome}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          <div className="space-y-5">
            {/* Prazo principal */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#FAFAFA] border">
              <Clock className="size-8 text-[#C9A961]" />
              <div>
                <p className="text-2xl font-bold text-[#C9A961]">
                  {entry.dias}{" "}
                  <span className="text-base font-normal text-[#666666]">
                    {CONTAGEM_LABELS[entry.contagem_tipo] || entry.contagem_tipo}
                  </span>
                </p>
                <p className="text-xs text-[#666666] mt-0.5">
                  {entry.tipo_prazo === "PEREMPTORIO"
                    ? "Prazo peremptorio (nao pode ser prorrogado)"
                    : entry.tipo_prazo === "DILATATORIO"
                    ? "Prazo dilatorio (admite prorrogacao por convencao das partes)"
                    : "Prazo improprio (destinado ao juiz/servidor)"}
                </p>
              </div>
            </div>

            {/* Descricao */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Info className="size-4" />
                Descricao
              </h4>
              <p className="text-sm text-[#666666] leading-relaxed">{entry.descricao}</p>
            </div>

            {/* Fundamentacao */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-[#FAFAFA]">
                <p className="text-xs text-[#666666] mb-1">Artigo</p>
                <p className="text-sm font-medium">{entry.artigo}</p>
                {entry.paragrafos && (
                  <p className="text-xs text-[#666666] mt-0.5">{entry.paragrafos}</p>
                )}
              </div>
              <div className="p-3 rounded-lg border bg-[#FAFAFA]">
                <p className="text-xs text-[#666666] mb-1">Lei</p>
                <p className="text-sm font-medium">{entry.lei}</p>
              </div>
            </div>

            {/* Termo inicial */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Gavel className="size-4" />
                Termo Inicial
              </h4>
              <p className="text-sm text-[#666666]">{entry.termo_inicial}</p>
            </div>

            {/* Efeitos */}
            {entry.efeito_nao_cumprimento && (
              <div className="p-3 rounded-lg border border-[#DC3545]/20 bg-[#DC3545]/5">
                <h4 className="text-sm font-semibold text-[#DC3545] mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="size-4" />
                  Efeito do Nao Cumprimento
                </h4>
                <p className="text-sm text-[#DC3545]/80">{entry.efeito_nao_cumprimento}</p>
              </div>
            )}

            {entry.efeito_recursal && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Efeito Recursal</h4>
                <p className="text-sm text-[#666666]">{entry.efeito_recursal}</p>
              </div>
            )}

            {/* Dobra e litisconsorcio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-[#FAFAFA]">
                <div className="flex items-center gap-2 mb-1">
                  {entry.admite_dobra ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-gray-400" />
                  )}
                  <p className="text-sm font-medium">
                    {entry.admite_dobra ? "Admite dobra" : "Nao admite dobra"}
                  </p>
                </div>
                {entry.excecao_dobra && (
                  <p className="text-xs text-[#666666] mt-1">
                    Excecao: {entry.excecao_dobra}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg border bg-[#FAFAFA]">
                <div className="flex items-center gap-2 mb-1">
                  {entry.admite_litisconsorcio ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-gray-400" />
                  )}
                  <p className="text-sm font-medium">
                    {entry.admite_litisconsorcio
                      ? "Admite litisconsorcio"
                      : "Sem litisconsorcio"}
                  </p>
                </div>
                {entry.excecao_litisconsorcio && (
                  <p className="text-xs text-[#666666] mt-1">
                    Excecao: {entry.excecao_litisconsorcio}
                  </p>
                )}
              </div>
            </div>

            {/* Prazo resposta */}
            {entry.prazo_resposta_dias && (
              <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                <p className="text-sm font-medium text-amber-700">
                  Prazo de resposta: {entry.prazo_resposta_dias} dias
                </p>
                {entry.prazo_resposta_ref && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Referência: {entry.prazo_resposta_ref}
                  </p>
                )}
              </div>
            )}

            {/* Observacoes */}
            {entry.observacoes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1.5">Observações</h4>
                <p className="text-sm text-[#666666] leading-relaxed whitespace-pre-line">
                  {entry.observacoes}
                </p>
              </div>
            )}

            {/* Jurisprudencia */}
            {entry.jurisprudencia && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1.5">Jurisprudencia</h4>
                <p className="text-sm text-[#666666] leading-relaxed whitespace-pre-line italic">
                  {entry.jurisprudencia}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t flex justify-end">
          <Button asChild>
            <Link href={`/prazos?usar_catalogo=${entry.id}`}>
              <ChevronRight className="size-4 mr-1.5" />
              Usar este prazo
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
