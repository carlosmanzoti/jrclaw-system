"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Check,
  X,
  Clock,
  Scan,
} from "lucide-react";

// --- Types ---

interface QueryItem {
  id: string;
  provider: string;
  queryType: string;
  status: "PENDENTE" | "EXECUTANDO" | "CONCLUIDA" | "ERRO";
  executedAt: string | null;
  cost: number;
  duration: number | null;
}

interface ScanProgressBarProps {
  queries: QueryItem[];
}

// --- Helpers ---

const STATUS_DISPLAY: Record<
  QueryItem["status"],
  {
    label: string;
    icon: React.ReactNode;
    dotClass: string;
    textClass: string;
    bgClass: string;
  }
> = {
  PENDENTE: {
    label: "Aguardando",
    icon: <Clock className="size-3.5" />,
    dotClass: "bg-gray-300",
    textClass: "text-gray-500",
    bgClass: "bg-gray-100",
  },
  EXECUTANDO: {
    label: "Executando",
    icon: <Loader2 className="size-3.5 animate-spin" />,
    dotClass: "bg-blue-500 animate-pulse",
    textClass: "text-blue-700",
    bgClass: "bg-blue-50",
  },
  CONCLUIDA: {
    label: "Concluida",
    icon: <Check className="size-3.5" />,
    dotClass: "bg-green-500",
    textClass: "text-green-700",
    bgClass: "bg-green-50",
  },
  ERRO: {
    label: "Erro",
    icon: <X className="size-3.5" />,
    dotClass: "bg-red-500",
    textClass: "text-red-700",
    bgClass: "bg-red-50",
  },
};

// --- Component ---

export function ScanProgressBar({ queries }: ScanProgressBarProps) {
  if (!queries || queries.length === 0) return null;

  const totalQueries = queries.length;
  const completedQueries = queries.filter(
    (q) => q.status === "CONCLUIDA" || q.status === "ERRO"
  ).length;
  const runningQueries = queries.filter(
    (q) => q.status === "EXECUTANDO"
  ).length;
  const pendingQueries = queries.filter(
    (q) => q.status === "PENDENTE"
  ).length;
  const errorQueries = queries.filter((q) => q.status === "ERRO").length;

  const progressPercentage =
    totalQueries > 0 ? Math.round((completedQueries / totalQueries) * 100) : 0;

  return (
    <Card className="border-blue-200 bg-blue-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Scan className="size-4 text-blue-600" />
            Progresso do Scan
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {completedQueries}/{totalQueries} consultas &middot;{" "}
            {progressPercentage}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Overall progress bar */}
        <div className="flex flex-col gap-1.5">
          <Progress value={progressPercentage} className="h-2.5" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {runningQueries > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 className="size-3 animate-spin" />
                {runningQueries} executando
              </span>
            )}
            {pendingQueries > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {pendingQueries} aguardando
              </span>
            )}
            {errorQueries > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <X className="size-3" />
                {errorQueries} {errorQueries === 1 ? "erro" : "erros"}
              </span>
            )}
          </div>
        </div>

        {/* Segmented bar by provider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {queries.map((query) => {
            const display = STATUS_DISPLAY[query.status];
            return (
              <div
                key={query.id}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${display.bgClass}`}
              >
                <div
                  className={`size-2 rounded-full shrink-0 ${display.dotClass}`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${display.textClass}`}>
                    {query.provider}
                  </p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    {query.queryType}
                  </p>
                </div>
                <div className={`shrink-0 ${display.textClass}`}>
                  {display.icon}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
