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

export const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];
