"use client"

import { useState, useMemo, useCallback, Fragment } from "react"
import { trpc } from "@/lib/trpc"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Star, Heart, X, BookOpen } from "lucide-react"

// --- Constants ---

const TYPE_LABELS: Record<string, string> = {
  JURISPRUDENCIA: "Jurisprudencia",
  SUMULA: "Sumula",
  DOUTRINA: "Doutrina",
  ARTIGO: "Artigo",
  LEGISLACAO: "Legislacao",
  MODELO_PECA: "Modelo de Peca",
  PARECER_INTERNO: "Parecer Interno",
  PESQUISA: "Pesquisa",
  TESE: "Tese",
  NOTA_TECNICA: "Nota Tecnica",
  LIVRO: "Livro",
  ENUNCIADO: "Enunciado",
  CONTRATO_MODELO: "Contrato Modelo",
  ESTRATEGIA: "Estrategia",
  CASO_REFERENCIA: "Caso Referencia",
  MATERIAL_ESTUDO: "Material de Estudo",
  TABELA_REFERENCIA: "Tabela Referencia",
  OUTRO: "Outro",
}

const TYPE_COLORS: Record<string, string> = {
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

const AREA_LABELS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "Recuperacao Judicial",
  FALENCIA: "Falencia",
  EXECUCAO: "Execucao",
  AGRONEGOCIO: "Agronegócio",
  TRABALHISTA: "Trabalhista",
  TRIBUTARIO: "Tributario",
  SOCIETARIO: "Societario",
  CONTRATUAL: "Contratual",
  BANCARIO: "Bancario",
  GERAL: "Geral",
}

// --- Helpers ---

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text

  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)

  if (terms.length === 0) return text

  const escapedTerms = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  )
  const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi")
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-200">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

// --- Component ---

interface BibliotecaSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectEntry?: (entry: any) => void
}

export function BibliotecaSearchModal({
  open,
  onOpenChange,
  onSelectEntry,
}: BibliotecaSearchModalProps) {
  const [searchText, setSearchText] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [areaFilter, setAreaFilter] = useState("")
  const [minRelevancia, setMinRelevancia] = useState("")
  const [apenasFavoritos, setApenasFavoritos] = useState(false)
  const [sortBy, setSortBy] = useState<"relevancia" | "recentes">("relevancia")
  const [page, setPage] = useState(1)
  const [typesExpanded, setTypesExpanded] = useState(false)

  // Build query params
  const queryParams = useMemo(
    () => ({
      search: searchText || undefined,
      tipo: selectedTypes.length > 0 ? selectedTypes : undefined,
      area:
        areaFilter && areaFilter !== "all" ? [areaFilter] : undefined,
      favorito: apenasFavoritos || undefined,
      relevanciaMin: minRelevancia ? Number(minRelevancia) : undefined,
      orderBy: sortBy,
      page,
      limit: 10,
    }),
    [searchText, selectedTypes, areaFilter, minRelevancia, apenasFavoritos, sortBy, page]
  )

  const { data, isLoading } = trpc.biblioteca.list.useQuery(queryParams, {
    enabled: open,
  })

  const items = data?.items || []
  const totalPages = data?.pages || 1
  const total = data?.total || 0

  const handleToggleType = useCallback((type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
    setPage(1)
  }, [])

  const handleSearch = useCallback(() => {
    setPage(1)
  }, [])

  const handleClear = useCallback(() => {
    setSearchText("")
    setSelectedTypes([])
    setAreaFilter("")
    setMinRelevancia("")
    setApenasFavoritos(false)
    setSortBy("relevancia")
    setPage(1)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[800px] max-w-[950px] max-w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        {/* FIXED HEADER */}
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5" />
            Busca Avancada na Biblioteca
          </DialogTitle>
        </DialogHeader>

        {/* Search form */}
        <div className="space-y-3 shrink-0 px-6 pt-4">
          {/* Free text search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-[#666666]" />
            <Input
              placeholder="Buscar em titulo, resumo e conteudo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch()
              }}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Type multi-select */}
            <div className="space-y-1">
              <Label className="text-xs text-[#666666]">Tipo</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs min-w-[140px] justify-between"
                onClick={() => setTypesExpanded(!typesExpanded)}
              >
                {selectedTypes.length === 0
                  ? "Todos os tipos"
                  : `${selectedTypes.length} selecionado(s)`}
                <X
                  className={`size-3 ml-1 transition-transform ${typesExpanded ? "rotate-45" : "rotate-0"}`}
                />
              </Button>
            </div>

            {/* Area */}
            <div className="space-y-1">
              <Label className="text-xs text-[#666666]">Area</Label>
              <Select
                value={areaFilter}
                onValueChange={(v) => {
                  setAreaFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Todas as areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as areas</SelectItem>
                  {Object.entries(AREA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min relevancia */}
            <div className="space-y-1">
              <Label className="text-xs text-[#666666]">Relevancia minima</Label>
              <Select
                value={minRelevancia}
                onValueChange={(v) => {
                  setMinRelevancia(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue placeholder="Qualquer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Favorites switch */}
            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id="favoritos-switch"
                checked={apenasFavoritos}
                onCheckedChange={(checked) => {
                  setApenasFavoritos(checked)
                  setPage(1)
                }}
              />
              <Label htmlFor="favoritos-switch" className="text-xs text-[#666666] cursor-pointer">
                Apenas favoritos
              </Label>
            </div>

            <div className="flex-1" />

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8" onClick={handleSearch}>
                <Search className="size-3 mr-1" />
                Buscar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleClear}
              >
                <X className="size-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Type checkboxes - collapsible */}
          {typesExpanded && (
            <div className="border rounded-md p-3 grid grid-cols-3 gap-2">
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Checkbox
                    checked={selectedTypes.includes(key)}
                    onCheckedChange={() => handleToggleType(key)}
                  />
                  <Badge
                    className={`text-[10px] ${TYPE_COLORS[key] || TYPE_COLORS.OUTRO}`}
                  >
                    {label}
                  </Badge>
                </label>
              ))}
              {selectedTypes.length > 0 && (
                <button
                  className="text-[10px] text-[#666666] underline col-span-3 text-left"
                  onClick={() => {
                    setSelectedTypes([])
                    setPage(1)
                  }}
                >
                  Limpar selecao de tipos
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sort toggle + result count */}
        <div className="flex items-center justify-between shrink-0 pt-1 px-6">
          <span className="text-xs text-[#666666]">
            {isLoading ? "Buscando..." : `${total} resultado(s) encontrado(s)`}
          </span>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] text-[#666666]">Ordenar:</Label>
            <Button
              variant={sortBy === "relevancia" ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                setSortBy("relevancia")
                setPage(1)
              }}
            >
              Relevancia
            </Button>
            <Button
              variant={sortBy === "recentes" ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                setSortBy("recentes")
                setPage(1)
              }}
            >
              Data
            </Button>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="space-y-2 pr-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-[#666666]">Carregando resultados...</div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="size-10 text-[#666666]/30 mx-auto" />
                <p className="text-sm text-[#666666] mt-3">
                  Nenhum resultado encontrado.
                </p>
                <p className="text-[10px] text-[#666666] mt-1">
                  Tente ajustar os filtros ou termos de busca.
                </p>
              </div>
            ) : (
              items.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-md p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className={`text-[10px] ${TYPE_COLORS[entry.tipo] || TYPE_COLORS.OUTRO}`}
                        >
                          {TYPE_LABELS[entry.tipo] || entry.tipo}
                        </Badge>
                        {entry.area && (
                          <Badge variant="outline" className="text-[10px]">
                            {AREA_LABELS[entry.area] || entry.area}
                          </Badge>
                        )}
                        {entry.favorito && (
                          <Heart className="size-3 fill-[#DC3545] text-[#DC3545]" />
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-medium line-clamp-1">
                        {highlightText(entry.titulo, searchText)}
                      </h4>

                      {/* Resumo */}
                      {entry.resumo && (
                        <p className="text-xs text-[#666666] line-clamp-2">
                          {highlightText(entry.resumo, searchText)}
                        </p>
                      )}

                      {/* Fonte */}
                      {entry.fonte && (
                        <p className="text-[10px] text-[#666666]">
                          Fonte: {entry.fonte}
                        </p>
                      )}

                      {/* Bottom row: stars + tags */}
                      <div className="flex items-center gap-3 pt-1">
                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3 ${
                                i < (entry.relevancia || 0)
                                  ? "fill-[#C9A961] text-[#C9A961]"
                                  : "text-[#666666]/20"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Tags */}
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {entry.tags.slice(0, 4).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {entry.tags.length > 4 && (
                              <span className="text-[10px] text-[#666666]">
                                +{entry.tags.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Select button */}
                    {onSelectEntry && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => onSelectEntry(entry)}
                      >
                        Selecionar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 shrink-0 px-6 py-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-[10px] text-[#666666]">
              Pagina {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Proxima
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
