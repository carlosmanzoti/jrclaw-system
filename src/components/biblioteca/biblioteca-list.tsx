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
  Plus, Search, Star, Heart, MoreHorizontal, Pencil, Copy, Trash2,
  BookOpen, Scale, FileText, Bookmark, X, Scissors,
} from "lucide-react"
import { BibliotecaForm } from "./biblioteca-form"
import { BibliotecaClipper } from "./biblioteca-clipper"

const TYPE_LABELS: Record<string, string> = {
  JURISPRUDENCIA: "Jurisprudência",
  DOUTRINA: "Doutrina",
  LEGISLACAO: "Legislação",
  MODELO: "Modelo",
  ARTIGO: "Artigo",
  PARECER: "Parecer",
  SUMULA: "Súmula",
  OUTRO: "Outro",
}

const TYPE_COLORS: Record<string, string> = {
  JURISPRUDENCIA: "bg-blue-50 text-blue-700",
  DOUTRINA: "bg-purple-50 text-purple-700",
  LEGISLACAO: "bg-emerald-50 text-emerald-700",
  MODELO: "bg-amber-50 text-amber-700",
  ARTIGO: "bg-cyan-50 text-cyan-700",
  PARECER: "bg-pink-50 text-pink-700",
  SUMULA: "bg-orange-50 text-orange-700",
  OUTRO: "bg-gray-50 text-gray-600",
}

const AREA_LABELS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "Recuperação Judicial",
  FALENCIA: "Falência",
  EXECUCAO: "Execução",
  AGRARIO: "Agrário",
  TRABALHISTA: "Trabalhista",
  TRIBUTARIO: "Tributário",
  SOCIETARIO: "Societário",
  CONTRATUAL: "Contratual",
  GERAL: "Geral",
}

export function BibliotecaList() {
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [areaFilter, setAreaFilter] = useState("")
  const [favoritoFilter, setFavoritoFilter] = useState(false)
  const [orderBy, setOrderBy] = useState<"recentes" | "antigos" | "relevancia" | "titulo">("recentes")
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [clipperOpen, setClipperOpen] = useState(false)

  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.biblioteca.list.useQuery({
    search: search || undefined,
    tipo: tipoFilter && tipoFilter !== "all" ? [tipoFilter] : undefined,
    area: areaFilter && areaFilter !== "all" ? [areaFilter] : undefined,
    favorito: favoritoFilter || undefined,
    orderBy,
    page,
    limit: 12,
  })

  const { data: countsByType } = trpc.biblioteca.countsByType.useQuery()
  const toggleFavMutation = trpc.biblioteca.toggleFavorite.useMutation({
    onSuccess: () => utils.biblioteca.list.invalidate(),
  })
  const deleteMutation = trpc.biblioteca.delete.useMutation({
    onSuccess: () => utils.biblioteca.list.invalidate(),
  })

  const items = data?.items || []
  const totalPages = data?.pages || 1
  const total = data?.total || 0
  const totalEntries = countsByType?.reduce((sum, c) => sum + c.count, 0) || 0

  const hasFilters = search || (tipoFilter && tipoFilter !== "all") || (areaFilter && areaFilter !== "all") || favoritoFilter

  return (
    <>
      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{totalEntries} entradas</span>
        {countsByType?.map((c) => (
          <Badge key={c.tipo} variant="outline" className="text-[10px]">
            {TYPE_LABELS[c.tipo] || c.tipo}: {c.count}
          </Badge>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => { setEditId(null); setFormOpen(true) }}>
          <Plus className="size-4 mr-1" />
          Nova Entrada
        </Button>
        <Button variant="outline" size="sm" onClick={() => setClipperOpen(true)}>
          <Scissors className="size-3 mr-1" />
          Clipper Rápido
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>

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

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <BookOpen className="size-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Nenhuma entrada encontrada.</p>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((entry) => (
            <Card key={entry.id} className="group hover:shadow-md transition-shadow">
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
                    </div>
                    <h3 className="text-sm font-medium line-clamp-2">{entry.titulo}</h3>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => toggleFavMutation.mutate({ id: entry.id })}
                      className="p-1 hover:text-red-500 transition-colors"
                    >
                      <Heart className={`size-3.5 ${entry.favorito ? "fill-red-500 text-red-500" : "text-muted-foreground/50"}`} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditId(entry.id); setFormOpen(true) }}>
                          <Pencil className="size-3 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            if (confirm("Excluir entrada?")) deleteMutation.mutate({ id: entry.id })
                          }}
                        >
                          <Trash2 className="size-3 mr-2" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {entry.resumo && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{entry.resumo}</p>
                )}

                {entry.fonte && (
                  <p className="text-[10px] text-muted-foreground mt-1">Fonte: {entry.fonte}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-1">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                    {entry.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3 ${
                          i < (entry.relevancia || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {(entry._count.utilizado_em_casos > 0 || entry._count.utilizado_em_projetos > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Utilizado em {entry._count.utilizado_em_casos} caso(s), {entry._count.utilizado_em_projetos} projeto(s)
                  </p>
                )}
              </CardContent>
            </Card>
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
          <span className="text-xs text-muted-foreground">
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
    </>
  )
}
