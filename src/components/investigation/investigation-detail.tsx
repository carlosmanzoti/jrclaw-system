"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskScoreGauge } from "./risk-score-gauge";
import { PatrimonyCards } from "./patrimony-cards";
import { ScanProgressBar } from "./scan-progress-bar";
import {
  ArrowLeft,
  Loader2,
  Play,
  FileText,
  Brain,
  DollarSign,
  CreditCard,
  Scale,
  Bell,
  User,
  Building2,
  Home,
  Car,
  TrendingUp,
  Tractor,
  Package,
  Check,
  X,
  Clock,
  ExternalLink,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Shield,
} from "lucide-react";

// --- Types (flexible to accept Prisma shapes) ---

/* eslint-disable @typescript-eslint/no-explicit-any */

interface InvestigationDetailProps {
  investigation: any;
  assets: any[];
  timeline: any[];
  alerts: any[];
  onStartScan: () => void;
  onGenerateReport: () => void;
  onAnalyzeWithAI: () => void;
  isScanning: boolean;
  isGeneratingReport: boolean;
  isAnalyzing: boolean;
  onRefresh: () => void;
}

// --- Helpers ---

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDENTE: {
    label: "Pendente",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  EM_ANDAMENTO: {
    label: "Em Andamento",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CONCLUIDA: {
    label: "Concluida",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  ARQUIVADA: {
    label: "Arquivada",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const RELEVANCE_CONFIG: Record<string, { label: string; className: string }> = {
  ALTA: {
    label: "Alta",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  MEDIA: {
    label: "Media",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  BAIXA: {
    label: "Baixa",
    className: "bg-green-50 text-green-700 border-green-200",
  },
};

const SOURCE_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  PUBLICA: {
    label: "Publica",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  PAGA: {
    label: "Paga",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  JUDICIAL: {
    label: "Judicial",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  MANUAL: {
    label: "Manual",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const QUERY_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDENTE: {
    label: "Pendente",
    className: "bg-gray-100 text-gray-600",
  },
  EXECUTANDO: {
    label: "Executando",
    className: "bg-blue-50 text-blue-700 animate-pulse",
  },
  CONCLUIDA: {
    label: "Concluida",
    className: "bg-green-50 text-green-700",
  },
  ERRO: {
    label: "Erro",
    className: "bg-red-50 text-red-700",
  },
};

const PROVIDER_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  GRATUITA: {
    label: "Gratuita",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  PAGA: {
    label: "Paga",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  JUDICIAL: {
    label: "Judicial",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d atras`;
  if (diffHours > 0) return `${diffHours}h atras`;
  if (diffMinutes > 0) return `${diffMinutes}min atras`;
  return "agora";
}

function formatDocument(doc: string, type: "PF" | "PJ"): string {
  if (type === "PF" && doc.length === 11) {
    return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
  }
  if (type === "PJ" && doc.length === 14) {
    return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
  }
  return doc;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  IMOVEL: <Home className="size-4" />,
  VEICULO: <Car className="size-4" />,
  PARTICIPACAO: <Building2 className="size-4" />,
  INVESTIMENTO: <TrendingUp className="size-4" />,
  RURAL: <Tractor className="size-4" />,
  OUTRO: <Package className="size-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  IMOVEL: "Imoveis",
  VEICULO: "Veiculos",
  PARTICIPACAO: "Participacoes",
  INVESTIMENTO: "Investimentos",
  RURAL: "Rural",
  OUTRO: "Outros",
};

// --- Component ---

export function InvestigationDetail({
  investigation,
  assets,
  timeline,
  alerts,
  onStartScan,
  onGenerateReport,
  onAnalyzeWithAI,
  isScanning,
  isGeneratingReport,
  isAnalyzing,
  onRefresh,
}: InvestigationDetailProps) {
  const inv = investigation;
  const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDENTE;
  const patrimonio = Number(inv.totalEstimatedValue ?? 0);
  const dividas = Number(inv.totalDebts ?? 0);
  const lawsuits = inv.lawsuits ?? [];
  const debts = inv.debts ?? [];
  const corporateLinks = inv.corporateLinks ?? [];
  const relatedPersons = inv.relatedPersons ?? [];
  const queries = inv.queries ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/recuperacao-credito/investigacao"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Investigacoes
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground font-medium">{inv.targetName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Left: Name + Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {inv.targetName}
            </h1>
            <Badge variant="outline" className={statusCfg.className}>
              {statusCfg.label}
            </Badge>
            <Badge
              variant="outline"
              className={
                inv.targetType === "PF"
                  ? "bg-violet-50 text-violet-700 border-violet-200"
                  : "bg-sky-50 text-sky-700 border-sky-200"
              }
            >
              {inv.targetType === "PF" ? (
                <User className="size-3 mr-1" />
              ) : (
                <Building2 className="size-3 mr-1" />
              )}
              {inv.targetType === "PF" ? "Pessoa Fisica" : "Pessoa Juridica"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDocument(inv.targetDocument, inv.targetType)} &middot;
            Criado em {formatDate(String(inv.createdAt))} &middot; Ultima atualizacao{" "}
            {formatRelativeTime(String(inv.updatedAt))}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={onStartScan}
              disabled={isScanning}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isScanning ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Executar Scan
            </Button>
            <Button
              variant="outline"
              onClick={onGenerateReport}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <FileText className="size-4 mr-2" />
              )}
              Gerar Relatorio
            </Button>
            <Button
              variant="outline"
              onClick={onAnalyzeWithAI}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Brain className="size-4 mr-2" />
              )}
              Analise IA
            </Button>
          </div>
        </div>

        {/* Right: Risk Score */}
        <div className="shrink-0">
          <RiskScoreGauge
            score={inv.riskScore}
            classification={inv.riskClassification}
            lastAnalysis={inv.updatedAt ? String(inv.updatedAt) : null}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
                <DollarSign className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Patrimonio
                </p>
                <p className="text-lg font-bold text-green-700">
                  {formatBRL(patrimonio)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-red-50 flex items-center justify-center">
                <CreditCard className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dividas
                </p>
                <p className="text-lg font-bold text-red-600">
                  {formatBRL(dividas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Scale className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Processos
                </p>
                <p className="text-lg font-bold text-blue-700">
                  {lawsuits.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Bell className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Alertas
                </p>
                <p className="text-lg font-bold text-amber-700">
                  {(inv.alerts ?? []).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan Progress (if scanning) */}
      {inv.status === "EM_ANDAMENTO" && queries.length > 0 && (
        <ScanProgressBar queries={queries} />
      )}

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="bens">Bens e Ativos</TabsTrigger>
          <TabsTrigger value="processos">Processos</TabsTrigger>
          <TabsTrigger value="dividas">Dividas</TabsTrigger>
          <TabsTrigger value="rede">Rede Societaria</TabsTrigger>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
        </TabsList>

        {/* Tab: Resumo */}
        <TabsContent value="resumo">
          <div className="flex flex-col gap-6 mt-4">
            {/* AI Summary */}
            {inv.aiSummary && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-600" />
                    Resumo da Analise IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {inv.aiSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Patrimony by Category */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Patrimonio por Categoria
              </h3>
              <PatrimonyCards assets={computeAssetsByCategory(assets)} />
            </div>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  Ultimas Descobertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma descoberta registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((entry: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className="size-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium">
                            {entry.title ?? entry.description ?? ""}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {entry.description ?? ""}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(String(entry.date ?? entry.timestamp ?? ""))}
                            </span>
                            {entry.provider && (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  &middot;
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {entry.provider}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Bens e Ativos */}
        <TabsContent value="bens">
          <div className="flex flex-col gap-4 mt-4">
            {assets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhum bem ou ativo encontrado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Group assets by category */}
                {Object.entries(
                  assets.reduce(
                    (groups: Record<string, any[]>, asset: any) => {
                      const cat = asset.category ?? "OUTROS";
                      if (!groups[cat]) groups[cat] = [];
                      groups[cat].push(asset);
                      return groups;
                    },
                    {} as Record<string, any[]>
                  )
                ).map(([category, categoryAssets]) => {
                  const totalValue = categoryAssets.reduce(
                    (sum: number, a: any) => sum + Number(a.estimatedValue ?? a.value ?? 0),
                    0
                  );
                  return (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {CATEGORY_ICONS[category]}
                            {CATEGORY_LABELS[category] || category} (
                            {categoryAssets.length})
                          </span>
                          <span className="text-green-700 font-bold">
                            {formatBRL(totalValue)}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descricao</TableHead>
                              <TableHead className="text-right">
                                Valor
                              </TableHead>
                              <TableHead className="text-center w-[100px]">
                                Penhoravel
                              </TableHead>
                              <TableHead>Restricoes</TableHead>
                              <TableHead className="w-[100px]">
                                Fonte
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryAssets.map((asset: any) => (
                                <TableRow key={asset.id}>
                                  <TableCell className="font-medium">
                                    {asset.description}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-green-700">
                                    {formatBRL(Number(asset.estimatedValue ?? asset.value ?? 0))}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {asset.isSeizable ?? asset.seizable ? (
                                      <Check className="size-4 text-green-600 mx-auto" />
                                    ) : (
                                      <X className="size-4 text-red-500 mx-auto" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {asset.restrictionType ?? asset.restrictions ?? "--"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {asset.sourceProvider ?? asset.source ?? "N/A"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Total */}
                <div className="flex justify-end">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-green-800">
                      Total Patrimonio:{" "}
                      <span className="font-bold">
                        {formatBRL(
                          assets.reduce((sum: number, a: any) => sum + Number(a.estimatedValue ?? a.value ?? 0), 0)
                        )}
                      </span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab: Processos */}
        <TabsContent value="processos">
          <div className="mt-4">
            {lawsuits.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhum processo encontrado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Vara/Tribunal</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Polo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">
                          Relevancia
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lawsuits.map((lawsuit: any) => {
                        const relCfg =
                          RELEVANCE_CONFIG[lawsuit.relevance] ||
                          RELEVANCE_CONFIG.BAIXA;
                        return (
                          <TableRow key={lawsuit.id}>
                            <TableCell className="font-mono text-sm">
                              {lawsuit.caseNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              {lawsuit.court}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {lawsuit.subject}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {lawsuit.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatBRL(Number(lawsuit.estimatedValue ?? lawsuit.value ?? 0))}
                            </TableCell>
                            <TableCell className="text-sm">
                              {lawsuit.status}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={relCfg.className}
                              >
                                {relCfg.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Dividas */}
        <TabsContent value="dividas">
          <div className="flex flex-col gap-6 mt-4">
            {/* Divida Ativa */}
            <DebtSection
              title="Divida Ativa"
              icon={<AlertTriangle className="size-4 text-red-600" />}
              debts={debts.filter((d: any) => d.debtType === "DIVIDA_ATIVA")}
            />

            {/* Protestos */}
            <DebtSection
              title="Protestos"
              icon={<FileText className="size-4 text-amber-600" />}
              debts={debts.filter((d: any) => d.debtType === "PROTESTO")}
            />

            {/* Outros */}
            <DebtSection
              title="Outras Dividas"
              icon={<Shield className="size-4 text-orange-600" />}
              debts={debts.filter((d: any) => d.debtType !== "DIVIDA_ATIVA" && d.debtType !== "PROTESTO")}
            />

            {debts.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma divida encontrada.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Rede Societaria */}
        <TabsContent value="rede">
          <div className="flex flex-col gap-6 mt-4">
            {/* Companies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  Empresas Vinculadas ({corporateLinks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {corporateLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma empresa vinculada encontrada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {corporateLinks.map((company: any) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between border rounded-lg p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {company.companyName ?? company.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {company.companyCnpj ?? company.cnpj}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <Badge variant="outline">
                            {company.role}
                          </Badge>
                          {company.sharePercentage != null && (
                            <span className="text-sm font-bold text-amber-700">
                              {Number(company.sharePercentage)}%
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              company.companyStatus === "ATIVA"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {company.companyStatus ?? "N/A"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Persons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  Pessoas Relacionadas ({relatedPersons.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {relatedPersons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma pessoa relacionada encontrada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {relatedPersons.map((person: any) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between border rounded-lg p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {person.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {person.document}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 ml-4">
                          {person.relationship}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Consultas */}
        <TabsContent value="consultas">
          <div className="flex flex-col gap-4 mt-4">
            {queries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma consulta realizada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provedor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Executado em</TableHead>
                          <TableHead>Duracao</TableHead>
                          <TableHead className="text-right">
                            Custo
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queries.map((query: any) => {
                          const statusCfg =
                            QUERY_STATUS_CONFIG[query.status] ||
                            QUERY_STATUS_CONFIG.PENDENTE;
                          return (
                            <TableRow key={query.id}>
                              <TableCell>
                                <span className="font-medium text-sm">
                                  {query.provider}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {query.queryType}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
                                >
                                  {statusCfg.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {query.createdAt
                                  ? formatDateTime(String(query.createdAt))
                                  : "--"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {query.responseTimeMs
                                  ? `${(query.responseTimeMs / 1000).toFixed(1)}s`
                                  : "--"}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {Number(query.cost ?? 0) > 0
                                  ? formatBRL(Number(query.cost))
                                  : "Gratuita"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Total Cost */}
                <div className="flex justify-end">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-amber-800">
                      Custo Total:{" "}
                      <span className="font-bold">
                        {formatBRL(
                          queries.reduce((sum: number, q: any) => sum + Number(q.cost ?? 0), 0)
                        )}
                      </span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-components ---

function DebtSection({
  title,
  icon,
  debts,
}: {
  title: string;
  icon: React.ReactNode;
  debts: any[];
}) {
  if (debts.length === 0) return null;

  const totalValue = debts.reduce((sum: number, d: any) => sum + Number(d.currentValue ?? d.value ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            {icon}
            {title} ({debts.length})
          </span>
          <span className="text-red-600 font-bold">{formatBRL(totalValue)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descricao</TableHead>
              <TableHead>Credor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt: any) => (
              <TableRow key={debt.id}>
                <TableCell className="font-medium text-sm">
                  {debt.description ?? debt.debtType}
                </TableCell>
                <TableCell className="text-sm">{debt.creditor}</TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatBRL(Number(debt.currentValue ?? debt.value ?? 0))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {debt.inscriptionDate ? formatDate(String(debt.inscriptionDate)) : "--"}
                </TableCell>
                <TableCell className="text-sm">{debt.status ?? "--"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function computeAssetsByCategory(assets: any[]) {
  const categories: Record<string, { count: number; value: number }> = {
    imoveis: { count: 0, value: 0 },
    veiculos: { count: 0, value: 0 },
    participacoes: { count: 0, value: 0 },
    investimentos: { count: 0, value: 0 },
    rural: { count: 0, value: 0 },
    outros: { count: 0, value: 0 },
  };

  for (const asset of assets) {
    const val = Number(asset.estimatedValue ?? 0);
    const cat = String(asset.category ?? "OUTROS");

    if (cat.includes("IMOVEL_URBANO")) {
      categories.imoveis.count++;
      categories.imoveis.value += val;
    } else if (cat.includes("IMOVEL_RURAL")) {
      categories.rural.count++;
      categories.rural.value += val;
    } else if (cat.includes("VEICULO")) {
      categories.veiculos.count++;
      categories.veiculos.value += val;
    } else if (cat.includes("PARTICIPACAO") || cat.includes("ACOES")) {
      categories.participacoes.count++;
      categories.participacoes.value += val;
    } else if (cat.includes("FUNDOS") || cat.includes("DEPOSITO") || cat.includes("CRIPTO")) {
      categories.investimentos.count++;
      categories.investimentos.value += val;
    } else {
      categories.outros.count++;
      categories.outros.value += val;
    }
  }

  return categories as any;
}
