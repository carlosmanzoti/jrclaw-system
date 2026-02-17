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

      if (!res.ok) throw new Error("Erro ao gerar documento")

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
    <div className="flex flex-col h-full">
      {/* Config bar */}
      {!generatedContent && (
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de Documento *</Label>
              <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo..." />
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

              {/* Model badge */}
              {currentModelDisplay && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`text-xs ${currentModelDisplay.badgeClass}`}>
                    {currentModelDisplay.tier === "premium" && <Crown className="size-3 mr-1 text-[#C9A961]" />}
                    {MODEL_DISPLAY[currentModelDisplay.tier].name}
                    {forceOpus && currentModelDisplay.tier === "premium" && " (manual)"}
                  </Badge>
                  {currentCostEstimate && (
                    <span className="text-[10px] text-[#666666]">
                      Custo estimado: {currentCostEstimate}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Título (opcional)</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título do documento"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Instruções para a IA</Label>
              <Textarea
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                placeholder="Descreva o que deseja, contexto adicional, fatos relevantes, tese a sustentar..."
                rows={5}
              />
            </div>

            {/* Biblioteca References Card (Harvey Specter) */}
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
                  Nenhuma referência encontrada na Biblioteca.
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

            {/* Reference Files Upload */}
            <div className="space-y-2">
              <Label className="text-sm">Documentos de Referência (opcional)</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
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
                    <Upload className="size-6 text-[#666666]/50 mx-auto" />
                    <p className="text-sm text-[#666666] mt-2">
                      Arraste arquivos ou clique para selecionar
                    </p>
                    <p className="text-[10px] text-[#666666] mt-1">
                      PDF, DOCX, TXT — O texto será extraído e enviado como contexto para a IA
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

              {/* Uploaded files list */}
              {referenceFiles.length > 0 && (
                <div className="space-y-2">
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
                        <SelectTrigger className="h-7 w-[160px] text-[10px]">
                          <SelectValue placeholder="Rótulo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem rótulo</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Extensão</Label>
                <Select value={extensao} onValueChange={setExtensao}>
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="space-y-1.5">
                <Label className="text-xs">Destinatário</Label>
                <Select value={destinatario} onValueChange={() => {}}>
                  <SelectTrigger className="h-8 text-xs">
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
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={incluirDoutrina} onCheckedChange={setIncluirDoutrina} />
                <Label className="text-xs">Incluir doutrina</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={incluirTutela} onCheckedChange={setIncluirTutela} />
                <Label className="text-xs">Incluir tutela de urgência</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch checked={forceOpus} onCheckedChange={setForceOpus} />
                      <Label className="text-xs flex items-center gap-1">
                        <Crown className="size-3 text-[#C9A961]" />
                        Forçar modelo premium
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

            {error && (
              <div className="text-sm text-[#DC3545] bg-[#DC3545]/10 p-3 rounded">{error}</div>
            )}

            {/* Generate button area */}
            <div className="space-y-2 pt-2">
              {isGenerating ? (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-[#17A2B8]" />
                      <span className="text-sm text-[#666666]">
                        Gerando documento... {progress}%
                      </span>
                    </div>
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
              ) : (
                <Button
                  className="w-full h-12 text-base bg-[#17A2B8] hover:bg-[#17A2B8]/90"
                  onClick={handleGenerate}
                  disabled={!tipoDocumento}
                >
                  <Sparkles className="size-5 mr-2" />
                  Gerar Documento
                  {currentModelDisplay && (
                    <span className="ml-2 text-xs opacity-80">
                      ({MODEL_DISPLAY[currentModelDisplay.tier].name})
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Editor */}
      {generatedContent && (
        <div className="flex flex-col flex-1">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-[#F7F3F1]">
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
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleReviewWithAI}
              disabled={isGenerating}
            >
              <Sparkles className="size-3 mr-1 text-[#17A2B8]" />
              Revisar com Harvey Specter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setGeneratedContent("")
                setGenerationTier(null)
                setProgress(0)
                setGeneratedBibliotecaRefIds([])
              }}
            >
              <RotateCcw className="size-3 mr-1" />
              Nova Geração
            </Button>
            <Button variant="outline" size="sm" className="text-xs" disabled>
              <Save className="size-3 mr-1" />
              Salvar
            </Button>
            <Button variant="outline" size="sm" className="text-xs" disabled>
              <Download className="size-3 mr-1" />
              PDF
            </Button>
          </div>

          {/* Banner */}
          <div className="bg-[#FFC107]/20 border-b border-[#FFC107] px-4 py-1.5 text-xs text-[#2A2A2A]">
            RASCUNHO GERADO POR IA — REVISÃO HUMANA OBRIGATÓRIA ANTES DO PROTOCOLO
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="max-w-3xl mx-auto prose prose-sm">
              <TiptapEditor
                content={generatedContent}
                onChange={setGeneratedContent}
              />
            </div>

            {/* Save to Library suggestion */}
            {generatedContent && !isGenerating && (
              <div className="max-w-3xl mx-auto mt-6 border rounded-lg bg-[#F7F3F1] p-3 flex items-center gap-3">
                <BookOpen className="size-5 text-[#17A2B8] shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Salvar na Biblioteca?</p>
                  <p className="text-[10px] text-[#666666]">
                    Salve este documento como referência para uso futuro pelo Harvey Specter.
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
          </ScrollArea>
        </div>
      )}

      {/* Search modal for adding more Biblioteca refs */}
      <BibliotecaSearchModal
        open={showRefSearch}
        onOpenChange={setShowRefSearch}
        onSelectEntry={handleAddRefFromSearch}
      />

      {/* Save to Library form */}
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
