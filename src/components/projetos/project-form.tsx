"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { PersonCombobox } from "@/components/pessoas/person-combobox"
import { PROJECT_CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import { Loader2, FileStack } from "lucide-react"

interface ProjectFormData {
  titulo: string
  cliente_id: string
  categoria: string
  descricao: string
  valor_envolvido: string
  valor_honorarios: string
  prioridade: string
  data_inicio: string
  data_prevista_conclusao: string
  advogado_responsavel_id: string
  visivel_portal: boolean
}

export function ProjectForm() {
  const router = useRouter()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProjectFormData>({
    defaultValues: {
      prioridade: "MEDIA",
      visivel_portal: false,
      data_inicio: new Date().toISOString().split("T")[0],
    },
  })

  const { data: users } = trpc.users.list.useQuery()
  const { data: templates } = trpc.projects.templates.useQuery()
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      router.push(`/projetos/${data.id}`)
    },
  })

  const onSubmit = (data: ProjectFormData) => {
    createProject.mutate({
      titulo: data.titulo,
      cliente_id: data.cliente_id,
      categoria: data.categoria,
      descricao: data.descricao || null,
      valor_envolvido: data.valor_envolvido ? parseFloat(data.valor_envolvido) : null,
      valor_honorarios: data.valor_honorarios ? parseFloat(data.valor_honorarios) : null,
      prioridade: data.prioridade,
      data_inicio: data.data_inicio || null,
      data_prevista_conclusao: data.data_prevista_conclusao || null,
      advogado_responsavel_id: data.advogado_responsavel_id,
      visivel_portal: data.visivel_portal,
      template_id: selectedTemplateId,
    })
  }

  const selectedCategoria = watch("categoria")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Titulo *</Label>
                <Input id="titulo" {...register("titulo", { required: true })} placeholder="Ex: Recuperacao de Credito - Empresa X" />
                {errors.titulo && <p className="text-xs text-[#DC3545] mt-1">Titulo obrigatorio</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Cliente *</Label>
                  <PersonCombobox
                    value={watch("cliente_id")}
                    onSelect={(id) => setValue("cliente_id", id)}
                    tipo="CLIENTE"
                    placeholder="Selecionar cliente..."
                  />
                  {errors.cliente_id && <p className="text-xs text-[#DC3545] mt-1">Cliente obrigatorio</p>}
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={selectedCategoria} onValueChange={(v) => setValue("categoria", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_CATEGORY_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoria && <p className="text-xs text-[#DC3545] mt-1">Categoria obrigatoria</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="descricao">Descricao / Escopo</Label>
                <Textarea id="descricao" {...register("descricao")} rows={3} placeholder="Descreva o objetivo e escopo do projeto..." />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="valor_envolvido">Valor Envolvido (R$)</Label>
                  <Input id="valor_envolvido" type="number" step="0.01" {...register("valor_envolvido")} placeholder="0,00" />
                </div>
                <div>
                  <Label htmlFor="valor_honorarios">Honorarios (R$)</Label>
                  <Input id="valor_honorarios" type="number" step="0.01" {...register("valor_honorarios")} placeholder="0,00" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={watch("prioridade")} onValueChange={(v) => setValue("prioridade", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data_inicio">Data de Inicio</Label>
                  <Input id="data_inicio" type="date" {...register("data_inicio")} />
                </div>
                <div>
                  <Label htmlFor="data_prevista_conclusao">Previsao de Conclusao</Label>
                  <Input id="data_prevista_conclusao" type="date" {...register("data_prevista_conclusao")} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Advogado Responsavel *</Label>
                  <Select value={watch("advogado_responsavel_id")} onValueChange={(v) => setValue("advogado_responsavel_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {users?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.advogado_responsavel_id && <p className="text-xs text-[#DC3545] mt-1">Responsavel obrigatorio</p>}
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <Switch
                    id="visivel_portal"
                    checked={watch("visivel_portal")}
                    onCheckedChange={(v) => setValue("visivel_portal", v)}
                  />
                  <Label htmlFor="visivel_portal" className="cursor-pointer">Visivel no portal do cliente</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileStack className="size-4" />
                Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-[#666666] mb-3">
                Selecione um template para gerar automaticamente etapas, tarefas e marcos.
              </p>
              {templates?.length === 0 ? (
                <p className="text-xs text-[#666666] text-center py-2">Nenhum template disponivel</p>
              ) : (
                templates?.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedTemplateId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t.titulo}</p>
                      {selectedTemplateId === t.id && <Badge className="text-[10px]">Selecionado</Badge>}
                    </div>
                    <p className="text-xs text-[#666666] mt-1">
                      {PROJECT_CATEGORY_LABELS[t.categoria] || t.categoria}
                    </p>
                    {t.descricao && (
                      <p className="text-xs text-[#666666] mt-1 line-clamp-2">{t.descricao}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={createProject.isPending}>
          {createProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Criar Projeto
        </Button>
      </div>
    </form>
  )
}
