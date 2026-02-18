"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  TrendingDown,
  Target,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Props {
  negotiationId: string;
}

interface AISuggestion {
  category: "ESTRATEGIA" | "RISCO" | "DESAGIO" | "ARGUMENTO" | "PROXIMO_PASSO";
  title: string;
  content: string;
  confidence: "ALTA" | "MEDIA" | "BAIXA";
}

interface AIAnalysis {
  summary: string;
  suggestions: AISuggestion[];
  recommendedDiscount: { min: number; max: number; justification: string } | null;
  riskFactors: string[];
  negotiationStrength: "FORTE" | "MODERADA" | "FRACA";
  strengthJustification: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ESTRATEGIA: <Target className="h-3.5 w-3.5" />,
  RISCO: <AlertTriangle className="h-3.5 w-3.5" />,
  DESAGIO: <TrendingDown className="h-3.5 w-3.5" />,
  ARGUMENTO: <Shield className="h-3.5 w-3.5" />,
  PROXIMO_PASSO: <Lightbulb className="h-3.5 w-3.5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  ESTRATEGIA: "Estratégia",
  RISCO: "Risco",
  DESAGIO: "Deságio",
  ARGUMENTO: "Argumento",
  PROXIMO_PASSO: "Próximo Passo",
};

const CATEGORY_COLORS: Record<string, string> = {
  ESTRATEGIA: "bg-violet-100 text-violet-700",
  RISCO: "bg-red-100 text-red-700",
  DESAGIO: "bg-emerald-100 text-emerald-700",
  ARGUMENTO: "bg-blue-100 text-blue-700",
  PROXIMO_PASSO: "bg-amber-100 text-amber-700",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  ALTA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIA: "bg-amber-50 text-amber-700 border-amber-200",
  BAIXA: "bg-red-50 text-red-700 border-red-200",
};

const STRENGTH_COLORS: Record<string, string> = {
  FORTE: "text-emerald-600",
  MODERADA: "text-amber-600",
  FRACA: "text-red-600",
};

export function CRJAISuggestions({ negotiationId }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const analyzeMutation = trpc.crjNeg.aiAnalyze.useMutation({
    onSuccess: (data) => {
      try {
        const parsed = JSON.parse(data.result) as AIAnalysis;
        setAnalysis(parsed);
      } catch {
        setAnalysis({
          summary: data.result,
          suggestions: [],
          recommendedDiscount: null,
          riskFactors: [],
          negotiationStrength: "MODERADA",
          strengthJustification: "",
        });
      }
    },
  });

  const toggleExpand = (i: number) => {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4" />
          Assistente IA de Negociação
        </h3>
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => analyzeMutation.mutate({ negotiation_id: negotiationId })}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? (
            <>
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Analisando...
            </>
          ) : analysis ? (
            <>
              <RefreshCw className="mr-1 h-3 w-3" />
              Reanalisar
            </>
          ) : (
            <>
              <Brain className="mr-1 h-3 w-3" />
              Analisar Negociação
            </>
          )}
        </Button>
      </div>

      {analyzeMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-3">
            <p className="text-xs text-destructive">
              Erro na análise: {analyzeMutation.error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {!analysis && !analyzeMutation.isPending && (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <div className="text-center">
              <Brain className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Clique em &quot;Analisar Negociação&quot; para obter sugestões da IA
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A IA analisará o credor, valores, histórico de rodadas e proporá estratégias.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {analyzeMutation.isPending && (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Analisando dados da negociação...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo da Análise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed">{analysis.summary}</p>

              <div className="flex items-center gap-4">
                {/* Strength */}
                <div className="text-xs">
                  <span className="text-muted-foreground">Posição negocial: </span>
                  <span
                    className={`font-bold ${STRENGTH_COLORS[analysis.negotiationStrength] || ""}`}
                  >
                    {analysis.negotiationStrength}
                  </span>
                </div>

                {/* Recommended discount */}
                {analysis.recommendedDiscount && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Deságio sugerido: </span>
                    <span className="font-bold text-emerald-600">
                      {analysis.recommendedDiscount.min}% — {analysis.recommendedDiscount.max}%
                    </span>
                  </div>
                )}
              </div>

              {analysis.strengthJustification && (
                <p className="text-[10px] text-muted-foreground">
                  {analysis.strengthJustification}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Risk factors */}
          {analysis.riskFactors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Fatores de Risco ({analysis.riskFactors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {analysis.riskFactors.map((risk, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">
                SUGESTÕES ({analysis.suggestions.length})
              </h4>
              {analysis.suggestions.map((suggestion, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div
                      className="flex cursor-pointer items-center justify-between"
                      onClick={() => toggleExpand(i)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            CATEGORY_COLORS[suggestion.category] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {CATEGORY_ICONS[suggestion.category] || (
                            <Lightbulb className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{suggestion.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                CONFIDENCE_COLORS[suggestion.confidence] || ""
                              }`}
                            >
                              {suggestion.confidence}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {CATEGORY_LABELS[suggestion.category] || suggestion.category}
                          </span>
                        </div>
                      </div>
                      {expanded[i] ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {expanded[i] && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs leading-relaxed">{suggestion.content}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recommended discount detail */}
          {analysis.recommendedDiscount?.justification && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    Faixa de Deságio Recomendada: {analysis.recommendedDiscount.min}% a{" "}
                    {analysis.recommendedDiscount.max}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-emerald-700/80">
                  {analysis.recommendedDiscount.justification}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
