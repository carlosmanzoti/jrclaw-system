"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants"
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Upload,
  FolderPlus,
  RefreshCw,
  Download,
  Import,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Loader2,
  AlertCircle,
} from "lucide-react"
import useSWR from "swr"

interface OneDriveFile {
  id: string
  name: string
  size: number
  webUrl: string
  lastModified: string
  isFolder: boolean
  childCount: number
  mimeType: string | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatFileSize(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(item: OneDriveFile) {
  if (item.isFolder) return <Folder className="size-4 text-amber-500" />
  const mime = item.mimeType || ""
  const name = item.name.toLowerCase()
  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/.test(name))
    return <FileImage className="size-4 text-pink-500" />
  if (mime.includes("spreadsheet") || /\.(xls|xlsx|csv)$/.test(name))
    return <FileSpreadsheet className="size-4 text-emerald-600" />
  if (mime.includes("pdf") || /\.pdf$/.test(name))
    return <FileText className="size-4 text-red-500" />
  if (mime.includes("word") || /\.(doc|docx|rtf)$/.test(name))
    return <FileText className="size-4 text-blue-600" />
  return <File className="size-4 text-gray-500" />
}

const DOC_TYPES = Object.entries(DOCUMENT_TYPE_LABELS)

export function OneDriveBrowser() {
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importItem, setImportItem] = useState<OneDriveFile | null>(null)
  const [importTitulo, setImportTitulo] = useState("")
  const [importTipo, setImportTipo] = useState("OUTRO")
  const [importing, setImporting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined
  const queryParam = currentFolderId ? `?folderId=${currentFolderId}` : ""

  const { data, isLoading, mutate } = useSWR<{
    connected: boolean
    items: OneDriveFile[]
    error?: string
  }>(`/api/onedrive/files${queryParam}`, fetcher)

  const navigateToFolder = useCallback((item: OneDriveFile) => {
    setFolderStack((prev) => [...prev, { id: item.id, name: item.name }])
  }, [])

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index < 0) {
      setFolderStack([])
    } else {
      setFolderStack((prev) => prev.slice(0, index + 1))
    }
  }, [])

  const handleImportClick = useCallback((item: OneDriveFile) => {
    setImportItem(item)
    setImportTitulo(item.name.replace(/\.[^/.]+$/, ""))
    setImportTipo("OUTRO")
    setImportOpen(true)
  }, [])

  const handleImportSubmit = async () => {
    if (!importItem || !importTitulo) return
    setImporting(true)
    try {
      const res = await fetch("/api/onedrive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: importItem.id,
          titulo: importTitulo,
          tipo: importTipo,
        }),
      })
      if (!res.ok) throw new Error("Falha ao importar")
      setImportOpen(false)
      setImportItem(null)
    } catch {
      // Error
    } finally {
      setImporting(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentFolderId) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folderId", currentFolderId)
      formData.append("filename", file.name)

      const res = await fetch("/api/onedrive/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Falha no upload")
      mutate()
    } catch {
      // Error
    } finally {
      setUploading(false)
    }
    e.target.value = ""
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentFolderId) return
    setCreating(true)
    try {
      const res = await fetch("/api/onedrive/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: currentFolderId, name: newFolderName.trim() }),
      })
      if (res.ok) {
        mutate()
        setNewFolderOpen(false)
        setNewFolderName("")
      }
    } catch {
      // Error
    } finally {
      setCreating(false)
    }
  }

  const connected = data?.connected ?? false
  const items = data?.items || []

  // Not connected state
  if (!isLoading && !connected) {
    return (
      <TooltipProvider>
        <div className="text-center py-12 border rounded-lg border-dashed">
          <HardDrive className="size-10 text-[#666666]/30 mx-auto" />
          <p className="text-sm text-[#666666] mt-3">OneDrive não conectado</p>
          <p className="text-xs text-[#999999] mt-1">
            Conecte sua conta Microsoft em Configurações para acessar arquivos do OneDrive.
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                <HardDrive className="size-3 mr-1" />
                Navegar no OneDrive
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Conecte sua conta Microsoft em Configurações
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        {currentFolderId && (
          <>
            <label htmlFor="onedrive-upload">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? (
                    <Loader2 className="size-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="size-3 mr-1" />
                  )}
                  Upload
                </span>
              </Button>
            </label>
            <input
              id="onedrive-upload"
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewFolderOpen(true)}
            >
              <FolderPlus className="size-3 mr-1" />
              Nova pasta
            </Button>
          </>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
        >
          <RefreshCw className={`size-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-xs text-[#666666] mb-3 flex-wrap">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className="hover:text-[#17A2B8] hover:underline font-medium"
        >
          OneDrive
        </button>
        {folderStack.map((folder, index) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`hover:text-[#17A2B8] hover:underline ${
                index === folderStack.length - 1 ? "font-medium text-[#2A2A2A]" : ""
              }`}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data?.error ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <AlertCircle className="size-8 text-red-400 mx-auto" />
          <p className="text-sm text-[#666666] mt-2">{data.error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <Folder className="size-8 text-[#666666]/30 mx-auto" />
          <p className="text-sm text-[#666666] mt-2">Pasta vazia</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[100px]">Tamanho</TableHead>
                <TableHead className="w-[140px]">Modificado</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={item.isFolder ? "cursor-pointer hover:bg-muted/50" : ""}>
                  <TableCell
                    onClick={() => item.isFolder && navigateToFolder(item)}
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(item)}
                      <span className="text-sm truncate max-w-[300px]">
                        {item.name}
                      </span>
                      {item.isFolder && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.childCount}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-[#666666]">
                    {item.isFolder ? "—" : formatFileSize(item.size)}
                  </TableCell>
                  <TableCell className="text-xs text-[#666666]">
                    {new Date(item.lastModified).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {!item.isFolder && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleImportClick(item)}
                        >
                          <Import className="size-3 mr-1" />
                          Importar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <a href={item.webUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <a href={`/api/onedrive/download/${item.id}`}>
                            <Download className="size-3" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar para JRCLaw</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              {importItem && getFileIcon(importItem)}
              <span className="text-sm truncate">{importItem?.name}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={importTitulo}
                onChange={(e) => setImportTitulo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de documento</Label>
              <Select value={importTipo} onValueChange={setImportTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportSubmit}
              disabled={!importTitulo || importing}
            >
              {importing ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Import className="size-4 mr-1" />
              )}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome da pasta</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || creating}
            >
              {creating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <FolderPlus className="size-4 mr-1" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
