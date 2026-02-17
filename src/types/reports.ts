export interface ReportKPIs {
  processos_ativos: number;
  atividades_realizadas: number;
  valor_disputas: number;
  reunioes: number;
  documentos_gerados: number;
  prazos_cumpridos: number;
  prazos_total: number;
  liberacoes: number;
  emails_enviados: number;
  comunicados: number;
  relatorios_entregues: number;
}

export interface ReportProcesso {
  id: string;
  numero: string;
  tipo: string;
  vara: string;
  valor: number;
  status: string;
  fase: string;
  atividades: Array<{
    id: string;
    data: string;
    tipo: string;
    title: string;
    description: string;
    result: string;
    priority: number;
  }>;
  movimentacoes_count: number;
  prazos_cumpridos: number;
  prazos_total: number;
}

export interface ReportProjeto {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  progresso: number;
  tarefas_concluidas: number;
  tarefas_total: number;
  marcos: Array<{
    nome: string;
    data: string;
    status: string;
  }>;
}

export interface ReportValorFinanceiro {
  id: string;
  tipo: string;
  numero: string;
  valor: number;
  status: string;
  data_prevista: string | null;
  data_liberacao: string | null;
}

export interface ReportComunicacao {
  id: string;
  data: string;
  tipo: string;
  title: string;
  description: string;
  recipients: string[];
  result: string;
}

export interface ChartAtividadesMes {
  mes: string;
  peticoes: number;
  audiencias: number;
  reunioes: number;
  diligencias: number;
  total: number;
}

export interface ChartValorMes {
  mes: string;
  valor: number;
}

export interface ChartDistribuicao {
  name: string;
  value: number;
}

export interface ReportData {
  kpis: ReportKPIs;
  processos: ReportProcesso[];
  projetos: ReportProjeto[];
  valores: ReportValorFinanceiro[];
  comunicacoes: ReportComunicacao[];
  grafico_atividades_mes: ChartAtividadesMes[];
  grafico_valor_disputas_mes: ChartValorMes[];
  distribuicao_risco: ChartDistribuicao[];
  distribuicao_tipo: ChartDistribuicao[];
}

export interface ReportSnapshot {
  id: string;
  person_id: string;
  period_start: string;
  period_end: string;
  executive_summary: string | null;
  next_steps: string | null;
  kpis_data: ReportKPIs | null;
  report_data: ReportData | null;
  pdf_path: string | null;
  shared_with_client: boolean;
  shared_at: string | null;
  created_by_id: string | null;
  created_at: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}
