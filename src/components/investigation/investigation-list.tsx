"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  MoreHorizontal,
  User,
  Building2,
  ArrowUpRight,
} from "lucide-react";

// --- Types ---

interface Investigation {
  id: string;
  status: string;
  targetName: string;
  targetDocument: string;
  targetType: string;
  riskScore: number | null;
  totalEstimatedValue: unknown;
  totalDebts: unknown;
  updatedAt: string | Date;
  _count?: {
    assets: number;
    debts: number;
    lawsuits: number;
    queries: number;
    alerts: number;
    reports: number;
  };
}

interface InvestigationListProps {
  investigations: Investigation[];
  isLoading: boolean;
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
  CONSULTAS_CONCLUIDAS: {
    label: "Consultas OK",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  ANALISE_IA: {
    label: "Analise IA",
    className: "bg-purple-50 text-purple-700 border-purple-200",
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

function getRiskScoreColor(score: number | null): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score <= 20) return "text-green-600";
  if (score <= 40) return "text-lime-600";
  if (score <= 60) return "text-amber-600";
  if (score <= 80) return "text-orange-600";
  return "text-red-600";
}

function getRiskScoreBg(score: number | null): string {
  if (score === null || score === undefined) return "bg-muted";
  if (score <= 20) return "bg-green-50";
  if (score <= 40) return "bg-lime-50";
  if (score <= 60) return "bg-amber-50";
  if (score <= 80) return "bg-orange-50";
  return "bg-red-50";
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d atras`;
  if (diffHours > 0) return `${diffHours}h atras`;
  if (diffMinutes > 0) return `${diffMinutes}min atras`;
  return "agora";
}

function formatDocument(doc: string, type: string): string {
  if (type === "PF" && doc.length === 11) {
    return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
  }
  if (type === "PJ" && doc.length === 14) {
    return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
  }
  return doc;
}

// --- Component ---

export function InvestigationList({
  investigations,
  isLoading,
}: InvestigationListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (investigations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="mx-auto size-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Eye className="size-6 text-amber-600" />
            </div>
            <p className="text-lg font-medium text-foreground">
              Nenhuma investigacao encontrada
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie uma nova investigacao patrimonial para comecar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead className="w-[80px]">Tipo</TableHead>
              <TableHead className="w-[100px] text-center">
                Score Risco
              </TableHead>
              <TableHead className="text-right">Patrimonio</TableHead>
              <TableHead className="text-right">Dividas</TableHead>
              <TableHead className="text-center w-[70px]">Bens</TableHead>
              <TableHead className="text-center w-[90px]">Processos</TableHead>
              <TableHead className="w-[120px]">Atualizacao</TableHead>
              <TableHead className="w-[80px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investigations.map((inv) => {
              const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDENTE;
              const patrimonio = inv.totalEstimatedValue ? Number(inv.totalEstimatedValue) : 0;
              const dividas = inv.totalDebts ? Number(inv.totalDebts) : 0;
              return (
                <TableRow key={inv.id} className="group">
                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusCfg.className}
                    >
                      {statusCfg.label}
                    </Badge>
                  </TableCell>

                  {/* Alvo (Name + Doc) */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {inv.targetName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDocument(inv.targetDocument, inv.targetType)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Tipo */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        inv.targetType === "PF"
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                      }
                    >
                      <span className="flex items-center gap-1">
                        {inv.targetType === "PF" ? (
                          <User className="size-3" />
                        ) : (
                          <Building2 className="size-3" />
                        )}
                        {inv.targetType}
                      </span>
                    </Badge>
                  </TableCell>

                  {/* Risk Score */}
                  <TableCell className="text-center">
                    {inv.riskScore !== null ? (
                      <span
                        className={`inline-flex items-center justify-center size-10 rounded-full text-sm font-bold ${getRiskScoreBg(inv.riskScore)} ${getRiskScoreColor(inv.riskScore)}`}
                      >
                        {inv.riskScore}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>

                  {/* Patrimonio */}
                  <TableCell className="text-right">
                    <span className="font-medium text-green-700">
                      {formatBRL(patrimonio)}
                    </span>
                  </TableCell>

                  {/* Dividas */}
                  <TableCell className="text-right">
                    <span className="font-medium text-red-600">
                      {formatBRL(dividas)}
                    </span>
                  </TableCell>

                  {/* Bens */}
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">
                      {inv._count?.assets ?? 0}
                    </span>
                  </TableCell>

                  {/* Processos */}
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">
                      {inv._count?.lawsuits ?? 0}
                    </span>
                  </TableCell>

                  {/* Atualizacao */}
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(String(inv.updatedAt))}
                    </span>
                  </TableCell>

                  {/* Acoes */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="size-8 p-0"
                      >
                        <Link
                          href={`/recuperacao-credito/investigacao/${inv.id}`}
                        >
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
