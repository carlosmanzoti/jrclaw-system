// Strategic Negotiation Module — Constants, labels, colors, and helper functions
// Based on Harvard Negotiation, Thomas-Kilmann (TKI), Chris Voss/FBI,
// Camp, Karrass, and Game Theory frameworks.
// Adapted for Brazilian Judicial Recovery (Lei 11.101/2005).

// ============================================================
// Const arrays and derived types (backward compatibility)
// ============================================================

export const STRAT_NEG_TYPES = [
  "INDIVIDUAL",
  "COLETIVA_CLASSE",
  "COLETIVA_COMITE",
  "EXTRAJUDICIAL",
] as const;

export type StratNegType = (typeof STRAT_NEG_TYPES)[number];

export const STRAT_NEG_PHASES = [
  "PREPARACAO",
  "ENGAJAMENTO",
  "BARGANHA",
  "COMPROMISSO",
  "ENCERRADA",
] as const;

export type StratNegPhase = (typeof STRAT_NEG_PHASES)[number];

export const STRAT_NEG_STATUSES = [
  "NAO_INICIADA",
  "EM_ANDAMENTO",
  "PROPOSTA_ENVIADA",
  "CONTRAPROPOSTA",
  "IMPASSE",
  "ACORDO",
  "FRACASSADA",
] as const;

export type StratNegStatus = (typeof STRAT_NEG_STATUSES)[number];

export const STRAT_NEG_PRIORITIES = [
  "CRITICA",
  "ALTA",
  "MEDIA",
  "BAIXA",
] as const;

export type StratNegPriority = (typeof STRAT_NEG_PRIORITIES)[number];

export const TKI_PROFILES = [
  "COMPETITIVO",
  "COLABORATIVO",
  "COMPROMISSO",
  "EVASIVO",
  "ACOMODADO",
] as const;

export type TkiProfile = (typeof TKI_PROFILES)[number];

// ============================================================
// 1. Negotiation Type
// ============================================================

export const STRAT_NEG_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  COLETIVA_CLASSE: "Coletiva por Classe",
  COLETIVA_COMITE: "Coletiva por Comite",
  EXTRAJUDICIAL: "Extrajudicial",
};

export const STRAT_NEG_TYPE_COLORS: Record<string, string> = {
  INDIVIDUAL: "bg-blue-100 text-blue-700 border-blue-200",
  COLETIVA_CLASSE: "bg-purple-100 text-purple-700 border-purple-200",
  COLETIVA_COMITE: "bg-indigo-100 text-indigo-700 border-indigo-200",
  EXTRAJUDICIAL: "bg-amber-100 text-amber-700 border-amber-200",
};

// ============================================================
// 2. Harvard Negotiation Phases
// ============================================================

export const STRAT_NEG_PHASE_LABELS: Record<string, string> = {
  PREPARACAO: "Preparacao",
  ENGAJAMENTO: "Engajamento",
  BARGANHA: "Barganha",
  COMPROMISSO: "Compromisso",
  ENCERRADA: "Encerrada",
};

export const STRAT_NEG_PHASE_COLORS: Record<string, string> = {
  PREPARACAO: "#9CA3AF",
  ENGAJAMENTO: "#3B82F6",
  BARGANHA: "#F59E0B",
  COMPROMISSO: "#10B981",
  ENCERRADA: "#6B7280",
};

export const STRAT_NEG_PHASE_BG_COLORS: Record<string, string> = {
  PREPARACAO: "bg-gray-100 text-gray-700",
  ENGAJAMENTO: "bg-blue-100 text-blue-700",
  BARGANHA: "bg-amber-100 text-amber-700",
  COMPROMISSO: "bg-emerald-100 text-emerald-700",
  ENCERRADA: "bg-gray-200 text-gray-600",
};

export const STRAT_NEG_PHASE_ORDER: string[] = [
  "PREPARACAO",
  "ENGAJAMENTO",
  "BARGANHA",
  "COMPROMISSO",
  "ENCERRADA",
];

// ============================================================
// 3. Negotiation Status
// ============================================================

export const STRAT_NEG_STATUS_LABELS: Record<string, string> = {
  NAO_INICIADA: "Nao Iniciada",
  EM_ANDAMENTO: "Em Andamento",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  CONTRAPROPOSTA: "Contraproposta",
  IMPASSE: "Impasse",
  ACORDO: "Acordo",
  FRACASSADA: "Fracassada",
};

export const STRAT_NEG_STATUS_COLORS: Record<string, string> = {
  NAO_INICIADA: "bg-gray-100 text-gray-600",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  PROPOSTA_ENVIADA: "bg-indigo-100 text-indigo-700",
  CONTRAPROPOSTA: "bg-amber-100 text-amber-700",
  IMPASSE: "bg-red-100 text-red-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
  FRACASSADA: "bg-red-200 text-red-800",
};

// ============================================================
// 4. Priority
// ============================================================

export const STRAT_NEG_PRIORITY_LABELS: Record<string, string> = {
  CRITICA: "Critica",
  ALTA: "Alta",
  MEDIA: "Media",
  BAIXA: "Baixa",
};

export const STRAT_NEG_PRIORITY_COLORS: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700",
  ALTA: "bg-orange-100 text-orange-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAIXA: "bg-gray-100 text-gray-600",
};

export const STRAT_NEG_PRIORITY_HEX: Record<string, string> = {
  CRITICA: "#EF4444",
  ALTA: "#F97316",
  MEDIA: "#EAB308",
  BAIXA: "#9CA3AF",
};

// ============================================================
// 5. Thomas-Kilmann Instrument (TKI) Profiles
// ============================================================

export const TKI_PROFILE_LABELS: Record<string, string> = {
  COMPETITIVO: "Competitivo",
  COLABORATIVO: "Colaborativo",
  COMPROMISSO: "Compromisso",
  EVASIVO: "Evasivo",
  ACOMODADO: "Acomodado",
};

export const TKI_PROFILE_COLORS: Record<string, string> = {
  COMPETITIVO: "#EF4444",
  COLABORATIVO: "#10B981",
  COMPROMISSO: "#3B82F6",
  EVASIVO: "#9CA3AF",
  ACOMODADO: "#F59E0B",
};

export const TKI_PROFILE_BG_COLORS: Record<string, string> = {
  COMPETITIVO: "bg-red-100 text-red-700 border-red-200",
  COLABORATIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPROMISSO: "bg-blue-100 text-blue-700 border-blue-200",
  EVASIVO: "bg-gray-100 text-gray-600 border-gray-200",
  ACOMODADO: "bg-amber-100 text-amber-700 border-amber-200",
};

export const TKI_PROFILE_ICONS: Record<string, string> = {
  COMPETITIVO: "Swords",
  COLABORATIVO: "Handshake",
  COMPROMISSO: "Scale",
  EVASIVO: "DoorOpen",
  ACOMODADO: "Heart",
};

export const TKI_PROFILE_DESCRIPTIONS: Record<string, string> = {
  COMPETITIVO:
    "Perfil assertivo e nao cooperativo. Busca maximizar ganhos proprios mesmo em detrimento " +
    "da contraparte. Em contexto de RJ, esse credor tende a rejeitar propostas iniciais, " +
    "exigir condicoes melhores que a media da classe e ameacar com execucao individual ou " +
    "pedido de falencia. Estrategia recomendada: apresentar dados objetivos sobre a alternativa " +
    "de liquidacao (BATNA do devedor), demonstrar que a proposta de acordo supera o cenario de " +
    "falencia, usar ancoragem com valores tecnicos e manter firmeza sem ceder a pressao emocional. " +
    "Evitar concessoes unilaterais que serao interpretadas como fraqueza.",

  COLABORATIVO:
    "Perfil assertivo e cooperativo. Busca solucoes integrativas que atendam ambas as partes. " +
    "Credor colaborativo tende a participar construtivamente da negociacao, propor alternativas " +
    "criativas (debt-for-equity, carencia com juros, warrants) e valorizar a relacao comercial " +
    "futura. Estrategia recomendada: explorar interesses subjacentes (manutencao do fornecimento, " +
    "participacao no equity, contratos futuros), construir opcoes de ganho mutuo, compartilhar " +
    "informacoes de forma transparente e usar o credor como embaixador junto aos demais credores. " +
    "Ideal para formar coalizao de apoio ao plano de recuperacao.",

  COMPROMISSO:
    "Perfil intermediario entre assertividade e cooperacao. Busca solucoes rapidas e pragmaticas " +
    "com concessoes reciprocas. Em RJ, aceita haircut moderado desde que haja contrapartida " +
    "razoavel (prazo curto, garantia real, preferencia em pagamento). Estrategia recomendada: " +
    "apresentar proposta ja proximo da ZOPA (zona de possivel acordo), fazer concessoes " +
    "condicionais ('se voce aceitar X, oferecemos Y'), manter ritmo agil de negociacao " +
    "para evitar que perca interesse, e usar benchmarks de mercado para justificar os " +
    "termos propostos.",

  EVASIVO:
    "Perfil nao assertivo e nao cooperativo. Evita confronto, posterga decisoes e nao se " +
    "engaja ativamente na negociacao. Credor evasivo pode simplesmente ignorar comunicacoes, " +
    "nao comparecer a assembleias ou delegar sem instrucoes claras. Estrategia recomendada: " +
    "facilitar o engajamento com comunicacao simples e direta, reduzir barreiras de participacao " +
    "(videoconferencia, procuracao simplificada), enfatizar consequencias da inacao " +
    "(perda de direitos de voto, sujeicao ao plano aprovado sem sua participacao), " +
    "e definir prazos claros para resposta com alertas escalonados.",

  ACOMODADO:
    "Perfil nao assertivo e cooperativo. Prioriza o relacionamento e tende a ceder em " +
    "negociacoes para evitar conflito. Em RJ, aceita condicoes desfavoraveis sem questionar, " +
    "vota a favor do plano mesmo com haircut elevado e raramente apresenta impugnacao. " +
    "Estrategia recomendada: tratar com respeito e transparencia, oferecer condicoes " +
    "diferenciadas como reconhecimento a cooperacao (pagamento antecipado, bonus de " +
    "adimplencia), usar como aliado na formacao de consenso entre credores e garantir " +
    "que nao se sinta explorado para manter a colaboracao a longo prazo.",
};

export const TKI_PROFILE_COUNTER_STRATEGY: Record<string, string> = {
  COMPETITIVO:
    "Contra o competitivo: (1) Nao ceda na primeira rodada — credores competitivos testam " +
    "limites; (2) Apresente BATNA do devedor com dados concretos (valor de liquidacao, " +
    "tempo estimado, custos do processo); (3) Use criterios objetivos (laudo pericial, " +
    "precedentes judiciais, taxa media de recuperacao Moody's); (4) Se necessario, " +
    "isole o credor hostil dos demais usando negociacao individual; (5) Mantenha registro " +
    "documental de todas as propostas e recusas para eventual cram down (art. 58 LRF).",

  COLABORATIVO:
    "Com o colaborativo: (1) Compartilhe informacoes estrategicas sobre a situacao financeira " +
    "do devedor para construir confianca; (2) Explore opcoes criativas conjuntamente — " +
    "debt-for-equity, contingent value rights, warrants; (3) Convide-o para integrar o comite " +
    "de credores; (4) Use-o como mediador informal com credores mais resistentes; " +
    "(5) Formalize acordos rapido para criar precedente positivo na negociacao coletiva.",

  COMPROMISSO:
    "Com o compromisso: (1) Va direto ao ponto com proposta concreta dentro da ZOPA; " +
    "(2) Ofereca concessoes condicionais escalonadas; (3) Use comparativos de mercado " +
    "para demonstrar razoabilidade; (4) Mantenha agilidade no processo — esse perfil " +
    "perde interesse em negociacoes longas; (5) Feche acordo intermediario rapido e " +
    "use como benchmark para negociacoes subsequentes.",

  EVASIVO:
    "Com o evasivo: (1) Simplifique toda comunicacao — resumos de 1 pagina, opcoes " +
    "claras A/B/C com deadline; (2) Ofereca procuracao padrao para representacao na " +
    "assembleia; (3) Envie notificacoes formais com AR para criar registro de ciencia; " +
    "(4) Alerte sobre consequencias legais da inacao (sujeicao ao plano aprovado); " +
    "(5) Considere abordagem via representante legal ou associacao de classe do credor.",

  ACOMODADO:
    "Com o acomodado: (1) Nao explore excessivamente a disposicao a ceder — isso " +
    "gera ressentimento futuro e pode invalidar acordos; (2) Ofereca condicoes justas " +
    "que possam ser apresentadas como exemplo de 'ganha-ganha'; (3) Peca apoio ativo " +
    "na coalizao de credores — pedido de voto, assinatura em peticoes conjuntas; " +
    "(4) Reconheca publicamente a cooperacao (carta de agradecimento, mencao em AGC); " +
    "(5) Priorize o pagamento desse credor para reforcar o relacionamento comercial.",
};

// ============================================================
// 6. Chris Voss / FBI Negotiator Types
// ============================================================

export const VOSS_NEGOTIATOR_LABELS: Record<string, string> = {
  ASSERTIVO: "Assertivo",
  ANALISTA: "Analista",
  ACOMODADOR: "Acomodador",
};

export const VOSS_NEGOTIATOR_COLORS: Record<string, string> = {
  ASSERTIVO: "bg-red-100 text-red-700",
  ANALISTA: "bg-blue-100 text-blue-700",
  ACOMODADOR: "bg-emerald-100 text-emerald-700",
};

export const VOSS_NEGOTIATOR_DESCRIPTIONS: Record<string, string> = {
  ASSERTIVO:
    "O Assertivo (conforme tipologia de Chris Voss) valoriza tempo acima de tudo e " +
    "quer ser ouvido antes de ouvir. Em negociacoes de recuperacao judicial, esse credor " +
    "fara demandas diretas, estabelecera posicoes rigidas rapidamente e interpretara " +
    "silencio como concordancia. Nao responde bem a perguntas abertas no inicio — precisa " +
    "primeiro sentir que seu ponto foi reconhecido. Adaptacao de comunicacao: use espelhamento " +
    "('Entao o senhor precisa receber pelo menos X ate Y...'), rotulagem de emocoes " +
    "('Parece que essa situacao tem causado preocupacao significativa para sua empresa...'), " +
    "e auditoria de acusacoes antes de qualquer proposta. Fale com objetividade, use numeros " +
    "e evite rodeios. Resumos executivos curtos funcionam melhor que relatorios longos.",

  ANALISTA:
    "O Analista (Voss) e metodico, reservado e orientado a dados. Precisa de tempo para " +
    "processar informacoes e nao gosta de ser pressionado. Em RJ, esse credor vai analisar " +
    "minuciosamente o plano, questionar premissas financeiras, pedir laudos e projecoes " +
    "detalhadas e demorar para dar resposta. Adaptacao de comunicacao: envie dados antecipadamente " +
    "(planilhas de fluxo de caixa, laudos de avaliacao, comparativo com falencia), respeite " +
    "o tempo de analise, evite taticas de urgencia artificial, use linguagem tecnica precisa, " +
    "e prefira comunicacao escrita (e-mail, memorandos) em vez de telefonemas. Perguntas " +
    "calibradas do tipo 'Como voce ve...' funcionam bem para extrair preocupacoes sem " +
    "criar confronto.",

  ACOMODADOR:
    "O Acomodador (Voss) prioriza relacionamentos e busca harmonia. Quer se sentir valorizado " +
    "e ouvido antes de tratar de numeros. Em RJ, esse credor sera receptivo a reunioes, " +
    "aceitara convites para dialogar, mas pode prometer coisas que nao cumprira para evitar " +
    "conflito no momento. Cuidado: um 'sim' do Acomodador pode nao ser um compromisso real. " +
    "Adaptacao de comunicacao: invista tempo em rapport, use perguntas abertas sobre a situacao " +
    "dele ('Como posso facilitar esse processo para voces?'), reconheca o impacto da RJ no " +
    "relacionamento comercial, proponha reunioes presenciais, e formalize tudo por escrito " +
    "apos acordos verbais. Use perguntas de implementacao ('Como vamos garantir que isso " +
    "funcione?') para testar se o compromisso e real.",
};

// ============================================================
// 7. Game Theory
// ============================================================

export const GAME_TYPE_LABELS: Record<string, string> = {
  SOMA_ZERO: "Soma Zero",
  SOMA_POSITIVA: "Soma Positiva",
  SOMA_NEGATIVA: "Soma Negativa",
  SEQUENCIAL: "Sequencial",
  SIMULTANEO: "Simultaneo",
  REPETIDO: "Repetido",
};

export const GAME_TYPE_COLORS: Record<string, string> = {
  SOMA_ZERO: "bg-red-100 text-red-700",
  SOMA_POSITIVA: "bg-emerald-100 text-emerald-700",
  SOMA_NEGATIVA: "bg-gray-100 text-gray-600",
  SEQUENCIAL: "bg-blue-100 text-blue-700",
  SIMULTANEO: "bg-purple-100 text-purple-700",
  REPETIDO: "bg-amber-100 text-amber-700",
};

export const GAME_EQUILIBRIUM_LABELS: Record<string, string> = {
  NASH: "Equilibrio de Nash",
  PARETO: "Otimo de Pareto",
  DOMINANTE: "Estrategia Dominante",
  MISTO: "Equilibrio Misto",
  STACKELBERG: "Equilibrio de Stackelberg",
  COOPERATIVO: "Solucao Cooperativa",
};

export const GAME_EQUILIBRIUM_COLORS: Record<string, string> = {
  NASH: "bg-blue-100 text-blue-700",
  PARETO: "bg-emerald-100 text-emerald-700",
  DOMINANTE: "bg-indigo-100 text-indigo-700",
  MISTO: "bg-purple-100 text-purple-700",
  STACKELBERG: "bg-amber-100 text-amber-700",
  COOPERATIVO: "bg-teal-100 text-teal-700",
};

export const GAME_COALITION_LABELS: Record<string, string> = {
  FAVORAVEL: "Coalizao Favoravel",
  NEUTRA: "Coalizao Neutra",
  CONTRARIA: "Coalizao Contraria",
  SWING: "Swing (Decisivo)",
  ISOLADO: "Isolado",
};

export const GAME_COALITION_COLORS: Record<string, string> = {
  FAVORAVEL: "bg-emerald-100 text-emerald-700",
  NEUTRA: "bg-gray-100 text-gray-600",
  CONTRARIA: "bg-red-100 text-red-700",
  SWING: "bg-amber-100 text-amber-700 border-amber-300",
  ISOLADO: "bg-slate-100 text-slate-600",
};

// ============================================================
// 8. Event Types (Timeline)
// ============================================================

export const EVENT_TYPE_LABELS: Record<string, string> = {
  REUNIAO: "Reuniao",
  TELEFONEMA: "Telefonema",
  EMAIL: "E-mail",
  PROPOSTA: "Proposta",
  CONTRAPROPOSTA: "Contraproposta",
  ACORDO: "Acordo",
  IMPASSE: "Impasse",
  NOTIFICACAO: "Notificacao",
  DECISAO_JUDICIAL: "Decisao Judicial",
  ASSEMBLEIA: "Assembleia",
  MEDIACAO: "Mediacao",
  ANALISE_IA: "Analise IA",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  REUNIAO: "#3B82F6",
  TELEFONEMA: "#06B6D4",
  EMAIL: "#8B5CF6",
  PROPOSTA: "#C9A961",
  CONTRAPROPOSTA: "#F59E0B",
  ACORDO: "#10B981",
  IMPASSE: "#EF4444",
  NOTIFICACAO: "#6366F1",
  DECISAO_JUDICIAL: "#DC2626",
  ASSEMBLEIA: "#7C3AED",
  MEDIACAO: "#14B8A6",
  ANALISE_IA: "#0EA5E9",
};

export const EVENT_TYPE_BG_COLORS: Record<string, string> = {
  REUNIAO: "bg-blue-100 text-blue-700",
  TELEFONEMA: "bg-cyan-100 text-cyan-700",
  EMAIL: "bg-violet-100 text-violet-700",
  PROPOSTA: "bg-yellow-50 text-yellow-800 border-yellow-300",
  CONTRAPROPOSTA: "bg-amber-100 text-amber-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
  IMPASSE: "bg-red-100 text-red-700",
  NOTIFICACAO: "bg-indigo-100 text-indigo-700",
  DECISAO_JUDICIAL: "bg-red-50 text-red-800",
  ASSEMBLEIA: "bg-purple-100 text-purple-700",
  MEDIACAO: "bg-teal-100 text-teal-700",
  ANALISE_IA: "bg-sky-100 text-sky-700",
};

// ============================================================
// 9. Communication Channel
// ============================================================

export const EVENT_CHANNEL_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIDEO: "Videoconferencia",
  TELEFONE: "Telefone",
  EMAIL_CANAL: "E-mail",
  WHATSAPP: "WhatsApp",
  CARTA: "Carta / AR",
  OFICIO: "Oficio",
};

// ============================================================
// 10. Sentiment
// ============================================================

export const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVO: "Positivo",
  NEUTRO: "Neutro",
  NEGATIVO: "Negativo",
  HOSTIL: "Hostil",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVO: "#10B981",
  NEUTRO: "#9CA3AF",
  NEGATIVO: "#F97316",
  HOSTIL: "#EF4444",
};

export const SENTIMENT_BG_COLORS: Record<string, string> = {
  POSITIVO: "bg-emerald-100 text-emerald-700",
  NEUTRO: "bg-gray-100 text-gray-600",
  NEGATIVO: "bg-orange-100 text-orange-700",
  HOSTIL: "bg-red-100 text-red-700",
};

// ============================================================
// 11. Proposal Origin & Status
// ============================================================

export const PROPOSAL_ORIGIN_LABELS: Record<string, string> = {
  DEVEDOR: "Devedor",
  CREDOR: "Credor",
  COMITE: "Comite de Credores",
  MEDIADOR: "Mediador",
  AJ: "Administrador Judicial",
  JUIZO: "Juizo",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em Analise",
  ACEITA: "Aceita",
  REJEITADA: "Rejeitada",
  CONTRAPROPOSTA: "Contraproposta",
  EXPIRADA: "Expirada",
  RETIRADA: "Retirada",
};

export const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-gray-100 text-gray-600",
  ENVIADA: "bg-blue-100 text-blue-700",
  RECEBIDA: "bg-indigo-100 text-indigo-700",
  EM_ANALISE: "bg-amber-100 text-amber-700",
  ACEITA: "bg-emerald-100 text-emerald-700",
  REJEITADA: "bg-red-100 text-red-700",
  CONTRAPROPOSTA: "bg-purple-100 text-purple-700",
  EXPIRADA: "bg-gray-200 text-gray-500",
  RETIRADA: "bg-slate-100 text-slate-500",
};

// ============================================================
// 12. Concession Direction
// ============================================================

export const CONCESSION_DIRECTION_LABELS: Record<string, string> = {
  DEVEDOR_PARA_CREDOR: "Concessao do Devedor ao Credor",
  CREDOR_PARA_DEVEDOR: "Concessao do Credor ao Devedor",
  RECIPROCA: "Concessao Reciproca",
};

// ============================================================
// 13. Negotiation Round Status
// ============================================================

export const ROUND_STATUS_LABELS: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em Andamento",
  AGUARDANDO_RESPOSTA: "Aguardando Resposta",
  CONCLUIDA: "Concluida",
  CANCELADA: "Cancelada",
};

export const ROUND_STATUS_COLORS: Record<string, string> = {
  ABERTA: "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-indigo-100 text-indigo-700",
  AGUARDANDO_RESPOSTA: "bg-amber-100 text-amber-700",
  CONCLUIDA: "bg-emerald-100 text-emerald-700",
  CANCELADA: "bg-red-100 text-red-700",
};

// ============================================================
// 14. Risk Level
// ============================================================

export const RISK_LEVEL_LABELS: Record<string, string> = {
  BAIXO: "Baixo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Critico",
};

export const RISK_LEVEL_COLORS: Record<string, string> = {
  BAIXO: "bg-emerald-100 text-emerald-700",
  MEDIO: "bg-amber-100 text-amber-700",
  ALTO: "bg-orange-100 text-orange-700",
  CRITICO: "bg-red-100 text-red-700",
};

export const RISK_LEVEL_HEX: Record<string, string> = {
  BAIXO: "#10B981",
  MEDIO: "#F59E0B",
  ALTO: "#F97316",
  CRITICO: "#EF4444",
};

// ============================================================
// 15. Harvard Interest Types
// ============================================================

export const HARVARD_INTEREST_TYPES: Record<string, string> = {
  SUBSTANTIVO: "Substantivo",
  PROCEDIMENTAL: "Procedimental",
  PSICOLOGICO: "Psicologico",
  RELACIONAL: "Relacional",
};

export const HARVARD_INTEREST_DESCRIPTIONS: Record<string, string> = {
  SUBSTANTIVO:
    "Interesses tangiveis e mensuraveis: valor do credito, prazo de pagamento, taxa de desconto, " +
    "garantias reais, prioridade de pagamento.",
  PROCEDIMENTAL:
    "Interesses sobre o processo de negociacao em si: transparencia, participacao nas decisoes, " +
    "acesso a informacoes, regularidade das comunicacoes, formato das assembleias.",
  PSICOLOGICO:
    "Interesses emocionais e de reconhecimento: sentir-se respeitado, ter suas perdas reconhecidas, " +
    "obter pedido de desculpas formal, ser tratado com dignidade no processo.",
  RELACIONAL:
    "Interesses sobre o futuro da relacao comercial: manutencao do fornecimento, exclusividade, " +
    "participacao societaria, contratos futuros, continuidade da parceria.",
};

export const HARVARD_INTEREST_COLORS: Record<string, string> = {
  SUBSTANTIVO: "bg-blue-100 text-blue-700 border-blue-200",
  PROCEDIMENTAL: "bg-purple-100 text-purple-700 border-purple-200",
  PSICOLOGICO: "bg-amber-100 text-amber-700 border-amber-200",
  RELACIONAL: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ============================================================
// 16. BATNA Alternatives — Devedor
// ============================================================

export const BATNA_ALTERNATIVES_DEVEDOR: { value: string; label: string }[] = [
  { value: "CRAMDOWN_ART58", label: "Cram down (art. 58 LRF) — aprovacao forcada pelo juizo" },
  { value: "LIQUIDACAO", label: "Liquidacao de ativos nao essenciais" },
  { value: "FINANCIAMENTO_ALTERNATIVO", label: "Financiamento alternativo (DIP ou terceiro)" },
  { value: "VENDA_ATIVO", label: "Venda de ativo estrategico (art. 66 LRF)" },
  { value: "DIP_FINANCING", label: "DIP financing — financiamento durante a RJ" },
  { value: "CONVERSAO_FALENCIA", label: "Conversao em falencia (pior cenario)" },
];

// ============================================================
// 17. BATNA Alternatives — Credor
// ============================================================

export const BATNA_ALTERNATIVES_CREDOR: { value: string; label: string }[] = [
  { value: "EXECUTAR_GARANTIA", label: "Executar garantia real (acao propria)" },
  { value: "BUSCA_APREENSAO", label: "Busca e apreensao (alienacao fiduciaria)" },
  { value: "VENDER_CREDITO", label: "Vender credito a fundo distressed" },
  { value: "VOTAR_CONTRA", label: "Votar contra o plano de recuperacao" },
  { value: "PEDIR_FALENCIA", label: "Pedir falencia do devedor (art. 73 LRF)" },
  { value: "PROTESTAR", label: "Protestar titulo e negativar devedor" },
];

// ============================================================
// 18. Creative Options Templates
// ============================================================

export interface CreativeOptionField {
  name: string;
  label: string;
  type: "number" | "text" | "date" | "percent" | "select";
}

export interface CreativeOptionTemplate {
  id: string;
  label: string;
  description: string;
  fields: CreativeOptionField[];
}

export const CREATIVE_OPTIONS_TEMPLATES: CreativeOptionTemplate[] = [
  {
    id: "extensao_prazo",
    label: "Extensao de Prazo",
    description:
      "Ampliacao do prazo de pagamento com manutencao ou reducao do valor nominal. " +
      "Comum em RJ para aliviar fluxo de caixa do devedor nos primeiros anos.",
    fields: [
      { name: "prazo_original_meses", label: "Prazo original (meses)", type: "number" },
      { name: "prazo_proposto_meses", label: "Prazo proposto (meses)", type: "number" },
      { name: "carencia_meses", label: "Carencia (meses)", type: "number" },
      { name: "indexador", label: "Indexador", type: "select" },
    ],
  },
  {
    id: "reducao_juros",
    label: "Reducao de Juros",
    description:
      "Reducao da taxa de juros incidente sobre o credito. Pode envolver troca de indexador " +
      "(ex: CDI para TR) ou eliminacao de juros moratorios e multa.",
    fields: [
      { name: "taxa_original", label: "Taxa original (% a.a.)", type: "percent" },
      { name: "taxa_proposta", label: "Taxa proposta (% a.a.)", type: "percent" },
      { name: "indexador_original", label: "Indexador original", type: "text" },
      { name: "indexador_proposto", label: "Indexador proposto", type: "select" },
    ],
  },
  {
    id: "carencia",
    label: "Periodo de Carencia",
    description:
      "Periodo inicial sem pagamento de principal e/ou juros. Permite que o devedor " +
      "estabilize operacoes antes de iniciar amortizacao.",
    fields: [
      { name: "carencia_principal_meses", label: "Carencia do principal (meses)", type: "number" },
      { name: "carencia_juros_meses", label: "Carencia dos juros (meses)", type: "number" },
      { name: "juros_capitalizados", label: "Juros capitalizados na carencia?", type: "select" },
    ],
  },
  {
    id: "haircut",
    label: "Haircut (Desagio)",
    description:
      "Reducao do valor nominal do credito. Aplicavel especialmente a creditos quirografarios " +
      "e ME/EPP. O haircut medio em RJs brasileiras varia de 40% a 70%.",
    fields: [
      { name: "valor_original", label: "Valor original (R$)", type: "number" },
      { name: "percentual_haircut", label: "Haircut (%)", type: "percent" },
      { name: "valor_resultante", label: "Valor resultante (R$)", type: "number" },
      { name: "condicao", label: "Condicao para haircut", type: "text" },
    ],
  },
  {
    id: "debt_for_equity",
    label: "Debt-for-Equity Swap",
    description:
      "Conversao de parte ou totalidade do credito em participacao societaria no devedor. " +
      "Previsto no art. 50, II da LRF. Alinha interesses do credor com a recuperacao.",
    fields: [
      { name: "valor_credito_convertido", label: "Valor do credito convertido (R$)", type: "number" },
      { name: "percentual_equity", label: "Participacao societaria (%)", type: "percent" },
      { name: "tipo_acao", label: "Tipo de participacao", type: "text" },
      { name: "lock_up_meses", label: "Lock-up (meses)", type: "number" },
    ],
  },
  {
    id: "warrants",
    label: "Warrants / Opcoes",
    description:
      "Direito de adquirir participacao societaria no futuro a preco predeterminado. " +
      "Complemento ao haircut — se a empresa se recuperar, o credor captura upside.",
    fields: [
      { name: "quantidade_warrants", label: "Quantidade de warrants", type: "number" },
      { name: "preco_exercicio", label: "Preco de exercicio (R$)", type: "number" },
      { name: "prazo_exercicio_meses", label: "Prazo para exercicio (meses)", type: "number" },
      { name: "percentual_diluicao_max", label: "Diluicao maxima (%)", type: "percent" },
    ],
  },
  {
    id: "pik_toggle",
    label: "PIK Toggle (Payment-in-Kind)",
    description:
      "Opcao de pagar juros em especie (adicionando ao principal) em vez de caixa nos " +
      "periodos de dificuldade. Alivia fluxo de caixa mantendo o valor do credito.",
    fields: [
      { name: "taxa_pik", label: "Taxa PIK (% a.a.)", type: "percent" },
      { name: "periodos_pik_max", label: "Periodos PIK maximos", type: "number" },
      { name: "condicao_ativacao", label: "Condicao para ativacao", type: "text" },
    ],
  },
  {
    id: "contingent_value",
    label: "Contingent Value Rights (CVR)",
    description:
      "Pagamento adicional condicionado a metricas de desempenho futuro do devedor " +
      "(EBITDA, receita, venda de ativos). Fecha gap entre expectativas do credor e devedor.",
    fields: [
      { name: "metrica_gatilho", label: "Metrica gatilho", type: "text" },
      { name: "valor_gatilho", label: "Valor gatilho (R$)", type: "number" },
      { name: "pagamento_adicional", label: "Pagamento adicional (R$)", type: "number" },
      { name: "prazo_vigencia_meses", label: "Vigencia (meses)", type: "number" },
    ],
  },
  {
    id: "dacao_pagamento",
    label: "Dacao em Pagamento",
    description:
      "Entrega de ativo (imovel, equipamento, estoque, recebiveis) em substituicao ao pagamento " +
      "em dinheiro. Previsto no art. 50, I da LRF. Requer avaliacao judicial do bem.",
    fields: [
      { name: "descricao_bem", label: "Descricao do bem", type: "text" },
      { name: "valor_avaliacao", label: "Valor de avaliacao (R$)", type: "number" },
      { name: "valor_credito_quitado", label: "Valor do credito quitado (R$)", type: "number" },
      { name: "laudo_avaliacao", label: "Laudo de avaliacao", type: "text" },
    ],
  },
  {
    id: "cessao_recebiveis",
    label: "Cessao de Recebiveis",
    description:
      "Cessao de direitos creditorios futuros (duplicatas, contratos, alugueis) como forma " +
      "de pagamento. Pode incluir estrutura de cessao fiduciaria como garantia.",
    fields: [
      { name: "tipo_recebiveis", label: "Tipo de recebiveis", type: "text" },
      { name: "valor_mensal_estimado", label: "Valor mensal estimado (R$)", type: "number" },
      { name: "prazo_cessao_meses", label: "Prazo da cessao (meses)", type: "number" },
      { name: "percentual_recebiveis", label: "Percentual dos recebiveis (%)", type: "percent" },
    ],
  },
];

// ============================================================
// 19. Recovery Rate Benchmarks (Moody's averages)
// ============================================================

export const RECOVERY_RATE_BENCHMARKS: Record<string, number> = {
  secured_1st_lien: 77,
  unsecured: 47,
  subordinated: 28,
  equity: 5,
};

export const RECOVERY_RATE_BENCHMARK_LABELS: Record<string, string> = {
  secured_1st_lien: "Garantia Real (1o Grau)",
  unsecured: "Quirografario",
  subordinated: "Subordinado",
  equity: "Equity",
};

// ============================================================
// 20. Helper Functions
// ============================================================

/**
 * Formats BigInt centavos to BRL currency string.
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
 * Generates a negotiation code in the format NEG-YYYY-NNN.
 * Example: generateNegCode(42) => "NEG-2026-042"
 */
export function generateNegCode(sequentialNumber: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequentialNumber).padStart(3, "0");
  return `NEG-${year}-${seq}`;
}

/**
 * Calculates the Ackerman bargaining sequence (Chris Voss method).
 * Returns [65%, 85%, 95%, 100%] of the target value, with non-round numbers
 * (random cents added to make values appear precisely calculated).
 *
 * Example: calculateAckermanSequence(100000) => [65217.43, 85091.67, 95173.29, 100000]
 */
export function calculateAckermanSequence(target: number): number[] {
  const percentages = [0.65, 0.85, 0.95, 1.0];

  return percentages.map((pct, index) => {
    const base = target * pct;
    if (index === percentages.length - 1) {
      // Final offer is the exact target
      return target;
    }
    // Add non-round cents to make it look precisely calculated
    // Use a deterministic pseudo-random offset based on target and index
    const seed = Math.abs(Math.sin(target * (index + 1) * 9.8765)) * 100;
    const centOffset = Math.floor(seed) / 100;
    const result = Math.floor(base) + centOffset;
    // Ensure the value is not a round number
    const rounded = parseFloat(result.toFixed(2));
    if (rounded % 1 === 0) {
      return rounded + 0.37 + index * 0.12;
    }
    return rounded;
  });
}

/**
 * Calculates a BATNA score considering value, probability of success, and time cost.
 * Higher score = stronger BATNA.
 *
 * Formula: (valor * probabilidade) / (1 + tempoMeses * 0.02)
 * The time discount factor (0.02 per month) reflects the cost of delay in RJ proceedings.
 *
 * Example: calculateBATNAScore(1000000, 0.7, 24) => ~472972.97
 */
export function calculateBATNAScore(
  valor: number,
  probabilidade: number,
  tempoMeses: number,
): number {
  if (valor <= 0 || probabilidade <= 0) return 0;
  const clampedProb = Math.min(Math.max(probabilidade, 0), 1);
  const timeDiscount = 1 + tempoMeses * 0.02;
  return parseFloat(((valor * clampedProb) / timeDiscount).toFixed(2));
}

/**
 * Calculates a priority score for creditor negotiation ranking.
 * Used to determine the order in which creditors should be engaged.
 *
 * Inputs (all 0-100 scale except valor which is in reais):
 * - valor: total credit value (higher = more important)
 * - pesoVoto: voting weight percentage in the creditor class (higher = more critical)
 * - riscoHoldout: risk that this creditor will block the plan (higher = more urgent)
 * - cooperatividade: how cooperative the creditor is (higher = easier to negotiate)
 *
 * Formula: (normalizedValor * 0.3) + (pesoVoto * 0.3) + (riscoHoldout * 0.25) + ((100 - cooperatividade) * 0.15)
 * Non-cooperative creditors with high value and voting weight get highest priority.
 */
export function calculatePriorityScore(
  valor: number,
  pesoVoto: number,
  riscoHoldout: number,
  cooperatividade: number,
): number {
  // Normalize valor to 0-100 scale (log scale for better distribution)
  const normalizedValor = valor > 0 ? Math.min(Math.log10(valor) * 10, 100) : 0;
  const clamp = (v: number) => Math.min(Math.max(v, 0), 100);

  const score =
    clamp(normalizedValor) * 0.3 +
    clamp(pesoVoto) * 0.3 +
    clamp(riscoHoldout) * 0.25 +
    clamp(100 - cooperatividade) * 0.15;

  return parseFloat(score.toFixed(2));
}

/**
 * Format a value to abbreviated BRL for compact display.
 * Example: 42000000 -> "R$ 42M", 5200000 -> "R$ 5,2M", 850000 -> "R$ 850K"
 * Accepts BigInt centavos or number in reais.
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
