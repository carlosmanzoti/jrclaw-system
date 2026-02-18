"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OneDriveBrowser } from "@/components/documentos/onedrive-browser"
import { HardDrive, FileText as FileTextIcon2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants"
import { DOCUMENT_TYPE_GROUPS } from "@/types/documents"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Search, FileText, Download, Trash2, Sparkles, X,
  MoreHorizontal, Pencil, Copy, Share2, Eye, Upload, Loader2,
  ChevronsUpDown, Check,
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
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitulo, setUploadTitulo] = useState("")
  const [uploadTipo, setUploadTipo] = useState("")
  const [uploadCaseId, setUploadCaseId] = useState("")
  const [uploadProjectId, setUploadProjectId] = useState("")
  const [uploadTags, setUploadTags] = useState("")
  const [uploadNotas, setUploadNotas] = useState("")
  const [uploadPortal, setUploadPortal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [casePopoverOpen, setCasePopoverOpen] = useState(false)
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const createMutation = trpc.documents.create.useMutation()

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  })

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadTitulo("")
    setUploadTipo("")
    setUploadCaseId("")
    setUploadProjectId("")
    setUploadTags("")
    setUploadNotas("")
    setUploadPortal(false)
    setUploading(false)
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile || !uploadTitulo) return

    setUploading(true)
    try {
      // Step 1: Upload file to storage
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("folder", "documentos")

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) throw new Error("Falha no upload do arquivo")

      const { url } = await uploadRes.json()

      // Step 2: Create document record
      await createMutation.mutateAsync({
        titulo: uploadTitulo,
        tipo: uploadTipo || "OUTRO",
        arquivo_url: url,
        case_id: uploadCaseId && uploadCaseId !== "none" ? uploadCaseId : null,
        project_id: uploadProjectId && uploadProjectId !== "none" ? uploadProjectId : null,
        tags: uploadTags ? uploadTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        compartilhado_portal: uploadPortal,
      })

      utils.documents.list.invalidate()
      setUploadOpen(false)
      resetUploadForm()
    } catch {
      // Error handling - mutation error will show
    } finally {
      setUploading(false)
    }
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadFile(file)
      if (!uploadTitulo) {
        setUploadTitulo(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "))
      }
    }
  }, [uploadTitulo])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      if (!uploadTitulo) {
        setUploadTitulo(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "))
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [uploadTitulo])

  const getCaseLabel = (id: string) => {
    const c = cases?.find((c) => c.id === id)
    return c ? `${c.numero_processo} — ${c.cliente?.nome || ""}` : ""
  }

  const getProjectLabel = (id: string) => {
    const p = projects?.find((p) => p.id === id)
    return p ? `${p.codigo} — ${p.titulo}` : ""
  }

  const items = data?.items || []
  const hasFilters = search || (tipoFilter && tipoFilter !== "all") || (caseFilter && caseFilter !== "all") || (projectFilter && projectFilter !== "all") || iaFilter

  return (
    <Tabs defaultValue="documentos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="documentos" className="gap-1.5">
          <FileTextIcon2 className="size-3.5" />
          Documentos
        </TabsTrigger>
        <TabsTrigger value="onedrive" className="gap-1.5">
          <HardDrive className="size-3.5" />
          OneDrive
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documentos" className="space-y-4">
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
      <Dialog open={uploadOpen} onOpenChange={(open) => {
        if (!open && !uploading) {
          resetUploadForm()
        }
        if (!uploading) setUploadOpen(open)
      }}>
        <DialogContent className="min-w-[650px] max-w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
          {/* FIXED HEADER */}
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            <div className="space-y-4">
              {/* Drag-and-drop area */}
              {!uploadFile ? (
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isDragging
                      ? "border-[#C9A961] bg-[#C9A961]/5"
                      : "border-[#CCCCCC] hover:border-[#C9A961]/50"
                  }`}
                >
                  <Upload className={`size-8 ${isDragging ? "text-[#C9A961]" : "text-[#666666]/40"}`} />
                  <p className="text-sm text-[#666666]">Arraste ou clique para selecionar arquivo</p>
                  <p className="text-xs text-[#666666]/70">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 50MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.rtf,.csv"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-[#F7F3F1]">
                  <FileText className="size-6 text-[#17A2B8] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                    <p className="text-xs text-[#666666]">{formatFileSize(uploadFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => setUploadFile(null)}
                    disabled={uploading}
                  >
                    <X className="size-4 text-[#666666]" />
                  </Button>
                </div>
              )}

              {/* Linha 1: Título */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#2A2A2A]">Título *</Label>
                <Input
                  value={uploadTitulo}
                  onChange={(e) => setUploadTitulo(e.target.value)}
                  placeholder="Título do documento"
                  className="bg-[#F2F2F2] focus:border-[#C9A961] focus:ring-[#C9A961]"
                  disabled={uploading}
                />
              </div>

              {/* Linha 2: Tipo + Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 min-w-[200px]">
                  <Label className="text-sm font-medium text-[#2A2A2A]">Tipo</Label>
                  <Select value={uploadTipo} onValueChange={setUploadTipo} disabled={uploading}>
                    <SelectTrigger className="bg-[#F2F2F2] focus:border-[#C9A961] focus:ring-[#C9A961]">
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
                  <Label className="text-sm font-medium text-[#2A2A2A]">Tags</Label>
                  <Input
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="contrato, urgente, revisão"
                    className="bg-[#F2F2F2] focus:border-[#C9A961] focus:ring-[#C9A961]"
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Linha 3: Processo (combobox) + Projeto (combobox) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Processo combobox */}
                <div className="space-y-1.5 min-w-[250px]">
                  <Label className="text-sm font-medium text-[#2A2A2A]">Processo</Label>
                  <Popover open={casePopoverOpen} onOpenChange={setCasePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={casePopoverOpen}
                        className="w-full justify-between bg-[#F2F2F2] font-normal h-9 text-sm hover:bg-[#F2F2F2] focus:border-[#C9A961] focus:ring-[#C9A961]"
                        disabled={uploading}
                      >
                        <span className="truncate">
                          {uploadCaseId && uploadCaseId !== "none"
                            ? getCaseLabel(uploadCaseId)
                            : "Nenhum"}
                        </span>
                        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar processo..." />
                        <CommandList>
                          <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setUploadCaseId("none")
                                setCasePopoverOpen(false)
                              }}
                            >
                              <Check className={`size-3.5 mr-2 ${uploadCaseId === "none" || !uploadCaseId ? "opacity-100" : "opacity-0"}`} />
                              Nenhum
                            </CommandItem>
                            {cases?.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.numero_processo} ${c.cliente?.nome || ""}`}
                                onSelect={() => {
                                  setUploadCaseId(c.id)
                                  setCasePopoverOpen(false)
                                }}
                              >
                                <Check className={`size-3.5 mr-2 ${uploadCaseId === c.id ? "opacity-100" : "opacity-0"}`} />
                                <span className="truncate">{c.numero_processo} — {c.cliente?.nome}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Projeto combobox */}
                <div className="space-y-1.5 min-w-[250px]">
                  <Label className="text-sm font-medium text-[#2A2A2A]">Projeto</Label>
                  <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={projectPopoverOpen}
                        className="w-full justify-between bg-[#F2F2F2] font-normal h-9 text-sm hover:bg-[#F2F2F2] focus:border-[#C9A961] focus:ring-[#C9A961]"
                        disabled={uploading}
                      >
                        <span className="truncate">
                          {uploadProjectId && uploadProjectId !== "none"
                            ? getProjectLabel(uploadProjectId)
                            : "Nenhum"}
                        </span>
                        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar projeto..." />
                        <CommandList>
                          <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setUploadProjectId("none")
                                setProjectPopoverOpen(false)
                              }}
                            >
                              <Check className={`size-3.5 mr-2 ${uploadProjectId === "none" || !uploadProjectId ? "opacity-100" : "opacity-0"}`} />
                              Nenhum
                            </CommandItem>
                            {projects?.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.codigo} ${p.titulo}`}
                                onSelect={() => {
                                  setUploadProjectId(p.id)
                                  setProjectPopoverOpen(false)
                                }}
                              >
                                <Check className={`size-3.5 mr-2 ${uploadProjectId === p.id ? "opacity-100" : "opacity-0"}`} />
                                <span className="truncate">{p.codigo} — {p.titulo}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Linha 4: Observações */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#2A2A2A]">Observações</Label>
                <Textarea
                  value={uploadNotas}
                  onChange={(e) => setUploadNotas(e.target.value)}
                  placeholder="Observações sobre o documento..."
                  className="min-h-[80px] bg-[#F2F2F2] focus:border-[#C9A961] focus:ring-[#C9A961]"
                  disabled={uploading}
                />
              </div>

              {/* Linha 5: Toggle portal */}
              <div className="flex items-center gap-3">
                <Switch
                  id="portal-toggle"
                  checked={uploadPortal}
                  onCheckedChange={setUploadPortal}
                  disabled={uploading}
                />
                <Label htmlFor="portal-toggle" className="text-sm font-normal text-[#2A2A2A] cursor-pointer">
                  Disponibilizar este documento para o cliente no Portal
                </Label>
              </div>
            </div>
          </div>

          {/* FIXED FOOTER */}
          <div className="shrink-0 px-6 py-4 border-t border-[#E5E5E5] bg-[#F7F3F1] flex items-center justify-end gap-3 rounded-b-lg">
            <Button
              variant="outline"
              className="border-[#C9A961] text-[#2A2A2A]"
              onClick={() => { setUploadOpen(false); resetUploadForm() }}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#C9A961] hover:bg-[#C9A961]/90 text-[#2A2A2A]"
              onClick={handleUploadSubmit}
              disabled={!uploadFile || !uploadTitulo || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-1.5" />
                  Fazer Upload
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="onedrive">
        <OneDriveBrowser />
      </TabsContent>
    </Tabs>
  )
}
