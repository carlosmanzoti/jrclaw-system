"use client"

import { useState, useMemo } from "react"
import { AlertTriangle, CheckCircle2, XCircle, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IMPORT_ENTITY_FIELDS, type ImportEntityTypeKey } from "@/lib/import-constants"
import { CREDIT_NATURE_LABELS } from "@/lib/rj-constants"
import type { MappedRow } from "@/lib/services/import-service"

interface ImportStepReviewProps {
  entityType: ImportEntityTypeKey
  rows: MappedRow[]
  confidence: number
  warnings: string[]
  fieldMapping: Record<string, string>
  onRowsChange: (rows: MappedRow[]) => void
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value >= 0.8)
    return <Badge className="bg-green-500/10 text-green-600 border-green-200">{(value * 100).toFixed(0)}%</Badge>
  if (value >= 0.5)
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{(value * 100).toFixed(0)}%</Badge>
  return <Badge className="bg-red-500/10 text-red-600 border-red-200">{(value * 100).toFixed(0)}%</Badge>
}

export function ImportStepReview({
  entityType,
  rows,
  confidence,
  warnings,
  onRowsChange,
}: ImportStepReviewProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")

  const fields = useMemo(() => IMPORT_ENTITY_FIELDS[entityType], [entityType])

  // Only show fields that have at least one non-empty value
  const visibleFields = useMemo(() => {
    return fields.filter((f) =>
      rows.some((r) => r[f.field] !== undefined && r[f.field] !== null && r[f.field] !== "")
    )
  }, [fields, rows])

  const selectedCount = rows.filter((r) => r._selected).length
  const validCount = rows.filter(
    (r) => r._selected && r._errors.length === 0
  ).length

  const toggleRow = (index: number) => {
    const updated = [...rows]
    updated[index] = { ...updated[index], _selected: !updated[index]._selected }
    onRowsChange(updated)
  }

  const toggleAll = () => {
    const allSelected = rows.every((r) => r._selected)
    onRowsChange(rows.map((r) => ({ ...r, _selected: !allSelected })))
  }

  const startEdit = (rowIndex: number, field: string) => {
    setEditingCell({ row: rowIndex, field })
    setEditValue(String(rows[rowIndex][field] ?? ""))
  }

  const commitEdit = () => {
    if (!editingCell) return
    const updated = [...rows]
    updated[editingCell.row] = {
      ...updated[editingCell.row],
      [editingCell.field]: editValue,
    }
    onRowsChange(updated)
    setEditingCell(null)
  }

  const deleteRow = (index: number) => {
    onRowsChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          {confidence >= 0.7 ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          <span className="text-sm font-medium">
            Confiança da análise: <ConfidenceBadge value={confidence} />
          </span>
        </div>
        <Badge variant="outline">{rows.length} registros encontrados</Badge>
        <Badge variant="outline" className="text-green-600">
          {validCount} válidos
        </Badge>
        {selectedCount !== rows.length && (
          <Badge variant="outline" className="text-muted-foreground">
            {selectedCount} selecionados
          </Badge>
        )}
      </div>

      {/* A_DEFINIR warning for RJ_CREDITOR */}
      {entityType === "RJ_CREDITOR" &&
        rows.some((r) => r._selected && r.natureza === "A_DEFINIR") && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Natureza da garantia pendente
            </p>
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
            Alguns credores Classe II estão com natureza &quot;A Definir&quot;.
            Selecione a natureza correta na coluna &quot;Natureza&quot; antes de confirmar a importação.
          </p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="mb-1 text-sm font-medium text-yellow-700 dark:text-yellow-400">Avisos da IA:</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-600 dark:text-yellow-500">
                &bull; {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data table */}
      <div className="max-h-[500px] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={rows.length > 0 && rows.every((r) => r._selected)}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-16">Conf.</TableHead>
              {visibleFields.map((f) => (
                <TableHead key={f.field} className="min-w-[120px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {f.label}
                          {f.required && <span className="text-red-500">*</span>}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{f.field} ({f.type})</p>
                        {f.description && <p className="text-xs">{f.description}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                className={
                  !row._selected
                    ? "opacity-40"
                    : row._errors.length > 0
                    ? "bg-red-50 dark:bg-red-950/20"
                    : ""
                }
              >
                <TableCell>
                  <Checkbox
                    checked={row._selected}
                    onCheckedChange={() => toggleRow(i)}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row._rowIndex}
                </TableCell>
                <TableCell>
                  <ConfidenceBadge value={row._confidence} />
                </TableCell>
                {visibleFields.map((f) => {
                  const isEditing =
                    editingCell?.row === i && editingCell?.field === f.field
                  const value = row[f.field]
                  const hasWarning = row._warnings.some((w: string) =>
                    w.toLowerCase().includes(f.field.toLowerCase())
                  )
                  const isNaturezaField = entityType === "RJ_CREDITOR" && f.field === "natureza"
                  const isADefinir = isNaturezaField && value === "A_DEFINIR"

                  return (
                    <TableCell
                      key={f.field}
                      className={`text-sm ${isADefinir ? "bg-amber-50 dark:bg-amber-950/20" : hasWarning ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
                      onDoubleClick={() => !isNaturezaField && startEdit(i, f.field)}
                    >
                      {isNaturezaField ? (
                        <Select
                          value={String(value || "")}
                          onValueChange={(v) => {
                            const updated = [...rows]
                            updated[i] = { ...updated[i], natureza: v }
                            onRowsChange(updated)
                          }}
                        >
                          <SelectTrigger className={`h-7 text-xs ${isADefinir ? "border-amber-400 text-amber-700" : ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CREDIT_NATURE_LABELS).map(([k, label]) => (
                              <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit()
                            if (e.key === "Escape") setEditingCell(null)
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="group flex items-center gap-1">
                          <span className="max-w-[200px] truncate">
                            {value !== undefined && value !== null
                              ? String(value)
                              : ""}
                          </span>
                          <button
                            onClick={() => startEdit(i, f.field)}
                            className="invisible group-hover:visible"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteRow(i)}
                  >
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Clique duplo em uma célula para editar. Use as checkboxes para incluir/excluir registros.
      </p>
    </div>
  )
}
