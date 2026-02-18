"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Upload, Database, BarChart3, FileText,
  CheckCircle2, XCircle, Clock, Loader2, Sparkles,
  AlertTriangle, Search, Filter, X, Eye, Check,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  TRIBUNAIS_BRASIL, getTribunalByCodigo,
  TRIBUNAL_TIPO_OPTIONS,
} from "@/lib/tribunais-brasil"
import type { TribunalTipo } from "@/lib/tribunais-brasil"
import { ESTADOS_BRASIL } from "@/lib/constants"

// ─── Constants ──────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS = [
  { value: "PORTARIA", label: "Portaria" },
  { value: "RESOLUCAO", label: "Resolução" },
  { value: "PROVIMENTO", label: "Provimento" },
  { value: "ATO", label: "Ato Normativo" },
]

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "bg-amber-100 text-amber-700 border-amber-200" },
  PROCESSANDO: { label: "Processando", className: "bg-blue-100 text-blue-700 border-blue-200" },
  PROCESSADO: { label: "Processado", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ERRO: { label: "Erro", className: "bg-red-100 text-red-700 border-red-200" },
}

// ─── Types ──────────────────────────────────────────────────────────

interface ExtractedFeriado {
  data: string
  nome: string
  tipo: string
  suspende_expediente: boolean
  prazos_prorrogados: boolean
  fundamento_legal?: string
}

interface ExtractedSuspensao {
  tipo: string
  data_inicio: string
  data_fim: string
  nome: string
  suspende_prazos: boolean
  suspende_audiencias: boolean
  suspende_sessoes: boolean
  plantao_disponivel: boolean
  fundamento_legal?: string
}

// ─── Component ──────────────────────────────────────────────────────

export function DepositarioCalendarios() {
  const [activeTab, setActiveTab] = useState("repositorio")

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
          <h1 className="text-2xl font-bold tracking-tight">Depositário de Calendários Judiciais</h1>
          <p className="text-sm text-muted-foreground">
            Repositório de portarias, resoluções e atos — extração automática por IA
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="repositorio" className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            Repositório
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="cobertura" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Cobertura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repositorio" className="mt-4">
          <RepositorioTab />
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <UploadTab />
        </TabsContent>
        <TabsContent value="cobertura" className="mt-4">
          <CoberturaTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Repositório
// ═══════════════════════════════════════════════════════════════════

function RepositorioTab() {
  const [filterTipo, setFilterTipo] = useState("")
  const [filterUf, setFilterUf] = useState("")
  const [filterAno, setFilterAno] = useState<number>(new Date().getFullYear())
  const [filterStatus, setFilterStatus] = useState("")
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

  const repositoryQuery = trpc.deadlines.courtCalendar.repositoryList.useQuery({
    tribunal_tipo: filterTipo || undefined,
    uf: filterUf || undefined,
    ano: filterAno || undefined,
    status: filterStatus || undefined,
  })

  const repos = repositoryQuery.data || []

  const clearFilters = useCallback(() => {
    setFilterTipo("")
    setFilterUf("")
    setFilterAno(new Date().getFullYear())
    setFilterStatus("")
  }, [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <Label className="text-xs">Tipo Tribunal</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {TRIBUNAL_TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs">UF</Label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {ESTADOS_BRASIL.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs">Ano</Label>
              <Input
                type="number"
                className="h-8"
                value={filterAno}
                onChange={(e) => setFilterAno(Number(e.target.value))}
              />
            </div>
            <div className="w-32">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="PROCESSANDO">Processando</SelectItem>
                  <SelectItem value="PROCESSADO">Processado</SelectItem>
                  <SelectItem value="ERRO">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tribunal</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Feriados</TableHead>
                <TableHead className="text-center">Suspensões</TableHead>
                <TableHead>Upload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado. Use a aba &quot;Upload&quot; para adicionar portarias.
                  </TableCell>
                </TableRow>
              ) : (
                repos.map((repo) => (
                  <TableRow
                    key={repo.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedRepo(repo.id)}
                  >
                    <TableCell className="font-medium">{repo.tribunal_codigo}</TableCell>
                    <TableCell>{repo.ano}</TableCell>
                    <TableCell>{repo.tipo_documento}</TableCell>
                    <TableCell>{repo.numero_documento || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_BADGES[repo.status]?.className || ""}
                      >
                        {STATUS_BADGES[repo.status]?.label || repo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{repo.feriados_extraidos}</TableCell>
                    <TableCell className="text-center">{repo.suspensoes_extraidas}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(repo.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedRepo && (
        <RepoDetailDialog
          repoId={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </div>
  )
}

function RepoDetailDialog({ repoId, onClose }: { repoId: string; onClose: () => void }) {
  // We can fetch the detail via the repo list data or a separate query
  // For simplicity, we just show the info from the list
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Registro</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          ID: {repoId}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Upload
// ═══════════════════════════════════════════════════════════════════

function UploadTab() {
  const utils = trpc.useUtils()

  // Form state
  const [tribunalFilter, setTribunalFilter] = useState("TODOS")
  const [tribunalCodigo, setTribunalCodigo] = useState("")
  const [ano, setAno] = useState<number>(new Date().getFullYear())
  const [tipoDocumento, setTipoDocumento] = useState("PORTARIA")
  const [numeroDocumento, setNumeroDocumento] = useState("")
  const [dataDocumento, setDataDocumento] = useState("")
  const [ementa, setEmenta] = useState("")

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [textoExtraido, setTextoExtraido] = useState("")
  const [arquivoUrl, setArquivoUrl] = useState("")
  const [uploadDone, setUploadDone] = useState(false)

  // AI extraction state
  const [extracting, setExtracting] = useState(false)
  const [extractedFeriados, setExtractedFeriados] = useState<ExtractedFeriado[]>([])
  const [extractedSuspensoes, setExtractedSuspensoes] = useState<ExtractedSuspensao[]>([])
  const [extractionDone, setExtractionDone] = useState(false)
  const [extractionError, setExtractionError] = useState("")

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const createRepo = trpc.deadlines.courtCalendar.repositoryCreate.useMutation()
  const updateRepoStatus = trpc.deadlines.courtCalendar.repositoryUpdateStatus.useMutation()
  const createCalendar = trpc.deadlines.courtCalendar.createCalendar.useMutation()

  const filteredTribunals =
    tribunalFilter === "TODOS"
      ? TRIBUNAIS_BRASIL
      : TRIBUNAIS_BRASIL.filter((t) => t.tipo === tribunalFilter)

  const handleTribunalChange = useCallback((codigo: string) => {
    setTribunalCodigo(codigo)
  }, [])

  // File upload
  const handleFileUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("tipo", "CALENDARIO_JUDICIAL")

      const response = await fetch("/api/biblioteca/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload falhou")

      const data = await response.json()
      setArquivoUrl(data.url)
      setTextoExtraido(data.text || "")
      setUploadDone(true)
    } catch {
      setError("Erro ao fazer upload do arquivo.")
    } finally {
      setUploading(false)
    }
  }, [file])

  // AI extraction
  const handleExtract = useCallback(async () => {
    if (!textoExtraido) {
      setExtractionError("Nenhum texto extraído para processar.")
      return
    }

    setExtracting(true)
    setExtractionError("")

    try {
      const response = await fetch("/api/ai/prazos/extract-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: textoExtraido,
          tribunal_codigo: tribunalCodigo,
          ano,
        }),
      })

      if (!response.ok) throw new Error("Extração falhou")

      const data = await response.json()
      setExtractedFeriados(data.feriados || [])
      setExtractedSuspensoes(data.suspensoes || [])
      setExtractionDone(true)
    } catch {
      setExtractionError("Erro na extração por IA. Tente novamente.")
    } finally {
      setExtracting(false)
    }
  }, [textoExtraido, tribunalCodigo, ano])

  // Save to DB
  const handleSave = useCallback(async () => {
    if (!tribunalCodigo) {
      setError("Selecione um tribunal.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const tribunal = getTribunalByCodigo(tribunalCodigo)
      if (!tribunal) throw new Error("Tribunal não encontrado")

      // Create repository entry
      const repo = await createRepo.mutateAsync({
        tribunal_codigo: tribunalCodigo,
        tribunal_nome: tribunal.nome,
        tribunal_tipo: tribunal.tipo,
        uf: tribunal.uf,
        ano,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento || undefined,
        data_documento: dataDocumento ? new Date(dataDocumento) : undefined,
        ementa: ementa || undefined,
        arquivo_url: arquivoUrl || undefined,
        arquivo_nome: file?.name,
        texto_extraido: textoExtraido || undefined,
      })

      // Create court calendar with extracted data
      await createCalendar.mutateAsync({
        tribunal_codigo: tribunalCodigo,
        tribunal_nome: tribunal.nome,
        tribunal_tipo: tribunal.tipo,
        uf: tribunal.uf,
        ano,
        portaria_numero: numeroDocumento || undefined,
        portaria_data: dataDocumento ? new Date(dataDocumento) : undefined,
        feriados: extractedFeriados.map((f) => ({
          data: new Date(f.data),
          nome: f.nome,
          tipo: f.tipo,
          uf: tribunal.uf,
          suspende_expediente: f.suspende_expediente,
          prazos_prorrogados: f.prazos_prorrogados,
          fundamento_legal: f.fundamento_legal,
        })),
        suspensoes: extractedSuspensoes.map((s) => ({
          tipo: s.tipo,
          data_inicio: new Date(s.data_inicio),
          data_fim: new Date(s.data_fim),
          nome: s.nome,
          suspende_prazos: s.suspende_prazos,
          suspende_audiencias: s.suspende_audiencias,
          suspende_sessoes: s.suspende_sessoes,
          plantao_disponivel: s.plantao_disponivel,
          fundamento_legal: s.fundamento_legal,
        })),
      })

      // Update repository status
      await updateRepoStatus.mutateAsync({
        id: repo.id,
        status: "PROCESSADO",
        feriados_extraidos: extractedFeriados.length,
        suspensoes_extraidas: extractedSuspensoes.length,
        processado_por_ia: true,
      })

      // Invalidate queries
      utils.deadlines.courtCalendar.repositoryList.invalidate()
      utils.deadlines.courtCalendar.list.invalidate()
      utils.deadlines.courtCalendar.coverageStats.invalidate()

      setSaved(true)
    } catch {
      setError("Erro ao salvar calendário. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }, [
    tribunalCodigo, ano, tipoDocumento, numeroDocumento, dataDocumento,
    ementa, arquivoUrl, file, textoExtraido,
    extractedFeriados, extractedSuspensoes,
    createRepo, createCalendar, updateRepoStatus, utils,
  ])

  if (saved) {
    return (
      <Card className="border-emerald-200">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
          <div>
            <h3 className="text-lg font-semibold">Calendário Salvo com Sucesso!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {extractedFeriados.length} feriados e {extractedSuspensoes.length} suspensões cadastrados
              para {tribunalCodigo} {ano}
            </p>
          </div>
          <Button
            onClick={() => {
              setSaved(false)
              setUploadDone(false)
              setExtractionDone(false)
              setFile(null)
              setTextoExtraido("")
              setExtractedFeriados([])
              setExtractedSuspensoes([])
              setTribunalCodigo("")
              setNumeroDocumento("")
              setDataDocumento("")
              setEmenta("")
            }}
          >
            Cadastrar Outro
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Step 1: Tribunal + Document Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Identificação do Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Filtrar tribunais</Label>
              <Select value={tribunalFilter} onValueChange={setTribunalFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  {TRIBUNAL_TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>Tribunal *</Label>
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo de documento</Label>
              <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="Ex: 123/2026"
              />
            </div>
            <div>
              <Label>Data do documento</Label>
              <Input
                type="date"
                value={dataDocumento}
                onChange={(e) => setDataDocumento(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Ementa (opcional)</Label>
            <Textarea
              value={ementa}
              onChange={(e) => setEmenta(e.target.value)}
              placeholder="Resumo do conteúdo do documento..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2. Upload do Documento</CardTitle>
          <CardDescription>PDF, DOCX ou TXT com o conteúdo da portaria/resolução</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null)
                setUploadDone(false)
                setExtractionDone(false)
              }}
              className="flex-1"
            />
            <Button
              onClick={handleFileUpload}
              disabled={!file || uploading || uploadDone}
              variant={uploadDone ? "outline" : "default"}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : uploadDone ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                  Enviado
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Enviar
                </>
              )}
            </Button>
          </div>

          {uploadDone && textoExtraido && (
            <div>
              <Label>Texto extraído ({textoExtraido.length.toLocaleString()} caracteres)</Label>
              <Textarea
                value={textoExtraido}
                onChange={(e) => setTextoExtraido(e.target.value)}
                rows={6}
                className="font-mono text-xs mt-1"
              />
            </div>
          )}

          {!file && !uploadDone && (
            <div>
              <Label>Ou cole o texto diretamente</Label>
              <Textarea
                value={textoExtraido}
                onChange={(e) => {
                  setTextoExtraido(e.target.value)
                  if (e.target.value.length > 0) setUploadDone(true)
                }}
                placeholder="Cole aqui o texto da portaria/resolução..."
                rows={6}
                className="font-mono text-xs mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: AI Extraction */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            3. Extração por IA
          </CardTitle>
          <CardDescription>
            A IA analisa o texto e identifica feriados e suspensões automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={handleExtract}
            disabled={!textoExtraido || extracting || extractionDone}
            variant={extractionDone ? "outline" : "default"}
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando com IA...
              </>
            ) : extractionDone ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Extração Concluída
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Processar com IA
              </>
            )}
          </Button>

          {extractionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {extractionError}
            </div>
          )}

          {extractionDone && (
            <div className="space-y-4">
              {/* Feriados */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Feriados encontrados ({extractedFeriados.length})
                </h4>
                {extractedFeriados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum feriado encontrado.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Suspende</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedFeriados.map((f, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">
                              {new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>{f.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {f.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {f.suspende_expediente ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-400" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Suspensões */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Suspensões encontradas ({extractedSuspensoes.length})
                </h4>
                {extractedSuspensoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma suspensão encontrada.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prazos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedSuspensoes.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">
                              {new Date(s.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")} —{" "}
                              {new Date(s.data_fim + "T12:00:00").toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>{s.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {s.tipo.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {s.suspende_prazos ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                                  Suspensos
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Normal</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 4: Save */}
      {extractionDone && (
        <Card>
          <CardContent className="pt-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button
              className="w-full bg-[#C9A961] hover:bg-[#B8954F] text-white h-12 text-base"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Aprovar e Salvar Calendário
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Cobertura
// ═══════════════════════════════════════════════════════════════════

function CoberturaTab() {
  const [ano, setAno] = useState<number>(new Date().getFullYear())
  const [filterTipo, setFilterTipo] = useState("TODOS")

  const coverageQuery = trpc.deadlines.courtCalendar.coverageStats.useQuery({ ano })
  const stats = coverageQuery.data

  const filteredTribunals =
    filterTipo === "TODOS"
      ? TRIBUNAIS_BRASIL
      : TRIBUNAIS_BRASIL.filter((t) => t.tipo === (filterTipo as TribunalTipo))

  const calendarMap = stats
    ? new Map(stats.calendars.map((c) => [c.tribunal_codigo, c]))
    : new Map()

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="w-32">
          <Label className="text-xs">Ano</Label>
          <Input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="h-8"
          />
        </div>
        <div className="w-48">
          <Label className="text-xs">Tipo</Label>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              {TRIBUNAL_TIPO_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats.total_tribunais}</p>
              <p className="text-xs text-muted-foreground">Total de Tribunais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.total_com_calendario}</p>
              <p className="text-xs text-muted-foreground">Com Calendário</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {stats.total_tribunais - stats.total_com_calendario}
              </p>
              <p className="text-xs text-muted-foreground">Sem Calendário</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-[#C9A961]">{stats.percentual_cobertura}%</p>
              <p className="text-xs text-muted-foreground">Cobertura</p>
              <Progress value={stats.percentual_cobertura} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coverage Grid */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sigla</TableHead>
                <TableHead>Tribunal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>UF</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Feriados</TableHead>
                <TableHead className="text-center">Suspensões</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTribunals.map((tribunal) => {
                const cal = calendarMap.get(tribunal.codigo) as {
                  feriados: number
                  suspensoes: number
                } | undefined
                const hasCoverage = !!cal

                return (
                  <TableRow key={tribunal.codigo}>
                    <TableCell className="font-medium">{tribunal.sigla}</TableCell>
                    <TableCell className="text-sm">{tribunal.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tribunal.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{tribunal.uf || "—"}</TableCell>
                    <TableCell className="text-center">
                      {hasCoverage ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {cal ? cal.feriados : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {cal ? cal.suspensoes : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
