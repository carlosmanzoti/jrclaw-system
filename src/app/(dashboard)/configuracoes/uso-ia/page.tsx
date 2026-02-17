"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, Zap, DollarSign, Hash, Crown, Sparkles } from "lucide-react"
import { MODEL_DISPLAY } from "@/lib/ai-model-map"

const ACTION_LABELS: Record<string, string> = {
  chat: "Chat Jurídico",
  generate: "Geração de Documentos",
  review: "Revisão de Documentos",
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}

function formatCost(cost: number): string {
  return `US$ ${cost.toFixed(4)}`
}

function getModelDisplayName(modelId: string): { name: string; tier: "standard" | "premium" } {
  if (modelId.includes("opus")) return { name: MODEL_DISPLAY.premium.name, tier: "premium" }
  return { name: MODEL_DISPLAY.standard.name, tier: "standard" }
}

export default function UsoIAPage() {
  const { data: stats, isLoading } = trpc.confeccao.usageStats.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uso de IA</h1>
          <p className="text-muted-foreground">Carregando dados de uso...</p>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const mostUsedModel = stats.byModel.length > 0
    ? stats.byModel.reduce((a, b) => (a.requests > b.requests ? a : b))
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Uso de IA</h1>
        <p className="text-muted-foreground">
          Estatísticas de consumo de IA dos últimos 30 dias.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Chamadas
            </CardTitle>
            <Hash className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Consumidos
            </CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(stats.tokensIn + stats.tokensOut)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(stats.tokensIn)} in / {formatTokens(stats.tokensOut)} out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Estimado
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(stats.totalCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Modelo Mais Usado
            </CardTitle>
            <Brain className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mostUsedModel ? (
              <>
                <div className="text-2xl font-bold">
                  {getModelDisplayName(mostUsedModel.model).name}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mostUsedModel.requests} chamadas
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model breakdown */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {(["standard", "premium"] as const).map((tier) => {
          const modelStats = stats.byModel.find((m) => {
            const display = getModelDisplayName(m.model)
            return display.tier === tier
          })

          return (
            <Card key={tier}>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className={`rounded-lg p-2 ${tier === "premium" ? "bg-amber-50" : "bg-blue-50"}`}>
                  {tier === "premium" ? (
                    <Crown className={`size-5 text-amber-600`} />
                  ) : (
                    <Sparkles className={`size-5 text-blue-600`} />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {MODEL_DISPLAY[tier].name}
                    <Badge variant="outline" className={`text-[10px] ${MODEL_DISPLAY[tier].badgeClass}`}>
                      {tier === "premium" ? "Premium" : "Standard"}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {modelStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Chamadas</p>
                      <p className="text-lg font-semibold">{modelStats.requests}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custo</p>
                      <p className="text-lg font-semibold">{formatCost(modelStats.cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tokens In</p>
                      <p className="text-lg font-semibold">{formatTokens(modelStats.tokensIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tokens Out</p>
                      <p className="text-lg font-semibold">{formatTokens(modelStats.tokensOut)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum uso registrado</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action breakdown */}
      {stats.byAction.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uso por Tipo de Ação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byAction.map((action) => (
                <div key={action.actionType} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {ACTION_LABELS[action.actionType] || action.actionType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTokens(action.tokensIn + action.tokensOut)} tokens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{action.requests} chamadas</p>
                    <p className="text-xs text-muted-foreground">{formatCost(action.cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
