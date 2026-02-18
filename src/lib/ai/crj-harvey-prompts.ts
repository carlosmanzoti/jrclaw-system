/**
 * Harvey Specter AI — Prompts for CRJ Negotiation Assistant
 *
 * Builds contextual system prompts for the AI chat and insight generation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CRJNegContext {
  negotiation?: {
    id: string;
    jrc_id?: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    credit_amount: bigint;
    credit_class: string;
    proposed_amount: bigint | null;
    agreed_amount: bigint | null;
    discount_percentage: number | null;
    installments: number | null;
    has_rotating_credit: boolean;
    rotating_credit_value: bigint | null;
    rotating_credit_cycles: number | null;
    has_credit_insurance: boolean;
    insurer_name: string | null;
    has_assignment: boolean;
    assignment_partner: string | null;
    assignment_percentage: number | null;
    grace_period_months: number | null;
    payment_term_years: number | null;
    monetary_correction: string | null;
    notes: string | null;
    start_date: Date;
    target_date: Date | null;
    tags: string[];
    creditor?: {
      nome: string;
      cpf_cnpj: string | null;
      classe: string;
      natureza: string | null;
      valor_original: bigint;
      valor_atualizado: bigint | null;
      valor_garantia: bigint | null;
      tipo_garantia: string | null;
      person?: {
        nome: string;
        segmento: string | null;
        cidade: string | null;
        estado: string | null;
        email: string | null;
      } | null;
    } | null;
    rounds?: {
      round_number: number;
      type: string;
      date: Date;
      description: string;
      proposed_by_us: boolean;
      value_proposed: bigint | null;
      outcome: string;
      creditor_response: string | null;
      next_steps: string | null;
    }[];
    proposals?: {
      version: number;
      template_type: string;
      status: string;
      sent_via_email: boolean;
      created_at: Date;
    }[];
    emails?: {
      direction: string;
      subject: string;
      body_preview: string;
      sent_at: Date;
    }[];
    installment_schedule?: {
      installment_number: number;
      due_date: Date;
      amount: bigint;
      status: string;
    }[];
  } | null;
  jrc?: {
    status_rj: string;
    total_credores: number;
    total_credito: bigint;
    case_?: {
      numero_processo: string | null;
      vara: string | null;
      comarca: string | null;
      uf: string | null;
      cliente?: { nome: string } | null;
    } | null;
  } | null;
  portfolio?: {
    total: number;
    byStatus: Record<string, number>;
    avgDiscount: number;
    totalCreditAmount: bigint;
    totalAgreedAmount: bigint;
  } | null;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmtBRL(centavos: bigint | number | null | undefined): string {
  if (centavos == null) return "N/A";
  const val = Number(centavos) / 100;
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// System prompt builders
// ---------------------------------------------------------------------------

export function buildHarveyChatPrompt(ctx: CRJNegContext): string {
  const neg = ctx.negotiation;
  const jrc = ctx.jrc;
  const portfolio = ctx.portfolio;

  let prompt = `Você é Harvey Specter, estrategista de negociações jurídicas do escritório JRCLaw, especializado em recuperação judicial brasileira (Lei 11.101/2005).

Seu estilo: direto, estratégico, confiante mas fundamentado. Você não enrola — vai direto ao ponto com recomendações acionáveis. Referencia artigos da Lei 11.101 e precedentes jurisprudenciais quando pertinente. Use números reais e cálculos concretos.

Regras:
- Sempre responda em português do Brasil
- Use linguagem jurídica profissional mas acessível
- Quando sugerir valores, justifique com dados do mercado ou do portfólio
- Ao analisar riscos, indique probabilidade (alta/média/baixa) e impacto
- Ao sugerir próximos passos, seja específico sobre QUEM faz O QUÊ e QUANDO
- Se não tiver informação suficiente, diga e peça os dados faltantes
`;

  if (neg) {
    prompt += `
=== NEGOCIAÇÃO ATUAL ===
Título: ${neg.title}
Tipo: ${neg.type} | Status: ${neg.status} | Prioridade: ${neg.priority}
Início: ${fmtDate(neg.start_date)} | Meta: ${fmtDate(neg.target_date)}
Tags: ${neg.tags.length > 0 ? neg.tags.join(", ") : "nenhuma"}

=== DADOS DO CRÉDITO ===
Valor do crédito: ${fmtBRL(neg.credit_amount)}
Classe: ${neg.credit_class}
Valor proposto: ${neg.proposed_amount ? fmtBRL(neg.proposed_amount) : "Ainda não proposto"}
Valor acordado: ${neg.agreed_amount ? fmtBRL(neg.agreed_amount) : "Sem acordo"}
Deságio: ${neg.discount_percentage != null ? `${neg.discount_percentage.toFixed(1)}%` : "N/A"}
Parcelas: ${neg.installments || "N/A"}
Carência: ${neg.grace_period_months ? `${neg.grace_period_months} meses` : "N/A"}
Prazo: ${neg.payment_term_years ? `${neg.payment_term_years} anos` : "N/A"}
Correção: ${neg.monetary_correction || "N/A"}
`;

    if (neg.has_rotating_credit) {
      prompt += `Crédito Rotativo: Sim — ${fmtBRL(neg.rotating_credit_value)} (${neg.rotating_credit_cycles || "?"} ciclos)\n`;
    }
    if (neg.has_credit_insurance) {
      prompt += `Seguro de Crédito: ${neg.insurer_name || "Sim"}\n`;
    }
    if (neg.has_assignment) {
      prompt += `Cessão: ${neg.assignment_partner || "Sim"} (${neg.assignment_percentage || "?"}%)\n`;
    }
    if (neg.notes) {
      prompt += `Observações: ${neg.notes}\n`;
    }

    if (neg.creditor) {
      prompt += `
=== CREDOR ===
Nome: ${neg.creditor.nome}
CPF/CNPJ: ${neg.creditor.cpf_cnpj || "N/A"}
Classe: ${neg.creditor.classe} | Natureza: ${neg.creditor.natureza || "N/A"}
Valor original: ${fmtBRL(neg.creditor.valor_original)}
Valor atualizado: ${fmtBRL(neg.creditor.valor_atualizado)}
${neg.creditor.valor_garantia ? `Valor garantia: ${fmtBRL(neg.creditor.valor_garantia)} (${neg.creditor.tipo_garantia || "N/A"})` : "Sem garantia real"}
${neg.creditor.person ? `Segmento: ${neg.creditor.person.segmento || "N/A"} | Local: ${neg.creditor.person.cidade || ""}/${neg.creditor.person.estado || ""}` : ""}
`;
    }

    if (neg.rounds && neg.rounds.length > 0) {
      prompt += `\n=== HISTÓRICO DE RODADAS (${neg.rounds.length}) ===\n`;
      for (const r of neg.rounds) {
        prompt += `Rodada #${r.round_number} [${r.type}] ${fmtDate(r.date)} — ${r.proposed_by_us ? "POR NÓS" : "PELO CREDOR"}\n`;
        prompt += `  Descrição: ${r.description}\n`;
        if (r.value_proposed) prompt += `  Valor: ${fmtBRL(r.value_proposed)}\n`;
        prompt += `  Resultado: ${r.outcome}\n`;
        if (r.creditor_response) prompt += `  Resposta credor: ${r.creditor_response}\n`;
        if (r.next_steps) prompt += `  Próximos passos: ${r.next_steps}\n`;
      }
    }

    if (neg.proposals && neg.proposals.length > 0) {
      prompt += `\n=== PROPOSTAS (${neg.proposals.length}) ===\n`;
      for (const p of neg.proposals) {
        prompt += `v${p.version} [${p.template_type}] — Status: ${p.status} ${p.sent_via_email ? "(enviada por e-mail)" : ""} — ${fmtDate(p.created_at)}\n`;
      }
    }

    if (neg.emails && neg.emails.length > 0) {
      prompt += `\n=== E-MAILS RECENTES (${neg.emails.length}) ===\n`;
      for (const e of neg.emails.slice(0, 10)) {
        prompt += `[${e.direction}] ${fmtDate(e.sent_at)} — "${e.subject}"\n  Preview: ${e.body_preview.slice(0, 200)}\n`;
      }
    }

    if (neg.installment_schedule && neg.installment_schedule.length > 0) {
      prompt += `\n=== CRONOGRAMA (${neg.installment_schedule.length} parcelas) ===\n`;
      const pending = neg.installment_schedule.filter(i => i.status === "PENDENTE");
      const paid = neg.installment_schedule.filter(i => i.status === "PAGO");
      prompt += `Pagas: ${paid.length} | Pendentes: ${pending.length}\n`;
      if (pending.length > 0) {
        const next = pending[0];
        prompt += `Próxima: #${next.installment_number} em ${fmtDate(next.due_date)} — ${fmtBRL(next.amount)}\n`;
      }
    }
  } else {
    prompt += `\n=== CONTEXTO: VISÃO GLOBAL DO PORTFÓLIO ===\nVocê está no painel geral do módulo de negociações. Não há negociação específica selecionada.\n`;
  }

  if (jrc) {
    prompt += `
=== PROCESSO DE RECUPERAÇÃO JUDICIAL ===
Número: ${jrc.case_?.numero_processo || "N/A"}
Vara: ${jrc.case_?.vara || "N/A"} | ${jrc.case_?.comarca || ""}/${jrc.case_?.uf || ""}
Cliente: ${jrc.case_?.cliente?.nome || "N/A"}
Status RJ: ${jrc.status_rj}
Total credores: ${jrc.total_credores}
Total crédito: ${fmtBRL(jrc.total_credito)}
`;
  }

  if (portfolio) {
    prompt += `
=== PORTFÓLIO DE NEGOCIAÇÕES ===
Total: ${portfolio.total} negociações
Por status: ${Object.entries(portfolio.byStatus).map(([k, v]) => `${k}: ${v}`).join(", ")}
Deságio médio: ${portfolio.avgDiscount.toFixed(1)}%
Total créditos: ${fmtBRL(portfolio.totalCreditAmount)}
Total acordado: ${fmtBRL(portfolio.totalAgreedAmount)}
`;
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Status-based suggested questions
// ---------------------------------------------------------------------------

export const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  MAPEAMENTO: [
    "Qual a melhor estratégia para abordar este credor?",
    "Qual tipo de proposta se encaixa melhor neste perfil?",
    "Quais informações preciso reunir antes de fazer contato?",
    "Qual faixa de deságio é realista para esta classe de crédito?",
  ],
  CONTATO_INICIAL: [
    "Como estruturar a primeira proposta?",
    "Qual faixa de deságio é realista para este credor?",
    "Qual template de e-mail usar para o primeiro contato?",
    "Analise o perfil deste credor e sugira abordagem.",
  ],
  PROPOSTA_ENVIADA: [
    "O credor não respondeu. O que fazer?",
    "Se o credor rejeitar, qual deve ser nossa contra-estratégia?",
    "Analise se os termos da proposta são competitivos.",
    "Gere um e-mail de follow-up profissional.",
  ],
  CONTRAPROPOSTA: [
    "Analise a contraproposta do credor. Devemos aceitar?",
    "Qual deve ser nosso próximo movimento?",
    "Qual o ponto de convergência estimado?",
    "Estamos próximos da ZOPA (Zona de Possível Acordo)?",
  ],
  MEDIACAO: [
    "Como preparar a sessão de mediação?",
    "Quais concessões podemos fazer sem comprometer o objetivo?",
    "Qual estratégia usar na mediação: colaborativa ou assertiva?",
    "Analise alternativas ao acordo (BATNA) para esta negociação.",
  ],
  ACORDO_VERBAL: [
    "Revise os termos do acordo antes de formalizar.",
    "Quais cláusulas de proteção incluir na formalização?",
    "Gere um resumo executivo do acordo para o cliente.",
    "Quais são os riscos de o credor desistir antes da formalização?",
  ],
  FORMALIZACAO: [
    "Verifique se todos os termos estão alinhados com o PRJ.",
    "Quais documentos são necessários para a homologação?",
    "Gere a petição de homologação do acordo.",
    "Qual o cronograma ideal para fechar a formalização?",
  ],
  HOMOLOGACAO: [
    "Qual o prazo esperado para homologação judicial?",
    "Quais riscos existem na fase de homologação?",
    "Gere o comunicado ao administrador judicial.",
    "Prepare o relatório final desta negociação.",
  ],
  GLOBAL: [
    "Qual é o resumo geral do portfólio de negociações?",
    "Quais negociações precisam de atenção urgente?",
    "Qual a projeção de economia total se fecharmos tudo?",
    "Sugira prioridades para as próximas 2 semanas.",
  ],
};

export function getSuggestedQuestions(status: string | null): string[] {
  if (!status) return SUGGESTED_QUESTIONS.GLOBAL;
  return SUGGESTED_QUESTIONS[status] || SUGGESTED_QUESTIONS.GLOBAL;
}

// ---------------------------------------------------------------------------
// Insight generation prompt
// ---------------------------------------------------------------------------

export function buildInsightGenerationPrompt(ctx: CRJNegContext, triggerType: string): string {
  const baseContext = buildHarveyChatPrompt(ctx);

  return `${baseContext}

=== TAREFA: GERAR INSIGHTS ===
Trigger: ${triggerType}

Analise os dados acima e gere insights estruturados em JSON. Responda EXCLUSIVAMENTE com JSON válido:

{
  "insights": [
    {
      "type": "OPORTUNIDADE|RISCO|SUGESTAO|ANALISE|CONEXAO|URGENCIA|CHECKLIST",
      "title": "Título curto e direto (máx 80 chars)",
      "description": "Explicação detalhada com dados concretos e fundamentação",
      "suggested_action": "Texto do botão de ação (ex: 'Gerar proposta', 'Enviar follow-up')",
      "action_type": "GERAR_PROPOSTA|ENVIAR_EMAIL|NOVA_RODADA|MUDAR_STATUS|FOLLOW_UP|VER_NEGOCIACAO|GERAR_CHECKLIST|null",
      "confidence": 0.85
    }
  ]
}

Gere entre 2 e 6 insights relevantes. Seja específico com valores e datas reais dos dados. Não invente dados.`;
}
