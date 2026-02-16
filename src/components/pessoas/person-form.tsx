"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Save,
  Loader2,
  Search,
  Upload,
  Trash2,
  ExternalLink,
  FileText,
  Scale,
  FolderKanban,
  Clock,
} from "lucide-react"
import {
  PERSON_TYPE_LABELS,
  PERSON_SUBTYPE_LABELS,
  PERSON_SEGMENT_LABELS,
  PERSON_DOC_TYPE_LABELS,
  CASE_TYPE_LABELS,
  CASE_STATUS_LABELS,
  PROJECT_CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  STAKEHOLDER_ROLE_LABELS,
  ESTADOS_BRASIL,
} from "@/lib/constants"
import Link from "next/link"

// Form validation schema
const formSchema = z.object({
  tipo: z.string().min(1, "Tipo é obrigatório"),
  subtipo: z.string().min(1, "Subtipo é obrigatório"),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  razao_social: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  rg: z.string().optional(),
  orgao_emissor: z.string().optional(),
  nacionalidade: z.string().optional(),
  estado_civil: z.string().optional(),
  profissao: z.string().optional(),
  data_nascimento: z.string().optional(),
  // Address
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  // Contacts
  telefone_fixo: z.string().optional(),
  celular: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  email_secundario: z.string().optional(),
  // Banking
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  pix: z.string().optional(),
  // Other
  segmento: z.string().optional(),
  observacoes: z.string().optional(),
  portal_access: z.boolean().optional(),
})

type FormData = z.infer<typeof formSchema>

interface PersonFormProps {
  personId?: string
}

export function PersonForm({ personId }: PersonFormProps) {
  const router = useRouter()
  const isEditing = !!personId
  const [activeTab, setActiveTab] = useState("dados")
  const [cepLoading, setCepLoading] = useState(false)

  // Fetch existing person data
  const { data: person, isLoading: personLoading } = trpc.persons.getById.useQuery(
    { id: personId! },
    { enabled: isEditing }
  )

  const utils = trpc.useUtils()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    values: person
      ? {
          tipo: person.tipo,
          subtipo: person.subtipo,
          nome: person.nome,
          razao_social: person.razao_social || "",
          cpf_cnpj: person.cpf_cnpj || "",
          rg: person.rg || "",
          orgao_emissor: person.orgao_emissor || "",
          nacionalidade: person.nacionalidade || "",
          estado_civil: person.estado_civil || "",
          profissao: person.profissao || "",
          data_nascimento: person.data_nascimento
            ? new Date(person.data_nascimento).toISOString().split("T")[0]
            : "",
          cep: person.cep || "",
          logradouro: person.logradouro || "",
          numero: person.numero || "",
          complemento: person.complemento || "",
          bairro: person.bairro || "",
          cidade: person.cidade || "",
          estado: person.estado || "",
          pais: person.pais || "Brasil",
          telefone_fixo: person.telefone_fixo || "",
          celular: person.celular || "",
          whatsapp: person.whatsapp || "",
          email: person.email || "",
          email_secundario: person.email_secundario || "",
          banco: person.banco || "",
          agencia: person.agencia || "",
          conta: person.conta || "",
          pix: person.pix || "",
          segmento: person.segmento || "",
          observacoes: person.observacoes || "",
          portal_access: person.portal_access,
        }
      : {
          tipo: "",
          subtipo: "",
          nome: "",
          pais: "Brasil",
          portal_access: false,
        },
  })

  const createMutation = trpc.persons.create.useMutation({
    onSuccess: (data) => {
      utils.persons.list.invalidate()
      router.push(`/pessoas/${data.id}`)
    },
  })

  const updateMutation = trpc.persons.update.useMutation({
    onSuccess: () => {
      utils.persons.list.invalidate()
      utils.persons.getById.invalidate({ id: personId! })
    },
  })

  const mutation = isEditing ? updateMutation : createMutation
  const isPending = mutation.isPending

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      tipo: data.tipo as "CLIENTE",
      subtipo: data.subtipo as "PESSOA_FISICA",
      segmento: (data.segmento as "AGRO") || null,
      data_nascimento: data.data_nascimento ? new Date(data.data_nascimento) : null,
      razao_social: data.razao_social || null,
      cpf_cnpj: data.cpf_cnpj || null,
      rg: data.rg || null,
      orgao_emissor: data.orgao_emissor || null,
      nacionalidade: data.nacionalidade || null,
      estado_civil: data.estado_civil || null,
      profissao: data.profissao || null,
      cep: data.cep || null,
      logradouro: data.logradouro || null,
      numero: data.numero || null,
      complemento: data.complemento || null,
      bairro: data.bairro || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      pais: data.pais || null,
      telefone_fixo: data.telefone_fixo || null,
      celular: data.celular || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      email_secundario: data.email_secundario || null,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      pix: data.pix || null,
      observacoes: data.observacoes || null,
    }

    if (isEditing) {
      updateMutation.mutate({ id: personId!, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // ViaCEP lookup
  const lookupCep = useCallback(async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "")
    if (!cep || cep.length !== 8) return

    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        form.setValue("logradouro", data.logradouro || "")
        form.setValue("bairro", data.bairro || "")
        form.setValue("cidade", data.localidade || "")
        form.setValue("estado", data.uf || "")
        form.setValue("complemento", data.complemento || "")
      }
    } catch {
      // Silent fail — user can fill manually
    } finally {
      setCepLoading(false)
    }
  }, [form])

  if (isEditing && personLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const watchedSubtipo = form.watch("subtipo")
  const isPJ = watchedSubtipo === "PESSOA_JURIDICA"

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? person?.nome || "Editar Pessoa" : "Nova Pessoa"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Editar dados cadastrais" : "Preencha os dados da pessoa"}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {isEditing ? "Salvar Alterações" : "Cadastrar"}
        </Button>
      </div>

      {mutation.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {mutation.error.message}
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Dados salvos com sucesso!
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          {isEditing && (
            <>
              <TabsTrigger value="processos">Processos</TabsTrigger>
              <TabsTrigger value="projetos">Projetos</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Tab 1 — Dados Pessoais/Jurídicos */}
        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados Pessoais / Jurídicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.watch("tipo")}
                    onValueChange={(v) => form.setValue("tipo", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERSON_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.tipo && (
                    <p className="text-xs text-destructive">{form.formState.errors.tipo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Subtipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.watch("subtipo")}
                    onValueChange={(v) => form.setValue("subtipo", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pessoa Física ou Jurídica" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERSON_SUBTYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.subtipo && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.subtipo.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {isPJ ? "Nome Fantasia" : "Nome Completo"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input {...form.register("nome")} placeholder={isPJ ? "Nome fantasia" : "Nome completo"} />
                  {form.formState.errors.nome && (
                    <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
                  )}
                </div>

                {isPJ && (
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <Input {...form.register("razao_social")} placeholder="Razão social" />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{isPJ ? "CNPJ" : "CPF"}</Label>
                  <Input
                    {...form.register("cpf_cnpj")}
                    placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>

                {!isPJ && (
                  <>
                    <div className="space-y-2">
                      <Label>RG</Label>
                      <Input {...form.register("rg")} placeholder="Número do RG" />
                    </div>
                    <div className="space-y-2">
                      <Label>Órgão Emissor</Label>
                      <Input {...form.register("orgao_emissor")} placeholder="SSP/PR" />
                    </div>
                  </>
                )}
              </div>

              {!isPJ && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nacionalidade</Label>
                    <Input {...form.register("nacionalidade")} placeholder="Brasileiro(a)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado Civil</Label>
                    <Select
                      value={form.watch("estado_civil") || ""}
                      onValueChange={(v) => form.setValue("estado_civil", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"].map(
                          (v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profissão</Label>
                    <Input {...form.register("profissao")} placeholder="Profissão" />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{isPJ ? "Data de Fundação" : "Data de Nascimento"}</Label>
                  <Input type="date" {...form.register("data_nascimento")} />
                </div>
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select
                    value={form.watch("segmento") || ""}
                    onValueChange={(v) => form.setValue("segmento", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERSON_SEGMENT_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  {...form.register("observacoes")}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  checked={form.watch("portal_access") || false}
                  onCheckedChange={(v) => form.setValue("portal_access", v)}
                />
                <div>
                  <Label>Acesso ao Portal do Cliente</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que esta pessoa acesse o portal para visualizar processos e documentos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 — Endereço (ViaCEP) */}
        <TabsContent value="endereco">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      {...form.register("cep")}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={lookupCep}
                      disabled={cepLoading}
                    >
                      {cepLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-3 space-y-2">
                  <Label>Logradouro</Label>
                  <Input {...form.register("logradouro")} placeholder="Rua, Avenida..." />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input {...form.register("numero")} placeholder="Nº" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input {...form.register("complemento")} placeholder="Apto, Sala..." />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input {...form.register("bairro")} placeholder="Bairro" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input {...form.register("cidade")} placeholder="Cidade" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={form.watch("estado") || ""}
                    onValueChange={(v) => form.setValue("estado", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input {...form.register("pais")} placeholder="Brasil" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3 — Contatos */}
        <TabsContent value="contatos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Telefone Fixo</Label>
                  <Input {...form.register("telefone_fixo")} placeholder="(00) 0000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input {...form.register("celular")} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input {...form.register("whatsapp")} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>E-mail Principal</Label>
                  <Input
                    type="email"
                    {...form.register("email")}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Secundário</Label>
                  <Input
                    type="email"
                    {...form.register("email_secundario")}
                    placeholder="email2@exemplo.com"
                  />
                </div>
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm">Dados Bancários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Input {...form.register("banco")} placeholder="Nome do banco" />
                    </div>
                    <div className="space-y-2">
                      <Label>Agência</Label>
                      <Input {...form.register("agencia")} placeholder="0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Conta</Label>
                      <Input {...form.register("conta")} placeholder="00000-0" />
                    </div>
                    <div className="space-y-2">
                      <Label>PIX</Label>
                      <Input {...form.register("pix")} placeholder="Chave PIX" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4 — Documentos */}
        <TabsContent value="documentos">
          <PersonDocumentsTab personId={personId} documents={person?.person_documents} />
        </TabsContent>

        {/* Tab 5 — Processos Vinculados */}
        {isEditing && (
          <TabsContent value="processos">
            <PersonCasesTab person={person} />
          </TabsContent>
        )}

        {/* Tab 6 — Projetos Vinculados */}
        {isEditing && (
          <TabsContent value="projetos">
            <PersonProjectsTab person={person} />
          </TabsContent>
        )}

        {/* Tab 7 — Histórico */}
        {isEditing && (
          <TabsContent value="historico">
            <PersonHistoryTab person={person} />
          </TabsContent>
        )}
      </Tabs>
    </form>
  )
}

// ─── Documents Tab ───────────────────────────────────────────────────────────

interface PersonDocumentsTabProps {
  personId?: string
  documents?: Array<{
    id: string
    tipo: string
    titulo: string
    arquivo_url: string
    data_validade: Date | null
    observacoes: string | null
    uploaded_at: Date
    uploaded_by: { id: string; name: string } | null
  }>
}

function PersonDocumentsTab({ personId, documents }: PersonDocumentsTabProps) {
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState("")
  const [docTitle, setDocTitle] = useState("")

  const utils = trpc.useUtils()

  const addDocMutation = trpc.persons.addDocument.useMutation({
    onSuccess: () => {
      utils.persons.getById.invalidate({ id: personId! })
      setDocTitle("")
      setDocType("")
    },
  })

  const removeDocMutation = trpc.persons.removeDocument.useMutation({
    onSuccess: () => {
      utils.persons.getById.invalidate({ id: personId! })
    },
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !personId || !docType || !docTitle) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", `persons/${personId}`)

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const { url } = await res.json()

      if (url) {
        addDocMutation.mutate({
          person_id: personId,
          tipo: docType as "CNH",
          titulo: docTitle,
          arquivo_url: url,
        })
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {personId ? (
          <>
            {/* Upload form */}
            <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1.5 min-w-[150px]">
                <Label className="text-xs">Tipo</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="bg-white h-9">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERSON_DOC_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label className="text-xs">Título</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Descrição do documento"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="doc-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Upload
                  </div>
                </Label>
                <input
                  id="doc-upload"
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading || !docType || !docTitle}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </div>
            </div>

            {/* Document list */}
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="size-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.titulo}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {PERSON_DOC_TYPE_LABELS[doc.tipo] || doc.tipo}
                          </Badge>
                          <span>
                            {new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}
                          </span>
                          {doc.uploaded_by && <span>por {doc.uploaded_by.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => removeDocMutation.mutate({ id: doc.id })}
                        disabled={removeDocMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum documento anexado ainda.
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            Salve o cadastro primeiro para anexar documentos.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Cases Tab ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PersonCasesTab({ person }: { person: any }) {
  if (!person) return null

  const casesAsClient = (person.cases_as_client ?? []) as Array<{
    id: string; numero_processo: string | null; tipo: string; status: string; vara?: string; comarca?: string
  }>
  const caseParties = (person.case_parties ?? []) as Array<{
    role: string; case_: { id: string; numero_processo: string | null; tipo: string; status: string; cliente?: { nome: string } }
  }>
  const casesAsJudge = (person.cases_as_judge ?? []) as Array<{
    id: string; numero_processo: string | null; tipo: string; status: string
  }>

  const allCases = [
    ...casesAsClient.map((c) => ({ ...c, vinculo: "Cliente" })),
    ...caseParties.map((cp) => ({
      id: cp.case_.id,
      numero_processo: cp.case_.numero_processo,
      tipo: cp.case_.tipo,
      status: cp.case_.status,
      vinculo: `Parte (${cp.role})`,
    })),
    ...casesAsJudge.map((c) => ({ ...c, vinculo: "Juiz" })),
  ]

  const uniqueCases = allCases.filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="size-4" />
          Processos Vinculados ({uniqueCases.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueCases.length > 0 ? (
          <div className="space-y-2">
            {uniqueCases.map((c) => (
              <Link
                key={c.id}
                href={`/processos/${c.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium font-mono truncate">
                    {c.numero_processo || "Sem número"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {CASE_TYPE_LABELS[c.tipo] || c.tipo}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "ATIVO"
                          ? "border-emerald-300 text-emerald-700"
                          : "border-gray-300 text-gray-600"
                      }
                    >
                      {CASE_STATUS_LABELS[c.status] || c.status}
                    </Badge>
                  </div>
                </div>
                <Badge variant="secondary">{c.vinculo}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum processo vinculado a esta pessoa.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Projects Tab ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PersonProjectsTab({ person }: { person: any }) {
  if (!person) return null

  const projectsAsClient = (person.projects_as_client ?? []) as Array<{
    id: string; titulo: string; codigo: string; categoria: string; status: string
  }>
  const projectStakeholders = (person.project_stakeholders ?? []) as Array<{
    role: string; project: { id: string; titulo: string; codigo: string; categoria: string; status: string }
  }>

  const allProjects = [
    ...projectsAsClient.map((p) => ({ ...p, vinculo: "Cliente" })),
    ...projectStakeholders.map((ps) => ({
      id: ps.project.id,
      titulo: ps.project.titulo,
      codigo: ps.project.codigo,
      categoria: ps.project.categoria,
      status: ps.project.status,
      vinculo: STAKEHOLDER_ROLE_LABELS[ps.role] || ps.role,
    })),
  ]

  const uniqueProjects = allProjects.filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanban className="size-4" />
          Projetos Vinculados ({uniqueProjects.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueProjects.length > 0 ? (
          <div className="space-y-2">
            {uniqueProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.titulo}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{p.codigo}</span>
                    <Badge variant="secondary" className="text-xs">
                      {PROJECT_CATEGORY_LABELS[p.categoria] || p.categoria}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "EM_ANDAMENTO"
                          ? "border-emerald-300 text-emerald-700"
                          : "border-gray-300 text-gray-600"
                      }
                    >
                      {PROJECT_STATUS_LABELS[p.status] || p.status}
                    </Badge>
                  </div>
                </div>
                <Badge variant="secondary">{p.vinculo}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum projeto vinculado a esta pessoa.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── History Tab ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PersonHistoryTab({ person }: { person: any }) {
  if (!person) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="size-4" />
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Cadastro criado</p>
              <p className="text-xs text-muted-foreground">
                {person.created_by ? `por ${(person.created_by as { name: string }).name}` : "Sistema"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(person.created_at as string).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Última atualização</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(person.updated_at as string).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {((person.person_documents as Array<{ uploaded_at: string }>) ?? []).length > 0 && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Documentos anexados</p>
                <p className="text-xs text-muted-foreground">
                  {(person.person_documents as unknown[]).length} documento(s)
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                Último:{" "}
                {new Date((person.person_documents as Array<{ uploaded_at: string }>)[0].uploaded_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
