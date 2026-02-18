"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Building2,
  Car,
  Landmark,
  Users,
  Bitcoin,
  Globe,
  Fingerprint,
  Shield,
  Plane,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"

import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

// ===================== TYPES =====================

interface InvestigationWizardProps {
  recoveryCaseId: string
  devedorNome?: string
  devedorCpfCnpj?: string
  devedorTipo?: string
  onClose: () => void
  onSuccess?: () => void
}

type InvestigationType = "COMPLETA" | "COMPLEMENTAR" | "ATUALIZACAO" | "URGENTE"

interface ScopeItem {
  id: string
  label: string
  description: string
  systems: string[]
  icon: React.ReactNode
  defaultChecked: boolean
  estimatedDays: number
}

interface CorresponsavelEntry {
  id: string
  nome: string
  cpfCnpj: string
}

interface PlannedSearch {
  id: string
  included: boolean
  sistema: string
  tipoConsulta: string
  cpfCnpj: string
  alvoNome: string
  description: string
  notes: string
  scopeId: string
}

// ===================== CONSTANTS =====================

const INVESTIGATION_TYPES: { value: InvestigationType; label: string; description: string }[] = [
  {
    value: "COMPLETA",
    label: "Completa",
    description: "Investigacao patrimonial abrangente cobrindo todos os escopos selecionados",
  },
  {
    value: "COMPLEMENTAR",
    label: "Complementar",
    description: "Complemento a investigacao anterior com escopos adicionais",
  },
  {
    value: "ATUALIZACAO",
    label: "Atualizacao",
    description: "Atualizacao periodica de dados ja levantados anteriormente",
  },
  {
    value: "URGENTE",
    label: "Urgente",
    description: "Investigacao prioritaria com prazo reduzido para medidas cautelares",
  },
]

const SCOPE_ITEMS: ScopeItem[] = [
  {
    id: "imoveis",
    label: "Imoveis",
    description: "Consulta de matriculas, registros e transferencias imobiliarias",
    systems: ["CRI", "CNIB", "ARISP", "InfoJud-DOI"],
    icon: <Building2 className="size-4" />,
    defaultChecked: true,
    estimatedDays: 5,
  },
  {
    id: "veiculos",
    label: "Veiculos",
    description: "Consulta de veiculos registrados em nome do devedor e corresponsaveis",
    systems: ["RENAJUD", "DETRAN"],
    icon: <Car className="size-4" />,
    defaultChecked: true,
    estimatedDays: 3,
  },
  {
    id: "contas_aplicacoes",
    label: "Contas e aplicacoes",
    description: "Rastreamento de contas bancarias, investimentos e aplicacoes financeiras",
    systems: ["SISBAJUD", "CCS-Bacen"],
    icon: <Landmark className="size-4" />,
    defaultChecked: true,
    estimatedDays: 4,
  },
  {
    id: "participacoes",
    label: "Participacoes societarias",
    description: "Identificacao de empresas vinculadas, participacoes e grupo economico",
    systems: ["Junta Comercial", "Receita Federal"],
    icon: <Users className="size-4" />,
    defaultChecked: true,
    estimatedDays: 4,
  },
  {
    id: "socios_grupo",
    label: "Socios e grupo economico",
    description: "Mapeamento de socios, procuradores, representantes e interligacoes",
    systems: ["SNIPER", "Neoway"],
    icon: <Fingerprint className="size-4" />,
    defaultChecked: true,
    estimatedDays: 5,
  },
  {
    id: "criptoativos",
    label: "Criptoativos",
    description: "Rastreamento de criptomoedas e ativos digitais em exchanges nacionais",
    systems: ["CriptoJud", "Exchanges"],
    icon: <Bitcoin className="size-4" />,
    defaultChecked: false,
    estimatedDays: 7,
  },
  {
    id: "exterior",
    label: "Ativos no exterior",
    description: "Investigacao de patrimonio no exterior via cooperacao internacional",
    systems: ["DRCI", "MLAT"],
    icon: <Globe className="size-4" />,
    defaultChecked: false,
    estimatedDays: 30,
  },
  {
    id: "osint",
    label: "OSINT e redes sociais",
    description: "Inteligencia em fontes abertas, redes sociais e presenca digital",
    systems: ["OSINT Tools", "Redes Sociais"],
    icon: <Search className="size-4" />,
    defaultChecked: false,
    estimatedDays: 5,
  },
  {
    id: "marcas_patentes",
    label: "Marcas e patentes",
    description: "Consulta de marcas, patentes, desenhos industriais e programas de computador",
    systems: ["INPI"],
    icon: <Shield className="size-4" />,
    defaultChecked: false,
    estimatedDays: 3,
  },
  {
    id: "aeronaves_embarcacoes",
    label: "Aeronaves e embarcacoes",
    description: "Consulta de aeronaves registradas na ANAC e embarcacoes no Tribunal Maritimo",
    systems: ["ANAC", "Tribunal Maritimo"],
    icon: <Plane className="size-4" />,
    defaultChecked: false,
    estimatedDays: 5,
  },
]

// ===================== HELPER: generate searches =====================

function generateSearchesForScope(
  scope: ScopeItem,
  cpfCnpj: string,
  nome: string,
  alvoId: string
): PlannedSearch[] {
  const searches: PlannedSearch[] = []
  const baseId = `${scope.id}-${alvoId}`

  switch (scope.id) {
    case "imoveis":
      searches.push(
        {
          id: `${baseId}-cri`,
          included: true,
          sistema: "CRI",
          tipoConsulta: "Pesquisa de matriculas imobiliarias",
          cpfCnpj,
          alvoNome: nome,
          description: `CRI -- Pesquisa de matriculas -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-cnib`,
          included: true,
          sistema: "CNIB",
          tipoConsulta: "Central de Indisponibilidade de Bens",
          cpfCnpj,
          alvoNome: nome,
          description: `CNIB -- Consulta de indisponibilidades -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-arisp`,
          included: true,
          sistema: "ARISP",
          tipoConsulta: "Central de Registradores de Imoveis",
          cpfCnpj,
          alvoNome: nome,
          description: `ARISP -- Registros imobiliarios -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        }
      )
      break

    case "veiculos":
      searches.push(
        {
          id: `${baseId}-renajud`,
          included: true,
          sistema: "RENAJUD",
          tipoConsulta: "Consulta de veiculos",
          cpfCnpj,
          alvoNome: nome,
          description: `RENAJUD -- Consulta de veiculos -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-detran`,
          included: true,
          sistema: "DETRAN",
          tipoConsulta: "Pesquisa de veiculos registrados",
          cpfCnpj,
          alvoNome: nome,
          description: `DETRAN -- Veiculos registrados -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        }
      )
      break

    case "contas_aplicacoes":
      searches.push(
        {
          id: `${baseId}-sisbajud`,
          included: true,
          sistema: "SISBAJUD",
          tipoConsulta: "Requisicao de informacoes financeiras",
          cpfCnpj,
          alvoNome: nome,
          description: `SISBAJUD -- Requisicao de informacoes -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-ccs`,
          included: true,
          sistema: "CCS-Bacen",
          tipoConsulta: "Cadastro de Clientes do SFN",
          cpfCnpj,
          alvoNome: nome,
          description: `CCS-Bacen -- Cadastro de clientes -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        }
      )
      break

    case "participacoes":
      searches.push(
        {
          id: `${baseId}-junta`,
          included: true,
          sistema: "Junta Comercial",
          tipoConsulta: "Consulta de participacoes societarias",
          cpfCnpj,
          alvoNome: nome,
          description: `Junta Comercial -- Participacoes -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-rf`,
          included: true,
          sistema: "Receita Federal",
          tipoConsulta: "QSA e vinculos empresariais",
          cpfCnpj,
          alvoNome: nome,
          description: `Receita Federal -- QSA -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        }
      )
      break

    case "socios_grupo":
      searches.push(
        {
          id: `${baseId}-sniper`,
          included: true,
          sistema: "SNIPER",
          tipoConsulta: "Mapeamento de grupo economico",
          cpfCnpj,
          alvoNome: nome,
          description: `SNIPER -- Grupo economico -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-neoway`,
          included: true,
          sistema: "Neoway",
          tipoConsulta: "Analise de vinculos e interligacoes",
          cpfCnpj,
          alvoNome: nome,
          description: `Neoway -- Vinculos societarios -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        }
      )
      break

    case "criptoativos":
      searches.push({
        id: `${baseId}-criptojud`,
        included: true,
        sistema: "CriptoJud",
        tipoConsulta: "Rastreamento de criptoativos",
        cpfCnpj,
        alvoNome: nome,
        description: `CriptoJud -- Rastreamento de criptoativos -- ${cpfCnpj}`,
        notes: "",
        scopeId: scope.id,
      })
      break

    case "exterior":
      searches.push({
        id: `${baseId}-drci`,
        included: true,
        sistema: "DRCI",
        tipoConsulta: "Cooperacao internacional — ativos no exterior",
        cpfCnpj,
        alvoNome: nome,
        description: `DRCI/MLAT -- Ativos no exterior -- ${cpfCnpj}`,
        notes: "",
        scopeId: scope.id,
      })
      break

    case "osint":
      searches.push({
        id: `${baseId}-osint`,
        included: true,
        sistema: "OSINT",
        tipoConsulta: "Inteligencia em fontes abertas",
        cpfCnpj,
        alvoNome: nome,
        description: `OSINT -- Fontes abertas e redes sociais -- ${nome}`,
        notes: "",
        scopeId: scope.id,
      })
      break

    case "marcas_patentes":
      searches.push({
        id: `${baseId}-inpi`,
        included: true,
        sistema: "INPI",
        tipoConsulta: "Consulta de marcas e patentes",
        cpfCnpj,
        alvoNome: nome,
        description: `INPI -- Marcas e patentes -- ${cpfCnpj}`,
        notes: "",
        scopeId: scope.id,
      })
      break

    case "aeronaves_embarcacoes":
      searches.push(
        {
          id: `${baseId}-anac`,
          included: true,
          sistema: "ANAC",
          tipoConsulta: "Consulta de aeronaves registradas",
          cpfCnpj,
          alvoNome: nome,
          description: `ANAC -- Aeronaves registradas -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        },
        {
          id: `${baseId}-tribmar`,
          included: true,
          sistema: "Tribunal Maritimo",
          tipoConsulta: "Consulta de embarcacoes",
          cpfCnpj,
          alvoNome: nome,
          description: `Tribunal Maritimo -- Embarcacoes -- ${cpfCnpj}`,
          notes: "",
          scopeId: scope.id,
        }
      )
      break
  }

  return searches
}

// ===================== STEPS =====================

const STEPS = [
  { number: 1, label: "Escopo" },
  { number: 2, label: "Buscas Planejadas" },
  { number: 3, label: "Revisao e Inicio" },
]

// ===================== COMPONENT =====================

export function InvestigationWizard({
  recoveryCaseId,
  devedorNome = "",
  devedorCpfCnpj = "",
  devedorTipo = "PESSOA_FISICA",
  onClose,
  onSuccess,
}: InvestigationWizardProps) {
  // ---------- Step state ----------
  const [currentStep, setCurrentStep] = useState(1)

  // ---------- Step 1 state ----------
  const [tipo, setTipo] = useState<InvestigationType>("COMPLETA")
  const [checkedScopes, setCheckedScopes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const scope of SCOPE_ITEMS) {
      initial[scope.id] = scope.defaultChecked
    }
    return initial
  })
  const [corresponsaveis, setCorresponsaveis] = useState<CorresponsavelEntry[]>([])
  const [newCorrespNome, setNewCorrespNome] = useState("")
  const [newCorrespCpfCnpj, setNewCorrespCpfCnpj] = useState("")

  // ---------- Step 2 state ----------
  const [plannedSearches, setPlannedSearches] = useState<PlannedSearch[]>([])
  const [searchesGenerated, setSearchesGenerated] = useState(false)

  // ---------- Step 3 state ----------
  const [responsavelId, setResponsavelId] = useState("")
  const [observacoes, setObservacoes] = useState("")

  // ---------- tRPC ----------
  const { data: users } = trpc.users.list.useQuery()
  const createInvestigation = trpc.recovery.investigations.create.useMutation()
  const bulkCreateSearches = trpc.recovery.searches.bulkCreate.useMutation()

  const [isSubmitting, setIsSubmitting] = useState(false)

  // ---------- Derived ----------
  const activeScopes = useMemo(() => {
    return SCOPE_ITEMS.filter((s) => checkedScopes[s.id])
  }, [checkedScopes])

  const estimatedDays = useMemo(() => {
    if (tipo === "URGENTE") {
      return Math.max(
        ...activeScopes.map((s) => Math.ceil(s.estimatedDays * 0.5)),
        1
      )
    }
    if (tipo === "ATUALIZACAO") {
      return Math.max(
        ...activeScopes.map((s) => Math.ceil(s.estimatedDays * 0.6)),
        1
      )
    }
    return Math.max(...activeScopes.map((s) => s.estimatedDays), 1)
  }, [activeScopes, tipo])

  const allTargets = useMemo(() => {
    const targets: { id: string; nome: string; cpfCnpj: string }[] = [
      { id: "principal", nome: devedorNome, cpfCnpj: devedorCpfCnpj },
    ]
    for (const c of corresponsaveis) {
      targets.push({ id: c.id, nome: c.nome, cpfCnpj: c.cpfCnpj })
    }
    return targets
  }, [devedorNome, devedorCpfCnpj, corresponsaveis])

  const includedSearches = useMemo(() => {
    return plannedSearches.filter((s) => s.included)
  }, [plannedSearches])

  const uniqueSystems = useMemo(() => {
    const systems = new Set<string>()
    for (const s of includedSearches) {
      systems.add(s.sistema)
    }
    return systems.size
  }, [includedSearches])

  // ---------- Handlers ----------

  const handleToggleScope = useCallback((scopeId: string) => {
    setCheckedScopes((prev) => ({ ...prev, [scopeId]: !prev[scopeId] }))
  }, [])

  const handleAddCorresponsavel = useCallback(() => {
    if (!newCorrespNome.trim()) return
    const entry: CorresponsavelEntry = {
      id: `corresp-${Date.now()}`,
      nome: newCorrespNome.trim(),
      cpfCnpj: newCorrespCpfCnpj.trim(),
    }
    setCorresponsaveis((prev) => [...prev, entry])
    setNewCorrespNome("")
    setNewCorrespCpfCnpj("")
  }, [newCorrespNome, newCorrespCpfCnpj])

  const handleRemoveCorresponsavel = useCallback((id: string) => {
    setCorresponsaveis((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const generateSearches = useCallback(() => {
    const searches: PlannedSearch[] = []
    for (const scope of activeScopes) {
      for (const target of allTargets) {
        const targetSearches = generateSearchesForScope(
          scope,
          target.cpfCnpj,
          target.nome,
          target.id
        )
        searches.push(...targetSearches)
      }
    }
    setPlannedSearches(searches)
    setSearchesGenerated(true)
  }, [activeScopes, allTargets])

  const handleToggleSearch = useCallback((searchId: string) => {
    setPlannedSearches((prev) =>
      prev.map((s) => (s.id === searchId ? { ...s, included: !s.included } : s))
    )
  }, [])

  const handleSearchNotesChange = useCallback((searchId: string, notes: string) => {
    setPlannedSearches((prev) =>
      prev.map((s) => (s.id === searchId ? { ...s, notes } : s))
    )
  }, [])

  const handleAddManualSearch = useCallback(() => {
    const newSearch: PlannedSearch = {
      id: `manual-${Date.now()}`,
      included: true,
      sistema: "",
      tipoConsulta: "",
      cpfCnpj: devedorCpfCnpj,
      alvoNome: devedorNome,
      description: "",
      notes: "",
      scopeId: "manual",
    }
    setPlannedSearches((prev) => [...prev, newSearch])
  }, [devedorCpfCnpj, devedorNome])

  const handleRemoveSearch = useCallback((searchId: string) => {
    setPlannedSearches((prev) => prev.filter((s) => s.id !== searchId))
  }, [])

  const handleUpdateManualSearch = useCallback(
    (searchId: string, field: keyof PlannedSearch, value: string) => {
      setPlannedSearches((prev) =>
        prev.map((s) => {
          if (s.id !== searchId) return s
          const updated = { ...s, [field]: value }
          if (field === "sistema" || field === "tipoConsulta" || field === "cpfCnpj") {
            updated.description = `${updated.sistema} -- ${updated.tipoConsulta} -- ${updated.cpfCnpj}`
          }
          return updated
        })
      )
    },
    []
  )

  const goToStep = useCallback(
    (step: number) => {
      if (step === 2 && !searchesGenerated) {
        generateSearches()
      }
      setCurrentStep(step)
    },
    [searchesGenerated, generateSearches]
  )

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // 1. Create investigation
      const fontes = [...new Set(includedSearches.map((s) => s.sistema))]

      const investigation = await createInvestigation.mutateAsync({
        recovery_case_id: recoveryCaseId,
        tipo,
        status: "SOLICITADA",
        responsavel_id: responsavelId || undefined,
        data_inicio: new Date(),
        observacoes: observacoes ? `${observacoes} | Fontes: ${fontes.join(", ")}` : `Fontes: ${fontes.join(", ")}`,
      })

      // 2. Create all planned searches
      if (includedSearches.length > 0) {
        await bulkCreateSearches.mutateAsync({
          investigation_id: investigation.id,
          cpf_cnpj_consultado: includedSearches[0]?.cpfCnpj || "",
          searches: includedSearches.map((s) => ({
            sistema: s.sistema,
            tipo_consulta: s.tipoConsulta || s.sistema,
            nome_consultado: s.alvoNome || undefined,
            status: "SOLICITADA",
            data_consulta: new Date(),
            observacoes: s.notes || undefined,
          })),
        })
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Failed to create investigation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    includedSearches,
    createInvestigation,
    bulkCreateSearches,
    recoveryCaseId,
    tipo,
    responsavelId,
    observacoes,
    onSuccess,
    onClose,
  ])

  // ---------- Step indicator ----------

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        {STEPS.map((step, idx) => (
          <div key={step.number} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (step.number < currentStep) goToStep(step.number)
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                currentStep === step.number
                  ? "bg-gold text-text-primary"
                  : step.number < currentStep
                    ? "bg-gold/20 text-gold cursor-pointer hover:bg-gold/30"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {step.number < currentStep ? (
                <Check className="size-4" />
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full border text-xs">
                  {step.number}
                </span>
              )}
              {step.label}
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    )
  }

  // ---------- Step 1: Escopo ----------

  function renderStep1() {
    return (
      <div className="space-y-6">
        {/* Investigation type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Investigacao</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as InvestigationType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVESTIGATION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col">
                    <span>{t.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {INVESTIGATION_TYPES.find((t) => t.value === tipo)?.description}
          </p>
        </div>

        {/* Target info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Alvo principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <p className="font-medium">{devedorNome || "Devedor nao identificado"}</p>
                <div className="flex items-center gap-2">
                  {devedorCpfCnpj && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {devedorCpfCnpj}
                    </Badge>
                  )}
                  {devedorTipo && (
                    <Badge variant="secondary" className="text-xs">
                      {devedorTipo === "PESSOA_FISICA" ? "Pessoa Fisica" : "Pessoa Juridica"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Corresponsaveis */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Corresponsaveis (opcional)</Label>
          {corresponsaveis.length > 0 && (
            <div className="space-y-2">
              {corresponsaveis.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.nome}</p>
                    {c.cpfCnpj && (
                      <p className="text-xs text-muted-foreground font-mono">{c.cpfCnpj}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveCorresponsavel(c.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={newCorrespNome}
                onChange={(e) => setNewCorrespNome(e.target.value)}
                placeholder="Nome do corresponsavel"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
              <Input
                value={newCorrespCpfCnpj}
                onChange={(e) => setNewCorrespCpfCnpj(e.target.value)}
                placeholder="CPF ou CNPJ"
                className="h-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCorresponsavel}
              disabled={!newCorrespNome.trim()}
            >
              <Plus className="size-3.5" />
              Adicionar
            </Button>
          </div>
        </div>

        <Separator />

        {/* Scope checkboxes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Escopos da investigacao</Label>
            <span className="text-xs text-muted-foreground">
              {activeScopes.length} de {SCOPE_ITEMS.length} selecionados
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {SCOPE_ITEMS.map((scope) => {
              const isChecked = checkedScopes[scope.id] || false
              return (
                <div
                  key={scope.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
                    isChecked
                      ? "border-gold/50 bg-gold-lighter"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                  onClick={() => handleToggleScope(scope.id)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleToggleScope(scope.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gold">{scope.icon}</span>
                      <span className="text-sm font-medium">{scope.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {scope.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {scope.systems.map((sys) => (
                        <Badge key={sys} variant="outline" className="text-[10px] h-5 px-1.5">
                          {sys}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      ~{scope.estimatedDays}d
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Estimated timeframe */}
        <Card className="bg-gold-lighter border-gold/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-gold" />
              <div>
                <p className="text-sm font-medium">Prazo estimado</p>
                <p className="text-xs text-muted-foreground">
                  Aproximadamente {estimatedDays} dias uteis para {activeScopes.length} escopo(s)
                  {tipo === "URGENTE" && " (prazo reduzido por urgencia)"}
                  {corresponsaveis.length > 0 &&
                    ` em ${allTargets.length} alvos`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- Step 2: Planned Searches ----------

  function renderStep2() {
    const groupedByScope: Record<string, PlannedSearch[]> = {}
    for (const s of plannedSearches) {
      if (!groupedByScope[s.scopeId]) groupedByScope[s.scopeId] = []
      groupedByScope[s.scopeId].push(s)
    }

    return (
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium">
            {includedSearches.length} buscas em {uniqueSystems} sistemas
          </p>
          <Button variant="outline" size="sm" onClick={handleAddManualSearch}>
            <Plus className="size-3.5" />
            Adicionar busca manual
          </Button>
        </div>

        {/* Grouped searches */}
        <div className="space-y-4">
          {Object.entries(groupedByScope).map(([scopeId, searches]) => {
            const scopeItem = SCOPE_ITEMS.find((s) => s.id === scopeId)
            const scopeLabel = scopeItem?.label || "Buscas manuais"

            return (
              <div key={scopeId} className="space-y-2">
                <div className="flex items-center gap-2">
                  {scopeItem && (
                    <span className="text-gold">{scopeItem.icon}</span>
                  )}
                  <h4 className="text-sm font-medium">{scopeLabel}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {searches.filter((s) => s.included).length}/{searches.length}
                  </Badge>
                </div>

                {searches.map((search) => (
                  <div
                    key={search.id}
                    className={cn(
                      "rounded-md border p-3 space-y-2 transition-colors",
                      search.included
                        ? "border-border bg-background"
                        : "border-border/50 bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={search.included}
                        onCheckedChange={() => handleToggleSearch(search.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        {search.scopeId === "manual" ? (
                          // Editable manual search
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">
                                Sistema
                              </Label>
                              <Input
                                value={search.sistema}
                                onChange={(e) =>
                                  handleUpdateManualSearch(search.id, "sistema", e.target.value)
                                }
                                placeholder="Ex: SISBAJUD"
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">
                                Tipo de consulta
                              </Label>
                              <Input
                                value={search.tipoConsulta}
                                onChange={(e) =>
                                  handleUpdateManualSearch(
                                    search.id,
                                    "tipoConsulta",
                                    e.target.value
                                  )
                                }
                                placeholder="Tipo da consulta"
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">
                                CPF/CNPJ
                              </Label>
                              <Input
                                value={search.cpfCnpj}
                                onChange={(e) =>
                                  handleUpdateManualSearch(search.id, "cpfCnpj", e.target.value)
                                }
                                placeholder="CPF ou CNPJ"
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          // Auto-generated search (read-only)
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px]">
                              {search.sistema}
                            </Badge>
                            <span className="text-sm">{search.tipoConsulta}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {search.cpfCnpj}
                            </span>
                            {search.alvoNome &&
                              search.alvoNome !== devedorNome && (
                                <Badge variant="outline" className="text-[10px]">
                                  {search.alvoNome}
                                </Badge>
                              )}
                          </div>
                        )}

                        {/* Notes field */}
                        <Input
                          value={search.notes}
                          onChange={(e) =>
                            handleSearchNotesChange(search.id, e.target.value)
                          }
                          placeholder="Observacoes da busca (opcional)"
                          className="h-7 text-xs"
                        />
                      </div>

                      {search.scopeId === "manual" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveSearch(search.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {plannedSearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma busca planejada. Volte ao passo anterior e selecione escopos.
            </p>
          </div>
        )}
      </div>
    )
  }

  // ---------- Step 3: Review ----------

  function renderStep3() {
    return (
      <div className="space-y-6">
        {/* Summary card */}
        <Card className="border-gold/30 bg-gold-lighter">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gold">{includedSearches.length}</p>
                <p className="text-xs text-muted-foreground">Buscas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gold">{uniqueSystems}</p>
                <p className="text-xs text-muted-foreground">Sistemas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gold">{allTargets.length}</p>
                <p className="text-xs text-muted-foreground">Alvos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Type and estimated time */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium mt-0.5">
                {INVESTIGATION_TYPES.find((t) => t.value === tipo)?.label}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-gold" />
                <div>
                  <p className="text-xs text-muted-foreground">Prazo estimado</p>
                  <p className="text-sm font-medium mt-0.5">~{estimatedDays} dias uteis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Targets summary */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alvos</Label>
          <div className="space-y-1.5">
            {allTargets.map((target, idx) => (
              <div
                key={target.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Badge
                  variant={idx === 0 ? "default" : "outline"}
                  className={cn("text-[10px]", idx === 0 && "bg-gold text-text-primary")}
                >
                  {idx === 0 ? "Principal" : "Corresponsavel"}
                </Badge>
                <span className="font-medium">{target.nome}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {target.cpfCnpj}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scopes summary */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Escopos selecionados</Label>
          <div className="flex flex-wrap gap-1.5">
            {activeScopes.map((scope) => (
              <Badge key={scope.id} variant="secondary" className="text-xs gap-1">
                {scope.icon}
                {scope.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Systems summary */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sistemas consultados</Label>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(includedSearches.map((s) => s.sistema))].map((sys) => (
              <Badge
                key={sys}
                className="bg-gold/20 text-gold border-gold/30 text-xs"
              >
                {sys}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Responsavel */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Responsavel</Label>
          <Select value={responsavelId} onValueChange={setResponsavelId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o responsavel" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user: { id: string; name: string; email: string }) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Observacoes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Observacoes</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Instrucoes adicionais, prioridades, contexto relevante..."
            className="min-h-20 text-sm"
          />
        </div>

        {/* Warning for urgente */}
        {tipo === "URGENTE" && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Investigacao urgente
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O prazo sera reduzido e as buscas terao prioridade maxima. Certifique-se
                    de que ha fundamento para medidas cautelares.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ---------- Render ----------

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5 text-gold" />
            Nova Investigacao Patrimonial
          </DialogTitle>
          <DialogDescription>
            Configure o escopo, revise as buscas planejadas e inicie a investigacao.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="px-6 shrink-0">
          <StepIndicator />
        </div>

        <Separator />

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToStep(currentStep - 1)}
                disabled={isSubmitting}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>

            {currentStep < 3 ? (
              <Button
                size="sm"
                onClick={() => goToStep(currentStep + 1)}
                disabled={currentStep === 1 && activeScopes.length === 0}
                className="bg-gold text-text-primary hover:bg-gold/90"
              >
                Proximo
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || includedSearches.length === 0}
                className="bg-gold text-text-primary hover:bg-gold/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Iniciar Investigacao
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
