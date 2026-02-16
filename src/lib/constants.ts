// Labels for Person-related enums (UI in Portuguese)

export const PERSON_TYPE_LABELS: Record<string, string> = {
  CLIENTE: "Cliente",
  PARTE_CONTRARIA: "Parte Contrária",
  JUIZ: "Juiz",
  DESEMBARGADOR: "Desembargador",
  PERITO: "Perito",
  ADMINISTRADOR_JUDICIAL: "Administrador Judicial",
  CREDOR: "Credor",
  TESTEMUNHA: "Testemunha",
  OUTRO: "Outro",
};

export const PERSON_SUBTYPE_LABELS: Record<string, string> = {
  PESSOA_FISICA: "Pessoa Física",
  PESSOA_JURIDICA: "Pessoa Jurídica",
};

export const PERSON_SEGMENT_LABELS: Record<string, string> = {
  AGRO: "Agronegócio",
  INDUSTRIA: "Indústria",
  COMERCIO: "Comércio",
  SERVICOS: "Serviços",
  FINANCEIRO: "Financeiro",
  GOVERNO: "Governo",
  OUTRO: "Outro",
};

export const PERSON_DOC_TYPE_LABELS: Record<string, string> = {
  CNH: "CNH",
  RG: "RG",
  CPF: "CPF",
  CNPJ_CARD: "Cartão CNPJ",
  CONTRATO_SOCIAL: "Contrato Social",
  ALTERACAO_CONTRATO_SOCIAL: "Alteração Contrato Social",
  PROCURACAO: "Procuração",
  IMPOSTO_RENDA: "Imposto de Renda",
  BALANCO: "Balanço",
  DRE: "DRE",
  ESCRITURA: "Escritura",
  CERTIDAO: "Certidão",
  COMPROVANTE_ENDERECO: "Comprovante de Endereço",
  DOCUMENTO_FINANCEIRO: "Documento Financeiro",
  DOCUMENTO_FISCAL: "Documento Fiscal",
  OUTRO: "Outro",
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "Recuperação Judicial",
  FALENCIA: "Falência",
  EXECUCAO: "Execução",
  COBRANCA: "Cobrança",
  REESTRUTURACAO_EXTRAJUDICIAL: "Reestruturação Extrajudicial",
  AGRARIO: "Agrário",
  TRABALHISTA: "Trabalhista",
  TRIBUTARIO: "Tributário",
  SOCIETARIO: "Societário",
  CONTRATUAL: "Contratual",
  OUTRO: "Outro",
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  ARQUIVADO: "Arquivado",
  ENCERRADO: "Encerrado",
};

export const PROJECT_CATEGORY_LABELS: Record<string, string> = {
  NEGOCIACAO_COMERCIAL: "Negociação Comercial",
  FECHAMENTO_OPERACAO: "Fechamento de Operação",
  RECUPERACAO_CREDITO: "Recuperação de Crédito",
  PLANEJAMENTO_TRIBUTARIO: "Planejamento Tributário",
  ALVARA_LIBERACAO: "Alvará / Liberação",
  DUE_DILIGENCE: "Due Diligence",
  REESTRUTURACAO_SOCIETARIA: "Reestruturação Societária",
  CONSULTORIA_PERMANENTE: "Consultoria Permanente",
  COMPLIANCE: "Compliance",
  SUCESSAO_PATRIMONIAL: "Sucessão Patrimonial",
  OPERACAO_CREDITO_RURAL: "Operação de Crédito Rural",
  OUTRO: "Outro",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em Andamento",
  AGUARDANDO_CLIENTE: "Aguardando Cliente",
  AGUARDANDO_TERCEIRO: "Aguardando Terceiro",
  AGUARDANDO_ORGAO: "Aguardando Órgão",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const STAKEHOLDER_ROLE_LABELS: Record<string, string> = {
  CLIENTE: "Cliente",
  PARTE: "Parte",
  CREDOR: "Credor",
  ORGAO_PUBLICO: "Órgão Público",
  BANCO: "Banco",
  NOTARIO: "Notário",
  CONTADOR: "Contador",
  OUTRO: "Outro",
};

export const CASE_PARTY_ROLE_LABELS: Record<string, string> = {
  AUTOR: "Autor",
  REU: "Réu",
  TERCEIRO_INTERESSADO: "Terceiro Interessado",
  ASSISTENTE: "Assistente",
  LITISCONSORTE: "Litisconsorte",
  AMICUS_CURIAE: "Amicus Curiae",
  ADMINISTRADOR_JUDICIAL: "Administrador Judicial",
  MINISTERIO_PUBLICO: "Ministério Público",
  OUTRO: "Outro",
};

export const CASE_TEAM_ROLE_LABELS: Record<string, string> = {
  RESPONSAVEL: "Responsável",
  MEMBRO: "Membro",
  CONSULTOR: "Consultor",
  ESTAGIARIO: "Estagiário",
};

export const DEADLINE_TYPE_LABELS: Record<string, string> = {
  FATAL: "Fatal",
  ORDINARIO: "Ordinário",
  DILIGENCIA: "Diligência",
  AUDIENCIA: "Audiência",
  ASSEMBLEIA: "Assembleia",
};

export const DEADLINE_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  CUMPRIDO: "Cumprido",
  PERDIDO: "Perdido",
  CANCELADO: "Cancelado",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  DESPACHO: "Despacho",
  DECISAO: "Decisão",
  SENTENCA: "Sentença",
  ACORDAO: "Acórdão",
  PUBLICACAO: "Publicação",
  INTIMACAO: "Intimação",
  CITACAO: "Citação",
  ATO_ORDINATORIO: "Ato Ordinatório",
  OUTRO: "Outro",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PETICAO_INICIAL: "Petição Inicial",
  CONTESTACAO: "Contestação",
  REPLICA: "Réplica",
  EMBARGOS_DECLARACAO: "Embargos de Declaração",
  AGRAVO_INSTRUMENTO: "Agravo de Instrumento",
  APELACAO: "Apelação",
  RECURSO_ESPECIAL: "Recurso Especial",
  RECURSO_EXTRAORDINARIO: "Recurso Extraordinário",
  CONTRARRAZOES: "Contrarrazões",
  MEMORIAIS: "Memoriais",
  PLANO_RJ: "Plano de RJ",
  LISTA_CREDORES: "Lista de Credores",
  HABILITACAO_CREDITO: "Habilitação de Crédito",
  IMPUGNACAO_CREDITO: "Impugnação de Crédito",
  RELATORIO_AJ: "Relatório do AJ",
  PARECER: "Parecer",
  MEMORANDO: "Memorando",
  CONTRATO: "Contrato",
  PROCURACAO: "Procuração",
  NOTIFICACAO: "Notificação",
  PROPOSTA: "Proposta",
  CONTRAPROPOSTA: "Contraproposta",
  RELATORIO_CLIENTE: "Relatório ao Cliente",
  PLANILHA: "Planilha",
  EMAIL_SALVO: "E-mail Salvo",
  ALVARA: "Alvará",
  CERTIDAO: "Certidão",
  ACORDO: "Acordo",
  OUTRO: "Outro",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  REUNIAO: "Reunião",
  AUDIENCIA: "Audiência",
  SUSTENTACAO: "Sustentação",
  DESPACHO: "Despacho",
  PESQUISA: "Pesquisa",
  ANALISE: "Análise",
  PETICAO: "Petição",
  EMAIL: "E-mail",
  TELEFONEMA: "Telefonema",
  NEGOCIACAO: "Negociação",
  DILIGENCIA: "Diligência",
  TAREFA_PROJETO: "Tarefa de Projeto",
  MARCO_ALCANCADO: "Marco Alcançado",
  OUTRO: "Outro",
};

export const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatCurrency(value: any): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCNJ(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 20) {
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
  }
  return value;
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineColor(date: Date | string): string {
  const days = daysUntil(date);
  if (days < 0) return "text-red-700 bg-red-100";
  if (days <= 2) return "text-red-600 bg-red-50";
  if (days <= 5) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}
