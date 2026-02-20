/**
 * Team Management — UI Labels & Constants
 *
 * Centralises human-readable labels, descriptions, colours and icons for every
 * enum value used by the Team Management module.  Import from here in dropdowns,
 * badges, radar charts, and any other presentational layer.
 *
 * All labels are in Brazilian Portuguese, as required by the UI convention.
 *
 * Enums covered (defined in prisma/schema.prisma):
 *   LegalCompetency, TeamRole, OKRCategory, FeedbackType,
 *   ComplaintCategory, RecognitionCategory, BurnoutRisk,
 *   SurveyType
 *
 * Additional exported constants:
 *   NINE_BOX_CONFIG   — nine-box grid positions (string keys, not a Prisma enum)
 *   GALLUP_Q12        — pre-loaded questions for CLIMA surveys
 */

// ─────────────────────────────────────────────────────────────────────────────
// LegalCompetency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All 12 legal competencies with display label, tooltip description, and a
 * Tailwind-compatible hex colour suitable for radar charts and badges.
 *
 * Enum values (prisma):
 *   TECNICA_JURIDICA | COMUNICACAO_CLIENTE | NEGOCIACAO | GESTAO_PRAZOS |
 *   REDACAO_JURIDICA | ORATORIA_AUDIENCIA | PESQUISA_JURISPRUDENCIAL |
 *   BUSINESS_DEVELOPMENT | TRABALHO_EQUIPE | LIDERANCA |
 *   COMPETENCIA_TECNOLOGICA | ETICA_PROFISSIONAL
 */
export const LEGAL_COMPETENCY_LABELS: Record<
  string,
  { label: string; description: string; color: string }
> = {
  TECNICA_JURIDICA: {
    label: 'Técnica Jurídica',
    description: 'Domínio do direito material e processual aplicável à área de atuação',
    color: '#3B82F6', // blue-500
  },
  COMUNICACAO_CLIENTE: {
    label: 'Comunicação com Cliente',
    description: 'Clareza, empatia e assertividade na relação com o cliente',
    color: '#10B981', // emerald-500
  },
  NEGOCIACAO: {
    label: 'Negociação',
    description: 'Capacidade de conduzir negociações e alcançar acordos favoráveis',
    color: '#F59E0B', // amber-500
  },
  GESTAO_PRAZOS: {
    label: 'Gestão de Prazos',
    description: 'Controle rigoroso de prazos processuais e gerenciais, antecipação de riscos',
    color: '#EF4444', // red-500
  },
  REDACAO_JURIDICA: {
    label: 'Redação Jurídica',
    description: 'Qualidade técnica e clareza na elaboração de peças e documentos jurídicos',
    color: '#8B5CF6', // violet-500
  },
  ORATORIA_AUDIENCIA: {
    label: 'Oratória em Audiência',
    description: 'Desempenho em sustentações, audiências e despachos orais',
    color: '#EC4899', // pink-500
  },
  PESQUISA_JURISPRUDENCIAL: {
    label: 'Pesquisa Jurisprudencial',
    description: 'Habilidade de localizar, analisar e aplicar jurisprudência e doutrina',
    color: '#06B6D4', // cyan-500
  },
  BUSINESS_DEVELOPMENT: {
    label: 'Desenvolvimento de Negócios',
    description: 'Captação de clientes, relacionamento estratégico e geração de receita',
    color: '#84CC16', // lime-500
  },
  TRABALHO_EQUIPE: {
    label: 'Trabalho em Equipe',
    description: 'Colaboração, comunicação interna e suporte aos colegas',
    color: '#14B8A6', // teal-500
  },
  LIDERANCA: {
    label: 'Liderança',
    description: 'Influência positiva, desenvolvimento de pessoas e tomada de decisão',
    color: '#F97316', // orange-500
  },
  COMPETENCIA_TECNOLOGICA: {
    label: 'Competência Tecnológica',
    description: 'Domínio das ferramentas digitais, sistemas e recursos de IA disponíveis',
    color: '#6366F1', // indigo-500
  },
  ETICA_PROFISSIONAL: {
    label: 'Ética Profissional',
    description: 'Conduta íntegra, sigilo profissional e observância das normas da OAB',
    color: '#0EA5E9', // sky-500
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TeamRole
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable labels for every TeamRole.
 *
 * Enum values (prisma):
 *   SOCIO | ADVOGADO_SENIOR | ADVOGADO_PLENO | ADVOGADO_JUNIOR |
 *   ESTAGIARIO | PARALEGAL | ADMINISTRATIVO
 */
export const TEAM_ROLE_LABELS: Record<string, string> = {
  SOCIO: 'Sócio',
  ADVOGADO_SENIOR: 'Advogado Sênior',
  ADVOGADO_PLENO: 'Advogado Pleno',
  ADVOGADO_JUNIOR: 'Advogado Júnior',
  ESTAGIARIO: 'Estagiário',
  PARALEGAL: 'Paralegal',
  ADMINISTRATIVO: 'Administrativo',
};

// ─────────────────────────────────────────────────────────────────────────────
// OKRCategory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels for each OKR category used when creating Objectives.
 *
 * Enum values (prisma):
 *   PRODUTIVIDADE | QUALIDADE | CAPTACAO | DESENVOLVIMENTO |
 *   FINANCEIRO | OPERACIONAL
 */
export const OKR_CATEGORY_LABELS: Record<string, string> = {
  PRODUTIVIDADE: 'Produtividade',
  QUALIDADE: 'Qualidade',
  CAPTACAO: 'Captação de Clientes',
  DESENVOLVIMENTO: 'Desenvolvimento Profissional',
  FINANCEIRO: 'Financeiro',
  OPERACIONAL: 'Operacional',
};

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackType
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Display config for each type of feedback, including a UI colour and a
 * Lucide-compatible icon name.
 *
 * Enum values (prisma):
 *   POSITIVO | CONSTRUTIVO | FEEDFORWARD | RECONHECIMENTO
 */
export const FEEDBACK_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  POSITIVO: {
    label: 'Positivo',
    color: '#10B981', // emerald-500
    icon: 'ThumbsUp',
  },
  CONSTRUTIVO: {
    label: 'Construtivo',
    color: '#F59E0B', // amber-500
    icon: 'Wrench',
  },
  FEEDFORWARD: {
    label: 'Feedforward',
    color: '#3B82F6', // blue-500
    icon: 'TrendingUp',
  },
  RECONHECIMENTO: {
    label: 'Reconhecimento',
    color: '#EC4899', // pink-500
    icon: 'Star',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ComplaintCategory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels for the anonymous complaint / suggestion channel categories.
 *
 * Enum values (prisma):
 *   ASSEDIO_MORAL | ASSEDIO_SEXUAL | DISCRIMINACAO | DESVIO_ETICO |
 *   CONFLITO_INTERESSES | IRREGULARIDADE_FINANCEIRA | CONDICOES_TRABALHO |
 *   RELACAO_INTERPESSOAL | SUGESTAO_MELHORIA | ELOGIO | OUTRO_COMPLAINT
 */
export const COMPLAINT_CATEGORY_LABELS: Record<string, string> = {
  ASSEDIO_MORAL: 'Assédio Moral',
  ASSEDIO_SEXUAL: 'Assédio Sexual',
  DISCRIMINACAO: 'Discriminação',
  DESVIO_ETICO: 'Desvio Ético',
  CONFLITO_INTERESSES: 'Conflito de Interesses',
  IRREGULARIDADE_FINANCEIRA: 'Irregularidade Financeira',
  CONDICOES_TRABALHO: 'Condições de Trabalho',
  RELACAO_INTERPESSOAL: 'Relação Interpessoal',
  SUGESTAO_MELHORIA: 'Sugestão de Melhoria',
  ELOGIO: 'Elogio',
  OUTRO_COMPLAINT: 'Outro',
};

// ─────────────────────────────────────────────────────────────────────────────
// RecognitionCategory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels and emoji for each recognition badge category.
 *
 * Enum values (prisma):
 *   HIGH_FIVE | STAR_OF_WEEK | MILESTONE_REC | CLIENT_PRAISE |
 *   INNOVATION | MENTORSHIP
 */
export const RECOGNITION_CATEGORY_LABELS: Record<
  string,
  { label: string; emoji: string }
> = {
  HIGH_FIVE: {
    label: 'High Five',
    emoji: '🙌',
  },
  STAR_OF_WEEK: {
    label: 'Estrela da Semana',
    emoji: '⭐',
  },
  MILESTONE_REC: {
    label: 'Marco Alcançado',
    emoji: '🏆',
  },
  CLIENT_PRAISE: {
    label: 'Elogio do Cliente',
    emoji: '💬',
  },
  INNOVATION: {
    label: 'Inovação',
    emoji: '💡',
  },
  MENTORSHIP: {
    label: 'Mentoria',
    emoji: '🎓',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BurnoutRisk
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Display config for each burnout risk level shown on the wellbeing dashboard.
 *
 * Enum values (prisma):
 *   LOW | MODERATE | HIGH | CRITICAL
 */
export const BURNOUT_RISK_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: {
    label: 'Baixo',
    color: '#10B981', // emerald-500
  },
  MODERATE: {
    label: 'Moderado',
    color: '#F59E0B', // amber-500
  },
  HIGH: {
    label: 'Alto',
    color: '#F97316', // orange-500
  },
  CRITICAL: {
    label: 'Crítico',
    color: '#EF4444', // red-500
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Nine-Box Grid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nine-box grid positions used in talent calibration.
 *
 * The `nineBoxPosition` field on Review360Participant is stored as a free
 * string (not a Prisma enum), so keys here follow the standard 1-9 notation
 * where the number encodes (performance, potential) on a 3x3 grid:
 *
 *   Low Perf    Med Perf    High Perf
 *   ─────────────────────────────────
 *   7 Enigma  | 8 Alto Pot | 9 Estrela        ← High Potential
 *   4 Efic.   | 5 Chave    | 6 Fut. Líder     ← Med Potential
 *   1 Questão | 2 Sólido   | 3 Especialista   ← Low Potential
 */
export const NINE_BOX_CONFIG: Record<
  string,
  { label: string; color: string; description: string }
> = {
  '1': {
    label: 'Questão',
    color: '#EF4444', // red-500
    description:
      'Baixo desempenho e baixo potencial — requer plano de melhoria urgente ou desligamento',
  },
  '2': {
    label: 'Sólido',
    color: '#F97316', // orange-500
    description:
      'Desempenho médio e baixo potencial — contribui de forma estável, com crescimento limitado',
  },
  '3': {
    label: 'Especialista',
    color: '#F59E0B', // amber-500
    description:
      'Alto desempenho e baixo potencial — excelente no papel atual, valorizado como especialista',
  },
  '4': {
    label: 'Eficiente',
    color: '#84CC16', // lime-500
    description:
      'Baixo desempenho e médio potencial — ainda não entregou o esperado, mas há capacidade de crescimento',
  },
  '5': {
    label: 'Chave',
    color: '#10B981', // emerald-500
    description:
      'Desempenho e potencial médios — profissional sólido, pilar da equipe',
  },
  '6': {
    label: 'Futuro Líder',
    color: '#14B8A6', // teal-500
    description:
      'Alto desempenho e médio potencial — entrega consistente e perspectiva de liderança',
  },
  '7': {
    label: 'Enigma',
    color: '#6366F1', // indigo-500
    description:
      'Baixo desempenho e alto potencial — grande capacidade ainda não explorada; verificar causas',
  },
  '8': {
    label: 'Alto Potencial',
    color: '#8B5CF6', // violet-500
    description:
      'Desempenho médio e alto potencial — em ascensão rápida, prioridade para desenvolvimento',
  },
  '9': {
    label: 'Estrela',
    color: '#EC4899', // pink-500
    description:
      'Alto desempenho e alto potencial — talento excepcional, foco em retenção e expansão de responsabilidades',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SurveyType
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable labels for each survey type.
 *
 * Enum values (prisma):
 *   PULSE | ENPS | CLIMA | CUSTOM_SURVEY | ONBOARDING_SURVEY | EXIT_SURVEY
 */
export const SURVEY_TYPE_LABELS: Record<string, string> = {
  PULSE: 'Pesquisa Pulse',
  ENPS: 'eNPS — Net Promoter Score do Colaborador',
  CLIMA: 'Pesquisa de Clima (Gallup Q12)',
  CUSTOM_SURVEY: 'Pesquisa Personalizada',
  ONBOARDING_SURVEY: 'Pesquisa de Integração (Onboarding)',
  EXIT_SURVEY: 'Pesquisa de Desligamento',
};

// ─────────────────────────────────────────────────────────────────────────────
// Gallup Q12 — pre-loaded questions for CLIMA surveys
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 12 Gallup Q12 engagement questions adapted to a law-firm context,
 * in Brazilian Portuguese.
 *
 * `type` refers to the expected answer widget:
 *   - "SCALE_1_5"  → Likert scale 1 (discordo totalmente) … 5 (concordo totalmente)
 *
 * These are pre-loaded automatically when a SurveyType.CLIMA survey is
 * created, avoiding the need to type them manually each time.
 */
export const GALLUP_Q12: { id: string; text: string; type: string }[] = [
  {
    id: 'Q1',
    text: 'Sei exatamente o que é esperado de mim no trabalho.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q2',
    text: 'Tenho os materiais e equipamentos necessários para executar meu trabalho com excelência.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q3',
    text: 'No trabalho, tenho a oportunidade de fazer o que sei fazer de melhor todos os dias.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q4',
    text: 'Nos últimos 7 dias, recebi reconhecimento ou elogio por um bom trabalho realizado.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q5',
    text: 'Meu gestor ou alguém no trabalho parece se importar com meu desenvolvimento como pessoa.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q6',
    text: 'Há alguém no trabalho que encoraja meu crescimento e desenvolvimento profissional.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q7',
    text: 'No trabalho, minhas opiniões parecem ter importância.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q8',
    text: 'A missão e os valores do escritório me fazem sentir que meu trabalho é importante.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q9',
    text: 'Meus colegas de trabalho estão comprometidos em fazer um trabalho de qualidade.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q10',
    text: 'Tenho um melhor amigo no trabalho — alguém em quem confio e com quem posso contar.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q11',
    text: 'Nos últimos 6 meses, alguém no trabalho conversou comigo sobre meu progresso e desenvolvimento.',
    type: 'SCALE_1_5',
  },
  {
    id: 'Q12',
    text: 'No último ano, tive oportunidades de aprender e crescer profissionalmente dentro do escritório.',
    type: 'SCALE_1_5',
  },
];
