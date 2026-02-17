"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trpc } from "@/lib/trpc"

const AREA_OPTIONS = [
  { value: "RECUPERACAO_JUDICIAL", label: "Recuperacao Judicial" },
  { value: "FALENCIA", label: "Falencia" },
  { value: "EXECUCAO", label: "Execucao" },
  { value: "AGRONEGOCIO", label: "Agronegócio" },
  { value: "TRABALHISTA", label: "Trabalhista" },
  { value: "TRIBUTARIO", label: "Tributario" },
  { value: "SOCIETARIO", label: "Societario" },
  { value: "CONTRATUAL", label: "Contratual" },
  { value: "BANCARIO", label: "Bancario" },
  { value: "GERAL", label: "Geral" },
]

const TRIBUNAIS = [
  "STF", "STJ", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6",
  "TJSP", "TJPR", "TJTO", "TJMA", "TJMG", "TJRJ", "TJRS", "TJSC",
  "TST", "TRT", "TCU", "Outro",
]

const TIPOS_JURISPRUDENCIA = [
  { value: "Acordao", label: "Acordao" },
  { value: "Decisao Monocratica", label: "Decisao Monocratica" },
  { value: "Sumula", label: "Sumula" },
  { value: "Sumula Vinculante", label: "Sumula Vinculante" },
  { value: "Informativo", label: "Informativo" },
]

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={`size-5 ${
              n <= value ? "fill-[#C9A961] text-[#C9A961]" : "text-[#666666]/30"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function AreaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Selecionar area..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhuma</SelectItem>
        {AREA_OPTIONS.map((a) => (
          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface BibliotecaClippersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BibliotecaClippers({ open, onOpenChange }: BibliotecaClippersProps) {
  const utils = trpc.useUtils()

  // Jurisprudencia state
  const [jurTribunal, setJurTribunal] = useState("")
  const [jurTipoJur, setJurTipoJur] = useState("")
  const [jurNumeroRecurso, setJurNumeroRecurso] = useState("")
  const [jurRelator, setJurRelator] = useState("")
  const [jurOrgaoJulgador, setJurOrgaoJulgador] = useState("")
  const [jurDataJulgamento, setJurDataJulgamento] = useState("")
  const [jurEmenta, setJurEmenta] = useState("")
  const [jurTese, setJurTese] = useState("")
  const [jurTrecho, setJurTrecho] = useState("")
  const [jurArea, setJurArea] = useState("")
  const [jurTags, setJurTags] = useState("")
  const [jurRelevancia, setJurRelevancia] = useState(0)

  // Legislacao state
  const [legLeiNorma, setLegLeiNorma] = useState("")
  const [legArtigos, setLegArtigos] = useState("")
  const [legTextoArtigos, setLegTextoArtigos] = useState("")
  const [legAnotacoes, setLegAnotacoes] = useState("")
  const [legArea, setLegArea] = useState("")
  const [legTags, setLegTags] = useState("")

  // Caso Referencia state
  const [casoTitulo, setCasoTitulo] = useState("")
  const [casoEstrategia, setCasoEstrategia] = useState("")
  const [casoResultado, setCasoResultado] = useState("")
  const [casoLicoes, setCasoLicoes] = useState("")
  const [casoArea, setCasoArea] = useState("")
  const [casoTags, setCasoTags] = useState("")
  const [casoRelevancia, setCasoRelevancia] = useState(0)

  // Livro/Doutrina state
  const [livroTitulo, setLivroTitulo] = useState("")
  const [livroAutor, setLivroAutor] = useState("")
  const [livroEditora, setLivroEditora] = useState("")
  const [livroEdicaoAno, setLivroEdicaoAno] = useState("")
  const [livroCapitulo, setLivroCapitulo] = useState("")
  const [livroPaginas, setLivroPaginas] = useState("")
  const [livroTrecho, setLivroTrecho] = useState("")
  const [livroComentario, setLivroComentario] = useState("")
  const [livroArea, setLivroArea] = useState("")
  const [livroTags, setLivroTags] = useState("")
  const [livroRelevancia, setLivroRelevancia] = useState(0)

  const createMutation = trpc.biblioteca.create.useMutation({
    onSuccess: () => {
      utils.biblioteca.list.invalidate()
      onOpenChange(false)
    },
  })

  const parseTags = (raw: string) =>
    raw ? raw.split(",").map((t) => t.trim()).filter(Boolean) : []

  const cleanArea = (area: string) =>
    area && area !== "none" ? area : undefined

  const handleSaveJurisprudencia = () => {
    if (!jurTribunal || !jurTipoJur || !jurNumeroRecurso) return

    const titulo = `${jurTribunal} - ${jurTipoJur} - ${jurNumeroRecurso}`
    const fonte = `${jurTribunal}, Rel. ${jurRelator}`

    const conteudoParts: string[] = []
    if (jurEmenta) conteudoParts.push(`EMENTA:\n${jurEmenta}`)
    if (jurTese) conteudoParts.push(`TESE/RATIO DECIDENDI:\n${jurTese}`)
    if (jurTrecho) conteudoParts.push(`TRECHO RELEVANTE:\n${jurTrecho}`)

    createMutation.mutate({
      tipo: "JURISPRUDENCIA",
      titulo,
      fonte,
      resumo: jurEmenta || undefined,
      conteudo: conteudoParts.join("\n\n") || undefined,
      area: cleanArea(jurArea),
      tags: parseTags(jurTags),
      relevancia: jurRelevancia,
      metadata: {
        tribunal: jurTribunal,
        tipo_jur: jurTipoJur,
        numero_recurso: jurNumeroRecurso,
        relator: jurRelator,
        orgao_julgador: jurOrgaoJulgador,
        data_julgamento: jurDataJulgamento,
      },
    })
  }

  const handleSaveLegislacao = () => {
    if (!legLeiNorma) return

    const titulo = legArtigos
      ? `${legLeiNorma} - ${legArtigos}`
      : legLeiNorma

    createMutation.mutate({
      tipo: "LEGISLACAO",
      titulo,
      fonte: legLeiNorma,
      resumo: legAnotacoes || undefined,
      conteudo: legTextoArtigos || undefined,
      area: cleanArea(legArea),
      tags: parseTags(legTags),
      metadata: {
        lei_norma: legLeiNorma,
        artigos: legArtigos,
      },
    })
  }

  const handleSaveCasoReferencia = () => {
    if (!casoTitulo) return

    const conteudoParts: string[] = []
    if (casoEstrategia) conteudoParts.push(`ESTRATEGIA UTILIZADA:\n${casoEstrategia}`)
    if (casoResultado) conteudoParts.push(`RESULTADO OBTIDO:\n${casoResultado}`)
    if (casoLicoes) conteudoParts.push(`LICOES APRENDIDAS:\n${casoLicoes}`)

    const resumoParts: string[] = []
    if (casoResultado) resumoParts.push(`Resultado: ${casoResultado.substring(0, 150)}`)
    if (casoLicoes) resumoParts.push(`Licoes: ${casoLicoes.substring(0, 150)}`)

    createMutation.mutate({
      tipo: "CASO_REFERENCIA",
      titulo: casoTitulo,
      resumo: resumoParts.join(". ") || undefined,
      conteudo: conteudoParts.join("\n\n") || undefined,
      area: cleanArea(casoArea),
      tags: parseTags(casoTags),
      relevancia: casoRelevancia,
    })
  }

  const handleSaveLivro = () => {
    if (!livroTitulo || !livroAutor) return

    const titulo = `${livroAutor} - ${livroTitulo}`

    // Build ABNT-style reference
    const sobrenome = livroAutor.split(" ").pop()?.toUpperCase() || livroAutor.toUpperCase()
    const fonteParts = [sobrenome]
    fonteParts.push(livroTitulo)
    if (livroEditora) fonteParts.push(livroEditora)
    if (livroEdicaoAno) fonteParts.push(livroEdicaoAno)
    if (livroPaginas) fonteParts.push(`p. ${livroPaginas}`)
    const fonte = fonteParts.join(". ")

    createMutation.mutate({
      tipo: "DOUTRINA",
      titulo,
      fonte,
      resumo: livroComentario || undefined,
      conteudo: livroTrecho || undefined,
      area: cleanArea(livroArea),
      tags: parseTags(livroTags),
      relevancia: livroRelevancia,
      metadata: {
        autor: livroAutor,
        editora: livroEditora,
        edicao_ano: livroEdicaoAno,
        capitulo: livroCapitulo,
        paginas: livroPaginas,
      },
    })
  }

  const isPending = createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Clippers Especializados</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="jurisprudencia" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="jurisprudencia" className="text-xs">Jurisprudencia</TabsTrigger>
            <TabsTrigger value="legislacao" className="text-xs">Legislacao</TabsTrigger>
            <TabsTrigger value="caso" className="text-xs">Caso Referencia</TabsTrigger>
            <TabsTrigger value="livro" className="text-xs">Livro/Doutrina</TabsTrigger>
          </TabsList>

          {/* Tab 1: Jurisprudencia */}
          <TabsContent value="jurisprudencia" className="flex-1 min-h-0">
            <ScrollArea className="h-[55vh]">
              <div className="space-y-3 pr-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tribunal *</Label>
                    <Select value={jurTribunal} onValueChange={setJurTribunal}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar tribunal..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIBUNAIS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo *</Label>
                    <Select value={jurTipoJur} onValueChange={setJurTipoJur}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_JURISPRUDENCIA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Numero do recurso *</Label>
                    <Input
                      value={jurNumeroRecurso}
                      onChange={(e) => setJurNumeroRecurso(e.target.value)}
                      placeholder="REsp 1.234.567/SP"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relator</Label>
                    <Input
                      value={jurRelator}
                      onChange={(e) => setJurRelator(e.target.value)}
                      placeholder="Min. Fulano de Tal"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Orgao julgador</Label>
                    <Input
                      value={jurOrgaoJulgador}
                      onChange={(e) => setJurOrgaoJulgador(e.target.value)}
                      placeholder="3a Turma"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data do julgamento</Label>
                    <Input
                      type="date"
                      value={jurDataJulgamento}
                      onChange={(e) => setJurDataJulgamento(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Ementa</Label>
                  <Textarea
                    value={jurEmenta}
                    onChange={(e) => setJurEmenta(e.target.value)}
                    placeholder="Cole a ementa aqui..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tese/Ratio decidendi</Label>
                  <Textarea
                    value={jurTese}
                    onChange={(e) => setJurTese(e.target.value)}
                    placeholder="Tese firmada ou ratio decidendi..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trecho relevante</Label>
                  <Textarea
                    value={jurTrecho}
                    onChange={(e) => setJurTrecho(e.target.value)}
                    placeholder="Trecho relevante do voto ou acordao..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Area</Label>
                    <AreaSelect value={jurArea} onChange={setJurArea} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (separadas por virgula)</Label>
                    <Input
                      value={jurTags}
                      onChange={(e) => setJurTags(e.target.value)}
                      placeholder="recuperacao, credito, cessao"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Relevancia</Label>
                  <StarRating value={jurRelevancia} onChange={setJurRelevancia} />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveJurisprudencia}
                disabled={!jurTribunal || !jurTipoJur || !jurNumeroRecurso || isPending}
              >
                {isPending ? "Salvando..." : "Salvar Jurisprudencia"}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Tab 2: Legislacao */}
          <TabsContent value="legislacao" className="flex-1 min-h-0">
            <ScrollArea className="h-[55vh]">
              <div className="space-y-3 pr-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Lei/Norma *</Label>
                    <Input
                      value={legLeiNorma}
                      onChange={(e) => setLegLeiNorma(e.target.value)}
                      placeholder="Lei 11.101/2005"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Artigos</Label>
                    <Input
                      value={legArtigos}
                      onChange={(e) => setLegArtigos(e.target.value)}
                      placeholder="arts. 47-52"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Texto dos artigos</Label>
                  <Textarea
                    value={legTextoArtigos}
                    onChange={(e) => setLegTextoArtigos(e.target.value)}
                    placeholder="Cole o texto dos artigos aqui..."
                    rows={6}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Anotacoes do advogado</Label>
                  <Textarea
                    value={legAnotacoes}
                    onChange={(e) => setLegAnotacoes(e.target.value)}
                    placeholder="Suas anotacoes sobre os dispositivos..."
                    rows={4}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Area</Label>
                    <AreaSelect value={legArea} onChange={setLegArea} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (separadas por virgula)</Label>
                    <Input
                      value={legTags}
                      onChange={(e) => setLegTags(e.target.value)}
                      placeholder="recuperacao, plano, credores"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveLegislacao}
                disabled={!legLeiNorma || isPending}
              >
                {isPending ? "Salvando..." : "Salvar Legislacao"}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Tab 3: Caso Referencia */}
          <TabsContent value="caso" className="flex-1 min-h-0">
            <ScrollArea className="h-[55vh]">
              <div className="space-y-3 pr-4 pb-4">
                <div className="space-y-1">
                  <Label className="text-xs">Titulo do caso *</Label>
                  <Input
                    value={casoTitulo}
                    onChange={(e) => setCasoTitulo(e.target.value)}
                    placeholder="Ex: Recuperacao judicial - Empresa X"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Estrategia utilizada</Label>
                  <Textarea
                    value={casoEstrategia}
                    onChange={(e) => setCasoEstrategia(e.target.value)}
                    placeholder="Descreva a estrategia adotada..."
                    rows={4}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Resultado obtido</Label>
                  <Textarea
                    value={casoResultado}
                    onChange={(e) => setCasoResultado(e.target.value)}
                    placeholder="Descreva o resultado alcancado..."
                    rows={4}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Licoes aprendidas</Label>
                  <Textarea
                    value={casoLicoes}
                    onChange={(e) => setCasoLicoes(e.target.value)}
                    placeholder="O que se aprendeu com esse caso..."
                    rows={4}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Area</Label>
                    <AreaSelect value={casoArea} onChange={setCasoArea} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (separadas por virgula)</Label>
                    <Input
                      value={casoTags}
                      onChange={(e) => setCasoTags(e.target.value)}
                      placeholder="estrategia, precedente, tese"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Relevancia</Label>
                  <StarRating value={casoRelevancia} onChange={setCasoRelevancia} />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveCasoReferencia}
                disabled={!casoTitulo || isPending}
              >
                {isPending ? "Salvando..." : "Salvar Caso Referencia"}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Tab 4: Livro/Doutrina */}
          <TabsContent value="livro" className="flex-1 min-h-0">
            <ScrollArea className="h-[55vh]">
              <div className="space-y-3 pr-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Titulo do livro *</Label>
                    <Input
                      value={livroTitulo}
                      onChange={(e) => setLivroTitulo(e.target.value)}
                      placeholder="Titulo da obra"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Autor *</Label>
                    <Input
                      value={livroAutor}
                      onChange={(e) => setLivroAutor(e.target.value)}
                      placeholder="Nome do autor"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Editora</Label>
                    <Input
                      value={livroEditora}
                      onChange={(e) => setLivroEditora(e.target.value)}
                      placeholder="Editora"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Edicao/Ano</Label>
                    <Input
                      value={livroEdicaoAno}
                      onChange={(e) => setLivroEdicaoAno(e.target.value)}
                      placeholder="3a ed., 2024"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Capitulo</Label>
                    <Input
                      value={livroCapitulo}
                      onChange={(e) => setLivroCapitulo(e.target.value)}
                      placeholder="Cap. 5"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Paginas</Label>
                  <Input
                    value={livroPaginas}
                    onChange={(e) => setLivroPaginas(e.target.value)}
                    placeholder="120-135"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Trecho/Citacao relevante</Label>
                  <Textarea
                    value={livroTrecho}
                    onChange={(e) => setLivroTrecho(e.target.value)}
                    placeholder="Cole o trecho ou citacao relevante..."
                    rows={5}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Comentario do advogado</Label>
                  <Textarea
                    value={livroComentario}
                    onChange={(e) => setLivroComentario(e.target.value)}
                    placeholder="Seu comentario sobre o trecho..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Area</Label>
                    <AreaSelect value={livroArea} onChange={setLivroArea} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (separadas por virgula)</Label>
                    <Input
                      value={livroTags}
                      onChange={(e) => setLivroTags(e.target.value)}
                      placeholder="doutrina, referencia, teoria"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Relevancia</Label>
                  <StarRating value={livroRelevancia} onChange={setLivroRelevancia} />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveLivro}
                disabled={!livroTitulo || !livroAutor || isPending}
              >
                {isPending ? "Salvando..." : "Salvar Doutrina"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
