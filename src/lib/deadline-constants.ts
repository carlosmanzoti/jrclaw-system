// Deadline & Judicial Calendar Module — Constants, types, labels, colors, and helpers.
// Covers: deadline types, statuses, priorities, counting modes, trigger events,
// special counting rules, jurisdictions, notification scheduling, and urgency levels.
// Adapted for Brazilian procedural law (CPC/2015, Lei 11.101/2005, CLT, CTN).

// ============================================================
// 1. Deadline Types
// ============================================================

export const DEADLINE_TYPES = [
  "FATAL",           // Prazo fatal (recurso, contestacao, etc.)
  "ORDINARIO",       // Prazo ordinario
  "DILIGENCIA",      // Diligencia
  "AUDIENCIA",       // Audiencia
  "ASSEMBLEIA",      // Assembleia (RJ)
  "PERICIAL",        // Prazo pericial (manifestacao sobre laudo, quesitos)
  "ADMINISTRATIVO",  // Prazo administrativo (tribunal, cartorio)
  "CONTRATUAL",      // Prazo contratual (vencimento, renovacao)
  "PRESCRICIONAL",   // Prazo prescricional/decadencial
  "INTIMACAO",       // Prazo a partir de intimacao
] as const;

export type DeadlineType = (typeof DEADLINE_TYPES)[number];

// ============================================================
// 2. Deadline Statuses
// ============================================================

export const DEADLINE_STATUSES = [
  "PENDENTE",
  "CUMPRIDO",
  "CUMPRIDO_ANTECIPADO", // Cumprido antes do prazo
  "PERDIDO",
  "CANCELADO",
  "SUSPENSO",            // Prazo suspenso (recesso, greve, etc.)
  "SOBRESTADO",          // Prazo sobrestado por decisao judicial
  "PRORROGADO",          // Prazo prorrogado
] as const;

export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

// ============================================================
// 3. Deadline Priorities
// ============================================================

export const DEADLINE_PRIORITIES = [
  "CRITICA",
  "ALTA",
  "MEDIA",
  "BAIXA",
] as const;

export type DeadlinePriority = (typeof DEADLINE_PRIORITIES)[number];

// ============================================================
// 4. Counting Modes
// ============================================================

export const COUNTING_MODES = [
  "DIAS_UTEIS",     // CPC Art. 219 — dias uteis (padrao)
  "DIAS_CORRIDOS",  // Lei 11.101 — RJ, falencia
  "HORAS",          // Prazos em horas (habeas corpus, etc.)
  "MINUTOS",        // Prazos em minutos (sustentacao oral)
] as const;

export type CountingMode = (typeof COUNTING_MODES)[number];

// ============================================================
// 5. Trigger Events (marco inicial do prazo — CPC Art. 231)
// ============================================================

export const TRIGGER_EVENTS = [
  "INTIMACAO_PESSOAL",
  "INTIMACAO_ADVOGADO",
  "INTIMACAO_DIARIO_OFICIAL",
  "INTIMACAO_ELETRONICA",
  "CITACAO",
  "JUNTADA_AR",
  "JUNTADA_MANDADO",
  "PUBLICACAO_DIARIO",
  "PUBLICACAO_EDITAL",
  "AUDIENCIA",
  "DECISAO",
  "SENTENCA",
  "ACORDAO",
  "DISPONIBILIZACAO_SISTEMA",
  "CARGA_AUTOS",
  "VISTA_AUTOS",
  "ATO_VOLUNTARIO",
  "DATA_FIXA",
] as const;

export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

// ============================================================
// 6. Special Rules (regras especiais de contagem)
// ============================================================

export const SPECIAL_RULES = [
  "DOBRA_FAZENDA",                     // Art. 183 CPC — Fazenda Publica: prazo em dobro
  "DOBRA_MP",                          // Art. 180 CPC — Ministerio Publico: prazo em dobro
  "DOBRA_DEFENSORIA",                  // Art. 186 CPC — Defensoria Publica: prazo em dobro
  "DOBRA_LITISCONSORCIO",              // Art. 229 CPC — Litisconsortes com advogados diferentes
  "INTERRUPCAO_EMBARGOS",              // Art. 1.026 CPC — Embargos de declaracao interrompem prazo
  "SUSPENSAO_RECESSO",                 // Art. 220 CPC — Recesso forense (20/dez a 20/jan)
  "SUSPENSAO_TRIBUNAL",                // Suspensao por ato do tribunal
  "INDISPONIBILIDADE_SISTEMA",         // CNJ Res. 185 — indisponibilidade do PJe
  "PROTOCOLO_ELETRONICO_PRORROGACAO",  // Art. 213 CPC — prorrogacao protocolo eletronico
  "DIAS_CORRIDOS_RJ",                  // Lei 11.101 — prazos em dias corridos
  "RECESSO_STF_STJ",                   // Recesso de julho (STF, STJ, TST)
  "GREVE_SERVIDORES",                  // Suspensao por greve
] as const;

export type SpecialRule = (typeof SPECIAL_RULES)[number];

// ============================================================
// 7. Jurisdictions / Courts
// ============================================================

export const JURISDICTIONS = [
  "ESTADUAL",
  "FEDERAL",
  "TRABALHISTA",
  "ELEITORAL",
  "MILITAR",
  "STF",
  "STJ",
  "TST",
  "TSE",
  "STM",
] as const;

export type Jurisdiction = (typeof JURISDICTIONS)[number];

// ============================================================
// 8. Notification Levels
// ============================================================

export const NOTIFICATION_LEVELS = [
  "D_MINUS_7",  // 7 dias antes
  "D_MINUS_3",  // 3 dias antes
  "D_MINUS_1",  // 1 dia antes
  "D_0",        // No dia
  "D_PLUS_1",   // 1 dia depois (escalacao)
] as const;

export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

// ============================================================
// 9. Notification Channels
// ============================================================

export const NOTIFICATION_CHANNELS = [
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PUSH",
  "SISTEMA",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// ============================================================
// 10. Catalog Categories
// ============================================================

export const CATALOG_CATEGORIES = [
  "CPC_GERAL",
  "CPC_RECURSOS",
  "CPC_EXECUCAO",
  "LEI_11101",    // Recuperacao Judicial
  "LEI_8078",     // Codigo do Consumidor
  "CLT",          // Trabalhista
  "CTN",          // Codigo Tributario
  "LEI_ESPECIAL",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

// ============================================================
// 11. Label Maps (Portuguese — pt-BR)
// ============================================================

export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  FATAL: "Prazo Fatal",
  ORDINARIO: "Prazo Ordinário",
  DILIGENCIA: "Diligência",
  AUDIENCIA: "Audiência",
  ASSEMBLEIA: "Assembleia",
  PERICIAL: "Prazo Pericial",
  ADMINISTRATIVO: "Prazo Administrativo",
  CONTRATUAL: "Prazo Contratual",
  PRESCRICIONAL: "Prazo Prescricional",
  INTIMACAO: "Intimação",
};

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  PENDENTE: "Pendente",
  CUMPRIDO: "Cumprido",
  CUMPRIDO_ANTECIPADO: "Cumprido Antecipado",
  PERDIDO: "Perdido",
  CANCELADO: "Cancelado",
  SUSPENSO: "Suspenso",
  SOBRESTADO: "Sobrestado",
  PRORROGADO: "Prorrogado",
};

export const DEADLINE_PRIORITY_LABELS: Record<DeadlinePriority, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const COUNTING_MODE_LABELS: Record<CountingMode, string> = {
  DIAS_UTEIS: "Dias Úteis (CPC Art. 219)",
  DIAS_CORRIDOS: "Dias Corridos",
  HORAS: "Horas",
  MINUTOS: "Minutos",
};

export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  INTIMACAO_PESSOAL: "Intimação Pessoal",
  INTIMACAO_ADVOGADO: "Intimação do Advogado",
  INTIMACAO_DIARIO_OFICIAL: "Intimação via Diário Oficial",
  INTIMACAO_ELETRONICA: "Intimação Eletrônica",
  CITACAO: "Citação",
  JUNTADA_AR: "Juntada do AR",
  JUNTADA_MANDADO: "Juntada do Mandado",
  PUBLICACAO_DIARIO: "Publicação no Diário",
  PUBLICACAO_EDITAL: "Publicação por Edital",
  AUDIENCIA: "Audiência",
  DECISAO: "Decisão",
  SENTENCA: "Sentença",
  ACORDAO: "Acórdão",
  DISPONIBILIZACAO_SISTEMA: "Disponibilização no Sistema",
  CARGA_AUTOS: "Carga dos Autos",
  VISTA_AUTOS: "Vista dos Autos",
  ATO_VOLUNTARIO: "Ato Voluntário",
  DATA_FIXA: "Data Fixa",
};

export const SPECIAL_RULE_LABELS: Record<SpecialRule, string> = {
  DOBRA_FAZENDA: "Prazo em Dobro — Fazenda Pública (Art. 183 CPC)",
  DOBRA_MP: "Prazo em Dobro — Ministério Público (Art. 180 CPC)",
  DOBRA_DEFENSORIA: "Prazo em Dobro — Defensoria Pública (Art. 186 CPC)",
  DOBRA_LITISCONSORCIO: "Prazo em Dobro — Litisconsórcio (Art. 229 CPC)",
  INTERRUPCAO_EMBARGOS: "Interrupção — Embargos de Declaração (Art. 1.026 CPC)",
  SUSPENSAO_RECESSO: "Suspensão — Recesso Forense (Art. 220 CPC)",
  SUSPENSAO_TRIBUNAL: "Suspensão por Ato do Tribunal",
  INDISPONIBILIDADE_SISTEMA: "Indisponibilidade do Sistema (CNJ Res. 185)",
  PROTOCOLO_ELETRONICO_PRORROGACAO: "Prorrogação — Protocolo Eletrônico (Art. 213 CPC)",
  DIAS_CORRIDOS_RJ: "Dias Corridos — Recuperação Judicial (Lei 11.101)",
  RECESSO_STF_STJ: "Recesso de Julho (STF/STJ/TST)",
  GREVE_SERVIDORES: "Suspensão por Greve de Servidores",
};

export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  ESTADUAL: "Justiça Estadual",
  FEDERAL: "Justiça Federal",
  TRABALHISTA: "Justiça do Trabalho",
  ELEITORAL: "Justiça Eleitoral",
  MILITAR: "Justiça Militar",
  STF: "Supremo Tribunal Federal",
  STJ: "Superior Tribunal de Justiça",
  TST: "Tribunal Superior do Trabalho",
  TSE: "Tribunal Superior Eleitoral",
  STM: "Superior Tribunal Militar",
};

export const NOTIFICATION_LEVEL_LABELS: Record<NotificationLevel, string> = {
  D_MINUS_7: "7 dias antes",
  D_MINUS_3: "3 dias antes",
  D_MINUS_1: "1 dia antes",
  D_0: "No dia",
  D_PLUS_1: "1 dia depois (escalação)",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: "E-mail",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  PUSH: "Notificação Push",
  SISTEMA: "Sistema",
};

export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  CPC_GERAL: "CPC — Geral",
  CPC_RECURSOS: "CPC — Recursos",
  CPC_EXECUCAO: "CPC — Execução",
  LEI_11101: "Lei 11.101 — Recuperação Judicial",
  LEI_8078: "Lei 8.078 — Código do Consumidor",
  CLT: "CLT — Trabalhista",
  CTN: "CTN — Código Tributário Nacional",
  LEI_ESPECIAL: "Legislação Especial",
};

// ============================================================
// 12. Colors for UI (Tailwind CSS classes)
// ============================================================

export const DEADLINE_STATUS_COLORS: Record<DeadlineStatus, { bg: string; text: string; badge: string }> = {
  PENDENTE: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  CUMPRIDO: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  CUMPRIDO_ANTECIPADO: {
    bg: "bg-green-50",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800 border-green-200",
  },
  PERDIDO: {
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  CANCELADO: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
  },
  SUSPENSO: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SOBRESTADO: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
  PRORROGADO: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
};

export const DEADLINE_PRIORITY_COLORS: Record<DeadlinePriority, { bg: string; text: string; badge: string }> = {
  CRITICA: {
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  ALTA: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  MEDIA: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  BAIXA: {
    bg: "bg-green-50",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800 border-green-200",
  },
};

export const DEADLINE_TYPE_COLORS: Record<DeadlineType, string> = {
  FATAL: "text-red-600",
  ORDINARIO: "text-blue-600",
  DILIGENCIA: "text-purple-600",
  AUDIENCIA: "text-amber-600",
  ASSEMBLEIA: "text-emerald-600",
  PERICIAL: "text-teal-600",
  ADMINISTRATIVO: "text-gray-600",
  CONTRATUAL: "text-indigo-600",
  PRESCRICIONAL: "text-rose-600",
  INTIMACAO: "text-cyan-600",
};

// ============================================================
// 13. Urgency Helpers
// ============================================================

export type UrgencyLevel = "VENCIDO" | "HOJE" | "CRITICO" | "ATENCAO" | "NORMAL" | "TRANQUILO";

/**
 * Determines the urgency level based on the number of calendar days
 * remaining until the deadline date.
 *
 * - VENCIDO:   past due (negative days)
 * - HOJE:      due today
 * - CRITICO:   1-2 days remaining
 * - ATENCAO:   3-5 days remaining
 * - NORMAL:    6-15 days remaining
 * - TRANQUILO: more than 15 days remaining
 */
export function getUrgencyLevel(dataLimite: Date): UrgencyLevel {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dataLimite);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "VENCIDO";
  if (diffDays === 0) return "HOJE";
  if (diffDays <= 2) return "CRITICO";
  if (diffDays <= 5) return "ATENCAO";
  if (diffDays <= 15) return "NORMAL";
  return "TRANQUILO";
}

export const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string; border: string }> = {
  VENCIDO: { bg: "bg-red-600", text: "text-white", border: "border-red-700" },
  HOJE: { bg: "bg-red-500", text: "text-white", border: "border-red-600" },
  CRITICO: { bg: "bg-orange-500", text: "text-white", border: "border-orange-600" },
  ATENCAO: { bg: "bg-amber-400", text: "text-amber-900", border: "border-amber-500" },
  NORMAL: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  TRANQUILO: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  VENCIDO: "Vencido",
  HOJE: "Vence hoje",
  CRITICO: "Crítico",
  ATENCAO: "Atenção",
  NORMAL: "Normal",
  TRANQUILO: "Tranquilo",
};

// ============================================================
// 14. Default Notification Schedule
// ============================================================

export const DEFAULT_NOTIFICATION_SCHEDULE = [
  {
    level: "D_MINUS_7" as NotificationLevel,
    channels: ["EMAIL", "SISTEMA"] as NotificationChannel[],
    label: "7 dias antes",
  },
  {
    level: "D_MINUS_3" as NotificationLevel,
    channels: ["EMAIL", "SISTEMA", "WHATSAPP"] as NotificationChannel[],
    label: "3 dias antes",
  },
  {
    level: "D_MINUS_1" as NotificationLevel,
    channels: ["EMAIL", "SMS", "WHATSAPP", "PUSH", "SISTEMA"] as NotificationChannel[],
    label: "1 dia antes",
  },
  {
    level: "D_0" as NotificationLevel,
    channels: ["SMS", "PUSH", "SISTEMA"] as NotificationChannel[],
    label: "No dia",
  },
  {
    level: "D_PLUS_1" as NotificationLevel,
    channels: ["EMAIL", "SMS", "WHATSAPP", "PUSH", "SISTEMA"] as NotificationChannel[],
    label: "1 dia depois (escalação)",
  },
] as const;

// ============================================================
// 15. Select Options Helpers
// ============================================================

/** Builds an array of { value, label } for use in <Select> components. */
function buildOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return values.map((v) => ({ value: v, label: labels[v] }));
}

export const DEADLINE_TYPE_OPTIONS = buildOptions(DEADLINE_TYPES, DEADLINE_TYPE_LABELS);
export const DEADLINE_STATUS_OPTIONS = buildOptions(DEADLINE_STATUSES, DEADLINE_STATUS_LABELS);
export const DEADLINE_PRIORITY_OPTIONS = buildOptions(DEADLINE_PRIORITIES, DEADLINE_PRIORITY_LABELS);
export const COUNTING_MODE_OPTIONS = buildOptions(COUNTING_MODES, COUNTING_MODE_LABELS);
export const TRIGGER_EVENT_OPTIONS = buildOptions(TRIGGER_EVENTS, TRIGGER_EVENT_LABELS);
export const SPECIAL_RULE_OPTIONS = buildOptions(SPECIAL_RULES, SPECIAL_RULE_LABELS);
export const JURISDICTION_OPTIONS = buildOptions(JURISDICTIONS, JURISDICTION_LABELS);
export const NOTIFICATION_CHANNEL_OPTIONS = buildOptions(NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_LABELS);
export const CATALOG_CATEGORY_OPTIONS = buildOptions(CATALOG_CATEGORIES, CATALOG_CATEGORY_LABELS);
