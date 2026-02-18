/**
 * CRJ Template Engine — resolves placeholders and generates documents
 */

export interface CRJTemplateContext {
  // Negotiation
  negotiation_title: string;
  negotiation_type: string;
  negotiation_status: string;
  negotiation_start_date: string;
  negotiation_target_date: string;

  // Creditor
  creditor_name: string;
  creditor_cpf_cnpj: string;
  creditor_class: string;
  creditor_email: string;
  creditor_phone: string;
  creditor_city: string;
  creditor_state: string;

  // Financial
  credit_amount: string;
  credit_amount_extenso: string;
  proposed_amount: string;
  proposed_amount_extenso: string;
  agreed_amount: string;
  discount_percentage: string;
  installments: string;
  entry_payment: string;
  grace_period_months: string;
  payment_term_years: string;
  monetary_correction: string;

  // Rotating credit
  has_rotating_credit: string;
  rotating_credit_value: string;
  rotating_credit_cycles: string;

  // Insurance & assignment
  has_credit_insurance: string;
  insurer_name: string;
  has_assignment: string;
  assignment_partner: string;
  assignment_percentage: string;

  // Process
  process_number: string;
  court: string;
  jurisdiction: string;
  state: string;
  client_name: string;

  // Dates
  current_date: string;
  current_date_extenso: string;

  // Responsible
  assignee_name: string;
  assignee_oab: string;
}

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDatePT(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

function formatDateExtenso(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_PT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

function formatBRLValue(centavos: number | bigint | null | undefined): string {
  if (centavos == null) return "—";
  const reais = Number(centavos) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Simple Portuguese number-to-words for common cases
function numberToWords(value: number): string {
  if (value === 0) return "zero reais";
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);

  // For large values just return formatted number
  const formatted = reais.toLocaleString("pt-BR");
  let result = `${formatted} reais`;
  if (centavos > 0) {
    result += ` e ${centavos} centavos`;
  }
  return result;
}

export function buildTemplateContext(data: {
  negotiation: Record<string, unknown>;
  creditor: Record<string, unknown> | null;
  jrc: Record<string, unknown> | null;
  assignee: Record<string, unknown> | null;
}): CRJTemplateContext {
  const neg = data.negotiation;
  const cred = data.creditor || {};
  const person = (cred.person as Record<string, unknown>) || {};
  const jrc = data.jrc || {};
  const case_ = (jrc.case_ as Record<string, unknown>) || {};
  const cliente = (case_.cliente as Record<string, unknown>) || {};
  const assignee = data.assignee || {};

  const creditAmount = Number(neg.credit_amount || 0) / 100;
  const proposedAmount = neg.proposed_amount ? Number(neg.proposed_amount) / 100 : 0;
  const agreedAmount = neg.agreed_amount ? Number(neg.agreed_amount) / 100 : 0;
  const entryPayment = neg.entry_payment ? Number(neg.entry_payment) / 100 : 0;
  const rotatingValue = neg.rotating_credit_value ? Number(neg.rotating_credit_value) / 100 : 0;

  const now = new Date();

  return {
    negotiation_title: String(neg.title || ""),
    negotiation_type: String(neg.type || ""),
    negotiation_status: String(neg.status || ""),
    negotiation_start_date: neg.start_date ? formatDatePT(new Date(neg.start_date as string)) : "—",
    negotiation_target_date: neg.target_date ? formatDatePT(new Date(neg.target_date as string)) : "—",

    creditor_name: String(cred.nome || person.nome || ""),
    creditor_cpf_cnpj: String(cred.cpf_cnpj || person.cpf_cnpj || ""),
    creditor_class: String(cred.classe || ""),
    creditor_email: String(person.email || ""),
    creditor_phone: String(person.celular || person.telefone_fixo || ""),
    creditor_city: String(person.cidade || ""),
    creditor_state: String(person.estado || ""),

    credit_amount: formatBRLValue(neg.credit_amount as bigint),
    credit_amount_extenso: numberToWords(creditAmount),
    proposed_amount: formatBRLValue(neg.proposed_amount as bigint),
    proposed_amount_extenso: numberToWords(proposedAmount),
    agreed_amount: agreedAmount > 0 ? formatBRLValue(neg.agreed_amount as bigint) : "—",
    discount_percentage: neg.discount_percentage != null
      ? `${Number(neg.discount_percentage).toFixed(1)}%`
      : "—",
    installments: neg.installments ? String(neg.installments) : "—",
    entry_payment: entryPayment > 0 ? formatBRLValue(neg.entry_payment as bigint) : "—",
    grace_period_months: neg.grace_period_months ? `${neg.grace_period_months}` : "—",
    payment_term_years: neg.payment_term_years ? `${neg.payment_term_years}` : "—",
    monetary_correction: String(neg.monetary_correction || "—"),

    has_rotating_credit: neg.has_rotating_credit ? "Sim" : "Não",
    rotating_credit_value: rotatingValue > 0 ? formatBRLValue(neg.rotating_credit_value as bigint) : "—",
    rotating_credit_cycles: neg.rotating_credit_cycles ? String(neg.rotating_credit_cycles) : "—",

    has_credit_insurance: neg.has_credit_insurance ? "Sim" : "Não",
    insurer_name: String(neg.insurer_name || "—"),
    has_assignment: neg.has_assignment ? "Sim" : "Não",
    assignment_partner: String(neg.assignment_partner || "—"),
    assignment_percentage: neg.assignment_percentage != null
      ? `${Number(neg.assignment_percentage).toFixed(1)}%`
      : "—",

    process_number: String(case_.numero_processo || "—"),
    court: String(case_.vara || "—"),
    jurisdiction: String(case_.comarca || "—"),
    state: String(case_.uf || "—"),
    client_name: String(cliente.nome || "—"),

    current_date: formatDatePT(now),
    current_date_extenso: formatDateExtenso(now),

    assignee_name: String(assignee.name || "—"),
    assignee_oab: String(assignee.oab_number || "—"),
  };
}

/**
 * Resolve template placeholders like {{creditor_name}} with actual values
 */
export function resolveTemplate(
  template: string,
  context: CRJTemplateContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = context[key as keyof CRJTemplateContext];
    return value !== undefined ? value : match;
  });
}

/**
 * Default template content by type
 */
export const DEFAULT_TEMPLATES: Record<string, string> = {
  ACORDO_SIMPLES: `PROPOSTA DE ACORDO — RECUPERAÇÃO JUDICIAL

Processo n.º {{process_number}}
Vara: {{court}} — {{jurisdiction}}/{{state}}
Recuperanda: {{client_name}}

Prezado(a) Sr(a). {{creditor_name}},
CPF/CNPJ: {{creditor_cpf_cnpj}}
Classe: {{creditor_class}}

A Recuperanda, nos autos do processo de Recuperação Judicial acima referenciado, por intermédio de seus advogados infra-assinados, vem, respeitosamente, apresentar a seguinte PROPOSTA DE ACORDO INDIVIDUAL:

1. CRÉDITO
Valor do crédito habilitado: {{credit_amount}} ({{credit_amount_extenso}}).

2. PROPOSTA DE PAGAMENTO
Valor proposto para pagamento: {{proposed_amount}} ({{proposed_amount_extenso}}), representando deságio de {{discount_percentage}} sobre o valor original do crédito.

Condições de pagamento:
- Entrada: {{entry_payment}}
- Parcelas: {{installments}} prestações mensais e consecutivas
- Carência: {{grace_period_months}} meses
- Prazo total: {{payment_term_years}} anos
- Correção monetária: {{monetary_correction}}

3. CONDIÇÕES ESPECIAIS
- Crédito rotativo: {{has_rotating_credit}}
- Seguro de crédito: {{has_credit_insurance}}
- Cessão de créditos: {{has_assignment}}

4. DISPOSIÇÕES FINAIS
Esta proposta tem validade de 30 (trinta) dias a contar da data de envio.

{{jurisdiction}}/{{state}}, {{current_date_extenso}}.

___________________________________
{{assignee_name}}
OAB: {{assignee_oab}}
Advogado(a) da Recuperanda`,

  CREDOR_PARCEIRO_ROTATIVO: `PROPOSTA DE ACORDO — PROGRAMA CREDOR PARCEIRO COM CRÉDITO ROTATIVO

Processo n.º {{process_number}}
Recuperanda: {{client_name}}

Ao Credor: {{creditor_name}} ({{creditor_cpf_cnpj}})
Classe: {{creditor_class}}

1. CRÉDITO HABILITADO: {{credit_amount}}

2. PROPOSTA
Valor do acordo: {{proposed_amount}} (deságio de {{discount_percentage}})
Pagamento em {{installments}} parcelas, com carência de {{grace_period_months}} meses.
Correção: {{monetary_correction}}.

3. CRÉDITO ROTATIVO
Valor do crédito rotativo: {{rotating_credit_value}}
Ciclos de utilização: {{rotating_credit_cycles}}
O credor parceiro terá acesso a crédito rotativo conforme os termos acima.

4. SEGURO DE CRÉDITO
Seguradora: {{insurer_name}}
Cobertura conforme apólice a ser apresentada.

5. BENEFÍCIOS DO PROGRAMA PARCEIRO
- Prioridade no pagamento
- Manutenção da relação comercial
- Acesso a crédito rotativo
- Cobertura por seguro de crédito

Data: {{current_date_extenso}}

{{assignee_name}} — OAB {{assignee_oab}}`,

  CESSAO_CREDITOS: `PROPOSTA DE CESSÃO DE CRÉDITO

Processo n.º {{process_number}}
Recuperanda: {{client_name}}

Credor cedente: {{creditor_name}} ({{creditor_cpf_cnpj}})
Classe: {{creditor_class}}

1. CRÉDITO OBJETO DA CESSÃO: {{credit_amount}}

2. CONDIÇÕES DA CESSÃO
Percentual de cessão: {{assignment_percentage}}
Cessionário parceiro: {{assignment_partner}}
Valor proposto ao cedente: {{proposed_amount}}

3. FORMA DE PAGAMENTO
Parcelas: {{installments}}
Carência: {{grace_period_months}} meses
Correção: {{monetary_correction}}

Data: {{current_date_extenso}}

{{assignee_name}} — OAB {{assignee_oab}}`,

  SUBCLASSE_MODALIDADES: `PROPOSTA DE PAGAMENTO — SUBCLASSE COM MODALIDADES DIFERENCIADAS

Processo n.º {{process_number}}
Recuperanda: {{client_name}}

Credor: {{creditor_name}} ({{creditor_cpf_cnpj}})
Classe: {{creditor_class}}

1. CRÉDITO: {{credit_amount}}

2. MODALIDADE DE PAGAMENTO
Valor: {{proposed_amount}} (deságio {{discount_percentage}})
Entrada: {{entry_payment}}
Parcelas: {{installments}}
Carência: {{grace_period_months}} meses
Prazo: {{payment_term_years}} anos
Índice: {{monetary_correction}}

3. CONDIÇÕES ADICIONAIS
Crédito rotativo: {{has_rotating_credit}} — {{rotating_credit_value}}
Seguro: {{has_credit_insurance}} — {{insurer_name}}

Data: {{current_date_extenso}}

{{assignee_name}} — OAB {{assignee_oab}}`,

  CUSTOMIZADO: `PROPOSTA — {{negotiation_title}}

Processo n.º {{process_number}}
Recuperanda: {{client_name}}

Credor: {{creditor_name}} ({{creditor_cpf_cnpj}})
Classe: {{creditor_class}}
Crédito: {{credit_amount}}

Proposta: {{proposed_amount}}

Data: {{current_date_extenso}}

{{assignee_name}} — OAB {{assignee_oab}}`,
};

/**
 * Get all available placeholder keys with descriptions
 */
export const PLACEHOLDER_DESCRIPTIONS: Record<string, string> = {
  negotiation_title: "Título da negociação",
  negotiation_type: "Tipo da negociação",
  negotiation_status: "Status da negociação",
  negotiation_start_date: "Data de início",
  negotiation_target_date: "Data alvo",
  creditor_name: "Nome do credor",
  creditor_cpf_cnpj: "CPF/CNPJ do credor",
  creditor_class: "Classe do crédito",
  creditor_email: "E-mail do credor",
  creditor_phone: "Telefone do credor",
  creditor_city: "Cidade do credor",
  creditor_state: "Estado do credor",
  credit_amount: "Valor do crédito (R$)",
  credit_amount_extenso: "Valor do crédito por extenso",
  proposed_amount: "Valor proposto (R$)",
  proposed_amount_extenso: "Valor proposto por extenso",
  agreed_amount: "Valor acordado (R$)",
  discount_percentage: "Percentual de deságio",
  installments: "Número de parcelas",
  entry_payment: "Valor da entrada (R$)",
  grace_period_months: "Carência em meses",
  payment_term_years: "Prazo em anos",
  monetary_correction: "Índice de correção",
  has_rotating_credit: "Crédito rotativo (Sim/Não)",
  rotating_credit_value: "Valor do crédito rotativo",
  rotating_credit_cycles: "Ciclos de rotativo",
  has_credit_insurance: "Seguro de crédito (Sim/Não)",
  insurer_name: "Seguradora",
  has_assignment: "Cessão de créditos (Sim/Não)",
  assignment_partner: "Parceiro cessionário",
  assignment_percentage: "Percentual de cessão",
  process_number: "Número do processo",
  court: "Vara",
  jurisdiction: "Comarca",
  state: "UF",
  client_name: "Nome do cliente/recuperanda",
  current_date: "Data atual (DD/MM/AAAA)",
  current_date_extenso: "Data atual por extenso",
  assignee_name: "Nome do advogado responsável",
  assignee_oab: "OAB do advogado",
};
