// CRJ — Negotiation constants for UI

export const CRJ_STATUS_LABELS: Record<string, string> = {
  MAPEAMENTO: "Mapeamento",
  CONTATO_INICIAL: "Contato Inicial",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  CONTRAPROPOSTA: "Contraproposta",
  MEDIACAO: "Mediação",
  ACORDO_VERBAL: "Acordo Verbal",
  FORMALIZACAO: "Formalização",
  HOMOLOGACAO: "Homologação",
  CONCLUIDA: "Concluída",
  SUSPENSA: "Suspensa",
  CANCELADA: "Cancelada",
};

export const CRJ_STATUS_COLORS: Record<string, string> = {
  MAPEAMENTO: "bg-gray-100 text-gray-700",
  CONTATO_INICIAL: "bg-blue-50 text-blue-700",
  PROPOSTA_ENVIADA: "bg-blue-100 text-blue-800",
  CONTRAPROPOSTA: "bg-orange-100 text-orange-800",
  MEDIACAO: "bg-purple-100 text-purple-800",
  ACORDO_VERBAL: "bg-emerald-50 text-emerald-700",
  FORMALIZACAO: "bg-green-100 text-green-800",
  HOMOLOGACAO: "bg-amber-100 text-amber-800",
  CONCLUIDA: "bg-green-200 text-green-900",
  SUSPENSA: "bg-gray-200 text-gray-600",
  CANCELADA: "bg-red-100 text-red-700",
};

export const CRJ_STATUS_ORDER = [
  "MAPEAMENTO",
  "CONTATO_INICIAL",
  "PROPOSTA_ENVIADA",
  "CONTRAPROPOSTA",
  "MEDIACAO",
  "ACORDO_VERBAL",
  "FORMALIZACAO",
  "HOMOLOGACAO",
  "CONCLUIDA",
];

export const CRJ_TYPE_LABELS: Record<string, string> = {
  ACORDO_SIMPLES: "Acordo Simples",
  CREDOR_PARCEIRO: "Credor Parceiro",
  CESSAO_CREDITOS: "Cessão de Créditos",
  SUBCLASSE_ESPECIAL: "Subclasse Especial",
  OUTRO: "Outro",
};

export const CRJ_TYPE_ICONS: Record<string, string> = {
  ACORDO_SIMPLES: "Handshake",
  CREDOR_PARCEIRO: "RefreshCw",
  CESSAO_CREDITOS: "Landmark",
  SUBCLASSE_ESPECIAL: "BarChart3",
  OUTRO: "Settings",
};

export const CRJ_PRIORITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const CRJ_PRIORITY_COLORS: Record<string, string> = {
  BAIXA: "bg-gray-100 text-gray-600",
  MEDIA: "bg-blue-50 text-blue-600",
  ALTA: "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700",
};

export const CRJ_EVENT_TYPE_LABELS: Record<string, string> = {
  CRIACAO: "Criação",
  MUDANCA_STATUS: "Mudança de Status",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  PROPOSTA_RECEBIDA: "Proposta Recebida",
  REUNIAO: "Reunião",
  LIGACAO: "Ligação",
  EMAIL_ENVIADO: "E-mail Enviado",
  EMAIL_RECEBIDO: "E-mail Recebido",
  DOCUMENTO_GERADO: "Documento Gerado",
  ACORDO: "Acordo",
  OBSERVACAO: "Observação",
  LEMBRETE: "Lembrete",
  CONTATO_CREDOR: "Contato com Credor",
};

export const CRJ_EVENT_TYPE_ICONS: Record<string, string> = {
  CRIACAO: "Plus",
  MUDANCA_STATUS: "RefreshCw",
  PROPOSTA_ENVIADA: "Send",
  PROPOSTA_RECEBIDA: "Inbox",
  REUNIAO: "Users",
  LIGACAO: "Phone",
  EMAIL_ENVIADO: "Mail",
  EMAIL_RECEBIDO: "MailOpen",
  DOCUMENTO_GERADO: "FileText",
  ACORDO: "CheckCircle",
  OBSERVACAO: "MessageSquare",
  LEMBRETE: "Bell",
  CONTATO_CREDOR: "UserCheck",
};

export const CRJ_ROUND_TYPE_LABELS: Record<string, string> = {
  PROPOSTA_INICIAL: "Proposta Inicial",
  CONTRAPROPOSTA_ESCRITORIO: "Contraproposta (Escritório)",
  CONTRAPROPOSTA_CREDOR: "Contraproposta (Credor)",
  REUNIAO: "Reunião",
  MEDIACAO: "Mediação",
  AJUSTE: "Ajuste",
  ACORDO_FINAL: "Acordo Final",
};

export const CRJ_ROUND_OUTCOME_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  ACEITA: "Aceita",
  REJEITADA: "Rejeitada",
  CONTRAPROPOSTA: "Contraproposta",
  ADIADA: "Adiada",
};

export const CRJ_ROUND_OUTCOME_COLORS: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  ACEITA: "bg-green-100 text-green-700",
  REJEITADA: "bg-red-100 text-red-700",
  CONTRAPROPOSTA: "bg-orange-100 text-orange-700",
  ADIADA: "bg-gray-100 text-gray-600",
};

export const CRJ_TEMPLATE_TYPE_LABELS: Record<string, string> = {
  ACORDO_SIMPLES: "Acordo Simples",
  CREDOR_PARCEIRO_ROTATIVO: "Credor Parceiro (Rotativo)",
  CESSAO_CREDITOS: "Cessão de Créditos",
  SUBCLASSE_MODALIDADES: "Subclasse com Modalidades",
  CUSTOMIZADO: "Customizado",
};

export const CRJ_PROPOSAL_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  APROVADA_INTERNA: "Aprovada Internamente",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  REJEITADA: "Rejeitada",
};

export const CRJ_INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  RENEGOCIADO: "Renegociado",
};

// Formatters
export function formatBRL(centavos: bigint | number | null | undefined): string {
  if (centavos == null) return "R$ 0,00";
  const value = typeof centavos === "bigint" ? Number(centavos) / 100 : Number(centavos) / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatBRLFromReais(reais: number | null | undefined): string {
  if (reais == null) return "R$ 0,00";
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "0%";
  return `${value.toFixed(1)}%`;
}

export function daysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
