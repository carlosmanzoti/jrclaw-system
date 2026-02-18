"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertTriangle,
  Target,
  Vote,
  BarChart3,
  Users,
  Shield,
} from "lucide-react";
import {
  formatBigIntBRL,
  formatBigIntBRLCompact,
  TKI_PROFILE_LABELS,
  TKI_PROFILE_COLORS,
  STRAT_NEG_STATUS_LABELS,
} from "@/lib/strat-neg-constants";

// =============================================================================
// Types
// =============================================================================

type VoteChoice = "FAVORAVEL" | "CONTRARIO" | "ABSTENCAO";

interface VoteState {
  [negotiationId: string]: VoteChoice;
}

// =============================================================================
// Helpers
// =============================================================================

function bigIntToNumber(val: bigint | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "bigint") return Number(val) / 100;
  return Number(val);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.ceil((b.getTime() - a.getTime()) / msPerDay);
}

// =============================================================================
// Loading skeleton
// =============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function StratDashboard() {
  const negotiationsQuery = trpc.stratNeg.negotiations.list.useQuery({});
  const dashboardQuery = trpc.stratNeg.negotiations.dashboard.useQuery({});

  const isLoading = negotiationsQuery.isLoading || dashboardQuery.isLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const negotiations = negotiationsQuery.data ?? [];
  const dashboard = dashboardQuery.data;

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/reestruturacao">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2A2A2A]">
              Dashboard Estratégico
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise consolidada de todas as negociações
            </p>
          </div>
        </div>

        {/* 1. Mapa de Credores */}
        <CreditorMap negotiations={negotiations} />

        {/* 2. Simulador de Votacao */}
        <VotingSimulator negotiations={negotiations} />

        {/* 3. Matriz de Priorizacao */}
        <PriorityMatrix negotiations={negotiations} />

        {/* 4. Analise de Coalizoes */}
        <CoalitionAnalysis negotiations={negotiations} />

        {/* 5. Alertas Estratégicos */}
        <StrategicAlerts
          negotiations={negotiations}
          dashboard={dashboard}
        />
      </div>
    </div>
  );
}

// =============================================================================
// 1. MAPA DE CREDORES
// =============================================================================

function CreditorMap({ negotiations }: { negotiations: any[] }) {
  const [tooltip, setTooltip] = useState<{
    title: string;
    x: number;
    y: number;
  } | null>(null);

  const negsWithGameData = negotiations.filter(
    (n: any) =>
      n.game_poder_voto != null &&
      n.tki_cooperatividade != null
  );

  const hasData = negsWithGameData.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#C9A961]" />
          <CardTitle>Mapa de Credores -- Teoria dos Jogos</CardTitle>
        </div>
        <CardDescription>
          Posicionamento estrategico por poder de voto e cooperatividade
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              Nenhuma negociação possui dados de teoria dos jogos.
            </p>
            <p className="text-xs mt-1">
              Preencha os campos de poder de voto e cooperatividade nas
              negociações para visualizar o mapa.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Chart area */}
            <div
              className="relative border border-border rounded-lg bg-muted/20"
              style={{ width: "100%", height: 400 }}
            >
              {/* Quadrant labels */}
              <div className="absolute top-3 left-3 text-xs font-medium text-muted-foreground">
                Apoiadores
              </div>
              <div className="absolute top-3 right-3 text-xs font-medium text-muted-foreground">
                Aliados
              </div>
              <div className="absolute bottom-3 left-3 text-xs font-medium text-muted-foreground">
                Irrelevantes
              </div>
              <div className="absolute bottom-3 right-3 text-xs font-medium text-muted-foreground">
                Alvos Prioritarios
              </div>

              {/* Quadrant dividers */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

              {/* Axis labels */}
              <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                Poder de Voto (%)
              </div>
              <div
                className="absolute left-[-24px] top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg) translateY(50%)",
                }}
              >
                Cooperatividade
              </div>

              {/* Dots */}
              {negsWithGameData.map((n: any) => {
                const poderVoto = Number(n.game_poder_voto ?? 0);
                const coop = Number(n.tki_cooperatividade ?? 0);
                const valorCredito = bigIntToNumber(n.valor_credito);

                // Position: x = poder_voto (0-100%), y = cooperatividade (0-10, inverted)
                const xPct = Math.min(Math.max(poderVoto, 0), 100);
                const yPct = Math.min(Math.max(coop, 0), 10);
                const left = `${2 + (xPct / 100) * 96}%`;
                const top = `${98 - (yPct / 10) * 96}%`;

                // Color based on coalicao
                const coalicao = (n.game_coalicao as string) ?? "";
                let dotColor = "bg-yellow-500";
                if (
                  coalicao === "FAVORAVEL" ||
                  coalicao === "ALIADO"
                ) {
                  dotColor = "bg-green-500";
                } else if (
                  coalicao === "OPOSICAO" ||
                  coalicao === "LIDER_OPOSICAO"
                ) {
                  dotColor = "bg-red-500";
                }

                // Size based on valor_credito
                let dotSize = "h-3 w-3";
                if (valorCredito >= 10_000_000) {
                  dotSize = "h-6 w-6";
                } else if (valorCredito >= 1_000_000) {
                  dotSize = "h-4.5 w-4.5";
                }

                return (
                  <div
                    key={n.id}
                    className={`absolute ${dotColor} ${dotSize} rounded-full cursor-pointer opacity-80 hover:opacity-100 transition-opacity ring-2 ring-white shadow-sm`}
                    style={{
                      left,
                      top,
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseEnter={(e) => {
                      const rect = (
                        e.currentTarget.parentElement as HTMLElement
                      ).getBoundingClientRect();
                      setTooltip({
                        title: `${n.titulo} (${formatBigIntBRLCompact(n.valor_credito)})`,
                        x:
                          e.currentTarget.getBoundingClientRect().left -
                          rect.left +
                          12,
                        y:
                          e.currentTarget.getBoundingClientRect().top -
                          rect.top -
                          32,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="absolute z-10 rounded-md bg-[#2A2A2A] px-3 py-1.5 text-xs text-white shadow-lg pointer-events-none whitespace-nowrap"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                  }}
                >
                  {tooltip.title}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Favoravel</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span>Neutro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>Oposicao</span>
              </div>
              <div className="ml-4 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <span>Pequeno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span>Médio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-gray-400" />
                <span>Grande</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// 2. SIMULADOR DE VOTACAO
// =============================================================================

function VotingSimulator({ negotiations }: { negotiations: any[] }) {
  const [votes, setVotes] = useState<VoteState>({});

  const handleVoteChange = useCallback(
    (negId: string, vote: VoteChoice) => {
      setVotes((prev) => ({ ...prev, [negId]: vote }));
    },
    []
  );

  // Filter negotiations that have class info (from rj_creditor or classe_credito)
  const classifiedNegs = negotiations.map((n: any) => {
    const classe =
      n.rj_creditor?.classe ??
      n.classe_credito ??
      "III_QUIROGRAFARIO";
    return { ...n, classe_resolved: classe };
  });

  // Compute results per class
  const classResults = useMemo(() => {
    const classes = [
      "I_TRABALHISTA",
      "II_GARANTIA_REAL",
      "III_QUIROGRAFARIO",
      "IV_ME_EPP",
    ] as const;

    const results: Record<
      string,
      {
        label: string;
        credores: typeof classifiedNegs;
        aprovado: boolean;
        favoravel_count: number;
        contrario_count: number;
        abstencao_count: number;
        total_count: number;
        favoravel_valor: number;
        contrario_valor: number;
        total_valor: number;
      }
    > = {};

    const classLabels: Record<string, string> = {
      I_TRABALHISTA: "Classe I - Trabalhista",
      II_GARANTIA_REAL: "Classe II - Garantia Real",
      III_QUIROGRAFARIO: "Classe III - Quirografario",
      IV_ME_EPP: "Classe IV - ME/EPP",
    };

    for (const cls of classes) {
      const credoresNaClasse = classifiedNegs.filter(
        (n) => n.classe_resolved === cls
      );

      let favoravel_count = 0;
      let contrario_count = 0;
      let abstencao_count = 0;
      let favoravel_valor = 0;
      let contrario_valor = 0;
      let total_valor = 0;

      for (const c of credoresNaClasse) {
        const voto = votes[c.id] ?? "ABSTENCAO";
        const valor = bigIntToNumber(c.valor_credito);
        total_valor += valor;

        if (voto === "FAVORAVEL") {
          favoravel_count++;
          favoravel_valor += valor;
        } else if (voto === "CONTRARIO") {
          contrario_count++;
          contrario_valor += valor;
        } else {
          abstencao_count++;
        }
      }

      const total_count = credoresNaClasse.length;
      const votantes = favoravel_count + contrario_count;
      const valor_votantes = favoravel_valor + contrario_valor;

      let aprovado = false;
      if (cls === "I_TRABALHISTA" || cls === "IV_ME_EPP") {
        // Majority by headcount
        aprovado = votantes > 0 && favoravel_count > votantes / 2;
      } else {
        // >50% by value + majority by headcount
        const byValue =
          valor_votantes > 0 && favoravel_valor > valor_votantes / 2;
        const byHead =
          votantes > 0 && favoravel_count > votantes / 2;
        aprovado = byValue && byHead;
      }

      results[cls] = {
        label: classLabels[cls],
        credores: credoresNaClasse,
        aprovado,
        favoravel_count,
        contrario_count,
        abstencao_count,
        total_count,
        favoravel_valor,
        contrario_valor,
        total_valor,
      };
    }

    return results;
  }, [classifiedNegs, votes]);

  // Overall result
  const classesAprovadas = Object.values(classResults).filter(
    (r) => r.aprovado
  ).length;
  const totalClasses = Object.values(classResults).filter(
    (r) => r.total_count > 0
  ).length;
  const planoAprovado =
    totalClasses > 0 &&
    Object.values(classResults).every(
      (r) => r.total_count === 0 || r.aprovado
    );

  // Cram-down check (art. 58)
  const cramDown = useMemo(() => {
    if (planoAprovado) return null;

    // 1. >50% total credits present
    const totalValor = Object.values(classResults).reduce(
      (sum, r) => sum + r.total_valor,
      0
    );
    const totalFavoravel = Object.values(classResults).reduce(
      (sum, r) => sum + r.favoravel_valor,
      0
    );
    const totalContrario = Object.values(classResults).reduce(
      (sum, r) => sum + r.contrario_valor,
      0
    );
    const totalPresente = totalFavoravel + totalContrario;
    const maioriaCreditos =
      totalValor > 0 && totalPresente > totalValor / 2;

    // 2. >=3 of 4 classes approved
    const classesComCredores = Object.values(classResults).filter(
      (r) => r.total_count > 0
    );
    const classesAprovadas = classesComCredores.filter(
      (r) => r.aprovado
    ).length;
    const tresClassesAprovadas =
      classesComCredores.length >= 3 && classesAprovadas >= 3;

    // 3. >1/3 in each dissenting class
    const dissentingClasses = Object.values(classResults).filter(
      (r) => r.total_count > 0 && !r.aprovado
    );
    const tercoNaDissidente = dissentingClasses.every((r) => {
      const votantes = r.favoravel_count + r.contrario_count;
      if (votantes === 0) return false;
      const votanteValor = r.favoravel_valor + r.contrario_valor;
      return (
        votanteValor > 0 && r.favoravel_valor > votanteValor / 3
      );
    });

    const possivel =
      maioriaCreditos && tresClassesAprovadas && tercoNaDissidente;

    return {
      possivel,
      maioriaCreditos,
      tresClassesAprovadas,
      tercoNaDissidente,
    };
  }, [planoAprovado, classResults]);

  if (negotiations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-[#C9A961]" />
            <CardTitle>
              Simulador de Votacao AGC (Art. 45, Lei 11.101)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Vote className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma negociação cadastrada.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Vote className="h-5 w-5 text-[#C9A961]" />
          <CardTitle>
            Simulador de Votacao AGC (Art. 45, Lei 11.101)
          </CardTitle>
        </div>
        <CardDescription>
          Simule os votos dos credores e veja o resultado da aprovacao do
          plano
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voting table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credor</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[180px]">Voto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classifiedNegs.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.titulo}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {classeLabel(n.classe_resolved)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBigIntBRLCompact(n.valor_credito)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={votes[n.id] ?? "ABSTENCAO"}
                      onValueChange={(val) =>
                        handleVoteChange(n.id, val as VoteChoice)
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FAVORAVEL">
                          Favoravel
                        </SelectItem>
                        <SelectItem value="CONTRARIO">
                          Contrario
                        </SelectItem>
                        <SelectItem value="ABSTENCAO">
                          Abstencao
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Results per class */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(classResults).map(([cls, result]) => {
            if (result.total_count === 0) return null;
            return (
              <div
                key={cls}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {result.label}
                  </span>
                  <Badge
                    className={
                      result.aprovado
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-red-100 text-red-700 border-red-300"
                    }
                  >
                    {result.aprovado ? "APROVADO" : "REJEITADO"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    Favoravel: {result.favoravel_count} credores (
                    {formatBRL(result.favoravel_valor)})
                  </p>
                  <p>
                    Contrario: {result.contrario_count} credores (
                    {formatBRL(result.contrario_valor)})
                  </p>
                  <p>
                    Abstencao: {result.abstencao_count} credores
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall result */}
        <div className="rounded-lg border-2 p-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-lg font-bold text-[#2A2A2A]">
              Resultado Geral:
            </span>
            <Badge
              className={`text-base px-4 py-1 ${
                planoAprovado
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {planoAprovado ? "PLANO APROVADO" : "PLANO REJEITADO"}
            </Badge>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {classesAprovadas} de {totalClasses} classes com credores
            aprovaram o plano
          </p>
        </div>

        {/* Cram-down */}
        {cramDown && (
          <div className="rounded-lg border-2 border-dashed p-4 space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-bold text-[#2A2A2A]">
                Cram-down (Art. 58):
              </span>
              <Badge
                className={`px-3 py-1 ${
                  cramDown.possivel
                    ? "bg-amber-500 text-white"
                    : "bg-gray-400 text-white"
                }`}
              >
                {cramDown.possivel
                  ? "Cram-down POSSIVEL"
                  : "Cram-down NAO possivel"}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <CramDownCheck
                label=">50% creditos presentes"
                passed={cramDown.maioriaCreditos}
              />
              <CramDownCheck
                label=">=3 de 4 classes aprovadas"
                passed={cramDown.tresClassesAprovadas}
              />
              <CramDownCheck
                label=">1/3 na classe dissidente"
                passed={cramDown.tercoNaDissidente}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CramDownCheck({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div
      className={`rounded-md px-3 py-2 text-center ${
        passed
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      <span className="mr-1">{passed ? "OK" : "X"}</span>
      {label}
    </div>
  );
}

function classeLabel(classe: string): string {
  const labels: Record<string, string> = {
    I_TRABALHISTA: "Classe I",
    II_GARANTIA_REAL: "Classe II",
    III_QUIROGRAFARIO: "Classe III",
    IV_ME_EPP: "Classe IV",
  };
  return labels[classe] ?? classe;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// =============================================================================
// 3. MATRIZ DE PRIORIZACAO
// =============================================================================

function PriorityMatrix({ negotiations }: { negotiations: any[] }) {
  const scored = useMemo(() => {
    return negotiations
      .map((n: any) => {
        const valor = bigIntToNumber(n.valor_credito);
        const pesoVoto = Number(n.game_poder_voto ?? 0) / 100;
        const cooperatividade = Math.max(
          Number(n.tki_cooperatividade ?? 1),
          0.1
        );
        const riscoHoldout = n.risco_holdout as string | null;
        const riscoNum =
          riscoHoldout === "CRITICO"
            ? 4
            : riscoHoldout === "ALTO"
              ? 3
              : riscoHoldout === "MEDIO"
                ? 2
                : 1;

        const score =
          (valor * Math.max(pesoVoto, 0.01) * riscoNum) /
          cooperatividade;

        return {
          ...n,
          score,
          pesoVoto,
          cooperatividade,
          riscoHoldout: riscoHoldout ?? "BAIXO",
          riscoNum,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [negotiations]);

  if (negotiations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#C9A961]" />
            <CardTitle>Matriz de Priorização de Negociações</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              Nenhuma negociação cadastrada para priorizar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#C9A961]" />
          <CardTitle>Matriz de Priorização de Negociações</CardTitle>
        </div>
        <CardDescription>
          Classificação por score calculado: (valor x peso_voto x
          risco_holdout) / cooperatividade
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Credor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">% Voto</TableHead>
                <TableHead>Estilo TKI</TableHead>
                <TableHead className="text-right">Coop.</TableHead>
                <TableHead>Risco Holdout</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scored.map((n, idx) => {
                let rowClass = "";
                if (idx < 3) {
                  rowClass = "bg-red-50/60";
                } else if (idx < 6) {
                  rowClass = "bg-amber-50/60";
                }

                const tkiPerfil =
                  (n.tki_perfil as string) ?? "";
                const tkiLabel =
                  TKI_PROFILE_LABELS[
                    tkiPerfil as keyof typeof TKI_PROFILE_LABELS
                  ] ?? tkiPerfil;
                const tkiColor =
                  TKI_PROFILE_COLORS[
                    tkiPerfil as keyof typeof TKI_PROFILE_COLORS
                  ] ?? "bg-gray-100 text-gray-600 border-gray-300";

                const riscoColor =
                  n.riscoHoldout === "CRITICO"
                    ? "bg-red-100 text-red-700 border-red-300"
                    : n.riscoHoldout === "ALTO"
                      ? "bg-orange-100 text-orange-700 border-orange-300"
                      : n.riscoHoldout === "MEDIO"
                        ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                        : "bg-green-100 text-green-700 border-green-300";

                return (
                  <TableRow key={n.id} className={rowClass}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {n.titulo}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBigIntBRLCompact(n.valor_credito)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(n.pesoVoto * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {tkiPerfil ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${tkiColor}`}
                        >
                          {tkiLabel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {n.cooperatividade.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${riscoColor}`}
                      >
                        {n.riscoHoldout}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {n.score >= 1_000_000
                        ? `${(n.score / 1_000_000).toFixed(1)}M`
                        : n.score >= 1_000
                          ? `${(n.score / 1_000).toFixed(1)}K`
                          : n.score.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/reestruturacao/${n.id}`}>
                        <Button variant="outline" size="sm">
                          Negociar
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// 4. ANALISE DE COALIZOES
// =============================================================================

function CoalitionAnalysis({ negotiations }: { negotiations: any[] }) {
  const groups = useMemo(() => {
    const favoravel: any[] = [];
    const neutro: any[] = [];
    const oposicao: any[] = [];

    for (const n of negotiations) {
      const coalicao = (n.game_coalicao as string) ?? "NEUTRO";
      if (
        coalicao === "FAVORAVEL" ||
        coalicao === "ALIADO"
      ) {
        favoravel.push(n);
      } else if (
        coalicao === "OPOSICAO" ||
        coalicao === "LIDER_OPOSICAO"
      ) {
        oposicao.push(n);
      } else {
        neutro.push(n);
      }
    }

    return { favoravel, neutro, oposicao };
  }, [negotiations]);

  const totalVotoFavoravel = groups.favoravel.reduce(
    (sum: number, n: any) => sum + Number(n.game_poder_voto ?? 0),
    0
  );
  const totalVotoOposicao = groups.oposicao.reduce(
    (sum: number, n: any) => sum + Number(n.game_poder_voto ?? 0),
    0
  );
  const totalVotoNeutro = groups.neutro.reduce(
    (sum: number, n: any) => sum + Number(n.game_poder_voto ?? 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C9A961]" />
          <CardTitle>Analise de Coalizoes</CardTitle>
        </div>
        <CardDescription>
          Agrupamento de credores por posicionamento estrategico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {negotiations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma negociação cadastrada.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Favoravel */}
              <div className="rounded-lg border bg-green-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-800">
                    Favoravel
                  </span>
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    {groups.favoravel.length} credores
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groups.favoravel.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum credor nesta coalizao
                    </p>
                  ) : (
                    groups.favoravel.map((n: any) => (
                      <CoalitionItem key={n.id} negotiation={n} />
                    ))
                  )}
                </div>
              </div>

              {/* Neutro / Swing */}
              <div className="rounded-lg border bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-800">
                    Neutro / Swing
                  </span>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                    {groups.neutro.length} credores
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groups.neutro.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum credor nesta coalizao
                    </p>
                  ) : (
                    groups.neutro.map((n: any) => (
                      <CoalitionItem key={n.id} negotiation={n} />
                    ))
                  )}
                </div>
              </div>

              {/* Oposicao */}
              <div className="rounded-lg border bg-red-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-800">
                    Oposicao
                  </span>
                  <Badge className="bg-red-100 text-red-700 border-red-300">
                    {groups.oposicao.length} credores
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groups.oposicao.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum credor nesta coalizao
                    </p>
                  ) : (
                    groups.oposicao.map((n: any) => (
                      <CoalitionItem key={n.id} negotiation={n} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm text-[#2A2A2A]">
              <span className="font-medium">
                Favoravel:{" "}
                <span className="text-green-700">
                  {groups.favoravel.length} credores (
                  {totalVotoFavoravel.toFixed(1)}% dos votos)
                </span>
              </span>
              <span className="mx-3 text-muted-foreground">|</span>
              <span className="font-medium">
                Neutro:{" "}
                <span className="text-amber-700">
                  {groups.neutro.length} credores (
                  {totalVotoNeutro.toFixed(1)}% dos votos)
                </span>
              </span>
              <span className="mx-3 text-muted-foreground">|</span>
              <span className="font-medium">
                Oposicao:{" "}
                <span className="text-red-700">
                  {groups.oposicao.length} credores (
                  {totalVotoOposicao.toFixed(1)}% dos votos)
                </span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CoalitionItem({ negotiation }: { negotiation: any }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2 text-xs border">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-[#2A2A2A]">
          {negotiation.titulo}
        </span>
        <span className="text-muted-foreground">
          {formatBigIntBRLCompact(negotiation.valor_credito)}
        </span>
      </div>
      <span className="text-muted-foreground font-mono">
        {Number(negotiation.game_poder_voto ?? 0).toFixed(1)}%
      </span>
    </div>
  );
}

// =============================================================================
// 5. ALERTAS ESTRATEGICOS
// =============================================================================

function StrategicAlerts({
  negotiations,
  dashboard,
}: {
  negotiations: any[];
  dashboard: any;
}) {
  const alerts = useMemo(() => {
    const result: {
      id: string;
      level: "red" | "orange" | "yellow";
      text: string;
      negId?: string;
    }[] = [];

    const now = new Date();

    for (const n of negotiations) {
      // Deadline within 7 days
      if (n.data_limite) {
        const limite = new Date(n.data_limite);
        const dias = daysBetween(now, limite);
        if (dias >= 0 && dias <= 7) {
          result.push({
            id: `deadline-${n.id}`,
            level: "red",
            text: `Deadline em ${dias} dia${dias !== 1 ? "s" : ""} para "${n.titulo}"`,
            negId: n.id,
          });
        }
      }

      // Status IMPASSE
      const status = (n.status as string) ?? "";
      if (status === "IMPASSE") {
        result.push({
          id: `impasse-${n.id}`,
          level: "orange",
          text: `"${n.titulo}" em impasse -- reavaliar estrategia`,
          negId: n.id,
        });
      }

      // BARGANHA for >30 days
      const fase = (n.fase as string) ?? "";
      if (fase === "BARGANHA" && n.updated_at) {
        const updated = new Date(n.updated_at);
        const dias = daysBetween(updated, now);
        if (dias > 30) {
          result.push({
            id: `barganha-${n.id}`,
            level: "yellow",
            text: `"${n.titulo}" ha ${dias} dias em barganha`,
            negId: n.id,
          });
        }
      }
    }

    // Taxa de sucesso
    if (dashboard && dashboard.taxa_sucesso < 50) {
      result.push({
        id: "taxa-sucesso",
        level: "orange",
        text: `Taxa de sucesso abaixo de 50% (${dashboard.taxa_sucesso.toFixed(1)}%)`,
      });
    }

    return result;
  }, [negotiations, dashboard]);

  const levelStyles: Record<string, string> = {
    red: "bg-red-50 border-red-200 text-red-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    yellow: "bg-amber-50 border-amber-200 text-amber-800",
  };

  const levelIconStyles: Record<string, string> = {
    red: "text-red-500",
    orange: "text-orange-500",
    yellow: "text-amber-500",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#C9A961]" />
          <CardTitle>Alertas Estratégicos</CardTitle>
        </div>
        <CardDescription>
          Situações que requerem atenção imediata
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Shield className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">
              Nenhum alerta estratégico no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${levelStyles[alert.level]}`}
              >
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 ${levelIconStyles[alert.level]}`}
                />
                <span className="flex-1 text-sm">{alert.text}</span>
                {alert.negId && (
                  <Link href={`/reestruturacao/${alert.negId}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                    >
                      Ver
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
