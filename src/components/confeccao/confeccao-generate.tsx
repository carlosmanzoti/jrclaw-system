"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Loader2, Sparkles, RotateCcw, Save, Download, Crown } from "lucide-react"
import { TiptapEditor } from "@/components/ui/tiptap-editor"
import {
  getModelDisplayForDocType,
  MODEL_DISPLAY,
  COST_ESTIMATES,
} from "@/lib/ai-model-map"
import type { ModelTier } from "@/lib/ai-model-map"

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

  const handleGenerate = useCallback(async () => {
    if (!tipoDocumento) return
    setIsGenerating(true)
    setError("")
    setGeneratedContent("")
    setGenerationTier(null)

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
        }),
      })

      if (!res.ok) throw new Error("Erro ao gerar documento")

      // Read model tier from response header
      const tier = res.headers.get("X-AI-Tier") as ModelTier | null
      if (tier) setGenerationTier(tier)

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
      }
    } catch (err: any) {
      setError(err.message || "Erro ao gerar documento")
    } finally {
      setIsGenerating(false)
    }
  }, [tipoDocumento, caseId, projectId, tom, extensao, destinatario, instrucoes, incluirJurisprudencia, incluirDoutrina, incluirTutela, forceOpus])

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
                    {currentModelDisplay.tier === "premium" && <Crown className="size-3 mr-1" />}
                    {MODEL_DISPLAY[currentModelDisplay.tier].name}
                    {forceOpus && currentModelDisplay.tier === "premium" && " (manual)"}
                  </Badge>
                  {currentCostEstimate && (
                    <span className="text-[10px] text-muted-foreground">
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
                        <Crown className="size-3" />
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
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>
            )}

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!tipoDocumento || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Gerando documento...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Gerar Documento
                </>
              )}
            </Button>
          </div>
        </ScrollArea>
      )}

      {/* Editor */}
      {generatedContent && (
        <div className="flex flex-col flex-1">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="size-3 mr-1" />
              Gerado por IA
            </Badge>
            {generationTier && (
              <Badge variant="outline" className={`text-xs ${MODEL_DISPLAY[generationTier].badgeClass}`}>
                {generationTier === "premium" && <Crown className="size-3 mr-1" />}
                {MODEL_DISPLAY[generationTier].name}
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
              <Sparkles className="size-3 mr-1" />
              Revisar com IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setGeneratedContent("")
                setGenerationTier(null)
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
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-700">
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
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
