"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Star,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  FileText,
  Mail,
  Phone,
  Smartphone,
  Globe,
  MapPin,
  User,
  Save,
  ExternalLink,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const JUDICIAL_ADMIN_ROLES = [
  "ADMINISTRADOR_PRINCIPAL",
  "ADVOGADO_AJ",
  "CONTADOR_AJ",
  "ECONOMISTA",
  "ANALISTA_AJ",
  "GESTOR_OPERACIONAL",
  "SECRETARIO_AJ",
  "ESTAGIARIO_AJ",
  "OUTRO_AJ",
] as const

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR_PRINCIPAL: "Administrador Principal",
  ADVOGADO_AJ: "Advogado(a)",
  CONTADOR_AJ: "Contador(a)",
  ECONOMISTA: "Economista",
  ANALISTA_AJ: "Analista",
  GESTOR_OPERACIONAL: "Gestor Operacional",
  SECRETARIO_AJ: "Secretário(a)",
  ESTAGIARIO_AJ: "Estagiário(a)",
  OUTRO_AJ: "Outro",
}

const BRAZILIAN_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const

const EMPTY_MEMBER_FORM = {
  name: "",
  role: "" as string,
  cpf: "",
  oab: "",
  crc: "",
  email: "",
  phone: "",
  cellphone: "",
  notes: "",
}

// ---------------------------------------------------------------------------
// Star Rating Component
// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
  size = 16,
  readonly = false,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
        >
          <Star
            size={size}
            className={
              star <= value
                ? "fill-[#C9A961] text-[#C9A961]"
                : "text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface JudicialAdminDetailProps {
  adminId: string
}

export function JudicialAdminDetail({ adminId }: JudicialAdminDetailProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  // Data
  const { data: admin, isLoading } = trpc.judicialAdmin.getById.useQuery({ id: adminId })
  const { data: teamData, isLoading: teamLoading } = trpc.judicialAdmin.team.list.useQuery(
    { administratorId: adminId }
  )

  // Team dialog
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM)
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null)

  // Company edit dialog
  const [showCompanyEdit, setShowCompanyEdit] = useState(false)
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    tradeName: "",
    cnpj: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  })

  // Evaluation state
  const [evalRating, setEvalRating] = useState<number>(0)
  const [evalSpecialties, setEvalSpecialties] = useState("")
  const [evalNotes, setEvalNotes] = useState("")
  const [evalInitialized, setEvalInitialized] = useState(false)

  // Initialize eval state from admin data
  if (admin && !evalInitialized) {
    setEvalRating(admin.rating ?? 0)
    setEvalSpecialties(admin.specialties ?? "")
    setEvalNotes(admin.notes ?? "")
    setEvalInitialized(true)
  }

  // Mutations
  const updateMutation = trpc.judicialAdmin.update.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.getById.invalidate({ id: adminId })
      utils.judicialAdmin.list.invalidate()
      setShowCompanyEdit(false)
    },
  })

  const addMemberMutation = trpc.judicialAdmin.team.add.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.team.list.invalidate({ administratorId: adminId })
      utils.judicialAdmin.getById.invalidate({ id: adminId })
      resetMemberDialog()
    },
  })

  const updateMemberMutation = trpc.judicialAdmin.team.update.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.team.list.invalidate({ administratorId: adminId })
      resetMemberDialog()
    },
  })

  const removeMemberMutation = trpc.judicialAdmin.team.remove.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.team.list.invalidate({ administratorId: adminId })
      utils.judicialAdmin.getById.invalidate({ id: adminId })
      setDeleteMemberId(null)
    },
  })

  // Helpers
  const resetMemberDialog = useCallback(() => {
    setShowMemberDialog(false)
    setEditingMemberId(null)
    setMemberForm(EMPTY_MEMBER_FORM)
  }, [])

  const openEditMember = useCallback((member: any) => {
    setMemberForm({
      name: member.name ?? "",
      role: member.role ?? "",
      cpf: member.cpf ?? "",
      oab: member.oabNumber ?? "",
      crc: member.crcNumber ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      cellphone: member.cellphone ?? "",
      notes: member.notes ?? "",
    })
    setEditingMemberId(member.id)
    setShowMemberDialog(true)
  }, [])

  const handleMemberSubmit = useCallback(() => {
    const { oab, crc, ...restForm } = memberForm
    const payload = {
      ...restForm,
      role: restForm.role as any,
      oabNumber: oab || undefined,
      crcNumber: crc || undefined,
    }
    if (editingMemberId) {
      updateMemberMutation.mutate({ id: editingMemberId, ...payload } as any)
    } else {
      addMemberMutation.mutate({ administratorId: adminId, ...payload } as any)
    }
  }, [memberForm, editingMemberId, adminId, addMemberMutation, updateMemberMutation])

  const openCompanyEdit = useCallback(() => {
    if (!admin) return
    setCompanyForm({
      companyName: admin.companyName ?? "",
      tradeName: admin.tradeName ?? "",
      cnpj: admin.cnpj ?? "",
      email: admin.email ?? "",
      phone: admin.phone ?? "",
      website: admin.website ?? "",
      address: admin.address ?? "",
      city: admin.city ?? "",
      state: admin.state ?? "",
      contactName: admin.mainContactName ?? "",
      contactEmail: admin.mainContactEmail ?? "",
      contactPhone: admin.mainContactPhone ?? "",
    })
    setShowCompanyEdit(true)
  }, [admin])

  const handleCompanySubmit = useCallback(() => {
    updateMutation.mutate({
      id: adminId,
      companyName: companyForm.companyName,
      tradeName: companyForm.tradeName || undefined,
      cnpj: companyForm.cnpj || undefined,
      email: companyForm.email || undefined,
      phone: companyForm.phone || undefined,
      website: companyForm.website || undefined,
      address: companyForm.address || undefined,
      city: companyForm.city || undefined,
      state: companyForm.state || undefined,
      mainContactName: companyForm.contactName || undefined,
      mainContactEmail: companyForm.contactEmail || undefined,
      mainContactPhone: companyForm.contactPhone || undefined,
    })
  }, [adminId, companyForm, updateMutation])

  const handleEvalSave = useCallback(() => {
    updateMutation.mutate({
      id: adminId,
      rating: evalRating || undefined,
      specialties: evalSpecialties,
      notes: evalNotes,
    })
  }, [adminId, evalRating, evalSpecialties, evalNotes, updateMutation])

  const isMemberSaving = addMemberMutation.isPending || updateMemberMutation.isPending

  const teamMembers = teamData ?? []

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Administrador não encontrado</h3>
        <p className="text-sm text-muted-foreground mb-6">
          O registro solicitado não existe ou foi removido.
        </p>
        <Button variant="outline" onClick={() => router.push("/cadastros/administradores-judiciais")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar à Lista
        </Button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={() => router.push("/cadastros/administradores-judiciais")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {admin.companyName}
            </h1>
            {admin.tradeName && (
              <p className="text-muted-foreground">{admin.tradeName}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {admin.cnpj && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {admin.cnpj}
                </Badge>
              )}
              {(admin.city || admin.state) && (
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {admin.city && admin.state
                    ? `${admin.city}/${admin.state}`
                    : admin.city || admin.state}
                </Badge>
              )}
              <StarRating value={admin.rating ?? 0} readonly size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="equipe" className="mt-2">
        <TabsList>
          <TabsTrigger value="equipe">
            <Users className="h-4 w-4 mr-1.5" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="processos">
            <FileText className="h-4 w-4 mr-1.5" />
            Processos
          </TabsTrigger>
          <TabsTrigger value="dados">
            <Building2 className="h-4 w-4 mr-1.5" />
            Dados da Empresa
          </TabsTrigger>
          <TabsTrigger value="avaliacao">
            <Star className="h-4 w-4 mr-1.5" />
            Avaliação
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* Tab: Equipe                                                       */}
        {/* ================================================================= */}
        <TabsContent value="equipe" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Equipe ({teamMembers.length})
            </h2>
            <Button
              size="sm"
              onClick={() => {
                setMemberForm(EMPTY_MEMBER_FORM)
                setEditingMemberId(null)
                setShowMemberDialog(true)
              }}
              className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Button>
          </div>

          {teamLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-48" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhum membro cadastrado na equipe deste AJ.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMemberForm(EMPTY_MEMBER_FORM)
                    setEditingMemberId(null)
                    setShowMemberDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Membro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamMembers.map((member: any) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#C9A961] shrink-0" />
                          <span className="font-medium truncate">
                            {member.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                        {member.oabNumber && (
                          <p className="text-xs text-muted-foreground">
                            OAB: {member.oabNumber}
                          </p>
                        )}
                        {member.crcNumber && (
                          <p className="text-xs text-muted-foreground">
                            CRC: {member.crcNumber}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditMember(member)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteMemberId(member.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {member.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.cellphone && (
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5 shrink-0" />
                          <span>{member.cellphone}</span>
                        </div>
                      )}
                      {!member.email && !member.phone && !member.cellphone && (
                        <span className="text-xs italic">
                          Sem dados de contato
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab: Processos                                                    */}
        {/* ================================================================= */}
        <TabsContent value="processos" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold">Processos Vinculados</h2>

          {!admin.cases || admin.cases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum processo vinculado a este administrador judicial.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Data Nomeação</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Honorários (%)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admin.cases.map((caseItem: any) => (
                    <TableRow key={caseItem.id}>
                      <TableCell>
                        <Link
                          href={`/processos/${caseItem.id}`}
                          className="font-medium text-[#C9A961] hover:underline flex items-center gap-1"
                        >
                          {caseItem.numero || caseItem.numero_processo || "—"}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {caseItem.cliente?.nome ||
                          caseItem.cliente?.razao_social ||
                          caseItem.clientName ||
                          "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {caseItem.appointmentDate
                          ? new Date(caseItem.appointmentDate).toLocaleDateString("pt-BR")
                          : caseItem.dataNomeacao
                            ? new Date(caseItem.dataNomeacao).toLocaleDateString("pt-BR")
                            : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                        {caseItem.feePercentage != null
                          ? `${caseItem.feePercentage}%`
                          : caseItem.honorarios != null
                            ? `${caseItem.honorarios}%`
                            : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            caseItem.status === "ATIVO"
                              ? "default"
                              : caseItem.status === "ENCERRADO"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {caseItem.status ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab: Dados da Empresa                                             */}
        {/* ================================================================= */}
        <TabsContent value="dados" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dados Cadastrais</h2>
            <Button size="sm" variant="outline" onClick={openCompanyEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Company Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="CNPJ"
                  value={admin.cnpj}
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Endereço"
                  value={admin.address}
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Cidade/UF"
                  value={
                    admin.city && admin.state
                      ? `${admin.city}/${admin.state}`
                      : admin.city || admin.state || null
                  }
                />
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Telefone"
                  value={admin.phone}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label="E-mail"
                  value={admin.email}
                />
                <InfoRow
                  icon={<Globe className="h-4 w-4" />}
                  label="Site"
                  value={admin.website}
                  isLink
                />
              </CardContent>
            </Card>

            {/* Contact Person */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Nome"
                  value={admin.mainContactName}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label="E-mail"
                  value={admin.mainContactEmail}
                />
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Telefone"
                  value={admin.mainContactPhone}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab: Avaliação                                                    */}
        {/* ================================================================= */}
        <TabsContent value="avaliacao" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold">Avaliação e Observações</h2>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Avaliação</Label>
                <StarRating
                  value={evalRating}
                  onChange={setEvalRating}
                  size={28}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eval-specialties" className="text-sm font-medium">
                  Especialidades
                </Label>
                <Input
                  id="eval-specialties"
                  value={evalSpecialties}
                  onChange={(e) => setEvalSpecialties(e.target.value)}
                  placeholder="Ex: Recuperação Judicial, Falência, Concordata"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eval-notes" className="text-sm font-medium">
                  Observações
                </Label>
                <Textarea
                  id="eval-notes"
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Observações sobre experiência, relacionamento, qualidade do trabalho..."
                  rows={5}
                />
              </div>

              <Button
                onClick={handleEvalSave}
                disabled={updateMutation.isPending}
                className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Salvando..." : "Salvar Avaliação"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================= */}
      {/* Team Member Dialog                                                */}
      {/* ================================================================= */}
      <Dialog
        open={showMemberDialog}
        onOpenChange={(open) => {
          if (!open) resetMemberDialog()
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMemberId ? "Editar Membro" : "Novo Membro da Equipe"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="member-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="member-name"
                value={memberForm.name}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-role">
                Função <span className="text-destructive">*</span>
              </Label>
              <Select
                value={memberForm.role}
                onValueChange={(v) =>
                  setMemberForm((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger id="member-role" className="w-full">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {JUDICIAL_ADMIN_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-cpf">CPF</Label>
              <Input
                id="member-cpf"
                value={memberForm.cpf}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, cpf: e.target.value }))
                }
                placeholder="000.000.000-00"
              />
            </div>

            {memberForm.role === "ADVOGADO_AJ" && (
              <div className="space-y-2">
                <Label htmlFor="member-oab">OAB</Label>
                <Input
                  id="member-oab"
                  value={memberForm.oab}
                  onChange={(e) =>
                    setMemberForm((f) => ({ ...f, oab: e.target.value }))
                  }
                  placeholder="Ex: PR 12345"
                />
              </div>
            )}

            {memberForm.role === "CONTADOR_AJ" && (
              <div className="space-y-2">
                <Label htmlFor="member-crc">CRC</Label>
                <Input
                  id="member-crc"
                  value={memberForm.crc}
                  onChange={(e) =>
                    setMemberForm((f) => ({ ...f, crc: e.target.value }))
                  }
                  placeholder="Ex: PR 012345/O-0"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="member-email">E-mail</Label>
              <Input
                id="member-email"
                type="email"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-phone">Telefone</Label>
                <Input
                  id="member-phone"
                  value={memberForm.phone}
                  onChange={(e) =>
                    setMemberForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-cellphone">Celular</Label>
                <Input
                  id="member-cellphone"
                  value={memberForm.cellphone}
                  onChange={(e) =>
                    setMemberForm((f) => ({ ...f, cellphone: e.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-notes">Observações</Label>
              <Textarea
                id="member-notes"
                value={memberForm.notes}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Observações..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetMemberDialog}
              disabled={isMemberSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMemberSubmit}
              disabled={
                !memberForm.name.trim() || !memberForm.role || isMemberSaving
              }
              className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
            >
              {isMemberSaving
                ? "Salvando..."
                : editingMemberId
                  ? "Salvar Alterações"
                  : "Adicionar Membro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <Dialog
        open={!!deleteMemberId}
        onOpenChange={(open) => !open && setDeleteMemberId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover Membro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este membro da equipe?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteMemberId(null)}
              disabled={removeMemberMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteMemberId &&
                removeMemberMutation.mutate({ id: deleteMemberId })
              }
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Company Edit Dialog                                               */}
      {/* ================================================================= */}
      <Dialog
        open={showCompanyEdit}
        onOpenChange={(open) => {
          if (!open) setShowCompanyEdit(false)
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados da Empresa</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-companyName">
                  Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="co-companyName"
                  value={companyForm.companyName}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      companyName: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-tradeName">Nome Fantasia</Label>
                <Input
                  id="co-tradeName"
                  value={companyForm.tradeName}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      tradeName: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-cnpj">CNPJ</Label>
                <Input
                  id="co-cnpj"
                  value={companyForm.cnpj}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, cnpj: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-email">E-mail</Label>
                <Input
                  id="co-email"
                  type="email"
                  value={companyForm.email}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-phone">Telefone</Label>
                <Input
                  id="co-phone"
                  value={companyForm.phone}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-website">Site</Label>
                <Input
                  id="co-website"
                  value={companyForm.website}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-address">Endereço</Label>
                <Input
                  id="co-address"
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-city">Cidade</Label>
                <Input
                  id="co-city"
                  value={companyForm.city}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-state">UF</Label>
                <Select
                  value={companyForm.state}
                  onValueChange={(v) =>
                    setCompanyForm((f) => ({ ...f, state: v }))
                  }
                >
                  <SelectTrigger id="co-state" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <h3 className="text-sm font-semibold text-muted-foreground">
              Responsável
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-contactName">Nome</Label>
                <Input
                  id="co-contactName"
                  value={companyForm.contactName}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      contactName: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-contactEmail">E-mail</Label>
                <Input
                  id="co-contactEmail"
                  type="email"
                  value={companyForm.contactEmail}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      contactEmail: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-contactPhone">Telefone</Label>
                <Input
                  id="co-contactPhone"
                  value={companyForm.contactPhone}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      contactPhone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompanyEdit(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompanySubmit}
              disabled={
                !companyForm.companyName.trim() || updateMutation.isPending
              }
              className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Info Row Helper
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
  isLink = false,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  isLink?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          isLink ? (
            <a
              href={value.startsWith("http") ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C9A961] hover:underline break-all"
            >
              {value}
            </a>
          ) : (
            <p className="text-foreground break-all">{value}</p>
          )
        ) : (
          <p className="text-muted-foreground/60 italic">Não informado</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
