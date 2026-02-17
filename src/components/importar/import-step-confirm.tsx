"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { IMPORT_ENTITY_LABELS, type ImportEntityTypeKey } from "@/lib/import-constants"
import type { MappedRow } from "@/lib/services/import-service"

interface ImportResult {
  imported: number
  errors: number
  ignored: number
  created_ids: string[]
  error_details: { row: number; message: string }[]
  logId: string
}

interface ImportStepConfirmProps {
  entityType: ImportEntityTypeKey
  rows: MappedRow[]
  duplicateHandling: string
  importing: boolean
  result: ImportResult | null
  onExecute: () => void
  onReset: () => void
}

const ENTITY_ROUTES: Record<ImportEntityTypeKey, string> = {
  PERSON: "/pessoas",
  CASE: "/processos",
  DEADLINE: "/prazos",
  CASE_MOVEMENT: "/monitoramento",
  RJ_CREDITOR: "/recuperacao-judicial/quadro-credores",
}

export function ImportStepConfirm({
  entityType,
  rows,
  duplicateHandling,
  importing,
  result,
  onExecute,
  onReset,
}: ImportStepConfirmProps) {
  const selectedCount = rows.filter((r) => r._selected).length
  const [showErrors, setShowErrors] = useState(false)

  // Pre-import summary
  if (!result && !importing) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmar importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">{IMPORT_ENTITY_LABELS[entityType]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Registros</p>
                <p className="font-medium">{selectedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duplicados</p>
                <p className="font-medium capitalize">{duplicateHandling === "skip" ? "Pular" : duplicateHandling === "update" ? "Atualizar" : "Criar"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total no arquivo</p>
                <p className="font-medium">{rows.length}</p>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Esta ação criará {selectedCount} registro(s) no banco de dados.
                  Você poderá reverter esta importação pelo histórico.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full bg-[#C9A961] text-white hover:bg-[#B8984F]"
          size="lg"
          onClick={onExecute}
        >
          Importar {selectedCount} registros
        </Button>
      </div>
    )
  }

  // Importing progress
  if (importing) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-12 w-12 animate-spin text-[#C9A961]" />
        <p className="text-lg font-medium">Importando dados...</p>
        <p className="text-sm text-muted-foreground">
          Processando {selectedCount} registros de {IMPORT_ENTITY_LABELS[entityType]}
        </p>
        <Progress value={50} className="w-64" />
      </div>
    )
  }

  // Result
  if (result) {
    const isSuccess = result.errors === 0
    const isPartial = result.errors > 0 && result.imported > 0

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
            {isSuccess ? (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            ) : isPartial ? (
              <AlertTriangle className="h-16 w-16 text-yellow-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}

            <h3 className="text-xl font-semibold">
              {isSuccess
                ? "Importação concluída!"
                : isPartial
                ? "Importação parcial"
                : "Erro na importação"}
            </h3>

            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              {result.errors > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              )}
              {result.ignored > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{result.ignored}</p>
                  <p className="text-xs text-muted-foreground">Ignorados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error details */}
        {result.error_details.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Detalhes dos erros</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowErrors(!showErrors)}
                >
                  {showErrors ? "Ocultar" : "Mostrar"}
                </Button>
              </CardTitle>
            </CardHeader>
            {showErrors && (
              <CardContent>
                <div className="max-h-[200px] space-y-1 overflow-auto">
                  {result.error_details.map((e, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <Badge variant="destructive" className="shrink-0">
                        Linha {e.row}
                      </Badge>
                      <span className="text-muted-foreground">{e.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onReset}
          >
            Nova importação
          </Button>
          <Button
            className="flex-1 bg-[#C9A961] text-white hover:bg-[#B8984F]"
            asChild
          >
            <a href={ENTITY_ROUTES[entityType]}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver {IMPORT_ENTITY_LABELS[entityType]}
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return null
}
