"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Calculator, Calendar, Clock, Plus, Trash2,
  CheckCircle2, AlertTriangle, Sparkles, Loader2, Save,
  ChevronRight, Scale, Users, Info, Shield,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TRIGGER_EVENT_LABELS, TRIGGER_EVENTS,
  SPECIAL_RULE_LABELS, SPECIAL_RULES,
  COUNTING_MODE_LABELS,
} from "@/lib/deadline-constants"
import { ESTADOS_BRASIL } from "@/lib/constants"
import { TRIBUNAIS_BRASIL, getTribunalByCodigo } from "@/lib/tribunais-brasil"
import type { TribunalTipo } from "@/lib/tribunais-brasil"

// ─── Types ──────────────────────────────────────────────────────────

interface Parte {
  id: string
  polo: string
  tipo_parte: string
  prazo_dobro: boolean
}

interface LogStep {
  etapa: number
  descricao: string
  resultado: string
}

interface SimulationResult {
  data_intimacao: string
  data_inicio_contagem: string
  data_fim_prazo: string
  prazo_original: number
  prazo_efetivo: number
  contagem_tipo: string
  dias_corridos: number
  dobra_aplicada: boolean
  dobra_motivo: string
  feriados_no_periodo: number
  suspensoes_no_periodo: number
  log_calculo: LogStep[]
  sugestao_ia: string
}

// ─── Constants ──────────────────────────────────────────────────────

const POLO_OPTIONS = [
  { value: "AUTOR", label: "Autor" },
  { value: "REU", label: "Réu" },
  { value: "TERCEIRO", label: "Terceiro Interessado" },
]

const TIPO_PARTE_OPTIONS = [
  { value: "PESSOA_FISICA", label: "Pessoa Física" },
  { value: "PESSOA_JURIDICA", label: "Pessoa Jurídica" },
  { value: "FAZENDA_FEDERAL", label: "Fazenda Pública Federal" },
  { value: "FAZENDA_ESTADUAL", label: "Fazenda Pública Estadual" },
  { value: "FAZENDA_MUNICIPAL", label: "Fazenda Pública Municipal" },
  { value: "AUTARQUIA", label: "Autarquia" },
  { value: "FUNDACAO_PUBLICA", label: "Fundação Pública" },
  { value: "MINISTERIO_PUBLICO", label: "Ministério Público" },
  { value: "DEFENSORIA_PUBLICA", label: "Defensoria Pública" },
  { value: "EMPRESA_PUBLICA", label: "Empresa Pública" },
  { value: "SOCIEDADE_ECONOMIA_MISTA", label: "Sociedade de Economia Mista" },
]

const TRIBUNAL_TIPO_FILTERS: { value: string; label: string }[] = [
  { value: "TODOS", label: "Todos os tribunais" },
  { value: "SUPERIOR", label: "Superiores (STF, STJ, TST, TSE, STM)" },
  { value: "TJ", label: "Tribunais de Justiça" },
  { value: "TRF", label: "Tribunais Regionais Federais" },
  { value: "TRT", label: "Tribunais Regionais do Trabalho" },
  { value: "TRE", label: "Tribunais Regionais Eleitorais" },
  { value: "TJM", label: "Tribunais de Justiça Militar" },
]

function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getWeekdayBR(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("pt-BR", { weekday: "long" })
}

// ─── Component ──────────────────────────────────────────────────────

export function CalculadoraPrazos() {
  // Form state
  const [tipoPrazo, setTipoPrazo] = useState("")
  const [catalogItemId, setCatalogItemId] = useState("")
  const [dias, setDias] = useState<number>(15)
  const [contagemTipo, setContagemTipo] = useState("DIAS_UTEIS")
  const [artigoLegal, setArtigoLegal] = useState("")
  const [tribunalFilter, setTribunalFilter] = useState("TODOS")
  const [tribunalCodigo, setTribunalCodigo] = useState("")
  const [uf, setUf] = useState("")
  const [dataIntimacao, setDataIntimacao] = useState("")
  const [metodoIntimacao, setMetodoIntimacao] = useState("")
  const [partes, setPartes] = useState<Parte[]>([])
  const [regrasEspeciais, setRegrasEspeciais] = useState<string[]>([])

  // Result state
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  // Fetch catalog items for the dropdown
  const catalogQuery = trpc.deadlines.catalog.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })
  const catalogItems = catalogQuery.data || []

  // Filter tribunals by type
  const filteredTribunals =
    tribunalFilter === "TODOS"
      ? TRIBUNAIS_BRASIL
      : TRIBUNAIS_BRASIL.filter((t) => t.tipo === tribunalFilter)

  // When catalog item changes, auto-fill fields
  const handleCatalogItemChange = useCallback(
    (itemId: string) => {
      setCatalogItemId(itemId)
      if (!itemId) return
      const item = catalogItems.find((c: { id: string }) => c.id === itemId)
      if (item) {
        setTipoPrazo(item.nome || "")
        setDias(item.dias || 15)
        setContagemTipo(item.contagem_tipo || "DIAS_UTEIS")
        setArtigoLegal(item.artigo || "")
      }
    },
    [catalogItems],
  )

  // When tribunal changes, auto-set UF
  const handleTribunalChange = useCallback((codigo: string) => {
    setTribunalCodigo(codigo)
    const tribunal = getTribunalByCodigo(codigo)
    if (tribunal?.uf) {
      setUf(tribunal.uf)
    }
  }, [])

  // Party management
  const addParte = useCallback(() => {
    setPartes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), polo: "REU", tipo_parte: "PESSOA_FISICA", prazo_dobro: false },
    ])
  }, [])

  const removeParte = useCallback((id: string) => {
    setPartes((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const updateParte = useCallback((id: string, field: keyof Parte, value: string | boolean) => {
    setPartes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    )
  }, [])

  // Toggle special rules
  const toggleRegra = useCallback((regra: string) => {
    setRegrasEspeciais((prev) =>
      prev.includes(regra) ? prev.filter((r) => r !== regra) : [...prev, regra],
    )
  }, [])

  // Calculate
  const handleCalcular = useCallback(async () => {
    if (!dataIntimacao || !metodoIntimacao || !dias) {
      setError("Preencha a data da intimação, método e número de dias.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)
    setSaved(false)

    try {
      const response = await fetch("/api/ai/prazos/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_prazo: tipoPrazo,
          dias,
          contagem_tipo: contagemTipo,
          data_intimacao: dataIntimacao,
          metodo_intimacao: metodoIntimacao,
          tribunal_codigo: tribunalCodigo,
          uf,
          artigo_legal: artigoLegal,
          partes: partes.map((p) => ({
            polo: p.polo,
            tipo_parte: p.tipo_parte,
            prazo_dobro: p.prazo_dobro,
          })),
          regras_especiais: regrasEspeciais,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro no cálculo")
      }

      const data = await response.json()
      setResult(data)
    } catch {
      setError("Erro ao calcular prazo. Verifique os dados e tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [
    tipoPrazo, dias, contagemTipo, dataIntimacao, metodoIntimacao,
    tribunalCodigo, uf, artigoLegal, partes, regrasEspeciais,
  ])

  // Save as deadline
  const createDeadline = trpc.deadlines.create.useMutation()

  const handleSalvar = useCallback(async () => {
    if (!result) return
    try {
      await createDeadline.mutateAsync({
        titulo: tipoPrazo || "Prazo calculado",
        tipo: "FATAL",
        categoria: "PARTE",
        contagem_tipo: contagemTipo,
        prazo_dias: result.prazo_efetivo,
        data_evento_gatilho: new Date(result.data_intimacao),
        data_inicio_contagem: new Date(result.data_inicio_contagem),
        data_fim_prazo: new Date(result.data_fim_prazo),
        metodo_intimacao: metodoIntimacao,
        tribunal_codigo: tribunalCodigo || undefined,
        uf: uf || undefined,
        prioridade: "ALTA",
        dobra_aplicada: result.dobra_aplicada,
        dobra_motivo: result.dobra_motivo || undefined,
        dobra_fator: result.dobra_aplicada ? 2 : undefined,
        observacoes: [
          `Calculado via Calculadora de Prazos.`,
          artigoLegal ? `Artigo: ${artigoLegal}.` : "",
          result.dobra_aplicada ? `Dobra: ${result.dobra_motivo}.` : "",
          regrasEspeciais.length > 0 ? `Regras: ${regrasEspeciais.join(", ")}.` : "",
        ].filter(Boolean).join(" "),
        log_calculo: result.log_calculo as unknown as Record<string, unknown>,
      })
      setSaved(true)
    } catch {
      setError("Erro ao salvar prazo.")
    }
  }, [
    result, tipoPrazo, contagemTipo, metodoIntimacao,
    tribunalCodigo, uf, artigoLegal, regrasEspeciais, createDeadline,
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/prazos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculadora de Prazos Processuais</h1>
          <p className="text-sm text-muted-foreground">
            Cálculo completo com regras CPC/2015, feriados, suspensões e análise por IA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: Form ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Tipo de Prazo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#C9A961]" />
                Tipo de Prazo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selecionar do Catálogo (opcional)</Label>
                <Select value={catalogItemId} onValueChange={handleCatalogItemChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Buscar no catálogo de prazos..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogItems.map((item: { id: string; nome: string; artigo?: string | null; dias?: number | null }) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome} {item.artigo ? `(${item.artigo})` : ""} — {item.dias} dias
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Descrição do prazo</Label>
                  <Input
                    value={tipoPrazo}
                    onChange={(e) => setTipoPrazo(e.target.value)}
                    placeholder="Ex: Apelação, Contestação..."
                  />
                </div>
                <div>
                  <Label>Artigo legal</Label>
                  <Input
                    value={artigoLegal}
                    onChange={(e) => setArtigoLegal(e.target.value)}
                    placeholder="Ex: Art. 1.009 CPC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Número de dias</Label>
                  <Input
                    type="number"
                    min={1}
                    value={dias}
                    onChange={(e) => setDias(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Tipo de contagem</Label>
                  <Select value={contagemTipo} onValueChange={setContagemTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIAS_UTEIS">{COUNTING_MODE_LABELS.DIAS_UTEIS}</SelectItem>
                      <SelectItem value="DIAS_CORRIDOS">{COUNTING_MODE_LABELS.DIAS_CORRIDOS}</SelectItem>
                      <SelectItem value="HORAS">{COUNTING_MODE_LABELS.HORAS}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tribunal e Jurisdição */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#C9A961]" />
                Tribunal e Jurisdição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Filtrar por tipo</Label>
                <Select value={tribunalFilter} onValueChange={setTribunalFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIBUNAL_TIPO_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tribunal</Label>
                <Select value={tribunalCodigo} onValueChange={handleTribunalChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tribunal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-60">
                      {filteredTribunals.map((t) => (
                        <SelectItem key={t.codigo} value={t.codigo}>
                          {t.sigla} — {t.nome}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data e Método de Intimação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#C9A961]" />
                Data e Método de Intimação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Data da intimação / evento gatilho</Label>
                <Input
                  type="date"
                  value={dataIntimacao}
                  onChange={(e) => setDataIntimacao(e.target.value)}
                />
              </div>
              <div>
                <Label>Método de intimação (CPC Art. 231)</Label>
                <Select value={metodoIntimacao} onValueChange={setMetodoIntimacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EVENTS.map((evt) => (
                      <SelectItem key={evt} value={evt}>
                        {TRIGGER_EVENT_LABELS[evt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Partes do Processo */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#C9A961]" />
                  Partes do Processo
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addParte}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <CardDescription>
                Adicione partes para aplicar regras de prazo em dobro (Fazenda, MP, Defensoria)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {partes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma parte adicionada. Clique em &quot;Adicionar&quot; para incluir.
                </p>
              ) : (
                <div className="space-y-3">
                  {partes.map((parte) => (
                    <div key={parte.id} className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-xs">Polo</Label>
                        <Select
                          value={parte.polo}
                          onValueChange={(v) => updateParte(parte.id, "polo", v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POLO_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-[2]">
                        <Label className="text-xs">Tipo de parte</Label>
                        <Select
                          value={parte.tipo_parte}
                          onValueChange={(v) => updateParte(parte.id, "tipo_parte", v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPO_PARTE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pb-1">
                        <Checkbox
                          id={`dobro-${parte.id}`}
                          checked={parte.prazo_dobro}
                          onCheckedChange={(v) => updateParte(parte.id, "prazo_dobro", !!v)}
                        />
                        <Label htmlFor={`dobro-${parte.id}`} className="text-xs whitespace-nowrap">
                          Dobro
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeParte(parte.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regras Especiais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#C9A961]" />
                Regras Especiais de Contagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {SPECIAL_RULES.map((regra) => (
                  <div key={regra} className="flex items-center gap-2">
                    <Checkbox
                      id={`regra-${regra}`}
                      checked={regrasEspeciais.includes(regra)}
                      onCheckedChange={() => toggleRegra(regra)}
                    />
                    <Label htmlFor={`regra-${regra}`} className="text-sm font-normal cursor-pointer">
                      {SPECIAL_RULE_LABELS[regra]}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Calculate Button */}
          <Button
            className="w-full bg-[#C9A961] hover:bg-[#B8954F] text-white h-12 text-base"
            onClick={handleCalcular}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5 mr-2" />
                Calcular Prazo
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* ── Right Column: Result ────────────────────────────────── */}
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <Calculator className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Preencha os dados e clique em Calcular</p>
                <p className="text-sm mt-1">
                  O resultado aparecerá aqui com o passo a passo do cálculo
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-[#C9A961]" />
                <p className="text-lg font-medium">Calculando prazo...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verificando feriados, suspensões e aplicando regras CPC/2015
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Main Result Card */}
              <Card className="border-[#C9A961]/30 border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-[#C9A961]" />
                      Resultado do Cálculo
                    </CardTitle>
                    {result.dobra_aplicada && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Prazo em Dobro
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Início da Contagem</p>
                      <p className="text-xl font-bold mt-1">{formatDateBR(result.data_inicio_contagem)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{getWeekdayBR(result.data_inicio_contagem)}</p>
                    </div>
                    <div className="p-4 bg-[#C9A961]/10 rounded-lg text-center border border-[#C9A961]/20">
                      <p className="text-xs text-[#C9A961] uppercase tracking-wider font-medium">Vencimento do Prazo</p>
                      <p className="text-xl font-bold mt-1 text-[#C9A961]">{formatDateBR(result.data_fim_prazo)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{getWeekdayBR(result.data_fim_prazo)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="font-semibold">{result.prazo_original}</p>
                      <p className="text-xs text-muted-foreground">Dias originais</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="font-semibold">{result.prazo_efetivo}</p>
                      <p className="text-xs text-muted-foreground">Dias efetivos</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="font-semibold">{result.feriados_no_periodo}</p>
                      <p className="text-xs text-muted-foreground">Feriados</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="font-semibold">{result.suspensoes_no_periodo}</p>
                      <p className="text-xs text-muted-foreground">Suspensões</p>
                    </div>
                  </div>

                  {result.dobra_aplicada && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700 flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0" />
                      {result.dobra_motivo}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step-by-step Log */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-[#C9A961]" />
                    Passo a Passo do Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {result.log_calculo.map((step) => (
                        <div key={step.etapa} className="flex gap-3 relative">
                          <div className="w-6 h-6 rounded-full bg-[#C9A961] text-white text-xs flex items-center justify-center shrink-0 z-10">
                            {step.etapa}
                          </div>
                          <div className="pb-1">
                            <p className="text-sm font-medium">{step.descricao}</p>
                            <p className="text-sm text-muted-foreground">{step.resultado}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Suggestion */}
              {result.sugestao_ia && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      Análise da IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {result.sugestao_ia}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Save Button */}
              <Button
                className="w-full"
                variant={saved ? "outline" : "default"}
                onClick={handleSalvar}
                disabled={saved || createDeadline.isPending}
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Prazo Salvo com Sucesso
                  </>
                ) : createDeadline.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar como Prazo
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
