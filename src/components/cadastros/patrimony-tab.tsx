"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Tractor,
  Building2,
  Car,
  Briefcase,
  LineChart,
  Factory,
  LayoutDashboard,
  Wheat,
  FileDown,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { exportPatrimonyPDF } from "@/lib/patrimony-export";
import { exportPatrimonyXLSX } from "@/lib/patrimony-export";
import type { PatrimonyPDFData } from "@/lib/pdf/patrimony-pdf-template";

// Import child tab components
import PatrimonyRuralTab from "./patrimony-rural-tab";
import { PatrimonyProductionTab } from "./patrimony-production-tab";
import { PatrimonyUrbanTab } from "./patrimony-urban-tab";
import { PatrimonyVehiclesTab } from "./patrimony-vehicles-tab";
import { PatrimonyParticipationsTab } from "./patrimony-participations-tab";
import { PatrimonyFinancialTab } from "./patrimony-financial-tab";
import { PatrimonyOperationalTab } from "./patrimony-operational-tab";

// ─── Exported helper functions ────────────────────────────────────────────────

export function formatCurrency(cents: number): string {
  if (!cents && cents !== 0) return "\u2014";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCurrencyFull(cents: number): string {
  if (!cents && cents !== 0) return "\u2014";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatArea(ha: number | null | undefined): string {
  if (!ha && ha !== 0) return "\u2014";
  return `${ha.toLocaleString("pt-BR")} ha`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "\u2014";
  return `${value.toFixed(1)}%`;
}

export function formatMultiple(value: number | null | undefined): string {
  if (
    value === null ||
    value === undefined ||
    isNaN(value) ||
    !isFinite(value)
  )
    return "\u2014";
  return `${value.toFixed(2)}x`;
}

// Semaforo indicator helper
type SemaforoColor = "green" | "yellow" | "red" | "gray";

export function getIndicatorColor(
  indicator: string,
  value: number | null | undefined
): SemaforoColor {
  if (
    value === null ||
    value === undefined ||
    isNaN(value) ||
    !isFinite(value)
  )
    return "gray";
  switch (indicator) {
    case "debtToEquity":
      return value < 1.0 ? "green" : value <= 2.0 ? "yellow" : "red";
    case "debtToEbitda":
      return value < 2.5 ? "green" : value <= 4.0 ? "yellow" : "red";
    case "ebitdaMargin":
      return value > 20 ? "green" : value >= 10 ? "yellow" : "red";
    case "netMargin":
      return value > 10 ? "green" : value >= 5 ? "yellow" : "red";
    case "currentRatio":
      return value > 1.2 ? "green" : value >= 0.8 ? "yellow" : "red";
    case "roe":
      return value > 12 ? "green" : value >= 6 ? "yellow" : "red";
    case "grossMargin":
      return value > 30 ? "green" : value >= 15 ? "yellow" : "red";
    default:
      return "gray";
  }
}

const SEMAFORO_COLORS: Record<SemaforoColor, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
};

const PIE_COLORS = [
  "#C9A961",
  "#8B7355",
  "#D4B98C",
  "#6B5B3E",
  "#E8D5B0",
  "#4A3F2F",
];

// ─── Crop label map ───────────────────────────────────────────────────────────

const CROP_LABELS: Record<string, string> = {
  SOJA: "Soja",
  MILHO: "Milho",
  MILHO_SAFRINHA: "Milho Safrinha",
  ALGODAO: "Algodao",
  CAFE: "Cafe",
  CANA_DE_ACUCAR: "Cana de Acucar",
  ARROZ: "Arroz",
  FEIJAO: "Feijao",
  TRIGO: "Trigo",
  SORGO: "Sorgo",
  GIRASSOL: "Girassol",
  EUCALIPTO: "Eucalipto",
  PECUARIA_CORTE: "Pecuaria Corte",
  PECUARIA_LEITE: "Pecuaria Leite",
  SUINOCULTURA: "Suinocultura",
  AVICULTURA: "Avicultura",
  PISCICULTURA: "Piscicultura",
  FRUTICULTURA: "Fruticultura",
  HORTICULTURA: "Horticultura",
  SILVICULTURA: "Silvicultura",
  OUTRA: "Outra",
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface PatrimonyTabProps {
  clientId: string;
}

export function PatrimonyTab({ clientId }: PatrimonyTabProps) {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingXLSX, setExportingXLSX] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const summary = trpc.patrimony.getSummary.useQuery({ clientId });
  const financials = trpc.patrimony.financials.list.useQuery({ clientId });
  const ruralList = trpc.patrimony.ruralProperties.list.useQuery({ clientId });
  const urbanList = trpc.patrimony.urbanProperties.list.useQuery({ clientId });
  const vehiclesList = trpc.patrimony.vehicles.list.useQuery({ clientId });
  const participationsList = trpc.patrimony.participations.list.useQuery({
    clientId,
  });
  const productionsList = trpc.patrimony.productions.list.useQuery({
    clientId,
  });

  // ── Loading state ───────────────────────────────────────────────────────────
  if (summary.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const data = summary.data;
  if (!data) return null;

  // ── Pie chart data ──────────────────────────────────────────────────────────
  const ruralTotal =
    ruralList.data?.reduce((sum, r) => sum + (r.estimatedValue ?? 0), 0) ?? 0;
  const urbanTotal =
    urbanList.data?.reduce((sum, u) => sum + (u.estimatedValue ?? 0), 0) ?? 0;
  const vehiclesTotal =
    vehiclesList.data?.reduce((sum, v) => sum + (v.estimatedValue ?? 0), 0) ??
    0;
  const participationsTotal =
    participationsList.data?.reduce(
      (sum, p) => sum + (p.estimatedValue ?? 0),
      0
    ) ?? 0;

  // Separate machines (agricultural equipment) from regular vehicles
  const machineCategories = new Set([
    "TRATOR",
    "COLHEITADEIRA",
    "PLANTADEIRA",
    "PULVERIZADOR",
    "CARRETA_AGRICOLA",
    "SILO",
    "SECADOR",
    "PIVO_IRRIGACAO",
    "GERADOR",
    "EQUIPAMENTO_INDUSTRIAL",
    "EQUIPAMENTO_ESCRITORIO",
  ]);

  const machinesTotal =
    vehiclesList.data
      ?.filter((v) => machineCategories.has(v.category))
      .reduce((sum, v) => sum + (v.estimatedValue ?? 0), 0) ?? 0;

  const pureVehiclesTotal = vehiclesTotal - machinesTotal;

  const compositionData = [
    { name: "Rurais", value: ruralTotal },
    { name: "Urbanos", value: urbanTotal },
    { name: "Veiculos", value: pureVehiclesTotal },
    { name: "Maquinas", value: machinesTotal },
    { name: "Participacoes", value: participationsTotal },
  ].filter((item) => item.value > 0);

  const compositionTotal = compositionData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  // ── Bar chart data (revenue evolution) ──────────────────────────────────────
  const revenueEvolution = financials.data
    ? [...financials.data]
        .reverse()
        .map((f) => ({
          year: String(f.year),
          grossRevenue: f.grossRevenue,
          ebitda: f.ebitda,
        }))
    : [];

  // ── Financial indicators ────────────────────────────────────────────────────
  const indicators = data.latestFinancial?.indicators;

  const indicatorCards: {
    key: string;
    label: string;
    value: number | null | undefined;
    formatter: (v: number | null | undefined) => string;
  }[] = indicators
    ? [
        {
          key: "debtToEquity",
          label: "Divida/PL",
          value: indicators.debtToEquity,
          formatter: formatMultiple,
        },
        {
          key: "debtToEbitda",
          label: "Div.Liq./EBITDA",
          value: indicators.debtToEbitda,
          formatter: formatMultiple,
        },
        {
          key: "grossMargin",
          label: "Margem Bruta",
          value: indicators.grossMargin,
          formatter: formatPercent,
        },
        {
          key: "ebitdaMargin",
          label: "Margem EBITDA",
          value: indicators.ebitdaMargin,
          formatter: formatPercent,
        },
        {
          key: "netMargin",
          label: "Margem Liquida",
          value: indicators.netMargin,
          formatter: formatPercent,
        },
        {
          key: "currentRatio",
          label: "Liquidez Corrente",
          value: indicators.currentRatio,
          formatter: formatMultiple,
        },
        {
          key: "roe",
          label: "ROE",
          value: indicators.roe,
          formatter: formatPercent,
        },
      ]
    : [];

  // ── Production summary from current harvest ─────────────────────────────────
  const currentHarvestYear = data.currentHarvest?.harvestYear;
  const harvestProductions = currentHarvestYear
    ? (productionsList.data ?? []).filter(
        (p) => p.harvestYear === currentHarvestYear
      )
    : [];

  // Aggregate productions by crop
  const productionByCrop = harvestProductions.reduce(
    (acc, p) => {
      const crop = p.crop;
      if (!acc[crop]) {
        acc[crop] = {
          crop,
          plantedArea: 0,
          totalProduction: 0,
          totalRevenue: 0,
          productionCost: 0,
        };
      }
      acc[crop].plantedArea += p.plantedArea ?? 0;
      acc[crop].totalProduction += p.totalProduction ?? 0;
      acc[crop].totalRevenue += p.totalRevenue ?? 0;
      acc[crop].productionCost += p.productionCost ?? 0;
      return acc;
    },
    {} as Record<
      string,
      {
        crop: string;
        plantedArea: number;
        totalProduction: number;
        totalRevenue: number;
        productionCost: number;
      }
    >
  );

  const productionRows = Object.values(productionByCrop);

  // ── Quick-link tabs ─────────────────────────────────────────────────────────
  const quickLinks = [
    { tab: "rurais", label: "Rurais", icon: Tractor },
    { tab: "producao", label: "Producao", icon: Wheat },
    { tab: "urbanos", label: "Urbanos", icon: Building2 },
    { tab: "veiculos", label: "Veiculos", icon: Car },
    { tab: "participacoes", label: "Participacoes", icon: Briefcase },
    { tab: "financeiro", label: "Financeiro", icon: LineChart },
    { tab: "operacional", label: "Operacional", icon: Factory },
  ];

  // ── Custom tooltip for bar chart ────────────────────────────────────────────
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border bg-background p-3 shadow-sm">
          <p className="mb-1 text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // ── Custom tooltip for pie chart ────────────────────────────────────────────
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const pct =
        compositionTotal > 0
          ? ((entry.value / compositionTotal) * 100).toFixed(1)
          : "0";
      return (
        <div className="rounded-md border bg-background p-3 shadow-sm">
          <p className="text-sm font-medium">{entry.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(entry.value)} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // ── Pie label renderer ──────────────────────────────────────────────────────
  const renderPieLabel = ({
    name,
    percent,
  }: {
    name?: string;
    percent?: number;
  }) => {
    if (!percent || percent < 0.05) return null;
    return `${name || ""} ${(percent * 100).toFixed(0)}%`;
  };

  // ── Export handlers ─────────────────────────────────────────────────────────

  const handleExportPDF = async () => {
    if (!data) return;
    setExportingPDF(true);
    try {
      const pdfData: PatrimonyPDFData = {
        clientName: "Cliente",
        generatedAt: new Date().toLocaleDateString("pt-BR"),
        summary: {
          totalAssets: data.totalAssets,
          freeAssets: data.freeAssets,
          totalLienAmount: data.totalLienAmount,
          totalRuralArea: data.totalRuralArea,
          totalOwnedArea: data.totalOwnedArea,
          ruralPropertyCount: data.counts.ruralProperties,
          urbanPropertyCount: data.counts.urbanProperties,
          vehicleCount: data.counts.vehicles,
          machineCount: 0,
          participationCount: data.counts.participations,
        },
        indicators: data.latestFinancial?.indicators ? {
          year: data.latestFinancial.year,
          grossRevenue: data.latestFinancial.grossRevenue,
          ebitda: data.latestFinancial.ebitda,
          netIncome: data.latestFinancial.netIncome,
          totalDebt: data.latestFinancial.totalDebt,
          netDebt: data.latestFinancial.netDebt,
          equity: data.latestFinancial.equity,
          debtToEquity: data.latestFinancial.indicators.debtToEquity ?? 0,
          debtToEbitda: data.latestFinancial.indicators.debtToEbitda ?? 0,
          currentRatio: data.latestFinancial.indicators.currentRatio ?? 0,
          grossMargin: data.latestFinancial.indicators.grossMargin ?? 0,
          ebitdaMargin: data.latestFinancial.indicators.ebitdaMargin ?? 0,
          netMargin: data.latestFinancial.indicators.netMargin ?? 0,
          roe: data.latestFinancial.indicators.roe ?? 0,
        } : undefined,
        ruralProperties: (ruralList.data || []).map((p: any) => ({
          name: p.name, city: p.city, state: p.state, totalArea: p.totalArea,
          productiveArea: p.productiveArea, estimatedValue: p.estimatedValue,
          hasLien: p.hasLien, lienHolder: p.lienHolder, lienAmount: p.lienAmount, ownership: p.ownership,
        })),
        productions: (productionsList.data || []).map((p: any) => ({
          crop: CROP_LABELS[p.crop as keyof typeof CROP_LABELS] || p.crop,
          harvestYear: p.harvestYear, plantedArea: p.plantedArea,
          totalProduction: p.totalProduction, yieldUnit: p.yieldUnit,
          totalRevenue: p.totalRevenue, productionCost: p.productionCost,
        })),
        urbanProperties: (urbanList.data || []).map((p: any) => ({
          propertyType: p.propertyType, description: p.description,
          city: p.city, state: p.state, estimatedValue: p.estimatedValue, hasLien: p.hasLien,
        })),
        vehicles: (vehiclesList.data || []).map((v: any) => ({
          category: v.category, description: v.description,
          year: v.year, estimatedValue: v.estimatedValue, hasLien: v.hasLien,
        })),
        participations: (participationsList.data || []).map((p: any) => ({
          companyName: p.companyName, cnpj: p.cnpj, participationType: p.participationType,
          sharePercentage: p.sharePercentage, estimatedValue: p.estimatedValue,
        })),
        operational: data.latestOperational ? {
          year: data.latestOperational.year,
          totalEmployees: data.latestOperational.totalEmployees ?? undefined,
          totalManagedArea: data.latestOperational.totalManagedArea ?? undefined,
          storageCapacity: data.latestOperational.storageCapacity ?? undefined,
        } : undefined,
      };
      await exportPatrimonyPDF(pdfData);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportXLSX = () => {
    if (!data) return;
    setExportingXLSX(true);
    try {
      exportPatrimonyXLSX({
        clientName: "Cliente",
        summary: {
          totalAssets: data.totalAssets, freeAssets: data.freeAssets,
          totalLienAmount: data.totalLienAmount, totalRuralArea: data.totalRuralArea,
          ruralPropertyCount: data.counts.ruralProperties, urbanPropertyCount: data.counts.urbanProperties,
          vehicleCount: data.counts.vehicles, machineCount: 0,
          participationCount: data.counts.participations,
        },
        ruralProperties: (ruralList.data || []).map((p: any) => ({
          name: p.name, city: p.city, state: p.state, totalArea: p.totalArea,
          productiveArea: p.productiveArea, estimatedValue: p.estimatedValue,
          hasLien: p.hasLien, lienHolder: p.lienHolder, lienAmount: p.lienAmount, ownership: p.ownership,
        })),
        productions: (productionsList.data || []).map((p: any) => ({
          crop: CROP_LABELS[p.crop as keyof typeof CROP_LABELS] || p.crop,
          harvestYear: p.harvestYear, season: p.season, plantedArea: p.plantedArea,
          expectedYield: p.expectedYield, yieldUnit: p.yieldUnit, totalProduction: p.totalProduction,
          totalRevenue: p.totalRevenue, productionCost: p.productionCost,
        })),
        urbanProperties: (urbanList.data || []).map((p: any) => ({
          propertyType: p.propertyType, description: p.description,
          city: p.city, state: p.state, builtArea: p.builtArea,
          estimatedValue: p.estimatedValue, hasLien: p.hasLien,
        })),
        vehicles: (vehiclesList.data || []).map((v: any) => ({
          category: v.category, description: v.description, brand: v.brand,
          model: v.model, year: v.year, plate: v.plate,
          estimatedValue: v.estimatedValue, hasLien: v.hasLien,
        })),
        participations: (participationsList.data || []).map((p: any) => ({
          companyName: p.companyName, cnpj: p.cnpj, participationType: p.participationType,
          sharePercentage: p.sharePercentage, role: p.role, companyStatus: p.companyStatus,
          estimatedValue: p.estimatedValue,
        })),
        financials: (financials.data || []).map((f: any) => ({
          year: f.year, grossRevenue: f.grossRevenue, netRevenue: f.netRevenue,
          ebitda: f.ebitda, netIncome: f.netIncome, totalAssets: f.totalAssets,
          equity: f.equity, totalDebt: f.totalDebt, netDebt: f.netDebt,
        })),
        operational: [],
      });
    } catch (e) {
      console.error("XLSX export error:", e);
    } finally {
      setExportingXLSX(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="flex flex-wrap gap-1">
        <TabsTrigger value="visao-geral" className="gap-1.5">
          <LayoutDashboard className="h-4 w-4" />
          Visao Geral
        </TabsTrigger>
        <TabsTrigger value="rurais" className="gap-1.5">
          <Tractor className="h-4 w-4" />
          Rurais
        </TabsTrigger>
        <TabsTrigger value="producao" className="gap-1.5">
          <Wheat className="h-4 w-4" />
          Producao
        </TabsTrigger>
        <TabsTrigger value="urbanos" className="gap-1.5">
          <Building2 className="h-4 w-4" />
          Urbanos
        </TabsTrigger>
        <TabsTrigger value="veiculos" className="gap-1.5">
          <Car className="h-4 w-4" />
          Veiculos
        </TabsTrigger>
        <TabsTrigger value="participacoes" className="gap-1.5">
          <Briefcase className="h-4 w-4" />
          Participacoes
        </TabsTrigger>
        <TabsTrigger value="financeiro" className="gap-1.5">
          <LineChart className="h-4 w-4" />
          Financeiro
        </TabsTrigger>
        <TabsTrigger value="operacional" className="gap-1.5">
          <Factory className="h-4 w-4" />
          Operacional
        </TabsTrigger>
      </TabsList>

      {/* ═══════════════════════════════════════════════════════════════════════
          VISAO GERAL TAB
          ═══════════════════════════════════════════════════════════════════ */}
      <TabsContent value="visao-geral" className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Relatorio Patrimonial
            </h2>
            <p className="text-sm text-muted-foreground">
              Visao consolidada do patrimonio, indicadores financeiros e producao
              agricola
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exportingPDF}
            >
              {exportingPDF ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportXLSX}
              disabled={exportingXLSX}
            >
              {exportingXLSX ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-4 w-4" />}
              Exportar XLSX
            </Button>
          </div>
        </div>

        <Separator />

        {/* ── Row 1: Asset summary stats ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Ativos Totais</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.totalAssets)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.counts.ruralProperties +
                  data.counts.urbanProperties +
                  data.counts.vehicles +
                  data.counts.participations}{" "}
                ativos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Livres de Onus</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.freeAssets)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.totalAssets > 0
                  ? `${((data.freeAssets / data.totalAssets) * 100).toFixed(0)}% do patrimonio`
                  : "\u2014"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Gravames</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.totalLienAmount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total de onus e gravames
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Area Total</p>
              <p className="text-2xl font-bold">
                {formatArea(data.totalRuralArea)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatArea(data.totalOwnedArea)} proprios
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: Financial / operational stats ───────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Faturamento Bruto{" "}
                {data.latestFinancial?.year
                  ? `(${data.latestFinancial.year})`
                  : ""}
              </p>
              <p className="text-2xl font-bold">
                {data.latestFinancial
                  ? formatCurrency(data.latestFinancial.grossRevenue)
                  : "\u2014"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                EBITDA{" "}
                {data.latestFinancial?.year
                  ? `(${data.latestFinancial.year})`
                  : ""}
              </p>
              <p className="text-2xl font-bold">
                {data.latestFinancial
                  ? formatCurrency(data.latestFinancial.ebitda)
                  : "\u2014"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Funcionarios</p>
              <p className="text-2xl font-bold">
                {data.latestOperational?.totalEmployees ?? "\u2014"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.latestOperational?.year
                  ? `Dados de ${data.latestOperational.year}`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Divida Total</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.latestFinancial
                  ? formatCurrency(data.latestFinancial.totalDebt)
                  : "\u2014"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Financial Indicators (Semaforo) ────────────────────────────── */}
        {indicators && indicatorCards.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Indicadores Financeiros</h3>
            <Separator />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {indicatorCards.map((ind) => {
                const color = getIndicatorColor(ind.key, ind.value);
                return (
                  <Card key={ind.key} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${SEMAFORO_COLORS[color]}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {ind.label}
                        </span>
                      </div>
                      <p className="text-lg font-bold">
                        {ind.formatter(ind.value)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pie Chart: Composicao do Patrimonio */}
          {compositionData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Composicao do Patrimonio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={true}
                    >
                      {compositionData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Bar Chart: Evolucao do Faturamento */}
          {revenueEvolution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Evolucao do Faturamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis
                      tickFormatter={(value: number) =>
                        `${(value / 100_000_000).toFixed(0)}M`
                      }
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="grossRevenue"
                      name="Faturamento Bruto"
                      fill="#C9A961"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="ebitda"
                      name="EBITDA"
                      fill="#8B7355"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Production Summary Table ────────────────────────────────────── */}
        {currentHarvestYear && productionRows.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Producao Agricola - Safra {currentHarvestYear}
            </h3>
            <Separator />
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cultura</TableHead>
                      <TableHead className="text-right">Area</TableHead>
                      <TableHead className="text-right">Prod. Est.</TableHead>
                      <TableHead className="text-right">
                        Receita Est.
                      </TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionRows.map((row) => (
                      <TableRow key={row.crop}>
                        <TableCell className="font-medium">
                          {CROP_LABELS[row.crop] ?? row.crop}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatArea(row.plantedArea)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalProduction
                            ? row.totalProduction.toLocaleString("pt-BR")
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.productionCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatArea(
                          productionRows.reduce(
                            (sum, r) => sum + r.plantedArea,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {productionRows
                          .reduce((sum, r) => sum + r.totalProduction, 0)
                          .toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          productionRows.reduce(
                            (sum, r) => sum + r.totalRevenue,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          productionRows.reduce(
                            (sum, r) => sum + r.productionCost,
                            0
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Quick Links ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Secoes Detalhadas</h3>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.tab}
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActiveTab(link.tab)}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Button>
              );
            })}
          </div>
        </div>
      </TabsContent>

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB CONTENTS
          ═══════════════════════════════════════════════════════════════════ */}
      <TabsContent value="rurais">
        <PatrimonyRuralTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="producao">
        <PatrimonyProductionTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="urbanos">
        <PatrimonyUrbanTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="veiculos">
        <PatrimonyVehiclesTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="participacoes">
        <PatrimonyParticipationsTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="financeiro">
        <PatrimonyFinancialTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="operacional">
        <PatrimonyOperationalTab clientId={clientId} />
      </TabsContent>
    </Tabs>
  );
}
