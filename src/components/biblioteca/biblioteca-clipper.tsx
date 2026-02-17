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
import { trpc } from "@/lib/trpc"

interface BibliotecaClipperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultContent?: string
  defaultTitle?: string
}

export function BibliotecaClipper({
  open,
  onOpenChange,
  defaultContent = "",
  defaultTitle = "",
}: BibliotecaClipperProps) {
  const utils = trpc.useUtils()

  const [titulo, setTitulo] = useState(defaultTitle)
  const [conteudo, setConteudo] = useState(defaultContent)
  const [fonte, setFonte] = useState("")
  const [tipo, setTipo] = useState("OUTRO")
  const [area, setArea] = useState("")
  const [tags, setTags] = useState("")
  const [saveAnother, setSaveAnother] = useState(false)

  const createMutation = trpc.biblioteca.create.useMutation({
    onSuccess: () => {
      utils.biblioteca.list.invalidate()
      if (saveAnother) {
        setTitulo("")
        setConteudo("")
        setFonte("")
        setTags("")
      } else {
        onOpenChange(false)
      }
    },
  })

  const handleSave = (andNew: boolean) => {
    if (!titulo) return
    setSaveAnother(andNew)
    createMutation.mutate({
      tipo,
      titulo,
      conteudo: conteudo || undefined,
      fonte: fonte || undefined,
      area: area && area !== "none" ? area : undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clipper Rápido</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da referência"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Conteúdo</Label>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Cole o texto aqui..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JURISPRUDENCIA">Jurisprudência</SelectItem>
                  <SelectItem value="DOUTRINA">Doutrina</SelectItem>
                  <SelectItem value="LEGISLACAO">Legislação</SelectItem>
                  <SelectItem value="MODELO">Modelo</SelectItem>
                  <SelectItem value="ARTIGO">Artigo</SelectItem>
                  <SelectItem value="PARECER">Parecer</SelectItem>
                  <SelectItem value="SUMULA">Súmula</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="RECUPERACAO_JUDICIAL">Recuperação Judicial</SelectItem>
                  <SelectItem value="FALENCIA">Falência</SelectItem>
                  <SelectItem value="EXECUCAO">Execução</SelectItem>
                  <SelectItem value="AGRARIO">Agrário</SelectItem>
                  <SelectItem value="TRIBUTARIO">Tributário</SelectItem>
                  <SelectItem value="SOCIETARIO">Societário</SelectItem>
                  <SelectItem value="CONTRATUAL">Contratual</SelectItem>
                  <SelectItem value="GERAL">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Fonte</Label>
            <Input
              value={fonte}
              onChange={(e) => setFonte(e.target.value)}
              placeholder="STJ, TJ-SP..."
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={!titulo || createMutation.isPending}
          >
            Salvar e Novo
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={!titulo || createMutation.isPending}
          >
            {createMutation.isPending ? "Salvando..." : "Salvar e Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
