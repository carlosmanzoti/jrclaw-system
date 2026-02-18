"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sparkles, RefreshCw, ArrowRight, Clock } from "lucide-react";

interface NegAIBarProps {
  negotiationId: string;
  healthScore?: number | null;
  healthDetails?: any;
  probabilityAcordo?: number | null;
  haircutMin?: number | null;
  haircutMax?: number | null;
  aiProximaAcao?: string | null;
  aiLastAnalysis?: Date | string | null;
  onRefresh?: () => void;
}

// Color for health score based on thresholds
function getHealthColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  if (score >= 40) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getHealthLabel(score: number): string {
  if (score >= 80) return "Saudavel";
  if (score >= 60) return "Moderada";
  if (score >= 40) return "Atenção";
  return "Critica";
}

// SVG circular gauge component
function HealthGauge({ score }: { score: number }) {
  const radius = 30;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const dashOffset = circumference - (progress / 100) * circumference;
  const color = getHealthColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="76" height="76" viewBox="0 0 76 76">
        {/* Background circle */}
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {/* Score number in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-lg font-bold leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-[9px] text-[#666666] leading-none mt-0.5">
          {getHealthLabel(score)}
        </span>
      </div>
    </div>
  );
}

function formatLastAnalysis(date: Date | string | null | undefined): string {
  if (!date) return "Nunca";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}min atras`;
  if (diffHours < 24) return `${diffHours}h atras`;
  if (diffDays < 7) return `${diffDays}d atras`;

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function NegAIBar({
  negotiationId,
  healthScore,
  healthDetails,
  probabilityAcordo,
  haircutMin,
  haircutMax,
  aiProximaAcao,
  aiLastAnalysis,
  onRefresh,
}: NegAIBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasData =
    healthScore != null ||
    probabilityAcordo != null ||
    haircutMin != null ||
    haircutMax != null ||
    aiProximaAcao != null;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negotiationId,
          type: "health_score",
        }),
      });

      if (!res.ok) {
        console.error("Failed to refresh AI analysis:", res.statusText);
      }

      // Call parent refresh to reload data
      onRefresh?.();
    } catch (error) {
      console.error("Error refreshing AI analysis:", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Card
      className="w-full border"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
      }}
    >
      <div className="flex items-center gap-4 px-4 py-3 flex-wrap lg:flex-nowrap">
        {/* AI Label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Sparkles className="h-4 w-4" style={{ color: "#C9A961" }} />
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "#C9A961" }}
          >
            IA
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 shrink-0 hidden lg:block" />

        {/* Health Score */}
        <div className="flex items-center gap-2 shrink-0">
          {healthScore != null ? (
            <>
              <HealthGauge score={healthScore} />
              <div className="flex flex-col">
                <span
                  className="text-[10px] uppercase tracking-wide font-medium"
                  style={{ color: "#666666" }}
                >
                  Health Score
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Skeleton className="h-[76px] w-[76px] rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 shrink-0 hidden lg:block" />

        {/* Probabilidade de Acordo */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <span
            className="text-[10px] uppercase tracking-wide font-medium"
            style={{ color: "#666666" }}
          >
            Prob. Acordo
          </span>
          {probabilityAcordo != null ? (
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold"
                style={{ color: "#2A2A2A" }}
              >
                {probabilityAcordo}%
              </span>
              <div className="w-16">
                <Progress
                  value={probabilityAcordo}
                  className="h-1.5"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-1.5 w-16" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 shrink-0 hidden lg:block" />

        {/* Haircut Estimado */}
        <div className="flex flex-col gap-1 min-w-[100px]">
          <span
            className="text-[10px] uppercase tracking-wide font-medium"
            style={{ color: "#666666" }}
          >
            Haircut Estimado
          </span>
          {haircutMin != null && haircutMax != null ? (
            <span
              className="text-sm font-bold"
              style={{ color: "#2A2A2A" }}
            >
              {haircutMin}–{haircutMax}%
            </span>
          ) : haircutMin != null || haircutMax != null ? (
            <span
              className="text-sm font-bold"
              style={{ color: "#2A2A2A" }}
            >
              {haircutMin ?? haircutMax}%
            </span>
          ) : (
            <Skeleton className="h-4 w-16" />
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 shrink-0 hidden lg:block" />

        {/* Proxima Acao Recomendada */}
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <span
            className="text-[10px] uppercase tracking-wide font-medium"
            style={{ color: "#666666" }}
          >
            Próxima Ação Recomendada
          </span>
          {aiProximaAcao != null ? (
            <div className="flex items-center gap-2">
              <span
                className="text-xs truncate max-w-[200px]"
                style={{ color: "#2A2A2A" }}
                title={aiProximaAcao}
              >
                {aiProximaAcao}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] shrink-0 cursor-pointer"
                style={{
                  borderColor: "#C9A961",
                  color: "#C9A961",
                }}
              >
                Fazer Agora
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-6 w-20" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 shrink-0 hidden lg:block" />

        {/* Ultima Analise */}
        <div className="flex flex-col gap-1 shrink-0 min-w-[80px]">
          <span
            className="text-[10px] uppercase tracking-wide font-medium"
            style={{ color: "#666666" }}
          >
            Última Análise
          </span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" style={{ color: "#666666" }} />
            <span
              className="text-xs"
              style={{ color: "#2A2A2A" }}
            >
              {formatLastAnalysis(aiLastAnalysis)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 shrink-0 hidden lg:block" />

        {/* Refresh Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shrink-0 h-8 px-3 cursor-pointer"
          style={{
            borderColor: "#C9A961",
            color: "#C9A961",
          }}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="text-xs">
            {isRefreshing ? "Analisando..." : "Atualizar Analise"}
          </span>
        </Button>
      </div>
    </Card>
  );
}
