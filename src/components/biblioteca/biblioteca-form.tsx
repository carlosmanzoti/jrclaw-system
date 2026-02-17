"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Sparkles, Star, Upload, FileText, X } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { TiptapEditor } from "@/components/ui/tiptap-editor"

const LIBRARY_TYPES = [
  { value: "JURISPRUDENCIA", label: "Jurisprudência", group: "Jurisprudencial" },
  { value: "SUMULA", label: "Súmula", group: "Jurisprudencial" },
  { value: "ENUNCIADO", label: "Enunciado", group: "Jurisprudencial" },
  { value: "DOUTRINA", label: "Doutrina", group: "Doutrinário" },
  { value: "LIVRO", label: "Livro", group: "Doutrinário" },
  { value: "ARTIGO", label: "Artigo", group: "Doutrinário" },
  { value: "TESE", label: "Tese", group: "Doutrinário" },
  { value: "LEGISLACAO", label: "Legislação", group: "Normativo" },
  { value: "NOTA_TECNICA", label: "Nota Técnica", group: "Normativo" },
  { value: "MODELO_PECA", label: "Modelo de Peça", group: "Prático" },
  { value: "PARECER_INTERNO", label: "Parecer Interno", group: "Prático" },
  { value: "CONTRATO_MODELO", label: "Contrato Modelo", group: "Prático" },
  { value: "ESTRATEGIA", label: "Estratégia", group: "Prático" },
  { value: "CASO_REFERENCIA", label: "Caso Referência", group: "Prático" },
  { value: "PESQUISA", label: "Pesquisa", group: "Estudo" },
  { value: "MATERIAL_ESTUDO", label: "Material de Estudo", group: "Estudo" },
  { value: "TABELA_REFERENCIA", label: "Tabela Referência", group: "Estudo" },
  { value: "OUTRO", label: "Outro", group: "Outros" },
]

const LIBRARY_AREAS = [
  { value: "RECUPERACAO_JUDICIAL", label: "Recuperação Judicial" },
  { value: "FALENCIA", label: "Falência" },
  { value: "EXECUCAO", label: "Execução" },
  { value: "AGRONEGOCIO", label: "Agronegócio" },
  { value: "TRABALHISTA", label: "Trabalhista" },
  { value: "TRIBUTARIO", label: "Tributário" },
  { value: "SOCIETARIO", label: "Societário" },
  { value: "CONTRATUAL", label: "Contratual" },
  { value: "BANCARIO", label: "Bancário" },
  { value: "GERAL", label: "Geral" },
]

interface BibliotecaFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId?: string | null
  prefill?: {
    tipo?: string
    titulo?: string
    conteudo?: string
    area?: string
    tags?: string[]
  }
}

export function BibliotecaForm({ open, onOpenChange, entryId, prefill }: BibliotecaFormProps) {
  const utils = trpc.useUtils()
  const isEdit = !!entryId
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState("")
  const [titulo, setTitulo] = useState("")
  const [resumo, setResumo] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [fonte, setFonte] = useState("")
  const [urlFonte, setUrlFonte] = useState("")
  const [area, setArea] = useState("")
  const [tags, setTags] = useState("")
  const [relevancia, setRelevancia] = useState(0)
  const [extracting, setExtracting] = useState(false)

  // File upload state
  const [arquivoUrl, setArquivoUrl] = useState("")
  const [arquivoTipo, setArquivoTipo] = useState("")
  const [arquivoTamanho, setArquivoTamanho] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Metadata fields
  const [metaTribunal, setMetaTribunal] = useState("")
  const [metaRelator, setMetaRelator] = useState("")
  const [metaNumeroRecurso, setMetaNumeroRecurso] = useState("")
  const [metaOrgaoJulgador, setMetaOrgaoJulgador] = useState("")
  const [metaDataJulgamento, setMetaDataJulgamento] = useState("")
  const [metaLeiNorma, setMetaLeiNorma] = useState("")
  const [metaArtigos, setMetaArtigos] = useState("")
  const [metaAutor, setMetaAutor] = useState("")
  const [metaEditora, setMetaEditora] = useState("")
  const [metaEdicaoAno, setMetaEdicaoAno] = useState("")
  const [metaCapitulo, setMetaCapitulo] = useState("")
  const [metaPaginas, setMetaPaginas] = useState("")

  const { data: entry } = trpc.biblioteca.getById.useQuery(
    { id: entryId! },
    { enabled: !!entryId }
  )

  const createMutation = trpc.biblioteca.create.useMutation({
    onSuccess: () => {
      utils.biblioteca.list.invalidate()
      utils.biblioteca.countsByType.invalidate()
      onOpenChange(false)
    },
  })

  const updateMutation = trpc.biblioteca.update.useMutation({
    onSuccess: () => {
      utils.biblioteca.list.invalidate()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) return
    if (isEdit && entry) {
      setTipo(entry.tipo)
      setTitulo(entry.titulo)
      setResumo(entry.resumo || "")
      setConteudo(entry.conteudo || "")
      setFonte(entry.fonte || "")
      setUrlFonte(entry.url_fonte || "")
      setArea(entry.area || "")
      setTags(entry.tags.join(", "))
      setRelevancia(entry.relevancia || 0)
      setArquivoUrl((entry as any).arquivo_url || "")
      // Load metadata
      const meta = (entry as any).metadata as any
      if (meta) {
        setMetaTribunal(meta.tribunal || "")
        setMetaRelator(meta.relator || "")
        setMetaNumeroRecurso(meta.numero_recurso || "")
        setMetaOrgaoJulgador(meta.orgao_julgador || "")
        setMetaDataJulgamento(meta.data_julgamento || "")
        setMetaLeiNorma(meta.lei_norma || "")
        setMetaArtigos(meta.artigos || "")
        setMetaAutor(meta.autor || "")
        setMetaEditora(meta.editora || "")
        setMetaEdicaoAno(meta.edicao_ano || "")
        setMetaCapitulo(meta.capitulo || "")
        setMetaPaginas(meta.paginas || "")
      }
    } else if (!isEdit) {
      setTipo(prefill?.tipo || "")
      setTitulo(prefill?.titulo || "")
      setResumo("")
      setConteudo(prefill?.conteudo || "")
      setFonte("")
      setUrlFonte("")
      setArea(prefill?.area || "")
      setTags(prefill?.tags?.join(", ") || "")
      setRelevancia(0)
      setArquivoUrl("")
      setArquivoTipo("")
      setArquivoTamanho(0)
      setMetaTribunal("")
      setMetaRelator("")
      setMetaNumeroRecurso("")
      setMetaOrgaoJulgador("")
      setMetaDataJulgamento("")
      setMetaLeiNorma("")
      setMetaArtigos("")
      setMetaAutor("")
      setMetaEditora("")
      setMetaEdicaoAno("")
      setMetaCapitulo("")
      setMetaPaginas("")
    }
  }, [open, isEdit, entry, prefill])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("tipo", tipo || "OUTRO")

      const res = await fetch("/api/biblioteca/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()
      setArquivoUrl(data.url)
      setArquivoTipo(file.name.split(".").pop() || "")
      setArquivoTamanho(file.size)

      // If text was extracted and conteudo is empty, populate
      if (data.text && !conteudo) {
        setConteudo(data.text)
      }
      // Auto-set title from filename if empty
      if (!titulo) {
        setTitulo(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "))
      }
    } catch {
      // Silent
    } finally {
      setUploading(false)
    }
  }

  const buildMetadata = () => {
    const meta: any = {}
    if (tipo === "JURISPRUDENCIA" || tipo === "SUMULA" || tipo === "ENUNCIADO") {
      if (metaTribunal) meta.tribunal = metaTribunal
      if (metaRelator) meta.relator = metaRelator
      if (metaNumeroRecurso) meta.numero_recurso = metaNumeroRecurso
      if (metaOrgaoJulgador) meta.orgao_julgador = metaOrgaoJulgador
      if (metaDataJulgamento) meta.data_julgamento = metaDataJulgamento
    }
    if (tipo === "LEGISLACAO") {
      if (metaLeiNorma) meta.lei_norma = metaLeiNorma
      if (metaArtigos) meta.artigos = metaArtigos
    }
    if (tipo === "DOUTRINA" || tipo === "LIVRO") {
      if (metaAutor) meta.autor = metaAutor
      if (metaEditora) meta.editora = metaEditora
      if (metaEdicaoAno) meta.edicao_ano = metaEdicaoAno
      if (metaCapitulo) meta.capitulo = metaCapitulo
      if (metaPaginas) meta.paginas = metaPaginas
    }
    return Object.keys(meta).length > 0 ? meta : undefined
  }

  const handleSubmit = () => {
    if (!tipo || !titulo) return

    const data: any = {
      tipo,
      titulo,
      resumo: resumo || undefined,
      conteudo: conteudo || undefined,
      fonte: fonte || undefined,
      url_fonte: urlFonte || undefined,
      area: area && area !== "none" ? area : undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      relevancia,
      arquivo_url: arquivoUrl || undefined,
      arquivo_tipo: arquivoTipo || undefined,
      arquivo_tamanho: arquivoTamanho || undefined,
      metadata: buildMetadata(),
    }

    if (isEdit) {
      updateMutation.mutate({ id: entryId!, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleExtractWithAI = async () => {
    if (!conteudo) return
    setExtracting(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analise o seguinte texto jurídico e extraia em formato JSON: {"titulo": "...", "resumo": "...", "tipo": "JURISPRUDENCIA|SUMULA|DOUTRINA|ARTIGO|LEGISLACAO|MODELO_PECA|PARECER_INTERNO|PESQUISA|TESE|NOTA_TECNICA|LIVRO|ENUNCIADO|CONTRATO_MODELO|ESTRATEGIA|CASO_REFERENCIA|MATERIAL_ESTUDO|TABELA_REFERENCIA|OUTRO", "area": "RECUPERACAO_JUDICIAL|FALENCIA|EXECUCAO|AGRONEGOCIO|TRABALHISTA|TRIBUTARIO|SOCIETARIO|CONTRATUAL|BANCARIO|GERAL", "tags": ["tag1","tag2"], "relevancia": 1-5}. Texto:\n\n${conteudo.substring(0, 3000)}`,
            },
          ],
          sessionId: `extract_${Date.now()}`,
        }),
      })

      if (!res.ok) throw new Error("Failed")

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let text = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.titulo) setTitulo(parsed.titulo)
        if (parsed.resumo) setResumo(parsed.resumo)
        if (parsed.tipo) setTipo(parsed.tipo)
        if (parsed.area) setArea(parsed.area)
        if (parsed.tags) setTags(parsed.tags.join(", "))
        if (parsed.relevancia) setRelevancia(parsed.relevancia)
      }
    } catch {
      // Silent fail
    } finally {
      setExtracting(false)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const showJurisprudenciaFields = tipo === "JURISPRUDENCIA" || tipo === "SUMULA" || tipo === "ENUNCIADO"
  const showLegislacaoFields = tipo === "LEGISLACAO"
  const showDoutrinaFields = tipo === "DOUTRINA" || tipo === "LIVRO"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Entrada" : "Nova Entrada"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LIBRARY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Área</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {LIBRARY_AREAS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da entrada"
              />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo (opcional)</Label>
              {arquivoUrl ? (
                <div className="flex items-center gap-2 p-2 rounded border bg-[#F7F3F1]">
                  <FileText className="size-4 text-[#17A2B8]" />
                  <span className="text-xs flex-1 truncate">{arquivoUrl.split("/").pop()}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setArquivoUrl(""); setArquivoTipo(""); setArquivoTamanho(0) }}>
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#C9A961]/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-5 animate-spin text-[#17A2B8] mx-auto" />
                  ) : (
                    <>
                      <Upload className="size-5 text-[#666666]/50 mx-auto" />
                      <p className="text-[10px] text-[#666666] mt-1">
                        PDF, DOCX, TXT, XLSX, CSV, RTF, MD, JPG, PNG
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.xlsx,.csv,.rtf,.md,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                      e.target.value = ""
                    }}
                  />
                </div>
              )}
            </div>

            {/* Metadata fields for Jurisprudência */}
            {showJurisprudenciaFields && (
              <div className="space-y-3 p-3 border rounded-lg bg-[#17A2B8]/5">
                <p className="text-xs font-medium text-[#17A2B8]">Dados da Jurisprudência</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tribunal</Label>
                    <Select value={metaTribunal} onValueChange={setMetaTribunal}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["STF","STJ","TRF1","TRF2","TRF3","TRF4","TRF5","TRF6","TJSP","TJPR","TJTO","TJMA","TJMG","TJRJ","TJRS","TJSC","TST","TRT","TCU","Outro"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Número do recurso</Label>
                    <Input value={metaNumeroRecurso} onChange={(e) => setMetaNumeroRecurso(e.target.value)} className="h-7 text-xs" placeholder="REsp 1.234.567/SP" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Relator</Label>
                    <Input value={metaRelator} onChange={(e) => setMetaRelator(e.target.value)} className="h-7 text-xs" placeholder="Min. Nome" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Órgão julgador</Label>
                    <Input value={metaOrgaoJulgador} onChange={(e) => setMetaOrgaoJulgador(e.target.value)} className="h-7 text-xs" placeholder="2ª Turma" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Data do julgamento</Label>
                    <Input type="date" value={metaDataJulgamento} onChange={(e) => setMetaDataJulgamento(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* Metadata fields for Legislação */}
            {showLegislacaoFields && (
              <div className="space-y-3 p-3 border rounded-lg bg-[#28A745]/5">
                <p className="text-xs font-medium text-[#28A745]">Dados da Legislação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Lei/Norma</Label>
                    <Input value={metaLeiNorma} onChange={(e) => setMetaLeiNorma(e.target.value)} className="h-7 text-xs" placeholder="Lei 11.101/2005" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Artigos</Label>
                    <Input value={metaArtigos} onChange={(e) => setMetaArtigos(e.target.value)} className="h-7 text-xs" placeholder="arts. 47-52" />
                  </div>
                </div>
              </div>
            )}

            {/* Metadata fields for Doutrina/Livro */}
            {showDoutrinaFields && (
              <div className="space-y-3 p-3 border rounded-lg bg-[#C9A961]/5">
                <p className="text-xs font-medium text-[#C9A961]">Dados Bibliográficos</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Autor</Label>
                    <Input value={metaAutor} onChange={(e) => setMetaAutor(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Editora</Label>
                    <Input value={metaEditora} onChange={(e) => setMetaEditora(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Edição/Ano</Label>
                    <Input value={metaEdicaoAno} onChange={(e) => setMetaEdicaoAno(e.target.value)} className="h-7 text-xs" placeholder="3ª ed., 2023" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Capítulo</Label>
                    <Input value={metaCapitulo} onChange={(e) => setMetaCapitulo(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Páginas</Label>
                    <Input value={metaPaginas} onChange={(e) => setMetaPaginas(e.target.value)} className="h-7 text-xs" placeholder="pp. 123-145" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Resumo</Label>
              <Textarea
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                placeholder="Resumo ou ementa..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Conteúdo</Label>
                {conteudo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={handleExtractWithAI}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="size-3 mr-1" />
                    )}
                    Extrair com IA
                  </Button>
                )}
              </div>
              <TiptapEditor content={conteudo} onChange={setConteudo} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fonte</Label>
                <Input
                  value={fonte}
                  onChange={(e) => setFonte(e.target.value)}
                  placeholder="STJ, TJ-SP, Doutrina..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL da Fonte</Label>
                <Input
                  value={urlFonte}
                  onChange={(e) => setUrlFonte(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tags (separadas por vírgula)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="recuperação, crédito, cessão fiduciária"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Relevância</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRelevancia(n)}
                    className="p-0.5"
                  >
                    <Star
                      className={`size-5 ${
                        n <= relevancia ? "fill-[#C9A961] text-[#C9A961]" : "text-[#666666]/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!tipo || !titulo || isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar Entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
