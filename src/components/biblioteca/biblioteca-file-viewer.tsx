"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  X, Download, PanelRightClose, PanelRightOpen, Search,
  Star, ZoomIn, ZoomOut, RotateCcw, Loader2,
  FileText, Image as ImageIcon, Table, FileCode,
} from "lucide-react"
import {
  getFileCategory,
  getFileCategoryLabel,
  getFileCategoryColor,
  formatFileSize,
  canViewInApp,
  highlightInHtml,
  type FileCategory,
} from "@/lib/file-type-utils"
import { TYPE_LABELS, TYPE_COLORS, AREA_LABELS } from "./biblioteca-list"
import ReactMarkdown from "react-markdown"

interface ViewerEntry {
  id: string
  titulo: string
  tipo: string
  area?: string | null
  resumo?: string | null
  conteudo?: string | null
  fonte?: string | null
  url_fonte?: string | null
  tags: string[]
  relevancia?: number | null
  arquivo_url?: string | null
  arquivo_tipo?: string | null
  arquivo_tamanho?: number | null
  metadata?: any
  created_at?: string | Date
  updated_at?: string | Date
  _count?: { utilizado_em_casos: number; utilizado_em_projetos: number }
}

interface BibliotecaFileViewerProps {
  entry: ViewerEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BibliotecaFileViewer({ entry, open, onOpenChange }: BibliotecaFileViewerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [zoom, setZoom] = useState(1)

  // Rendering state
  const [docxHtml, setDocxHtml] = useState("")
  const [xlsxData, setXlsxData] = useState<{ sheets: { name: string; rows: any[][] }[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState("0")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const cat: FileCategory = entry ? getFileCategory(entry.arquivo_tipo, entry.arquivo_url) : "unknown"

  const resetState = useCallback(() => {
    setDocxHtml("")
    setXlsxData(null)
    setActiveSheet("0")
    setLoading(false)
    setError("")
    setSearchQuery("")
    setZoom(1)
  }, [])

  useEffect(() => {
    if (!open || !entry?.arquivo_url) {
      resetState()
      return
    }

    if (cat === "docx") {
      setLoading(true)
      fetch(`/api/biblioteca/render-docx?url=${encodeURIComponent(entry.arquivo_url)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setDocxHtml(data.html)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (cat === "xlsx" || cat === "csv") {
      setLoading(true)
      fetch(`/api/biblioteca/render-xlsx?url=${encodeURIComponent(entry.arquivo_url)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setXlsxData(data)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [open, entry?.arquivo_url, cat, resetState])

  if (!entry) return null

  const hasFile = !!entry.arquivo_url
  const viewable = hasFile && canViewInApp(cat)

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-red-500">
          Erro ao carregar: {error}
        </div>
      )
    }

    if (!hasFile && !entry.conteudo) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum arquivo ou conteudo para visualizar.
        </div>
      )
    }

    // PDF viewer
    if (cat === "pdf" && entry.arquivo_url) {
      return (
        <iframe
          src={entry.arquivo_url}
          className="w-full h-full border-0"
          title={entry.titulo}
        />
      )
    }

    // DOCX viewer
    if (cat === "docx" && docxHtml) {
      const html = searchQuery ? highlightInHtml(docxHtml, searchQuery) : docxHtml
      return (
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </ScrollArea>
      )
    }

    // XLSX viewer
    if ((cat === "xlsx" || cat === "csv") && xlsxData) {
      const sheets = xlsxData.sheets
      return (
        <div className="flex-1 flex flex-col min-h-0">
          {sheets.length > 1 && (
            <Tabs value={activeSheet} onValueChange={setActiveSheet} className="shrink-0 px-4 pt-2">
              <TabsList className="h-8">
                {sheets.map((s, i) => (
                  <TabsTrigger key={i} value={String(i)} className="text-xs h-7">
                    {s.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {sheets.map((sheet, si) => (
                <div key={si} className={si !== Number(activeSheet) ? "hidden" : ""}>
                  <table className="w-full text-xs border-collapse">
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
                                dangerouslySetInnerHTML={
                                  searchQuery ? { __html: highlighted } : undefined
                                }
                              >
                                {searchQuery ? undefined : cellStr}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )
    }

    // Image viewer
    if (cat === "image" && entry.arquivo_url) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center overflow-auto bg-[repeating-conic-gradient(#f3f3f3_0%_25%,_white_0%_50%)] bg-[length:20px_20px]">
          <img
            src={entry.arquivo_url}
            alt={entry.titulo}
            className="max-w-full max-h-full object-contain transition-transform"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
      )
    }

    // Markdown viewer
    if (cat === "md" && (entry.conteudo || hasFile)) {
      const text = entry.conteudo || ""
      return (
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto prose prose-sm max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        </ScrollArea>
      )
    }

    // Text / CSV / RTF / fallback content viewer
    const textContent = entry.conteudo || ""
    if (textContent) {
      const highlighted = searchQuery ? highlightInHtml(textContent.replace(/</g, "&lt;"), searchQuery) : ""
      return (
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto">
            {searchQuery ? (
              <pre
                className="text-sm whitespace-pre-wrap font-mono"
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono">{textContent}</pre>
            )}
          </div>
        </ScrollArea>
      )
    }

    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Este tipo de arquivo não pode ser visualizado diretamente.
        {hasFile && (
          <a
            href={entry.arquivo_url!}
            download
            className="ml-2 text-[#17A2B8] underline"
          >
            Baixar
          </a>
        )}
      </div>
    )
  }

  const isTextBased = cat === "txt" || cat === "md" || cat === "csv" || cat === "rtf" || (cat === "unknown" && !!entry.conteudo)
  const isDocxLoaded = cat === "docx" && !!docxHtml
  const isXlsxLoaded = (cat === "xlsx" || cat === "csv") && !!xlsxData
  const searchable = isTextBased || isDocxLoaded || isXlsxLoaded

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <FileViewerIcon cat={cat} />
            <DialogTitle className="text-sm font-medium truncate">{entry.titulo}</DialogTitle>
            <Badge className={`text-[9px] shrink-0 ${getFileCategoryColor(cat)}`}>
              {getFileCategoryLabel(cat)}
              {entry.arquivo_tamanho ? ` · ${formatFileSize(entry.arquivo_tamanho)}` : ""}
            </Badge>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {cat === "image" && (
              <>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}>
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}>
                  <ZoomOut className="size-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(1)}>
                  <RotateCcw className="size-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
            </Button>
            {hasFile && (
              <a href={entry.arquivo_url!} download>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Download className="size-3.5" />
                </Button>
              </a>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {renderContent()}
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-[300px] shrink-0 border-l flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Tipo</p>
                    <Badge className={`text-[10px] ${TYPE_COLORS[entry.tipo] || ""}`}>
                      {TYPE_LABELS[entry.tipo] || entry.tipo}
                    </Badge>
                  </div>

                  {entry.area && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Area</p>
                      <Badge variant="outline" className="text-[10px]">
                        {AREA_LABELS[entry.area] || entry.area}
                      </Badge>
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
                        className="text-xs text-[#17A2B8] hover:underline break-all"
                      >
                        {entry.url_fonte}
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
                            className={`size-3 ${i < (entry.relevancia || 0) ? "fill-[#C9A961] text-[#C9A961]" : "text-muted-foreground/20"}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {hasFile && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Arquivo</p>
                      <div className="text-xs space-y-0.5">
                        <p>Tipo: {getFileCategoryLabel(cat)}</p>
                        {entry.arquivo_tamanho && <p>Tamanho: {formatFileSize(entry.arquivo_tamanho)}</p>}
                      </div>
                    </div>
                  )}

                  {entry.resumo && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Resumo</p>
                      <p className="text-xs text-muted-foreground">{entry.resumo}</p>
                    </div>
                  )}

                  {entry._count && (entry._count.utilizado_em_casos > 0 || entry._count.utilizado_em_projetos > 0) && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Utilizacao</p>
                      <p className="text-xs">
                        {entry._count.utilizado_em_casos} caso(s), {entry._count.utilizado_em_projetos} projeto(s)
                      </p>
                    </div>
                  )}

                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Metadados</p>
                      <div className="text-xs space-y-0.5">
                        {Object.entries(entry.metadata as Record<string, any>).map(([key, value]) => (
                          <p key={key}>
                            <span className="text-muted-foreground">{key.replace(/_/g, " ")}:</span>{" "}
                            {String(value)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.created_at && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Criado em</p>
                      <p className="text-xs">{new Date(entry.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer with search */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-t bg-muted/30">
          <Search className="size-3.5 text-muted-foreground shrink-0" />
          {searchable ? (
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no conteudo..."
              className="h-7 text-xs flex-1"
            />
          ) : cat === "pdf" ? (
            <span className="text-xs text-muted-foreground">Use Ctrl+F para buscar no PDF</span>
          ) : (
            <span className="text-xs text-muted-foreground">Busca não disponível para este tipo</span>
          )}
          {searchQuery && searchable && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSearchQuery("")}>
              <X className="size-3" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FileViewerIcon({ cat }: { cat: FileCategory }) {
  const className = "size-4 shrink-0"
  switch (cat) {
    case "pdf": return <FileText className={`${className} text-red-600`} />
    case "docx": return <FileText className={`${className} text-blue-600`} />
    case "xlsx":
    case "csv": return <Table className={`${className} text-green-600`} />
    case "image": return <ImageIcon className={`${className} text-amber-600`} />
    case "md": return <FileCode className={`${className} text-purple-600`} />
    default: return <FileText className={`${className} text-gray-500`} />
  }
}
