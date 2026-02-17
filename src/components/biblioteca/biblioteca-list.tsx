"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus, Search, Star, Heart, MoreHorizontal, Pencil, Trash2,
  BookOpen, Scale, FileText, X, Scissors, LayoutGrid, List, Layers,
  Upload, Eye, Download,
} from "lucide-react"
import Link from "next/link"
import { BibliotecaForm } from "./biblioteca-form"
import { BibliotecaClipper } from "./biblioteca-clipper"
import { BibliotecaClippers } from "./biblioteca-clippers"
import { BibliotecaBulkUpload } from "./biblioteca-bulk-upload"
import { BibliotecaFileViewer } from "./biblioteca-file-viewer"
import {
  getFileCategory,
  getFileCategoryLabel,
  getFileCategoryColor,
  formatFileSize,
  canViewInApp,
} from "@/lib/file-type-utils"

export const TYPE_LABELS: Record<string, string> = {
  JURISPRUDENCIA: "Jurisprudência",
  SUMULA: "Súmula",
  DOUTRINA: "Doutrina",
  ARTIGO: "Artigo",
  LEGISLACAO: "Legislação",
  MODELO_PECA: "Modelo de Peça",
  PARECER_INTERNO: "Parecer Interno",
  PESQUISA: "Pesquisa",
  TESE: "Tese",
  NOTA_TECNICA: "Nota Técnica",
  LIVRO: "Livro",
  ENUNCIADO: "Enunciado",
  CONTRATO_MODELO: "Contrato Modelo",
  ESTRATEGIA: "Estratégia",
  CASO_REFERENCIA: "Caso Referência",
  MATERIAL_ESTUDO: "Material de Estudo",
  TABELA_REFERENCIA: "Tabela Referência",
  OUTRO: "Outro",
}

export const TYPE_COLORS: Record<string, string> = {
  JURISPRUDENCIA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  SUMULA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  DOUTRINA: "bg-[#C9A961]/10 text-[#C9A961]",
  ARTIGO: "bg-[#6F42C1]/10 text-[#6F42C1]",
  LEGISLACAO: "bg-[#28A745]/10 text-[#28A745]",
  MODELO_PECA: "bg-[#FD7E14]/10 text-[#FD7E14]",
  PARECER_INTERNO: "bg-[#C9A961]/10 text-[#C9A961]",
  PESQUISA: "bg-[#6F42C1]/10 text-[#6F42C1]",
  TESE: "bg-[#6F42C1]/10 text-[#6F42C1]",
  NOTA_TECNICA: "bg-[#FD7E14]/10 text-[#FD7E14]",
  LIVRO: "bg-[#C9A961]/10 text-[#C9A961]",
  ENUNCIADO: "bg-[#17A2B8]/10 text-[#17A2B8]",
  CONTRATO_MODELO: "bg-[#FD7E14]/10 text-[#FD7E14]",
  ESTRATEGIA: "bg-[#DC3545]/10 text-[#DC3545]",
  CASO_REFERENCIA: "bg-[#DC3545]/10 text-[#DC3545]",
  MATERIAL_ESTUDO: "bg-[#6F42C1]/10 text-[#6F42C1]",
  TABELA_REFERENCIA: "bg-gray-100 text-gray-600",
  OUTRO: "bg-gray-50 text-gray-600",
}

export const AREA_LABELS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "Recuperação Judicial",
  FALENCIA: "Falência",
  EXECUCAO: "Execução",
  AGRONEGOCIO: "Agronegócio",
  TRABALHISTA: "Trabalhista",
  TRIBUTARIO: "Tributário",
  SOCIETARIO: "Societário",
  CONTRATUAL: "Contratual",
  BANCARIO: "Bancário",
  GERAL: "Geral",
}

type ViewMode = "cards" | "lista" | "area"

interface BibliotecaListProps {
  sidebarTipoFilter?: string
}

export function BibliotecaList({ sidebarTipoFilter }: BibliotecaListProps) {
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [areaFilter, setAreaFilter] = useState("")
  const [favoritoFilter, setFavoritoFilter] = useState(false)
  const [orderBy, setOrderBy] = useState<"recentes" | "antigos" | "relevancia" | "titulo">("recentes")
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [clipperOpen, setClipperOpen] = useState(false)
  const [clippersOpen, setClippersOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [viewerEntry, setViewerEntry] = useState<any>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const utils = trpc.useUtils()

  // Apply sidebar filter or local filter
  const effectiveTipo = sidebarTipoFilter || tipoFilter

  const { data, isLoading } = trpc.biblioteca.list.useQuery({
    search: search || undefined,
    tipo: effectiveTipo && effectiveTipo !== "all" ? [effectiveTipo] : undefined,
    area: areaFilter && areaFilter !== "all" ? [areaFilter] : undefined,
    favorito: favoritoFilter || undefined,
    orderBy,
    page,
    limit: viewMode === "lista" ? 20 : 12,
  })

  const { data: countsByType } = trpc.biblioteca.countsByType.useQuery()
  const toggleFavMutation = trpc.biblioteca.toggleFavorite.useMutation({
    onSuccess: () => utils.biblioteca.list.invalidate(),
  })
  const deleteMutation = trpc.biblioteca.delete.useMutation({
    onSuccess: () => {
      utils.biblioteca.list.invalidate()
      utils.biblioteca.countsByType.invalidate()
    },
  })

  const items = data?.items || []
  const totalPages = data?.pages || 1
  const total = data?.total || 0
  const totalEntries = countsByType?.reduce((sum, c) => sum + c.count, 0) || 0
  const favCount = items.filter((i) => i.favorito).length

  const hasFilters = search || (effectiveTipo && effectiveTipo !== "all") || (areaFilter && areaFilter !== "all") || favoritoFilter

  // Group by area for area view
  const itemsByArea = items.reduce<Record<string, typeof items>>((acc, item) => {
    const area = item.area || "SEM_AREA"
    if (!acc[area]) acc[area] = []
    acc[area].push(item)
    return acc
  }, {})

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-[#666666] uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold">{totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-[#666666] uppercase tracking-wide">Favoritas</p>
            <p className="text-xl font-bold text-[#DC3545]">{favCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-[#666666] uppercase tracking-wide">Tipos ativos</p>
            <p className="text-xl font-bold">{countsByType?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-[#666666] uppercase tracking-wide">Resultados</p>
            <p className="text-xl font-bold">{total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => { setEditId(null); setFormOpen(true) }}>
          <Plus className="size-4 mr-1" />
          Nova Entrada
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)}>
          <Upload className="size-3 mr-1" />
          Importar Múltiplos
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Scissors className="size-3 mr-1" />
              Clipper
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setClipperOpen(true)}>
              <Scissors className="size-3 mr-2" />Clipper Rápido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setClippersOpen(true)}>
              <Scale className="size-3 mr-2" />Clipper Jurisprudência
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setClippersOpen(true)}>
              <FileText className="size-3 mr-2" />Clipper Legislação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setClippersOpen(true)}>
              <BookOpen className="size-3 mr-2" />Clipper Caso Referência
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setClippersOpen(true)}>
              <BookOpen className="size-3 mr-2" />Clipper Livro/Doutrina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2 rounded-r-none"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === "lista" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2 rounded-none border-x"
            onClick={() => setViewMode("lista")}
          >
            <List className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === "area" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2 rounded-l-none"
            onClick={() => setViewMode("area")}
          >
            <Layers className="size-3.5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#666666]" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>

        {!sidebarTipoFilter && (
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={areaFilter} onValueChange={(v) => { setAreaFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {Object.entries(AREA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={favoritoFilter ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => { setFavoritoFilter(!favoritoFilter); setPage(1) }}
        >
          <Heart className={`size-3 ${favoritoFilter ? "fill-current" : ""}`} />
        </Button>

        <Select value={orderBy} onValueChange={(v: any) => { setOrderBy(v); setPage(1) }}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Recentes</SelectItem>
            <SelectItem value="antigos">Antigos</SelectItem>
            <SelectItem value="relevancia">Relevância</SelectItem>
            <SelectItem value="titulo">Alfabético</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setSearch(""); setTipoFilter(""); setAreaFilter(""); setFavoritoFilter(false); setPage(1) }}
          >
            <X className="size-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <BookOpen className="size-10 text-[#666666]/30 mx-auto" />
          <p className="text-sm text-[#666666] mt-3">Nenhuma entrada encontrada.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => { setEditId(null); setFormOpen(true) }}
          >
            <Plus className="size-3 mr-1" />
            Nova entrada
          </Button>
        </div>
      ) : viewMode === "cards" ? (
        /* Cards view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => { setEditId(entry.id); setFormOpen(true) }}
              onDelete={() => { setDeleteTargetId(entry.id); setDeleteConfirmOpen(true) }}
              onToggleFav={() => toggleFavMutation.mutate({ id: entry.id })}
              onView={() => { setViewerEntry(entry); setViewerOpen(true) }}
            />
          ))}
        </div>
      ) : viewMode === "lista" ? (
        /* List view */
        <div className="border rounded-lg divide-y">
          {items.map((entry) => {
            const fileCat = getFileCategory(entry.arquivo_tipo, entry.arquivo_url)
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[#F7F3F1]/50 group">
                <Badge className={`text-[9px] shrink-0 ${TYPE_COLORS[entry.tipo] || TYPE_COLORS.OUTRO}`}>
                  {TYPE_LABELS[entry.tipo] || entry.tipo}
                </Badge>
                <Link
                  href={`/biblioteca/${entry.id}`}
                  className="text-sm font-medium flex-1 truncate hover:text-[#17A2B8] transition-colors"
                >
                  {entry.titulo}
                </Link>
                {entry.arquivo_url && (
                  <Badge className={`text-[8px] shrink-0 ${getFileCategoryColor(fileCat)}`}>
                    {getFileCategoryLabel(fileCat)}
                    {entry.arquivo_tamanho ? ` · ${formatFileSize(entry.arquivo_tamanho)}` : ""}
                  </Badge>
                )}
                {entry.area && (
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {AREA_LABELS[entry.area] || entry.area}
                  </Badge>
                )}
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-2.5 ${
                        i < (entry.relevancia || 0) ? "fill-[#C9A961] text-[#C9A961]" : "text-[#666666]/20"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-1 shrink-0">
                  {entry.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[9px] bg-muted px-1 py-0 rounded">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                  <button
                    onClick={() => toggleFavMutation.mutate({ id: entry.id })}
                    className="p-1 hover:text-[#DC3545]"
                  >
                    <Heart className={`size-3 ${entry.favorito ? "fill-[#DC3545] text-[#DC3545]" : "text-[#666666]/50"}`} />
                  </button>
                  {entry.arquivo_url && (
                    <button
                      onClick={() => { setViewerEntry(entry); setViewerOpen(true) }}
                      className="p-1 hover:text-[#17A2B8]"
                    >
                      <Eye className="size-3 text-[#666666]/50" />
                    </button>
                  )}
                  <button
                    onClick={() => { setEditId(entry.id); setFormOpen(true) }}
                    className="p-1 hover:text-[#17A2B8]"
                  >
                    <Pencil className="size-3 text-[#666666]/50" />
                  </button>
                  <button
                    onClick={() => { setDeleteTargetId(entry.id); setDeleteConfirmOpen(true) }}
                    className="p-1 hover:text-[#DC3545]"
                  >
                    <Trash2 className="size-3 text-[#666666]/50" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Area view — accordion by area */
        <div className="space-y-3">
          {Object.entries(itemsByArea).map(([area, areaItems]) => (
            <div key={area} className="border rounded-lg overflow-hidden">
              <div className="bg-[#F7F3F1] px-4 py-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {AREA_LABELS[area] || (area === "SEM_AREA" ? "Sem área" : area)}
                </Badge>
                <span className="text-xs text-[#666666]">{areaItems.length} entrada(s)</span>
              </div>
              <div className="divide-y">
                {areaItems.map((entry) => {
                  const fileCat = getFileCategory(entry.arquivo_tipo, entry.arquivo_url)
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[#F7F3F1]/30 group">
                      <Badge className={`text-[9px] shrink-0 ${TYPE_COLORS[entry.tipo] || TYPE_COLORS.OUTRO}`}>
                        {TYPE_LABELS[entry.tipo] || entry.tipo}
                      </Badge>
                      <Link
                        href={`/biblioteca/${entry.id}`}
                        className="text-sm flex-1 truncate hover:text-[#17A2B8] transition-colors"
                      >
                        {entry.titulo}
                      </Link>
                      {entry.arquivo_url && (
                        <Badge className={`text-[8px] shrink-0 ${getFileCategoryColor(fileCat)}`}>
                          {getFileCategoryLabel(fileCat)}
                        </Badge>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-2.5 ${
                              i < (entry.relevancia || 0) ? "fill-[#C9A961] text-[#C9A961]" : "text-[#666666]/20"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                        <button
                          onClick={() => toggleFavMutation.mutate({ id: entry.id })}
                          className="p-1 hover:text-[#DC3545]"
                        >
                          <Heart className={`size-3 ${entry.favorito ? "fill-[#DC3545] text-[#DC3545]" : "text-[#666666]/50"}`} />
                        </button>
                        {entry.arquivo_url && (
                          <button
                            onClick={() => { setViewerEntry(entry); setViewerOpen(true) }}
                            className="p-1 hover:text-[#17A2B8]"
                          >
                            <Eye className="size-3 text-[#666666]/50" />
                          </button>
                        )}
                        <button
                          onClick={() => { setEditId(entry.id); setFormOpen(true) }}
                          className="p-1 hover:text-[#17A2B8]"
                        >
                          <Pencil className="size-3 text-[#666666]/50" />
                        </button>
                        <button
                          onClick={() => { setDeleteTargetId(entry.id); setDeleteConfirmOpen(true) }}
                          className="p-1 hover:text-[#DC3545]"
                        >
                          <Trash2 className="size-3 text-[#666666]/50" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs text-[#666666]">
            Página {page} de {totalPages} ({total} resultados)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Modals */}
      <BibliotecaForm open={formOpen} onOpenChange={setFormOpen} entryId={editId} />
      <BibliotecaClipper open={clipperOpen} onOpenChange={setClipperOpen} />
      <BibliotecaClippers open={clippersOpen} onOpenChange={setClippersOpen} />
      <BibliotecaBulkUpload open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />

      {/* File viewer */}
      <BibliotecaFileViewer
        entry={viewerEntry}
        open={viewerOpen}
        onOpenChange={(open) => { setViewerOpen(open); if (!open) setViewerEntry(null) }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Entrada</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetId) {
                  deleteMutation.mutate({ id: deleteTargetId })
                }
                setDeleteConfirmOpen(false)
                setDeleteTargetId(null)
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Card component for entries */
function EntryCard({
  entry,
  onEdit,
  onDelete,
  onToggleFav,
  onView,
}: {
  entry: any
  onEdit: () => void
  onDelete: () => void
  onToggleFav: () => void
  onView: () => void
}) {
  const fileCat = getFileCategory(entry.arquivo_tipo, entry.arquivo_url)
  const hasFile = !!entry.arquivo_url

  return (
    <Card className="group hover:shadow-md transition-shadow relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={`text-[10px] ${TYPE_COLORS[entry.tipo] || TYPE_COLORS.OUTRO}`}>
                {TYPE_LABELS[entry.tipo] || entry.tipo}
              </Badge>
              {entry.area && (
                <Badge variant="outline" className="text-[10px]">
                  {AREA_LABELS[entry.area] || entry.area}
                </Badge>
              )}
              {hasFile && (
                <Badge className={`text-[9px] ${getFileCategoryColor(fileCat)}`}>
                  {getFileCategoryLabel(fileCat)}
                  {entry.arquivo_tamanho ? ` · ${formatFileSize(entry.arquivo_tamanho)}` : ""}
                </Badge>
              )}
            </div>
            <Link
              href={`/biblioteca/${entry.id}`}
              className="text-sm font-medium line-clamp-2 hover:text-[#17A2B8] transition-colors block"
            >
              {entry.titulo}
            </Link>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onToggleFav}
              className="p-1 hover:text-[#DC3545] transition-colors"
            >
              <Heart className={`size-3.5 ${entry.favorito ? "fill-[#DC3545] text-[#DC3545]" : "text-[#666666]/50"}`} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasFile && (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="size-3 mr-2" />Visualizar arquivo
                  </DropdownMenuItem>
                )}
                {hasFile && (
                  <DropdownMenuItem asChild>
                    <a href={entry.arquivo_url} download>
                      <Download className="size-3 mr-2" />Baixar arquivo
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-3 mr-2" />Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[#DC3545]" onClick={onDelete}>
                  <Trash2 className="size-3 mr-2" />Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {entry.resumo && (
          <p className="text-xs text-[#666666] line-clamp-2 mt-2">{entry.resumo}</p>
        )}

        {entry.fonte && (
          <p className="text-[10px] text-[#666666] mt-1">Fonte: {entry.fonte}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {entry.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-[10px] text-[#666666]">+{entry.tags.length - 3}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3 ${
                  i < (entry.relevancia || 0) ? "fill-[#C9A961] text-[#C9A961]" : "text-[#666666]/20"
                }`}
              />
            ))}
          </div>
        </div>

        {(entry._count?.utilizado_em_casos > 0 || entry._count?.utilizado_em_projetos > 0) && (
          <p className="text-[10px] text-[#666666] mt-1">
            Utilizado em {entry._count.utilizado_em_casos} caso(s), {entry._count.utilizado_em_projetos} projeto(s)
          </p>
        )}

        {/* Hover action buttons */}
        {hasFile && (
          <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={onView}
            >
              <Eye className="size-3 mr-1" />
              Visualizar
            </Button>
            <a href={entry.arquivo_url} download>
              <Button variant="outline" size="sm" className="h-7 text-[10px] px-2">
                <Download className="size-3 mr-1" />
                Baixar
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
