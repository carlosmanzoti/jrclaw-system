"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  FileText,
  Scale,
  Gavel,
  Briefcase,
  MessageSquare,
  Search,
  Calculator,
  BookOpen,
  ScrollText,
  Handshake,
  ChevronRight,
} from "lucide-react"

const DOC_ACTIONS = {
  "Peças Processuais": [
    { label: "Petição Inicial", tipo: "PETICAO_INICIAL", icon: FileText },
    { label: "Contestação", tipo: "CONTESTACAO", icon: FileText },
    { label: "Embargos de Declaração", tipo: "EMBARGOS_DECLARACAO", icon: FileText },
    { label: "Agravo de Instrumento", tipo: "AGRAVO_INSTRUMENTO", icon: Scale },
    { label: "Apelação", tipo: "APELACAO", icon: Scale },
    { label: "Recurso Especial", tipo: "RECURSO_ESPECIAL", icon: Scale },
  ],
  "Recuperação Judicial": [
    { label: "Plano de RJ", tipo: "PLANO_RJ", icon: Gavel },
    { label: "Habilitação de Crédito", tipo: "HABILITACAO_CREDITO", icon: Gavel },
    { label: "Impugnação de Crédito", tipo: "IMPUGNACAO_CREDITO", icon: Gavel },
    { label: "Relatório AJ", tipo: "RELATORIO_AJ", icon: Gavel },
  ],
  "Documentos Consultivos": [
    { label: "Parecer", tipo: "PARECER", icon: Briefcase },
    { label: "Notificação", tipo: "NOTIFICACAO_EXTRAJUDICIAL", icon: ScrollText },
    { label: "E-mail Formal", tipo: "EMAIL_FORMAL", icon: MessageSquare },
    { label: "Contrato", tipo: "CONTRATO_GENERICO", icon: Handshake },
  ],
  "Ferramentas de Análise": [
    { label: "Resumir Processo", tipo: "RESUMIR_PROCESSO", icon: Search, isAction: true },
    { label: "Analisar Decisão", tipo: "ANALISAR_DECISAO", icon: Search, isAction: true },
    { label: "Gerar Cronologia", tipo: "GERAR_CRONOLOGIA", icon: BookOpen, isAction: true },
    { label: "Analisar Contrato", tipo: "ANALISAR_CONTRATO", icon: Search, isAction: true },
    { label: "Calcular Crédito", tipo: "CALCULAR_CREDITO", icon: Calculator, isAction: true },
  ],
}

interface ConfeccaoSidebarProps {
  caseId: string
  projectId: string
  onCaseChange: (id: string) => void
  onProjectChange: (id: string) => void
  onDocAction: (tipo: string, isAction?: boolean) => void
  tom: string
  onTomChange: (tom: string) => void
  destinatario: string
  onDestinatarioChange: (d: string) => void
  incluirJurisprudencia: boolean
  onIncluirJurisprudenciaChange: (v: boolean) => void
  incluirModelos: boolean
  onIncluirModelosChange: (v: boolean) => void
  modoDetalhado: boolean
  onModoDetalhadoChange: (v: boolean) => void
}

export function ConfeccaoSidebar({
  caseId,
  projectId,
  onCaseChange,
  onProjectChange,
  onDocAction,
  tom,
  onTomChange,
  destinatario,
  onDestinatarioChange,
  incluirJurisprudencia,
  onIncluirJurisprudenciaChange,
  incluirModelos,
  onIncluirModelosChange,
  modoDetalhado,
  onModoDetalhadoChange,
}: ConfeccaoSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: cases } = trpc.confeccao.casesForSelect.useQuery()
  const { data: projects } = trpc.confeccao.projectsForSelect.useQuery()

  const { data: caseContext } = trpc.confeccao.caseContext.useQuery(
    { caseId },
    { enabled: !!caseId }
  )
  const { data: projectContext } = trpc.confeccao.projectContext.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="space-y-4 p-4">
        {/* Context Binding */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Processo vinculado</Label>
          <Select value={caseId} onValueChange={onCaseChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {cases?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.numero_processo} — {c.cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Projeto vinculado</Label>
          <Select value={projectId} onValueChange={onProjectChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.codigo} — {p.cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Context Card */}
        {(caseContext || projectContext) && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium w-full hover:text-primary">
              <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
              Contexto Carregado
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded border p-2 text-xs space-y-1 bg-[#F7F3F1]">
                {caseContext && (
                  <>
                    <p><strong>Processo:</strong> {caseContext.numero_processo}</p>
                    <p><strong>Tipo:</strong> {caseContext.tipo}</p>
                    <p><strong>Cliente:</strong> {caseContext.cliente?.nome}</p>
                    {caseContext.vara && <p><strong>Vara:</strong> {caseContext.vara}</p>}
                    {caseContext.partes?.length > 0 && (
                      <div>
                        <strong>Partes:</strong>
                        {caseContext.partes.map((p, i) => (
                          <span key={i} className="block ml-2">{p.role}: {p.person.nome}</span>
                        ))}
                      </div>
                    )}
                    {caseContext.credores && caseContext.credores.length > 0 && (
                      <p><strong>Credores:</strong> {caseContext.credores.length}</p>
                    )}
                  </>
                )}
                {projectContext && (
                  <>
                    <p><strong>Projeto:</strong> {projectContext.codigo} — {projectContext.titulo}</p>
                    <p><strong>Status:</strong> {projectContext.status}</p>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Quick Actions */}
        {Object.entries(DOC_ACTIONS).map(([group, actions]) => (
          <div key={group}>
            <p className="text-[10px] font-semibold uppercase text-[#666666] mb-1">{group}</p>
            <div className="space-y-0.5">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.tipo}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-xs"
                    onClick={() => onDocAction(action.tipo, (action as any).isAction)}
                  >
                    <Icon className="size-3 mr-1.5 shrink-0" />
                    {action.label}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium w-full hover:text-primary">
            <ChevronDown className={`size-3 transition-transform ${settingsOpen ? "" : "-rotate-90"}`} />
            Configurações Rápidas
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Incluir jurisprudência</Label>
                <Switch
                  checked={incluirJurisprudencia}
                  onCheckedChange={onIncluirJurisprudenciaChange}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Incluir modelos internos</Label>
                <Switch
                  checked={incluirModelos}
                  onCheckedChange={onIncluirModelosChange}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Modo detalhado</Label>
                <Switch
                  checked={modoDetalhado}
                  onCheckedChange={onModoDetalhadoChange}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tom do documento</Label>
                <Select value={tom} onValueChange={onTomChange}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combativo">Combativo</SelectItem>
                    <SelectItem value="tecnico">Técnico-Neutro</SelectItem>
                    <SelectItem value="conciliatorio">Conciliatório</SelectItem>
                    <SelectItem value="didatico">Didático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destinatário</Label>
                <Select value={destinatario} onValueChange={onDestinatarioChange}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Juiz">Juiz</SelectItem>
                    <SelectItem value="Tribunal">Tribunal</SelectItem>
                    <SelectItem value="Credor">Credor</SelectItem>
                    <SelectItem value="Cliente">Cliente</SelectItem>
                    <SelectItem value="Contraparte">Contraparte</SelectItem>
                    <SelectItem value="Interno">Interno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
