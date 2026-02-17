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

export const PRIORITY_LABELS: Record<string, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const PRIORITY_COLORS: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700",
  ALTA: "bg-orange-100 text-orange-700",
  MEDIA: "bg-blue-100 text-blue-700",
  BAIXA: "bg-gray-100 text-gray-600",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANEJAMENTO: "bg-slate-100 text-slate-700",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  AGUARDANDO_CLIENTE: "bg-amber-100 text-amber-700",
  AGUARDANDO_TERCEIRO: "bg-yellow-100 text-yellow-700",
  AGUARDANDO_ORGAO: "bg-orange-100 text-orange-700",
  PAUSADO: "bg-gray-100 text-gray-600",
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-700",
};

export const PROJECT_TASK_TYPE_LABELS: Record<string, string> = {
  DOCUMENTO: "Documento",
  REUNIAO: "Reunião",
  DILIGENCIA: "Diligência",
  ANALISE: "Análise",
  COMUNICACAO: "Comunicação",
  COBRANCA: "Cobrança",
  ACOMPANHAMENTO: "Acompanhamento",
  PROTOCOLO: "Protocolo",
  OBTENCAO_CERTIDAO: "Obtenção de Certidão",
  OBTENCAO_ALVARA: "Obtenção de Alvará",
  LIBERACAO_VALORES: "Liberação de Valores",
  NEGOCIACAO: "Negociação",
  ASSINATURA: "Assinatura",
  REGISTRO: "Registro",
  PAGAMENTO: "Pagamento",
  OUTRO: "Outro",
};

export const PROJECT_TASK_STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  A_FAZER: "A Fazer",
  EM_ANDAMENTO: "Em Andamento",
  EM_REVISAO: "Em Revisão",
  AGUARDANDO: "Aguardando",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const PROJECT_TASK_STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-slate-100 text-slate-600",
  A_FAZER: "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-indigo-100 text-indigo-700",
  EM_REVISAO: "bg-purple-100 text-purple-700",
  AGUARDANDO: "bg-amber-100 text-amber-700",
  CONCLUIDA: "bg-emerald-100 text-emerald-700",
  CANCELADA: "bg-red-100 text-red-700",
};

export const PROJECT_PHASE_STATUS_LABELS: Record<string, string> = {
  NAO_INICIADA: "Não Iniciada",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDA: "Concluída",
  BLOQUEADA: "Bloqueada",
};

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  ALCANCADO: "Alcançado",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

export const MILESTONE_IMPACT_LABELS: Record<string, string> = {
  CRITICO: "Crítico",
  ALTO: "Alto",
  MEDIO: "Médio",
  BAIXO: "Baixo",
};

export const PROJECT_TEAM_ROLE_LABELS: Record<string, string> = {
  RESPONSAVEL: "Responsável",
  MEMBRO: "Membro",
  CONSULTOR: "Consultor",
  ESTAGIARIO: "Estagiário",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  CERTIDAO: "Certidão",
  REGISTRO: "Registro",
  CUSTAS: "Custas",
  VIAGEM: "Viagem",
  PERICIA: "Perícia",
  OUTRO: "Outro",
};

export const CALENDAR_EVENT_TYPE_LABELS: Record<string, string> = {
  REUNIAO: "Reunião",
  AUDIENCIA: "Audiência",
  SUSTENTACAO_ORAL: "Sustentação Oral",
  DESPACHO_ORAL: "Despacho Oral",
  PESQUISA_JURIDICA: "Pesquisa Jurídica",
  ANALISE_CASO: "Análise de Caso",
  PRAZO_ANTECIPADO: "Prazo Antecipado",
  PRAZO_FATAL: "Prazo Fatal",
  RETORNO_EMAIL: "Retorno de E-mail",
  ATIVIDADE_GERAL: "Atividade Geral",
};

export const CALENDAR_EVENT_TYPE_COLORS: Record<string, string> = {
  REUNIAO: "#3b82f6",
  AUDIENCIA: "#a855f7",
  SUSTENTACAO_ORAL: "#ec4899",
  DESPACHO_ORAL: "#f97316",
  PESQUISA_JURIDICA: "#0891b2",
  ANALISE_CASO: "#7c3aed",
  PRAZO_ANTECIPADO: "#f59e0b",
  PRAZO_FATAL: "#dc2626",
  RETORNO_EMAIL: "#06b6d4",
  ATIVIDADE_GERAL: "#6b7280",
};

export const CALENDAR_EVENT_STATUS_LABELS: Record<string, string> = {
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const CALENDAR_EVENT_STATUS_COLORS: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-indigo-100 text-indigo-700",
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-700",
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
