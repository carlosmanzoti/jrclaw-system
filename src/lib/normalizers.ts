// Normalization functions for importing creditor data from various formats

/**
 * Normalize credit class from any variation to the correct enum value.
 * Case-insensitive, trimmed, uses includes/regex matching.
 */
export function normalizeClasse(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Class I - Trabalhista
  if (
    s === "1" || s === "i" ||
    s.includes("classe i") && !s.includes("ii") && !s.includes("iv") ||
    s.includes("trabalhist") ||
    s === "trab" ||
    s.match(/^i\s*[-–—]/) ||
    s.match(/^classe\s*1\b/) ||
    s === "i_trabalhista" || s === "classe_i_trabalhista"
  ) {
    return "CLASSE_I_TRABALHISTA"
  }

  // Class II - Garantia Real
  if (
    s === "2" || s === "ii" ||
    s.includes("classe ii") && !s.includes("iii") ||
    s.includes("garantia real") ||
    s === "real" ||
    s.match(/^ii\s*[-–—]/) ||
    s.match(/^classe\s*2\b/) ||
    s === "ii_garantia_real" || s === "classe_ii_garantia_real"
  ) {
    return "CLASSE_II_GARANTIA_REAL"
  }

  // Class III - Quirografário
  if (
    s === "3" || s === "iii" ||
    s.includes("classe iii") && !s.includes("iv") ||
    s.includes("quirograf") ||
    s === "quirog" ||
    s.match(/^iii\s*[-–—]/) ||
    s.match(/^classe\s*3\b/) ||
    s === "iii_quirografario" || s === "classe_iii_quirografario"
  ) {
    return "CLASSE_III_QUIROGRAFARIO"
  }

  // Class IV - ME/EPP
  if (
    s === "4" || s === "iv" ||
    s.includes("classe iv") ||
    s.includes("me/epp") || s.includes("me-epp") || s.includes("meepp") ||
    s.includes("microempresa") || s.includes("micro empresa") ||
    s === "micro" || s === "epp" ||
    s.match(/^iv\s*[-–—]/) ||
    s.match(/^classe\s*4\b/) ||
    s === "iv_me_epp" || s === "classe_iv_me_epp"
  ) {
    return "CLASSE_IV_ME_EPP"
  }

  return null
}

/**
 * Normalize monetary value from any format to a number.
 * Handles BR format (1.234.567,89), US format (1,234,567.89), and plain numbers.
 */
export function normalizeMonetaryValue(input: unknown): number {
  if (input === null || input === undefined || input === "" || input === "-") return 0
  if (typeof input === "number") return isNaN(input) ? 0 : input

  let s = String(input).trim()

  // Remove currency symbols and whitespace
  s = s.replace(/[R$\s\u00a0]/g, "")

  // Remove parentheses (accounting negative notation)
  if (s.startsWith("(") && s.endsWith(")")) {
    s = "-" + s.slice(1, -1)
  }

  if (!s || s === "-" || s === "0") return 0

  // Count dots and commas to detect format
  const dots = (s.match(/\./g) || []).length
  const commas = (s.match(/,/g) || []).length

  if (commas === 1 && dots === 0) {
    // "1234567,89" - BR format, single comma = decimal separator
    s = s.replace(",", ".")
  } else if (commas === 0 && dots === 1) {
    // "1234567.89" - US format or plain decimal, keep as-is
  } else if (commas >= 1 && dots >= 1) {
    // Mixed format - determine which is decimal separator
    const lastDot = s.lastIndexOf(".")
    const lastComma = s.lastIndexOf(",")

    if (lastComma > lastDot) {
      // BR format: "1.234.567,89" - dots are thousands, comma is decimal
      s = s.replace(/\./g, "").replace(",", ".")
    } else {
      // US format: "1,234,567.89" - commas are thousands, dot is decimal
      s = s.replace(/,/g, "")
    }
  } else if (commas > 1 && dots === 0) {
    // Multiple commas, no dots: "1,234,567" - commas are thousands
    s = s.replace(/,/g, "")
  } else if (dots > 1 && commas === 0) {
    // Multiple dots, no commas: "1.234.567" - dots are thousands (BR without decimals)
    s = s.replace(/\./g, "")
  }

  const result = parseFloat(s)
  return isNaN(result) ? 0 : result
}

/**
 * Normalize CPF/CNPJ - remove all non-digit characters.
 */
export function normalizeCpfCnpj(input: string | null | undefined): string {
  if (!input) return ""
  return String(input).replace(/\D/g, "")
}

/**
 * Normalize creditor status from any variation to the correct enum value.
 */
export function normalizeStatus(input: string | null | undefined): string {
  if (!input) return "HABILITADO"
  const s = String(input).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  if (s.startsWith("hab") || s === "h") return "HABILITADO"
  if (s.startsWith("imp")) return "IMPUGNADO"
  if (s.startsWith("div")) return "DIVERGENCIA"
  if (s.startsWith("ret")) return "HABILITACAO_RETARDATARIA"
  if (s.startsWith("excl")) return "EXCLUIDO"
  if (s.startsWith("extra")) return "EXTRACONCURSAL"

  return "HABILITADO"
}

/**
 * Normalize guarantee type from any variation to the correct enum value.
 */
export function normalizeGuaranteeType(input: string | null | undefined): string {
  if (!input) return "NONE"
  const s = String(input).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  if (s.includes("alienacao fiduciaria") || s.includes("alienacao fiduc")) {
    if (s.includes("imovel") || s.includes("imov") || s.includes("rural")) return "ALIENACAO_FIDUCIARIA"
    return "ALIENACAO_FIDUCIARIA"
  }
  if (s.includes("cessao fiduciaria") || s.includes("cessao fiduc")) return "CESSAO_FIDUCIARIA"
  if (s.includes("hipoteca") || s.includes("hipotec")) return "HIPOTECA"
  if (s.includes("penhor")) return "PENHOR"
  if (s.includes("anticrese")) return "ANTICRESE"
  if (s === "none" || s === "nenhum" || s === "sem garantia" || s === "-" || s === "") return "NONE"

  return "NONE"
}

/**
 * Normalize credit nature from any variation to the correct enum value.
 */
export function normalizeNatureza(input: string | null | undefined): string {
  if (!input) return "QUIROGRAFARIO"
  const s = String(input).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  if (s.includes("trabalhist") || s.includes("rescis") || s.includes("fgts") || s.includes("salario")) return "TRABALHISTA"
  if (s.includes("acident")) return "ACIDENTARIO"
  if (s.includes("hipoteca") || s.includes("hipotec")) return "HIPOTECA"
  if (s.includes("penhor")) {
    if (s.includes("agric")) return "PENHOR"
    return "PENHOR"
  }
  if (s.includes("alienacao fiduciaria") || s.includes("alienacao fiduc")) {
    if (s.includes("imovel") || s.includes("imov") || s.includes("rural")) return "ALIENACAO_FIDUCIARIA_IMOVEL"
    return "ALIENACAO_FIDUCIARIA_MOVEL"
  }
  if (s.includes("cessao fiduciaria") || s.includes("cessao fiduc") || s.includes("recebiveis") || s.includes("recebiveis")) return "CESSAO_FIDUCIARIA_RECEBIVEIS"
  if (s.includes("anticrese")) return "ANTICRESE"
  if (s.includes("quirograf") || s.includes("fornec") || s.includes("duplicata") || s.includes("insumo") || s.includes("prestacao")) return "QUIROGRAFARIO"
  if (s.includes("privilegio especial")) return "PRIVILEGIO_ESPECIAL"
  if (s.includes("privilegio geral")) return "PRIVILEGIO_GERAL"
  if (s.includes("subordinad")) return "SUBORDINADO"
  if (s.includes("me") && s.includes("epp") || s.includes("microempresa")) return "ME_EPP"
  if (s.includes("cedula") || s.includes("ccb") || s.includes("credito banc")) return "QUIROGRAFARIO"

  return "QUIROGRAFARIO"
}

/**
 * Infer class from credit nature if class is missing.
 */
export function inferClasseFromNatureza(natureza: string): string {
  switch (natureza) {
    case "TRABALHISTA":
    case "ACIDENTARIO":
      return "CLASSE_I_TRABALHISTA"
    case "HIPOTECA":
    case "PENHOR":
    case "ALIENACAO_FIDUCIARIA_IMOVEL":
    case "ALIENACAO_FIDUCIARIA_MOVEL":
    case "CESSAO_FIDUCIARIA_RECEBIVEIS":
    case "ANTICRESE":
    case "PRIVILEGIO_ESPECIAL":
      return "CLASSE_II_GARANTIA_REAL"
    case "ME_EPP":
      return "CLASSE_IV_ME_EPP"
    default:
      return "CLASSE_III_QUIROGRAFARIO"
  }
}

/**
 * Normalize a column name to a standard field name.
 * Maps common column header variations to the expected field names.
 */
export function normalizeColumnName(col: string): string {
  const s = col.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  if (s === "nome" || s === "credor" || s === "razao social" || s === "razao_social" || s === "nome do credor" || s === "name") return "nome"
  if (s === "cpf_cnpj" || s === "cpf/cnpj" || s === "cpf" || s === "cnpj" || s === "documento" || s === "doc") return "cpf_cnpj"
  if (s === "classe" || s === "class" || s === "categoria") return "classe"
  if (s === "natureza" || s === "nature" || s === "tipo credito" || s === "tipo_credito" || s === "tipo do credito") return "natureza"
  if (s === "valor_original" || s === "valor original" || s === "valor" || s === "value" || s === "credito" || s === "credito original") return "valor_original"
  if (s === "valor_atualizado" || s === "valor atualizado" || s === "valor corrigido" || s === "atualizado") return "valor_atualizado"
  if (s === "tipo_garantia" || s === "tipo garantia" || s === "garantia" || s === "tipo de garantia") return "tipo_garantia"
  if (s === "valor_garantia" || s === "valor garantia" || s === "valor da garantia") return "valor_garantia"
  if (s === "observacoes" || s === "obs" || s === "observacao" || s === "notas" || s === "notes" || s === "remarks") return "observacoes"
  if (s === "status" || s === "situacao" || s === "situação") return "status"
  if (s === "matricula" || s === "matricula_imovel" || s === "matricula imovel") return "matricula_imovel"
  if (s === "descricao_garantia" || s === "descricao garantia" || s === "descricao da garantia") return "descricao_garantia"

  return col
}

/**
 * Normalize an entire row of creditor data.
 * Returns normalized row with warnings for fields that needed inference.
 */
export function normalizeCreditorRow(row: Record<string, unknown>): {
  normalized: Record<string, unknown>
  warnings: string[]
} {
  const warnings: string[] = []
  const normalized: Record<string, unknown> = {}

  // Name
  normalized.nome = row.nome ? String(row.nome).trim() : ""
  if (!normalized.nome) warnings.push("Nome do credor não informado")

  // CPF/CNPJ
  normalized.cpf_cnpj = normalizeCpfCnpj(row.cpf_cnpj as string)

  // Natureza
  const rawNatureza = row.natureza as string
  normalized.natureza = normalizeNatureza(rawNatureza)

  // Classe
  const rawClasse = row.classe as string
  let classe = normalizeClasse(rawClasse)
  if (!classe) {
    // Try to infer from natureza
    classe = inferClasseFromNatureza(normalized.natureza as string)
    if (rawClasse) {
      warnings.push(`Classe "${rawClasse}" não reconhecida — inferida como ${classe} pela natureza do crédito`)
    } else {
      warnings.push(`Classe não informada — inferida como ${classe} pela natureza do crédito`)
    }
  }
  normalized.classe = classe

  // Monetary values
  normalized.valor_original = normalizeMonetaryValue(row.valor_original)
  normalized.valor_atualizado = normalizeMonetaryValue(row.valor_atualizado)
  normalized.valor_garantia = normalizeMonetaryValue(row.valor_garantia)

  // If valor_atualizado is 0 but valor_original > 0, use valor_original
  if ((normalized.valor_atualizado as number) === 0 && (normalized.valor_original as number) > 0) {
    normalized.valor_atualizado = normalized.valor_original
    warnings.push("Valor atualizado não informado — usando valor original")
  }

  // If both are 0, warn but don't reject
  if ((normalized.valor_original as number) === 0 && (normalized.valor_atualizado as number) === 0) {
    warnings.push("Valor pendente de apuração — importado com R$ 0,00")
  }

  // Guarantee type
  normalized.tipo_garantia = normalizeGuaranteeType(row.tipo_garantia as string)

  // Status
  normalized.status = normalizeStatus(row.status as string)

  // Pass-through fields
  normalized.observacoes = row.observacoes ? String(row.observacoes).trim() : ""
  normalized.matricula_imovel = row.matricula_imovel ? String(row.matricula_imovel).trim() : ""
  normalized.descricao_garantia = row.descricao_garantia ? String(row.descricao_garantia).trim() : ""

  // Detect if pessoa_fisica from CPF length
  const cpf = normalized.cpf_cnpj as string
  normalized.pessoa_fisica = cpf.length === 11

  return { normalized, warnings }
}
