"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Heart, Pencil, Trash2, Star, Download,
  Maximize2, ExternalLink, Loader2, Search, X,
  FileText, Image as ImageIcon, Table, FileCode,
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { BibliotecaForm } from "./biblioteca-form"
import { BibliotecaFileViewer } from "./biblioteca-file-viewer"
import { TYPE_LABELS, TYPE_COLORS, AREA_LABELS } from "./biblioteca-list"
import {
  getFileCategory,
  getFileCategoryLabel,
  getFileCategoryColor,
  formatFileSize,
  canViewInApp,
  highlightInHtml,
  type FileCategory,
} from "@/lib/file-type-utils"

interface BibliotecaDetailProps {
  entryId: string
}

export function BibliotecaDetail({ entryId }: BibliotecaDetailProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: entry, isLoading } = trpc.biblioteca.getById.useQuery({ id: entryId })
  const toggleFavMutation = trpc.biblioteca.toggleFavorite.useMutation({
    onSuccess: () => utils.biblioteca.getById.invalidate({ id: entryId }),
  })
  const deleteMutation = trpc.biblioteca.delete.useMutation({
    onSuccess: () => router.push("/biblioteca"),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // DOCX / XLSX rendering state
  const [docxHtml, setDocxHtml] = useState("")
  const [xlsxData, setXlsxData] = useState<{ sheets: { name: string; rows: any[][] }[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState("0")
  const [renderLoading, setRenderLoading] = useState(false)

  const cat: FileCategory = entry ? getFileCategory(entry.arquivo_tipo, entry.arquivo_url) : "unknown"
  const hasFile = !!entry?.arquivo_url

  const resetRenderState = useCallback(() => {
    setDocxHtml("")
    setXlsxData(null)
    setActiveSheet("0")
    setRenderLoading(false)
  }, [])

  useEffect(() => {
    if (!entry?.arquivo_url) {
      resetRenderState()
      return
    }

    if (cat === "docx") {
      setRenderLoading(true)
      fetch(`/api/biblioteca/render-docx?url=${encodeURIComponent(entry.arquivo_url)}`)
        .then((r) => r.json())
        .then((data) => { if (!data.error) setDocxHtml(data.html) })
        .catch(() => {})
        .finally(() => setRenderLoading(false))
    } else if (cat === "xlsx" || cat === "csv") {
      setRenderLoading(true)
      fetch(`/api/biblioteca/render-xlsx?url=${encodeURIComponent(entry.arquivo_url)}`)
        .then((r) => r.json())
        .then((data) => { if (!data.error) setXlsxData(data) })
        .catch(() => {})
        .finally(() => setRenderLoading(false))
    }
  }, [entry?.arquivo_url, cat, resetRenderState])

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Entrada nao encontrada.</p>
        <Link href="/biblioteca">
          <Button variant="ghost" size="sm" className="mt-2">
            <ArrowLeft className="size-3 mr-1" /> Voltar
          </Button>
        </Link>
      </div>
    )
  }

  const renderInlineViewer = () => {
    if (renderLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (cat === "pdf" && entry.arquivo_url) {
      return (
        <iframe
          src={entry.arquivo_url}
          className="w-full h-[600px] border rounded-lg"
          title={entry.titulo}
        />
      )
    }

    if (cat === "docx" && docxHtml) {
      const html = searchQuery ? highlightInHtml(docxHtml, searchQuery) : docxHtml
      return (
        <div className="border rounded-lg p-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )
    }

    if ((cat === "xlsx" || cat === "csv") && xlsxData) {
      return (
        <div className="border rounded-lg">
          {xlsxData.sheets.length > 1 && (
            <Tabs value={activeSheet} onValueChange={setActiveSheet} className="px-4 pt-3">
              <TabsList className="h-8">
                {xlsxData.sheets.map((s, i) => (
                  <TabsTrigger key={i} value={String(i)} className="text-xs h-7">{s.name}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <div className="overflow-auto max-h-[500px] p-4">
            {xlsxData.sheets.map((sheet, si) => (
              <table key={si} className={`w-full text-xs border-collapse ${si !== Number(activeSheet) ? "hidden" : ""}`}>
                <tbody>
                  {sheet.rows.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? "bg-muted font-medium" : "hover:bg-muted/30"}>
                      {(row as any[]).map((cell, ci) => {
                        const cellStr = cell != null ? String(cell) : ""
                        const highlighted = searchQuery
                          ? highlightInHtml(cellStr.replace(/</g, "&lt;"), searchQuery)
                          : cellStr
                        return (
                          <td
                            key={ci}
                            className="border px-2 py-1 whitespace-nowrap"
                            dangerouslySetInnerHTML={searchQuery ? { __html: highlighted } : undefined}
                          >
                            {searchQuery ? undefined : cellStr}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>
      )
    }

    if (cat === "image" && entry.arquivo_url) {
      return (
        <div className="border rounded-lg p-4 flex justify-center bg-[repeating-conic-gradient(#f3f3f3_0%_25%,_white_0%_50%)] bg-[length:20px_20px]">
          <img
            src={entry.arquivo_url}
            alt={entry.titulo}
            className="max-w-full max-h-[600px] object-contain"
          />
        </div>
      )
    }

    if (cat === "md" && entry.conteudo) {
      return (
        <div className="border rounded-lg p-6 prose prose-sm max-w-none">
          <ReactMarkdown>{entry.conteudo}</ReactMarkdown>
        </div>
      )
    }

    if (entry.conteudo) {
      const text = entry.conteudo
      const highlighted = searchQuery ? highlightInHtml(text.replace(/</g, "&lt;"), searchQuery) : ""
      return (
        <div className="border rounded-lg p-6">
          {searchQuery ? (
            <pre
              className="text-sm whitespace-pre-wrap font-mono"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-mono">{text}</pre>
          )}
        </div>
      )
    }

    if (entry.resumo) {
      return (
        <div className="border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">{entry.resumo}</p>
        </div>
      )
    }

    return (
      <div className="border rounded-lg border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhum conteudo para exibir.
      </div>
    )
  }

  const isSearchable = cat === "txt" || cat === "md" || cat === "csv" || cat === "rtf" ||
    (cat === "docx" && !!docxHtml) || (cat === "xlsx" && !!xlsxData) ||
    (cat === "unknown" && !!entry.conteudo)

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/biblioteca">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-3.5 mr-1" /> Voltar
          </Button>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {isSearchable && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no conteudo..."
                className="pl-8 h-8 w-48 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-2">
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
          {hasFile && canViewInApp(cat) && (
            <Button variant="outline" size="sm" onClick={() => setViewerOpen(true)}>
              <Maximize2 className="size-3 mr-1" /> Fullscreen
            </Button>
          )}
          {hasFile && (
            <a href={entry.arquivo_url!} download>
              <Button variant="outline" size="sm">
                <Download className="size-3 mr-1" /> Baixar
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFavMutation.mutate({ id: entry.id })}
          >
            <Heart className={`size-3.5 ${entry.favorito ? "fill-[#DC3545] text-[#DC3545]" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#DC3545]"
            onClick={() => { if (confirm("Excluir esta entrada?")) deleteMutation.mutate({ id: entry.id }) }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Title and badges */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">{entry.titulo}</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge className={`text-[10px] ${TYPE_COLORS[entry.tipo] || ""}`}>
            {TYPE_LABELS[entry.tipo] || entry.tipo}
          </Badge>
          {entry.area && (
            <Badge variant="outline" className="text-[10px]">
              {AREA_LABELS[entry.area] || entry.area}
            </Badge>
          )}
          {hasFile && (
            <Badge className={`text-[9px] ${getFileCategoryColor(cat)}`}>
              {getFileCategoryLabel(cat)}
              {entry.arquivo_tamanho ? ` · ${formatFileSize(entry.arquivo_tamanho)}` : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Left column: content */}
        <div>
          {renderInlineViewer()}
        </div>

        {/* Right column: metadata sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {entry.resumo && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Resumo</p>
                  <p className="text-xs">{entry.resumo}</p>
                </div>
              )}

              {entry.fonte && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Fonte</p>
                  <p className="text-xs">{entry.fonte}</p>
                </div>
              )}

              {entry.url_fonte && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">URL da fonte</p>
                  <a
                    href={entry.url_fonte}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#17A2B8] hover:underline flex items-center gap-1 break-all"
                  >
                    {entry.url_fonte}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </div>
              )}

              {entry.tags.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {(entry.relevancia ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Relevancia</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3.5 ${i < (entry.relevancia || 0) ? "fill-[#C9A961] text-[#C9A961]" : "text-muted-foreground/20"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {hasFile && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Arquivo</p>
                  <div className="text-xs space-y-0.5">
                    <p>Formato: {getFileCategoryLabel(cat)}</p>
                    {entry.arquivo_tamanho && <p>Tamanho: {formatFileSize(entry.arquivo_tamanho)}</p>}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {entry.metadata && typeof entry.metadata === "object" && Object.keys(entry.metadata as any).length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Metadados</p>
                  <div className="text-xs space-y-0.5">
                    {Object.entries(entry.metadata as Record<string, any>).map(([key, value]) => (
                      <p key={key}>
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                        {String(value)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked cases */}
              {entry.utilizado_em_casos && entry.utilizado_em_casos.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Casos vinculados</p>
                  <div className="space-y-1">
                    {entry.utilizado_em_casos.map((caso: any) => (
                      <Link
                        key={caso.id}
                        href={`/processos/${caso.id}`}
                        className="text-xs text-[#17A2B8] hover:underline block"
                      >
                        {caso.numero_processo || caso.id}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked projects */}
              {entry.utilizado_em_projetos && entry.utilizado_em_projetos.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Projetos vinculados</p>
                  <div className="space-y-1">
                    {entry.utilizado_em_projetos.map((proj: any) => (
                      <Link
                        key={proj.id}
                        href={`/projetos/${proj.id}`}
                        className="text-xs text-[#17A2B8] hover:underline block"
                      >
                        {proj.codigo} — {proj.titulo}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Datas</p>
                <div className="text-xs space-y-0.5">
                  <p>Criado: {new Date(entry.created_at).toLocaleDateString("pt-BR")}</p>
                  <p>Atualizado: {new Date(entry.updated_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <BibliotecaForm open={formOpen} onOpenChange={setFormOpen} entryId={entry.id} />
      <BibliotecaFileViewer
        entry={entry as any}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  )
}
