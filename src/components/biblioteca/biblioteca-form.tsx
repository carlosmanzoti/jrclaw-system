"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Sparkles, Star } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { TiptapEditor } from "@/components/ui/tiptap-editor"

const LIBRARY_TYPES = [
  { value: "JURISPRUDENCIA", label: "Jurisprudência" },
  { value: "DOUTRINA", label: "Doutrina" },
  { value: "LEGISLACAO", label: "Legislação" },
  { value: "MODELO", label: "Modelo" },
  { value: "ARTIGO", label: "Artigo" },
  { value: "PARECER", label: "Parecer" },
  { value: "SUMULA", label: "Súmula" },
  { value: "OUTRO", label: "Outro" },
]

const LIBRARY_AREAS = [
  { value: "RECUPERACAO_JUDICIAL", label: "Recuperação Judicial" },
  { value: "FALENCIA", label: "Falência" },
  { value: "EXECUCAO", label: "Execução" },
  { value: "AGRARIO", label: "Agrário" },
  { value: "TRABALHISTA", label: "Trabalhista" },
  { value: "TRIBUTARIO", label: "Tributário" },
  { value: "SOCIETARIO", label: "Societário" },
  { value: "CONTRATUAL", label: "Contratual" },
  { value: "GERAL", label: "Geral" },
]

interface BibliotecaFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId?: string | null
}

export function BibliotecaForm({ open, onOpenChange, entryId }: BibliotecaFormProps) {
  const utils = trpc.useUtils()
  const isEdit = !!entryId

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

  const { data: entry } = trpc.biblioteca.getById.useQuery(
    { id: entryId! },
    { enabled: !!entryId }
  )

  const createMutation = trpc.biblioteca.create.useMutation({
    onSuccess: () => {
      utils.biblioteca.list.invalidate()
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
    } else if (!isEdit) {
      setTipo("")
      setTitulo("")
      setResumo("")
      setConteudo("")
      setFonte("")
      setUrlFonte("")
      setArea("")
      setTags("")
      setRelevancia(0)
    }
  }, [open, isEdit, entry])

  const handleSubmit = () => {
    if (!tipo || !titulo) return

    const data = {
      tipo,
      titulo,
      resumo: resumo || undefined,
      conteudo: conteudo || undefined,
      fonte: fonte || undefined,
      url_fonte: urlFonte || undefined,
      area: area && area !== "none" ? area : undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      relevancia,
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
              content: `Analise o seguinte texto jurídico e extraia em formato JSON: {"titulo": "...", "resumo": "...", "tipo": "JURISPRUDENCIA|DOUTRINA|LEGISLACAO|MODELO|ARTIGO|PARECER|SUMULA|OUTRO", "area": "RECUPERACAO_JUDICIAL|FALENCIA|EXECUCAO|AGRARIO|TRABALHISTA|TRIBUTARIO|SOCIETARIO|CONTRATUAL|GERAL", "tags": ["tag1","tag2"], "relevancia": 1-5}. Texto:\n\n${conteudo.substring(0, 3000)}`,
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

      // Try to parse JSON from response
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
                        n <= relevancia ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
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
