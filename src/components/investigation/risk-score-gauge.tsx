"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

// --- Types ---

interface RiskScoreGaugeProps {
  score: number | null;
  classification: string | null;
  lastAnalysis: string | null;
}

// --- Helpers ---

function getScoreColor(score: number | null): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score <= 20) return "text-green-600";
  if (score <= 40) return "text-lime-600";
  if (score <= 60) return "text-amber-600";
  if (score <= 80) return "text-orange-600";
  return "text-red-600";
}

function getScoreBgRing(score: number | null): string {
  if (score === null || score === undefined) return "ring-muted";
  if (score <= 20) return "ring-green-200 bg-green-50";
  if (score <= 40) return "ring-lime-200 bg-lime-50";
  if (score <= 60) return "ring-amber-200 bg-amber-50";
  if (score <= 80) return "ring-orange-200 bg-orange-50";
  return "ring-red-200 bg-red-50";
}

function getClassificationLetter(
  score: number | null,
  classification: string | null
): string {
  if (classification) return classification;
  if (score === null || score === undefined) return "--";
  if (score <= 20) return "A";
  if (score <= 40) return "B";
  if (score <= 60) return "C";
  if (score <= 80) return "D";
  return "E";
}

function getClassificationLabel(letter: string): string {
  switch (letter) {
    case "A":
      return "Risco Muito Baixo";
    case "B":
      return "Risco Baixo";
    case "C":
      return "Risco Moderado";
    case "D":
      return "Risco Alto";
    case "E":
      return "Risco Muito Alto";
    default:
      return "Sem classificacao";
  }
}

function formatAnalysisDate(dateString: string | null): string {
  if (!dateString) return "Nao analisado";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Component ---

export function RiskScoreGauge({
  score,
  classification,
  lastAnalysis,
}: RiskScoreGaugeProps) {
  const letter = getClassificationLetter(score, classification);
  const label = getClassificationLabel(letter);
  const scoreColor = getScoreColor(score);
  const bgRing = getScoreBgRing(score);

  return (
    <Card className="w-[180px]">
      <CardContent className="p-4 flex flex-col items-center text-center">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Score de Risco
        </p>

        {/* Large score number */}
        <div
          className={`size-20 rounded-full ring-4 flex items-center justify-center ${bgRing}`}
        >
          {score !== null && score !== undefined ? (
            <span className={`text-3xl font-extrabold ${scoreColor}`}>
              {score}
            </span>
          ) : (
            <ShieldAlert className="size-8 text-muted-foreground" />
          )}
        </div>

        {/* Classification letter */}
        <div className="mt-2 flex items-center gap-1">
          <span
            className={`text-lg font-bold ${scoreColor}`}
          >
            {letter}
          </span>
        </div>

        {/* Classification label */}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>

        {/* Last analysis date */}
        <p className="text-[10px] text-muted-foreground mt-2 border-t pt-2 w-full">
          Ultima analise: {formatAnalysisDate(lastAnalysis)}
        </p>
      </CardContent>
    </Card>
  );
}
