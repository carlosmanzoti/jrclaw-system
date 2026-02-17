// Entity field definitions for AI-powered import mapping

export type ImportFieldType = "string" | "number" | "date" | "enum" | "boolean" | "bigint_money"

export interface FieldDefinition {
  field: string
  label: string
  type: ImportFieldType
  required?: boolean
  description?: string
  values?: string[] // for enum type
}

// ===== PERSON =====
const PERSON_FIELDS: FieldDefinition[] = [
  { field: "nome", label: "Nome / Razão Social", type: "string", required: true, description: "Full name or company name" },
  { field: "cpf_cnpj", label: "CPF/CNPJ", type: "string", description: "CPF (11 digits) or CNPJ (14 digits)" },
  { field: "tipo", label: "Tipo", type: "enum", values: ["CLIENTE", "PARTE_CONTRARIA", "JUIZ", "DESEMBARGADOR", "PERITO", "ADMINISTRADOR_JUDICIAL", "CREDOR", "TESTEMUNHA", "OUTRO"], description: "Person type" },
  { field: "subtipo", label: "Subtipo", type: "enum", values: ["PESSOA_FISICA", "PESSOA_JURIDICA"], description: "Physical or juridical person" },
  { field: "email", label: "E-mail", type: "string" },
  { field: "celular", label: "Celular", type: "string" },
  { field: "telefone_fixo", label: "Telefone fixo", type: "string" },
  { field: "whatsapp", label: "WhatsApp", type: "string" },
  { field: "rg", label: "RG", type: "string" },
  { field: "nacionalidade", label: "Nacionalidade", type: "string" },
  { field: "estado_civil", label: "Estado Civil", type: "string" },
  { field: "profissao", label: "Profissão", type: "string" },
  { field: "data_nascimento", label: "Data de nascimento", type: "date" },
  { field: "cep", label: "CEP", type: "string" },
  { field: "logradouro", label: "Logradouro", type: "string" },
  { field: "numero", label: "Número", type: "string" },
  { field: "complemento", label: "Complemento", type: "string" },
  { field: "bairro", label: "Bairro", type: "string" },
  { field: "cidade", label: "Cidade", type: "string" },
  { field: "estado", label: "Estado (UF)", type: "string" },
  { field: "segmento", label: "Segmento", type: "enum", values: ["AGRO", "INDUSTRIA", "COMERCIO", "SERVICOS", "FINANCEIRO", "GOVERNO", "OUTRO"] },
  { field: "observacoes", label: "Observações", type: "string" },
]

// ===== CASE =====
const CASE_FIELDS: FieldDefinition[] = [
  { field: "numero_processo", label: "Número do processo (CNJ)", type: "string", required: true, description: "Format: NNNNNNN-DD.AAAA.J.TR.OOOO" },
  { field: "tipo", label: "Tipo", type: "enum", required: true, values: ["RECUPERACAO_JUDICIAL", "FALENCIA", "EXECUCAO", "COBRANCA", "REESTRUTURACAO_EXTRAJUDICIAL", "AGRONEGOCIO", "TRABALHISTA", "TRIBUTARIO", "SOCIETARIO", "CONTRATUAL", "OUTRO"] },
  { field: "status", label: "Status", type: "enum", values: ["ATIVO", "SUSPENSO", "ARQUIVADO", "ENCERRADO"] },
  { field: "fase_processual", label: "Fase processual", type: "string" },
  { field: "vara", label: "Vara", type: "string" },
  { field: "comarca", label: "Comarca", type: "string" },
  { field: "tribunal", label: "Tribunal", type: "string" },
  { field: "uf", label: "UF", type: "string" },
  { field: "valor_causa", label: "Valor da causa", type: "bigint_money", description: "Value in BRL (reais)" },
  { field: "valor_risco", label: "Valor de risco", type: "bigint_money", description: "Provision value in BRL" },
  { field: "tags", label: "Tags", type: "string", description: "Comma-separated tags" },
]

// ===== DEADLINE =====
const DEADLINE_FIELDS: FieldDefinition[] = [
  { field: "descricao", label: "Descrição", type: "string", required: true },
  { field: "tipo", label: "Tipo", type: "enum", required: true, values: ["FATAL", "ORDINARIO", "DILIGENCIA", "AUDIENCIA", "ASSEMBLEIA"] },
  { field: "data_limite", label: "Data limite", type: "date", required: true },
  { field: "status", label: "Status", type: "enum", values: ["PENDENTE", "CUMPRIDO", "PERDIDO", "CANCELADO"] },
  { field: "origem", label: "Origem", type: "string", description: "Source of the deadline" },
]

// ===== CASE MOVEMENT =====
const CASE_MOVEMENT_FIELDS: FieldDefinition[] = [
  { field: "data", label: "Data", type: "date", required: true },
  { field: "tipo", label: "Tipo", type: "enum", required: true, values: ["DESPACHO", "DECISAO", "SENTENCA", "ACORDAO", "PUBLICACAO", "INTIMACAO", "CITACAO", "ATO_ORDINATORIO", "OUTRO"] },
  { field: "descricao", label: "Descrição", type: "string", required: true },
  { field: "conteudo_integral", label: "Conteúdo integral", type: "string" },
  { field: "fonte", label: "Fonte", type: "string" },
  { field: "fonte_url", label: "URL da fonte", type: "string" },
]

// ===== RJ CREDITOR =====
const RJ_CREDITOR_FIELDS: FieldDefinition[] = [
  { field: "nome", label: "Nome do credor", type: "string", required: true },
  { field: "cpf_cnpj", label: "CPF/CNPJ", type: "string" },
  { field: "classe", label: "Classe", type: "enum", required: true, values: ["CLASSE_I_TRABALHISTA", "CLASSE_II_GARANTIA_REAL", "CLASSE_III_QUIROGRAFARIO", "CLASSE_IV_ME_EPP"] },
  { field: "natureza", label: "Natureza", type: "enum", required: true, values: ["TRABALHISTA", "ACIDENTARIO", "HIPOTECA", "PENHOR", "ALIENACAO_FIDUCIARIA_IMOVEL", "ALIENACAO_FIDUCIARIA_MOVEL", "CESSAO_FIDUCIARIA_RECEBIVEIS", "ANTICRESE", "QUIROGRAFARIO", "PRIVILEGIO_ESPECIAL", "PRIVILEGIO_GERAL", "SUBORDINADO", "ME_EPP"] },
  { field: "valor_original", label: "Valor original", type: "bigint_money", required: true, description: "Original credit value in BRL" },
  { field: "valor_atualizado", label: "Valor atualizado", type: "bigint_money", description: "Updated credit value in BRL" },
  { field: "tipo_garantia", label: "Tipo de garantia", type: "string" },
  { field: "valor_garantia", label: "Valor da garantia", type: "bigint_money" },
  { field: "observacoes", label: "Observações", type: "string" },
]

export type ImportEntityTypeKey = "PERSON" | "CASE" | "DEADLINE" | "CASE_MOVEMENT" | "RJ_CREDITOR"

export const IMPORT_ENTITY_FIELDS: Record<ImportEntityTypeKey, FieldDefinition[]> = {
  PERSON: PERSON_FIELDS,
  CASE: CASE_FIELDS,
  DEADLINE: DEADLINE_FIELDS,
  CASE_MOVEMENT: CASE_MOVEMENT_FIELDS,
  RJ_CREDITOR: RJ_CREDITOR_FIELDS,
}

export const IMPORT_ENTITY_LABELS: Record<ImportEntityTypeKey, string> = {
  PERSON: "Pessoas",
  CASE: "Processos",
  DEADLINE: "Prazos",
  CASE_MOVEMENT: "Movimentações",
  RJ_CREDITOR: "Credores RJ",
}

export const IMPORT_ENTITY_DUPLICATE_KEY: Record<ImportEntityTypeKey, string | null> = {
  PERSON: "cpf_cnpj",
  CASE: "numero_processo",
  DEADLINE: null,
  CASE_MOVEMENT: null,
  RJ_CREDITOR: "cpf_cnpj",
}

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/rtf",
  "application/json",
  "text/xml",
  "application/xml",
]

export const ACCEPTED_EXTENSIONS = ".pdf,.docx,.xlsx,.csv,.txt,.rtf,.json,.xml"

export function buildFieldDescriptionForAI(entityType: ImportEntityTypeKey): string {
  const fields = IMPORT_ENTITY_FIELDS[entityType]
  return fields
    .map((f) => {
      let desc = `- ${f.field} (${f.label}): type=${f.type}`
      if (f.required) desc += ", REQUIRED"
      if (f.values) desc += `, valid values=[${f.values.join(", ")}]`
      if (f.description) desc += ` — ${f.description}`
      return desc
    })
    .join("\n")
}
