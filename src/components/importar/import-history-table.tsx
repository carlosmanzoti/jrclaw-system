"use client"

import { useState } from "react"
import { RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc"
import { IMPORT_ENTITY_LABELS, type ImportEntityTypeKey } from "@/lib/import-constants"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDENTE: { label: "Pendente", variant: "secondary" },
  PROCESSANDO: { label: "Processando", variant: "default" },
  CONCLUIDO: { label: "Concluído", variant: "default" },
  CONCLUIDO_PARCIAL: { label: "Parcial", variant: "outline" },
  ERRO: { label: "Erro", variant: "destructive" },
  REVERTIDO: { label: "Revertido", variant: "secondary" },
}

export function ImportHistoryTable() {
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const query = trpc.import.history.list.useQuery({
    page,
    limit: 20,
    entity_type: entityFilter !== "all" ? (entityFilter as ImportEntityTypeKey) : undefined,
    status: statusFilter !== "all" ? (statusFilter as never) : undefined,
  })

  const rollbackMutation = trpc.import.history.rollback.useMutation({
    onSuccess: () => query.refetch(),
  })

  const handleRollback = async (id: string) => {
    if (!confirm("Tem certeza que deseja reverter esta importação? Todos os registros criados serão excluídos.")) return
    await rollbackMutation.mutateAsync({ id })
  }

  const data = query.data

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(IMPORT_ENTITY_LABELS) as ImportEntityTypeKey[]).map((key) => (
              <SelectItem key={key} value={key}>{IMPORT_ENTITY_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Importados</TableHead>
              <TableHead className="text-right">Erros</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Template</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.items?.length && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  {query.isLoading ? "Carregando..." : "Nenhuma importação encontrada"}
                </TableCell>
              </TableRow>
            )}
            {data?.items?.map((item) => {
              const statusInfo = STATUS_LABELS[item.status] || { label: item.status, variant: "outline" as const }
              return (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {item.arquivo_nome}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {IMPORT_ENTITY_LABELS[item.entity_type as ImportEntityTypeKey] || item.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-green-600">
                    {item.importados}
                  </TableCell>
                  <TableCell className="text-right text-sm text-red-600">
                    {item.erros}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.total_linhas}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.template?.nome || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <DetailDialog logId={item.id} />
                      {!item.revertido && item.status !== "ERRO" && item.importados > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRollback(item.id)}
                          disabled={rollbackMutation.isPending}
                          title="Reverter importação"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages} ({data.total} registros)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailDialog({ logId }: { logId: string }) {
  const [open, setOpen] = useState(false)
  const query = trpc.import.history.getById.useQuery(
    { id: logId },
    { enabled: open }
  )

  const details = query.data?.detalhes as { errors?: { row: number; message: string }[]; created_ids?: string[] } | null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver detalhes">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes da importação</DialogTitle>
        </DialogHeader>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : query.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Arquivo</p>
                <p className="font-medium">{query.data.arquivo_nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{query.data.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Importados</p>
                <p className="font-medium text-green-600">{query.data.importados}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Erros</p>
                <p className="font-medium text-red-600">{query.data.erros}</p>
              </div>
            </div>

            {details?.errors && details.errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Erros:</p>
                <div className="max-h-[200px] space-y-1 overflow-auto rounded border p-2">
                  {details.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium text-red-500">Linha {e.row}:</span> {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {details?.created_ids && details.created_ids.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {details.created_ids.length} registros criados
              </p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
