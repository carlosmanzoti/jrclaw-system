"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Plus,
  Star,
  Pencil,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  Heart,
  Globe,
  Briefcase,
  MessageSquare,
  Trash2,
  CalendarDays,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  SOCIO: "Socio",
  SOCIO_ADMINISTRADOR: "Socio-Administrador",
  SOCIO_MINORITARIO: "Socio Minoritario",
  ACIONISTA: "Acionista",
  CONSELHEIRO: "Conselheiro",
  CEO: "CEO / Diretor Presidente",
  CFO: "CFO / Diretor Financeiro",
  COO: "COO / Diretor Operacional",
  DIRETOR: "Diretor",
  GERENTE_GERAL: "Gerente Geral",
  GERENTE: "Gerente",
  SUPERVISOR: "Supervisor",
  FUNCIONARIO: "Funcionario",
  CONTADOR_OP: "Contador",
  ADVOGADO_INTERNO: "Advogado Interno",
  CONSULTOR_EXT: "Consultor Externo",
  PREPOSTO: "Preposto",
  CONJUGE: "Conjuge",
  FILHO: "Filho(a)",
  PAI_MAE: "Pai / Mae",
  IRMAO: "Irmao(a)",
  PARENTE: "Parente",
  POLITICO: "Politico",
  CREDOR_CHAVE: "Credor Principal",
  FORNECEDOR_CHAVE: "Fornecedor Estrategico",
  PARCEIRO_COMERCIAL: "Parceiro Comercial",
  AGENTE_FINANCEIRO: "Agente Financeiro",
  CORRETOR: "Corretor",
  DESPACHANTE: "Despachante",
  PERITO_REL: "Perito",
  MEDIADOR: "Mediador",
  ARBITRO: "Arbitro",
  LEILOEIRO: "Leiloeiro",
  TRADUTOR: "Tradutor Juramentado",
  OUTRO_REL: "Outro",
}

const INFLUENCE_LEVEL_CONFIG: Record<
  string,
  { label: string; borderClass: string; badgeClass: string; badgeText: string }
> = {
  CRITICO: {
    label: "Critico",
    borderClass: "border-red-500",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    badgeText: "CRITICO",
  },
  ALTO_INF: {
    label: "Alto",
    borderClass: "border-orange-500",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    badgeText: "ALTO",
  },
  MEDIO_INF: {
    label: "Medio",
    borderClass: "border-yellow-500",
    badgeClass:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    badgeText: "MEDIO",
  },
  BAIXO_INF: {
    label: "Baixo",
    borderClass: "border-green-500",
    badgeClass:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    badgeText: "BAIXO",
  },
  INFORMATIVO: {
    label: "Informativo",
    borderClass: "border-blue-500",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    badgeText: "INFO",
  },
}

const INFLUENCE_LEVELS = Object.keys(INFLUENCE_LEVEL_CONFIG)

const CONTACT_FREQUENCY_LABELS: Record<string, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
  EVENTUAL: "Eventual",
}

const PREFERRED_CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
}

const CATEGORY_SECTIONS = [
  {
    key: "societario" as const,
    title: "Societario e Diretoria",
    icon: Building2,
    types: [
      "SOCIO",
      "SOCIO_ADMINISTRADOR",
      "SOCIO_MINORITARIO",
      "ACIONISTA",
      "CONSELHEIRO",
      "CEO",
      "CFO",
      "COO",
      "DIRETOR",
      "GERENTE_GERAL",
    ],
  },
  {
    key: "operacional" as const,
    title: "Operacional",
    icon: Users,
    types: [
      "GERENTE",
      "SUPERVISOR",
      "FUNCIONARIO",
      "CONTADOR_OP",
      "ADVOGADO_INTERNO",
      "CONSULTOR_EXT",
      "PREPOSTO",
    ],
  },
  {
    key: "familiar" as const,
    title: "Familiar",
    icon: Heart,
    types: ["CONJUGE", "FILHO", "PAI_MAE", "IRMAO", "PARENTE"],
  },
  {
    key: "influencia" as const,
    title: "Influencia Externa",
    icon: Globe,
    types: [
      "POLITICO",
      "CREDOR_CHAVE",
      "FORNECEDOR_CHAVE",
      "PARCEIRO_COMERCIAL",
      "AGENTE_FINANCEIRO",
      "CORRETOR",
      "DESPACHANTE",
    ],
  },
  {
    key: "profissionais" as const,
    title: "Profissionais",
    icon: Briefcase,
    types: [
      "PERITO_REL",
      "MEDIADOR",
      "ARBITRO",
      "LEILOEIRO",
      "TRADUTOR",
      "OUTRO_REL",
    ],
  },
]

const SELECT_GROUPS = [
  {
    label: "Societario",
    types: [
      "SOCIO",
      "SOCIO_ADMINISTRADOR",
      "SOCIO_MINORITARIO",
      "ACIONISTA",
      "CONSELHEIRO",
    ],
  },
  {
    label: "Diretoria / Gestao",
    types: ["CEO", "CFO", "COO", "DIRETOR", "GERENTE_GERAL"],
  },
  {
    label: "Operacional",
    types: [
      "GERENTE",
      "SUPERVISOR",
      "FUNCIONARIO",
      "CONTADOR_OP",
      "ADVOGADO_INTERNO",
      "CONSULTOR_EXT",
      "PREPOSTO",
    ],
  },
  {
    label: "Familiar",
    types: ["CONJUGE", "FILHO", "PAI_MAE", "IRMAO", "PARENTE"],
  },
  {
    label: "Influencia Externa",
    types: [
      "POLITICO",
      "CREDOR_CHAVE",
      "FORNECEDOR_CHAVE",
      "PARCEIRO_COMERCIAL",
      "AGENTE_FINANCEIRO",
      "CORRETOR",
      "DESPACHANTE",
    ],
  },
  {
    label: "Profissionais",
    types: [
      "PERITO_REL",
      "MEDIADOR",
      "ARBITRO",
      "LEILOEIRO",
      "TRADUTOR",
      "OUTRO_REL",
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "hoje"
  if (diffDays === 1) return "ha 1 dia"
  if (diffDays < 30) return `ha ${diffDays} dias`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return "ha 1 mes"
  if (diffMonths < 12) return `ha ${diffMonths} meses`
  const diffYears = Math.floor(diffMonths / 12)
  if (diffYears === 1) return "ha 1 ano"
  return `ha ${diffYears} anos`
}

function getInfluenceConfig(level: string | null | undefined) {
  return (
    INFLUENCE_LEVEL_CONFIG[level || ""] ?? {
      label: "—",
      borderClass: "border-muted",
      badgeClass: "bg-muted text-muted-foreground",
      badgeText: "—",
    }
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonFormData {
  name: string
  cpf: string
  rg: string
  birthDate: string
  relationshipType: string
  customRelationship: string
  email: string
  phone: string
  mobile: string
  whatsapp: string
  preferredChannel: string
  company: string
  position: string
  department: string
  cep: string
  address: string
  city: string
  uf: string
  influenceLevel: string
  isKeyPerson: boolean
  decisionPower: boolean
  influenceNotes: string
  contactFrequency: string
  systemNote: string
}

const EMPTY_FORM: PersonFormData = {
  name: "",
  cpf: "",
  rg: "",
  birthDate: "",
  relationshipType: "",
  customRelationship: "",
  email: "",
  phone: "",
  mobile: "",
  whatsapp: "",
  preferredChannel: "",
  company: "",
  position: "",
  department: "",
  cep: "",
  address: "",
  city: "",
  uf: "",
  influenceLevel: "",
  isKeyPerson: false,
  decisionPower: false,
  influenceNotes: "",
  contactFrequency: "",
  systemNote: "",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPerson = any

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  )
}

function StatsSummary({
  stats,
}: {
  stats: { total: number; keyPersons: number; withDecisionPower: number; highInfluence: number }
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-semibold">{stats.total}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <span className="text-muted-foreground">Chave:</span>{" "}
          <span className="font-semibold">{stats.keyPersons}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <span className="text-muted-foreground">Decisores:</span>{" "}
          <span className="font-semibold">{stats.withDecisionPower}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <span className="text-muted-foreground">Alta Inf:</span>{" "}
          <span className="font-semibold">{stats.highInfluence}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function KeyPersonCard({
  person,
  onEdit,
  onContact,
}: {
  person: AnyPerson
  onEdit: (p: AnyPerson) => void
  onContact: (p: AnyPerson) => void
}) {
  const config = getInfluenceConfig(person.influenceLevel)
  const primaryContact =
    person.whatsapp || person.mobile || person.phone || person.email || "—"
  const primaryContactType = person.whatsapp
    ? "WhatsApp"
    : person.mobile
      ? "Celular"
      : person.phone
        ? "Telefone"
        : person.email
          ? "E-mail"
          : ""

  return (
    <Card
      className={`py-4 border-l-4 ${config.borderClass} transition-shadow hover:shadow-md`}
    >
      <CardContent className="space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {person.isKeyPerson && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Star className="size-4 shrink-0 fill-[#C9A961] text-[#C9A961]" />
                  </TooltipTrigger>
                  <TooltipContent>Pessoa-chave</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="font-semibold truncate">{person.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={config.badgeClass}>
              {config.badgeText}
            </Badge>
            {person.decisionPower && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                Decisor
              </Badge>
            )}
          </div>
        </div>

        {/* Relationship and position */}
        <div className="text-sm text-muted-foreground space-y-0.5">
          <div>{RELATIONSHIP_TYPE_LABELS[person.relationshipType] || person.relationshipType}</div>
          {(person.company || person.position) && (
            <div className="flex items-center gap-1">
              <Building2 className="size-3" />
              <span>
                {[person.company, person.position].filter(Boolean).join(" / ")}
              </span>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {primaryContactType === "E-mail" ? (
            <Mail className="size-3" />
          ) : (
            <Phone className="size-3" />
          )}
          <span className="truncate">{primaryContact}</span>
        </div>

        {/* Last contact */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3" />
          <span>Ultimo contato: {formatRelativeDate(person.lastContactAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="xs" onClick={() => onEdit(person)}>
            <Pencil className="size-3" />
            Editar
          </Button>
          <Button variant="outline" size="xs" onClick={() => onContact(person)}>
            <MessageSquare className="size-3" />
            Contatar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CategorySection({
  title,
  icon: Icon,
  persons,
  onEdit,
  onContact,
  onDelete,
}: {
  title: string
  icon: React.ElementType
  persons: AnyPerson[]
  onEdit: (p: AnyPerson) => void
  onContact: (p: AnyPerson) => void
  onDelete: (p: AnyPerson) => void
}) {
  const [open, setOpen] = useState(persons.length > 0)

  if (persons.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 py-3 text-left hover:opacity-80 transition-opacity"
        >
          {open ? (
            <ChevronDown className="size-4 text-[#C9A961]" />
          ) : (
            <ChevronRight className="size-4 text-[#C9A961]" />
          )}
          <Icon className="size-4 text-[#C9A961]" />
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {persons.length}
          </Badge>
          <Separator className="flex-1 ml-2" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vinculo</TableHead>
                <TableHead>Empresa/Cargo</TableHead>
                <TableHead>Influencia</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Ultimo Contato</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map((person: AnyPerson) => {
                const config = getInfluenceConfig(person.influenceLevel)
                const contact =
                  person.whatsapp ||
                  person.mobile ||
                  person.phone ||
                  person.email ||
                  "—"
                return (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {person.isKeyPerson && (
                          <Star className="size-3 shrink-0 fill-[#C9A961] text-[#C9A961]" />
                        )}
                        {person.name}
                        {person.decisionPower && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                          >
                            Decisor
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {RELATIONSHIP_TYPE_LABELS[person.relationshipType] ||
                        person.relationshipType}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[person.company, person.position]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.badgeClass}>
                        {config.badgeText}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[160px] truncate">
                      {contact}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatRelativeDate(person.lastContactAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onEdit(person)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onContact(person)}
                              >
                                <MessageSquare className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Registrar contato</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onDelete(person)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ---------------------------------------------------------------------------
// Person Form Dialog
// ---------------------------------------------------------------------------

function PersonFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isLoading,
  isEditing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: PersonFormData
  setForm: React.Dispatch<React.SetStateAction<PersonFormData>>
  onSubmit: () => void
  isLoading: boolean
  isEditing: boolean
}) {
  const updateField = <K extends keyof PersonFormData>(
    key: K,
    value: PersonFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Pessoa" : "Nova Pessoa"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da pessoa no mapa de influencia."
              : "Adicione uma nova pessoa ao mapa de influencia do cliente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados Pessoais */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Dados Pessoais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="pf-name">Nome *</Label>
                <Input
                  id="pf-name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="pf-cpf">CPF</Label>
                <Input
                  id="pf-cpf"
                  value={form.cpf}
                  onChange={(e) => updateField("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="pf-rg">RG</Label>
                <Input
                  id="pf-rg"
                  value={form.rg}
                  onChange={(e) => updateField("rg", e.target.value)}
                  placeholder="RG"
                />
              </div>
              <div>
                <Label htmlFor="pf-birth">Data de Nascimento</Label>
                <Input
                  id="pf-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => updateField("birthDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Vinculo */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Vinculo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Tipo de Vinculo *</Label>
                <Select
                  value={form.relationshipType}
                  onValueChange={(v) => updateField("relationshipType", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o vinculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECT_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.types.map((type) => (
                          <SelectItem key={type} value={type}>
                            {RELATIONSHIP_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.relationshipType === "OUTRO_REL" && (
                <div className="sm:col-span-2">
                  <Label htmlFor="pf-custom-rel">
                    Especifique o vinculo
                  </Label>
                  <Input
                    id="pf-custom-rel"
                    value={form.customRelationship}
                    onChange={(e) =>
                      updateField("customRelationship", e.target.value)
                    }
                    placeholder="Descreva o tipo de vinculo"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Contato
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pf-email">E-mail</Label>
                <Input
                  id="pf-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="pf-phone">Telefone</Label>
                <Input
                  id="pf-phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <Label htmlFor="pf-mobile">Celular</Label>
                <Input
                  id="pf-mobile"
                  value={form.mobile}
                  onChange={(e) => updateField("mobile", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="pf-whatsapp">WhatsApp</Label>
                <Input
                  id="pf-whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => updateField("whatsapp", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Canal Preferido</Label>
                <Select
                  value={form.preferredChannel}
                  onValueChange={(v) => updateField("preferredChannel", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PREFERRED_CHANNEL_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Profissional */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Profissional
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pf-company">Empresa</Label>
                <Input
                  id="pf-company"
                  value={form.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="pf-position">Cargo</Label>
                <Input
                  id="pf-position"
                  value={form.position}
                  onChange={(e) => updateField("position", e.target.value)}
                  placeholder="Cargo / funcao"
                />
              </div>
              <div>
                <Label htmlFor="pf-dept">Departamento</Label>
                <Input
                  id="pf-dept"
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  placeholder="Departamento"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereco */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Endereco
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="pf-cep">CEP</Label>
                <Input
                  id="pf-cep"
                  value={form.cep}
                  onChange={(e) => updateField("cep", e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div className="sm:col-span-3">
                <Label htmlFor="pf-address">Endereco</Label>
                <Input
                  id="pf-address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Rua, numero, complemento"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pf-city">Cidade</Label>
                <Input
                  id="pf-city"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div>
                <Label htmlFor="pf-uf">UF</Label>
                <Input
                  id="pf-uf"
                  value={form.uf}
                  onChange={(e) => updateField("uf", e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Mapa de Influencia */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Mapa de Influencia
            </h4>
            <div className="space-y-4">
              {/* Influence Level - Radio-like group */}
              <div>
                <Label className="mb-2">Nivel de Influencia *</Label>
                <div className="flex flex-wrap gap-2">
                  {INFLUENCE_LEVELS.map((level) => {
                    const config = INFLUENCE_LEVEL_CONFIG[level]
                    const isSelected = form.influenceLevel === level
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateField("influenceLevel", level)}
                        className={`
                          rounded-md border-2 px-3 py-1.5 text-sm font-medium transition-all
                          ${isSelected ? `${config.borderClass} ${config.badgeClass}` : "border-muted bg-background text-muted-foreground hover:border-muted-foreground/30"}
                        `}
                      >
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pf-key"
                    checked={form.isKeyPerson}
                    onCheckedChange={(checked) =>
                      updateField("isKeyPerson", !!checked)
                    }
                  />
                  <Label htmlFor="pf-key" className="font-normal cursor-pointer">
                    Pessoa-chave
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pf-decision"
                    checked={form.decisionPower}
                    onCheckedChange={(checked) =>
                      updateField("decisionPower", !!checked)
                    }
                  />
                  <Label
                    htmlFor="pf-decision"
                    className="font-normal cursor-pointer"
                  >
                    Poder de decisao
                  </Label>
                </div>
              </div>

              {/* Influence notes */}
              <div>
                <Label htmlFor="pf-inf-notes">Notas de influencia</Label>
                <Textarea
                  id="pf-inf-notes"
                  value={form.influenceNotes}
                  onChange={(e) =>
                    updateField("influenceNotes", e.target.value)
                  }
                  placeholder="Observacoes sobre o nivel de influencia, poder de decisao, relacoes..."
                  rows={3}
                />
              </div>

              {/* Contact frequency */}
              <div>
                <Label>Frequencia de contato</Label>
                <Select
                  value={form.contactFrequency}
                  onValueChange={(v) => updateField("contactFrequency", v)}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTACT_FREQUENCY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vinculo com sistema */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Vinculo com sistema
            </h4>
            <div>
              <Label htmlFor="pf-system-note">
                Pessoa ja cadastrada? (anotacao)
              </Label>
              <Input
                id="pf-system-note"
                value={form.systemNote}
                onChange={(e) => updateField("systemNote", e.target.value)}
                placeholder="Ex: Joao Silva ja cadastrado como parte no processo 0001234"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              isLoading || !form.name || !form.relationshipType || !form.influenceLevel
            }
            className="bg-[#C9A961] hover:bg-[#b8983f] text-white"
          >
            {isLoading
              ? "Salvando..."
              : isEditing
                ? "Salvar Alteracoes"
                : "Adicionar Pessoa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Register Contact Dialog
// ---------------------------------------------------------------------------

function RegisterContactDialog({
  open,
  onOpenChange,
  person,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: AnyPerson | null
  onSubmit: (note: string) => void
  isLoading: boolean
}) {
  const [note, setNote] = useState("")
  const today = new Date().toISOString().slice(0, 10)

  const handleSubmit = () => {
    onSubmit(note)
    setNote("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Contato</DialogTitle>
          <DialogDescription>
            {person ? `Registre um contato com ${person.name}.` : "Registre um contato."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="rc-date">Data</Label>
            <Input id="rc-date" type="date" value={today} disabled />
          </div>
          <div>
            <Label htmlFor="rc-note">Anotacao</Label>
            <Textarea
              id="rc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descreva o contato realizado..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !note.trim()}
            className="bg-[#C9A961] hover:bg-[#b8983f] text-white"
          >
            {isLoading ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  open,
  onOpenChange,
  person,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: AnyPerson | null
  onConfirm: () => void
  isLoading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Exclusao</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{" "}
            <strong>{person?.name}</strong> do mapa de influencia?
            Esta acao nao pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function InfluenceMapTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils()

  // ---- State ----
  const [formOpen, setFormOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [form, setForm] = useState<PersonFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<AnyPerson | null>(null)

  // ---- Queries ----
  const influenceMap = trpc.clientRelations.getInfluenceMap.useQuery({
    clientId,
  })

  // ---- Mutations ----
  const createMutation = trpc.clientRelations.create.useMutation({
    onSuccess: () => {
      utils.clientRelations.getInfluenceMap.invalidate({ clientId })
      setFormOpen(false)
      resetForm()
    },
  })

  const updateMutation = trpc.clientRelations.update.useMutation({
    onSuccess: () => {
      utils.clientRelations.getInfluenceMap.invalidate({ clientId })
      setFormOpen(false)
      resetForm()
    },
  })

  const deleteMutation = trpc.clientRelations.delete.useMutation({
    onSuccess: () => {
      utils.clientRelations.getInfluenceMap.invalidate({ clientId })
      setDeleteOpen(false)
      setSelectedPerson(null)
    },
  })

  const registerContactMutation =
    trpc.clientRelations.registerContact.useMutation({
      onSuccess: () => {
        utils.clientRelations.getInfluenceMap.invalidate({ clientId })
        setContactOpen(false)
        setSelectedPerson(null)
      },
    })

  // ---- Handlers ----

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function handleNewPerson() {
    resetForm()
    setFormOpen(true)
  }

  function handleEdit(person: AnyPerson) {
    setEditingId(person.id)
    setForm({
      name: person.name || "",
      cpf: person.cpf || "",
      rg: person.rg || "",
      birthDate: person.birthDate
        ? new Date(person.birthDate).toISOString().slice(0, 10)
        : "",
      relationshipType: person.relationshipType || "",
      customRelationship: person.customRelationship || "",
      email: person.email || "",
      phone: person.phone || "",
      mobile: person.mobile || "",
      whatsapp: person.whatsapp || "",
      preferredChannel: person.preferredChannel || "",
      company: person.company || "",
      position: person.position || "",
      department: person.department || "",
      cep: person.cep || "",
      address: person.address || "",
      city: person.city || "",
      uf: person.uf || "",
      influenceLevel: person.influenceLevel || "",
      isKeyPerson: person.isKeyPerson || false,
      decisionPower: person.decisionPower || false,
      influenceNotes: person.influenceNotes || "",
      contactFrequency: person.contactFrequency || "",
      systemNote: person.systemNote || "",
    })
    setFormOpen(true)
  }

  function handleContact(person: AnyPerson) {
    setSelectedPerson(person)
    setContactOpen(true)
  }

  function handleDelete(person: AnyPerson) {
    setSelectedPerson(person)
    setDeleteOpen(true)
  }

  function handleFormSubmit() {
    const payload = {
      clientId,
      name: form.name,
      cpf: form.cpf || undefined,
      rg: form.rg || undefined,
      birthDate: form.birthDate || undefined,
      relationshipType: form.relationshipType as any,
      customRelationship:
        form.relationshipType === "OUTRO_REL"
          ? form.customRelationship || undefined
          : undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      mobile: form.mobile || undefined,
      whatsapp: form.whatsapp || undefined,
      preferredChannel: (form.preferredChannel || undefined) as any,
      company: form.company || undefined,
      position: form.position || undefined,
      department: form.department || undefined,
      cep: form.cep || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      uf: form.uf || undefined,
      influenceLevel: form.influenceLevel as any,
      isKeyPerson: form.isKeyPerson,
      decisionPower: form.decisionPower,
      influenceNotes: form.influenceNotes || undefined,
      contactFrequency: (form.contactFrequency || undefined) as any,
      systemNote: form.systemNote || undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any)
    } else {
      createMutation.mutate(payload as any)
    }
  }

  function handleRegisterContact(note: string) {
    if (!selectedPerson) return
    registerContactMutation.mutate({
      id: selectedPerson.id,
      note,
    })
  }

  function handleConfirmDelete() {
    if (!selectedPerson) return
    deleteMutation.mutate({ id: selectedPerson.id })
  }

  // ---- Loading state ----
  if (influenceMap.isLoading) {
    return <LoadingSkeleton />
  }

  const data = influenceMap.data
  const keyPersons = data?.keyPersons ?? []
  const byCategory = data?.byCategory ?? {
    societario: [],
    diretoria: [],
    operacional: [],
    familiar: [],
    influencia: [],
    profissionais: [],
  }
  const stats = data?.stats ?? {
    total: 0,
    keyPersons: 0,
    withDecisionPower: 0,
    highInfluence: 0,
  }

  // Merge societario + diretoria into one for display (the API returns them
  // together under "societario" per the spec, but handle both cases).
  const societarioPersons = [
    ...(byCategory.societario ?? []),
    ...(byCategory.diretoria ?? []),
  ]

  const categorySections = CATEGORY_SECTIONS.map((section) => ({
    ...section,
    persons:
      section.key === "societario"
        ? societarioPersons
        : (byCategory[section.key] ?? []),
  }))

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mapa de Influencia</h3>
        <Button
          onClick={handleNewPerson}
          className="bg-[#C9A961] hover:bg-[#b8983f] text-white"
        >
          <Plus className="size-4" />
          Nova Pessoa
        </Button>
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} />

      {/* Key Persons Section */}
      {keyPersons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="size-4 text-[#C9A961]" />
            <span className="font-semibold text-sm">Pessoas-Chave</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {keyPersons.length}
            </Badge>
            <Separator className="flex-1 ml-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyPersons.map((person: AnyPerson) => (
              <KeyPersonCard
                key={person.id}
                person={person}
                onEdit={handleEdit}
                onContact={handleContact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {categorySections.map((section) => (
        <CategorySection
          key={section.key}
          title={section.title}
          icon={section.icon}
          persons={section.persons}
          onEdit={handleEdit}
          onContact={handleContact}
          onDelete={handleDelete}
        />
      ))}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="size-12 text-muted-foreground/40 mb-4" />
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhuma pessoa cadastrada
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione pessoas ao mapa de influencia para mapear relacionamentos e
            contatos-chave deste cliente.
          </p>
          <Button
            onClick={handleNewPerson}
            className="bg-[#C9A961] hover:bg-[#b8983f] text-white"
          >
            <Plus className="size-4" />
            Adicionar Primeira Pessoa
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <PersonFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) resetForm()
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEditing={!!editingId}
      />

      <RegisterContactDialog
        open={contactOpen}
        onOpenChange={(open) => {
          setContactOpen(open)
          if (!open) setSelectedPerson(null)
        }}
        person={selectedPerson}
        onSubmit={handleRegisterContact}
        isLoading={registerContactMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setSelectedPerson(null)
        }}
        person={selectedPerson}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
