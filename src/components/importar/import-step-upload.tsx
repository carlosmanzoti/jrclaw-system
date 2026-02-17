"use client"

import { useCallback, useState } from "react"
import { Upload, FileText, Loader2, X } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import {
  IMPORT_ENTITY_LABELS,
  ACCEPTED_EXTENSIONS,
  type ImportEntityTypeKey,
} from "@/lib/import-constants"
import type { MappedRow } from "@/lib/services/import-service"

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

      const res = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractedText,
          entityType,
          templateHint: selectedTemplate?.ai_prompt_hint || undefined,
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

  return (
    <div className="space-y-6">
      {/* Entity type selection */}
      <div className="space-y-2">
        <Label>Tipo de dados a importar</Label>
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

      {/* Template selection */}
      {filteredTemplates.length > 0 && (
        <div className="space-y-2">
          <Label>Template (opcional)</Label>
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

      {/* Drag and drop zone */}
      <div
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
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
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Extraindo texto do arquivo...</p>
          </div>
        ) : (
          <>
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Arraste um arquivo aqui ou clique para selecionar
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, XLSX, CSV, TXT, RTF, JSON, XML
            </p>
          </>
        )}
      </div>

      {/* File info card */}
      {file && extractedText && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <FileText className="h-8 w-8 text-[#C9A961]" />
            <div className="flex-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB &middot; {extractedText.length.toLocaleString()} caracteres extraídos
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
                setExtractedText(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Badge variant="destructive" className="w-full justify-start px-3 py-2 text-sm">
          {error}
        </Badge>
      )}

      {/* Analyze button */}
      <Button
        className="w-full bg-[#C9A961] text-white hover:bg-[#B8984F]"
        size="lg"
        disabled={!entityType || !extractedText || analyzing}
        onClick={handleAnalyze}
      >
        {analyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analisando com IA...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Analisar com IA
          </>
        )}
      </Button>
    </div>
  )
}
