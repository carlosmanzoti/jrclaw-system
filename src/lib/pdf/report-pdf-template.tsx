import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type {
  ReportData,
  ReportKPIs,
  ReportProcesso,
  ReportProjeto,
  ReportValorFinanceiro,
  ReportComunicacao,
  ChartAtividadesMes,
} from "@/types/reports"
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants"

// ─── Color palette ──────────────────────────────────────────
const ACCENT = "#6366f1"
const ACCENT_LIGHT = "#e0e7ff"
const DARK = "#1e1b4b"
const GRAY = "#64748b"
const GRAY_LIGHT = "#f1f5f9"
const WHITE = "#ffffff"
const GREEN = "#16a34a"
const YELLOW = "#ca8a04"
const RED = "#dc2626"

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 25,
    paddingBottom: 40,
    paddingHorizontal: 20,
    color: "#1e293b",
  },
  // Cover
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: DARK,
    padding: 0,
  },
  coverContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 36,
    color: WHITE,
    letterSpacing: 3,
  },
  coverSubtitle: {
    fontFamily: "Helvetica",
    fontSize: 14,
    color: ACCENT_LIGHT,
    marginTop: 8,
  },
  coverDivider: {
    width: 80,
    height: 3,
    backgroundColor: ACCENT,
    marginTop: 24,
    marginBottom: 24,
  },
  coverClient: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: WHITE,
    marginTop: 12,
  },
  coverPeriod: {
    fontSize: 12,
    color: ACCENT_LIGHT,
    marginTop: 8,
  },
  coverFooter: {
    position: "absolute",
    bottom: 40,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverFooterText: {
    fontSize: 8,
    color: GRAY,
  },
  // Header + footer
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: DARK,
  },
  headerSub: {
    fontSize: 8,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRAY,
  },
  // Section
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: DARK,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionSubtitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: ACCENT,
    marginBottom: 6,
    marginTop: 8,
  },
  // KPI
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: "23%",
    backgroundColor: GRAY_LIGHT,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  kpiValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: ACCENT,
  },
  kpiLabel: {
    fontSize: 7,
    color: GRAY,
    marginTop: 2,
    textAlign: "center",
  },
  // Table
  table: {
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: DARK,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: WHITE,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  tableRowAlt: {
    backgroundColor: GRAY_LIGHT,
  },
  tableCell: {
    fontSize: 8,
  },
  // Bar chart (table-based)
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  barLabel: {
    width: 60,
    fontSize: 7,
    color: GRAY,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: GRAY_LIGHT,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  barFill: {
    height: 10,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  barValue: {
    width: 30,
    fontSize: 7,
    color: DARK,
    textAlign: "right",
  },
  // Status badges
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 7,
  },
  badgeGreen: { backgroundColor: "#dcfce7", color: GREEN },
  badgeYellow: { backgroundColor: "#fef9c3", color: YELLOW },
  badgeRed: { backgroundColor: "#fee2e2", color: RED },
  badgeGray: { backgroundColor: GRAY_LIGHT, color: GRAY },
  // Text helpers
  bold: { fontFamily: "Helvetica-Bold" },
  textSm: { fontSize: 8 },
  textXs: { fontSize: 7, color: GRAY },
  textMuted: { color: GRAY },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mt8: { marginTop: 8 },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
  // Paragraph
  paragraph: {
    fontSize: 9,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  // Progress bar
  progressContainer: {
    height: 8,
    backgroundColor: GRAY_LIGHT,
    borderRadius: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  // Card
  card: {
    backgroundColor: GRAY_LIGHT,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
})

// ─── Helpers ────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

function statusBadgeStyle(status: string) {
  const lower = status.toLowerCase()
  if (lower.includes("conclu") || lower.includes("alcancado") || lower.includes("liberado") || lower.includes("ativo"))
    return s.badgeGreen
  if (lower.includes("andamento") || lower.includes("aguardando") || lower.includes("expedido"))
    return s.badgeYellow
  if (lower.includes("atrasado") || lower.includes("cancel") || lower.includes("problema"))
    return s.badgeRed
  return s.badgeGray
}

function pctLabel(completed: number, total: number): string {
  if (total === 0) return "0%"
  return `${Math.round((completed / total) * 100)}%`
}

// ─── Sub-components ─────────────────────────────────────────

function PageHeader({ title, clientName }: { title: string; clientName: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerSub}>{clientName} — JRCLaw</Text>
    </View>
  )
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text>JRCLaw — Advocacia Empresarial</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

// ─── Cover page ─────────────────────────────────────────────

function CoverPage({
  clientName,
  periodLabel,
  generatedAt,
}: {
  clientName: string
  periodLabel: string
  generatedAt: string
}) {
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverContent}>
        <Text style={s.coverTitle}>JRCLaw</Text>
        <Text style={s.coverSubtitle}>Advocacia Empresarial</Text>
        <View style={s.coverDivider} />
        <Text style={{ ...s.coverSubtitle, fontSize: 16, color: WHITE }}>
          Relatório de Atividades
        </Text>
        <Text style={s.coverClient}>{clientName}</Text>
        <Text style={s.coverPeriod}>{periodLabel}</Text>
      </View>
      <View style={s.coverFooter}>
        <Text style={s.coverFooterText}>Confidencial</Text>
        <Text style={s.coverFooterText}>Gerado em {generatedAt}</Text>
      </View>
    </Page>
  )
}

// ─── KPIs page ──────────────────────────────────────────────

function KPIsPage({
  kpis,
  executiveSummary,
  clientName,
}: {
  kpis: ReportKPIs
  executiveSummary: string
  clientName: string
}) {
  const kpiItems = [
    { label: "Processos Ativos", value: kpis.processos_ativos },
    { label: "Atividades Realizadas", value: kpis.atividades_realizadas },
    { label: "Reuniões", value: kpis.reunioes },
    { label: "Documentos Gerados", value: kpis.documentos_gerados },
    { label: "Prazos Cumpridos", value: `${kpis.prazos_cumpridos}/${kpis.prazos_total}` },
    { label: "Liberações", value: kpis.liberacoes },
    { label: "E-mails Enviados", value: kpis.emails_enviados },
    { label: "Comunicados", value: kpis.comunicados },
  ]

  return (
    <Page size="A4" style={s.page}>
      <PageHeader title="Indicadores do Período" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Indicadores-Chave (KPIs)</Text>
      <View style={s.kpiRow}>
        {kpiItems.map((item, i) => (
          <View key={i} style={s.kpiCard}>
            <Text style={s.kpiValue}>{item.value}</Text>
            <Text style={s.kpiLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {executiveSummary && (
        <>
          <Text style={s.sectionTitle}>Resumo Executivo</Text>
          <Text style={s.paragraph}>{executiveSummary}</Text>
        </>
      )}

      {kpis.valor_disputas > 0 && (
        <View style={[s.card, s.mt8]}>
          <Text style={[s.bold, s.textSm]}>Valor Total em Disputas</Text>
          <Text style={[s.kpiValue, { fontSize: 22, marginTop: 4 }]}>
            {formatCurrency(kpis.valor_disputas)}
          </Text>
        </View>
      )}
    </Page>
  )
}

// ─── Activities chart page (table-based bar chart) ──────────

function ActivitiesChartPage({
  data,
  clientName,
}: {
  data: ChartAtividadesMes[]
  clientName: string
}) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  return (
    <Page size="A4" style={s.page}>
      <PageHeader title="Atividades por Mês" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Evolução Mensal de Atividades</Text>

      {/* Bar chart */}
      <View style={s.mb12}>
        {data.map((month, i) => (
          <View key={i} style={s.barRow}>
            <Text style={s.barLabel}>{month.mes}</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${(month.total / maxTotal) * 100}%` }]} />
            </View>
            <Text style={s.barValue}>{month.total}</Text>
          </View>
        ))}
      </View>

      {/* Breakdown table */}
      <Text style={s.sectionSubtitle}>Detalhamento por Tipo</Text>
      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "25%" }]}>Mês</Text>
          <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Petições</Text>
          <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Audiências</Text>
          <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Reuniões</Text>
          <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Diligências</Text>
          <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Total</Text>
        </View>
        {data.map((month, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCell, { width: "25%" }]}>{month.mes}</Text>
            <Text style={[s.tableCell, { width: "15%", textAlign: "right" }]}>{month.peticoes}</Text>
            <Text style={[s.tableCell, { width: "15%", textAlign: "right" }]}>{month.audiencias}</Text>
            <Text style={[s.tableCell, { width: "15%", textAlign: "right" }]}>{month.reunioes}</Text>
            <Text style={[s.tableCell, { width: "15%", textAlign: "right" }]}>{month.diligencias}</Text>
            <Text style={[s.tableCell, { width: "15%", textAlign: "right" }, s.bold]}>{month.total}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}

// ─── Processos pages ────────────────────────────────────────

function ProcessosPages({
  processos,
  clientName,
}: {
  processos: ReportProcesso[]
  clientName: string
}) {
  if (processos.length === 0) return null

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Processos Judiciais" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Processos Judiciais ({processos.length})</Text>

      {processos.map((proc, idx) => (
        <View key={proc.id} style={s.card} wrap={false}>
          <View style={[s.row, { justifyContent: "space-between", marginBottom: 4 }]}>
            <Text style={[s.bold, s.textSm]}>{proc.numero}</Text>
            <Text style={[s.badge, statusBadgeStyle(proc.status)]}>{proc.status}</Text>
          </View>

          <View style={[s.row, { gap: 12, marginBottom: 4 }]}>
            <Text style={s.textXs}>Tipo: {proc.tipo}</Text>
            <Text style={s.textXs}>Vara: {proc.vara || "—"}</Text>
            <Text style={s.textXs}>Fase: {proc.fase || "—"}</Text>
          </View>

          {proc.valor > 0 && (
            <Text style={[s.textSm, s.mb4]}>Valor: {formatCurrency(proc.valor)}</Text>
          )}

          <Text style={s.textXs}>
            Prazos: {proc.prazos_cumpridos}/{proc.prazos_total} cumpridos | Movimentações: {proc.movimentacoes_count}
          </Text>

          {proc.atividades.length > 0 && (
            <View style={s.mt8}>
              <Text style={[s.bold, s.textXs, s.mb4]}>Atividades do período:</Text>
              {proc.atividades.map((atv, j) => (
                <View key={atv.id} style={[s.row, { marginBottom: 2 }]}>
                  <Text style={[s.textXs, { width: 55 }]}>{formatDate(atv.data)}</Text>
                  <Text style={[s.textXs, { width: 60 }]}>
                    {ACTIVITY_TYPE_LABELS[atv.tipo] || atv.tipo}
                  </Text>
                  <Text style={[s.textXs, s.flex1]}>{atv.title}</Text>
                  {atv.priority > 0 && (
                    <Text style={[s.badge, atv.priority >= 2 ? s.badgeRed : s.badgeYellow]}>
                      {atv.priority >= 2 ? "Critico" : "Destaque"}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </Page>
  )
}

// ─── Projetos page ──────────────────────────────────────────

function ProjetosPage({
  projetos,
  clientName,
}: {
  projetos: ReportProjeto[]
  clientName: string
}) {
  if (projetos.length === 0) return null

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Projetos Gerenciais" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Projetos ({projetos.length})</Text>

      {projetos.map((proj) => (
        <View key={proj.id} style={s.card} wrap={false}>
          <View style={[s.row, { justifyContent: "space-between", marginBottom: 4 }]}>
            <Text style={[s.bold, s.textSm]}>
              {proj.codigo} — {proj.titulo}
            </Text>
            <Text style={[s.badge, statusBadgeStyle(proj.status)]}>{proj.status}</Text>
          </View>

          {/* Progress */}
          <View style={[s.row, { alignItems: "center", gap: 6, marginBottom: 4 }]}>
            <Text style={s.textXs}>Progresso:</Text>
            <View style={[s.progressContainer, s.flex1]}>
              <View style={[s.progressBar, { width: `${proj.progresso}%` }]} />
            </View>
            <Text style={[s.bold, s.textXs]}>{proj.progresso}%</Text>
          </View>

          <Text style={s.textXs}>
            Tarefas: {proj.tarefas_concluidas}/{proj.tarefas_total} concluídas
          </Text>

          {proj.marcos.length > 0 && (
            <View style={s.mt8}>
              <Text style={[s.bold, s.textXs, s.mb4]}>Marcos:</Text>
              {proj.marcos.map((marco, j) => (
                <View key={j} style={[s.row, { marginBottom: 2 }]}>
                  <Text style={[s.textXs, { width: 55 }]}>{formatDate(marco.data)}</Text>
                  <Text style={[s.textXs, s.flex1]}>{marco.nome}</Text>
                  <Text style={[s.badge, statusBadgeStyle(marco.status)]}>
                    {marco.status}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </Page>
  )
}

// ─── Financial page ─────────────────────────────────────────

function FinanceiroPage({
  valores,
  clientName,
}: {
  valores: ReportValorFinanceiro[]
  clientName: string
}) {
  if (valores.length === 0) return null

  const totalValor = valores.reduce((sum, v) => sum + v.valor, 0)
  const liberados = valores.filter(
    (v) => v.status.toLowerCase().includes("liberado") || v.status.toLowerCase().includes("creditado")
  )
  const totalLiberado = liberados.reduce((sum, v) => sum + v.valor, 0)
  const pendentes = valores.filter((v) => !liberados.includes(v))

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Valores e Liberações" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Valores e Liberações Financeiras</Text>

      {/* Summary cards */}
      <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
        <View style={[s.kpiCard, s.flex1]}>
          <Text style={s.kpiValue}>{formatCurrency(totalValor)}</Text>
          <Text style={s.kpiLabel}>Valor Total</Text>
        </View>
        <View style={[s.kpiCard, s.flex1]}>
          <Text style={[s.kpiValue, { color: GREEN }]}>{formatCurrency(totalLiberado)}</Text>
          <Text style={s.kpiLabel}>Liberado</Text>
        </View>
        <View style={[s.kpiCard, s.flex1]}>
          <Text style={[s.kpiValue, { color: YELLOW }]}>
            {formatCurrency(totalValor - totalLiberado)}
          </Text>
          <Text style={s.kpiLabel}>Pendente</Text>
        </View>
      </View>

      {/* Table */}
      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "18%" }]}>Tipo</Text>
          <Text style={[s.tableHeaderCell, { width: "20%" }]}>Número</Text>
          <Text style={[s.tableHeaderCell, { width: "18%", textAlign: "right" }]}>Valor</Text>
          <Text style={[s.tableHeaderCell, { width: "16%" }]}>Status</Text>
          <Text style={[s.tableHeaderCell, { width: "14%" }]}>Previsão</Text>
          <Text style={[s.tableHeaderCell, { width: "14%" }]}>Liberação</Text>
        </View>
        {valores.map((val, i) => (
          <View key={val.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCell, { width: "18%" }]}>{val.tipo}</Text>
            <Text style={[s.tableCell, { width: "20%" }]}>{val.numero || "—"}</Text>
            <Text style={[s.tableCell, { width: "18%", textAlign: "right" }]}>
              {formatCurrency(val.valor)}
            </Text>
            <Text style={[s.tableCell, { width: "16%" }]}>{val.status}</Text>
            <Text style={[s.tableCell, { width: "14%" }]}>{formatDate(val.data_prevista)}</Text>
            <Text style={[s.tableCell, { width: "14%" }]}>{formatDate(val.data_liberacao)}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}

// ─── Comunicacoes page ──────────────────────────────────────

function ComunicacoesPage({
  comunicacoes,
  clientName,
}: {
  comunicacoes: ReportComunicacao[]
  clientName: string
}) {
  if (comunicacoes.length === 0) return null

  const byType: Record<string, number> = {}
  for (const c of comunicacoes) {
    byType[c.tipo] = (byType[c.tipo] || 0) + 1
  }

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Comunicações" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Comunicações ({comunicacoes.length})</Text>

      {/* Summary */}
      <View style={[s.row, { gap: 8, marginBottom: 12, flexWrap: "wrap" }]}>
        {Object.entries(byType).map(([tipo, count]) => (
          <View key={tipo} style={s.kpiCard}>
            <Text style={s.kpiValue}>{count}</Text>
            <Text style={s.kpiLabel}>{ACTIVITY_TYPE_LABELS[tipo] || tipo}</Text>
          </View>
        ))}
      </View>

      {/* Timeline */}
      {comunicacoes.map((com, i) => (
        <View key={com.id} style={[s.row, { marginBottom: 4, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" }]} wrap={false}>
          <Text style={[s.textXs, { width: 55 }]}>{formatDate(com.data)}</Text>
          <Text style={[s.textXs, { width: 60 }, s.bold]}>
            {ACTIVITY_TYPE_LABELS[com.tipo] || com.tipo}
          </Text>
          <View style={s.flex1}>
            <Text style={s.textSm}>{com.title}</Text>
            {com.description && (
              <Text style={s.textXs}>{com.description}</Text>
            )}
          </View>
        </View>
      ))}
    </Page>
  )
}

// ─── Next steps page ────────────────────────────────────────

function NextStepsPage({
  nextSteps,
  clientName,
}: {
  nextSteps: string
  clientName: string
}) {
  if (!nextSteps) return null

  return (
    <Page size="A4" style={s.page}>
      <PageHeader title="Próximos Passos" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Próximos Passos e Recomendações</Text>
      <Text style={s.paragraph}>{nextSteps}</Text>

      <View style={[s.card, s.mt8, { backgroundColor: ACCENT_LIGHT }]}>
        <Text style={[s.bold, s.textSm, { color: ACCENT }]}>
          Estamos à disposição para esclarecimentos.
        </Text>
        <Text style={[s.textXs, { marginTop: 4 }]}>
          Entre em contato pelo e-mail ou WhatsApp do escritório para agendar uma reunião
          de acompanhamento.
        </Text>
      </View>
    </Page>
  )
}

// ─── Main Document ──────────────────────────────────────────

interface ReportPDFProps {
  data: ReportData
  clientName: string
  periodLabel: string
  executiveSummary: string
  nextSteps: string
}

export function ReportPDFDocument({
  data,
  clientName,
  periodLabel,
  executiveSummary,
  nextSteps,
}: ReportPDFProps) {
  const generatedAt = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <Document
      title={`Relatório — ${clientName} — ${periodLabel}`}
      author="JRCLaw"
      subject="Relatório de Atividades"
    >
      <CoverPage
        clientName={clientName}
        periodLabel={periodLabel}
        generatedAt={generatedAt}
      />

      <KPIsPage
        kpis={data.kpis}
        executiveSummary={executiveSummary}
        clientName={clientName}
      />

      {data.grafico_atividades_mes.length > 0 && (
        <ActivitiesChartPage
          data={data.grafico_atividades_mes}
          clientName={clientName}
        />
      )}

      <ProcessosPages
        processos={data.processos}
        clientName={clientName}
      />

      <ProjetosPage
        projetos={data.projetos}
        clientName={clientName}
      />

      <FinanceiroPage
        valores={data.valores}
        clientName={clientName}
      />

      <ComunicacoesPage
        comunicacoes={data.comunicacoes}
        clientName={clientName}
      />

      <NextStepsPage
        nextSteps={nextSteps}
        clientName={clientName}
      />
    </Document>
  )
}
