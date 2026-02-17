import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { buildFieldDescriptionForAI, type ImportEntityTypeKey } from "@/lib/import-constants"

const VALID_ENTITY_TYPES: ImportEntityTypeKey[] = [
  "PERSON", "CASE", "DEADLINE", "CASE_MOVEMENT", "RJ_CREDITOR",
]

const requestSchema = z.object({
  text: z.string().min(1),
  entityType: z.enum(["PERSON", "CASE", "DEADLINE", "CASE_MOVEMENT", "RJ_CREDITOR"]),
  templateHint: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { text, entityType, templateHint } = parsed.data

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json({ error: "Tipo de entidade inválido" }, { status: 400 })
    }

    const fieldDescription = buildFieldDescriptionForAI(entityType)
    const config = MODEL_CONFIGS.standard

    const systemPrompt = `You are a legal data extraction specialist for JRCLaw, a Brazilian law firm management system.
Analyze the following text extracted from a file and extract structured records.

Target entity: ${entityType}
Available fields:
${fieldDescription}

${templateHint ? `Additional context from template: ${templateHint}` : ""}

Rules:
- Extract ALL records found in the text
- Map values to the correct field types
- For monetary values: extract as numbers in reais (e.g., 150000.50), NOT centavos
- For dates: use ISO 8601 format (YYYY-MM-DD)
- For enums: match to the closest valid value from the provided list (use exact enum values)
- For CPF/CNPJ: preserve original format with punctuation
- If a value is ambiguous or you're unsure, include it with a warning message
- Return a confidence score (0.0 to 1.0) for each row based on how well the data matched
- If the text appears to be tabular (CSV, spreadsheet), each row is typically one record
- If the text is a legal document (PDF), identify distinct entities mentioned
- Always return the fieldMapping showing which source column/pattern maps to which target field`

    const result = await generateObject({
      model: anthropic(config.model),
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      system: systemPrompt,
      prompt: `Extract structured ${entityType} records from the following text:\n\n${text.slice(0, 50000)}`,
      schema: z.object({
        rows: z.array(
          z.object({
            data: z.record(z.string(), z.unknown()),
            confidence: z.number().min(0).max(1),
            warnings: z.array(z.string()),
          })
        ),
        overallConfidence: z.number().min(0).max(1),
        warnings: z.array(z.string()),
        fieldMapping: z.record(z.string(), z.string()),
        recordsFound: z.number(),
      }),
    })

    const mappedRows = result.object.rows.map((row, index) => ({
      _rowIndex: index + 1,
      _confidence: row.confidence,
      _warnings: row.warnings,
      _errors: [] as string[],
      _selected: true,
      ...row.data,
    }))

    return NextResponse.json({
      rows: mappedRows,
      confidence: result.object.overallConfidence,
      warnings: result.object.warnings,
      fieldMapping: result.object.fieldMapping,
      recordsFound: result.object.recordsFound,
    })
  } catch (err: unknown) {
    console.error("Error in AI import analysis:", err)
    const message = err instanceof Error ? err.message : "Erro ao analisar arquivo com IA"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
