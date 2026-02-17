"use client"

import { useState } from "react"
import { AlertTriangle, Info, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { IMPORT_ENTITY_LABELS, type ImportEntityTypeKey } from "@/lib/import-constants"
import type { MappedRow } from "@/lib/services/import-service"

interface ImportStepConfigProps {
  entityType: ImportEntityTypeKey
  rows: MappedRow[]
  duplicateHandling: "skip" | "update" | "create"
  onDuplicateHandlingChange: (v: "skip" | "update" | "create") => void
  duplicatesFound: number
  // Context-specific fields
  contextId: string
  onContextIdChange: (v: string) => void
  defaultValues: Record<string, string>
  onDefaultValuesChange: (v: Record<string, string>) => void
  // Template saving
  saveAsTemplate: boolean
  onSaveAsTemplateChange: (v: boolean) => void
  templateName: string
  onTemplateNameChange: (v: string) => void
  // Available options from DB
  cases: { id: string; numero_processo: string | null; cliente?: { nome: string } | null }[]
  users: { id: string; name: string | null }[]
  jrcs: { id: string; case_: { numero_processo: string | null; cliente: { nome: string } } }[]
}

export function ImportStepConfig({
  entityType,
  rows,
  duplicateHandling,
  onDuplicateHandlingChange,
  duplicatesFound,
  contextId,
  onContextIdChange,
  defaultValues,
  onDefaultValuesChange,
  saveAsTemplate,
  onSaveAsTemplateChange,
  templateName,
  onTemplateNameChange,
  cases,
  users,
  jrcs,
}: ImportStepConfigProps) {
  const selectedCount = rows.filter((r) => r._selected).length
  const errorCount = rows.filter((r) => r._selected && r._errors.length > 0).length

  const needsContext = entityType === "DEADLINE" || entityType === "CASE_MOVEMENT" || entityType === "RJ_CREDITOR"
  const needsResponsavel = entityType === "CASE" || entityType === "DEADLINE"

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo da importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{selectedCount}</p>
              <p className="text-xs text-muted-foreground">Registros</p>
            </div>
            {duplicatesFound > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{duplicatesFound}</p>
                <p className="text-xs text-muted-foreground">Duplicados</p>
              </div>
            )}
            {errorCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Com erros</p>
              </div>
            )}
            <div className="text-center">
              <Badge className="bg-[#C9A961]/10 text-[#C9A961]">
                {IMPORT_ENTITY_LABELS[entityType]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate handling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Tratamento de duplicados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={duplicateHandling}
            onValueChange={(v) => onDuplicateHandlingChange(v as "skip" | "update" | "create")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Pular registros duplicados</SelectItem>
              <SelectItem value="update">Atualizar registros existentes</SelectItem>
              <SelectItem value="create">Criar duplicatas mesmo assim</SelectItem>
            </SelectContent>
          </Select>
          {duplicatesFound > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              {duplicatesFound} registro(s) duplicado(s) encontrado(s)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context-specific config */}
      {needsContext && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuração específica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(entityType === "DEADLINE" || entityType === "CASE_MOVEMENT") && (
              <div className="space-y-2">
                <Label>Processo vinculado *</Label>
                <Select value={contextId} onValueChange={onContextIdChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero_processo || "Sem número"} — {c.cliente?.nome || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {entityType === "RJ_CREDITOR" && (
              <div className="space-y-2">
                <Label>Recuperação Judicial vinculada *</Label>
                <Select value={contextId} onValueChange={onContextIdChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o caso RJ" />
                  </SelectTrigger>
                  <SelectContent>
                    {jrcs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.case_.numero_processo || "Sem número"} — {j.case_.cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Default values */}
      {needsResponsavel && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores padrão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Responsável padrão</Label>
              <Select
                value={defaultValues.responsavel_id || defaultValues.advogado_responsavel_id || ""}
                onValueChange={(v) => {
                  const key = entityType === "CASE" ? "advogado_responsavel_id" : "responsavel_id"
                  onDefaultValuesChange({ ...defaultValues, [key]: v })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {entityType === "CASE" && (
              <div className="space-y-2">
                <Label>Cliente padrão</Label>
                <Input
                  placeholder="ID do cliente (Person)"
                  value={defaultValues.cliente_id || ""}
                  onChange={(e) =>
                    onDefaultValuesChange({ ...defaultValues, cliente_id: e.target.value })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save as template */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Save className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Salvar como template</p>
              <p className="text-xs text-muted-foreground">
                Reutilize este mapeamento em futuras importações
              </p>
            </div>
          </div>
          <Switch checked={saveAsTemplate} onCheckedChange={onSaveAsTemplateChange} />
        </CardContent>
        {saveAsTemplate && (
          <CardContent className="border-t pt-3">
            <Label>Nome do template</Label>
            <Input
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder="Ex: Importação credores PJe"
              className="mt-1"
            />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
