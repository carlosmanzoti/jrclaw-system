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
import { trpc } from "@/lib/trpc"
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants"

const ACTIVITY_GROUPS: Record<string, string[]> = {
  "Jurídicas": ["PETICAO", "AUDIENCIA", "SUSTENTACAO", "DESPACHO", "PESQUISA", "ANALISE", "DILIGENCIA"],
  "Comunicação": ["REUNIAO", "EMAIL", "TELEFONEMA", "NEGOCIACAO"],
  "Gerenciais": ["TAREFA_PROJETO", "MARCO_ALCANCADO"],
  "Outras": ["OUTRO"],
}

interface ActivityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activityId?: string | null
  defaultCaseId?: string
  defaultProjectId?: string
  defaultPersonId?: string
}

export function ActivityForm({
  open,
  onOpenChange,
  activityId,
  defaultCaseId,
  defaultProjectId,
  defaultPersonId,
}: ActivityFormProps) {
  const utils = trpc.useUtils()
  const isEdit = !!activityId

  const [tipo, setTipo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [resultado, setResultado] = useState("")
  const [data, setData] = useState("")
  const [duracaoMinutos, setDuracaoMinutos] = useState("")
  const [caseId, setCaseId] = useState(defaultCaseId || "")
  const [projectId, setProjectId] = useState(defaultProjectId || "")
  const [personId, setPersonId] = useState(defaultPersonId || "")
  const [visivelPortal, setVisivelPortal] = useState(false)
  const [faturavel, setFaturavel] = useState(true)
  const [includeInReport, setIncludeInReport] = useState(true)
  const [reportPriority, setReportPriority] = useState("0")
  const [financialImpact, setFinancialImpact] = useState("")
  const [financialType, setFinancialType] = useState("")
  const [communicationType, setCommunicationType] = useState("")
  const [recipients, setRecipients] = useState("")

  const { data: cases } = trpc.documents.casesForSelect.useQuery()
  const { data: projects } = trpc.documents.projectsForSelect.useQuery()

  const createMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      utils.activities.list.invalidate()
      onOpenChange(false)
    },
  })

  const updateMutation = trpc.activities.update.useMutation({
    onSuccess: () => {
      utils.activities.list.invalidate()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) return
    if (!isEdit) {
      setTipo("")
      setDescricao("")
      setResultado("")
      setData(new Date().toISOString().slice(0, 16))
      setDuracaoMinutos("")
      setCaseId(defaultCaseId || "")
      setProjectId(defaultProjectId || "")
      setPersonId(defaultPersonId || "")
      setVisivelPortal(false)
      setFaturavel(true)
      setIncludeInReport(true)
      setReportPriority("0")
      setFinancialImpact("")
      setFinancialType("")
      setCommunicationType("")
      setRecipients("")
    }
  }, [open, isEdit, defaultCaseId, defaultProjectId, defaultPersonId])

  const isFinancialType = ["LIBERACAO_ALVARA", "EXPEDICAO_RPV", "PAGAMENTO_RECEBIDO"].some(
    (t) => tipo.includes(t) || tipo.includes("NEGOCIACAO")
  )
  const isCommunicationType = ["EMAIL", "TELEFONEMA", "REUNIAO"].some((t) => tipo.includes(t))
  const isReuniao = tipo.includes("REUNIAO")

  const handleSubmit = () => {
    if (!tipo || !descricao || !data) return

    const payload = {
      tipo,
      descricao,
      resultado: resultado || undefined,
      data: new Date(data),
      duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos) : undefined,
      case_id: caseId && caseId !== "none" ? caseId : null,
      project_id: projectId && projectId !== "none" ? projectId : null,
      person_id: personId || null,
      visivel_portal: visivelPortal,
      faturavel,
      include_in_report: includeInReport,
      report_priority: parseInt(reportPriority),
      financial_impact: financialImpact ? parseFloat(financialImpact) : undefined,
      financial_type: financialType || undefined,
      communication_type: communicationType || undefined,
      recipients: recipients ? recipients.split(",").map((r) => r.trim()) : [],
    }

    if (isEdit) {
      updateMutation.mutate({ id: activityId!, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Atividade" : "Registrar Atividade"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_GROUPS).map(([group, types]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTIVITY_TYPE_LABELS[t] || t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva a atividade..."
                rows={3}
              />
            </div>

            {/* Date + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data/Hora *</Label>
                <Input
                  type="datetime-local"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              {(isReuniao || isCommunicationType) && (
                <div className="space-y-1.5">
                  <Label>Duração (min)</Label>
                  <Input
                    type="number"
                    value={duracaoMinutos}
                    onChange={(e) => setDuracaoMinutos(e.target.value)}
                    placeholder="60"
                  />
                </div>
              )}
            </div>

            {/* Result */}
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <Textarea
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder="Resultado ou observações..."
                rows={2}
              />
            </div>

            {/* Linkage */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Vinculação</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Processo</Label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {cases?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero_processo} — {c.cliente?.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Projeto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo} — {p.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Communication fields */}
            {isCommunicationType && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Comunicação</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de comunicação</Label>
                  <Select value={communicationType} onValueChange={setCommunicationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">E-mail</SelectItem>
                      <SelectItem value="TELEFONE">Telefone</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                      <SelectItem value="VIRTUAL">Virtual</SelectItem>
                      <SelectItem value="COMUNICADO">Comunicado</SelectItem>
                      <SelectItem value="RELATORIO">Relatório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Destinatários (separados por vírgula)</Label>
                  <Input
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="nome@email.com, outro@email.com"
                  />
                </div>
              </div>
            )}

            {/* Financial fields */}
            {isFinancialType && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Impacto Financeiro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={financialImpact}
                      onChange={(e) => setFinancialImpact(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo financeiro</Label>
                    <Select value={financialType} onValueChange={setFinancialType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alvara">Alvará</SelectItem>
                        <SelectItem value="rpv">RPV</SelectItem>
                        <SelectItem value="precatorio">Precatório</SelectItem>
                        <SelectItem value="acordo">Acordo</SelectItem>
                        <SelectItem value="pagamento">Pagamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Report & visibility options */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Incluir no relatório</Label>
                <Switch checked={includeInReport} onCheckedChange={setIncludeInReport} />
              </div>
              {includeInReport && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Prioridade no relatório</Label>
                  <Select value={reportPriority} onValueChange={setReportPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">Destaque ⭐</SelectItem>
                      <SelectItem value="2">Crítico 🔥</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Visível no portal do cliente</Label>
                <Switch checked={visivelPortal} onCheckedChange={setVisivelPortal} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Faturável</Label>
                <Switch checked={faturavel} onCheckedChange={setFaturavel} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!tipo || !descricao || !data || isLoading}>
            {isLoading ? "Salvando..." : isEdit ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
