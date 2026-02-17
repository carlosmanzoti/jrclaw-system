// Labels and constants for the Judicial Recovery (RJ) module

export const JR_STATUS_LABELS: Record<string, string> = {
  PROCESSAMENTO: "Em Processamento",
  VERIFICACAO_CREDITOS: "Verificação de Créditos",
  AGC_PENDENTE: "AGC Pendente",
  PLANO_APROVADO: "Plano Aprovado",
  CUMPRIMENTO: "Em Cumprimento",
  ENCERRADA: "Encerrada",
  CONVOLADA_FALENCIA: "Convolada em Falência",
};

export const JR_STATUS_COLORS: Record<string, string> = {
  PROCESSAMENTO: "bg-blue-100 text-blue-700",
  VERIFICACAO_CREDITOS: "bg-amber-100 text-amber-700",
  AGC_PENDENTE: "bg-orange-100 text-orange-700",
  PLANO_APROVADO: "bg-emerald-100 text-emerald-700",
  CUMPRIMENTO: "bg-indigo-100 text-indigo-700",
  ENCERRADA: "bg-gray-100 text-gray-600",
  CONVOLADA_FALENCIA: "bg-red-100 text-red-700",
};

export const CREDIT_CLASS_LABELS: Record<string, string> = {
  CLASSE_I_TRABALHISTA: "Classe I — Trabalhista",
  CLASSE_II_GARANTIA_REAL: "Classe II — Garantia Real",
  CLASSE_III_QUIROGRAFARIO: "Classe III — Quirografário",
  CLASSE_IV_ME_EPP: "Classe IV — ME/EPP",
};

export const CREDIT_CLASS_SHORT_LABELS: Record<string, string> = {
  CLASSE_I_TRABALHISTA: "Classe I",
  CLASSE_II_GARANTIA_REAL: "Classe II",
  CLASSE_III_QUIROGRAFARIO: "Classe III",
  CLASSE_IV_ME_EPP: "Classe IV",
};

export const CREDIT_CLASS_COLORS: Record<string, string> = {
  CLASSE_I_TRABALHISTA: "bg-blue-100 text-blue-700 border-blue-200",
  CLASSE_II_GARANTIA_REAL: "bg-amber-100 text-amber-700 border-amber-200",
  CLASSE_III_QUIROGRAFARIO: "bg-purple-100 text-purple-700 border-purple-200",
  CLASSE_IV_ME_EPP: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const CREDIT_CLASS_CHART_COLORS: Record<string, string> = {
  CLASSE_I_TRABALHISTA: "#3b82f6",
  CLASSE_II_GARANTIA_REAL: "#f59e0b",
  CLASSE_III_QUIROGRAFARIO: "#a855f7",
  CLASSE_IV_ME_EPP: "#10b981",
};

export const CREDIT_CLASS_ICONS: Record<string, string> = {
  CLASSE_I_TRABALHISTA: "Briefcase",
  CLASSE_II_GARANTIA_REAL: "Shield",
  CLASSE_III_QUIROGRAFARIO: "FileText",
  CLASSE_IV_ME_EPP: "Building2",
};

export const CREDIT_NATURE_LABELS: Record<string, string> = {
  TRABALHISTA: "Trabalhista",
  ACIDENTARIO: "Acidentário",
  HIPOTECA: "Hipoteca",
  PENHOR: "Penhor",
  ALIENACAO_FIDUCIARIA_IMOVEL: "Alienação Fiduciária — Imóvel",
  ALIENACAO_FIDUCIARIA_MOVEL: "Alienação Fiduciária — Móvel",
  CESSAO_FIDUCIARIA_RECEBIVEIS: "Cessão Fiduciária — Recebíveis",
  ANTICRESE: "Anticrese",
  QUIROGRAFARIO: "Quirografário",
  PRIVILEGIO_ESPECIAL: "Privilégio Especial",
  PRIVILEGIO_GERAL: "Privilégio Geral",
  SUBORDINADO: "Subordinado",
  ME_EPP: "ME/EPP",
};

export const CREDIT_STATUS_LABELS: Record<string, string> = {
  HABILITADO: "Habilitado",
  HABILITACAO_RETARDATARIA: "Habilitação Retardatária",
  IMPUGNADO: "Impugnado",
  DIVERGENCIA: "Divergência",
  EXCLUIDO: "Excluído",
  EXTRACONCURSAL: "Extraconcursal",
};

export const CREDIT_STATUS_COLORS: Record<string, string> = {
  HABILITADO: "bg-emerald-100 text-emerald-700",
  HABILITACAO_RETARDATARIA: "bg-amber-100 text-amber-700",
  IMPUGNADO: "bg-red-100 text-red-700",
  DIVERGENCIA: "bg-orange-100 text-orange-700",
  EXCLUIDO: "bg-gray-100 text-gray-500",
  EXTRACONCURSAL: "bg-indigo-100 text-indigo-700",
};

export const VOTE_DIRECTION_LABELS: Record<string, string> = {
  FAVOR: "A Favor",
  CONTRA: "Contra",
  ABSTENCAO: "Abstenção",
  AUSENTE: "Ausente",
};

export const VOTE_DIRECTION_COLORS: Record<string, string> = {
  FAVOR: "bg-emerald-100 text-emerald-700",
  CONTRA: "bg-red-100 text-red-700",
  ABSTENCAO: "bg-amber-100 text-amber-700",
  AUSENTE: "bg-gray-100 text-gray-500",
};

export const GUARANTEE_TYPE_LABELS: Record<string, string> = {
  HIPOTECA: "Hipoteca",
  PENHOR: "Penhor",
  ALIENACAO_FIDUCIARIA: "Alienação Fiduciária",
  CESSAO_FIDUCIARIA: "Cessão Fiduciária",
  ANTICRESE: "Anticrese",
  NONE: "Sem Garantia",
};

export const INDEXATION_TYPE_LABELS: Record<string, string> = {
  TR: "TR",
  IPCA: "IPCA",
  IGP_M: "IGP-M",
  CDI: "CDI",
  SELIC: "SELIC",
  INPC: "INPC",
  SEM_CORRECAO: "Sem Correção",
};

export const CREDITOR_SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  IMPORT_CSV: "Importação CSV",
  IMPORT_EXCEL: "Importação Excel",
  IMPORT_PJE: "Importação PJe",
  HABILITACAO: "Habilitação",
};

export const SUBCLASS_VALIDATION_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE_VALIDACAO: "Pendente de Validação",
  VALIDADA: "Validada",
  REJEITADA: "Rejeitada",
  REQUER_AJUSTE: "Requer Ajuste",
};

export const SUBCLASS_VALIDATION_COLORS: Record<string, string> = {
  RASCUNHO: "bg-gray-100 text-gray-600",
  PENDENTE_VALIDACAO: "bg-amber-100 text-amber-700",
  VALIDADA: "bg-emerald-100 text-emerald-700",
  REJEITADA: "bg-red-100 text-red-700",
  REQUER_AJUSTE: "bg-orange-100 text-orange-700",
};

export const CRAM_DOWN_RISK_LABELS: Record<string, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
  CRITICO: "Crítico",
};

export const CRAM_DOWN_RISK_COLORS: Record<string, string> = {
  BAIXO: "bg-emerald-100 text-emerald-700",
  MEDIO: "bg-amber-100 text-amber-700",
  ALTO: "bg-orange-100 text-orange-700",
  CRITICO: "bg-red-100 text-red-700",
};

export const TABLE_VERSION_TYPE_LABELS: Record<string, string> = {
  INICIAL: "Inicial",
  AJ_VERIFICACAO: "Verificação AJ",
  POS_HABILITACOES: "Pós-Habilitações",
  CONSOLIDADO_AGC: "Consolidado AGC",
  RETIFICACAO: "Retificação",
  HOMOLOGADO: "Homologado",
};

export const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  HABILITACAO: "Habilitação",
  HABILITACAO_RETARDATARIA: "Habilitação Retardatária",
  IMPUGNACAO_CREDOR: "Impugnação (Credor)",
  IMPUGNACAO_MP: "Impugnação (MP)",
  IMPUGNACAO_DEVEDOR: "Impugnação (Devedor)",
  DIVERGENCIA: "Divergência",
};

export const CHALLENGE_RESOLUTION_LABELS: Record<string, string> = {
  DEFERIDA: "Deferida",
  DEFERIDA_PARCIAL: "Deferida Parcialmente",
  INDEFERIDA: "Indeferida",
  DESISTENCIA: "Desistência",
  ACORDO: "Acordo",
  PENDENTE: "Pendente",
};

export const CHALLENGE_RESOLUTION_COLORS: Record<string, string> = {
  DEFERIDA: "bg-emerald-100 text-emerald-700",
  DEFERIDA_PARCIAL: "bg-blue-100 text-blue-700",
  INDEFERIDA: "bg-red-100 text-red-700",
  DESISTENCIA: "bg-gray-100 text-gray-600",
  ACORDO: "bg-purple-100 text-purple-700",
  PENDENTE: "bg-amber-100 text-amber-700",
};

export const CREDITOR_DOC_TYPE_LABELS: Record<string, string> = {
  CONTRATO: "Contrato",
  NOTA_FISCAL: "Nota Fiscal",
  DUPLICATA: "Duplicata",
  CCB: "CCB",
  CPR: "CPR",
  SENTENCA_TRABALHISTA: "Sentença Trabalhista",
  CERTIDAO_CREDITO: "Certidão de Crédito",
  COMPROVANTE_GARANTIA: "Comprovante de Garantia",
  HABILITACAO_PETICAO: "Petição de Habilitação",
  IMPUGNACAO_PETICAO: "Petição de Impugnação",
  PROCURACAO: "Procuração",
  OUTROS: "Outros",
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  VENCIDO: "Vencido",
  PAGO: "Pago",
  PAGO_PARCIAL: "Pago Parcialmente",
  INADIMPLIDO: "Inadimplido",
};

export const INSTALLMENT_STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-blue-100 text-blue-700",
  VENCIDO: "bg-red-100 text-red-700",
  PAGO: "bg-emerald-100 text-emerald-700",
  PAGO_PARCIAL: "bg-amber-100 text-amber-700",
  INADIMPLIDO: "bg-red-100 text-red-800",
};

// Salário mínimo (2026) — used for Class I 150 SM cap
export const SALARIO_MINIMO = 1_518_00; // R$ 1.518,00 in centavos (2025 value, update when known)
export const LIMITE_CLASSE_I_SM = 150;
export const LIMITE_CLASSE_I = SALARIO_MINIMO * LIMITE_CLASSE_I_SM; // 150 SM in centavos

/**
 * Converts BigInt centavos to formatted BRL currency string.
 * Example: 123456n → "R$ 1.234,56"
 */
export function formatCentavos(value: bigint | number | string | null | undefined): string {
  if (value == null) return "R$ 0,00";
  let centavos: number;
  if (typeof value === "bigint") {
    centavos = Number(value);
  } else if (typeof value === "string") {
    centavos = parseInt(value, 10);
  } else {
    centavos = value;
  }
  if (isNaN(centavos)) return "R$ 0,00";
  const reais = centavos / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Converts a decimal BRL value to BigInt centavos.
 * Example: 1234.56 → 123456n
 */
export function toCentavos(reais: number): bigint {
  return BigInt(Math.round(reais * 100));
}

/**
 * Converts BigInt centavos to a plain number in BRL.
 * Example: 123456n → 1234.56
 */
export function toReais(centavos: bigint | number): number {
  return Number(centavos) / 100;
}

/**
 * Formats a percentage value for display.
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

// ========== PRJ Approval Module Constants ==========

export const SCENARIO_TYPE_LABELS: Record<string, string> = {
  BASE: "Cenário Base",
  OTIMISTA: "Otimista",
  PESSIMISTA: "Pessimista",
  CRAM_DOWN: "Cram Down",
  CUSTOM: "Personalizado",
};

export const SCENARIO_TYPE_COLORS: Record<string, string> = {
  BASE: "bg-blue-100 text-blue-700",
  OTIMISTA: "bg-emerald-100 text-emerald-700",
  PESSIMISTA: "bg-red-100 text-red-700",
  CRAM_DOWN: "bg-purple-100 text-purple-700",
  CUSTOM: "bg-gray-100 text-gray-700",
};

export const PROJECTION_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_ANALISE: "Em Análise",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

export const PROJECTION_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-gray-100 text-gray-600",
  EM_ANALISE: "bg-amber-100 text-amber-700",
  APROVADO: "bg-emerald-100 text-emerald-700",
  REJEITADO: "bg-red-100 text-red-700",
};

export const AGC_CHECKLIST_ITEMS = [
  { key: "qgc_homologado", label: "QGC homologado pelo juízo" },
  { key: "plano_protocolado", label: "Plano de recuperação protocolado" },
  { key: "edital_publicado", label: "Edital de convocação publicado" },
  { key: "credores_notificados", label: "Credores notificados" },
  { key: "aj_relatorio", label: "Relatório do AJ apresentado" },
  { key: "documentos_art53", label: "Documentos Art. 53 apresentados" },
  { key: "local_definido", label: "Local/plataforma definido" },
  { key: "pauta_definida", label: "Pauta da AGC definida" },
];

// ========== Negotiation Module Constants ==========

export const NEGOTIATION_PHASE_LABELS: Record<string, string> = {
  MAPEAMENTO: "Mapeamento",
  CONTATO_INICIAL: "Contato Inicial",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  CONTRAPROPOSTA: "Contraproposta",
  MEDIACAO: "Mediação",
  ACORDO_VERBAL: "Acordo Verbal",
  FORMALIZACAO: "Formalização",
  HOMOLOGACAO: "Homologação",
  CONCLUIDA: "Concluída",
  IMPASSE: "Impasse",
};

export const NEGOTIATION_PHASE_COLORS: Record<string, string> = {
  MAPEAMENTO: "bg-gray-100 text-gray-700",
  CONTATO_INICIAL: "bg-blue-100 text-blue-700",
  PROPOSTA_ENVIADA: "bg-indigo-100 text-indigo-700",
  CONTRAPROPOSTA: "bg-amber-100 text-amber-700",
  MEDIACAO: "bg-purple-100 text-purple-700",
  ACORDO_VERBAL: "bg-teal-100 text-teal-700",
  FORMALIZACAO: "bg-cyan-100 text-cyan-700",
  HOMOLOGACAO: "bg-emerald-100 text-emerald-700",
  CONCLUIDA: "bg-green-100 text-green-700",
  IMPASSE: "bg-red-100 text-red-700",
};

export const NEGOTIATION_PHASE_ORDER: string[] = [
  "MAPEAMENTO",
  "CONTATO_INICIAL",
  "PROPOSTA_ENVIADA",
  "CONTRAPROPOSTA",
  "MEDIACAO",
  "ACORDO_VERBAL",
  "FORMALIZACAO",
  "HOMOLOGACAO",
  "CONCLUIDA",
  "IMPASSE",
];

export const NEGOTIATION_PRIORITY_LABELS: Record<string, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const NEGOTIATION_PRIORITY_COLORS: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700",
  ALTA: "bg-orange-100 text-orange-700",
  MEDIA: "bg-blue-100 text-blue-700",
  BAIXA: "bg-gray-100 text-gray-600",
};

export const CREDITOR_NEG_STATUS_LABELS: Record<string, string> = {
  NAO_CONTATADO: "Não Contatado",
  EM_CONTATO: "Em Contato",
  PROPOSTA_RECEBIDA: "Proposta Recebida",
  CONTRAPROPOSTA_ENVIADA: "Contraproposta Enviada",
  EM_MEDIACAO: "Em Mediação",
  ACORDO_PARCIAL: "Acordo Parcial",
  ACORDO_TOTAL: "Acordo Total",
  RECUSOU: "Recusou",
  PARCEIRO: "Credor Parceiro",
  DESISTIU: "Desistiu",
};

export const CREDITOR_NEG_STATUS_COLORS: Record<string, string> = {
  NAO_CONTATADO: "bg-gray-100 text-gray-600",
  EM_CONTATO: "bg-blue-100 text-blue-700",
  PROPOSTA_RECEBIDA: "bg-indigo-100 text-indigo-700",
  CONTRAPROPOSTA_ENVIADA: "bg-amber-100 text-amber-700",
  EM_MEDIACAO: "bg-purple-100 text-purple-700",
  ACORDO_PARCIAL: "bg-teal-100 text-teal-700",
  ACORDO_TOTAL: "bg-emerald-100 text-emerald-700",
  RECUSOU: "bg-red-100 text-red-700",
  PARCEIRO: "bg-green-100 text-green-700",
  DESISTIU: "bg-gray-100 text-gray-500",
};

export const NEG_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CONTATO_TELEFONICO: "Contato Telefônico",
  EMAIL_ENVIADO: "E-mail Enviado",
  EMAIL_RECEBIDO: "E-mail Recebido",
  REUNIAO_PRESENCIAL: "Reunião Presencial",
  REUNIAO_VIRTUAL: "Reunião Virtual",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  CONTRAPROPOSTA_RECEBIDA: "Contraproposta Recebida",
  ACORDO_VERBAL: "Acordo Verbal",
  ACORDO_FORMALIZADO: "Acordo Formalizado",
  DOCUMENTO_ENVIADO: "Documento Enviado",
  DOCUMENTO_RECEBIDO: "Documento Recebido",
  MEDIACAO_SESSAO: "Sessão de Mediação",
  OBSERVACAO: "Observação",
};

export const COMMUNICATION_CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  CARTA: "Carta",
  REUNIAO_PRESENCIAL: "Reunião Presencial",
  REUNIAO_VIRTUAL: "Reunião Virtual",
  SISTEMA: "Sistema",
};

export const NEG_TEMPLATE_TYPE_LABELS: Record<string, string> = {
  PROPOSTA_INICIAL: "Proposta Inicial",
  CONTRAPROPOSTA: "Contraproposta",
  CONVITE_PARCEIRO: "Convite Credor Parceiro",
  CONVITE_MEDIACAO: "Convite para Mediação",
  TERMO_ACORDO: "Termo de Acordo",
  NOTIFICACAO: "Notificação",
  LEMBRETE: "Lembrete",
};

/**
 * Maps CreditNature to default CreditClass.
 */
export const NATURE_TO_CLASS: Record<string, string> = {
  TRABALHISTA: "CLASSE_I_TRABALHISTA",
  ACIDENTARIO: "CLASSE_I_TRABALHISTA",
  HIPOTECA: "CLASSE_II_GARANTIA_REAL",
  PENHOR: "CLASSE_II_GARANTIA_REAL",
  ALIENACAO_FIDUCIARIA_IMOVEL: "CLASSE_II_GARANTIA_REAL",
  ALIENACAO_FIDUCIARIA_MOVEL: "CLASSE_II_GARANTIA_REAL",
  CESSAO_FIDUCIARIA_RECEBIVEIS: "CLASSE_II_GARANTIA_REAL",
  ANTICRESE: "CLASSE_II_GARANTIA_REAL",
  QUIROGRAFARIO: "CLASSE_III_QUIROGRAFARIO",
  PRIVILEGIO_ESPECIAL: "CLASSE_III_QUIROGRAFARIO",
  PRIVILEGIO_GERAL: "CLASSE_III_QUIROGRAFARIO",
  SUBORDINADO: "CLASSE_III_QUIROGRAFARIO",
  ME_EPP: "CLASSE_IV_ME_EPP",
};
