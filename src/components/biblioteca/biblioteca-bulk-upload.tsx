"use client"

import { useState, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, Check, X, Loader2, AlertCircle } from "lucide-react"
import { trpc } from "@/lib/trpc"

const LIBRARY_TYPES: Record<string, string> = {
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

const LIBRARY_AREAS: Record<string, string> = {
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

const ACCEPTED_EXTENSIONS = [
  ".pdf", ".docx", ".txt", ".xlsx", ".csv", ".rtf", ".md",
  ".jpg", ".jpeg", ".png",
]

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/rtf",
  "text/markdown",
  "image/jpeg",
  "image/png",
]

interface BulkFile {
  file: File
  titulo: string
  tipo: string
  area: string
  tags: string
  status: "pending" | "uploading" | "success" | "error"
  selected: boolean
}

interface BibliotecaBulkUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getFilenameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".")
  return lastDot > 0 ? filename.substring(0, lastDot) : filename
}

function isAcceptedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext)
}

export function BibliotecaBulkUpload({ open, onOpenChange }: BibliotecaBulkUploadProps) {
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<BulkFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [batchTipo, setBatchTipo] = useState("")
  const [batchArea, setBatchArea] = useState("")
  const [summary, setSummary] = useState<{
    success: number
    noText: number
    error: number
  } | null>(null)

  const createMutation = trpc.biblioteca.create.useMutation()

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles: BulkFile[] = []
    const fileArray = Array.from(incoming)

    for (const file of fileArray) {
      if (!isAcceptedFile(file)) continue
      if (files.length + newFiles.length >= 50) break

      newFiles.push({
        file,
        titulo: getFilenameWithoutExtension(file.name),
        tipo: "OUTRO",
        area: "",
        tags: "",
        status: "pending",
        selected: true,
      })
    }

    setFiles((prev) => {
      const total = [...prev, ...newFiles]
      return total.slice(0, 50)
    })
    setSummary(null)
  }, [files.length])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isProcessing) return
      addFiles(e.dataTransfer.files)
    },
    [addFiles, isProcessing]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [addFiles]
  )

  const updateFile = (index: number, updates: Partial<BulkFile>) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    )
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleSelectAll = () => {
    const allSelected = files.every((f) => f.selected)
    setFiles((prev) => prev.map((f) => ({ ...f, selected: !allSelected })))
  }

  const applyBatchToSelected = () => {
    setFiles((prev) =>
      prev.map((f) => {
        if (!f.selected) return f
        return {
          ...f,
          ...(batchTipo && batchTipo !== "none" ? { tipo: batchTipo } : {}),
          ...(batchArea ? { area: batchArea } : {}),
        }
      })
    )
  }

  const selectedCount = files.filter((f) => f.selected).length

  const handleImportAll = async () => {
    if (isProcessing || files.length === 0) return

    setIsProcessing(true)
    setProcessedCount(0)
    setSummary(null)

    let successCount = 0
    let noTextCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      setProcessedCount(i)
      updateFile(i, { status: "uploading" })

      try {
        // Step 1: Upload file
        const formData = new FormData()
        formData.append("file", files[i].file)
        formData.append("tipo", files[i].tipo || "OUTRO")

        const uploadRes = await fetch("/api/biblioteca/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error("Upload failed")
        }

        const uploadData = await uploadRes.json()

        // Step 2: Create biblioteca entry
        const tags = files[i].tags
          ? files[i].tags.split(",").map((t) => t.trim()).filter(Boolean)
          : []

        await createMutation.mutateAsync({
          tipo: files[i].tipo || "OUTRO",
          titulo: files[i].titulo || files[i].file.name,
          conteudo: uploadData.text || undefined,
          area: files[i].area && files[i].area !== "none" ? files[i].area : undefined,
          tags,
          arquivo_url: uploadData.url,
        })

        if (!uploadData.text || uploadData.extractionFailed) {
          noTextCount++
        }

        successCount++
        updateFile(i, { status: "success" })
      } catch {
        errorCount++
        updateFile(i, { status: "error" })
      }
    }

    setProcessedCount(files.length)
    setIsProcessing(false)
    setSummary({ success: successCount, noText: noTextCount, error: errorCount })
    utils.biblioteca.list.invalidate()
  }

  const handleClose = (value: boolean) => {
    if (isProcessing) return
    if (!value) {
      setFiles([])
      setSummary(null)
      setProcessedCount(0)
      setBatchTipo("")
      setBatchArea("")
    }
    onOpenChange(value)
  }

  const progressPercent =
    files.length > 0 ? Math.round((processedCount / files.length) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importação em Lote</DialogTitle>
        </DialogHeader>

        {files.length === 0 ? (
          /* Drop zone */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-12 cursor-pointer hover:border-[#17A2B8] hover:bg-[#17A2B8]/5 transition-colors"
          >
            <Upload className="size-10 text-[#666666]/40" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-[10px] text-[#666666] mt-1">
                Até 50 arquivos. Formatos: PDF, DOCX, TXT, XLSX, CSV, RTF, MD, JPG, PNG
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_MIME_TYPES.join(",")}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <>
            {/* Batch actions bar */}
            <div className="flex items-center gap-2 flex-wrap border rounded-lg p-2 bg-muted/30">
              <Checkbox
                checked={files.length > 0 && files.every((f) => f.selected)}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-[10px] text-[#666666]">
                {selectedCount} de {files.length} selecionado(s)
              </span>

              <div className="flex-1" />

              <span className="text-[10px] text-[#666666]">Aplicar a selecionados:</span>
              <Select value={batchTipo} onValueChange={setBatchTipo}>
                <SelectTrigger className="w-[140px] h-7 text-[10px]">
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {Object.entries(LIBRARY_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={batchArea} onValueChange={setBatchArea}>
                <SelectTrigger className="w-[140px] h-7 text-[10px]">
                  <SelectValue placeholder="Área..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {Object.entries(LIBRARY_AREAS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={applyBatchToSelected}
                disabled={isProcessing || (!batchTipo && !batchArea)}
              >
                Aplicar
              </Button>

              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Adicionar
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_MIME_TYPES.join(",")}
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* File list */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[28px_1fr_180px_140px_140px_120px_32px] gap-2 items-center px-2 py-1 text-[10px] text-[#666666] font-medium border-b">
                  <span />
                  <span>Arquivo / Título</span>
                  <span>Título</span>
                  <span>Tipo</span>
                  <span>Área</span>
                  <span>Tags</span>
                  <span className="text-center">Status</span>
                </div>

                {files.map((entry, index) => (
                  <div
                    key={`${entry.file.name}-${index}`}
                    className="grid grid-cols-[28px_1fr_180px_140px_140px_120px_32px] gap-2 items-center px-2 py-1.5 rounded hover:bg-muted/30"
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={entry.selected}
                      onCheckedChange={(checked) =>
                        updateFile(index, { selected: !!checked })
                      }
                      disabled={isProcessing}
                    />

                    {/* Filename */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="size-3.5 text-[#666666] shrink-0" />
                      <span className="text-xs truncate" title={entry.file.name}>
                        {entry.file.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {(entry.file.size / 1024).toFixed(0)} KB
                      </Badge>
                    </div>

                    {/* Title input */}
                    <Input
                      value={entry.titulo}
                      onChange={(e) => updateFile(index, { titulo: e.target.value })}
                      className="h-7 text-[10px]"
                      disabled={isProcessing}
                    />

                    {/* Type select */}
                    <Select
                      value={entry.tipo}
                      onValueChange={(v) => updateFile(index, { tipo: v })}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LIBRARY_TYPES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Area select */}
                    <Select
                      value={entry.area || "none"}
                      onValueChange={(v) =>
                        updateFile(index, { area: v === "none" ? "" : v })
                      }
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="h-7 text-[10px]">
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {Object.entries(LIBRARY_AREAS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Tags input */}
                    <Input
                      value={entry.tags}
                      onChange={(e) => updateFile(index, { tags: e.target.value })}
                      placeholder="tag1, tag2"
                      className="h-7 text-[10px]"
                      disabled={isProcessing}
                    />

                    {/* Status */}
                    <div className="flex items-center justify-center">
                      {entry.status === "pending" && (
                        <div className="size-4 rounded-full border-2 border-[#666666]/30" />
                      )}
                      {entry.status === "uploading" && (
                        <Loader2 className="size-4 text-[#17A2B8] animate-spin" />
                      )}
                      {entry.status === "success" && (
                        <Check className="size-4 text-[#28A745]" />
                      )}
                      {entry.status === "error" && (
                        <X className="size-4 text-[#DC3545]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Progress bar */}
            {isProcessing && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#666666]">
                    Processando {processedCount + 1} de {files.length}...
                  </span>
                  <span className="text-[#666666]">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <AlertCircle className="size-4 text-[#17A2B8] shrink-0" />
                <div className="text-xs space-x-3">
                  <span className="text-[#28A745] font-medium">
                    {summary.success} importado(s)
                  </span>
                  {summary.noText > 0 && (
                    <span className="text-[#C9A961]">
                      {summary.noText} sem extração de texto
                    </span>
                  )}
                  {summary.error > 0 && (
                    <span className="text-[#DC3545]">
                      {summary.error} com erro
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>
            {summary ? "Fechar" : "Cancelar"}
          </Button>
          {files.length > 0 && !summary && (
            <Button
              className="bg-[#17A2B8] hover:bg-[#17A2B8]/90 text-white"
              onClick={handleImportAll}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-1" />
                  Importar Todos ({files.length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
