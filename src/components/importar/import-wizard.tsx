"use client"

import { useState, useCallback } from "react"
import { Upload, Search, Settings, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"
import type { ImportEntityTypeKey } from "@/lib/import-constants"
import type { MappedRow } from "@/lib/services/import-service"
import { ImportStepUpload } from "./import-step-upload"
import { ImportStepReview } from "./import-step-review"
import { ImportStepConfig } from "./import-step-config"
import { ImportStepConfirm } from "./import-step-confirm"

const STEPS = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Revisão", icon: Search },
  { id: 3, label: "Configuração", icon: Settings },
  { id: 4, label: "Importar", icon: CheckCircle },
]

interface ImportResult {
  imported: number
  errors: number
  ignored: number
  created_ids: string[]
  error_details: { row: number; message: string }[]
  logId: string
}

export function ImportWizard() {
  const [step, setStep] = useState(1)

  // Step 1 state
  const [entityType, setEntityType] = useState<ImportEntityTypeKey | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileType, setFileType] = useState("")
  const [extractedText, setExtractedText] = useState("")

  // Step 2 state
  const [rows, setRows] = useState<MappedRow[]>([])
  const [confidence, setConfidence] = useState(0)
  const [warnings, setWarnings] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})

  // Step 3 state
  const [duplicateHandling, setDuplicateHandling] = useState<"skip" | "update" | "create">("skip")
  const [contextId, setContextId] = useState("")
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({})
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [duplicatesFound, setDuplicatesFound] = useState(0)

  // Step 4 state
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // tRPC queries
  const templatesQuery = trpc.import.templates.list.useQuery()
  const executeMutation = trpc.import.execute.useMutation()
  const saveTemplateMutation = trpc.import.templates.create.useMutation()
  const checkDupsMutation = trpc.import.checkDuplicates.useMutation()

  // Fetch context data for config step
  const needsCases = step >= 3 && (entityType === "DEADLINE" || entityType === "CASE_MOVEMENT" || entityType === "CASE")
  const needsUsers = step >= 3 && (entityType === "CASE" || entityType === "DEADLINE")
  const casesQuery = trpc.cases.list.useQuery(
    { limit: 100 },
    { enabled: needsCases }
  )
  const usersQuery = trpc.users.list.useQuery(
    undefined,
    { enabled: needsUsers }
  )

  const handleAnalysisComplete = useCallback(
    (data: {
      rows: MappedRow[]
      confidence: number
      warnings: string[]
      fieldMapping: Record<string, string>
      fileName: string
      fileType: string
      extractedText: string
    }) => {
      setRows(data.rows)
      setConfidence(data.confidence)
      setWarnings(data.warnings)
      setFieldMapping(data.fieldMapping)
      setFileName(data.fileName)
      setFileType(data.fileType)
      setExtractedText(data.extractedText)
      setStep(2)
    },
    []
  )

  const handleGoToConfig = useCallback(async () => {
    if (!entityType) return
    // Check duplicates before showing config
    try {
      const selected = rows.filter((r) => r._selected)
      const dupResult = await checkDupsMutation.mutateAsync({
        entityType,
        rows: selected,
        contextId: contextId || undefined,
      })
      setDuplicatesFound(dupResult.existing.length)
    } catch {
      // If dup check fails, continue anyway
    }
    setStep(3)
  }, [entityType, rows, contextId, checkDupsMutation])

  const handleExecute = async () => {
    if (!entityType) return
    setImporting(true)

    try {
      // Save template if requested
      if (saveAsTemplate && templateName.trim()) {
        await saveTemplateMutation.mutateAsync({
          nome: templateName,
          entity_type: entityType,
          field_mapping: fieldMapping,
        })
      }

      const res = await executeMutation.mutateAsync({
        entityType,
        rows: rows.filter((r) => r._selected),
        duplicateHandling,
        contextId: contextId || undefined,
        defaultValues: Object.keys(defaultValues).length > 0 ? defaultValues : undefined,
        templateId: selectedTemplateId || undefined,
        fileName,
        fileType,
        aiAnalysis: { confidence, warnings, fieldMapping },
      })

      setResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na importação"
      setResult({
        imported: 0,
        errors: 1,
        ignored: 0,
        created_ids: [],
        error_details: [{ row: 0, message: msg }],
        logId: "",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setEntityType(null)
    setSelectedTemplateId(null)
    setFileName("")
    setFileType("")
    setExtractedText("")
    setRows([])
    setConfidence(0)
    setWarnings([])
    setFieldMapping({})
    setDuplicateHandling("skip")
    setContextId("")
    setDefaultValues({})
    setSaveAsTemplate(false)
    setTemplateName("")
    setDuplicatesFound(0)
    setImporting(false)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                step === s.id
                  ? "bg-[#C9A961] text-white"
                  : step > s.id
                  ? "bg-[#C9A961]/20 text-[#C9A961]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 ${
                  step > s.id ? "bg-[#C9A961]" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Upload e análise do arquivo"}
            {step === 2 && "Revisão dos dados mapeados"}
            {step === 3 && "Configuração da importação"}
            {step === 4 && "Confirmar e importar"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <ImportStepUpload
              entityType={entityType}
              onEntityTypeChange={setEntityType}
              onAnalysisComplete={handleAnalysisComplete}
              templates={templatesQuery.data || []}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={setSelectedTemplateId}
            />
          )}

          {step === 2 && entityType && (
            <ImportStepReview
              entityType={entityType}
              rows={rows}
              confidence={confidence}
              warnings={warnings}
              fieldMapping={fieldMapping}
              onRowsChange={setRows}
            />
          )}

          {step === 3 && entityType && (
            <ImportStepConfig
              entityType={entityType}
              rows={rows}
              duplicateHandling={duplicateHandling}
              onDuplicateHandlingChange={setDuplicateHandling}
              duplicatesFound={duplicatesFound}
              contextId={contextId}
              onContextIdChange={setContextId}
              defaultValues={defaultValues}
              onDefaultValuesChange={setDefaultValues}
              saveAsTemplate={saveAsTemplate}
              onSaveAsTemplateChange={setSaveAsTemplate}
              templateName={templateName}
              onTemplateNameChange={setTemplateName}
              cases={casesQuery.data?.items || []}
              users={usersQuery.data || []}
              jrcs={[]}
            />
          )}

          {step === 4 && entityType && (
            <ImportStepConfirm
              entityType={entityType}
              rows={rows}
              duplicateHandling={duplicateHandling}
              importing={importing}
              result={result}
              onExecute={handleExecute}
              onReset={handleReset}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {step > 1 && step < 4 && !result && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {step === 2 && (
            <Button
              className="bg-[#C9A961] text-white hover:bg-[#B8984F]"
              onClick={handleGoToConfig}
              disabled={rows.filter((r) => r._selected).length === 0}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 3 && (
            <Button
              className="bg-[#C9A961] text-white hover:bg-[#B8984F]"
              onClick={() => setStep(4)}
              disabled={
                (entityType === "DEADLINE" || entityType === "CASE_MOVEMENT" || entityType === "RJ_CREDITOR") &&
                !contextId
              }
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
