import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
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

    // Truncate large content to avoid exceeding AI context/output limits
    const MAX_INPUT_CHARS = 30000
    let inputText = text
    let wasTruncated = false
    if (text.length > MAX_INPUT_CHARS) {
      inputText = text.slice(0, MAX_INPUT_CHARS)
      // Avoid cutting mid-line
      const lastNewline = inputText.lastIndexOf("\n")
      if (lastNewline > MAX_INPUT_CHARS * 0.8) {
        inputText = inputText.slice(0, lastNewline)
      }
      wasTruncated = true
    }

    const truncationNote = wasTruncated
      ? `\nNOTE: The file was truncated for analysis (original: ${text.length} chars, analyzing first ${inputText.length} chars). Extract all records visible in the provided portion.`
      : ""

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
- Always return the fieldMapping showing which source column/pattern maps to which target field
${truncationNote}

IMPORTANT: You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no code fences).
The JSON must follow this exact structure:
{
  "rows": [
    {
      "data": { "fieldName": "value", ... },
      "confidence": 0.95,
      "warnings": ["optional warning message"]
    }
  ],
  "overallConfidence": 0.9,
  "warnings": ["optional global warning"],
  "fieldMapping": { "sourceColumn": "targetField", ... },
  "recordsFound": 5
}`

    const result = await generateText({
      model: anthropic(config.model),
      maxOutputTokens: 16384,
      temperature: config.temperature,
      system: systemPrompt,
      prompt: `Extract structured ${entityType} records from the following text:\n\n${inputText}`,
    })

    // Parse JSON from AI response (handle possible markdown code fences)
    let jsonText = result.text.trim()
    // Strip markdown code fences if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
    }

    let aiResult: {
      rows: { data: Record<string, unknown>; confidence: number; warnings: string[] }[]
      overallConfidence: number
      warnings: string[]
      fieldMapping: Record<string, string>
      recordsFound: number
    }

    try {
      aiResult = JSON.parse(jsonText)
    } catch {
      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "IA não retornou JSON válido. Tente novamente." },
          { status: 500 }
        )
      }
      try {
        aiResult = JSON.parse(jsonMatch[0])
      } catch {
        // Attempt to repair truncated JSON
        let partial = jsonMatch[0]
        // Remove last incomplete element after the last comma
        const lastComma = partial.lastIndexOf(",")
        if (lastComma > 0) {
          partial = partial.slice(0, lastComma)
        }
        // Close any open brackets/braces
        let braces = 0, brackets = 0
        let inStr = false, esc = false
        for (const ch of partial) {
          if (esc) { esc = false; continue }
          if (ch === "\\") { esc = true; continue }
          if (ch === '"') { inStr = !inStr; continue }
          if (inStr) continue
          if (ch === "{") braces++
          if (ch === "}") braces--
          if (ch === "[") brackets++
          if (ch === "]") brackets--
        }
        while (brackets > 0) { partial += "]"; brackets-- }
        while (braces > 0) { partial += "}"; braces-- }
        try {
          aiResult = JSON.parse(partial)
        } catch {
          return NextResponse.json(
            { error: "Não foi possível processar o arquivo. Tente com um arquivo menor ou em formato CSV." },
            { status: 500 }
          )
        }
      }
    }

    // Validate minimal structure
    if (!Array.isArray(aiResult.rows)) {
      return NextResponse.json(
        { error: "Resposta da IA não contém registros válidos." },
        { status: 500 }
      )
    }

    const mappedRows = aiResult.rows.map((row, index) => ({
      _rowIndex: index + 1,
      _confidence: row.confidence ?? 0.5,
      _warnings: row.warnings ?? [],
      _errors: [] as string[],
      _selected: true,
      ...row.data,
    }))

    return NextResponse.json({
      rows: mappedRows,
      confidence: aiResult.overallConfidence ?? 0.5,
      warnings: aiResult.warnings ?? [],
      fieldMapping: aiResult.fieldMapping ?? {},
      recordsFound: aiResult.recordsFound ?? mappedRows.length,
    })
  } catch (err: unknown) {
    console.error("Error in AI import analysis:", err)
    const message = err instanceof Error ? err.message : "Erro ao analisar arquivo com IA"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
