import { Prisma, PrismaClient } from "@prisma/client"
import type { ImportEntityTypeKey } from "@/lib/import-constants"
import { IMPORT_ENTITY_FIELDS, IMPORT_ENTITY_DUPLICATE_KEY } from "@/lib/import-constants"

type DB = PrismaClient | Prisma.TransactionClient

// ===== Types =====

export interface MappedRow {
  _rowIndex: number
  _confidence: number
  _warnings: string[]
  _errors: string[]
  _selected: boolean
  [field: string]: unknown
}

export interface ValidationResult {
  valid: MappedRow[]
  errors: { row: number; field: string; message: string }[]
  warnings: { row: number; field: string; message: string }[]
}

export interface DuplicateCheckResult {
  existing: { rowIndex: number; existingId: string; matchField: string; matchValue: string }[]
  newRows: MappedRow[]
}

export interface ImportResult {
  imported: number
  errors: number
  ignored: number
  created_ids: string[]
  error_details: { row: number; message: string }[]
}

// ===== Validation =====

export function validateMappedRows(
  entityType: ImportEntityTypeKey,
  rows: MappedRow[]
): ValidationResult {
  const fields = IMPORT_ENTITY_FIELDS[entityType]
  const valid: MappedRow[] = []
  const errors: { row: number; field: string; message: string }[] = []
  const warnings: { row: number; field: string; message: string }[] = []

  for (const row of rows) {
    let hasError = false
    const rowNum = row._rowIndex

    for (const field of fields) {
      const value = row[field.field]

      // Required check
      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({ row: rowNum, field: field.field, message: `${field.label} é obrigatório` })
        hasError = true
        continue
      }

      if (value === undefined || value === null || value === "") continue

      // Type checks
      if (field.type === "enum" && field.values) {
        const strVal = String(value).toUpperCase().trim()
        if (!field.values.includes(strVal)) {
          errors.push({ row: rowNum, field: field.field, message: `Valor inválido: ${value}. Valores aceitos: ${field.values.join(", ")}` })
          hasError = true
        }
      }

      if (field.type === "date") {
        const d = new Date(String(value))
        if (isNaN(d.getTime())) {
          errors.push({ row: rowNum, field: field.field, message: `Data inválida: ${value}` })
          hasError = true
        }
      }

      if (field.type === "bigint_money") {
        const num = Number(value)
        if (isNaN(num)) {
          errors.push({ row: rowNum, field: field.field, message: `Valor numérico inválido: ${value}` })
          hasError = true
        }
      }

      // CPF/CNPJ warning
      if (field.field === "cpf_cnpj" && value) {
        const digits = String(value).replace(/\D/g, "")
        if (digits.length !== 11 && digits.length !== 14) {
          warnings.push({ row: rowNum, field: field.field, message: `CPF/CNPJ com formato inesperado (${digits.length} dígitos)` })
        }
      }
    }

    if (!hasError) {
      valid.push(row)
    }
  }

  return { valid, errors, warnings }
}

// ===== Duplicate Check =====

export async function checkDuplicates(
  db: DB,
  entityType: ImportEntityTypeKey,
  rows: MappedRow[],
  contextId?: string
): Promise<DuplicateCheckResult> {
  const dupKey = IMPORT_ENTITY_DUPLICATE_KEY[entityType]
  if (!dupKey) {
    return { existing: [], newRows: rows }
  }

  const values = rows
    .map((r) => String(r[dupKey] || "").trim())
    .filter(Boolean)

  if (values.length === 0) {
    return { existing: [], newRows: rows }
  }

  let existingRecords: { id: string; matchValue: string }[] = []

  if (entityType === "PERSON") {
    const records = await (db as PrismaClient).person.findMany({
      where: { cpf_cnpj: { in: values } },
      select: { id: true, cpf_cnpj: true },
    })
    existingRecords = records.map((r) => ({ id: r.id, matchValue: r.cpf_cnpj || "" }))
  } else if (entityType === "CASE") {
    const records = await (db as PrismaClient).case.findMany({
      where: { numero_processo: { in: values } },
      select: { id: true, numero_processo: true },
    })
    existingRecords = records.map((r) => ({ id: r.id, matchValue: r.numero_processo || "" }))
  } else if (entityType === "RJ_CREDITOR" && contextId) {
    const records = await (db as PrismaClient).rJCreditor.findMany({
      where: { jrc_id: contextId, cpf_cnpj: { in: values } },
      select: { id: true, cpf_cnpj: true },
    })
    existingRecords = records.map((r) => ({ id: r.id, matchValue: r.cpf_cnpj || "" }))
  }

  const existingMap = new Map(existingRecords.map((r) => [r.matchValue, r.id]))

  const existing: DuplicateCheckResult["existing"] = []
  const newRows: MappedRow[] = []

  for (const row of rows) {
    const val = String(row[dupKey] || "").trim()
    const existingId = existingMap.get(val)
    if (existingId) {
      existing.push({
        rowIndex: row._rowIndex,
        existingId,
        matchField: dupKey,
        matchValue: val,
      })
    } else {
      newRows.push(row)
    }
  }

  return { existing, newRows }
}

// ===== Bulk Import Execution =====

export async function executeBulkImport(
  db: PrismaClient,
  entityType: ImportEntityTypeKey,
  rows: MappedRow[],
  options: {
    duplicateHandling: "skip" | "update" | "create"
    contextId?: string    // case_id for deadlines/movements, jrc_id for creditors
    defaultValues?: Record<string, unknown>
    createdById?: string
  }
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    errors: 0,
    ignored: 0,
    created_ids: [],
    error_details: [],
  }

  return await db.$transaction(async (tx) => {
    for (const row of rows) {
      try {
        switch (entityType) {
          case "PERSON": {
            const id = await insertPerson(tx, row, options)
            if (id) {
              result.created_ids.push(id)
              result.imported++
            } else {
              result.ignored++
            }
            break
          }
          case "CASE": {
            const id = await insertCase(tx, row, options)
            if (id) {
              result.created_ids.push(id)
              result.imported++
            } else {
              result.ignored++
            }
            break
          }
          case "DEADLINE": {
            const id = await insertDeadline(tx, row, options)
            if (id) {
              result.created_ids.push(id)
              result.imported++
            } else {
              result.ignored++
            }
            break
          }
          case "CASE_MOVEMENT": {
            const id = await insertCaseMovement(tx, row, options)
            if (id) {
              result.created_ids.push(id)
              result.imported++
            } else {
              result.ignored++
            }
            break
          }
          case "RJ_CREDITOR": {
            const id = await insertRJCreditor(tx, row, options)
            if (id) {
              result.created_ids.push(id)
              result.imported++
            } else {
              result.ignored++
            }
            break
          }
        }
      } catch (err: unknown) {
        result.errors++
        const msg = err instanceof Error ? err.message : String(err)
        result.error_details.push({ row: row._rowIndex, message: msg })
      }
    }
    return result
  })
}

// ===== Rollback =====

export async function rollbackImport(db: PrismaClient, logId: string): Promise<void> {
  const log = await db.importLog.findUniqueOrThrow({
    where: { id: logId },
  })

  if (log.revertido) throw new Error("Importação já foi revertida")

  const details = log.detalhes as { created_ids?: string[] } | null
  const ids = details?.created_ids || []

  if (ids.length === 0) throw new Error("Nenhum registro para reverter")

  await db.$transaction(async (tx) => {
    switch (log.entity_type) {
      case "PERSON":
        await tx.person.deleteMany({ where: { id: { in: ids } } })
        break
      case "CASE":
        await tx.case.deleteMany({ where: { id: { in: ids } } })
        break
      case "DEADLINE":
        await tx.deadline.deleteMany({ where: { id: { in: ids } } })
        break
      case "CASE_MOVEMENT":
        await tx.caseMovement.deleteMany({ where: { id: { in: ids } } })
        break
      case "RJ_CREDITOR":
        await tx.rJCreditor.deleteMany({ where: { id: { in: ids } } })
        break
    }

    await tx.importLog.update({
      where: { id: logId },
      data: { revertido: true, status: "REVERTIDO" as never },
    })
  })
}

// ===== Entity-specific insert functions =====

async function insertPerson(
  tx: Prisma.TransactionClient,
  row: MappedRow,
  options: { createdById?: string }
): Promise<string | null> {
  const rec = await tx.person.create({
    data: {
      nome: String(row.nome || ""),
      cpf_cnpj: row.cpf_cnpj ? String(row.cpf_cnpj) : null,
      tipo: (String(row.tipo || "OUTRO")).toUpperCase() as never,
      subtipo: (String(row.subtipo || "PESSOA_FISICA")).toUpperCase() as never,
      email: row.email ? String(row.email) : null,
      celular: row.celular ? String(row.celular) : null,
      telefone_fixo: row.telefone_fixo ? String(row.telefone_fixo) : null,
      whatsapp: row.whatsapp ? String(row.whatsapp) : null,
      rg: row.rg ? String(row.rg) : null,
      nacionalidade: row.nacionalidade ? String(row.nacionalidade) : null,
      estado_civil: row.estado_civil ? String(row.estado_civil) : null,
      profissao: row.profissao ? String(row.profissao) : null,
      data_nascimento: row.data_nascimento ? new Date(String(row.data_nascimento)) : null,
      cep: row.cep ? String(row.cep) : null,
      logradouro: row.logradouro ? String(row.logradouro) : null,
      numero: row.numero ? String(row.numero) : null,
      complemento: row.complemento ? String(row.complemento) : null,
      bairro: row.bairro ? String(row.bairro) : null,
      cidade: row.cidade ? String(row.cidade) : null,
      estado: row.estado ? String(row.estado) : null,
      segmento: row.segmento ? (String(row.segmento).toUpperCase() as never) : null,
      observacoes: row.observacoes ? String(row.observacoes) : null,
      created_by_id: options.createdById || null,
    },
  })
  return rec.id
}

async function insertCase(
  tx: Prisma.TransactionClient,
  row: MappedRow,
  options: { defaultValues?: Record<string, unknown>; createdById?: string }
): Promise<string | null> {
  const defaults = options.defaultValues || {}
  const rec = await tx.case.create({
    data: {
      numero_processo: row.numero_processo ? String(row.numero_processo) : null,
      tipo: (String(row.tipo || "OUTRO")).toUpperCase() as never,
      status: (String(row.status || "ATIVO")).toUpperCase() as never,
      fase_processual: row.fase_processual ? String(row.fase_processual) : null,
      vara: row.vara ? String(row.vara) : null,
      comarca: row.comarca ? String(row.comarca) : null,
      tribunal: row.tribunal ? String(row.tribunal) : null,
      uf: row.uf ? String(row.uf) : null,
      valor_causa: row.valor_causa ? new Prisma.Decimal(Number(row.valor_causa)) : null,
      valor_risco: row.valor_risco ? new Prisma.Decimal(Number(row.valor_risco)) : null,
      tags: row.tags ? String(row.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      cliente_id: String(defaults.cliente_id || row.cliente_id || ""),
      advogado_responsavel_id: String(defaults.advogado_responsavel_id || row.advogado_responsavel_id || ""),
    },
  })
  return rec.id
}

async function insertDeadline(
  tx: Prisma.TransactionClient,
  row: MappedRow,
  options: { contextId?: string; defaultValues?: Record<string, unknown> }
): Promise<string | null> {
  const defaults = options.defaultValues || {}
  const caseId = options.contextId || String(defaults.case_id || "")
  if (!caseId) throw new Error("case_id é obrigatório para importar prazos")

  const rec = await tx.deadline.create({
    data: {
      case_id: caseId,
      tipo: (String(row.tipo || "ORDINARIO")).toUpperCase() as never,
      descricao: String(row.descricao || ""),
      data_limite: new Date(String(row.data_limite)),
      data_alerta: [],
      status: (String(row.status || "PENDENTE")).toUpperCase() as never,
      responsavel_id: String(defaults.responsavel_id || ""),
      origem: row.origem ? String(row.origem) : "IMPORTACAO",
    },
  })
  return rec.id
}

async function insertCaseMovement(
  tx: Prisma.TransactionClient,
  row: MappedRow,
  options: { contextId?: string; defaultValues?: Record<string, unknown> }
): Promise<string | null> {
  const defaults = options.defaultValues || {}
  const caseId = options.contextId || String(defaults.case_id || "")
  if (!caseId) throw new Error("case_id é obrigatório para importar movimentações")

  const rec = await tx.caseMovement.create({
    data: {
      case_id: caseId,
      data: new Date(String(row.data)),
      tipo: (String(row.tipo || "OUTRO")).toUpperCase() as never,
      descricao: String(row.descricao || ""),
      conteudo_integral: row.conteudo_integral ? String(row.conteudo_integral) : null,
      fonte: row.fonte ? String(row.fonte) : "IMPORTACAO",
      fonte_url: row.fonte_url ? String(row.fonte_url) : null,
    },
  })
  return rec.id
}

async function insertRJCreditor(
  tx: Prisma.TransactionClient,
  row: MappedRow,
  options: { contextId?: string }
): Promise<string | null> {
  const jrcId = options.contextId
  if (!jrcId) throw new Error("jrc_id é obrigatório para importar credores RJ")

  const cpf = row.cpf_cnpj ? String(row.cpf_cnpj).replace(/\D/g, "") : null

  const rec = await tx.rJCreditor.create({
    data: {
      jrc_id: jrcId,
      nome: String(row.nome || "").trim(),
      cpf_cnpj: row.cpf_cnpj ? String(row.cpf_cnpj).trim() : null,
      pessoa_fisica: cpf ? cpf.length === 11 : false,
      classe: (String(row.classe)).toUpperCase() as never,
      natureza: (String(row.natureza || "QUIROGRAFARIO")).toUpperCase() as never,
      fonte: "IMPORT_CSV" as never,
      valor_original: BigInt(Math.round((Number(row.valor_original) || 0) * 100)),
      valor_atualizado: BigInt(Math.round((Number(row.valor_atualizado || row.valor_original) || 0) * 100)),
      tipo_garantia: (row.tipo_garantia ? String(row.tipo_garantia).toUpperCase() : "NONE") as never,
      valor_garantia: BigInt(Math.round((Number(row.valor_garantia) || 0) * 100)),
      observacoes: row.observacoes ? String(row.observacoes) : null,
    },
  })
  return rec.id
}
