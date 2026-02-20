import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Color palette ──────────────────────────────────────────
const TEXT = "#1A1A1A";
const GOLD = "#C9A961";
const GOLD_DARK = "#A68A3E";
const LIGHT_BG = "#F5F5F5";
const WHITE = "#ffffff";
const DARK_BG = "#1A1A1A";
const GRAY = "#6B7280";
const GREEN = "#16a34a";
const YELLOW = "#ca8a04";
const RED = "#dc2626";

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: TEXT,
  },
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: DARK_BG,
    padding: 0,
  },
  coverContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  coverBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 36,
    color: GOLD,
    letterSpacing: 4,
  },
  coverSubBrand: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  coverDivider: {
    width: 80,
    height: 3,
    backgroundColor: GOLD,
    marginTop: 28,
    marginBottom: 28,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: WHITE,
    letterSpacing: 2,
  },
  coverClient: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: GOLD,
    marginTop: 16,
  },
  coverDocument: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#999999",
    marginTop: 6,
  },
  coverDate: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#777777",
    marginTop: 4,
  },
  coverWatermark: {
    position: "absolute",
    top: 380,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 60,
    color: "#2A2A2A",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 10,
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
    color: "#666666",
  },

  // Header and footer
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: TEXT,
  },
  headerSub: {
    fontSize: 8,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRAY,
  },

  // Section
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: TEXT,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionSubtitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: GOLD_DARK,
    marginBottom: 6,
    marginTop: 8,
  },

  // Summary cards
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  summaryCard: {
    width: "23%",
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
    marginRight: "2%",
    marginBottom: 8,
  },
  summaryCardAccent: {
    width: "23%",
    backgroundColor: GOLD,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
    marginRight: "2%",
    marginBottom: 8,
  },
  summaryValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: TEXT,
  },
  summaryValueWhite: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: WHITE,
  },
  summaryLabel: {
    fontSize: 7,
    color: GRAY,
    marginTop: 2,
    textAlign: "center",
  },
  summaryLabelWhite: {
    fontSize: 7,
    color: WHITE,
    marginTop: 2,
    textAlign: "center",
  },

  // Indicator cards
  indicatorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  indicatorCard: {
    width: "31%",
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 8,
    marginRight: "2%",
    marginBottom: 6,
  },
  indicatorLabel: {
    fontSize: 7,
    color: GRAY,
    marginBottom: 2,
  },
  indicatorValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: TEXT,
  },

  // Table
  table: {
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: DARK_BG,
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
    borderBottomColor: "#E5E5E5",
  },
  tableRowAlt: {
    backgroundColor: LIGHT_BG,
  },
  tableCell: {
    fontSize: 8,
    color: TEXT,
  },
  tableTotalsRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: GOLD,
    borderRadius: 2,
    marginTop: 2,
  },
  tableTotalsCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: WHITE,
  },

  // Lien map
  lienCard: {
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: RED,
  },
  lienFreeCard: {
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },

  // Badge
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 7,
  },
  badgeGreen: { backgroundColor: "#dcfce7", color: GREEN },
  badgeRed: { backgroundColor: "#fee2e2", color: RED },
  badgeYellow: { backgroundColor: "#fef9c3", color: YELLOW },
  badgeGray: { backgroundColor: LIGHT_BG, color: GRAY },

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
  card: {
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
});

// ─── Data Interface ─────────────────────────────────────────
export interface PatrimonyPDFData {
  clientName: string;
  clientDocument?: string;
  generatedAt: string;

  summary: {
    totalAssets: number;
    freeAssets: number;
    totalLienAmount: number;
    totalRuralArea: number;
    totalOwnedArea: number;
    ruralPropertyCount: number;
    urbanPropertyCount: number;
    vehicleCount: number;
    machineCount: number;
    participationCount: number;
  };

  indicators?: {
    year: number;
    grossRevenue: number;
    ebitda: number;
    netIncome: number;
    totalDebt: number;
    netDebt: number;
    equity: number;
    debtToEquity: number;
    debtToEbitda: number;
    currentRatio: number;
    grossMargin: number;
    ebitdaMargin: number;
    netMargin: number;
    roe: number;
  };

  ruralProperties: Array<{
    name: string;
    city: string;
    state: string;
    totalArea: number;
    productiveArea?: number;
    estimatedValue?: number;
    hasLien: boolean;
    lienHolder?: string;
    lienAmount?: number;
    ownership: string;
  }>;

  productions: Array<{
    crop: string;
    harvestYear: string;
    plantedArea: number;
    totalProduction?: number;
    yieldUnit?: string;
    totalRevenue?: number;
    productionCost?: number;
  }>;

  urbanProperties: Array<{
    propertyType: string;
    description: string;
    city: string;
    state: string;
    estimatedValue?: number;
    hasLien: boolean;
  }>;

  vehicles: Array<{
    category: string;
    description: string;
    year?: number;
    estimatedValue?: number;
    hasLien: boolean;
  }>;

  participations: Array<{
    companyName: string;
    cnpj?: string;
    participationType: string;
    sharePercentage?: number;
    estimatedValue?: number;
  }>;

  operational?: {
    year: number;
    totalEmployees?: number;
    totalManagedArea?: number;
    storageCapacity?: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────
function fmtCurrency(cents: number): string {
  if (!cents) return "\u2014";
  return `R$ ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtArea(ha: number): string {
  if (!ha) return "\u2014";
  return `${ha.toLocaleString("pt-BR")} ha`;
}

function fmtPercent(value: number): string {
  if (value === null || value === undefined) return "\u2014";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function fmtDecimal(value: number, decimals = 2): string {
  if (value === null || value === undefined) return "\u2014";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function indicatorColor(value: number, greenBelow: number, yellowBelow: number): string {
  if (value <= greenBelow) return GREEN;
  if (value <= yellowBelow) return YELLOW;
  return RED;
}

function marginColor(value: number): string {
  if (value >= 15) return GREEN;
  if (value >= 5) return YELLOW;
  return RED;
}

// ─── Sub-components ─────────────────────────────────────────

function PageHeader({ title, clientName }: { title: string; clientName: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerSub}>{clientName} \u2014 JRCLaw</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text>JRCLaw \u2014 Relat\u00f3rio Patrimonial \u2014 Confidencial</Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Cover Page ─────────────────────────────────────────────

function CoverPage({
  clientName,
  clientDocument,
  generatedAt,
  summary,
  indicators,
}: {
  clientName: string;
  clientDocument?: string;
  generatedAt: string;
  summary: PatrimonyPDFData["summary"];
  indicators?: PatrimonyPDFData["indicators"];
}) {
  return (
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverWatermark}>CONFIDENCIAL</Text>

      <View style={s.coverContent}>
        <Text style={s.coverBrand}>JRCLaw</Text>
        <Text style={s.coverSubBrand}>Advocacia Empresarial</Text>
        <View style={s.coverDivider} />
        <Text style={s.coverTitle}>RELAT\u00d3RIO PATRIMONIAL</Text>
        <Text style={s.coverClient}>{clientName}</Text>
        {clientDocument && (
          <Text style={s.coverDocument}>{clientDocument}</Text>
        )}
        <Text style={s.coverDate}>{generatedAt}</Text>
      </View>

      <View style={s.coverFooter}>
        <Text style={s.coverFooterText}>Documento confidencial</Text>
        <Text style={s.coverFooterText}>Gerado em {generatedAt}</Text>
      </View>
    </Page>
  );
}

// ─── Summary Page ───────────────────────────────────────────

function SummaryPage({
  clientName,
  summary,
  indicators,
  operational,
}: {
  clientName: string;
  summary: PatrimonyPDFData["summary"];
  indicators?: PatrimonyPDFData["indicators"];
  operational?: PatrimonyPDFData["operational"];
}) {
  return (
    <Page size="A4" style={s.page}>
      <PageHeader title="Resumo Patrimonial" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>Vis\u00e3o Geral do Patrim\u00f4nio</Text>

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={s.summaryCardAccent}>
          <Text style={s.summaryValueWhite}>{fmtCurrency(summary.totalAssets)}</Text>
          <Text style={s.summaryLabelWhite}>Ativos Totais</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{fmtCurrency(summary.freeAssets)}</Text>
          <Text style={s.summaryLabel}>Livres de \u00d4nus</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: RED }]}>
            {fmtCurrency(summary.totalLienAmount)}
          </Text>
          <Text style={s.summaryLabel}>Gravames</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{fmtArea(summary.totalRuralArea)}</Text>
          <Text style={s.summaryLabel}>\u00c1rea Total</Text>
        </View>
      </View>

      {/* Asset composition */}
      <Text style={s.sectionSubtitle}>Composi\u00e7\u00e3o do Patrim\u00f4nio</Text>
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{summary.ruralPropertyCount}</Text>
          <Text style={s.summaryLabel}>Im\u00f3veis Rurais</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{summary.urbanPropertyCount}</Text>
          <Text style={s.summaryLabel}>Im\u00f3veis Urbanos</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{summary.vehicleCount}</Text>
          <Text style={s.summaryLabel}>Ve\u00edculos</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{summary.machineCount}</Text>
          <Text style={s.summaryLabel}>M\u00e1quinas</Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{summary.participationCount}</Text>
          <Text style={s.summaryLabel}>Participa\u00e7\u00f5es</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{fmtArea(summary.totalOwnedArea)}</Text>
          <Text style={s.summaryLabel}>\u00c1rea Pr\u00f3pria</Text>
        </View>
      </View>

      {/* Operational data */}
      {operational && (
        <>
          <Text style={s.sectionSubtitle}>
            Dados Operacionais ({operational.year})
          </Text>
          <View style={s.summaryRow}>
            {operational.totalEmployees !== undefined && (
              <View style={s.summaryCard}>
                <Text style={s.summaryValue}>{operational.totalEmployees}</Text>
                <Text style={s.summaryLabel}>Funcion\u00e1rios</Text>
              </View>
            )}
            {operational.totalManagedArea !== undefined && (
              <View style={s.summaryCard}>
                <Text style={s.summaryValue}>
                  {fmtArea(operational.totalManagedArea)}
                </Text>
                <Text style={s.summaryLabel}>\u00c1rea Gerida</Text>
              </View>
            )}
            {operational.storageCapacity !== undefined && (
              <View style={s.summaryCard}>
                <Text style={s.summaryValue}>
                  {operational.storageCapacity.toLocaleString("pt-BR")} t
                </Text>
                <Text style={s.summaryLabel}>Cap. Armazenagem</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Financial indicators */}
      {indicators && (
        <>
          <Text style={s.sectionSubtitle}>
            Indicadores Financeiros ({indicators.year})
          </Text>

          <View style={s.indicatorRow}>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Receita Bruta</Text>
              <Text style={s.indicatorValue}>
                {fmtCurrency(indicators.grossRevenue)}
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>EBITDA</Text>
              <Text style={s.indicatorValue}>
                {fmtCurrency(indicators.ebitda)}
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Lucro L\u00edquido</Text>
              <Text style={[s.indicatorValue, { color: indicators.netIncome >= 0 ? GREEN : RED }]}>
                {fmtCurrency(indicators.netIncome)}
              </Text>
            </View>
          </View>

          <View style={s.indicatorRow}>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>D\u00edv. Bruta</Text>
              <Text style={s.indicatorValue}>
                {fmtCurrency(indicators.totalDebt)}
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>D\u00edv. L\u00edquida</Text>
              <Text style={s.indicatorValue}>
                {fmtCurrency(indicators.netDebt)}
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Patrim\u00f4nio L\u00edq.</Text>
              <Text style={s.indicatorValue}>
                {fmtCurrency(indicators.equity)}
              </Text>
            </View>
          </View>

          <Text style={s.sectionSubtitle}>
            \u00cdndices ({indicators.year})
          </Text>
          <View style={s.indicatorRow}>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>D\u00edvida / PL</Text>
              <Text
                style={[
                  s.indicatorValue,
                  { color: indicatorColor(indicators.debtToEquity, 1, 2) },
                ]}
              >
                {fmtDecimal(indicators.debtToEquity)}x
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>D\u00edvida / EBITDA</Text>
              <Text
                style={[
                  s.indicatorValue,
                  { color: indicatorColor(indicators.debtToEbitda, 2.5, 4) },
                ]}
              >
                {fmtDecimal(indicators.debtToEbitda)}x
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Liquidez Corrente</Text>
              <Text
                style={[
                  s.indicatorValue,
                  { color: indicators.currentRatio >= 1.5 ? GREEN : indicators.currentRatio >= 1 ? YELLOW : RED },
                ]}
              >
                {fmtDecimal(indicators.currentRatio)}
              </Text>
            </View>
          </View>

          <View style={s.indicatorRow}>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Margem Bruta</Text>
              <Text
                style={[s.indicatorValue, { color: marginColor(indicators.grossMargin) }]}
              >
                {fmtPercent(indicators.grossMargin)}
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Margem EBITDA</Text>
              <Text
                style={[s.indicatorValue, { color: marginColor(indicators.ebitdaMargin) }]}
              >
                {fmtPercent(indicators.ebitdaMargin)}
              </Text>
            </View>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>Margem L\u00edquida</Text>
              <Text
                style={[s.indicatorValue, { color: marginColor(indicators.netMargin) }]}
              >
                {fmtPercent(indicators.netMargin)}
              </Text>
            </View>
          </View>

          <View style={s.indicatorRow}>
            <View style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>ROE</Text>
              <Text
                style={[s.indicatorValue, { color: marginColor(indicators.roe) }]}
              >
                {fmtPercent(indicators.roe)}
              </Text>
            </View>
          </View>
        </>
      )}
    </Page>
  );
}

// ─── Rural Properties Page ──────────────────────────────────

function RuralPropertiesPage({
  clientName,
  ruralProperties,
}: {
  clientName: string;
  ruralProperties: PatrimonyPDFData["ruralProperties"];
}) {
  if (ruralProperties.length === 0) return null;

  const totalArea = ruralProperties.reduce((sum, p) => sum + p.totalArea, 0);
  const totalProductiveArea = ruralProperties.reduce(
    (sum, p) => sum + (p.productiveArea || 0),
    0
  );
  const totalValue = ruralProperties.reduce(
    (sum, p) => sum + (p.estimatedValue || 0),
    0
  );
  const totalLiens = ruralProperties.reduce(
    (sum, p) => sum + (p.lienAmount || 0),
    0
  );

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Im\u00f3veis Rurais" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>
        IM\u00d3VEIS RURAIS ({ruralProperties.length})
      </Text>

      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "20%" }]}>Nome</Text>
          <Text style={[s.tableHeaderCell, { width: "16%" }]}>Cidade/UF</Text>
          <Text style={[s.tableHeaderCell, { width: "12%", textAlign: "right" }]}>
            \u00c1rea Total
          </Text>
          <Text style={[s.tableHeaderCell, { width: "12%", textAlign: "right" }]}>
            Produtiva
          </Text>
          <Text style={[s.tableHeaderCell, { width: "16%", textAlign: "right" }]}>
            Valor
          </Text>
          <Text style={[s.tableHeaderCell, { width: "12%" }]}>\u00d4nus</Text>
          <Text style={[s.tableHeaderCell, { width: "12%" }]}>Titularidade</Text>
        </View>

        {ruralProperties.map((prop, i) => (
          <View
            key={i}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[s.tableCell, { width: "20%" }]}>{prop.name}</Text>
            <Text style={[s.tableCell, { width: "16%" }]}>
              {prop.city}/{prop.state}
            </Text>
            <Text style={[s.tableCell, { width: "12%", textAlign: "right" }]}>
              {fmtArea(prop.totalArea)}
            </Text>
            <Text style={[s.tableCell, { width: "12%", textAlign: "right" }]}>
              {fmtArea(prop.productiveArea || 0)}
            </Text>
            <Text style={[s.tableCell, { width: "16%", textAlign: "right" }]}>
              {fmtCurrency(prop.estimatedValue || 0)}
            </Text>
            <Text style={[s.tableCell, { width: "12%" }]}>
              {prop.hasLien ? (
                <Text style={[s.badge, s.badgeRed]}>Sim</Text>
              ) : (
                <Text style={[s.badge, s.badgeGreen]}>Livre</Text>
              )}
            </Text>
            <Text style={[s.tableCell, { width: "12%", fontSize: 7 }]}>
              {prop.ownership}
            </Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.tableTotalsRow}>
          <Text style={[s.tableTotalsCell, { width: "20%" }]}>TOTAL</Text>
          <Text style={[s.tableTotalsCell, { width: "16%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "12%", textAlign: "right" }]}>
            {fmtArea(totalArea)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "12%", textAlign: "right" }]}>
            {fmtArea(totalProductiveArea)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "16%", textAlign: "right" }]}>
            {fmtCurrency(totalValue)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "12%" }]}>
            {fmtCurrency(totalLiens)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "12%" }]}></Text>
        </View>
      </View>

      {/* Lien details inline */}
      {ruralProperties.some((p) => p.hasLien && p.lienHolder) && (
        <>
          <Text style={[s.sectionSubtitle, s.mt8]}>Detalhamento de Gravames</Text>
          {ruralProperties
            .filter((p) => p.hasLien && p.lienHolder)
            .map((prop, i) => (
              <View key={i} style={s.lienCard} wrap={false}>
                <Text style={[s.bold, s.textSm]}>{prop.name}</Text>
                <View style={[s.row, { marginTop: 2 }]}>
                  <Text style={s.textXs}>Credor: {prop.lienHolder}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.textXs}>
                    Valor: {fmtCurrency(prop.lienAmount || 0)}
                  </Text>
                </View>
              </View>
            ))}
        </>
      )}
    </Page>
  );
}

// ─── Productions Page ───────────────────────────────────────

function ProductionsPage({
  clientName,
  productions,
}: {
  clientName: string;
  productions: PatrimonyPDFData["productions"];
}) {
  if (productions.length === 0) return null;

  const totalPlantedArea = productions.reduce((sum, p) => sum + p.plantedArea, 0);
  const totalRevenue = productions.reduce(
    (sum, p) => sum + (p.totalRevenue || 0),
    0
  );
  const totalCost = productions.reduce(
    (sum, p) => sum + (p.productionCost || 0),
    0
  );

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Produ\u00e7\u00e3o Agr\u00edcola" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>
        PRODU\u00c7\u00c3O AGR\u00cdCOLA ({productions.length})
      </Text>

      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "16%" }]}>Cultura</Text>
          <Text style={[s.tableHeaderCell, { width: "12%" }]}>Safra</Text>
          <Text style={[s.tableHeaderCell, { width: "14%", textAlign: "right" }]}>
            \u00c1rea
          </Text>
          <Text style={[s.tableHeaderCell, { width: "16%", textAlign: "right" }]}>
            Produ\u00e7\u00e3o
          </Text>
          <Text style={[s.tableHeaderCell, { width: "20%", textAlign: "right" }]}>
            Receita
          </Text>
          <Text style={[s.tableHeaderCell, { width: "22%", textAlign: "right" }]}>
            Custo
          </Text>
        </View>

        {productions.map((prod, i) => (
          <View
            key={i}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[s.tableCell, { width: "16%" }]}>{prod.crop}</Text>
            <Text style={[s.tableCell, { width: "12%" }]}>{prod.harvestYear}</Text>
            <Text style={[s.tableCell, { width: "14%", textAlign: "right" }]}>
              {fmtArea(prod.plantedArea)}
            </Text>
            <Text style={[s.tableCell, { width: "16%", textAlign: "right" }]}>
              {prod.totalProduction
                ? `${prod.totalProduction.toLocaleString("pt-BR")} ${prod.yieldUnit || "t"}`
                : "\u2014"}
            </Text>
            <Text style={[s.tableCell, { width: "20%", textAlign: "right" }]}>
              {fmtCurrency(prod.totalRevenue || 0)}
            </Text>
            <Text style={[s.tableCell, { width: "22%", textAlign: "right" }]}>
              {fmtCurrency(prod.productionCost || 0)}
            </Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.tableTotalsRow}>
          <Text style={[s.tableTotalsCell, { width: "16%" }]}>TOTAL</Text>
          <Text style={[s.tableTotalsCell, { width: "12%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "14%", textAlign: "right" }]}>
            {fmtArea(totalPlantedArea)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "16%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "20%", textAlign: "right" }]}>
            {fmtCurrency(totalRevenue)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "22%", textAlign: "right" }]}>
            {fmtCurrency(totalCost)}
          </Text>
        </View>
      </View>

      {/* Margin summary */}
      {totalRevenue > 0 && (
        <View style={[s.card, s.mt8]}>
          <Text style={[s.bold, s.textSm]}>Resultado da Produ\u00e7\u00e3o</Text>
          <View style={[s.row, { marginTop: 4 }]}>
            <View style={s.flex1}>
              <Text style={s.textXs}>Receita Total</Text>
              <Text style={[s.bold, s.textSm]}>{fmtCurrency(totalRevenue)}</Text>
            </View>
            <View style={s.flex1}>
              <Text style={s.textXs}>Custo Total</Text>
              <Text style={[s.bold, s.textSm]}>{fmtCurrency(totalCost)}</Text>
            </View>
            <View style={s.flex1}>
              <Text style={s.textXs}>Resultado</Text>
              <Text
                style={[
                  s.bold,
                  s.textSm,
                  { color: totalRevenue - totalCost >= 0 ? GREEN : RED },
                ]}
              >
                {fmtCurrency(totalRevenue - totalCost)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Page>
  );
}

// ─── Urban Properties Page ──────────────────────────────────

function UrbanPropertiesPage({
  clientName,
  urbanProperties,
}: {
  clientName: string;
  urbanProperties: PatrimonyPDFData["urbanProperties"];
}) {
  if (urbanProperties.length === 0) return null;

  const totalValue = urbanProperties.reduce(
    (sum, p) => sum + (p.estimatedValue || 0),
    0
  );

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Im\u00f3veis Urbanos" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>
        IM\u00d3VEIS URBANOS ({urbanProperties.length})
      </Text>

      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "14%" }]}>Tipo</Text>
          <Text style={[s.tableHeaderCell, { width: "28%" }]}>Descri\u00e7\u00e3o</Text>
          <Text style={[s.tableHeaderCell, { width: "20%" }]}>Cidade/UF</Text>
          <Text style={[s.tableHeaderCell, { width: "22%", textAlign: "right" }]}>
            Valor Estimado
          </Text>
          <Text style={[s.tableHeaderCell, { width: "16%" }]}>\u00d4nus</Text>
        </View>

        {urbanProperties.map((prop, i) => (
          <View
            key={i}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[s.tableCell, { width: "14%" }]}>{prop.propertyType}</Text>
            <Text style={[s.tableCell, { width: "28%" }]}>{prop.description}</Text>
            <Text style={[s.tableCell, { width: "20%" }]}>
              {prop.city}/{prop.state}
            </Text>
            <Text style={[s.tableCell, { width: "22%", textAlign: "right" }]}>
              {fmtCurrency(prop.estimatedValue || 0)}
            </Text>
            <Text style={[s.tableCell, { width: "16%" }]}>
              {prop.hasLien ? (
                <Text style={[s.badge, s.badgeRed]}>Sim</Text>
              ) : (
                <Text style={[s.badge, s.badgeGreen]}>Livre</Text>
              )}
            </Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.tableTotalsRow}>
          <Text style={[s.tableTotalsCell, { width: "14%" }]}>TOTAL</Text>
          <Text style={[s.tableTotalsCell, { width: "28%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "20%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "22%", textAlign: "right" }]}>
            {fmtCurrency(totalValue)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "16%" }]}></Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Vehicles Page ──────────────────────────────────────────

function VehiclesPage({
  clientName,
  vehicles,
}: {
  clientName: string;
  vehicles: PatrimonyPDFData["vehicles"];
}) {
  if (vehicles.length === 0) return null;

  const totalValue = vehicles.reduce(
    (sum, v) => sum + (v.estimatedValue || 0),
    0
  );

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Ve\u00edculos e M\u00e1quinas" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>
        VE\u00cdCULOS E M\u00c1QUINAS ({vehicles.length})
      </Text>

      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "14%" }]}>Categoria</Text>
          <Text style={[s.tableHeaderCell, { width: "36%" }]}>Descri\u00e7\u00e3o</Text>
          <Text style={[s.tableHeaderCell, { width: "10%", textAlign: "center" }]}>
            Ano
          </Text>
          <Text style={[s.tableHeaderCell, { width: "24%", textAlign: "right" }]}>
            Valor Estimado
          </Text>
          <Text style={[s.tableHeaderCell, { width: "16%" }]}>\u00d4nus</Text>
        </View>

        {vehicles.map((vehicle, i) => (
          <View
            key={i}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[s.tableCell, { width: "14%" }]}>{vehicle.category}</Text>
            <Text style={[s.tableCell, { width: "36%" }]}>{vehicle.description}</Text>
            <Text style={[s.tableCell, { width: "10%", textAlign: "center" }]}>
              {vehicle.year || "\u2014"}
            </Text>
            <Text style={[s.tableCell, { width: "24%", textAlign: "right" }]}>
              {fmtCurrency(vehicle.estimatedValue || 0)}
            </Text>
            <Text style={[s.tableCell, { width: "16%" }]}>
              {vehicle.hasLien ? (
                <Text style={[s.badge, s.badgeRed]}>Sim</Text>
              ) : (
                <Text style={[s.badge, s.badgeGreen]}>Livre</Text>
              )}
            </Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.tableTotalsRow}>
          <Text style={[s.tableTotalsCell, { width: "14%" }]}>TOTAL</Text>
          <Text style={[s.tableTotalsCell, { width: "36%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "10%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "24%", textAlign: "right" }]}>
            {fmtCurrency(totalValue)}
          </Text>
          <Text style={[s.tableTotalsCell, { width: "16%" }]}></Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Participations Page ────────────────────────────────────

function ParticipationsPage({
  clientName,
  participations,
}: {
  clientName: string;
  participations: PatrimonyPDFData["participations"];
}) {
  if (participations.length === 0) return null;

  const totalValue = participations.reduce(
    (sum, p) => sum + (p.estimatedValue || 0),
    0
  );

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Participa\u00e7\u00f5es Societ\u00e1rias" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>
        PARTICIPA\u00c7\u00d5ES SOCIET\u00c1RIAS ({participations.length})
      </Text>

      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderCell, { width: "26%" }]}>Empresa</Text>
          <Text style={[s.tableHeaderCell, { width: "18%" }]}>CNPJ</Text>
          <Text style={[s.tableHeaderCell, { width: "18%" }]}>Tipo</Text>
          <Text style={[s.tableHeaderCell, { width: "14%", textAlign: "right" }]}>
            Participa\u00e7\u00e3o
          </Text>
          <Text style={[s.tableHeaderCell, { width: "24%", textAlign: "right" }]}>
            Valor Estimado
          </Text>
        </View>

        {participations.map((part, i) => (
          <View
            key={i}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[s.tableCell, { width: "26%" }]}>{part.companyName}</Text>
            <Text style={[s.tableCell, { width: "18%", fontSize: 7 }]}>
              {part.cnpj || "\u2014"}
            </Text>
            <Text style={[s.tableCell, { width: "18%" }]}>
              {part.participationType}
            </Text>
            <Text style={[s.tableCell, { width: "14%", textAlign: "right" }]}>
              {part.sharePercentage !== undefined
                ? fmtPercent(part.sharePercentage)
                : "\u2014"}
            </Text>
            <Text style={[s.tableCell, { width: "24%", textAlign: "right" }]}>
              {fmtCurrency(part.estimatedValue || 0)}
            </Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.tableTotalsRow}>
          <Text style={[s.tableTotalsCell, { width: "26%" }]}>TOTAL</Text>
          <Text style={[s.tableTotalsCell, { width: "18%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "18%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "14%" }]}></Text>
          <Text style={[s.tableTotalsCell, { width: "24%", textAlign: "right" }]}>
            {fmtCurrency(totalValue)}
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Lien Map Page ──────────────────────────────────────────

interface LienItem {
  assetType: string;
  assetName: string;
  holder: string;
  amount: number;
}

function LienMapPage({
  clientName,
  data,
}: {
  clientName: string;
  data: PatrimonyPDFData;
}) {
  // Collect all liens from all asset categories
  const liens: LienItem[] = [];

  for (const prop of data.ruralProperties) {
    if (prop.hasLien) {
      liens.push({
        assetType: "Im\u00f3vel Rural",
        assetName: prop.name,
        holder: prop.lienHolder || "N\u00e3o informado",
        amount: prop.lienAmount || 0,
      });
    }
  }

  for (const prop of data.urbanProperties) {
    if (prop.hasLien) {
      liens.push({
        assetType: "Im\u00f3vel Urbano",
        assetName: `${prop.propertyType} - ${prop.description}`,
        holder: "N\u00e3o informado",
        amount: 0,
      });
    }
  }

  for (const vehicle of data.vehicles) {
    if (vehicle.hasLien) {
      liens.push({
        assetType: "Ve\u00edculo/M\u00e1quina",
        assetName: vehicle.description,
        holder: "N\u00e3o informado",
        amount: 0,
      });
    }
  }

  // Count free assets
  const freeRural = data.ruralProperties.filter((p) => !p.hasLien).length;
  const freeUrban = data.urbanProperties.filter((p) => !p.hasLien).length;
  const freeVehicles = data.vehicles.filter((v) => !v.hasLien).length;
  const totalFree = freeRural + freeUrban + freeVehicles + data.participations.length;
  const totalLienAmount = liens.reduce((sum, l) => sum + l.amount, 0);

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader title="Mapa de \u00d4nus" clientName={clientName} />
      <PageFooter />

      <Text style={s.sectionTitle}>MAPA DE \u00d4NUS E RESTRI\u00c7\u00d5ES</Text>

      {/* Overview */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: RED }]}>{liens.length}</Text>
          <Text style={s.summaryLabel}>Bens com \u00d4nus</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: GREEN }]}>{totalFree}</Text>
          <Text style={s.summaryLabel}>Bens Livres</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: RED }]}>
            {fmtCurrency(totalLienAmount)}
          </Text>
          <Text style={s.summaryLabel}>Valor Total Gravames</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: GREEN }]}>
            {fmtCurrency(data.summary.freeAssets)}
          </Text>
          <Text style={s.summaryLabel}>Valor Livre</Text>
        </View>
      </View>

      {/* Liens table */}
      {liens.length > 0 && (
        <>
          <Text style={s.sectionSubtitle}>Detalhamento dos Gravames</Text>

          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { width: "18%" }]}>
                Tipo de Ativo
              </Text>
              <Text style={[s.tableHeaderCell, { width: "30%" }]}>Bem</Text>
              <Text style={[s.tableHeaderCell, { width: "26%" }]}>
                Credor / Titular
              </Text>
              <Text
                style={[s.tableHeaderCell, { width: "26%", textAlign: "right" }]}
              >
                Valor do Gravame
              </Text>
            </View>

            {liens.map((lien, i) => (
              <View
                key={i}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[s.tableCell, { width: "18%" }]}>
                  {lien.assetType}
                </Text>
                <Text style={[s.tableCell, { width: "30%" }]}>
                  {lien.assetName}
                </Text>
                <Text style={[s.tableCell, { width: "26%" }]}>
                  {lien.holder}
                </Text>
                <Text
                  style={[s.tableCell, { width: "26%", textAlign: "right" }]}
                >
                  {fmtCurrency(lien.amount)}
                </Text>
              </View>
            ))}

            <View style={s.tableTotalsRow}>
              <Text style={[s.tableTotalsCell, { width: "18%" }]}>TOTAL</Text>
              <Text style={[s.tableTotalsCell, { width: "30%" }]}></Text>
              <Text style={[s.tableTotalsCell, { width: "26%" }]}></Text>
              <Text
                style={[s.tableTotalsCell, { width: "26%", textAlign: "right" }]}
              >
                {fmtCurrency(totalLienAmount)}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Free assets summary */}
      <Text style={[s.sectionSubtitle, s.mt8]}>Bens Livres de \u00d4nus</Text>

      {freeRural > 0 && (
        <View style={s.lienFreeCard} wrap={false}>
          <Text style={[s.bold, s.textSm]}>
            Im\u00f3veis Rurais: {freeRural} de {data.ruralProperties.length}
          </Text>
          <Text style={s.textXs}>
            {data.ruralProperties
              .filter((p) => !p.hasLien)
              .map((p) => p.name)
              .join(", ")}
          </Text>
        </View>
      )}

      {freeUrban > 0 && (
        <View style={s.lienFreeCard} wrap={false}>
          <Text style={[s.bold, s.textSm]}>
            Im\u00f3veis Urbanos: {freeUrban} de {data.urbanProperties.length}
          </Text>
          <Text style={s.textXs}>
            {data.urbanProperties
              .filter((p) => !p.hasLien)
              .map((p) => p.description)
              .join(", ")}
          </Text>
        </View>
      )}

      {freeVehicles > 0 && (
        <View style={s.lienFreeCard} wrap={false}>
          <Text style={[s.bold, s.textSm]}>
            Ve\u00edculos/M\u00e1quinas: {freeVehicles} de {data.vehicles.length}
          </Text>
          <Text style={s.textXs}>
            {data.vehicles
              .filter((v) => !v.hasLien)
              .map((v) => v.description)
              .join(", ")}
          </Text>
        </View>
      )}

      {data.participations.length > 0 && (
        <View style={s.lienFreeCard} wrap={false}>
          <Text style={[s.bold, s.textSm]}>
            Participa\u00e7\u00f5es Societ\u00e1rias: {data.participations.length}
          </Text>
          <Text style={s.textXs}>
            {data.participations.map((p) => p.companyName).join(", ")}
          </Text>
        </View>
      )}

      {liens.length === 0 && (
        <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: GREEN }]}>
          <Text style={[s.bold, s.textSm, { color: GREEN }]}>
            Nenhum gravame ou restri\u00e7\u00e3o identificada
          </Text>
          <Text style={s.textXs}>
            Todos os ativos encontram-se livres e desembara\u00e7ados.
          </Text>
        </View>
      )}
    </Page>
  );
}

// ─── Main Document ──────────────────────────────────────────

export function PatrimonyPDFDocument({ data }: { data: PatrimonyPDFData }) {
  return (
    <Document
      title={`Relat\u00f3rio Patrimonial \u2014 ${data.clientName}`}
      author="JRCLaw"
      subject="Relat\u00f3rio Patrimonial"
    >
      {/* Page 1: Cover */}
      <CoverPage
        clientName={data.clientName}
        clientDocument={data.clientDocument}
        generatedAt={data.generatedAt}
        summary={data.summary}
        indicators={data.indicators}
      />

      {/* Page 2: Summary + Indicators */}
      <SummaryPage
        clientName={data.clientName}
        summary={data.summary}
        indicators={data.indicators}
        operational={data.operational}
      />

      {/* Page 3+: Rural Properties */}
      <RuralPropertiesPage
        clientName={data.clientName}
        ruralProperties={data.ruralProperties}
      />

      {/* Production */}
      <ProductionsPage
        clientName={data.clientName}
        productions={data.productions}
      />

      {/* Urban Properties (conditional) */}
      {data.urbanProperties.length > 0 && (
        <UrbanPropertiesPage
          clientName={data.clientName}
          urbanProperties={data.urbanProperties}
        />
      )}

      {/* Vehicles */}
      <VehiclesPage
        clientName={data.clientName}
        vehicles={data.vehicles}
      />

      {/* Participations (conditional) */}
      {data.participations.length > 0 && (
        <ParticipationsPage
          clientName={data.clientName}
          participations={data.participations}
        />
      )}

      {/* Lien Map */}
      <LienMapPage clientName={data.clientName} data={data} />
    </Document>
  );
}
