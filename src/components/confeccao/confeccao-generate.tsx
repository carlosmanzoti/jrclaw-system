"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Loader2,
  Sparkles,
  RotateCcw,
  Save,
  Download,
  Crown,
  Upload,
  X,
  FileText,
  StopCircle,
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { TiptapEditor } from "@/components/ui/tiptap-editor"
import {
  getModelDisplayForDocType,
  MODEL_DISPLAY,
  COST_ESTIMATES,
} from "@/lib/ai-model-map"
import type { ModelTier } from "@/lib/ai-model-map"
import {
  extractTextFromFile,
  isFileSupported,
  FILE_LABELS,
  type ExtractedFile,
} from "@/lib/file-extractor"
import {
  BibliotecaReferences,
  type BibliotecaRefEntry,
} from "@/components/confeccao/biblioteca-references"
import { BibliotecaSearchModal } from "@/components/biblioteca/biblioteca-search-modal"
import { BibliotecaForm } from "@/components/biblioteca/biblioteca-form"
import { trpc } from "@/lib/trpc"

const DOC_TYPE_GROUPS: Record<string, Array<{ value: string; label: string }>> = {
  "Fase de Conhecimento": [
    { value: "PETICAO_INICIAL", label: "Petição Inicial" },
    { value: "CONTESTACAO", label: "Contestação" },
    { value: "REPLICA", label: "Réplica" },
    { value: "RECONVENCAO", label: "Reconvenção" },
    { value: "MEMORIAIS", label: "Memoriais" },
    { value: "ALEGACOES_FINAIS", label: "Alegações Finais" },
  ],
  "Recursos": [
    { value: "EMBARGOS_DECLARACAO", label: "Embargos de Declaração" },
    { value: "AGRAVO_INSTRUMENTO", label: "Agravo de Instrumento" },
    { value: "AGRAVO_INTERNO", label: "Agravo Interno" },
    { value: "APELACAO", label: "Apelação" },
    { value: "RECURSO_ESPECIAL", label: "Recurso Especial" },
    { value: "RECURSO_EXTRAORDINARIO", label: "Recurso Extraordinário" },
    { value: "CONTRARRAZOES", label: "Contrarrazões" },
    { value: "RECURSO_ORDINARIO", label: "Recurso Ordinário" },
  ],
  "Execução": [
    { value: "CUMPRIMENTO_SENTENCA", label: "Cumprimento de Sentença" },
    { value: "IMPUGNACAO_CUMPRIMENTO", label: "Impugnação ao Cumprimento" },
    { value: "EMBARGOS_EXECUCAO", label: "Embargos à Execução" },
    { value: "EXCECAO_PRE_EXECUTIVIDADE", label: "Exceção de Pré-Executividade" },
  ],
  "RJ e Falência": [
    { value: "PLANO_RJ", label: "Plano de RJ" },
    { value: "HABILITACAO_CREDITO", label: "Habilitação de Crédito" },
    { value: "IMPUGNACAO_CREDITO", label: "Impugnação de Crédito" },
    { value: "RELATORIO_AJ", label: "Relatório AJ" },
    { value: "PETICAO_OBJECAO_PLANO", label: "Objeção ao Plano" },
    { value: "CONVOLACAO_FALENCIA", label: "Convolação em Falência" },
  ],
  "Consultivos": [
    { value: "PARECER", label: "Parecer" },
    { value: "MEMORANDO_INTERNO", label: "Memorando Interno" },
    { value: "NOTA_TECNICA", label: "Nota Técnica" },
    { value: "DUE_DILIGENCE", label: "Due Diligence" },
  ],
  "Contratos": [
    { value: "CONTRATO_GENERICO", label: "Contrato (genérico)" },
    { value: "CONTRATO_ARRENDAMENTO_RURAL", label: "Arrendamento Rural" },
    { value: "CONTRATO_PARCERIA_AGRICOLA", label: "Parceria Agrícola" },
    { value: "CPR_CEDULA_PRODUTO_RURAL", label: "CPR" },
    { value: "PROCURACAO_AD_JUDICIA", label: "Procuração Ad Judicia" },
    { value: "PROCURACAO_EXTRAJUDICIAL", label: "Procuração Extrajudicial" },
    { value: "NOTIFICACAO_EXTRAJUDICIAL", label: "Notificação Extrajudicial" },
    { value: "ACORDO_EXTRAJUDICIAL", label: "Acordo" },
    { value: "TERMO_CONFISSAO_DIVIDA", label: "Termo de Confissão" },
    { value: "DISTRATO", label: "Distrato" },
  ],
  "Comunicações": [
    { value: "EMAIL_FORMAL", label: "E-mail Formal" },
    { value: "PROPOSTA_CLIENTE", label: "Proposta ao Cliente" },
    { value: "PROPOSTA_ACORDO", label: "Proposta de Acordo" },
    { value: "CORRESPONDENCIA_CREDOR", label: "Correspondência a Credor" },
    { value: "OFICIO", label: "Ofício" },
  ],
}

// Map generation doc types to DocumentType enum values
const DOC_TYPE_TO_DOCUMENT_TYPE: Record<string, string> = {
  PETICAO_INICIAL: "PETICAO_INICIAL",
  CONTESTACAO: "CONTESTACAO",
  REPLICA: "REPLICA",
  RECONVENCAO: "PETICAO_INICIAL",
  MEMORIAIS: "MEMORIAIS",
  ALEGACOES_FINAIS: "MEMORIAIS",
  EMBARGOS_DECLARACAO: "EMBARGOS_DECLARACAO",
  AGRAVO_INSTRUMENTO: "AGRAVO_INSTRUMENTO",
  AGRAVO_INTERNO: "AGRAVO_INSTRUMENTO",
  APELACAO: "APELACAO",
  RECURSO_ESPECIAL: "RECURSO_ESPECIAL",
  RECURSO_EXTRAORDINARIO: "RECURSO_EXTRAORDINARIO",
  CONTRARRAZOES: "CONTRARRAZOES",
  RECURSO_ORDINARIO: "RECURSO_ESPECIAL",
  CUMPRIMENTO_SENTENCA: "PETICAO_INICIAL",
  IMPUGNACAO_CUMPRIMENTO: "CONTESTACAO",
  EMBARGOS_EXECUCAO: "CONTESTACAO",
  EXCECAO_PRE_EXECUTIVIDADE: "PETICAO_INICIAL",
  PLANO_RJ: "PLANO_RJ",
  HABILITACAO_CREDITO: "HABILITACAO_CREDITO",
  IMPUGNACAO_CREDITO: "IMPUGNACAO_CREDITO",
  RELATORIO_AJ: "RELATORIO_AJ",
  PETICAO_OBJECAO_PLANO: "PETICAO_INICIAL",
  CONVOLACAO_FALENCIA: "PETICAO_INICIAL",
  PARECER: "PARECER",
  MEMORANDO_INTERNO: "MEMORANDO",
  NOTA_TECNICA: "PARECER",
  DUE_DILIGENCE: "PARECER",
  CONTRATO_GENERICO: "CONTRATO",
  CONTRATO_ARRENDAMENTO_RURAL: "CONTRATO",
  CONTRATO_PARCERIA_AGRICOLA: "CONTRATO",
  CPR_CEDULA_PRODUTO_RURAL: "CONTRATO",
  PROCURACAO_AD_JUDICIA: "PROCURACAO",
  PROCURACAO_EXTRAJUDICIAL: "PROCURACAO",
  NOTIFICACAO_EXTRAJUDICIAL: "NOTIFICACAO",
  ACORDO_EXTRAJUDICIAL: "ACORDO",
  TERMO_CONFISSAO_DIVIDA: "ACORDO",
  DISTRATO: "CONTRATO",
  EMAIL_FORMAL: "EMAIL_SALVO",
  PROPOSTA_CLIENTE: "PROPOSTA",
  PROPOSTA_ACORDO: "PROPOSTA",
  CORRESPONDENCIA_CREDOR: "NOTIFICACAO",
  OFICIO: "NOTIFICACAO",
}

function getDocumentType(tipoDocumento: string): string {
  return DOC_TYPE_TO_DOCUMENT_TYPE[tipoDocumento] || "OUTRO"
}

function getDocTypeLabel(tipoDocumento: string): string {
  for (const types of Object.values(DOC_TYPE_GROUPS)) {
    const found = types.find((t) => t.value === tipoDocumento)
    if (found) return found.label
  }
  return tipoDocumento
}

interface ConfeccaoGenerateProps {
  caseId: string
  projectId: string
  tom: string
  destinatario: string
  incluirJurisprudencia: boolean
  modoDetalhado: boolean
  preselectedType?: string
}

export function ConfeccaoGenerate({
  caseId,
  projectId,
  tom,
  destinatario,
  incluirJurisprudencia,
  modoDetalhado,
  preselectedType,
}: ConfeccaoGenerateProps) {
  const [tipoDocumento, setTipoDocumento] = useState(preselectedType || "")
  const [titulo, setTitulo] = useState("")
  const [instrucoes, setInstrucoes] = useState("")
  const [extensao, setExtensao] = useState(modoDetalhado ? "detalhado" : "padrao")
  const [incluirDoutrina, setIncluirDoutrina] = useState(false)
  const [incluirTutela, setIncluirTutela] = useState(false)
  const [generatedContent, setGeneratedContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [forceOpus, setForceOpus] = useState(false)
  const [generationTier, setGenerationTier] = useState<ModelTier | null>(null)
  const [progress, setProgress] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reference files
  const [referenceFiles, setReferenceFiles] = useState<ExtractedFile[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Biblioteca references (Harvey Specter)
  const [bibliotecaRefs, setBibliotecaRefs] = useState<BibliotecaRefEntry[]>([])
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set())
  const [showRefSearch, setShowRefSearch] = useState(false)
  const [showSaveToLibrary, setShowSaveToLibrary] = useState(false)
  const [generatedBibliotecaRefIds, setGeneratedBibliotecaRefIds] = useState<string[]>([])

  // Auto-search biblioteca when tipoDocumento + context changes
  const smartSearchQuery = trpc.biblioteca.smartSearch.useQuery(
    {
      tipoDocumento: tipoDocumento || undefined,
      caseId: caseId && caseId !== "none" ? caseId : undefined,
      projectId: projectId && projectId !== "none" ? projectId : undefined,
      limit: 10,
    },
    {
      enabled: !!tipoDocumento,
    }
  )

  // Populate bibliotecaRefs when smart search returns
  useEffect(() => {
    if (smartSearchQuery.data && smartSearchQuery.data.length > 0) {
      const refs: BibliotecaRefEntry[] = smartSearchQuery.data.map((entry: any) => ({
        id: entry.id,
        titulo: entry.titulo,
        tipo: entry.tipo,
        area: entry.area,
        resumo: entry.resumo,
        relevancia: entry.relevancia,
        favorito: entry.favorito,
      }))
      setBibliotecaRefs(refs)
      // Select all by default
      setSelectedRefIds(new Set(refs.map((r) => r.id)))
    }
  }, [smartSearchQuery.data])

  const handleToggleRef = useCallback((id: string) => {
    setSelectedRefIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleClearRefs = useCallback(() => {
    setSelectedRefIds(new Set())
  }, [])

  const handleSearchMore = useCallback(() => {
    setShowRefSearch(true)
  }, [])

  const handleAddRefFromSearch = useCallback((entry: any) => {
    setBibliotecaRefs((prev) => {
      if (prev.find((r) => r.id === entry.id)) return prev
      return [
        ...prev,
        {
          id: entry.id,
          titulo: entry.titulo,
          tipo: entry.tipo,
          area: entry.area,
          resumo: entry.resumo,
          relevancia: entry.relevancia,
          favorito: entry.favorito,
        },
      ]
    })
    setSelectedRefIds((prev) => new Set([...prev, entry.id]))
  }, [])

  // UI state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [showRefsSection, setShowRefsSection] = useState(true)
  const [copied, setCopied] = useState(false)

  // Save document mutation
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const createDocumentMutation = trpc.documents.create.useMutation({
    onSuccess: () => {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  const handleSave = useCallback(async () => {
    if (!generatedContent || !tipoDocumento) return
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      // Create HTML file blob and upload
      const docTitle = titulo || getDocTypeLabel(tipoDocumento)
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle}</title></head><body>${generatedContent}</body></html>`
      const blob = new Blob([htmlContent], { type: "text/html" })
      const file = new File([blob], `${docTitle.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.html`, {
        type: "text/html",
      })

      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "documentos/gerados-ia")

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) throw new Error("Erro ao fazer upload do arquivo")

      const { url } = await uploadRes.json()

      // Create document record
      await createDocumentMutation.mutateAsync({
        titulo: docTitle,
        tipo: getDocumentType(tipoDocumento),
        arquivo_url: url,
        case_id: caseId && caseId !== "none" ? caseId : null,
        project_id: projectId && projectId !== "none" ? projectId : null,
        gerado_por_ia: true,
        tags: ["gerado-ia", tipoDocumento.toLowerCase().replace(/_/g, "-")],
      })
    } catch (err: any) {
      setError(err.message || "Erro ao salvar documento")
    } finally {
      setIsSaving(false)
    }
  }, [generatedContent, tipoDocumento, titulo, caseId, projectId, createDocumentMutation])

  const handleDownloadPDF = useCallback(() => {
    if (!generatedContent) return

    const docTitle = titulo || getDocTypeLabel(tipoDocumento)

    // Open a styled print window for PDF generation
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      setError("Popup bloqueado. Permita popups para gerar o PDF.")
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          @page { margin: 2cm; size: A4; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            max-width: 100%;
            padding: 0;
            margin: 0;
          }
          h1 { font-size: 16pt; text-align: center; margin-bottom: 1em; }
          h2 { font-size: 14pt; margin-top: 1.5em; }
          h3 { font-size: 13pt; margin-top: 1em; }
          p { text-align: justify; margin-bottom: 0.5em; text-indent: 2em; }
          ul, ol { margin-left: 2em; }
          blockquote { margin: 1em 2em; padding-left: 1em; border-left: 2px solid #666; font-style: italic; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; font-size: 11pt; }
          th { background: #f0f0f0; font-weight: bold; }
          .header-banner { background: #FFC107; color: #000; padding: 4px 8px; font-size: 9pt; text-align: center; margin-bottom: 1em; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="header-banner no-print">Clique em Ctrl+P ou Cmd+P para salvar como PDF</div>
        ${generatedContent}
      </body>
      </html>
    `)
    printWindow.document.close()
    // Trigger print after content loads
    printWindow.onload = () => printWindow.print()
  }, [generatedContent, tipoDocumento, titulo])

  const handleCopyText = useCallback(async () => {
    if (!generatedContent) return
    try {
      // Strip HTML tags for plain text copy
      const tmp = document.createElement("div")
      tmp.innerHTML = generatedContent
      const plainText = tmp.textContent || tmp.innerText || ""
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Falha ao copiar texto.")
    }
  }, [generatedContent])

  // Derive current model display from selected type + forceOpus
  const currentModelDisplay = useMemo(() => {
    if (!tipoDocumento) return null
    const display = getModelDisplayForDocType(tipoDocumento)
    if (forceOpus) {
      return { ...MODEL_DISPLAY.premium, tier: "premium" as ModelTier }
    }
    return display
  }, [tipoDocumento, forceOpus])

  const currentCostEstimate = useMemo(() => {
    if (!currentModelDisplay) return null
    return COST_ESTIMATES[currentModelDisplay.tier]
  }, [currentModelDisplay])

  const handleFilesUpload = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(isFileSupported)
    if (validFiles.length === 0) {
      setError("Formatos suportados: PDF, DOCX, TXT")
      return
    }

    setIsExtracting(true)
    setError("")

    try {
      const extracted = await Promise.all(validFiles.map(extractTextFromFile))
      setReferenceFiles((prev) => [...prev, ...extracted])
    } catch (err: any) {
      setError(err.message || "Erro ao extrair texto dos arquivos")
    } finally {
      setIsExtracting(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFilesUpload(e.dataTransfer.files)
    },
    [handleFilesUpload]
  )

  const removeFile = useCallback((index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateFileLabel = useCallback((index: number, label: string) => {
    setReferenceFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, label } : f))
    )
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!tipoDocumento) return
    setIsGenerating(true)
    setError("")
    setGeneratedContent("")
    setGenerationTier(null)
    setProgress(0)
    setGeneratedBibliotecaRefIds([])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoDocumento,
          caseId: caseId && caseId !== "none" ? caseId : undefined,
          projectId: projectId && projectId !== "none" ? projectId : undefined,
          tom,
          extensao,
          destinatario,
          instrucoesUsuario: instrucoes,
          incluirJurisprudencia,
          incluirDoutrina,
          incluirTutela,
          forceOpus,
          referenceDocs: referenceFiles.map((f) => ({
            filename: f.filename,
            label: f.label,
            text: f.text,
          })),
          bibliotecaEntryIds: Array.from(selectedRefIds),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let errMsg = "Erro ao gerar documento"
        try {
          const errBody = await res.json()
          if (errBody?.error) errMsg = errBody.error
        } catch {
          // response may not be JSON; use status text
          errMsg = `Erro ao gerar documento (${res.status})`
        }
        throw new Error(errMsg)
      }

      // Read model tier from response header
      const tier = res.headers.get("X-AI-Tier") as ModelTier | null
      if (tier) setGenerationTier(tier)

      // Read biblioteca refs from response header
      const bibRefsHeader = res.headers.get("X-Biblioteca-Refs")
      if (bibRefsHeader) {
        try {
          const refIds = JSON.parse(bibRefsHeader)
          setGeneratedBibliotecaRefIds(refIds)
        } catch {}
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")

      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setGeneratedContent(accumulated)
        // Estimate progress based on accumulated chars
        const estimatedTotal =
          extensao === "conciso" ? 3000 : extensao === "padrao" ? 8000 : extensao === "detalhado" ? 15000 : 25000
        setProgress(Math.min(95, Math.round((accumulated.length / estimatedTotal) * 100)))
      }

      setProgress(100)
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Geração cancelada pelo usuário.")
      } else {
        setError(err.message || "Erro ao gerar documento")
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [tipoDocumento, caseId, projectId, tom, extensao, destinatario, instrucoes, incluirJurisprudencia, incluirDoutrina, incluirTutela, forceOpus, referenceFiles, selectedRefIds])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const handleReviewWithAI = useCallback(async () => {
    if (!generatedContent) return
    setIsGenerating(true)
    setError("")

    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContent: generatedContent,
          reviewType: "completa",
          caseId: caseId && caseId !== "none" ? caseId : undefined,
        }),
      })

      if (!res.ok) throw new Error("Erro ao revisar")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")

      const decoder = new TextDecoder()
      let reviewText = "\n\n---\n\n## REVISÃO IA\n\n"

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        reviewText += chunk
        setGeneratedContent(generatedContent + reviewText)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [generatedContent, caseId])

  // Determine save-to-library tipo based on document type
  const saveToLibraryTipo = useMemo(() => {
    if (!tipoDocumento) return "MODELO_PECA"
    if (tipoDocumento.startsWith("PARECER") || tipoDocumento === "MEMORANDO_INTERNO" || tipoDocumento === "NOTA_TECNICA") {
      return "PARECER_INTERNO"
    }
    if (tipoDocumento.startsWith("CONTRATO") || tipoDocumento === "CPR_CEDULA_PRODUTO_RURAL" || tipoDocumento === "DISTRATO") {
      return "CONTRATO_MODELO"
    }
    return "MODELO_PECA"
  }, [tipoDocumento])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable main area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* ========== FORM SECTION ========== */}
        {!generatedContent && !isGenerating && (
          <div className="p-6 space-y-5">
            {/* Row 1: Type select + model badge */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Documento *</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecionar tipo de documento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOC_TYPE_GROUPS).map(([group, types]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {types.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentModelDisplay && (
                  <Badge variant="outline" className={`text-xs shrink-0 ${currentModelDisplay.badgeClass}`}>
                    {currentModelDisplay.tier === "premium" && <Crown className="size-3 mr-1 text-[#C9A961]" />}
                    {MODEL_DISPLAY[currentModelDisplay.tier].name}
                    {forceOpus && currentModelDisplay.tier === "premium" && " (manual)"}
                  </Badge>
                )}
                {currentCostEstimate && (
                  <span className="text-[10px] text-[#666666] shrink-0">
                    ~{currentCostEstimate}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Title */}
            <div className="space-y-1.5">
              <Label className="text-sm">Título (opcional)</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título do documento"
                className="h-10"
              />
            </div>

            {/* Row 3: Instructions (min 120px) */}
            <div className="space-y-1.5">
              <Label className="text-sm">Instrucoes para a IA</Label>
              <Textarea
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                placeholder="Descreva o que deseja, contexto adicional, fatos relevantes, tese a sustentar..."
                className="min-h-[120px] resize-y"
                rows={6}
              />
            </div>

            {/* Row 4: Extension + Destinatário + switches (compact row) */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1 w-[180px]">
                <Label className="text-xs">Extensão</Label>
                <Select value={extensao} onValueChange={setExtensao}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conciso">Conciso (1-3 pg)</SelectItem>
                    <SelectItem value="padrao">Padrão (5-10 pg)</SelectItem>
                    <SelectItem value="detalhado">Detalhado (10-15 pg)</SelectItem>
                    <SelectItem value="exaustivo">Exaustivo (15+ pg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-[160px]">
                <Label className="text-xs">Destinatario</Label>
                <Select value={destinatario} onValueChange={() => {}}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Juiz">Juiz</SelectItem>
                    <SelectItem value="Tribunal">Tribunal</SelectItem>
                    <SelectItem value="Credor">Credor</SelectItem>
                    <SelectItem value="Cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={incluirDoutrina} onCheckedChange={setIncluirDoutrina} />
                <Label className="text-xs">Doutrina</Label>
              </div>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={incluirTutela} onCheckedChange={setIncluirTutela} />
                <Label className="text-xs">Tutela</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={forceOpus} onCheckedChange={setForceOpus} />
                      <Label className="text-xs flex items-center gap-1">
                        <Crown className="size-3 text-[#C9A961]" />
                        Opus
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      Usa Opus 4.6 com extended thinking mesmo para tipos simples. Maior qualidade, custo mais alto.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* >>>>>> GENERATE BUTTON <<<<<< */}
            {error && (
              <div className="text-sm text-[#DC3545] bg-[#DC3545]/10 p-3 rounded">{error}</div>
            )}

            <div className="pt-1">
              <Button
                className="w-full h-14 text-base font-semibold bg-[#C9A961] hover:bg-[#C9A961]/90 text-[#2A2A2A] shadow-md"
                onClick={handleGenerate}
                disabled={!tipoDocumento}
              >
                <Sparkles className="size-5 mr-2" />
                Gerar com Harvey Specter
                {currentModelDisplay && (
                  <span className="ml-2 text-sm opacity-70">
                    ({MODEL_DISPLAY[currentModelDisplay.tier].name})
                  </span>
                )}
              </Button>
            </div>

            {/* Biblioteca References (collapsible) */}
            <div>
              <button
                onClick={() => setShowRefsSection(!showRefsSection)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-[#2A2A2A] transition-colors mb-2"
              >
                {showRefsSection ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                <BookOpen className="size-3.5" />
                Referências da Biblioteca
                {bibliotecaRefs.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">
                    {bibliotecaRefs.length}
                  </Badge>
                )}
              </button>
              {showRefsSection && (
                <div className="space-y-3">
                  {bibliotecaRefs.length > 0 && (
                    <BibliotecaReferences
                      entries={bibliotecaRefs}
                      selectedIds={selectedRefIds}
                      onToggle={handleToggleRef}
                      onSearchMore={handleSearchMore}
                      onClear={handleClearRefs}
                    />
                  )}
                  {tipoDocumento && bibliotecaRefs.length === 0 && !smartSearchQuery.isLoading && (
                    <div className="border rounded-lg bg-[#F7F3F1] p-3 flex items-center gap-2">
                      <BookOpen className="size-4 text-[#666666]/50" />
                      <span className="text-xs text-[#666666]">
                        Nenhuma referencia encontrada na Biblioteca.
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] ml-auto"
                        onClick={handleSearchMore}
                      >
                        Buscar manualmente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced: Reference Files Upload (collapsible) */}
            <div>
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-[#2A2A2A] transition-colors mb-2"
              >
                {showAdvancedOptions ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                <Upload className="size-3.5" />
                Documentos de referencia (opcional)
                {referenceFiles.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">
                    {referenceFiles.length}
                  </Badge>
                )}
              </button>
              {showAdvancedOptions && (
                <div className="space-y-2">
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? "border-[#17A2B8] bg-[#17A2B8]/5"
                        : "border-[#E0E0E0] hover:border-[#C9A961]/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isExtracting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-5 animate-spin text-[#17A2B8]" />
                        <span className="text-sm text-[#666666]">Extraindo texto...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="size-5 text-[#666666]/50 mx-auto" />
                        <p className="text-xs text-[#666666] mt-1.5">
                          Arraste arquivos ou clique para selecionar
                        </p>
                        <p className="text-[10px] text-[#666666] mt-0.5">
                          PDF, DOCX, TXT — Texto extraido como contexto para a IA
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files) handleFilesUpload(e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </div>

                  {referenceFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {referenceFiles.map((file, index) => (
                        <div
                          key={`${file.filename}-${index}`}
                          className="flex items-center gap-2 p-2 rounded border bg-[#F7F3F1]"
                        >
                          <FileText className="size-4 text-[#17A2B8] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.filename}</p>
                            <p className="text-[10px] text-[#666666]">
                              {file.chars.toLocaleString("pt-BR")} caracteres
                            </p>
                          </div>
                          <Select
                            value={file.label || "__none__"}
                            onValueChange={(v) => updateFileLabel(index, v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="h-7 w-[140px] text-[10px]">
                              <SelectValue placeholder="Rotulo..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem rotulo</SelectItem>
                              {FILE_LABELS.map((label) => (
                                <SelectItem key={label} value={label}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => removeFile(index)}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== GENERATING STATE ========== */}
        {isGenerating && !generatedContent && (
          <div className="p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="w-full max-w-md space-y-4">
              <div className="text-center">
                <Loader2 className="size-10 animate-spin text-[#C9A961] mx-auto mb-3" />
                <p className="text-base font-medium text-[#2A2A2A]">
                  Harvey Specter esta trabalhando...
                </p>
                <p className="text-sm text-[#666666] mt-1">
                  {getDocTypeLabel(tipoDocumento)}
                </p>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666666]">{progress}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-[#DC3545] border-[#DC3545]/30 hover:bg-[#DC3545]/10"
                  onClick={handleCancel}
                >
                  <StopCircle className="size-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========== GENERATED CONTENT ========== */}
        {(generatedContent || (isGenerating && generatedContent)) && (
          <>
            {/* Banner */}
            <div className="shrink-0 bg-[#FFC107]/20 border-b border-[#FFC107] px-6 py-1.5 text-xs text-[#2A2A2A] font-medium">
              RASCUNHO GERADO POR IA — REVISAO HUMANA OBRIGATORIA ANTES DO PROTOCOLO
            </div>

            {/* Badges bar */}
            <div className="shrink-0 flex items-center gap-2 px-6 py-2 border-b bg-[#F7F3F1]">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="size-3 mr-1 text-[#17A2B8]" />
                Gerado por IA
              </Badge>
              {generationTier && (
                <Badge variant="outline" className={`text-xs ${MODEL_DISPLAY[generationTier].badgeClass}`}>
                  {generationTier === "premium" && <Crown className="size-3 mr-1 text-[#C9A961]" />}
                  {MODEL_DISPLAY[generationTier].name}
                </Badge>
              )}
              {generatedBibliotecaRefIds.length > 0 && (
                <Badge variant="outline" className="text-xs text-[#17A2B8]">
                  <BookOpen className="size-3 mr-1" />
                  {generatedBibliotecaRefIds.length} ref. Biblioteca
                </Badge>
              )}
              {isGenerating && (
                <div className="flex items-center gap-2 ml-auto">
                  <Loader2 className="size-3.5 animate-spin text-[#C9A961]" />
                  <span className="text-xs text-[#666666]">Gerando... {progress}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-[#DC3545]"
                    onClick={handleCancel}
                  >
                    <StopCircle className="size-3 mr-1" />
                    Parar
                  </Button>
                </div>
              )}
            </div>

            {/* Editor area */}
            <div className="px-6 py-6">
              <div className="min-h-[500px] prose prose-sm max-w-none">
                <TiptapEditor
                  content={generatedContent}
                  onChange={setGeneratedContent}
                />
              </div>

              {/* Save to Library suggestion */}
              {generatedContent && !isGenerating && (
                <div className="mt-6 border rounded-lg bg-[#F7F3F1] p-3 flex items-center gap-3">
                  <BookOpen className="size-5 text-[#17A2B8] shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Salvar na Biblioteca?</p>
                    <p className="text-[10px] text-[#666666]">
                      Salve este documento como referencia para uso futuro pelo Harvey Specter.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => setShowSaveToLibrary(true)}
                  >
                    <BookOpen className="size-3 mr-1" />
                    Salvar na Biblioteca
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========== STICKY ACTION BAR (shown when content exists) ========== */}
      {generatedContent && !isGenerating && (
        <div className="shrink-0 border-t bg-white px-4 py-2.5 flex items-center gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <Button
            size="sm"
            className="text-xs bg-[#C9A961] hover:bg-[#C9A961]/90 text-[#2A2A2A]"
            onClick={handleDownloadPDF}
          >
            <Download className="size-3.5 mr-1.5" />
            Gerar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`text-xs ${saveSuccess ? "border-green-500 text-green-600" : ""}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Salvando...</>
            ) : saveSuccess ? (
              <><Check className="size-3.5 mr-1.5" />Salvo!</>
            ) : (
              <><Save className="size-3.5 mr-1.5" />Salvar como Documento</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleReviewWithAI}
          >
            <Sparkles className="size-3.5 mr-1.5 text-[#17A2B8]" />
            Revisar com IA
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`text-xs ${copied ? "border-green-500 text-green-600" : ""}`}
            onClick={handleCopyText}
          >
            {copied ? (
              <><Check className="size-3.5 mr-1.5" />Copiado!</>
            ) : (
              <><Copy className="size-3.5 mr-1.5" />Copiar Texto</>
            )}
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setGeneratedContent("")
              setGenerationTier(null)
              setProgress(0)
              setGeneratedBibliotecaRefIds([])
              setSaveSuccess(false)
            }}
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Nova Geracao
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowSaveToLibrary(true)}
          >
            <BookOpen className="size-3.5 mr-1.5" />
            Salvar na Biblioteca
          </Button>
        </div>
      )}

      {/* ========== MODALS ========== */}
      <BibliotecaSearchModal
        open={showRefSearch}
        onOpenChange={setShowRefSearch}
        onSelectEntry={handleAddRefFromSearch}
      />

      <BibliotecaForm
        open={showSaveToLibrary}
        onOpenChange={setShowSaveToLibrary}
        prefill={{
          tipo: saveToLibraryTipo,
          titulo: titulo || tipoDocumento?.replace(/_/g, " ") || "",
          conteudo: generatedContent,
        }}
      />
    </div>
  )
}
