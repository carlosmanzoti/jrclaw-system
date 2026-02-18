"use client"

import { useCallback, useState } from "react"
import { Upload, FileText, Loader2, X, Sparkles, AlertCircle, Info, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  IMPORT_ENTITY_LABELS,
  ACCEPTED_EXTENSIONS,
  type ImportEntityTypeKey,
} from "@/lib/import-constants"
import type { MappedRow } from "@/lib/services/import-service"

const SOURCE_SYSTEMS = [
  { value: "projuris", label: "Projuris" },
  { value: "cpj3", label: "CPJ-3" },
  { value: "astrea", label: "Astrea" },
  { value: "saj", label: "SAJ" },
  { value: "pje", label: "PJe" },
  { value: "legal-one", label: "Legal One" },
  { value: "planilha", label: "Planilha própria" },
  { value: "pdf-tribunal", label: "PDF de tribunal" },
  { value: "outro", label: "Outro" },
]

interface ImportStepUploadProps {
  entityType: ImportEntityTypeKey | null
  onEntityTypeChange: (type: ImportEntityTypeKey) => void
  onAnalysisComplete: (data: {
    rows: MappedRow[]
    confidence: number
    warnings: string[]
    fieldMapping: Record<string, string>
    fileName: string
    fileType: string
    extractedText: string
  }) => void
  templates: { id: string; nome: string; entity_type: string; ai_prompt_hint?: string | null }[]
  selectedTemplateId: string | null
  onTemplateChange: (id: string | null) => void
}

export function ImportStepUpload({
  entityType,
  onEntityTypeChange,
  onAnalysisComplete,
  templates,
  selectedTemplateId,
  onTemplateChange,
}: ImportStepUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sourceSystem, setSourceSystem] = useState<string>("")

  const filteredTemplates = templates.filter(
    (t) => !entityType || t.entity_type === entityType
  )

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setError(null)
    setExtractedText(null)
    setExtracting(true)

    try {
      const formData = new FormData()
      formData.append("file", f)

      const res = await fetch("/api/extract-text", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao extrair texto")
      }

      const data = await res.json()
      setExtractedText(data.text)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo"
      setError(msg)
    } finally {
      setExtracting(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleAnalyze = async () => {
    if (!entityType || !extractedText || !file) return
    setAnalyzing(true)
    setError(null)

    try {
      const selectedTemplate = filteredTemplates.find((t) => t.id === selectedTemplateId)

      // Build template hint with source system info
      let templateHint = selectedTemplate?.ai_prompt_hint || ""
      if (sourceSystem) {
        const systemLabel = SOURCE_SYSTEMS.find(s => s.value === sourceSystem)?.label || sourceSystem
        templateHint = `Source system: ${systemLabel}. ${templateHint}`.trim()
      }

      const res = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractedText,
          entityType,
          templateHint: templateHint || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro na análise IA")
      }

      const data = await res.json()

      onAnalysisComplete({
        rows: data.rows,
        confidence: data.confidence,
        warnings: data.warnings,
        fieldMapping: data.fieldMapping,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        extractedText,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao analisar com IA"
      setError(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const canAnalyze = !!entityType && !!extractedText && !!file && !analyzing

  return (
    <div className="space-y-5">
      {/* Row 1: Entity type + Source system */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de dados a importar *</Label>
          <Select
            value={entityType || ""}
            onValueChange={(v) => onEntityTypeChange(v as ImportEntityTypeKey)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de entidade" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(IMPORT_ENTITY_LABELS) as ImportEntityTypeKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {IMPORT_ENTITY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label>Sistema de origem</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">Opcional — ajuda a IA a entender melhor o formato dos dados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={sourceSystem || "none"}
            onValueChange={(v) => setSourceSystem(v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não especificado</SelectItem>
              {SOURCE_SYSTEMS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template selection */}
      {filteredTemplates.length > 0 && (
        <div className="space-y-2">
          <Label>Template salvo (opcional)</Label>
          <Select
            value={selectedTemplateId || "none"}
            onValueChange={(v) => onTemplateChange(v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sem template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem template</SelectItem>
              {filteredTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Drag and drop zone — compact when file is loaded */}
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          file && extractedText ? "min-h-[100px] p-4" : "min-h-[160px] p-6"
        } ${
          dragOver
            ? "border-[#C9A961] bg-[#C9A961]/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement("input")
          input.type = "file"
          input.accept = ACCEPTED_EXTENSIONS
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0]
            if (f) handleFile(f)
          }
          input.click()
        }}
      >
        {extracting ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#C9A961]" />
            <p className="text-sm text-muted-foreground">Extraindo texto do arquivo...</p>
          </div>
        ) : (
          <>
            <Upload className={`text-muted-foreground ${file && extractedText ? "h-6 w-6 mb-1" : "h-8 w-8 mb-3"}`} />
            <p className="text-sm font-medium">
              {file && extractedText
                ? "Clique ou arraste para substituir o arquivo"
                : "Arraste um arquivo aqui ou clique para selecionar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, XLSX, XLS, CSV, TXT, RTF, JSON, XML
            </p>
          </>
        )}
      </div>

      {/* File info card */}
      {file && extractedText && (
        <Card className="border-[#C9A961]/30 bg-[#C9A961]/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#C9A961]/20">
              <FileText className="h-5 w-5 text-[#C9A961]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB &middot; {extractedText.length.toLocaleString()} caracteres extraídos
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
                setExtractedText(null)
                setError(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="size-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Erro na análise</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* === ANALYZE BUTTON — always visible when file is loaded === */}
      {file && extractedText && !error && (
        <div className="space-y-3">
          <Button
            className="w-full bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F] hover:text-[#2A2A2A] py-6 text-base font-medium shadow-md"
            disabled={!canAnalyze}
            onClick={handleAnalyze}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles className="mr-2.5 h-5 w-5" />
                Analisar com IA
              </>
            )}
          </Button>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <p>A IA vai analisar o conteúdo e mapear os dados automaticamente para os campos do sistema.</p>
            <span className="shrink-0 ml-4 text-[#666666]">Custo estimado: ~US$ 0,05</span>
          </div>
        </div>
      )}

      {/* Disabled state hint — no file yet */}
      {(!file || !extractedText) && !extracting && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 py-3 px-4">
          <Sparkles className="size-4 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {!entityType
              ? "Selecione o tipo de dados e envie um arquivo para analisar"
              : "Envie um arquivo para analisar com IA"}
          </p>
        </div>
      )}
    </div>
  )
}
