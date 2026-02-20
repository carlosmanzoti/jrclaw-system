import { createElement } from "react";
import type { PatrimonyPDFData } from "./pdf/patrimony-pdf-template";
import * as XLSX from "xlsx";

export type { PatrimonyPDFData };

// ---------------------------------------------------------------------------
// PDF Export (dynamic import to avoid DOMMatrix SSR error)
// ---------------------------------------------------------------------------

export async function exportPatrimonyPDF(
  data: PatrimonyPDFData
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const { PatrimonyPDFDocument } = await import("./pdf/patrimony-pdf-template");
  const doc = createElement(PatrimonyPDFDocument, { data });
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-patrimonial-${data.clientName
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// XLSX Export
// ---------------------------------------------------------------------------

export interface PatrimonyXLSXData {
  clientName: string;

  summary: {
    totalAssets: number;
    freeAssets: number;
    totalLienAmount: number;
    totalRuralArea: number;
    ruralPropertyCount: number;
    urbanPropertyCount: number;
    vehicleCount: number;
    machineCount: number;
    participationCount: number;
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
    season: string;
    plantedArea: number;
    expectedYield?: number;
    yieldUnit?: string;
    totalProduction?: number;
    totalRevenue?: number;
    productionCost?: number;
  }>;

  urbanProperties: Array<{
    propertyType: string;
    description: string;
    city: string;
    state: string;
    builtArea?: number;
    estimatedValue?: number;
    hasLien: boolean;
  }>;

  vehicles: Array<{
    category: string;
    description: string;
    brand?: string;
    model?: string;
    year?: number;
    plate?: string;
    estimatedValue?: number;
    hasLien: boolean;
  }>;

  participations: Array<{
    companyName: string;
    cnpj?: string;
    participationType: string;
    sharePercentage?: number;
    role?: string;
    companyStatus?: string;
    estimatedValue?: number;
  }>;

  financials: Array<{
    year: number;
    grossRevenue?: number;
    netRevenue?: number;
    ebitda?: number;
    netIncome?: number;
    totalAssets?: number;
    equity?: number;
    totalDebt?: number;
    netDebt?: number;
  }>;

  operational: Array<{
    year: number;
    totalEmployees?: number;
    totalManagedArea?: number;
    ownedArea?: number;
    leasedArea?: number;
    storageCapacity?: number;
    vehicleCount?: number;
    machineCount?: number;
  }>;
}

function centsToReais(cents: number | undefined | null): number | string {
  if (!cents && cents !== 0) return "";
  return cents / 100;
}

export function exportPatrimonyXLSX(data: PatrimonyXLSXData): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo
  const resumoData = [
    ["Relatório Patrimonial", data.clientName],
    [""],
    ["Ativos Totais (R$)", centsToReais(data.summary.totalAssets)],
    ["Livres de Ônus (R$)", centsToReais(data.summary.freeAssets)],
    ["Gravames (R$)", centsToReais(data.summary.totalLienAmount)],
    ["Área Total (ha)", data.summary.totalRuralArea],
    [""],
    ["Imóveis Rurais", data.summary.ruralPropertyCount],
    ["Imóveis Urbanos", data.summary.urbanPropertyCount],
    ["Veículos", data.summary.vehicleCount],
    ["Máquinas", data.summary.machineCount],
    ["Participações", data.summary.participationCount],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Sheet 2: Imóveis Rurais
  const ruralHeader = [
    "Nome",
    "Cidade",
    "UF",
    "Área Total (ha)",
    "Área Produtiva (ha)",
    "Valor Estimado (R$)",
    "Titularidade",
    "Ônus",
    "Credor",
    "Valor Gravame (R$)",
  ];
  const ruralRows = data.ruralProperties.map((p) => [
    p.name,
    p.city,
    p.state,
    p.totalArea,
    p.productiveArea || "",
    centsToReais(p.estimatedValue),
    p.ownership,
    p.hasLien ? "Sim" : "Não",
    p.lienHolder || "",
    centsToReais(p.lienAmount),
  ]);
  const wsRural = XLSX.utils.aoa_to_sheet([ruralHeader, ...ruralRows]);
  XLSX.utils.book_append_sheet(wb, wsRural, "Imóveis Rurais");

  // Sheet 3: Produção
  const prodHeader = [
    "Cultura",
    "Safra",
    "Período",
    "Área (ha)",
    "Produtividade",
    "Unidade",
    "Produção Total",
    "Receita (R$)",
    "Custo (R$)",
  ];
  const prodRows = data.productions.map((p) => [
    p.crop,
    p.harvestYear,
    p.season,
    p.plantedArea,
    p.expectedYield || "",
    p.yieldUnit || "",
    p.totalProduction || "",
    centsToReais(p.totalRevenue),
    centsToReais(p.productionCost),
  ]);
  const wsProd = XLSX.utils.aoa_to_sheet([prodHeader, ...prodRows]);
  XLSX.utils.book_append_sheet(wb, wsProd, "Produção");

  // Sheet 4: Imóveis Urbanos
  const urbanHeader = [
    "Tipo",
    "Descrição",
    "Cidade",
    "UF",
    "Área (m²)",
    "Valor (R$)",
    "Ônus",
  ];
  const urbanRows = data.urbanProperties.map((p) => [
    p.propertyType,
    p.description,
    p.city,
    p.state,
    p.builtArea || "",
    centsToReais(p.estimatedValue),
    p.hasLien ? "Sim" : "Não",
  ]);
  const wsUrban = XLSX.utils.aoa_to_sheet([urbanHeader, ...urbanRows]);
  XLSX.utils.book_append_sheet(wb, wsUrban, "Imóveis Urbanos");

  // Sheet 5: Veículos
  const vehHeader = [
    "Categoria",
    "Descrição",
    "Marca",
    "Modelo",
    "Ano",
    "Placa",
    "Valor (R$)",
    "Ônus",
  ];
  const vehRows = data.vehicles.map((v) => [
    v.category,
    v.description,
    v.brand || "",
    v.model || "",
    v.year || "",
    v.plate || "",
    centsToReais(v.estimatedValue),
    v.hasLien ? "Sim" : "Não",
  ]);
  const wsVeh = XLSX.utils.aoa_to_sheet([vehHeader, ...vehRows]);
  XLSX.utils.book_append_sheet(wb, wsVeh, "Veículos");

  // Sheet 6: Participações
  const partHeader = [
    "Empresa",
    "CNPJ",
    "Tipo",
    "% Participação",
    "Função",
    "Status",
    "Valor (R$)",
  ];
  const partRows = data.participations.map((p) => [
    p.companyName,
    p.cnpj || "",
    p.participationType,
    p.sharePercentage ?? "",
    p.role || "",
    p.companyStatus || "",
    centsToReais(p.estimatedValue),
  ]);
  const wsPart = XLSX.utils.aoa_to_sheet([partHeader, ...partRows]);
  XLSX.utils.book_append_sheet(wb, wsPart, "Participações");

  // Sheet 7: Financeiro
  const finHeader = [
    "Ano",
    "Receita Bruta (R$)",
    "Receita Líquida (R$)",
    "EBITDA (R$)",
    "Lucro Líquido (R$)",
    "Ativo Total (R$)",
    "PL (R$)",
    "Dívida Total (R$)",
    "Dívida Líquida (R$)",
  ];
  const finRows = data.financials.map((f) => [
    f.year,
    centsToReais(f.grossRevenue),
    centsToReais(f.netRevenue),
    centsToReais(f.ebitda),
    centsToReais(f.netIncome),
    centsToReais(f.totalAssets),
    centsToReais(f.equity),
    centsToReais(f.totalDebt),
    centsToReais(f.netDebt),
  ]);
  const wsFin = XLSX.utils.aoa_to_sheet([finHeader, ...finRows]);
  XLSX.utils.book_append_sheet(wb, wsFin, "Financeiro");

  // Sheet 8: Operacional
  const opHeader = [
    "Ano",
    "Funcionários",
    "Área Gestão (ha)",
    "Própria (ha)",
    "Arrendada (ha)",
    "Armazenagem (ton)",
    "Veículos",
    "Máquinas",
  ];
  const opRows = data.operational.map((o) => [
    o.year,
    o.totalEmployees || "",
    o.totalManagedArea || "",
    o.ownedArea || "",
    o.leasedArea || "",
    o.storageCapacity || "",
    o.vehicleCount || "",
    o.machineCount || "",
  ]);
  const wsOp = XLSX.utils.aoa_to_sheet([opHeader, ...opRows]);
  XLSX.utils.book_append_sheet(wb, wsOp, "Operacional");

  // Generate and download
  const filename = `relatorio-patrimonial-${data.clientName
    .replace(/\s+/g, "-")
    .toLowerCase()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
