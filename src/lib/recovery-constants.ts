// Credit Recovery Module — Constants, labels, colors, icons, and helper functions
// Covers: investigacao patrimonial, execucao judicial, penhora, acordo,
// desconsideracao da personalidade juridica, monitoramento de devedores.
// Adapted for Brazilian procedural law (CPC/2015, Lei 8.009/90, Lei 6.830/80).

// ============================================================
// Const arrays and derived types
// ============================================================

export const CASE_TYPES = [
  "CUMPRIMENTO_SENTENCA",
  "EXECUCAO_TITULO_EXTRAJUDICIAL",
  "EXECUCAO_FISCAL",
  "MONITORIA",
  "BUSCA_APREENSAO",
  "COBRANCA_EXTRAJUDICIAL",
] as const;

export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_PHASES = [
  "INVESTIGACAO",
  "PRE_JUDICIAL",
  "EXECUCAO",
  "PENHORA",
  "EXPROPRIACAO",
  "ACORDO",
  "ENCERRADO",
] as const;

export type CasePhase = (typeof CASE_PHASES)[number];

export const CASE_STATUSES = [
  "ATIVO",
  "SUSPENSO",
  "ACORDO_PARCIAL",
  "ACORDO_TOTAL",
  "PRESCRITO",
  "FRUSTRADO",
  "ENCERRADO_SATISFEITO",
  "ENCERRADO_INSATISFEITO",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const PRIORITIES = [
  "CRITICA",
  "ALTA",
  "MEDIA",
  "BAIXA",
] as const;

export type Priority = (typeof PRIORITIES)[number];

export const TITULO_TIPOS = [
  "SENTENCA",
  "CHEQUE",
  "NOTA_PROMISSORIA",
  "DUPLICATA",
  "ESCRITURA_PUBLICA",
  "CONTRATO",
  "CDA",
  "CCB",
  "CPR",
  "DEBENTURE",
] as const;

export type TituloTipo = (typeof TITULO_TIPOS)[number];

export const INVESTIGATION_TYPES = [
  "COMPLETA",
  "COMPLEMENTAR",
  "ATUALIZACAO",
  "URGENTE",
] as const;

export type InvestigationType = (typeof INVESTIGATION_TYPES)[number];

export const INVESTIGATION_STATUSES = [
  "SOLICITADA",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "CANCELADA",
] as const;

export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const INVESTIGATION_PHASES = [
  "PLANEJAMENTO",
  "BUSCA_PUBLICA",
  "BUSCA_JUDICIAL",
  "BUSCA_PRIVADA",
  "OSINT",
  "ANALISE",
  "RELATORIO",
] as const;

export type InvestigationPhase = (typeof INVESTIGATION_PHASES)[number];

export const SEARCH_SYSTEMS = [
  "SISBAJUD",
  "RENAJUD",
  "INFOJUD",
  "SNIPER",
  "CNIB",
  "CRI",
  "JUNTA_COMERCIAL",
  "DETRAN",
  "RECEITA_FEDERAL",
  "SERASA",
  "BOA_VISTA",
  "NEOWAY",
  "CNIS_INSS",
  "TSE",
  "ANAC",
  "TRIB_MARITIMO",
  "CCS_BACEN",
  "CENSEC",
  "OSINT_SOCIAL",
  "OSINT_GOOGLE",
  "CRIPTOJUD",
] as const;

export type SearchSystem = (typeof SEARCH_SYSTEMS)[number];

export const SEARCH_TYPES = [
  "INFORMACAO",
  "BLOQUEIO",
  "DESBLOQUEIO",
  "TRANSFERENCIA",
  "RESTRICAO",
  "PENHORA_REGISTRO",
  "TEIMOSINHA",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_STATUSES = [
  "SOLICITADA",
  "PENDENTE",
  "RESPONDIDA",
  "SEM_RESULTADO",
  "ERRO",
  "PARCIAL",
] as const;

export type SearchStatus = (typeof SEARCH_STATUSES)[number];

export const ASSET_TYPES = [
  "IMOVEL_URBANO",
  "IMOVEL_RURAL",
  "VEICULO",
  "CONTA_BANCARIA",
  "APLICACAO_FINANCEIRA",
  "PARTICIPACAO_SOCIETARIA",
  "CREDITO_JUDICIAL",
  "MARCA_PATENTE",
  "AERONAVE",
  "EMBARCACAO",
  "MAQUINARIO",
  "SEMOVENTE",
  "CRIPTOATIVO",
  "DIREITO_CREDITORIO",
  "PRECATORIO",
  "OUTROS",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_STATUSES = [
  "LOCALIZADO",
  "VERIFICANDO",
  "CONFIRMADO",
  "PENHORADO",
  "BLOQUEADO",
  "INDISPONIVEL",
  "ARREMATADO",
  "ADJUDICADO",
  "LIBERADO",
  "BEM_FAMILIA",
  "IMPENHORAVEL",
  "GRAVADO",
  "ALIENADO",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const TITULAR_RELATIONS = [
  "DEVEDOR",
  "CONJUGE",
  "SOCIO",
  "EMPRESA",
  "LARANJA",
  "TERCEIRO",
] as const;

export type TitularRelation = (typeof TITULAR_RELATIONS)[number];

export const COLLECTION_ACTION_TYPES = [
  "NOTIFICACAO_EXTRAJUDICIAL",
  "PROTESTO",
  "NEGATIVACAO",
  "MEDIACAO",
  "PETICAO_INICIAL",
  "CITACAO",
  "PENHORA_ONLINE",
  "ARRESTO",
  "SEQUESTRO",
  "AVALIACAO",
  "LEILAO",
  "ADJUDICACAO",
  "IDPJ",
  "ACAO_PAULIANA",
  "FRAUDE_EXECUCAO",
  "HABILITACAO_CREDITO",
  "RECURSO",
  "EMBARGOS",
  "IMPUGNACAO",
  "ACORDO",
  "CUMPRIMENTO_ACORDO",
  "PARCELAMENTO_916",
] as const;

export type CollectionActionType = (typeof COLLECTION_ACTION_TYPES)[number];

export const ACTION_CATEGORIES = [
  "EXTRAJUDICIAL",
  "JUDICIAL_CONHECIMENTO",
  "JUDICIAL_EXECUCAO",
  "CAUTELAR",
  "INCIDENTAL",
  "RECURSAL",
  "ACORDO",
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export const ACTION_STATUSES = [
  "PLANEJADA",
  "EM_EXECUCAO",
  "AGUARDANDO_RESPOSTA",
  "DEFERIDA",
  "INDEFERIDA",
  "CUMPRIDA",
  "FRUSTRADA",
  "CANCELADA",
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const PENHORA_TYPES = [
  "ONLINE_SISBAJUD",
  "IMOVEL",
  "VEICULO",
  "FATURAMENTO",
  "ROSTO_AUTOS",
  "ACOES",
  "RECEBIVEIS",
  "SEMOVENTES",
  "CRIPTOATIVOS",
] as const;

export type PenhoraType = (typeof PENHORA_TYPES)[number];

export const PENHORA_STATUSES = [
  "SOLICITADA",
  "EFETIVADA",
  "PARCIAL",
  "IMPUGNADA",
  "MANTIDA",
  "REDUZIDA",
  "SUBSTITUIDA",
  "CANCELADA",
  "CONVERTIDA_RENDA",
  "LIBERADA",
] as const;

export type PenhoraStatus = (typeof PENHORA_STATUSES)[number];

export const AGREEMENT_TYPES = [
  "PAGAMENTO_INTEGRAL",
  "PARCELAMENTO",
  "DACAO_PAGAMENTO",
  "DESCONTO",
  "NOVACAO",
  "TRANSACAO",
] as const;

export type AgreementType = (typeof AGREEMENT_TYPES)[number];

export const AGREEMENT_STATUSES = [
  "PROPOSTA",
  "NEGOCIANDO",
  "FORMALIZADO",
  "EM_CUMPRIMENTO",
  "CUMPRIDO",
  "DESCUMPRIDO",
  "RESCINDIDO",
] as const;

export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
  "PENDENTE",
  "PAGA",
  "ATRASADA",
  "PAGA_COM_ATRASO",
  "RENEGOCIADA",
] as const;

export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const DESCONSIDERACAO_TYPES = [
  "DIRETA",
  "INVERSA",
  "EXTENSAO_GRUPO_ECONOMICO",
] as const;

export type DesconsideracaoType = (typeof DESCONSIDERACAO_TYPES)[number];

export const DESCONSIDERACAO_TEORIAS = [
  "MAIOR_CC50",
  "MENOR_CDC28",
  "TRABALHISTA_CLT2",
  "AMBIENTAL",
] as const;

export type DesconsideracaoTeoria = (typeof DESCONSIDERACAO_TEORIAS)[number];

export const DESCONSIDERACAO_STATUSES = [
  "ANALISE_VIABILIDADE",
  "PREPARANDO",
  "PETICIONADO",
  "CITADO",
  "RESPONDIDO",
  "INSTRUINDO",
  "DEFERIDO",
  "INDEFERIDO",
  "RECURSO",
] as const;

export type DesconsideracaoStatus = (typeof DESCONSIDERACAO_STATUSES)[number];

export const DESCONSIDERACAO_HIPOTESES = [
  "DESVIO_FINALIDADE",
  "CONFUSAO_PATRIMONIAL",
  "OBSTACULO_CDC",
  "GRUPO_ECONOMICO",
] as const;

export type DesconsideracaoHipotese = (typeof DESCONSIDERACAO_HIPOTESES)[number];

export const JOINT_DEBTOR_TYPES = [
  "DEVEDOR_PRINCIPAL",
  "AVALISTA",
  "FIADOR",
  "SOCIO",
  "ADMINISTRADOR",
  "GRUPO_ECONOMICO",
  "SUCESSOR",
  "CONJUGE",
] as const;

export type JointDebtorType = (typeof JOINT_DEBTOR_TYPES)[number];

export const JOINT_DEBTOR_STATUSES = [
  "IDENTIFICADO",
  "NOTIFICADO",
  "CITADO",
  "EXECUTANDO",
  "ACORDO",
  "INSOLVENTE",
] as const;

export type JointDebtorStatus = (typeof JOINT_DEBTOR_STATUSES)[number];

export const MONITORING_TYPES = [
  "PROCESSO_JUDICIAL",
  "DIARIO_OFICIAL",
  "CREDITO_BUREAU",
  "PATRIMONIO",
  "SOCIETARIO",
  "REDES_SOCIAIS",
  "CERTIDAO_PROTESTO",
] as const;

export type MonitoringType = (typeof MONITORING_TYPES)[number];

export const MONITORING_SOURCES = [
  "DATAJUD",
  "JUDIT",
  "ESCAVADOR",
  "SERASA",
  "NEOWAY",
  "ARISP",
  "CENPROT",
  "MANUAL",
] as const;

export type MonitoringSource = (typeof MONITORING_SOURCES)[number];

export const MONITORING_FREQUENCIES = [
  "TEMPO_REAL",
  "DIARIO",
  "SEMANAL",
  "MENSAL",
] as const;

export type MonitoringFrequency = (typeof MONITORING_FREQUENCIES)[number];

export const ALERT_TYPES = [
  "NOVO_BEM",
  "BEM_ALIENADO",
  "NOVO_PROCESSO",
  "FALENCIA",
  "RECUPERACAO_JUDICIAL",
  "MUDANCA_SOCIETARIA",
  "NOVO_EMPREGO",
  "SCORE_ALTERADO",
  "PROTESTO_PAGO",
  "PUBLICACAO_DO",
  "ESTILO_VIDA",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = [
  "CRITICA",
  "ALTA",
  "MEDIA",
  "BAIXA",
  "INFO",
] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const EVENT_TYPES = [
  "NOTA",
  "REUNIAO",
  "TELEFONEMA",
  "EMAIL",
  "WHATSAPP",
  "DESPACHO",
  "DECISAO",
  "SENTENCA",
  "PETICAO",
  "AUDIENCIA",
  "DILIGENCIA",
  "PUBLICACAO",
  "ALERTA_IA",
  "MUDANCA_FASE",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const PRESCRICAO_RISK_LEVELS = [
  "IMINENTE",
  "PROXIMO",
  "DISTANTE",
  "PRESCRITO",
] as const;

export type PrescricaoRiskLevel = (typeof PRESCRICAO_RISK_LEVELS)[number];

export const INSOLVENCIA_RISK_LEVELS = [
  "BAIXO",
  "MEDIO",
  "ALTO",
  "INSOLVENTE",
] as const;

export type InsolvenciaRiskLevel = (typeof INSOLVENCIA_RISK_LEVELS)[number];

// ============================================================
// 1. Case Type — Labels, Colors, Icons
// ============================================================

export const CASE_TYPE_LABELS: Record<string, string> = {
  CUMPRIMENTO_SENTENCA: "Cumprimento de Sentenca",
  EXECUCAO_TITULO_EXTRAJUDICIAL: "Exec. Titulo Extrajudicial",
  EXECUCAO_FISCAL: "Execucao Fiscal",
  MONITORIA: "Acao Monitoria",
  BUSCA_APREENSAO: "Busca e Apreensao",
  COBRANCA_EXTRAJUDICIAL: "Cobranca Extrajudicial",
};

export const CASE_TYPE_COLORS: Record<string, string> = {
  CUMPRIMENTO_SENTENCA: "bg-blue-100 text-blue-700 border-blue-200",
  EXECUCAO_TITULO_EXTRAJUDICIAL: "bg-indigo-100 text-indigo-700 border-indigo-200",
  EXECUCAO_FISCAL: "bg-red-100 text-red-700 border-red-200",
  MONITORIA: "bg-purple-100 text-purple-700 border-purple-200",
  BUSCA_APREENSAO: "bg-orange-100 text-orange-700 border-orange-200",
  COBRANCA_EXTRAJUDICIAL: "bg-amber-100 text-amber-700 border-amber-200",
};

export const CASE_TYPE_ICONS: Record<string, string> = {
  CUMPRIMENTO_SENTENCA: "Gavel",
  EXECUCAO_TITULO_EXTRAJUDICIAL: "FileText",
  EXECUCAO_FISCAL: "Landmark",
  MONITORIA: "ClipboardCheck",
  BUSCA_APREENSAO: "Search",
  COBRANCA_EXTRAJUDICIAL: "Send",
};

// ============================================================
// 2. Case Phase — Labels, Colors, Icons, Order
// ============================================================

export const CASE_PHASE_LABELS: Record<string, string> = {
  INVESTIGACAO: "Investigacao Patrimonial",
  PRE_JUDICIAL: "Pre-Judicial",
  EXECUCAO: "Execucao",
  PENHORA: "Penhora",
  EXPROPRIACAO: "Expropriacao",
  ACORDO: "Acordo",
  ENCERRADO: "Encerrado",
};

export const CASE_PHASE_COLORS: Record<string, string> = {
  INVESTIGACAO: "#8B5CF6",
  PRE_JUDICIAL: "#3B82F6",
  EXECUCAO: "#F59E0B",
  PENHORA: "#F97316",
  EXPROPRIACAO: "#EF4444",
  ACORDO: "#10B981",
  ENCERRADO: "#6B7280",
};

export const CASE_PHASE_BG_COLORS: Record<string, string> = {
  INVESTIGACAO: "bg-violet-100 text-violet-700",
  PRE_JUDICIAL: "bg-blue-100 text-blue-700",
  EXECUCAO: "bg-amber-100 text-amber-700",
  PENHORA: "bg-orange-100 text-orange-700",
  EXPROPRIACAO: "bg-red-100 text-red-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
  ENCERRADO: "bg-gray-200 text-gray-600",
};

export const CASE_PHASE_ICONS: Record<string, string> = {
  INVESTIGACAO: "SearchCheck",
  PRE_JUDICIAL: "FileWarning",
  EXECUCAO: "Scale",
  PENHORA: "Lock",
  EXPROPRIACAO: "Banknote",
  ACORDO: "Handshake",
  ENCERRADO: "CheckCircle2",
};

export const CASE_PHASE_ORDER: string[] = [
  "INVESTIGACAO",
  "PRE_JUDICIAL",
  "EXECUCAO",
  "PENHORA",
  "EXPROPRIACAO",
  "ACORDO",
  "ENCERRADO",
];

// ============================================================
// 3. Case Status — Labels, Colors, Icons
// ============================================================

export const CASE_STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  ACORDO_PARCIAL: "Acordo Parcial",
  ACORDO_TOTAL: "Acordo Total",
  PRESCRITO: "Prescrito",
  FRUSTRADO: "Frustrado",
  ENCERRADO_SATISFEITO: "Encerrado — Satisfeito",
  ENCERRADO_INSATISFEITO: "Encerrado — Insatisfeito",
};

export const CASE_STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-blue-100 text-blue-700",
  SUSPENSO: "bg-yellow-100 text-yellow-700",
  ACORDO_PARCIAL: "bg-teal-100 text-teal-700",
  ACORDO_TOTAL: "bg-emerald-100 text-emerald-700",
  PRESCRITO: "bg-gray-200 text-gray-500",
  FRUSTRADO: "bg-red-100 text-red-700",
  ENCERRADO_SATISFEITO: "bg-green-100 text-green-700",
  ENCERRADO_INSATISFEITO: "bg-gray-100 text-gray-600",
};

export const CASE_STATUS_HEX: Record<string, string> = {
  ATIVO: "#3B82F6",
  SUSPENSO: "#EAB308",
  ACORDO_PARCIAL: "#14B8A6",
  ACORDO_TOTAL: "#10B981",
  PRESCRITO: "#9CA3AF",
  FRUSTRADO: "#EF4444",
  ENCERRADO_SATISFEITO: "#22C55E",
  ENCERRADO_INSATISFEITO: "#6B7280",
};

export const CASE_STATUS_ICONS: Record<string, string> = {
  ATIVO: "Play",
  SUSPENSO: "Pause",
  ACORDO_PARCIAL: "HandCoins",
  ACORDO_TOTAL: "Handshake",
  PRESCRITO: "Clock",
  FRUSTRADO: "XCircle",
  ENCERRADO_SATISFEITO: "CheckCircle2",
  ENCERRADO_INSATISFEITO: "MinusCircle",
};

// ============================================================
// 4. Priority — Labels, Colors, Icons
// ============================================================

export const PRIORITY_LABELS: Record<string, string> = {
  CRITICA: "Critica",
  ALTA: "Alta",
  MEDIA: "Media",
  BAIXA: "Baixa",
};

export const PRIORITY_COLORS: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700",
  ALTA: "bg-orange-100 text-orange-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAIXA: "bg-blue-100 text-blue-700",
};

export const PRIORITY_HEX: Record<string, string> = {
  CRITICA: "#EF4444",
  ALTA: "#F97316",
  MEDIA: "#F59E0B",
  BAIXA: "#3B82F6",
};

export const PRIORITY_ICONS: Record<string, string> = {
  CRITICA: "AlertTriangle",
  ALTA: "ArrowUp",
  MEDIA: "Minus",
  BAIXA: "ArrowDown",
};

// ============================================================
// 5. Titulo Tipo — Labels, Colors, Icons
// ============================================================

export const TITULO_TIPO_LABELS: Record<string, string> = {
  SENTENCA: "Sentenca Judicial",
  CHEQUE: "Cheque",
  NOTA_PROMISSORIA: "Nota Promissoria",
  DUPLICATA: "Duplicata",
  ESCRITURA_PUBLICA: "Escritura Publica",
  CONTRATO: "Contrato",
  CDA: "Certidao de Divida Ativa (CDA)",
  CCB: "Cedula de Credito Bancario (CCB)",
  CPR: "Cedula de Produto Rural (CPR)",
  DEBENTURE: "Debenture",
};

export const TITULO_TIPO_COLORS: Record<string, string> = {
  SENTENCA: "bg-blue-100 text-blue-700 border-blue-200",
  CHEQUE: "bg-amber-100 text-amber-700 border-amber-200",
  NOTA_PROMISSORIA: "bg-yellow-100 text-yellow-700 border-yellow-200",
  DUPLICATA: "bg-indigo-100 text-indigo-700 border-indigo-200",
  ESCRITURA_PUBLICA: "bg-purple-100 text-purple-700 border-purple-200",
  CONTRATO: "bg-cyan-100 text-cyan-700 border-cyan-200",
  CDA: "bg-red-100 text-red-700 border-red-200",
  CCB: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CPR: "bg-green-100 text-green-700 border-green-200",
  DEBENTURE: "bg-violet-100 text-violet-700 border-violet-200",
};

export const TITULO_TIPO_ICONS: Record<string, string> = {
  SENTENCA: "Gavel",
  CHEQUE: "CreditCard",
  NOTA_PROMISSORIA: "Receipt",
  DUPLICATA: "FileText",
  ESCRITURA_PUBLICA: "Scroll",
  CONTRATO: "FileSignature",
  CDA: "Landmark",
  CCB: "Building2",
  CPR: "Wheat",
  DEBENTURE: "TrendingUp",
};

// ============================================================
// 6. Investigation Type — Labels, Colors, Icons
// ============================================================

export const INVESTIGATION_TYPE_LABELS: Record<string, string> = {
  COMPLETA: "Investigacao Completa",
  COMPLEMENTAR: "Investigacao Complementar",
  ATUALIZACAO: "Atualizacao Patrimonial",
  URGENTE: "Investigacao Urgente",
};

export const INVESTIGATION_TYPE_COLORS: Record<string, string> = {
  COMPLETA: "bg-indigo-100 text-indigo-700 border-indigo-200",
  COMPLEMENTAR: "bg-blue-100 text-blue-700 border-blue-200",
  ATUALIZACAO: "bg-cyan-100 text-cyan-700 border-cyan-200",
  URGENTE: "bg-red-100 text-red-700 border-red-200",
};

export const INVESTIGATION_TYPE_ICONS: Record<string, string> = {
  COMPLETA: "SearchCheck",
  COMPLEMENTAR: "SearchPlus",
  ATUALIZACAO: "RefreshCw",
  URGENTE: "Zap",
};

// ============================================================
// 7. Investigation Status — Labels, Colors
// ============================================================

export const INVESTIGATION_STATUS_LABELS: Record<string, string> = {
  SOLICITADA: "Solicitada",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDA: "Concluida",
  CANCELADA: "Cancelada",
};

export const INVESTIGATION_STATUS_COLORS: Record<string, string> = {
  SOLICITADA: "bg-gray-100 text-gray-600",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  CONCLUIDA: "bg-emerald-100 text-emerald-700",
  CANCELADA: "bg-red-100 text-red-700",
};

// ============================================================
// 8. Investigation Phase — Labels, Colors, Order
// ============================================================

export const INVESTIGATION_PHASE_LABELS: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  BUSCA_PUBLICA: "Busca Publica",
  BUSCA_JUDICIAL: "Busca Judicial",
  BUSCA_PRIVADA: "Busca Privada",
  OSINT: "OSINT",
  ANALISE: "Analise",
  RELATORIO: "Relatorio",
};

export const INVESTIGATION_PHASE_COLORS: Record<string, string> = {
  PLANEJAMENTO: "bg-gray-100 text-gray-700",
  BUSCA_PUBLICA: "bg-blue-100 text-blue-700",
  BUSCA_JUDICIAL: "bg-indigo-100 text-indigo-700",
  BUSCA_PRIVADA: "bg-purple-100 text-purple-700",
  OSINT: "bg-violet-100 text-violet-700",
  ANALISE: "bg-amber-100 text-amber-700",
  RELATORIO: "bg-emerald-100 text-emerald-700",
};

export const INVESTIGATION_PHASE_HEX: Record<string, string> = {
  PLANEJAMENTO: "#6B7280",
  BUSCA_PUBLICA: "#3B82F6",
  BUSCA_JUDICIAL: "#6366F1",
  BUSCA_PRIVADA: "#8B5CF6",
  OSINT: "#7C3AED",
  ANALISE: "#F59E0B",
  RELATORIO: "#10B981",
};

export const INVESTIGATION_PHASE_ORDER: string[] = [
  "PLANEJAMENTO",
  "BUSCA_PUBLICA",
  "BUSCA_JUDICIAL",
  "BUSCA_PRIVADA",
  "OSINT",
  "ANALISE",
  "RELATORIO",
];

// ============================================================
// 9. Search System — Labels, Colors, Icons
// ============================================================

export const SEARCH_SYSTEM_LABELS: Record<string, string> = {
  SISBAJUD: "SISBAJUD (Contas Bancarias)",
  RENAJUD: "RENAJUD (Veiculos)",
  INFOJUD: "INFOJUD (Imposto de Renda)",
  SNIPER: "SNIPER (CNJ)",
  CNIB: "CNIB (Indisponibilidade de Bens)",
  CRI: "CRI (Cartorio de Registro de Imoveis)",
  JUNTA_COMERCIAL: "Junta Comercial",
  DETRAN: "DETRAN",
  RECEITA_FEDERAL: "Receita Federal",
  SERASA: "Serasa Experian",
  BOA_VISTA: "Boa Vista SCPC",
  NEOWAY: "Neoway",
  CNIS_INSS: "CNIS/INSS (Vinculos Empregaticos)",
  TSE: "TSE (Bens Declarados)",
  ANAC: "ANAC (Aeronaves)",
  TRIB_MARITIMO: "Tribunal Maritimo (Embarcacoes)",
  CCS_BACEN: "CCS/BACEN (Relacionamentos Bancarios)",
  CENSEC: "CENSEC (Central Notarial)",
  OSINT_SOCIAL: "OSINT — Redes Sociais",
  OSINT_GOOGLE: "OSINT — Google/Web",
  CRIPTOJUD: "CRIPTOJUD (Criptoativos)",
};

export const SEARCH_SYSTEM_COLORS: Record<string, string> = {
  SISBAJUD: "bg-blue-100 text-blue-700",
  RENAJUD: "bg-indigo-100 text-indigo-700",
  INFOJUD: "bg-purple-100 text-purple-700",
  SNIPER: "bg-red-100 text-red-700",
  CNIB: "bg-orange-100 text-orange-700",
  CRI: "bg-amber-100 text-amber-700",
  JUNTA_COMERCIAL: "bg-yellow-100 text-yellow-700",
  DETRAN: "bg-cyan-100 text-cyan-700",
  RECEITA_FEDERAL: "bg-emerald-100 text-emerald-700",
  SERASA: "bg-pink-100 text-pink-700",
  BOA_VISTA: "bg-rose-100 text-rose-700",
  NEOWAY: "bg-teal-100 text-teal-700",
  CNIS_INSS: "bg-green-100 text-green-700",
  TSE: "bg-lime-100 text-lime-700",
  ANAC: "bg-sky-100 text-sky-700",
  TRIB_MARITIMO: "bg-blue-100 text-blue-800",
  CCS_BACEN: "bg-indigo-100 text-indigo-800",
  CENSEC: "bg-violet-100 text-violet-700",
  OSINT_SOCIAL: "bg-fuchsia-100 text-fuchsia-700",
  OSINT_GOOGLE: "bg-slate-100 text-slate-700",
  CRIPTOJUD: "bg-orange-100 text-orange-800",
};

export const SEARCH_SYSTEM_ICONS: Record<string, string> = {
  SISBAJUD: "Building2",
  RENAJUD: "Car",
  INFOJUD: "FileSpreadsheet",
  SNIPER: "Target",
  CNIB: "ShieldAlert",
  CRI: "Home",
  JUNTA_COMERCIAL: "Briefcase",
  DETRAN: "Car",
  RECEITA_FEDERAL: "Landmark",
  SERASA: "BarChart3",
  BOA_VISTA: "BarChart3",
  NEOWAY: "Database",
  CNIS_INSS: "Users",
  TSE: "Vote",
  ANAC: "Plane",
  TRIB_MARITIMO: "Ship",
  CCS_BACEN: "CreditCard",
  CENSEC: "FileKey",
  OSINT_SOCIAL: "Globe",
  OSINT_GOOGLE: "Search",
  CRIPTOJUD: "Bitcoin",
};

// ============================================================
// 10. Search Type — Labels, Colors, Icons
// ============================================================

export const SEARCH_TYPE_LABELS: Record<string, string> = {
  INFORMACAO: "Informacao",
  BLOQUEIO: "Bloqueio",
  DESBLOQUEIO: "Desbloqueio",
  TRANSFERENCIA: "Transferencia",
  RESTRICAO: "Restricao",
  PENHORA_REGISTRO: "Penhora no Registro",
  TEIMOSINHA: "Teimosinha (Reiteracao)",
};

export const SEARCH_TYPE_COLORS: Record<string, string> = {
  INFORMACAO: "bg-blue-100 text-blue-700",
  BLOQUEIO: "bg-red-100 text-red-700",
  DESBLOQUEIO: "bg-green-100 text-green-700",
  TRANSFERENCIA: "bg-emerald-100 text-emerald-700",
  RESTRICAO: "bg-orange-100 text-orange-700",
  PENHORA_REGISTRO: "bg-amber-100 text-amber-700",
  TEIMOSINHA: "bg-purple-100 text-purple-700",
};

export const SEARCH_TYPE_ICONS: Record<string, string> = {
  INFORMACAO: "Info",
  BLOQUEIO: "Lock",
  DESBLOQUEIO: "Unlock",
  TRANSFERENCIA: "ArrowRightLeft",
  RESTRICAO: "ShieldBan",
  PENHORA_REGISTRO: "FileKey2",
  TEIMOSINHA: "Repeat",
};

// ============================================================
// 11. Search Status — Labels, Colors
// ============================================================

export const SEARCH_STATUS_LABELS: Record<string, string> = {
  SOLICITADA: "Solicitada",
  PENDENTE: "Pendente",
  RESPONDIDA: "Respondida",
  SEM_RESULTADO: "Sem Resultado",
  ERRO: "Erro",
  PARCIAL: "Resultado Parcial",
};

export const SEARCH_STATUS_COLORS: Record<string, string> = {
  SOLICITADA: "bg-gray-100 text-gray-600",
  PENDENTE: "bg-yellow-100 text-yellow-700",
  RESPONDIDA: "bg-emerald-100 text-emerald-700",
  SEM_RESULTADO: "bg-slate-100 text-slate-600",
  ERRO: "bg-red-100 text-red-700",
  PARCIAL: "bg-amber-100 text-amber-700",
};

// ============================================================
// 12. Asset Type — Labels, Colors, Icons
// ============================================================

export const ASSET_TYPE_LABELS: Record<string, string> = {
  IMOVEL_URBANO: "Imovel Urbano",
  IMOVEL_RURAL: "Imovel Rural",
  VEICULO: "Veiculo",
  CONTA_BANCARIA: "Conta Bancaria",
  APLICACAO_FINANCEIRA: "Aplicacao Financeira",
  PARTICIPACAO_SOCIETARIA: "Participacao Societaria",
  CREDITO_JUDICIAL: "Credito Judicial",
  MARCA_PATENTE: "Marca / Patente",
  AERONAVE: "Aeronave",
  EMBARCACAO: "Embarcacao",
  MAQUINARIO: "Maquinario",
  SEMOVENTE: "Semovente",
  CRIPTOATIVO: "Criptoativo",
  DIREITO_CREDITORIO: "Direito Creditorio",
  PRECATORIO: "Precatorio",
  OUTROS: "Outros",
};

export const ASSET_TYPE_COLORS: Record<string, string> = {
  IMOVEL_URBANO: "bg-blue-100 text-blue-700 border-blue-200",
  IMOVEL_RURAL: "bg-green-100 text-green-700 border-green-200",
  VEICULO: "bg-indigo-100 text-indigo-700 border-indigo-200",
  CONTA_BANCARIA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  APLICACAO_FINANCEIRA: "bg-teal-100 text-teal-700 border-teal-200",
  PARTICIPACAO_SOCIETARIA: "bg-purple-100 text-purple-700 border-purple-200",
  CREDITO_JUDICIAL: "bg-cyan-100 text-cyan-700 border-cyan-200",
  MARCA_PATENTE: "bg-violet-100 text-violet-700 border-violet-200",
  AERONAVE: "bg-sky-100 text-sky-700 border-sky-200",
  EMBARCACAO: "bg-blue-100 text-blue-800 border-blue-200",
  MAQUINARIO: "bg-amber-100 text-amber-700 border-amber-200",
  SEMOVENTE: "bg-lime-100 text-lime-700 border-lime-200",
  CRIPTOATIVO: "bg-orange-100 text-orange-700 border-orange-200",
  DIREITO_CREDITORIO: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PRECATORIO: "bg-rose-100 text-rose-700 border-rose-200",
  OUTROS: "bg-gray-100 text-gray-600 border-gray-200",
};

export const ASSET_TYPE_ICONS: Record<string, string> = {
  IMOVEL_URBANO: "Building",
  IMOVEL_RURAL: "TreePine",
  VEICULO: "Car",
  CONTA_BANCARIA: "Wallet",
  APLICACAO_FINANCEIRA: "TrendingUp",
  PARTICIPACAO_SOCIETARIA: "Users",
  CREDITO_JUDICIAL: "Scale",
  MARCA_PATENTE: "Award",
  AERONAVE: "Plane",
  EMBARCACAO: "Ship",
  MAQUINARIO: "Cog",
  SEMOVENTE: "Bug",
  CRIPTOATIVO: "Bitcoin",
  DIREITO_CREDITORIO: "FileText",
  PRECATORIO: "Receipt",
  OUTROS: "Package",
};

// ============================================================
// 13. Asset Status — Labels, Colors, Icons
// ============================================================

export const ASSET_STATUS_LABELS: Record<string, string> = {
  LOCALIZADO: "Localizado",
  VERIFICANDO: "Verificando",
  CONFIRMADO: "Confirmado",
  PENHORADO: "Penhorado",
  BLOQUEADO: "Bloqueado",
  INDISPONIVEL: "Indisponivel",
  ARREMATADO: "Arrematado",
  ADJUDICADO: "Adjudicado",
  LIBERADO: "Liberado",
  BEM_FAMILIA: "Bem de Familia",
  IMPENHORAVEL: "Impenhoravel",
  GRAVADO: "Gravado (Onus)",
  ALIENADO: "Alienado",
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  LOCALIZADO: "bg-blue-100 text-blue-700",
  VERIFICANDO: "bg-yellow-100 text-yellow-700",
  CONFIRMADO: "bg-indigo-100 text-indigo-700",
  PENHORADO: "bg-emerald-100 text-emerald-700",
  BLOQUEADO: "bg-orange-100 text-orange-700",
  INDISPONIVEL: "bg-red-100 text-red-700",
  ARREMATADO: "bg-green-100 text-green-700",
  ADJUDICADO: "bg-teal-100 text-teal-700",
  LIBERADO: "bg-gray-100 text-gray-600",
  BEM_FAMILIA: "bg-pink-100 text-pink-700",
  IMPENHORAVEL: "bg-rose-100 text-rose-700",
  GRAVADO: "bg-amber-100 text-amber-700",
  ALIENADO: "bg-slate-100 text-slate-600",
};

export const ASSET_STATUS_HEX: Record<string, string> = {
  LOCALIZADO: "#3B82F6",
  VERIFICANDO: "#EAB308",
  CONFIRMADO: "#6366F1",
  PENHORADO: "#10B981",
  BLOQUEADO: "#F97316",
  INDISPONIVEL: "#EF4444",
  ARREMATADO: "#22C55E",
  ADJUDICADO: "#14B8A6",
  LIBERADO: "#6B7280",
  BEM_FAMILIA: "#EC4899",
  IMPENHORAVEL: "#F43F5E",
  GRAVADO: "#F59E0B",
  ALIENADO: "#64748B",
};

export const ASSET_STATUS_ICONS: Record<string, string> = {
  LOCALIZADO: "MapPin",
  VERIFICANDO: "Loader2",
  CONFIRMADO: "CheckCircle",
  PENHORADO: "Lock",
  BLOQUEADO: "ShieldAlert",
  INDISPONIVEL: "Ban",
  ARREMATADO: "Hammer",
  ADJUDICADO: "FileCheck",
  LIBERADO: "Unlock",
  BEM_FAMILIA: "Home",
  IMPENHORAVEL: "ShieldOff",
  GRAVADO: "AlertCircle",
  ALIENADO: "ArrowRightFromLine",
};

// ============================================================
// 14. Titular Relation — Labels, Colors
// ============================================================

export const TITULAR_RELATION_LABELS: Record<string, string> = {
  DEVEDOR: "Devedor",
  CONJUGE: "Conjuge",
  SOCIO: "Socio",
  EMPRESA: "Empresa",
  LARANJA: "Laranja / Interposta Pessoa",
  TERCEIRO: "Terceiro",
};

export const TITULAR_RELATION_COLORS: Record<string, string> = {
  DEVEDOR: "bg-red-100 text-red-700",
  CONJUGE: "bg-pink-100 text-pink-700",
  SOCIO: "bg-purple-100 text-purple-700",
  EMPRESA: "bg-blue-100 text-blue-700",
  LARANJA: "bg-orange-100 text-orange-700",
  TERCEIRO: "bg-gray-100 text-gray-600",
};

// ============================================================
// 15. Collection Action Type — Labels, Colors, Icons
// ============================================================

export const COLLECTION_ACTION_TYPE_LABELS: Record<string, string> = {
  NOTIFICACAO_EXTRAJUDICIAL: "Notificacao Extrajudicial",
  PROTESTO: "Protesto de Titulo",
  NEGATIVACAO: "Negativacao (Serasa/SPC)",
  MEDIACAO: "Mediacao",
  PETICAO_INICIAL: "Peticao Inicial",
  CITACAO: "Citacao",
  PENHORA_ONLINE: "Penhora Online (SISBAJUD)",
  ARRESTO: "Arresto",
  SEQUESTRO: "Sequestro",
  AVALIACAO: "Avaliacao de Bem",
  LEILAO: "Leilao",
  ADJUDICACAO: "Adjudicacao",
  IDPJ: "IDPJ (Desconsideracao PJ)",
  ACAO_PAULIANA: "Acao Pauliana",
  FRAUDE_EXECUCAO: "Fraude a Execucao",
  HABILITACAO_CREDITO: "Habilitacao de Credito",
  RECURSO: "Recurso",
  EMBARGOS: "Embargos",
  IMPUGNACAO: "Impugnacao",
  ACORDO: "Acordo",
  CUMPRIMENTO_ACORDO: "Cumprimento de Acordo",
  PARCELAMENTO_916: "Parcelamento (art. 916 CPC)",
};

export const COLLECTION_ACTION_TYPE_COLORS: Record<string, string> = {
  NOTIFICACAO_EXTRAJUDICIAL: "bg-amber-100 text-amber-700",
  PROTESTO: "bg-orange-100 text-orange-700",
  NEGATIVACAO: "bg-red-100 text-red-700",
  MEDIACAO: "bg-teal-100 text-teal-700",
  PETICAO_INICIAL: "bg-blue-100 text-blue-700",
  CITACAO: "bg-indigo-100 text-indigo-700",
  PENHORA_ONLINE: "bg-purple-100 text-purple-700",
  ARRESTO: "bg-violet-100 text-violet-700",
  SEQUESTRO: "bg-fuchsia-100 text-fuchsia-700",
  AVALIACAO: "bg-cyan-100 text-cyan-700",
  LEILAO: "bg-rose-100 text-rose-700",
  ADJUDICACAO: "bg-emerald-100 text-emerald-700",
  IDPJ: "bg-red-100 text-red-800",
  ACAO_PAULIANA: "bg-pink-100 text-pink-700",
  FRAUDE_EXECUCAO: "bg-orange-100 text-orange-800",
  HABILITACAO_CREDITO: "bg-sky-100 text-sky-700",
  RECURSO: "bg-slate-100 text-slate-700",
  EMBARGOS: "bg-gray-100 text-gray-700",
  IMPUGNACAO: "bg-yellow-100 text-yellow-700",
  ACORDO: "bg-green-100 text-green-700",
  CUMPRIMENTO_ACORDO: "bg-emerald-100 text-emerald-800",
  PARCELAMENTO_916: "bg-teal-100 text-teal-800",
};

export const COLLECTION_ACTION_TYPE_ICONS: Record<string, string> = {
  NOTIFICACAO_EXTRAJUDICIAL: "Mail",
  PROTESTO: "Stamp",
  NEGATIVACAO: "ThumbsDown",
  MEDIACAO: "Handshake",
  PETICAO_INICIAL: "FileText",
  CITACAO: "Bell",
  PENHORA_ONLINE: "Lock",
  ARRESTO: "ShieldAlert",
  SEQUESTRO: "ShieldBan",
  AVALIACAO: "Calculator",
  LEILAO: "Hammer",
  ADJUDICACAO: "FileCheck",
  IDPJ: "UserX",
  ACAO_PAULIANA: "Scale",
  FRAUDE_EXECUCAO: "AlertTriangle",
  HABILITACAO_CREDITO: "FilePlus",
  RECURSO: "ArrowUp",
  EMBARGOS: "ShieldOff",
  IMPUGNACAO: "MessageSquareWarning",
  ACORDO: "Handshake",
  CUMPRIMENTO_ACORDO: "CheckCircle2",
  PARCELAMENTO_916: "Calendar",
};

// ============================================================
// 16. Action Category — Labels, Colors
// ============================================================

export const ACTION_CATEGORY_LABELS: Record<string, string> = {
  EXTRAJUDICIAL: "Extrajudicial",
  JUDICIAL_CONHECIMENTO: "Judicial — Conhecimento",
  JUDICIAL_EXECUCAO: "Judicial — Execucao",
  CAUTELAR: "Cautelar",
  INCIDENTAL: "Incidental",
  RECURSAL: "Recursal",
  ACORDO: "Acordo",
};

export const ACTION_CATEGORY_COLORS: Record<string, string> = {
  EXTRAJUDICIAL: "bg-amber-100 text-amber-700",
  JUDICIAL_CONHECIMENTO: "bg-blue-100 text-blue-700",
  JUDICIAL_EXECUCAO: "bg-indigo-100 text-indigo-700",
  CAUTELAR: "bg-red-100 text-red-700",
  INCIDENTAL: "bg-purple-100 text-purple-700",
  RECURSAL: "bg-slate-100 text-slate-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
};

// ============================================================
// 17. Action Status — Labels, Colors, Icons
// ============================================================

export const ACTION_STATUS_LABELS: Record<string, string> = {
  PLANEJADA: "Planejada",
  EM_EXECUCAO: "Em Execucao",
  AGUARDANDO_RESPOSTA: "Aguardando Resposta",
  DEFERIDA: "Deferida",
  INDEFERIDA: "Indeferida",
  CUMPRIDA: "Cumprida",
  FRUSTRADA: "Frustrada",
  CANCELADA: "Cancelada",
};

export const ACTION_STATUS_COLORS: Record<string, string> = {
  PLANEJADA: "bg-gray-100 text-gray-600",
  EM_EXECUCAO: "bg-blue-100 text-blue-700",
  AGUARDANDO_RESPOSTA: "bg-yellow-100 text-yellow-700",
  DEFERIDA: "bg-emerald-100 text-emerald-700",
  INDEFERIDA: "bg-red-100 text-red-700",
  CUMPRIDA: "bg-green-100 text-green-700",
  FRUSTRADA: "bg-orange-100 text-orange-700",
  CANCELADA: "bg-slate-100 text-slate-500",
};

export const ACTION_STATUS_ICONS: Record<string, string> = {
  PLANEJADA: "Clock",
  EM_EXECUCAO: "Play",
  AGUARDANDO_RESPOSTA: "Hourglass",
  DEFERIDA: "CheckCircle",
  INDEFERIDA: "XCircle",
  CUMPRIDA: "CheckCircle2",
  FRUSTRADA: "AlertTriangle",
  CANCELADA: "Ban",
};

// ============================================================
// 18. Penhora Type — Labels, Colors, Icons
// ============================================================

export const PENHORA_TYPE_LABELS: Record<string, string> = {
  ONLINE_SISBAJUD: "Penhora Online (SISBAJUD)",
  IMOVEL: "Penhora de Imovel",
  VEICULO: "Penhora de Veiculo",
  FATURAMENTO: "Penhora de Faturamento",
  ROSTO_AUTOS: "Penhora no Rosto dos Autos",
  ACOES: "Penhora de Acoes / Quotas",
  RECEBIVEIS: "Penhora de Recebiveis",
  SEMOVENTES: "Penhora de Semoventes",
  CRIPTOATIVOS: "Penhora de Criptoativos",
};

export const PENHORA_TYPE_COLORS: Record<string, string> = {
  ONLINE_SISBAJUD: "bg-blue-100 text-blue-700",
  IMOVEL: "bg-emerald-100 text-emerald-700",
  VEICULO: "bg-indigo-100 text-indigo-700",
  FATURAMENTO: "bg-purple-100 text-purple-700",
  ROSTO_AUTOS: "bg-cyan-100 text-cyan-700",
  ACOES: "bg-violet-100 text-violet-700",
  RECEBIVEIS: "bg-amber-100 text-amber-700",
  SEMOVENTES: "bg-green-100 text-green-700",
  CRIPTOATIVOS: "bg-orange-100 text-orange-700",
};

export const PENHORA_TYPE_ICONS: Record<string, string> = {
  ONLINE_SISBAJUD: "Building2",
  IMOVEL: "Home",
  VEICULO: "Car",
  FATURAMENTO: "TrendingUp",
  ROSTO_AUTOS: "FileText",
  ACOES: "BarChart3",
  RECEBIVEIS: "Receipt",
  SEMOVENTES: "Bug",
  CRIPTOATIVOS: "Bitcoin",
};

// ============================================================
// 19. Penhora Status — Labels, Colors
// ============================================================

export const PENHORA_STATUS_LABELS: Record<string, string> = {
  SOLICITADA: "Solicitada",
  EFETIVADA: "Efetivada",
  PARCIAL: "Parcial",
  IMPUGNADA: "Impugnada",
  MANTIDA: "Mantida",
  REDUZIDA: "Reduzida",
  SUBSTITUIDA: "Substituida",
  CANCELADA: "Cancelada",
  CONVERTIDA_RENDA: "Convertida em Renda",
  LIBERADA: "Liberada",
};

export const PENHORA_STATUS_COLORS: Record<string, string> = {
  SOLICITADA: "bg-gray-100 text-gray-600",
  EFETIVADA: "bg-emerald-100 text-emerald-700",
  PARCIAL: "bg-yellow-100 text-yellow-700",
  IMPUGNADA: "bg-red-100 text-red-700",
  MANTIDA: "bg-blue-100 text-blue-700",
  REDUZIDA: "bg-orange-100 text-orange-700",
  SUBSTITUIDA: "bg-cyan-100 text-cyan-700",
  CANCELADA: "bg-slate-100 text-slate-500",
  CONVERTIDA_RENDA: "bg-green-100 text-green-700",
  LIBERADA: "bg-gray-100 text-gray-500",
};

// ============================================================
// 20. Agreement Type — Labels, Colors, Icons
// ============================================================

export const AGREEMENT_TYPE_LABELS: Record<string, string> = {
  PAGAMENTO_INTEGRAL: "Pagamento Integral",
  PARCELAMENTO: "Parcelamento",
  DACAO_PAGAMENTO: "Dacao em Pagamento",
  DESCONTO: "Desconto",
  NOVACAO: "Novacao",
  TRANSACAO: "Transacao",
};

export const AGREEMENT_TYPE_COLORS: Record<string, string> = {
  PAGAMENTO_INTEGRAL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PARCELAMENTO: "bg-blue-100 text-blue-700 border-blue-200",
  DACAO_PAGAMENTO: "bg-amber-100 text-amber-700 border-amber-200",
  DESCONTO: "bg-green-100 text-green-700 border-green-200",
  NOVACAO: "bg-purple-100 text-purple-700 border-purple-200",
  TRANSACAO: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export const AGREEMENT_TYPE_ICONS: Record<string, string> = {
  PAGAMENTO_INTEGRAL: "Banknote",
  PARCELAMENTO: "Calendar",
  DACAO_PAGAMENTO: "ArrowRightLeft",
  DESCONTO: "Percent",
  NOVACAO: "RefreshCw",
  TRANSACAO: "Handshake",
};

// ============================================================
// 21. Agreement Status — Labels, Colors, Icons
// ============================================================

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  PROPOSTA: "Proposta",
  NEGOCIANDO: "Negociando",
  FORMALIZADO: "Formalizado",
  EM_CUMPRIMENTO: "Em Cumprimento",
  CUMPRIDO: "Cumprido",
  DESCUMPRIDO: "Descumprido",
  RESCINDIDO: "Rescindido",
};

export const AGREEMENT_STATUS_COLORS: Record<string, string> = {
  PROPOSTA: "bg-gray-100 text-gray-600",
  NEGOCIANDO: "bg-blue-100 text-blue-700",
  FORMALIZADO: "bg-indigo-100 text-indigo-700",
  EM_CUMPRIMENTO: "bg-amber-100 text-amber-700",
  CUMPRIDO: "bg-emerald-100 text-emerald-700",
  DESCUMPRIDO: "bg-red-100 text-red-700",
  RESCINDIDO: "bg-red-200 text-red-800",
};

export const AGREEMENT_STATUS_HEX: Record<string, string> = {
  PROPOSTA: "#6B7280",
  NEGOCIANDO: "#3B82F6",
  FORMALIZADO: "#6366F1",
  EM_CUMPRIMENTO: "#F59E0B",
  CUMPRIDO: "#10B981",
  DESCUMPRIDO: "#EF4444",
  RESCINDIDO: "#DC2626",
};

export const AGREEMENT_STATUS_ICONS: Record<string, string> = {
  PROPOSTA: "FileText",
  NEGOCIANDO: "MessageCircle",
  FORMALIZADO: "FileSignature",
  EM_CUMPRIMENTO: "Clock",
  CUMPRIDO: "CheckCircle2",
  DESCUMPRIDO: "XCircle",
  RESCINDIDO: "Trash2",
};

// ============================================================
// 22. Installment Status — Labels, Colors
// ============================================================

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  ATRASADA: "Atrasada",
  PAGA_COM_ATRASO: "Paga com Atraso",
  RENEGOCIADA: "Renegociada",
};

export const INSTALLMENT_STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-gray-100 text-gray-600",
  PAGA: "bg-emerald-100 text-emerald-700",
  ATRASADA: "bg-red-100 text-red-700",
  PAGA_COM_ATRASO: "bg-amber-100 text-amber-700",
  RENEGOCIADA: "bg-blue-100 text-blue-700",
};

export const INSTALLMENT_STATUS_HEX: Record<string, string> = {
  PENDENTE: "#6B7280",
  PAGA: "#10B981",
  ATRASADA: "#EF4444",
  PAGA_COM_ATRASO: "#F59E0B",
  RENEGOCIADA: "#3B82F6",
};

// ============================================================
// 23. Desconsideracao Type — Labels, Colors, Icons
// ============================================================

export const DESCONSIDERACAO_TYPE_LABELS: Record<string, string> = {
  DIRETA: "Desconsideracao Direta",
  INVERSA: "Desconsideracao Inversa",
  EXTENSAO_GRUPO_ECONOMICO: "Extensao a Grupo Economico",
};

export const DESCONSIDERACAO_TYPE_COLORS: Record<string, string> = {
  DIRETA: "bg-red-100 text-red-700 border-red-200",
  INVERSA: "bg-orange-100 text-orange-700 border-orange-200",
  EXTENSAO_GRUPO_ECONOMICO: "bg-purple-100 text-purple-700 border-purple-200",
};

export const DESCONSIDERACAO_TYPE_ICONS: Record<string, string> = {
  DIRETA: "UserX",
  INVERSA: "ArrowDownUp",
  EXTENSAO_GRUPO_ECONOMICO: "Network",
};

// ============================================================
// 24. Desconsideracao Teoria — Labels, Colors, Descriptions
// ============================================================

export const DESCONSIDERACAO_TEORIA_LABELS: Record<string, string> = {
  MAIOR_CC50: "Teoria Maior (art. 50 CC)",
  MENOR_CDC28: "Teoria Menor (art. 28 CDC)",
  TRABALHISTA_CLT2: "Trabalhista (art. 2 CLT)",
  AMBIENTAL: "Ambiental (Lei 9.605/98)",
};

export const DESCONSIDERACAO_TEORIA_COLORS: Record<string, string> = {
  MAIOR_CC50: "bg-blue-100 text-blue-700",
  MENOR_CDC28: "bg-amber-100 text-amber-700",
  TRABALHISTA_CLT2: "bg-indigo-100 text-indigo-700",
  AMBIENTAL: "bg-green-100 text-green-700",
};

export const DESCONSIDERACAO_TEORIA_DESCRIPTIONS: Record<string, string> = {
  MAIOR_CC50:
    "Art. 50 do Codigo Civil: Exige prova de desvio de finalidade ou confusao patrimonial. " +
    "Alterada pela Lei 13.874/2019 (Lei da Liberdade Economica) para exigir requisitos mais " +
    "rigorosos. O mero inadimplemento nao e suficiente.",
  MENOR_CDC28:
    "Art. 28, par. 5o do CDC: Basta a prova de que a personalidade juridica e obstaculo ao " +
    "ressarcimento de prejuizos causados ao consumidor. Nao exige prova de fraude. " +
    "Aplicavel apenas a relacoes de consumo.",
  TRABALHISTA_CLT2:
    "Art. 2o da CLT c/c Sumula 331 TST: Na Justica do Trabalho, a desconsideracao e aplicada " +
    "de forma ampla, bastando a insuficiencia patrimonial da empresa executada. Possivel " +
    "redirecionamento para socios e empresas do grupo economico.",
  AMBIENTAL:
    "Art. 4o da Lei 9.605/98: Em materia ambiental, a desconsideracao pode ser decretada " +
    "sempre que a personalidade juridica for obstaculo ao ressarcimento de danos ambientais. " +
    "Teoria menor aplica-se analogicamente.",
};

// ============================================================
// 25. Desconsideracao Status — Labels, Colors
// ============================================================

export const DESCONSIDERACAO_STATUS_LABELS: Record<string, string> = {
  ANALISE_VIABILIDADE: "Analise de Viabilidade",
  PREPARANDO: "Preparando",
  PETICIONADO: "Peticionado",
  CITADO: "Citado",
  RESPONDIDO: "Respondido",
  INSTRUINDO: "Instruindo",
  DEFERIDO: "Deferido",
  INDEFERIDO: "Indeferido",
  RECURSO: "Em Recurso",
};

export const DESCONSIDERACAO_STATUS_COLORS: Record<string, string> = {
  ANALISE_VIABILIDADE: "bg-gray-100 text-gray-600",
  PREPARANDO: "bg-yellow-100 text-yellow-700",
  PETICIONADO: "bg-blue-100 text-blue-700",
  CITADO: "bg-indigo-100 text-indigo-700",
  RESPONDIDO: "bg-purple-100 text-purple-700",
  INSTRUINDO: "bg-amber-100 text-amber-700",
  DEFERIDO: "bg-emerald-100 text-emerald-700",
  INDEFERIDO: "bg-red-100 text-red-700",
  RECURSO: "bg-orange-100 text-orange-700",
};

// ============================================================
// 26. Desconsideracao Hipotese — Labels, Colors, Descriptions
// ============================================================

export const DESCONSIDERACAO_HIPOTESE_LABELS: Record<string, string> = {
  DESVIO_FINALIDADE: "Desvio de Finalidade",
  CONFUSAO_PATRIMONIAL: "Confusao Patrimonial",
  OBSTACULO_CDC: "Obstaculo ao Ressarcimento (CDC)",
  GRUPO_ECONOMICO: "Grupo Economico",
};

export const DESCONSIDERACAO_HIPOTESE_COLORS: Record<string, string> = {
  DESVIO_FINALIDADE: "bg-red-100 text-red-700",
  CONFUSAO_PATRIMONIAL: "bg-orange-100 text-orange-700",
  OBSTACULO_CDC: "bg-amber-100 text-amber-700",
  GRUPO_ECONOMICO: "bg-purple-100 text-purple-700",
};

export const DESCONSIDERACAO_HIPOTESE_DESCRIPTIONS: Record<string, string> = {
  DESVIO_FINALIDADE:
    "Utilizacao da pessoa juridica com o proposito de lesar credores e para a pratica de " +
    "atos ilicitos de qualquer natureza (art. 50, par. 1o CC). Exemplos: transferencia de " +
    "ativos para empresa do mesmo grupo antes do vencimento da divida, constituicao de " +
    "empresa para blindagem patrimonial.",
  CONFUSAO_PATRIMONIAL:
    "Ausencia de separacao de fato entre o patrimonio da pessoa juridica e dos socios ou " +
    "administradores (art. 50, par. 2o CC). Exemplos: pagamento de despesas pessoais com " +
    "recursos da empresa, uso de contas bancarias pessoais para movimentacao da empresa, " +
    "mistura de receitas e despesas.",
  OBSTACULO_CDC:
    "A personalidade juridica constitui obstaculo ao ressarcimento de prejuizos causados " +
    "ao consumidor (art. 28, par. 5o CDC). Basta demonstrar a insuficiencia patrimonial " +
    "da pessoa juridica. Nao exige prova de fraude ou abuso.",
  GRUPO_ECONOMICO:
    "Empresas integrantes do mesmo grupo economico respondem solidariamente pelas obrigacoes " +
    "decorrentes da relacao de consumo (art. 28, par. 2o CDC) ou trabalhista (par. 2o, art. " +
    "2o CLT). Demonstracao de direcao, controle ou administracao comum.",
};

// ============================================================
// 27. Joint Debtor Type — Labels, Colors, Icons
// ============================================================

export const JOINT_DEBTOR_TYPE_LABELS: Record<string, string> = {
  DEVEDOR_PRINCIPAL: "Devedor Principal",
  AVALISTA: "Avalista",
  FIADOR: "Fiador",
  SOCIO: "Socio",
  ADMINISTRADOR: "Administrador",
  GRUPO_ECONOMICO: "Grupo Economico",
  SUCESSOR: "Sucessor",
  CONJUGE: "Conjuge",
};

export const JOINT_DEBTOR_TYPE_COLORS: Record<string, string> = {
  DEVEDOR_PRINCIPAL: "bg-red-100 text-red-700",
  AVALISTA: "bg-orange-100 text-orange-700",
  FIADOR: "bg-amber-100 text-amber-700",
  SOCIO: "bg-purple-100 text-purple-700",
  ADMINISTRADOR: "bg-indigo-100 text-indigo-700",
  GRUPO_ECONOMICO: "bg-violet-100 text-violet-700",
  SUCESSOR: "bg-blue-100 text-blue-700",
  CONJUGE: "bg-pink-100 text-pink-700",
};

export const JOINT_DEBTOR_TYPE_ICONS: Record<string, string> = {
  DEVEDOR_PRINCIPAL: "User",
  AVALISTA: "UserCheck",
  FIADOR: "Shield",
  SOCIO: "Users",
  ADMINISTRADOR: "Crown",
  GRUPO_ECONOMICO: "Network",
  SUCESSOR: "ArrowRight",
  CONJUGE: "Heart",
};

// ============================================================
// 28. Joint Debtor Status — Labels, Colors
// ============================================================

export const JOINT_DEBTOR_STATUS_LABELS: Record<string, string> = {
  IDENTIFICADO: "Identificado",
  NOTIFICADO: "Notificado",
  CITADO: "Citado",
  EXECUTANDO: "Executando",
  ACORDO: "Acordo",
  INSOLVENTE: "Insolvente",
};

export const JOINT_DEBTOR_STATUS_COLORS: Record<string, string> = {
  IDENTIFICADO: "bg-gray-100 text-gray-600",
  NOTIFICADO: "bg-blue-100 text-blue-700",
  CITADO: "bg-indigo-100 text-indigo-700",
  EXECUTANDO: "bg-amber-100 text-amber-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
  INSOLVENTE: "bg-red-100 text-red-700",
};

// ============================================================
// 29. Monitoring Type — Labels, Colors, Icons
// ============================================================

export const MONITORING_TYPE_LABELS: Record<string, string> = {
  PROCESSO_JUDICIAL: "Processo Judicial",
  DIARIO_OFICIAL: "Diario Oficial",
  CREDITO_BUREAU: "Bureau de Credito",
  PATRIMONIO: "Patrimonio",
  SOCIETARIO: "Societario",
  REDES_SOCIAIS: "Redes Sociais",
  CERTIDAO_PROTESTO: "Certidao de Protesto",
};

export const MONITORING_TYPE_COLORS: Record<string, string> = {
  PROCESSO_JUDICIAL: "bg-blue-100 text-blue-700",
  DIARIO_OFICIAL: "bg-indigo-100 text-indigo-700",
  CREDITO_BUREAU: "bg-purple-100 text-purple-700",
  PATRIMONIO: "bg-emerald-100 text-emerald-700",
  SOCIETARIO: "bg-amber-100 text-amber-700",
  REDES_SOCIAIS: "bg-pink-100 text-pink-700",
  CERTIDAO_PROTESTO: "bg-orange-100 text-orange-700",
};

export const MONITORING_TYPE_ICONS: Record<string, string> = {
  PROCESSO_JUDICIAL: "Scale",
  DIARIO_OFICIAL: "Newspaper",
  CREDITO_BUREAU: "BarChart3",
  PATRIMONIO: "Landmark",
  SOCIETARIO: "Building2",
  REDES_SOCIAIS: "Globe",
  CERTIDAO_PROTESTO: "FileWarning",
};

// ============================================================
// 30. Monitoring Source — Labels, Colors
// ============================================================

export const MONITORING_SOURCE_LABELS: Record<string, string> = {
  DATAJUD: "DataJud (CNJ)",
  JUDIT: "JuDit",
  ESCAVADOR: "Escavador",
  SERASA: "Serasa",
  NEOWAY: "Neoway",
  ARISP: "ARISP",
  CENPROT: "CENPROT",
  MANUAL: "Manual",
};

export const MONITORING_SOURCE_COLORS: Record<string, string> = {
  DATAJUD: "bg-blue-100 text-blue-700",
  JUDIT: "bg-indigo-100 text-indigo-700",
  ESCAVADOR: "bg-purple-100 text-purple-700",
  SERASA: "bg-pink-100 text-pink-700",
  NEOWAY: "bg-teal-100 text-teal-700",
  ARISP: "bg-amber-100 text-amber-700",
  CENPROT: "bg-orange-100 text-orange-700",
  MANUAL: "bg-gray-100 text-gray-600",
};

// ============================================================
// 31. Monitoring Frequency — Labels, Colors
// ============================================================

export const MONITORING_FREQUENCY_LABELS: Record<string, string> = {
  TEMPO_REAL: "Tempo Real",
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  MENSAL: "Mensal",
};

export const MONITORING_FREQUENCY_COLORS: Record<string, string> = {
  TEMPO_REAL: "bg-red-100 text-red-700",
  DIARIO: "bg-blue-100 text-blue-700",
  SEMANAL: "bg-indigo-100 text-indigo-700",
  MENSAL: "bg-gray-100 text-gray-600",
};

// ============================================================
// 32. Alert Type — Labels, Colors, Icons
// ============================================================

export const ALERT_TYPE_LABELS: Record<string, string> = {
  NOVO_BEM: "Novo Bem Localizado",
  BEM_ALIENADO: "Bem Alienado / Transferido",
  NOVO_PROCESSO: "Novo Processo",
  FALENCIA: "Falencia Decretada",
  RECUPERACAO_JUDICIAL: "Recuperacao Judicial",
  MUDANCA_SOCIETARIA: "Mudanca Societaria",
  NOVO_EMPREGO: "Novo Emprego",
  SCORE_ALTERADO: "Score de Credito Alterado",
  PROTESTO_PAGO: "Protesto Pago / Cancelado",
  PUBLICACAO_DO: "Publicacao no Diario Oficial",
  ESTILO_VIDA: "Sinais de Estilo de Vida",
};

export const ALERT_TYPE_COLORS: Record<string, string> = {
  NOVO_BEM: "bg-emerald-100 text-emerald-700",
  BEM_ALIENADO: "bg-red-100 text-red-700",
  NOVO_PROCESSO: "bg-blue-100 text-blue-700",
  FALENCIA: "bg-red-200 text-red-800",
  RECUPERACAO_JUDICIAL: "bg-orange-100 text-orange-700",
  MUDANCA_SOCIETARIA: "bg-purple-100 text-purple-700",
  NOVO_EMPREGO: "bg-indigo-100 text-indigo-700",
  SCORE_ALTERADO: "bg-amber-100 text-amber-700",
  PROTESTO_PAGO: "bg-green-100 text-green-700",
  PUBLICACAO_DO: "bg-cyan-100 text-cyan-700",
  ESTILO_VIDA: "bg-pink-100 text-pink-700",
};

export const ALERT_TYPE_ICONS: Record<string, string> = {
  NOVO_BEM: "Plus",
  BEM_ALIENADO: "ArrowRightFromLine",
  NOVO_PROCESSO: "FileText",
  FALENCIA: "AlertOctagon",
  RECUPERACAO_JUDICIAL: "ShieldAlert",
  MUDANCA_SOCIETARIA: "Building2",
  NOVO_EMPREGO: "Briefcase",
  SCORE_ALTERADO: "TrendingUp",
  PROTESTO_PAGO: "CheckCircle",
  PUBLICACAO_DO: "Newspaper",
  ESTILO_VIDA: "Eye",
};

// ============================================================
// 33. Alert Severity — Labels, Colors, Icons
// ============================================================

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  CRITICA: "Critica",
  ALTA: "Alta",
  MEDIA: "Media",
  BAIXA: "Baixa",
  INFO: "Informativa",
};

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700",
  ALTA: "bg-orange-100 text-orange-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAIXA: "bg-blue-100 text-blue-700",
  INFO: "bg-gray-100 text-gray-600",
};

export const ALERT_SEVERITY_HEX: Record<string, string> = {
  CRITICA: "#EF4444",
  ALTA: "#F97316",
  MEDIA: "#F59E0B",
  BAIXA: "#3B82F6",
  INFO: "#6B7280",
};

export const ALERT_SEVERITY_ICONS: Record<string, string> = {
  CRITICA: "AlertOctagon",
  ALTA: "AlertTriangle",
  MEDIA: "AlertCircle",
  BAIXA: "Info",
  INFO: "HelpCircle",
};

// ============================================================
// 34. Event Type (Timeline) — Labels, Colors, Icons
// ============================================================

export const EVENT_TYPE_LABELS: Record<string, string> = {
  NOTA: "Nota",
  REUNIAO: "Reuniao",
  TELEFONEMA: "Telefonema",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  DESPACHO: "Despacho",
  DECISAO: "Decisao",
  SENTENCA: "Sentenca",
  PETICAO: "Peticao",
  AUDIENCIA: "Audiencia",
  DILIGENCIA: "Diligencia",
  PUBLICACAO: "Publicacao",
  ALERTA_IA: "Alerta IA",
  MUDANCA_FASE: "Mudanca de Fase",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  NOTA: "#6B7280",
  REUNIAO: "#3B82F6",
  TELEFONEMA: "#06B6D4",
  EMAIL: "#8B5CF6",
  WHATSAPP: "#22C55E",
  DESPACHO: "#F59E0B",
  DECISAO: "#DC2626",
  SENTENCA: "#EF4444",
  PETICAO: "#6366F1",
  AUDIENCIA: "#7C3AED",
  DILIGENCIA: "#F97316",
  PUBLICACAO: "#14B8A6",
  ALERTA_IA: "#0EA5E9",
  MUDANCA_FASE: "#8B5CF6",
};

export const EVENT_TYPE_BG_COLORS: Record<string, string> = {
  NOTA: "bg-gray-100 text-gray-600",
  REUNIAO: "bg-blue-100 text-blue-700",
  TELEFONEMA: "bg-cyan-100 text-cyan-700",
  EMAIL: "bg-violet-100 text-violet-700",
  WHATSAPP: "bg-green-100 text-green-700",
  DESPACHO: "bg-amber-100 text-amber-700",
  DECISAO: "bg-red-100 text-red-700",
  SENTENCA: "bg-red-200 text-red-800",
  PETICAO: "bg-indigo-100 text-indigo-700",
  AUDIENCIA: "bg-purple-100 text-purple-700",
  DILIGENCIA: "bg-orange-100 text-orange-700",
  PUBLICACAO: "bg-teal-100 text-teal-700",
  ALERTA_IA: "bg-sky-100 text-sky-700",
  MUDANCA_FASE: "bg-violet-100 text-violet-800",
};

export const EVENT_TYPE_ICONS: Record<string, string> = {
  NOTA: "StickyNote",
  REUNIAO: "Users",
  TELEFONEMA: "Phone",
  EMAIL: "Mail",
  WHATSAPP: "MessageCircle",
  DESPACHO: "FileText",
  DECISAO: "Gavel",
  SENTENCA: "Scale",
  PETICAO: "FileEdit",
  AUDIENCIA: "Mic",
  DILIGENCIA: "ClipboardCheck",
  PUBLICACAO: "Newspaper",
  ALERTA_IA: "Bot",
  MUDANCA_FASE: "ArrowRight",
};

// ============================================================
// 35. Prescricao Risk Level — Labels, Colors
// ============================================================

export const PRESCRICAO_RISK_LABELS: Record<string, string> = {
  IMINENTE: "Iminente (< 90 dias)",
  PROXIMO: "Proximo (90-365 dias)",
  DISTANTE: "Distante (> 365 dias)",
  PRESCRITO: "Prescrito",
};

export const PRESCRICAO_RISK_COLORS: Record<string, string> = {
  IMINENTE: "bg-red-100 text-red-700",
  PROXIMO: "bg-orange-100 text-orange-700",
  DISTANTE: "bg-green-100 text-green-700",
  PRESCRITO: "bg-gray-200 text-gray-500",
};

export const PRESCRICAO_RISK_HEX: Record<string, string> = {
  IMINENTE: "#EF4444",
  PROXIMO: "#F97316",
  DISTANTE: "#22C55E",
  PRESCRITO: "#6B7280",
};

// ============================================================
// 36. Insolvencia Risk Level — Labels, Colors
// ============================================================

export const INSOLVENCIA_RISK_LABELS: Record<string, string> = {
  BAIXO: "Risco Baixo",
  MEDIO: "Risco Medio",
  ALTO: "Risco Alto",
  INSOLVENTE: "Insolvente",
};

export const INSOLVENCIA_RISK_COLORS: Record<string, string> = {
  BAIXO: "bg-green-100 text-green-700",
  MEDIO: "bg-yellow-100 text-yellow-700",
  ALTO: "bg-orange-100 text-orange-700",
  INSOLVENTE: "bg-red-100 text-red-700",
};

export const INSOLVENCIA_RISK_HEX: Record<string, string> = {
  BAIXO: "#22C55E",
  MEDIO: "#EAB308",
  ALTO: "#F97316",
  INSOLVENTE: "#EF4444",
};

// ============================================================
// 37. Penhorability Rules (Art. 833 CPC + Lei 8.009/90)
// ============================================================

export interface PenhorabilityRule {
  tipo: string;
  penhoravel: boolean;
  artigo: string;
  regra: string;
  excecoes: string[];
}

export const PENHORABILITY_RULES: PenhorabilityRule[] = [
  {
    tipo: "Salario, vencimentos, subsidios, soldos e remuneracoes",
    penhoravel: false,
    artigo: "Art. 833, IV, CPC",
    regra:
      "Sao absolutamente impenhora veis os vencimentos, subsidios, soldos, salarios, " +
      "remuneracoes, proventos de aposentadoria, pensoes, peculios e montepios, " +
      "bem como as quantias recebidas por liberalidade de terceiro e destinadas ao " +
      "sustento do devedor e de sua familia, os ganhos de trabalhador autonomo e os " +
      "honorarios de profissional liberal.",
    excecoes: [
      "Penhora para pagamento de prestacao alimenticia (art. 833, par. 2o CPC)",
      "Excesso de 50 salarios minimos (entendimento jurisprudencial)",
      "Importancias que excedam o necessario para a subsistencia do devedor e familia",
    ],
  },
  {
    tipo: "Depositos em caderneta de poupanca ate 40 salarios minimos",
    penhoravel: false,
    artigo: "Art. 833, X, CPC",
    regra:
      "E impenhoravel a quantia depositada em caderneta de poupanca, ate o limite " +
      "de 40 (quarenta) salarios-minimos. A protecao aplica-se a uma unica conta " +
      "de poupanca por devedor.",
    excecoes: [
      "Valores acima de 40 salarios minimos sao penhora veis",
      "Penhora para pagamento de prestacao alimenticia",
      "Extensao jurisprudencial a outras aplicacoes financeiras de carater alimentar " +
      "(STJ, REsp 1.230.060/PR)",
    ],
  },
  {
    tipo: "Bem de familia (imovel residencial)",
    penhoravel: false,
    artigo: "Lei 8.009/90, art. 1o",
    regra:
      "O imovel residencial proprio do casal ou da entidade familiar e impenhoravel e " +
      "nao respondera por qualquer tipo de divida civil, comercial, fiscal, " +
      "previdenciaria ou de outra natureza, contraida pelos conjuges ou pelos pais ou " +
      "filhos que sejam seus proprietarios e nele residam.",
    excecoes: [
      "Credito de trabalhadores da propria residencia (art. 3o, I)",
      "Credito de financiamento para construcao ou aquisicao do imovel (art. 3o, II)",
      "Credito de pensao alimenticia (art. 3o, III)",
      "Cobranca de impostos e taxas sobre o proprio imovel (IPTU) (art. 3o, IV)",
      "Execucao de hipoteca sobre o imovel (art. 3o, V)",
      "Aquisicao criminosa do bem (art. 3o, VI)",
      "Fianca em contrato de locacao (art. 3o, VII)",
    ],
  },
  {
    tipo: "Ferramentas de trabalho, livros, utensilios e equipamentos profissionais",
    penhoravel: false,
    artigo: "Art. 833, V, CPC",
    regra:
      "Sao impenhora veis os livros, as maquinas, as ferramentas, os utensilios, " +
      "os instrumentos ou outros bens moveis necessarios ou uteis ao exercicio de " +
      "qualquer profissao.",
    excecoes: [
      "Bens de valor elevado que excedam o necessario para a atividade profissional",
      "Possibilidade de substituicao por bem de menor valor que atenda a mesma finalidade",
      "Nao se aplica a bens de empresa (Sumula 451 STJ — em caso de penhora de faturamento)",
    ],
  },
  {
    tipo: "Seguro de vida",
    penhoravel: false,
    artigo: "Art. 833, VI, CPC",
    regra:
      "E impenhoravel o seguro de vida. A protecao abrange o capital segurado e as " +
      "indenizacoes decorrentes de seguro de vida.",
    excecoes: [
      "Premios pagos com fraude a credores podem ser alcancados via acao pauliana",
      "VGBL quando comprovado carater de investimento (e nao previdenciario)",
    ],
  },
  {
    tipo: "Materiais necessarios para obra em andamento",
    penhoravel: false,
    artigo: "Art. 833, VII, CPC",
    regra:
      "Sao impenhora veis os materiais necessarios para obras em andamento, salvo " +
      "se essas forem penhoradas.",
    excecoes: [
      "Se a propria obra for penhorada, os materiais seguem a penhora",
      "Materiais em excesso que nao sejam necessarios para a obra",
    ],
  },
  {
    tipo: "Pequena propriedade rural (modulo rural)",
    penhoravel: false,
    artigo: "Art. 833, VIII, CPC c/c Art. 5o, XXVI, CF",
    regra:
      "A pequena propriedade rural, assim definida em lei, desde que trabalhada pela " +
      "familia, e impenhoravel para pagamento de debitos decorrentes de sua atividade " +
      "produtiva. Protecao constitucional (art. 5o, XXVI, CF).",
    excecoes: [
      "Dividas contraidas para aquisicao da propria propriedade",
      "Debitos oriundos da atividade produtiva da propriedade",
      "Propriedade que exceda o modulo rural definido pelo INCRA",
      "Debitos trabalhistas de empregados rurais da propriedade",
    ],
  },
  {
    tipo: "Recursos publicos recebidos por instituicoes privadas para aplicacao compulsoria",
    penhoravel: false,
    artigo: "Art. 833, IX, CPC",
    regra:
      "Os recursos publicos recebidos por instituicoes privadas para aplicacao " +
      "compulsoria em educacao, saude ou assistencia social sao impenhora veis.",
    excecoes: [
      "Valores que nao estejam vinculados a destinacao especifica",
      "Recursos ja desvinculados de sua finalidade publica",
    ],
  },
  {
    tipo: "Provisoes de alimentos e moveis que guarnecem a residencia",
    penhoravel: false,
    artigo: "Art. 833, II, CPC",
    regra:
      "Sao impenhora veis os moveis, os pertences e as utilidades domesticas que " +
      "guarnecem a residencia do executado, salvo os de elevado valor ou os que " +
      "ultrapassem as necessidades comuns correspondentes a um medio padrao de vida.",
    excecoes: [
      "Bens de elevado valor (obras de arte, joias, eletrodomesticos sofisticados)",
      "Bens em quantidade superior ao necessario para o padrao medio de vida",
    ],
  },
];

// ============================================================
// 38. Phase Suggested Questions (AI Assistant)
// ============================================================

export const PHASE_SUGGESTED_QUESTIONS: Record<string, string[]> = {
  INVESTIGACAO: [
    "Quais sistemas devo consultar para localizar bens deste devedor?",
    "O devedor pode estar ocultando bens por meio de interpostas pessoas?",
    "Devo incluir socios e familiares na investigacao patrimonial?",
    "Qual o prazo estimado para concluir a investigacao?",
  ],
  PRE_JUDICIAL: [
    "Protesto ou negativacao primeiro — qual a melhor estrategia?",
    "Quanto tempo devo esperar antes de judicializar?",
    "A notificacao extrajudicial e obrigatoria neste caso?",
    "Devo tentar mediacao antes de ingressar com a acao?",
  ],
  EXECUCAO: [
    "Qual o prazo para citacao neste tipo de execucao?",
    "Devo pedir tutela de urgencia para bloqueio de bens?",
    "Penhora online simultanea a citacao e recomendada?",
    "Ha risco de excecao de pre-executividade neste caso?",
  ],
  PENHORA: [
    "Este bem e penhoravel considerando as regras do art. 833 CPC?",
    "Como contestar a alegacao de bem de familia?",
    "Ha excesso de penhora — devo reduzir?",
    "Substituicao de penhora — devo aceitar a proposta do devedor?",
  ],
  EXPROPRIACAO: [
    "Adjudicacao ou leilao — qual a melhor opcao para este bem?",
    "Qual o valor minimo aceitavel no leilao?",
    "A alienacao particular e viavel neste caso?",
    "Como calcular o valor liquido a ser entregue ao credor?",
  ],
  ACORDO: [
    "O desconto proposto pelo devedor e razoavel para este tipo de credito?",
    "Parcelamento pelo art. 916 CPC — devo aceitar?",
    "Quais garantias adicionais exigir no acordo?",
    "Qual clausula penal adequada para descumprimento?",
  ],
  ENCERRADO: [
    "Existe possibilidade de reabrir a execucao?",
    "Qual o prazo para cobrar saldo remanescente?",
    "A cessao de credito a terceiro e viavel neste caso?",
    "Relatorio final ao cliente — o que incluir?",
  ],
};

// ============================================================
// 39. Helper Functions
// ============================================================

/**
 * Formats a number value to BRL currency string.
 * Example: 1234567.89 => "R$ 1.234.567,89"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Formats a number value to compact BRL currency string.
 * Examples: 42000000 => "R$ 42M", 5200000 => "R$ 5,2M", 850000 => "R$ 850K", 1500 => "R$ 1.500,00"
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "R$ 0";
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000) {
    const billions = absValue / 1_000_000_000;
    return `${sign}R$ ${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1).replace(".", ",")}B`;
  }
  if (absValue >= 1_000_000) {
    const millions = absValue / 1_000_000;
    return `${sign}R$ ${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(".", ",")}M`;
  }
  if (absValue >= 1_000) {
    const thousands = absValue / 1_000;
    return `${sign}R$ ${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1).replace(".", ",")}K`;
  }
  return formatCurrency(value);
}

/**
 * Returns a hex color based on the recovery score (0-100).
 * Green for > 70, amber for 40-69, red for < 40.
 */
export function getScoreColor(score: number): string {
  if (score > 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

/**
 * Returns a label based on the recovery score (0-100).
 */
export function getScoreLabel(score: number): string {
  if (score > 70) return "Alto";
  if (score >= 40) return "Medio";
  return "Baixo";
}

/**
 * Returns a Tailwind bg color class based on the recovery score.
 */
export function getScoreBgColor(score: number): string {
  if (score > 70) return "bg-green-100 text-green-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

/**
 * Calculates the number of days until prescription and returns risk assessment.
 * If date is null, returns a default "no date" response.
 */
export function calculatePrescriptionDays(
  date: Date | null,
): { days: number; risk: string; color: string } {
  if (!date) {
    return { days: 0, risk: "PRESCRITO", color: "#6B7280" };
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return { days, risk: "PRESCRITO", color: PRESCRICAO_RISK_HEX.PRESCRITO };
  }
  if (days <= 90) {
    return { days, risk: "IMINENTE", color: PRESCRICAO_RISK_HEX.IMINENTE };
  }
  if (days <= 365) {
    return { days, risk: "PROXIMO", color: PRESCRICAO_RISK_HEX.PROXIMO };
  }
  return { days, risk: "DISTANTE", color: PRESCRICAO_RISK_HEX.DISTANTE };
}

/**
 * Calculates recovery percentage: (recovered / total) * 100.
 * Returns 0 if total is zero or negative. Caps at 100.
 */
export function calculateRecoveryPercentage(recovered: number, total: number): number {
  if (total <= 0 || recovered < 0) return 0;
  const pct = (recovered / total) * 100;
  return parseFloat(Math.min(pct, 100).toFixed(2));
}

/**
 * Generates a recovery case code in the format REC-YYYY-NNN.
 * Example: generateRecoveryCode(42) => "REC-2026-042"
 * If no sequential number is provided, uses a timestamp-based fallback.
 */
export function generateRecoveryCode(sequentialNumber?: number): string {
  const year = new Date().getFullYear();
  if (sequentialNumber != null) {
    const seq = String(sequentialNumber).padStart(3, "0");
    return `REC-${year}-${seq}`;
  }
  const ts = Date.now().toString().slice(-4);
  return `REC-${year}-${ts}`;
}

/**
 * Generates an investigation code in the format INV-YYYY-NNN.
 * Example: generateInvestigationCode(7) => "INV-2026-007"
 * If no sequential number is provided, uses a timestamp-based fallback.
 */
export function generateInvestigationCode(sequentialNumber?: number): string {
  const year = new Date().getFullYear();
  if (sequentialNumber != null) {
    const seq = String(sequentialNumber).padStart(3, "0");
    return `INV-${year}-${seq}`;
  }
  const ts = Date.now().toString().slice(-4);
  return `INV-${year}-${ts}`;
}

/**
 * Formats BigInt centavos to BRL currency string (same pattern as strat-neg-constants).
 * Example: 123456789n => "R$ 1.234.567,89"
 */
export function formatBigIntBRL(val: bigint | number | string | null): string {
  if (val == null) return "R$ 0,00";
  let centavos: number;
  if (typeof val === "bigint") {
    centavos = Number(val);
  } else if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    centavos = isNaN(parsed) ? 0 : parsed;
  } else {
    centavos = val;
  }
  if (isNaN(centavos)) return "R$ 0,00";
  const reais = centavos / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Converts centavos (BigInt, number or string) to a float value in reais.
 * Example: 123456n => 1234.56
 */
export function toReaisBigInt(centavos: bigint | number | string | null): number {
  if (centavos == null) return 0;
  if (typeof centavos === "bigint") return Number(centavos) / 100;
  if (typeof centavos === "string") {
    const parsed = parseInt(centavos, 10);
    return isNaN(parsed) ? 0 : parsed / 100;
  }
  return centavos / 100;
}

/**
 * Converts a reais value (float) to BigInt centavos.
 * Example: 1234.56 => 123456n
 */
export function toBigIntCentavos(reais: number): bigint {
  return BigInt(Math.round(reais * 100));
}

/**
 * Format a value to abbreviated BRL for compact display (BigInt centavos version).
 * Example: 4200000000n (centavos) => "R$ 42M"
 */
export function formatBigIntBRLCompact(value: bigint | number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0";
  const numValue = typeof value === "bigint" ? Number(value) / 100 : Number(value);

  if (numValue >= 1_000_000_000) {
    const billions = numValue / 1_000_000_000;
    return `R$ ${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1).replace(".", ",")}B`;
  }
  if (numValue >= 1_000_000) {
    const millions = numValue / 1_000_000;
    return `R$ ${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(".", ",")}M`;
  }
  if (numValue >= 1_000) {
    const thousands = numValue / 1_000;
    return `R$ ${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1).replace(".", ",")}K`;
  }
  return formatBigIntBRL(value);
}

/**
 * Formats a date to short Brazilian format (DD/MM).
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Formats a date to full Brazilian format (DD/MM/YYYY).
 */
export function formatDateFull(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Calculates the number of days from now to a given date.
 * Returns positive for future dates, negative for past dates.
 */
export function daysFromNow(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the number of days since a given date.
 * Returns positive for past dates, negative for future dates.
 */
export function daysSince(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
