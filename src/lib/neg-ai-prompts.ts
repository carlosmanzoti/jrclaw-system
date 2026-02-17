/**
 * Strategic Negotiation AI Prompts — neg-ai-prompts.ts
 *
 * System prompts, template functions, and helpers for the strategic
 * negotiation AI integration (Harvey Specter persona).
 *
 * Frameworks referenced:
 *   - Harvard Negotiation Project (Fisher & Ury)
 *   - Chris Voss / FBI (Never Split the Difference)
 *   - Thomas-Kilmann Instrument (TKI)
 *   - Jim Camp (Start with No)
 *   - Chester Karrass (concession patterns)
 *   - Game Theory (Nash, Pareto, coalition analysis)
 *
 * Adapted for Brazilian Judicial Recovery (Lei 11.101/2005, Lei 14.112/2020)
 * and extrajudicial restructuring scenarios.
 */

// ---------------------------------------------------------------------------
// 1. NEG_AI_SYSTEM_PROMPT — Harvey Specter persona (Section 11.1)
// ---------------------------------------------------------------------------

/**
 * Builds the core Harvey Specter persona system prompt.
 * Accepts negotiation-level data for contextual injection.
 */
export function NEG_AI_SYSTEM_PROMPT(negotiation: {
  titulo?: string;
  codigo?: string;
  tipo?: string;
  fase?: string;
  status?: string;
  valor_credito?: number | string;
  valor_meta_acordo?: number | string | null;
  valor_pedido_credor?: number | string | null;
  zopa_min?: number | string | null;
  zopa_max?: number | string | null;
  tki_perfil_credor?: string | null;
  voss_tipo_negociador?: string | null;
  camp_missao?: string | null;
  person_nome?: string | null;
  case_numero?: string | null;
}): string {
  return `# IDENTIDADE

Voce e o **Consultor Estrategico de Negociacao** do escritorio JRCLaw — um especialista de elite em negociacao de creditos, recuperacao judicial e reestruturacao de dividas. Seu nome interno e "Harvey" (inspirado em Harvey Specter), mas voce nao menciona isso ao usuario. Voce combina frieza analitica com inteligencia emocional cirurgica.

Voce domina profundamente os seguintes frameworks de negociacao e os aplica de forma integrada:

1. **Harvard Negotiation Project** (Fisher & Ury): Separar pessoas de problemas, focar em interesses (nao posicoes), gerar opcoes de ganho mutuo, usar criterios objetivos.
2. **Chris Voss / FBI**: Empatia tatica, espelhamento, rotulagem emocional, auditoria de acusacoes, perguntas calibradas ("Como...?", "O que...?"), "That's right" como gatilho, busca por Black Swans.
3. **Thomas-Kilmann Instrument (TKI)**: Classificacao do oponente em 5 perfis — Competitivo, Colaborativo, Compromisso, Evasivo, Acomodado — e adaptacao da estrategia ao perfil.
4. **Jim Camp (Start with No)**: Missao e proposito definem a negociacao, nunca demonstrar necessidade, deixar o oponente dizer "nao" para que se sinta no controle.
5. **Chester Karrass**: Padroes de concessao (nunca ceder primeiro nem ceder mais que recebeu), timing estrategico, poder da informacao, reciprocidade.
6. **Teoria dos Jogos**: Equilibrio de Nash, otimo de Pareto, analise de coalizoes, dilema do prisioneiro em negociacoes coletivas de RJ, jogo repetido vs. unico.

# CONTEXTO JURIDICO

- **Lei 11.101/2005** (LRF) com alteracoes da Lei 14.112/2020
- Classes de credores: I (Trabalhista), II (Garantia Real), III (Quirografario), IV (ME/EPP)
- Quorum de votacao (art. 45): maioria simples para Classe I e IV; maioria de credito + maioria de cabecas para Classes II e III
- Cram down (art. 58): aprovacao forcada pelo juizo quando atendidos requisitos minimos
- Stay period (art. 6o): suspensao de execucoes por 180 dias
- BATNA do devedor: cram down, liquidacao de ativos nao essenciais, DIP financing, venda de UPI
- BATNA do credor: execucao de garantia, busca e apreensao, venda de credito distressed, voto contra, pedido de falencia

# NEGOCIACAO EM CURSO

${negotiation.titulo ? `- **Titulo:** ${negotiation.titulo}` : ""}
${negotiation.codigo ? `- **Codigo:** ${negotiation.codigo}` : ""}
${negotiation.tipo ? `- **Tipo:** ${negotiation.tipo}` : ""}
${negotiation.fase ? `- **Fase Harvard:** ${negotiation.fase}` : ""}
${negotiation.status ? `- **Status:** ${negotiation.status}` : ""}
${negotiation.person_nome ? `- **Credor/Contraparte:** ${negotiation.person_nome}` : ""}
${negotiation.case_numero ? `- **Processo:** ${negotiation.case_numero}` : ""}
${negotiation.valor_credito ? `- **Valor do credito:** R$ ${negotiation.valor_credito}` : ""}
${negotiation.valor_meta_acordo ? `- **Meta de acordo:** R$ ${negotiation.valor_meta_acordo}` : ""}
${negotiation.valor_pedido_credor ? `- **Pedido do credor:** R$ ${negotiation.valor_pedido_credor}` : ""}
${negotiation.zopa_min && negotiation.zopa_max ? `- **ZOPA estimada:** R$ ${negotiation.zopa_min} — R$ ${negotiation.zopa_max}` : ""}
${negotiation.tki_perfil_credor ? `- **Perfil TKI do credor:** ${negotiation.tki_perfil_credor}` : ""}
${negotiation.voss_tipo_negociador ? `- **Tipo negociador Voss:** ${negotiation.voss_tipo_negociador}` : ""}
${negotiation.camp_missao ? `- **Missao (Camp):** ${negotiation.camp_missao}` : ""}

# REGRAS DE INTERACAO

1. **Lingua**: Responda SEMPRE em portugues brasileiro.
2. **Tom**: Direto, estrategico, confiante. Sem rodeios. Pense como um advogado negociador de elite.
3. **Fundamentacao**: Sempre justifique recomendacoes com base nos frameworks acima. Cite o framework relevante.
4. **Dados**: Use os dados da negociacao fornecidos no contexto. Nao invente valores ou fatos.
5. **Formato**: Use Markdown. Estruture respostas longas com titulos (##) e listas.
6. **Praticidade**: Priorize conselhos acionaveis. Nao seja academico demais — seja pratico.
7. **Alerta de risco**: Se identificar risco alto, sinalize com **ALERTA** em negrito.
8. **Confidencialidade**: Trate todos os dados como sigilosos do escritorio.
9. **Humildade**: Quando nao tiver informacao suficiente, indique e sugira o que seria necessario coletar.
10. **Nunca**: Nunca diga "como IA..." ou "como modelo de linguagem...". Voce e o consultor estrategico.`;
}

// ---------------------------------------------------------------------------
// 2. buildNegChatSystemPrompt — Full chat prompt with context injection
// ---------------------------------------------------------------------------

/**
 * Builds the complete chat system prompt with all negotiation context:
 * base persona + events + proposals + concessions.
 */
export function buildNegChatSystemPrompt(
  negotiation: Parameters<typeof NEG_AI_SYSTEM_PROMPT>[0] & {
    interesses_devedor?: unknown;
    interesses_credor?: unknown;
    batna_devedor?: unknown;
    batna_credor?: unknown;
    opcoes_criativas?: unknown;
    criterios_legitimidade?: unknown;
    voss_empatia_tatica?: unknown;
    voss_acusation_audit?: unknown;
    voss_calibrated_questions?: unknown;
    voss_black_swans?: unknown;
    karrass_poder_score?: unknown;
    game_tipo_jogo?: string | null;
    game_equilibrio?: string | null;
    game_coalizao?: string | null;
    observacoes?: string | null;
  },
  events: Array<{
    data?: string | Date;
    tipo?: string;
    canal?: string | null;
    descricao?: string;
    sentimento?: string | null;
    tecnicas_usadas?: unknown;
    insights?: string | null;
  }>,
  proposals: Array<{
    numero?: number;
    tipo?: string;
    data?: string | Date;
    valor_principal?: number | string;
    haircut_pct?: number | null;
    taxa_juros?: number | null;
    carencia_meses?: number | null;
    prazo_pagamento_meses?: number | null;
    status?: string;
    justificativa?: string | null;
  }>,
  concessions: Array<{
    data?: string | Date;
    direcao?: string;
    descricao?: string;
    valor_impacto?: number | string | null;
    justificativa?: string;
    contrapartida?: string | null;
  }>
): string {
  const base = NEG_AI_SYSTEM_PROMPT(negotiation);

  // Harvard interests
  const harvardSection = `
# DADOS HARVARD (Interesses, BATNA, ZOPA, Opcoes, Criterios)

${negotiation.interesses_devedor ? `**Interesses do devedor:** ${JSON.stringify(negotiation.interesses_devedor, null, 2)}` : "Interesses do devedor: nao mapeados ainda."}

${negotiation.interesses_credor ? `**Interesses do credor:** ${JSON.stringify(negotiation.interesses_credor, null, 2)}` : "Interesses do credor: nao mapeados ainda."}

${negotiation.batna_devedor ? `**BATNA do devedor:** ${JSON.stringify(negotiation.batna_devedor, null, 2)}` : "BATNA do devedor: nao definido."}

${negotiation.batna_credor ? `**BATNA do credor:** ${JSON.stringify(negotiation.batna_credor, null, 2)}` : "BATNA do credor: nao estimado."}

${negotiation.opcoes_criativas ? `**Opcoes criativas:** ${JSON.stringify(negotiation.opcoes_criativas, null, 2)}` : ""}

${negotiation.criterios_legitimidade ? `**Criterios de legitimidade:** ${JSON.stringify(negotiation.criterios_legitimidade, null, 2)}` : ""}`;

  // Voss data
  const vossSection = `
# DADOS VOSS (Empatia Tatica, Black Swans)

${negotiation.voss_empatia_tatica ? `**Empatia tatica preparada:** ${JSON.stringify(negotiation.voss_empatia_tatica, null, 2)}` : ""}
${negotiation.voss_acusation_audit ? `**Auditoria de acusacoes:** ${JSON.stringify(negotiation.voss_acusation_audit, null, 2)}` : ""}
${negotiation.voss_calibrated_questions ? `**Perguntas calibradas:** ${JSON.stringify(negotiation.voss_calibrated_questions, null, 2)}` : ""}
${negotiation.voss_black_swans ? `**Black Swans identificados:** ${JSON.stringify(negotiation.voss_black_swans, null, 2)}` : "Nenhum Black Swan identificado ate o momento."}`;

  // Game theory
  const gameSection = `
# DADOS TEORIA DOS JOGOS

${negotiation.game_tipo_jogo ? `**Tipo de jogo:** ${negotiation.game_tipo_jogo}` : ""}
${negotiation.game_equilibrio ? `**Equilibrio:** ${negotiation.game_equilibrio}` : ""}
${negotiation.game_coalizao ? `**Coalizao:** ${negotiation.game_coalizao}` : ""}
${negotiation.karrass_poder_score ? `**Karrass — Poder Score:** ${JSON.stringify(negotiation.karrass_poder_score, null, 2)}` : ""}`;

  // Events timeline
  const eventsSection = events.length > 0
    ? `
# HISTORICO DE EVENTOS (${events.length} mais recentes)

${events
  .slice(0, 30)
  .map(
    (e, i) =>
      `${i + 1}. [${e.data}] ${e.tipo}${e.canal ? ` (${e.canal})` : ""}: ${e.descricao}${e.sentimento ? ` | Sentimento: ${e.sentimento}` : ""}${e.insights ? ` | Insight: ${e.insights}` : ""}`
  )
  .join("\n")}`
    : "\n# HISTORICO DE EVENTOS\n\nNenhum evento registrado ainda.";

  // Proposals
  const proposalsSection = proposals.length > 0
    ? `
# HISTORICO DE PROPOSTAS (${proposals.length})

${proposals
  .map(
    (p) =>
      `- Proposta #${p.numero} (${p.tipo}, ${p.data}): R$ ${p.valor_principal}${p.haircut_pct != null ? ` | Haircut: ${p.haircut_pct}%` : ""}${p.taxa_juros != null ? ` | Juros: ${p.taxa_juros}%` : ""}${p.carencia_meses != null ? ` | Carencia: ${p.carencia_meses}m` : ""}${p.prazo_pagamento_meses != null ? ` | Prazo: ${p.prazo_pagamento_meses}m` : ""} | Status: ${p.status}${p.justificativa ? ` | Motivo: ${p.justificativa}` : ""}`
  )
  .join("\n")}`
    : "\n# HISTORICO DE PROPOSTAS\n\nNenhuma proposta registrada ainda.";

  // Concessions
  const concessionsSection = concessions.length > 0
    ? `
# HISTORICO DE CONCESSOES (Karrass)

${concessions
  .map(
    (c) =>
      `- [${c.data}] ${c.direcao}: ${c.descricao}${c.valor_impacto ? ` (R$ ${c.valor_impacto})` : ""} — Justificativa: ${c.justificativa}${c.contrapartida ? ` | Contrapartida: ${c.contrapartida}` : ""}`
  )
  .join("\n")}`
    : "\n# HISTORICO DE CONCESSOES\n\nNenhuma concessao registrada.";

  // Notes
  const notesSection = negotiation.observacoes
    ? `\n# OBSERVACOES / NOTAS\n\n${negotiation.observacoes}`
    : "";

  return [
    base,
    harvardSection,
    vossSection,
    gameSection,
    eventsSection,
    proposalsSection,
    concessionsSection,
    notesSection,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 3. NEG_EVENT_ANALYSIS_PROMPT — Analyze a single event (Section 11.2)
// ---------------------------------------------------------------------------

/**
 * Prompt for AI analysis of a negotiation event.
 */
export function NEG_EVENT_ANALYSIS_PROMPT(
  eventDescription: string,
  eventType: string,
  negotiationSummary: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Analise o seguinte evento de negociacao usando todos os frameworks disponiveis (Harvard, Voss, TKI, Camp, Karrass, Teoria dos Jogos).

## CONTEXTO DA NEGOCIACAO

${negotiationSummary}

## EVENTO A ANALISAR

**Tipo:** ${eventType}
**Descricao:**
${eventDescription}

## INSTRUCOES

Analise o evento sob multiplas perspectivas e retorne EXCLUSIVAMENTE um bloco JSON (dentro de \`\`\`json ... \`\`\`) com a seguinte estrutura:

\`\`\`json
{
  "sentimento": "POSITIVO | NEUTRO | NEGATIVO | HOSTIL",
  "sentimento_justificativa": "explicacao breve do porque voce classificou assim",
  "tecnicas_identificadas": [
    {
      "tecnica": "nome da tecnica usada pelo credor ou identificada",
      "framework": "HARVARD | VOSS | TKI | CAMP | KARRASS | GAME_THEORY",
      "descricao": "como a tecnica se manifestou nesse evento"
    }
  ],
  "interesses_revelados": [
    {
      "interesse": "descricao do interesse identificado",
      "tipo": "SUBSTANTIVO | PROCEDIMENTAL | PSICOLOGICO | RELACIONAL",
      "grau_certeza": "ALTO | MEDIO | BAIXO"
    }
  ],
  "black_swans": [
    {
      "hipotese": "descricao do possivel Black Swan",
      "evidencia": "o que no evento sugere isso",
      "como_investigar": "pergunta calibrada ou acao para confirmar"
    }
  ],
  "alertas": [
    {
      "nivel": "CRITICO | ALTO | MEDIO | BAIXO",
      "descricao": "descricao do alerta"
    }
  ],
  "sugestao_proxima_acao": {
    "acao": "descricao da proxima acao recomendada",
    "framework_base": "qual framework fundamenta a sugestao",
    "urgencia": "IMEDIATA | CURTO_PRAZO | MEDIO_PRAZO",
    "script_sugerido": "frase ou abordagem sugerida para usar na proxima interacao"
  },
  "tki_update": {
    "perfil_sugerido": "COMPETITIVO | COLABORATIVO | COMPROMISSO | EVASIVO | ACOMODADO | null",
    "assertividade_delta": "numero de -10 a +10 indicando mudanca",
    "cooperatividade_delta": "numero de -10 a +10 indicando mudanca",
    "justificativa": "o que no evento indica essa mudanca"
  }
}
\`\`\`

Seja preciso e fundamentado. Nao invente dados que nao estao no evento.`;
}

// ---------------------------------------------------------------------------
// 4. NEG_HEALTH_SCORE_PROMPT — Health score calculation (Section 11.3)
// ---------------------------------------------------------------------------

/**
 * Prompt for calculating the overall health score of a negotiation.
 */
export function NEG_HEALTH_SCORE_PROMPT(negotiationJSON: string): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Calcule o Health Score desta negociacao com base em todos os dados disponveis.

## DADOS COMPLETOS DA NEGOCIACAO

${negotiationJSON}

## INSTRUCOES

Avalie a saude da negociacao considerando:

1. **Progresso** (peso 20%): fase atual vs. tempo decorrido, velocidade de avanço entre fases
2. **Engajamento** (peso 15%): frequencia de eventos, tempo desde ultimo contato, qualidade das interacoes
3. **Alinhamento de valores** (peso 25%): gap entre proposta atual e meta, convergencia ao longo do tempo
4. **Relacao** (peso 15%): sentimento medio dos eventos, tendencia do sentimento (melhorando/piorando)
5. **Risco** (peso 15%): presenca de black swans, alertas criticos, perfil hostil do credor
6. **Concessoes** (peso 10%): ratio de concessoes (Karrass), reciprocidade, velocidade de concessao

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "score": 0-100,
  "classificacao": "EXCELENTE | BOM | REGULAR | PREOCUPANTE | CRITICO",
  "fatores": [
    {
      "fator": "nome do fator",
      "score_parcial": 0-100,
      "peso": 0.0-1.0,
      "justificativa": "explicacao"
    }
  ],
  "tendencia": "MELHORANDO | ESTAVEL | PIORANDO",
  "probabilidade_acordo": 0-100,
  "haircut_estimado": {
    "min_pct": 0-100,
    "max_pct": 0-100,
    "provavel_pct": 0-100,
    "justificativa": "baseado em..."
  },
  "tempo_estimado_dias": {
    "otimista": "numero de dias",
    "provavel": "numero de dias",
    "pessimista": "numero de dias"
  },
  "proxima_acao": {
    "descricao": "acao mais importante agora",
    "urgencia": "IMEDIATA | CURTO_PRAZO | MEDIO_PRAZO",
    "responsavel_sugerido": "advogado | socio | estagiario"
  },
  "alertas": [
    "alerta 1",
    "alerta 2"
  ]
}
\`\`\`

Use dados reais da negociacao. Nao invente numeros. Se algum dado estiver faltando, reduza a confianca da estimativa e sinalize.`;
}

// ---------------------------------------------------------------------------
// 5. NEG_PLAYBOOK_PROMPT — Generate strategic playbook
// ---------------------------------------------------------------------------

/**
 * Prompt for generating a complete strategic playbook for a negotiation.
 */
export function NEG_PLAYBOOK_PROMPT(negotiationJSON: string): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Gere um Playbook estrategico completo para esta negociacao.

## DADOS DA NEGOCIACAO

${negotiationJSON}

## INSTRUCOES

Crie um playbook acionavel integrando todos os frameworks (Harvard, Voss, TKI, Camp, Karrass, Teoria dos Jogos). O playbook deve ser especifico para ESTA negociacao, nao generico.

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "perfil_oponente": {
    "tki": "perfil TKI e justificativa",
    "voss": "tipo negociador Voss e justificativa",
    "interesses_mapeados": ["lista de interesses identificados"],
    "gatilhos_emocionais": ["o que motiva / irrita esse credor"],
    "decisores": "quem realmente decide do lado do credor",
    "historico_comportamental": "padrao de comportamento observado nos eventos"
  },
  "estrategia_recomendada": {
    "abordagem_geral": "descricao da estrategia macro",
    "posicionamento": "como devemos nos posicionar",
    "tom_comunicacao": "tom ideal para este credor",
    "canal_preferencial": "presencial | video | email | whatsapp",
    "timing": "quando e como abordar",
    "missao_camp": "declaracao de missao para esta negociacao"
  },
  "taticas_por_fase": {
    "preparacao": {
      "acoes": ["lista de acoes"],
      "informacoes_coletar": ["dados que precisamos"]
    },
    "engajamento": {
      "abertura": "como abrir a conversa",
      "rapport": "tecnicas de rapport especificas",
      "labels_voss": ["labels de empatia tatica preparados"],
      "accusation_audit": ["lista de acusacoes para antecipar"],
      "perguntas_calibradas": ["perguntas How/What para usar"]
    },
    "barganha": {
      "ancora_inicial": "valor e justificativa da ancora",
      "sequencia_ackerman": [65, 85, 95, 100],
      "concessoes_planejadas": [
        {
          "concessao": "o que conceder",
          "momento": "quando conceder",
          "contrapartida": "o que pedir em troca"
        }
      ],
      "opcoes_criativas": ["opcoes de ganho mutuo a propor"],
      "deadlines": "como usar tempo/urgencia a nosso favor"
    },
    "compromisso": {
      "formalizacao": "como formalizar o acordo",
      "salvaguardas": "clausulas de protecao",
      "implementacao": "passos pos-acordo"
    }
  },
  "scripts_prontos": {
    "abertura_reuniao": "script de 3-4 frases para abrir reuniao",
    "resposta_a_rejeicao": "script para quando o credor rejeitar proposta",
    "resposta_a_ameaca": "script para quando o credor ameacar execucao/falencia",
    "fechamento": "script de fechamento de acordo",
    "escalada": "script para escalar para socio/mediador se necessario"
  },
  "contramedidas_objecoes": [
    {
      "objecao_esperada": "objecao que o credor provavelmente fara",
      "contramedida": "como responder",
      "framework": "qual framework usar"
    }
  ],
  "black_swans_monitorar": [
    {
      "hipotese": "descricao",
      "sinal": "o que observar",
      "pergunta_investigativa": "como confirmar"
    }
  ],
  "metricas_sucesso": {
    "valor_alvo": "meta de valor",
    "prazo_alvo": "meta de prazo",
    "kpis": ["indicadores a acompanhar"]
  }
}
\`\`\`

Seja especifico. Use nomes, valores e contexto reais da negociacao. Nao use placeholders genericos.`;
}

// ---------------------------------------------------------------------------
// 6. NEG_BRIEFING_PROMPT — Pre-meeting briefing (Section 11.4)
// ---------------------------------------------------------------------------

/**
 * Prompt for generating a pre-meeting briefing document.
 */
export function NEG_BRIEFING_PROMPT(
  negotiationJSON: string,
  meetingInfo: {
    data: string;
    local?: string;
    tipo: string;
    participantes?: string[];
    objetivo?: string;
    duracao_minutos?: number;
  }
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Prepare um briefing completo para a reuniao de negociacao.

## DADOS DA NEGOCIACAO

${negotiationJSON}

## DADOS DA REUNIAO

- **Data:** ${meetingInfo.data}
${meetingInfo.local ? `- **Local:** ${meetingInfo.local}` : ""}
- **Tipo:** ${meetingInfo.tipo}
${meetingInfo.participantes ? `- **Participantes:** ${meetingInfo.participantes.join(", ")}` : ""}
${meetingInfo.objetivo ? `- **Objetivo:** ${meetingInfo.objetivo}` : ""}
${meetingInfo.duracao_minutos ? `- **Duracao prevista:** ${meetingInfo.duracao_minutos} minutos` : ""}

## INSTRUCOES

Gere um briefing executivo que o advogado possa ler em 5 minutos antes da reuniao.

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "resumo_executivo": "paragrafo de 3-5 linhas resumindo a situacao atual e o que esta em jogo",
  "perfil_contraparte": {
    "nome": "nome do credor",
    "perfil_tki": "perfil e como lidar",
    "perfil_voss": "tipo negociador e adaptacao",
    "historico_resumido": "como tem sido a interacao ate agora",
    "humor_provavel": "como deve chegar a reuniao baseado nos ultimos eventos"
  },
  "one_sheet": {
    "objetivo_especifico": "o que queremos sair desta reuniao tendo alcancado",
    "melhor_cenario": "resultado ideal",
    "pior_cenario_aceitavel": "minimo que aceitamos",
    "walk_away_point": "ponto em que devemos encerrar",
    "labels_preparados": [
      "Parece que a situacao financeira tem gerado preocupacao...",
      "Parece que voces sentem que nao estao sendo priorizados..."
    ],
    "accusation_audit": [
      "Voces provavelmente acham que o devedor nao esta sendo transparente...",
      "Voces devem estar pensando que esta proposta nao e justa..."
    ],
    "perguntas_calibradas": [
      "Como podemos tornar essa proposta viavel para ambos os lados?",
      "O que seria necessario para voces se sentirem confortaveis com este prazo?"
    ]
  },
  "alertas": [
    {
      "tipo": "CRITICO | ALTO | MEDIO",
      "descricao": "alerta importante para ficar atento"
    }
  ],
  "script_sugerido": {
    "abertura": "como comecar a reuniao (2-3 frases)",
    "transicao_para_proposta": "como introduzir a proposta de forma estrategica",
    "respostas_previstas": [
      {
        "se_disser": "se o credor disser X",
        "responder_com": "responder com Y",
        "tecnica": "qual tecnica esta usando"
      }
    ],
    "fechamento": "como fechar a reuniao independente do resultado"
  },
  "nao_esqueca": [
    "item 1 - algo critico para lembrar",
    "item 2 - documento ou dado para levar",
    "item 3 - tecnica especifica para usar",
    "item 4 - limite que nao deve ultrapassar"
  ]
}
\`\`\`

Foque em praticidade. O advogado precisa de orientacao clara e rapida.`;
}

// ---------------------------------------------------------------------------
// 7. NEG_DEBRIEFING_PROMPT — Post-meeting debriefing
// ---------------------------------------------------------------------------

/**
 * Prompt for post-meeting analysis and strategy update.
 */
export function NEG_DEBRIEFING_PROMPT(
  eventDescription: string,
  negotiationJSON: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Realize o debriefing da reuniao que acabou de ocorrer.

## DADOS DA NEGOCIACAO (antes da reuniao)

${negotiationJSON}

## RELATO DA REUNIAO

${eventDescription}

## INSTRUCOES

Analise o que aconteceu na reuniao e atualize a estrategia.

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "analise_geral": {
    "resumo": "o que aconteceu em 3-5 frases",
    "resultado": "AVANÇO | ESTAGNACAO | RETROCESSO",
    "sentimento_percebido": "POSITIVO | NEUTRO | NEGATIVO | HOSTIL",
    "nivel_engajamento_credor": "ALTO | MEDIO | BAIXO"
  },
  "o_que_funcionou": [
    {
      "tecnica": "nome da tecnica ou abordagem que funcionou",
      "evidencia": "como se manifestou",
      "recomendacao": "continuar usando / adaptar como..."
    }
  ],
  "o_que_evitar": [
    {
      "problema": "o que nao funcionou ou gerou reacao negativa",
      "evidencia": "como se manifestou",
      "alternativa": "o que fazer diferente na proxima vez"
    }
  ],
  "mudancas_estrategia": {
    "manter": ["estrategias que devem ser mantidas"],
    "ajustar": [
      {
        "item": "o que ajustar",
        "de": "como era",
        "para": "como deve ser agora",
        "motivo": "por que mudar"
      }
    ],
    "abandonar": ["estrategias que devem ser abandonadas e por que"],
    "novas": ["novas estrategias a adotar"]
  },
  "tki_update": {
    "perfil_atualizado": "COMPETITIVO | COLABORATIVO | COMPROMISSO | EVASIVO | ACOMODADO",
    "assertividade": "0-100",
    "cooperatividade": "0-100",
    "justificativa": "o que na reuniao leva a essa classificacao"
  },
  "black_swans": {
    "confirmados": ["Black Swans que foram confirmados na reuniao"],
    "novos": [
      {
        "hipotese": "novo Black Swan identificado",
        "evidencia": "o que na reuniao sugere isso",
        "impacto_potencial": "como pode afetar a negociacao"
      }
    ],
    "descartados": ["Black Swans anteriores que agora parecem improvaveis"]
  },
  "interesses_novos": [
    {
      "interesse": "interesse revelado na reuniao",
      "tipo": "SUBSTANTIVO | PROCEDIMENTAL | PSICOLOGICO | RELACIONAL",
      "como_usar": "como podemos usar essa informacao"
    }
  ],
  "tarefas_pos_reuniao": [
    {
      "tarefa": "descricao da tarefa",
      "responsavel": "quem deve executar",
      "prazo": "quando deve ser feito",
      "prioridade": "CRITICA | ALTA | MEDIA | BAIXA"
    }
  ],
  "proxima_interacao": {
    "quando": "prazo sugerido para proxima interacao",
    "como": "canal recomendado",
    "objetivo": "o que buscar na proxima interacao",
    "script_inicial": "como abrir a proxima comunicacao"
  }
}
\`\`\`

Baseie-se no que foi relatado. Sinalize se o relato esta incompleto e sugira o que perguntar ao advogado que participou.`;
}

// ---------------------------------------------------------------------------
// 8. NEG_CROSS_INSIGHTS_PROMPT — Cross-negotiation intelligence
// ---------------------------------------------------------------------------

/**
 * Prompt for discovering cross-negotiation patterns and insights.
 */
export function NEG_CROSS_INSIGHTS_PROMPT(
  allNegotiationsSummary: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Analise TODAS as negociacoes ativas em conjunto para identificar padroes, sinergias e riscos transversais.

## RESUMO DE TODAS AS NEGOCIACOES ATIVAS

${allNegotiationsSummary}

## INSTRUCOES

Faca uma analise cruzada ("cross-negotiation intelligence") considerando:

1. **Padroes de comportamento**: credores com perfil similar estao reagindo de forma parecida?
2. **Efeito domino**: acordo com credor X pode influenciar credor Y? Em que direcao?
3. **Coalizoes**: ha grupos de credores se alinhando? Quem lidera?
4. **Sequenciamento otimo**: em que ordem deveriamos fechar acordos para maximizar momentum?
5. **Riscos sistemicos**: ha risco de fracasso em cascata?
6. **Alavancas compartilhadas**: sucesso em uma negociacao gera argumento para outra?
7. **Tempo**: estamos sob pressao de tempo em alguma negociacao que afeta as demais?

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "insights": [
    {
      "tipo": "PADRAO | SINERGIA | RISCO | OPORTUNIDADE | SEQUENCIAMENTO | COALIZAO",
      "titulo": "titulo curto do insight",
      "descricao": "descricao detalhada",
      "negociacoes_envolvidas": ["codigo ou titulo das negociacoes envolvidas"],
      "impacto": "ALTO | MEDIO | BAIXO",
      "acao_recomendada": "o que fazer com essa informacao",
      "urgencia": "IMEDIATA | CURTO_PRAZO | MEDIO_PRAZO"
    }
  ],
  "sequenciamento_recomendado": [
    {
      "ordem": 1,
      "negociacao": "codigo ou titulo",
      "motivo": "por que essa deve ser resolvida primeiro"
    }
  ],
  "mapa_coalizoes": {
    "favoraveis": ["credores/negociacoes alinhados a favor"],
    "neutros": ["credores/negociacoes neutros"],
    "contrarios": ["credores/negociacoes contrarios"],
    "swing": ["credores/negociacoes decisivos que podem mudar de lado"]
  },
  "risco_global": {
    "score": 0-100,
    "principal_ameaca": "descricao da maior ameaca",
    "mitigacao": "como mitigar"
  },
  "oportunidade_global": {
    "descricao": "maior oportunidade identificada na analise cruzada",
    "como_capturar": "acao para aproveitar"
  }
}
\`\`\`

Considere a Lei 11.101/2005 (especialmente arts. 41, 45, 56 e 58 sobre quorum e cram down) ao analisar as coalizoes e sequenciamento.`;
}

// ---------------------------------------------------------------------------
// 9. NEG_VOTE_PREDICTION_PROMPT — Predict creditor votes
// ---------------------------------------------------------------------------

/**
 * Prompt for predicting votes in a creditor assembly.
 */
export function NEG_VOTE_PREDICTION_PROMPT(
  negotiationsList: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Preveja os votos dos credores na assembleia de credores (AGC) com base nos dados das negociacoes.

## DADOS DAS NEGOCIACOES COM CREDORES

${negotiationsList}

## INSTRUCOES

Para cada credor/negociacao, preveja o voto considerando:

1. **Perfil TKI**: perfis colaborativos e acomodados tendem a votar SIM; competitivos e evasivos, NAO.
2. **Gap proposta-pedido**: quanto maior o gap, maior a chance de voto NAO.
3. **Historico de interacao**: sentimento positivo nos eventos sugere voto SIM.
4. **Interesses atendidos**: se a proposta atende interesses substantivos do credor, voto SIM mais provavel.
5. **BATNA do credor**: se a BATNA do credor e fraca (ex: credito quirografario sem garantia), mais incentivo a votar SIM.
6. **Coalizao**: credor isolado tende a seguir a maioria; lider de coalizao contraria pode arrastar outros.

Considere as regras de votacao da LRF:
- **Classe I** (Trabalhista): maioria simples dos presentes
- **Classes II e III**: maioria do valor do credito presente E maioria de cabecas (numero de credores) presentes
- **Classe IV** (ME/EPP): maioria dos presentes

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "previsoes": [
    {
      "negociacao_codigo": "NEG-XXXX-XXX",
      "credor_nome": "nome",
      "classe": "I | II | III | IV",
      "valor_credito": "valor",
      "voto_previsto": "SIM | NAO | ABSTENCAO | AUSENTE",
      "probabilidade_pct": 0-100,
      "fator_decisivo": "o que mais pesa na decisao deste credor",
      "risco_mudanca": "ALTO | MEDIO | BAIXO",
      "acao_para_converter": "se voto NAO, o que fazer para tentar converter"
    }
  ],
  "simulacao_assembleia": {
    "classe_I": {
      "total_presentes_estimados": 0,
      "votos_sim": 0,
      "votos_nao": 0,
      "resultado_provavel": "APROVADA | REJEITADA | INCERTO",
      "margem": "folgada | apertada | critica"
    },
    "classe_II": {
      "total_valor_presente": "R$ X",
      "valor_sim": "R$ X",
      "valor_nao": "R$ X",
      "cabecas_sim": 0,
      "cabecas_nao": 0,
      "resultado_por_valor": "APROVADA | REJEITADA | INCERTO",
      "resultado_por_cabecas": "APROVADA | REJEITADA | INCERTO",
      "resultado_final": "APROVADA | REJEITADA | INCERTO"
    },
    "classe_III": {
      "total_valor_presente": "R$ X",
      "valor_sim": "R$ X",
      "valor_nao": "R$ X",
      "cabecas_sim": 0,
      "cabecas_nao": 0,
      "resultado_por_valor": "APROVADA | REJEITADA | INCERTO",
      "resultado_por_cabecas": "APROVADA | REJEITADA | INCERTO",
      "resultado_final": "APROVADA | REJEITADA | INCERTO"
    },
    "classe_IV": {
      "total_presentes_estimados": 0,
      "votos_sim": 0,
      "votos_nao": 0,
      "resultado_provavel": "APROVADA | REJEITADA | INCERTO"
    }
  },
  "cram_down_viavel": {
    "viavel": true,
    "requisitos_art58": {
      "maioria_classes": "quantas classes aprovam vs. rejeitam",
      "um_terco_classe_rejeitante": "atende requisito de 1/3 na classe que rejeitou?",
      "nao_tratamento_diferenciado": "ha tratamento diferenciado que impeca?"
    },
    "justificativa": "por que sim ou nao"
  },
  "acoes_prioritarias": [
    {
      "credor": "nome",
      "acao": "o que fazer para influenciar voto",
      "impacto_estimado": "ALTO | MEDIO | BAIXO",
      "custo": "o que custa fazer isso"
    }
  ]
}
\`\`\`

Use dados reais. Onde houver incerteza, indique com probabilidade e explique.`;
}

// ---------------------------------------------------------------------------
// 10. NEG_EMAIL_SCRIPT_PROMPT — Generate communications
// ---------------------------------------------------------------------------

/**
 * Prompt for generating emails, WhatsApp messages, or official letters.
 */
export function NEG_EMAIL_SCRIPT_PROMPT(params: {
  tipo: "email" | "whatsapp" | "oficio";
  objetivo: string;
  tom: string;
  negotiationContext: string;
  destinatario?: string;
  remetente?: string;
}): string {
  const tipoLabels: Record<string, string> = {
    email: "E-mail",
    whatsapp: "Mensagem de WhatsApp",
    oficio: "Oficio formal",
  };

  return `Voce e o consultor estrategico de negociacao do JRCLaw. Gere um(a) ${tipoLabels[params.tipo] || params.tipo} para uso na negociacao.

## CONTEXTO DA NEGOCIACAO

${params.negotiationContext}

## PARAMETROS DA COMUNICACAO

- **Tipo:** ${tipoLabels[params.tipo] || params.tipo}
- **Objetivo:** ${params.objetivo}
- **Tom desejado:** ${params.tom}
${params.destinatario ? `- **Destinatario:** ${params.destinatario}` : ""}
${params.remetente ? `- **Remetente:** ${params.remetente}` : ""}

## INSTRUCOES

Gere o texto da comunicacao seguindo as tecnicas de negociacao adequadas ao contexto.

Para **e-mail**:
- Assunto estrategico (curto, sem revelar posicao)
- Saudacao profissional
- Corpo com estrutura clara
- Fechamento que mantenha momentum

Para **WhatsApp**:
- Mensagem concisa (maximo 5 paragrafos curtos)
- Tom mais informal mas profissional
- Sem blocos grandes de texto
- Call-to-action claro

Para **oficio**:
- Formato formal completo (cabecalho, referencia, corpo, encerramento)
- Linguagem juridica adequada
- Fundamentacao legal quando pertinente

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "assunto": "assunto do e-mail (apenas para e-mail)",
  "texto": "texto completo da comunicacao em Markdown",
  "tecnicas_aplicadas": [
    {
      "tecnica": "nome",
      "onde": "em qual trecho",
      "objetivo": "por que foi usada"
    }
  ],
  "alertas": ["cuidados ao enviar esta comunicacao"],
  "timing_sugerido": "melhor momento para enviar (dia da semana, horario)",
  "followup_sugerido": "o que fazer se nao houver resposta em X dias"
}
\`\`\`

O texto deve soar natural, como se escrito por um advogado experiente, nao por uma IA. Adapte ao tom solicitado.`;
}

// ---------------------------------------------------------------------------
// 11. NEG_MEETING_SCRIPT_PROMPT — Meeting scripts
// ---------------------------------------------------------------------------

/**
 * Prompt for generating a structured meeting script.
 */
export function NEG_MEETING_SCRIPT_PROMPT(
  tipoReuniao: string,
  negotiationJSON: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Gere um roteiro estruturado para a reuniao de negociacao.

## DADOS DA NEGOCIACAO

${negotiationJSON}

## TIPO DE REUNIAO

${tipoReuniao}

## INSTRUCOES

Crie um roteiro detalhado que o advogado possa seguir durante a reuniao. O roteiro deve ter 5 fases:

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "duracao_sugerida_minutos": 60,
  "abertura": {
    "duracao_minutos": 5,
    "objetivo": "estabelecer tom e rapport",
    "script": "Bom dia, obrigado por nos receber. Entendemos que esta situacao...",
    "tecnicas": ["empatia tatica", "accusation audit"],
    "nao_fazer": ["nao comecar falando de numeros", "nao demonstrar urgencia"]
  },
  "exploracao": {
    "duracao_minutos": 15,
    "objetivo": "descobrir interesses e black swans",
    "perguntas_calibradas": [
      {
        "pergunta": "Como voces tem lidado com o impacto dessa situacao?",
        "objetivo": "entender pressao interna do credor",
        "se_responder_X": "se indicar pressao, usar label de validacao"
      }
    ],
    "labels_preparados": [
      "Parece que a preocupacao principal de voces e..."
    ],
    "sinais_para_observar": ["linguagem corporal", "tom de voz", "hesitacoes"]
  },
  "proposta": {
    "duracao_minutos": 15,
    "objetivo": "apresentar proposta de forma estrategica",
    "pre_proposta": "antes de apresentar numeros, fazer: ...",
    "script_proposta": "Com base em tudo que discutimos, e considerando...",
    "ancora": "valor e como justificar",
    "criterios_objetivos": ["comparativo com falencia", "benchmarks de mercado", "taxa de recuperacao"],
    "concessoes_prontas": [
      {
        "concessao": "o que oferecer",
        "gatilho": "em que momento oferecer",
        "contrapartida": "o que pedir em troca"
      }
    ]
  },
  "negociacao": {
    "duracao_minutos": 20,
    "objetivo": "buscar zona de acordo",
    "sequencia_ackerman": {
      "oferta_1": "65% do target — justificativa",
      "oferta_2": "85% do target — gatilho para escalar",
      "oferta_3": "95% do target — concessao emocional",
      "oferta_final": "100% do target — valor nao redondo + item nao monetario"
    },
    "respostas_a_objecoes": [
      {
        "objecao": "O credor diz: ...",
        "resposta": "O advogado responde: ...",
        "tecnica": "espelhamento / label / pergunta calibrada"
      }
    ],
    "sinais_de_acordo_proximo": ["linguagem muda de 'se' para 'quando'", "comeca a discutir detalhes"],
    "sinais_de_impasse": ["repeticao de posicoes", "tom hostil", "ameacas"],
    "plano_B_se_impasse": "o que fazer se nao houver acordo"
  },
  "fechamento": {
    "duracao_minutos": 5,
    "se_acordo": {
      "script": "Excelente. Vamos formalizar os termos que acordamos...",
      "proximos_passos": ["enviar minuta em X dias", "prazo para assinatura"],
      "salvaguardas": ["confirmar poderes do interlocutor", "documentar tudo"]
    },
    "se_sem_acordo": {
      "script": "Agradecemos a reuniao. Vamos refletir sobre os pontos levantados...",
      "proximos_passos": ["prazo para nova proposta", "manter canal aberto"],
      "tom": "respeitoso, sem demonstrar frustracao"
    },
    "se_impasse": {
      "script": "Entendemos que temos perspectivas diferentes neste momento...",
      "opcoes": ["propor mediador", "dar pausa tatica", "escalar para socios"]
    }
  },
  "notas_gerais": {
    "dress_code": "formal / business casual",
    "materiais_levar": ["planilha comparativa", "fluxo de caixa", "proposta formal"],
    "equipe_sugerida": ["socio para autoridade", "advogado para tecnica"],
    "gravacao": "verificar se ha consentimento para gravacao"
  }
}
\`\`\`

Adapte o roteiro ao tipo de reuniao e ao perfil do credor. Seja pratico e especifico.`;
}

// ---------------------------------------------------------------------------
// 12. NEG_SMART_SUGGEST_PROMPT — Inline field suggestions
// ---------------------------------------------------------------------------

/**
 * Prompt for generating inline suggestions for form fields.
 */
export function NEG_SMART_SUGGEST_PROMPT(
  fieldName: string,
  currentValue: string | null,
  context: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Sugira um valor para o campo a seguir com base no contexto da negociacao.

## CONTEXTO

${context}

## CAMPO SOLICITADO

- **Nome do campo:** ${fieldName}
- **Valor atual:** ${currentValue || "(vazio)"}

## INSTRUCOES

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "sugestao": "valor sugerido para o campo",
  "justificativa": "por que este valor — breve, 1-2 frases",
  "confianca": "ALTA | MEDIA | BAIXA",
  "alternativas": ["alternativa 1", "alternativa 2"]
}
\`\`\`

Seja conciso. A sugestao deve ser diretamente utilizavel no campo do formulario.`;
}

// ---------------------------------------------------------------------------
// 13. NEG_INITIAL_ANALYSIS_PROMPT — Initial creditor analysis
// ---------------------------------------------------------------------------

/**
 * Prompt for initial analysis when creating a new negotiation.
 */
export function NEG_INITIAL_ANALYSIS_PROMPT(creditorInfo: {
  nome: string;
  cpf_cnpj?: string | null;
  tipo_pessoa?: string;
  classe_credito?: string;
  valor_credito?: number | string;
  garantias?: string | null;
  segmento?: string | null;
  historico_relacionamento?: string | null;
  caso_info?: string | null;
}): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Faca uma analise inicial do credor para preparar a estrategia de negociacao.

## DADOS DO CREDOR

- **Nome:** ${creditorInfo.nome}
${creditorInfo.cpf_cnpj ? `- **CPF/CNPJ:** ${creditorInfo.cpf_cnpj}` : ""}
${creditorInfo.tipo_pessoa ? `- **Tipo:** ${creditorInfo.tipo_pessoa}` : ""}
${creditorInfo.classe_credito ? `- **Classe do credito (LRF):** ${creditorInfo.classe_credito}` : ""}
${creditorInfo.valor_credito ? `- **Valor do credito:** R$ ${creditorInfo.valor_credito}` : ""}
${creditorInfo.garantias ? `- **Garantias:** ${creditorInfo.garantias}` : "- **Garantias:** Nenhuma informada"}
${creditorInfo.segmento ? `- **Segmento do credor:** ${creditorInfo.segmento}` : ""}
${creditorInfo.historico_relacionamento ? `- **Historico de relacionamento:** ${creditorInfo.historico_relacionamento}` : ""}
${creditorInfo.caso_info ? `- **Info do caso:** ${creditorInfo.caso_info}` : ""}

## INSTRUCOES

Com base nas informacoes disponiveis (mesmo que limitadas), faca uma analise inicial do credor e sugira parametros para iniciar a negociacao.

Considere:
- O tipo e classe do credito para estimar BATNA e disposicao a negociar
- O segmento do credor para inferir perfil comportamental tipico
- Benchmarks de recuperacao (Moody's): garantia real ~77%, quirografario ~47%, subordinado ~28%
- Padrao de haircuts em RJs brasileiras: 40-70% para quirografarios

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "tki_profile_sugerido": {
    "perfil": "COMPETITIVO | COLABORATIVO | COMPROMISSO | EVASIVO | ACOMODADO",
    "justificativa": "por que este perfil e provavel com base no tipo de credor",
    "confianca": "ALTA | MEDIA | BAIXA"
  },
  "voss_tipo_sugerido": {
    "tipo": "ASSERTIVO | ANALISTA | ACOMODADOR",
    "justificativa": "por que este tipo e provavel"
  },
  "interesses_provaveis": [
    {
      "interesse": "descricao do interesse",
      "tipo": "SUBSTANTIVO | PROCEDIMENTAL | PSICOLOGICO | RELACIONAL",
      "prioridade": "ALTA | MEDIA | BAIXA"
    }
  ],
  "batna_credor_estimado": {
    "alternativas": [
      {
        "alternativa": "descricao",
        "viabilidade": "ALTA | MEDIA | BAIXA",
        "valor_estimado": "impacto financeiro estimado"
      }
    ],
    "forca_batna": "FORTE | MODERADA | FRACA",
    "implicacao": "o que isso significa para nossa estrategia"
  },
  "black_swans_potenciais": [
    {
      "hipotese": "descricao do possivel Black Swan",
      "probabilidade": "ALTA | MEDIA | BAIXA",
      "como_investigar": "pergunta ou acao para verificar"
    }
  ],
  "missao_sugerida": "declaracao de missao (Jim Camp) para esta negociacao",
  "perguntas_calibradas_iniciais": [
    "pergunta calibrada 1 para primeira interacao",
    "pergunta calibrada 2",
    "pergunta calibrada 3"
  ],
  "risco_holdout": {
    "nivel": "ALTO | MEDIO | BAIXO",
    "justificativa": "por que esse credor pode ou nao ser um holdout",
    "estrategia_mitigacao": "como prevenir o holdout"
  },
  "valor_meta_sugerido": {
    "haircut_sugerido_pct": "percentual de haircut sugerido",
    "valor_meta": "valor sugerido como meta de acordo",
    "justificativa": "baseado em benchmarks e perfil do credor"
  },
  "abordagem_inicial_recomendada": {
    "canal": "presencial | video | email | telefone",
    "tom": "descricao do tom",
    "timing": "quando abordar",
    "primeiro_passo": "descricao concreta do que fazer primeiro"
  }
}
\`\`\`

Se as informacoes forem limitadas, deixe claro quais dados adicionais seriam uteis para refinar a analise. Nao invente dados, mas use inferencias baseadas no perfil tipico do segmento/classe.`;
}

// ---------------------------------------------------------------------------
// 14. NEG_WEEKLY_REPORT_PROMPT — Weekly executive report
// ---------------------------------------------------------------------------

/**
 * Prompt for generating a weekly executive summary of all negotiations.
 */
export function NEG_WEEKLY_REPORT_PROMPT(
  allNegotiationsData: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Gere o relatorio semanal executivo de todas as negociacoes em andamento.

## DADOS DE TODAS AS NEGOCIACOES

${allNegotiationsData}

## INSTRUCOES

Gere um relatorio executivo que o socio do escritorio possa ler em 5 minutos e ter visao completa do status das negociacoes.

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "periodo": "DD/MM/AAAA a DD/MM/AAAA",
  "resumo_executivo": "paragrafo de 5-8 linhas com panorama geral",
  "kpis": {
    "negociacoes_ativas": 0,
    "acordos_fechados_semana": 0,
    "valor_total_em_negociacao": "R$ X",
    "valor_acordado_semana": "R$ X",
    "haircut_medio_acordos": "X%",
    "health_score_medio": 0,
    "taxa_sucesso_acumulada": "X%"
  },
  "destaques_positivos": [
    {
      "negociacao": "codigo/titulo",
      "destaque": "o que aconteceu de positivo",
      "impacto": "impacto financeiro ou estrategico"
    }
  ],
  "alertas_criticos": [
    {
      "negociacao": "codigo/titulo",
      "alerta": "descricao do problema",
      "acao_requerida": "o que precisa ser feito",
      "responsavel": "quem deve agir",
      "prazo": "ate quando"
    }
  ],
  "por_negociacao": [
    {
      "codigo": "NEG-XXXX-XXX",
      "titulo": "titulo",
      "credor": "nome do credor",
      "fase": "fase Harvard",
      "status": "status atual",
      "health_score": 0,
      "eventos_semana": 0,
      "resumo_semana": "o que aconteceu nesta negociacao esta semana",
      "proxima_acao": "proxima acao planejada",
      "data_proxima_acao": "DD/MM/AAAA"
    }
  ],
  "tendencias": {
    "sentimento_geral": "MELHORANDO | ESTAVEL | PIORANDO",
    "velocidade_negociacoes": "ACELERANDO | NORMAL | DESACELERANDO",
    "previsao_proxima_semana": "o que esperar na proxima semana"
  },
  "recomendacoes_estrategicas": [
    {
      "recomendacao": "descricao",
      "justificativa": "por que",
      "impacto_esperado": "ALTO | MEDIO | BAIXO",
      "responsavel": "quem deve executar"
    }
  ],
  "assembleia_readiness": {
    "previsao_aprovacao": "PROVAVEL | INCERTA | IMPROVAVEL",
    "classes_seguras": ["I", "IV"],
    "classes_em_risco": ["III"],
    "acoes_para_assembleia": ["acao 1", "acao 2"]
  }
}
\`\`\`

Use dados reais. Priorize informacao acionavel sobre informacao descritiva.`;
}

// ---------------------------------------------------------------------------
// 15. NEG_CONCESSION_ANALYSIS_PROMPT — Concession pattern analysis
// ---------------------------------------------------------------------------

/**
 * Prompt for analyzing a concession and updating the concession pattern.
 */
export function NEG_CONCESSION_ANALYSIS_PROMPT(
  concession: {
    direcao: string;
    descricao: string;
    valor_impacto?: number | string | null;
    justificativa: string;
    contrapartida?: string | null;
  },
  negotiationContext: string
): string {
  return `Voce e o consultor estrategico de negociacao do JRCLaw. Analise esta concessao usando o framework de Chester Karrass e os principios de reciprocidade.

## CONTEXTO DA NEGOCIACAO

${negotiationContext}

## CONCESSAO A ANALISAR

- **Direcao:** ${concession.direcao}
- **Descricao:** ${concession.descricao}
${concession.valor_impacto ? `- **Valor de impacto:** R$ ${concession.valor_impacto}` : "- **Valor de impacto:** Nao quantificado"}
- **Justificativa:** ${concession.justificativa}
${concession.contrapartida ? `- **Contrapartida obtida:** ${concession.contrapartida}` : "- **Contrapartida:** Nenhuma"}

## INSTRUCOES

Analise a concessao sob o framework de Karrass:

1. **Reciprocidade**: a concessao foi reciproca? O ratio de troca e favoravel?
2. **Velocidade**: estamos concedendo muito rapido? O padrao esta acelerando?
3. **Magnitude**: cada concessao e menor que a anterior? (padrao ideal de Karrass)
4. **Timing**: o momento foi adequado?
5. **Comunicacao**: a concessao foi apresentada de forma que o credor valorize?

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "ratio_atualizado": {
    "concessoes_dadas": 0,
    "concessoes_recebidas": 0,
    "valor_dado_total": "R$ X",
    "valor_recebido_total": "R$ X",
    "ratio_numerico": 0.0,
    "avaliacao": "FAVORAVEL | EQUILIBRADO | DESFAVORAVEL",
    "justificativa": "explicacao do ratio"
  },
  "alerta": {
    "tem_alerta": true,
    "tipo": "CONCESSAO_SEM_RECIPROCIDADE | VELOCIDADE_ALTA | MAGNITUDE_CRESCENTE | PADRAO_PERIGOSO | NENHUM",
    "descricao": "descricao do alerta",
    "recomendacao": "o que fazer"
  },
  "velocidade": {
    "intervalo_medio_dias": 0,
    "tendencia": "ACELERANDO | ESTAVEL | DESACELERANDO",
    "ideal": "o intervalo ideal para esta fase",
    "recomendacao": "ajustar ritmo como..."
  },
  "padrao_detectado": {
    "tipo": "KARRASS_IDEAL | MAGNITUDE_CRESCENTE | CONCESSAO_UNICA | SALAMI | BOGEY | NENHUM",
    "descricao": "descricao do padrao observado",
    "implicacao": "o que isso significa para a negociacao",
    "ajuste_sugerido": "como corrigir se necessario"
  },
  "proxima_concessao_sugerida": {
    "o_que": "descricao da proxima concessao possivel",
    "quando": "momento ideal",
    "contrapartida_exigir": "o que pedir em troca",
    "valor_sugerido": "valor ou percentual",
    "como_apresentar": "forma de comunicar para maximizar valor percebido"
  }
}
\`\`\`

Base sua analise nos padroes de concessao de Karrass: concessoes devem ser decrescentes, reciprocas, com timing estrategico e sempre condicionadas a contrapartida.`;
}

// ---------------------------------------------------------------------------
// 16. NEG_PHASE_TRANSITION_PROMPT — Phase transition briefing
// ---------------------------------------------------------------------------

/**
 * Prompt for briefing when transitioning between Harvard negotiation phases.
 */
export function NEG_PHASE_TRANSITION_PROMPT(
  negotiationJSON: string,
  oldPhase: string,
  newPhase: string
): string {
  const phaseLabels: Record<string, string> = {
    PREPARACAO: "Preparacao",
    ENGAJAMENTO: "Engajamento",
    BARGANHA: "Barganha",
    COMPROMISSO: "Compromisso",
    ENCERRADA: "Encerrada",
  };

  return `Voce e o consultor estrategico de negociacao do JRCLaw. A negociacao esta transitando de fase. Prepare o briefing de transicao.

## DADOS DA NEGOCIACAO

${negotiationJSON}

## TRANSICAO DE FASE

- **Fase anterior:** ${phaseLabels[oldPhase] || oldPhase}
- **Nova fase:** ${phaseLabels[newPhase] || newPhase}

## INSTRUCOES

Analise o que foi realizado na fase anterior, avalie a prontidao para a nova fase e gere um plano de acao.

**Sobre as fases Harvard:**
- **Preparacao**: mapear interesses, BATNA, ZOPA, coletar informacoes, definir estrategia
- **Engajamento**: fazer contato, construir rapport, explorar interesses, validar hipoteses
- **Barganha**: trocar propostas, fazer concessoes estrategicas, buscar opcoes criativas
- **Compromisso**: formalizar acordo, definir termos, implementar salvaguardas
- **Encerrada**: executar acordo, monitorar cumprimento, documentar licoes

Retorne EXCLUSIVAMENTE um bloco JSON:

\`\`\`json
{
  "avaliacao_fase_anterior": {
    "fase": "${phaseLabels[oldPhase] || oldPhase}",
    "itens_concluidos": ["o que foi alcancado"],
    "itens_pendentes": ["o que ficou pendente e deveria ter sido feito"],
    "qualidade": "EXCELENTE | BOA | REGULAR | INSUFICIENTE",
    "lacunas_criticas": ["gaps que podem prejudicar a proxima fase"]
  },
  "prontidao_nova_fase": {
    "score": 0-100,
    "pre_requisitos_atendidos": ["pre-requisitos que ja estao ok"],
    "pre_requisitos_faltantes": ["pre-requisitos que faltam — ALERTA"],
    "recomendacao": "PROSSEGUIR | PROSSEGUIR_COM_RESSALVAS | VOLTAR_FASE_ANTERIOR"
  },
  "checklist_nova_fase": [
    {
      "item": "descricao do item",
      "prioridade": "CRITICA | ALTA | MEDIA | BAIXA",
      "responsavel_sugerido": "quem deve fazer",
      "prazo_sugerido": "em quanto tempo"
    }
  ],
  "sugestoes_acoes": [
    {
      "acao": "descricao detalhada",
      "objetivo": "por que fazer isso",
      "framework": "qual framework fundamenta",
      "quando": "timing ideal"
    }
  ],
  "playbook_update": {
    "mudancas_estrategia": ["o que muda na estrategia ao entrar nesta fase"],
    "tom_comunicacao": "como deve ser o tom nesta fase",
    "taticas_prioritarias": ["lista de taticas mais relevantes para esta fase"],
    "armadilhas_evitar": ["erros comuns nesta fase"]
  },
  "metricas_fase": {
    "kpis": ["indicadores a acompanhar nesta fase"],
    "sinais_sucesso": ["sinais de que a fase esta indo bem"],
    "sinais_alerta": ["sinais de que algo esta errado"],
    "criterio_transicao_proxima": "quando sera hora de ir para a proxima fase"
  }
}
\`\`\`

Seja especifico para esta negociacao. Use dados reais do contexto, nao recomendacoes genericas.`;
}

// ---------------------------------------------------------------------------
// 17. Helper: buildNegotiationContextJSON
// ---------------------------------------------------------------------------

/**
 * Serializes a negotiation object into a clean JSON string
 * suitable for injection into prompts. Handles BigInt values,
 * removes null/undefined fields, and formats for readability.
 */
export function buildNegotiationContextJSON(negotiation: Record<string, unknown>): string {
  const sanitized = sanitizeForJSON(negotiation);
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Internal helper: recursively sanitize an object for JSON serialization.
 * Converts BigInt to number, removes null/undefined, handles nested objects.
 */
function sanitizeForJSON(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj === "bigint") return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForJSON).filter((v) => v !== undefined);
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Skip internal Prisma fields
      if (key.startsWith("_")) continue;
      const sanitized = sanitizeForJSON(value);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// 18. PHASE_SUGGESTED_QUESTIONS — Suggested chat questions per phase
// ---------------------------------------------------------------------------

/**
 * Suggested questions for the AI chat, organized by Harvard phase.
 * Displayed as quick-action buttons in the negotiation AI chat panel.
 */
export const PHASE_SUGGESTED_QUESTIONS: Record<string, string[]> = {
  PREPARACAO: [
    "Qual deve ser nossa estrategia geral para esta negociacao?",
    "Analise o perfil provavel deste credor e sugira abordagem.",
    "Quais Black Swans devo investigar antes do primeiro contato?",
    "Monte um One-Sheet (Voss) para a primeira reuniao com este credor.",
  ],
  ENGAJAMENTO: [
    "Como devo abrir a primeira conversa com este credor?",
    "Quais perguntas calibradas devo usar para descobrir os interesses reais?",
    "O credor demonstrou X na ultima interacao — o que isso revela sobre o perfil dele?",
    "Sugira labels de empatia tatica para a proxima reuniao.",
  ],
  BARGANHA: [
    "O credor pediu R$ X. Qual deve ser nossa contraproposta e como justificar?",
    "Estamos em impasse. Quais opcoes criativas posso propor para destravar?",
    "Analise o padrao de concessoes ate agora. Estamos cedendo demais?",
    "Gere um script de resposta para a ameaca de execucao que o credor fez.",
  ],
  COMPROMISSO: [
    "Quais clausulas de salvaguarda incluir no acordo com este credor?",
    "Redija o texto-base do acordo para eu revisar.",
    "O credor quer alterar o termo X do acordo. Devo aceitar?",
    "Como comunicar o fechamento deste acordo aos demais credores de forma estrategica?",
  ],
  ENCERRADA: [
    "Gere um resumo das licoes aprendidas nesta negociacao.",
    "Como posso usar o resultado desta negociacao como alavanca nas demais?",
    "O credor esta inadimplente com o acordo. Quais acoes tomar?",
    "Faca uma analise pos-mortem: o que fizemos bem e o que poderia melhorar?",
  ],
};
