"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PersonCombobox } from "@/components/pessoas/person-combobox"
import {
  CASE_TYPE_LABELS, CASE_STATUS_LABELS, ESTADOS_BRASIL,
} from "@/lib/constants"

const caseSchema = z.object({
  numero_processo: z.string().optional().nullable(),
  tipo: z.string().min(1, "Tipo obrigatório"),
  status: z.string().optional(),
  fase_processual: z.string().optional().nullable(),
  vara: z.string().optional().nullable(),
  comarca: z.string().optional().nullable(),
  tribunal: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  juiz_id: z.string().optional().nullable(),
  valor_causa: z.number().optional().nullable(),
  valor_risco: z.number().optional().nullable(),
  cliente_id: z.string().min(1, "Cliente obrigatório"),
  advogado_responsavel_id: z.string().min(1, "Advogado responsável obrigatório"),
  projeto_id: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

type CaseFormData = z.infer<typeof caseSchema>

function formatCNJInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 20)
  if (digits.length <= 7) return digits
  let result = digits.slice(0, 7)
  if (digits.length > 7) result += "-" + digits.slice(7, 9)
  if (digits.length > 9) result += "." + digits.slice(9, 13)
  if (digits.length > 13) result += "." + digits.slice(13, 14)
  if (digits.length > 14) result += "." + digits.slice(14, 16)
  if (digits.length > 16) result += "." + digits.slice(16, 20)
  return result
}

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function formatCurrencyInput(value: number | null | undefined): string {
  if (value == null) return ""
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CaseForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [valorCausaStr, setValorCausaStr] = useState("")
  const [valorRiscoStr, setValorRiscoStr] = useState("")
  const [cnj, setCnj] = useState("")

  const { data: users } = trpc.users.list.useQuery()
  const { data: projectsData } = trpc.projects.list.useQuery({ limit: 100 })
  const utils = trpc.useUtils()

  const createCase = trpc.cases.create.useMutation({
    onSuccess: (data) => {
      utils.cases.list.invalidate()
      router.push(`/processos/${data.id}`)
    },
  })

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      tipo: "",
      status: "ATIVO",
      cliente_id: "",
      advogado_responsavel_id: "",
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form

  const onSubmit = async (data: CaseFormData) => {
    setSaving(true)
    try {
      await createCase.mutateAsync({
        ...data,
        numero_processo: cnj ? cnj.replace(/\D/g, "") : null,
        valor_causa: parseCurrency(valorCausaStr),
        valor_risco: parseCurrency(valorRiscoStr),
      })
    } catch {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Processo</h1>
          <p className="text-[#666666]">Cadastre um novo processo judicial.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Processo"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificacao do Processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero_processo">Numero do Processo (CNJ)</Label>
              <Input
                id="numero_processo"
                placeholder="NNNNNNN-DD.AAAA.J.TR.OOOO"
                value={cnj}
                onChange={(e) => setCnj(formatCNJInput(e.target.value))}
              />
              <p className="text-xs text-[#666666]">Opcional para processos em fase de distribuicao.</p>
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={watch("tipo")} onValueChange={(v) => setValue("tipo", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-xs text-[#DC3545]">{errors.tipo.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status") || "ATIVO"} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fase_processual">Fase Processual</Label>
              <Input id="fase_processual" {...register("fase_processual")} placeholder="Ex: Conhecimento, Execucao..." />
            </div>
          </CardContent>
        </Card>

        {/* Court Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Juizo e Localidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vara">Vara</Label>
              <Input id="vara" {...register("vara")} placeholder="Ex: 1a Vara Civel" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comarca">Comarca</Label>
                <Input id="comarca" {...register("comarca")} placeholder="Ex: Maringa" />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={watch("uf") || ""} onValueChange={(v) => setValue("uf", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribunal">Tribunal</Label>
              <Input id="tribunal" {...register("tribunal")} placeholder="Ex: TJPR, TRF4" />
            </div>

            <div className="space-y-2">
              <Label>Juiz</Label>
              <PersonCombobox
                value={watch("juiz_id") || undefined}
                onSelect={(id) => setValue("juiz_id", id)}
                tipo="JUIZ"
                placeholder="Selecionar juiz..."
              />
            </div>
          </CardContent>
        </Card>

        {/* People */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pessoas Envolvidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <PersonCombobox
                value={watch("cliente_id") || undefined}
                onSelect={(id) => setValue("cliente_id", id, { shouldValidate: true })}
                tipo="CLIENTE"
                placeholder="Buscar cliente..."
              />
              {errors.cliente_id && <p className="text-xs text-[#DC3545]">{errors.cliente_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Advogado Responsavel *</Label>
              <Select
                value={watch("advogado_responsavel_id")}
                onValueChange={(v) => setValue("advogado_responsavel_id", v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar advogado" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.oab_number && `(OAB ${u.oab_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.advogado_responsavel_id && (
                <p className="text-xs text-[#DC3545]">{errors.advogado_responsavel_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial & Project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valores e Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_causa">Valor da Causa (R$)</Label>
                <Input
                  id="valor_causa"
                  placeholder="0,00"
                  value={valorCausaStr}
                  onChange={(e) => setValorCausaStr(e.target.value)}
                  className="text-right font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_risco">Valor de Risco (R$)</Label>
                <Input
                  id="valor_risco"
                  placeholder="0,00"
                  value={valorRiscoStr}
                  onChange={(e) => setValorRiscoStr(e.target.value)}
                  className="text-right font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Projeto Vinculado</Label>
              <Select
                value={watch("projeto_id") || ""}
                onValueChange={(v) => setValue("projeto_id", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum projeto" /></SelectTrigger>
                <SelectContent>
                  {projectsData?.items?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} — {p.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
