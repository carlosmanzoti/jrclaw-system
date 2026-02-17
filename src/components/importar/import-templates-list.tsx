"use client"

import { useState } from "react"
import { Trash2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { trpc } from "@/lib/trpc"
import { IMPORT_ENTITY_LABELS, type ImportEntityTypeKey } from "@/lib/import-constants"

export function ImportTemplatesList() {
  const query = trpc.import.templates.list.useQuery()
  const deleteMutation = trpc.import.templates.delete.useMutation({
    onSuccess: () => query.refetch(),
  })
  const updateMutation = trpc.import.templates.update.useMutation({
    onSuccess: () => {
      query.refetch()
      setEditingTemplate(null)
    },
  })

  const [editingTemplate, setEditingTemplate] = useState<{
    id: string
    nome: string
    descricao: string
    ai_prompt_hint: string
  } | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja desativar este template?")) return
    await deleteMutation.mutateAsync({ id })
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando templates...</p>
  }

  const templates = query.data || []

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <p className="text-sm text-muted-foreground">Nenhum template salvo</p>
          <p className="text-xs text-muted-foreground">
            Salve um template durante o processo de importação para reutilizar o mapeamento
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{t.nome}</p>
                  <Badge variant="outline" className="mt-1">
                    {IMPORT_ENTITY_LABELS[t.entity_type as ImportEntityTypeKey] || t.entity_type}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setEditingTemplate({
                        id: t.id,
                        nome: t.nome,
                        descricao: t.descricao || "",
                        ai_prompt_hint: t.ai_prompt_hint || "",
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>

              {t.descricao && (
                <p className="text-xs text-muted-foreground">{t.descricao}</p>
              )}

              <div className="text-xs text-muted-foreground">
                Campos mapeados: {Object.keys(t.field_mapping as Record<string, string>).length}
              </div>

              <p className="text-xs text-muted-foreground">
                Criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingTemplate.nome}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, nome: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={editingTemplate.descricao}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, descricao: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contexto adicional para IA</Label>
                <Textarea
                  value={editingTemplate.ai_prompt_hint}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, ai_prompt_hint: e.target.value })
                  }
                  placeholder="Ex: O arquivo vem do sistema PJe e os campos são separados por ponto-e-vírgula"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#C9A961] text-white hover:bg-[#B8984F]"
              onClick={() => {
                if (!editingTemplate) return
                updateMutation.mutate({
                  id: editingTemplate.id,
                  nome: editingTemplate.nome,
                  ai_prompt_hint: editingTemplate.ai_prompt_hint || undefined,
                })
              }}
              disabled={updateMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
