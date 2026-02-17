"use client"

import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants"
import { DOCUMENT_TYPE_GROUPS } from "@/types/documents"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Search, FileText, Download, Trash2, Sparkles, X,
  MoreHorizontal, Pencil, Copy, Share2, Eye,
} from "lucide-react"

const TYPE_COLORS: Record<string, string> = {
  Jurídicos: "bg-[#17A2B8]/10 text-[#17A2B8]",
  Contratuais: "bg-[#C9A961]/10 text-[#C9A961]",
  Financeiros: "bg-[#28A745]/10 text-[#28A745]",
  Comunicação: "bg-[#C9A961]/10 text-[#C9A961]",
  Técnicos: "bg-[#17A2B8]/10 text-[#17A2B8]",
  IA: "bg-[#C9A961]/10 text-[#C9A961]",
  Outros: "bg-gray-50 text-gray-600",
}

function getTypeGroup(tipo: string): string {
  for (const [group, types] of Object.entries(DOCUMENT_TYPE_GROUPS)) {
    if ((types as readonly string[]).includes(tipo)) return group
  }
  return "Outros"
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPageClient() {
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [caseFilter, setCaseFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [iaFilter, setIaFilter] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Upload form state
  const [uploadTitulo, setUploadTitulo] = useState("")
  const [uploadTipo, setUploadTipo] = useState("")
  const [uploadCaseId, setUploadCaseId] = useState("")
  const [uploadProjectId, setUploadProjectId] = useState("")
  const [uploadTags, setUploadTags] = useState("")
  const [uploadNotas, setUploadNotas] = useState("")
  const [uploadPortal, setUploadPortal] = useState(false)

  const utils = trpc.useUtils()

  const { data: cases } = trpc.documents.casesForSelect.useQuery()
  const { data: projects } = trpc.documents.projectsForSelect.useQuery()

  const { data, isLoading } = trpc.documents.list.useQuery({
    search: search || undefined,
    tipo: tipoFilter && tipoFilter !== "all" ? [tipoFilter] : undefined,
    case_id: caseFilter && caseFilter !== "all" ? caseFilter : undefined,
    project_id: projectFilter && projectFilter !== "all" ? projectFilter : undefined,
    gerado_por_ia: iaFilter ? true : undefined,
    limit: 50,
  })

  const createMutation = trpc.documents.create.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate()
      setUploadOpen(false)
      resetUploadForm()
    },
  })

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  })

  const resetUploadForm = () => {
    setUploadTitulo("")
    setUploadTipo("")
    setUploadCaseId("")
    setUploadProjectId("")
    setUploadTags("")
    setUploadNotas("")
    setUploadPortal(false)
  }

  const handleUploadSubmit = () => {
    if (!uploadTitulo || !uploadTipo) return

    createMutation.mutate({
      titulo: uploadTitulo,
      tipo: uploadTipo,
      arquivo_url: `/documents/${Date.now()}-${uploadTitulo.replace(/\s+/g, "-").toLowerCase()}`,
      case_id: uploadCaseId && uploadCaseId !== "none" ? uploadCaseId : null,
      project_id: uploadProjectId && uploadProjectId !== "none" ? uploadProjectId : null,
      tags: uploadTags ? uploadTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      compartilhado_portal: uploadPortal,
    })
  }

  const items = data?.items || []
  const hasFilters = search || (tipoFilter && tipoFilter !== "all") || (caseFilter && caseFilter !== "all") || (projectFilter && projectFilter !== "all") || iaFilter

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setUploadOpen(true)} size="sm">
          <Plus className="size-4 mr-1" />
          Upload
        </Button>

        <Button variant="outline" size="sm" asChild>
          <Link href="/confeccao">
            <Sparkles className="size-4 mr-1" />
            Gerar com Harvey Specter
          </Link>
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#666666]" />
          <Input
            placeholder="Buscar documentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(DOCUMENT_TYPE_GROUPS).map(([group, types]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {(types as readonly string[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t] || t}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Select value={caseFilter} onValueChange={setCaseFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Processo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {cases?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.numero_processo}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={iaFilter ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setIaFilter(!iaFilter)}
        >
          <Sparkles className="size-3 mr-1" />
          IA
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
            setSearch("")
            setTipoFilter("")
            setCaseFilter("")
            setProjectFilter("")
            setIaFilter(false)
          }}>
            <X className="size-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <FileText className="size-10 text-[#666666]/30 mx-auto" />
          <p className="text-sm text-[#666666] mt-3">Nenhum documento encontrado.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
            <Plus className="size-3 mr-1" />
            Upload de documento
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[200px]">Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Vinculação</TableHead>
                <TableHead className="w-[60px]">V.</TableHead>
                <TableHead className="w-[80px]">Portal</TableHead>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((doc) => {
                const group = getTypeGroup(doc.tipo)
                const colorClass = TYPE_COLORS[group] || TYPE_COLORS.Outros
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${colorClass}`}>
                        {DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}
                      </Badge>
                      {doc.gerado_por_ia && (
                        <Sparkles className="inline-block size-3 text-[#C9A961] ml-1" />
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[300px]">{doc.titulo}</p>
                      {doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] text-[#666666] bg-muted px-1 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#666666]">
                      {doc.case_ && (
                        <Link href={`/processos/${doc.case_.id}`} className="text-[#17A2B8] hover:underline block">
                          {doc.case_.numero_processo}
                        </Link>
                      )}
                      {doc.project && (
                        <Link href={`/projetos/${doc.project.id}`} className="text-[#C9A961] hover:underline block">
                          {doc.project.codigo}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-center">{doc.versao}</TableCell>
                    <TableCell>
                      <Switch
                        checked={doc.compartilhado_portal || false}
                        onCheckedChange={() => alert("Em desenvolvimento")}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="text-xs text-[#666666]">
                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {doc.arquivo_url && (
                            <DropdownMenuItem asChild>
                              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="size-3 mr-2" />Visualizar
                              </a>
                            </DropdownMenuItem>
                          )}
                          {doc.arquivo_url && (
                            <DropdownMenuItem asChild>
                              <a href={doc.arquivo_url} download>
                                <Download className="size-3 mr-2" />Baixar
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => alert("Em desenvolvimento")}>
                            <Pencil className="size-3 mr-2" />Editar metadados
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert("Em desenvolvimento")}>
                            <Copy className="size-3 mr-2" />Nova Versão
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert("Em desenvolvimento")}>
                            <Share2 className="size-3 mr-2" />Compartilhar no Portal
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[#DC3545]"
                            onClick={() => {
                              setDeleteTargetId(doc.id)
                              setDeleteConfirmOpen(true)
                            }}
                          >
                            <Trash2 className="size-3 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#666666]">
            Tem certeza? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetId) {
                  deleteMutation.mutate({ id: deleteTargetId })
                }
                setDeleteConfirmOpen(false)
                setDeleteTargetId(null)
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* Drop zone placeholder */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="size-8 text-[#666666]/50 mx-auto" />
                <p className="text-sm text-[#666666] mt-2">
                  Arraste ou clique para selecionar arquivo
                </p>
                <p className="text-xs text-[#666666] mt-1">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 50MB)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  value={uploadTitulo}
                  onChange={(e) => setUploadTitulo(e.target.value)}
                  placeholder="Título do documento"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={uploadTipo} onValueChange={setUploadTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_GROUPS).map(([group, types]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {(types as readonly string[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {DOCUMENT_TYPE_LABELS[t] || t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Processo</Label>
                <Select value={uploadCaseId} onValueChange={setUploadCaseId}>
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
                <Select value={uploadProjectId} onValueChange={setUploadProjectId}>
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

              <div className="space-y-1.5">
                <Label className="text-xs">Tags (separadas por vírgula)</Label>
                <Input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="contrato, urgente, revisão"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={uploadNotas}
                  onChange={(e) => setUploadNotas(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Compartilhar no portal</Label>
                <Switch checked={uploadPortal} onCheckedChange={setUploadPortal} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={!uploadTitulo || !uploadTipo || createMutation.isPending}
            >
              {createMutation.isPending ? "Salvando..." : "Salvar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
