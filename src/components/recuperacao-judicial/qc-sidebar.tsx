"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  Shield,
  FileText,
  Building2,
  Plus,
  Download,
  Upload,
  GitCompare,
  CheckCircle,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_COLORS,
  JR_STATUS_LABELS,
  formatCentavos,
} from "@/lib/rj-constants";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CLASS_ICONS: Record<string, React.ReactNode> = {
  CLASSE_I_TRABALHISTA: <Briefcase className="h-4 w-4" />,
  CLASSE_II_GARANTIA_REAL: <Shield className="h-4 w-4" />,
  CLASSE_III_QUIROGRAFARIO: <FileText className="h-4 w-4" />,
  CLASSE_IV_ME_EPP: <Building2 className="h-4 w-4" />,
};

interface QCSidebarProps {
  jrcId: string;
  jrc: unknown;
  loading: boolean;
}

export function QCSidebar({ jrcId, jrc, loading }: QCSidebarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: summary, isLoading } = trpc.rj.creditors.summary.useQuery({ jrc_id: jrcId });

  const jrcData = jrc as {
    status_rj: string;
    total_credores: number;
    total_credito: bigint;
    total_classe_i: bigint;
    total_classe_ii: bigint;
    total_classe_iii: bigint;
    total_classe_iv: bigint;
    data_pedido: string | null;
    data_deferimento: string | null;
    data_agc: string | null;
    case_: {
      numero_processo: string | null;
      vara: string | null;
      comarca: string | null;
      tribunal: string | null;
      uf: string | null;
      cliente: { nome: string };
      juiz: { nome: string } | null;
    };
    administrador_judicial: { nome: string } | null;
  } | null;

  if (loading || !jrcData) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const classes = [
    { key: "CLASSE_I_TRABALHISTA", total: jrcData.total_classe_i },
    { key: "CLASSE_II_GARANTIA_REAL", total: jrcData.total_classe_ii },
    { key: "CLASSE_III_QUIROGRAFARIO", total: jrcData.total_classe_iii },
    { key: "CLASSE_IV_ME_EPP", total: jrcData.total_classe_iv },
  ];

  const totalCredito = Number(jrcData.total_credito);

  return (
    <div className="space-y-4 p-4">
      {/* Case Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Dados do Processo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processo</span>
            <span className="font-mono font-medium">{jrcData.case_?.numero_processo || "\u2014"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vara/Comarca</span>
            <span>{jrcData.case_?.vara || "\u2014"} / {jrcData.case_?.comarca || "\u2014"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Juiz</span>
            <span>{jrcData.case_?.juiz?.nome || "\u2014"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Admin. Judicial</span>
            <span>{jrcData.administrador_judicial?.nome || "\u2014"}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fase</span>
            <Badge variant="outline" className="text-[10px]">
              {JR_STATUS_LABELS[jrcData.status_rj] || jrcData.status_rj}
            </Badge>
          </div>
          {jrcData.data_pedido && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pedido</span>
              <span>{new Date(jrcData.data_pedido).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
          {jrcData.data_deferimento && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deferimento</span>
              <span>{new Date(jrcData.data_deferimento).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals by class */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quadro por Classe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            classes.map((cls) => {
              const classCount = summary?.por_classe?.[cls.key]?.count ?? 0;
              const classVal = Number(cls.total);
              const pct = totalCredito > 0 ? (classVal / totalCredito) * 100 : 0;
              return (
                <div key={cls.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded p-0.5 ${CREDIT_CLASS_COLORS[cls.key]?.split(" ")[0] || ""}`}>
                      {CLASS_ICONS[cls.key]}
                    </span>
                    <span className="flex-1 text-xs font-medium">
                      {CREDIT_CLASS_SHORT_LABELS[cls.key]}
                    </span>
                    <span className="text-xs text-muted-foreground">{classCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="w-12 text-right text-[10px] text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs font-medium">{formatCentavos(cls.total)}</span>
                </div>
              );
            })
          )}
          <Separator />
          <div className="flex justify-between text-xs font-semibold">
            <span>Total</span>
            <span>{formatCentavos(jrcData.total_credito)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between text-xs">
            <span className="flex items-center gap-2">
              <Filter className="h-3 w-3" /> Filtros
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Classe</Label>
            <Select>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(CREDIT_CLASS_SHORT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Faixa de Valor</Label>
            <div className="flex gap-2">
              <Input placeholder="Min" className="h-8 text-xs" />
              <Input placeholder="Max" className="h-8 text-xs" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Ações Rápidas</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Plus className="mr-1 h-3 w-3" /> Credor
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Upload className="mr-1 h-3 w-3" /> Importar
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Download className="mr-1 h-3 w-3" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <GitCompare className="mr-1 h-3 w-3" /> Versão
          </Button>
          <Button variant="outline" size="sm" className="col-span-2 h-8 text-xs">
            <CheckCircle className="mr-1 h-3 w-3" /> Validar Subclasses
          </Button>
        </div>
      </div>
    </div>
  );
}
