"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Scale,
  Building2,
  Eye,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

// ── Severity config ────────────────────────────────────────────
const SEVERITY_STYLES: Record<string, string> = {
  BAIXA: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  MEDIA: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  ALTA: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  CRITICA: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const SEVERITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica",
};

// ── Icon per alert type ────────────────────────────────────────
function AlertIcon({ type }: { type: string }) {
  switch (type) {
    case "ALIENACAO_PATRIMONIAL":
      return <AlertTriangle className="size-4 text-orange-500 shrink-0" />;
    case "NOVO_PROCESSO":
      return <Scale className="size-4 text-blue-500 shrink-0" />;
    case "ALTERACAO_SOCIETARIA":
      return <Building2 className="size-4 text-purple-500 shrink-0" />;
    default:
      return <Bell className="size-4 text-amber-500 shrink-0" />;
  }
}

// ── Relative timestamp ─────────────────────────────────────────
function relativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atras`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atras`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `${diffDays}d atras`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}m atras`;
}

// ── Main component ─────────────────────────────────────────────
export function AlertsWidget() {
  const utils = trpc.useUtils();
  const { data: alerts, isLoading } = trpc.investigation.getAlerts.useQuery({});
  const markRead = trpc.investigation.markAlertRead.useMutation({
    onSuccess: () => {
      utils.investigation.getAlerts.invalidate();
      utils.investigation.getDashboardStats.invalidate();
    },
  });

  const [dismissingId, setDismissingId] = useState<string | null>(null);

  function handleDismiss(alertId: string) {
    setDismissingId(alertId);
    markRead.mutate(
      { alertId },
      { onSettled: () => setDismissingId(null) }
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-4 rounded-full mt-0.5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const items = alerts ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertas Recentes</CardTitle>
        <CardDescription>
          Ultimos alertas de monitoramento patrimonial
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum alerta pendente
          </p>
        ) : (
          <ScrollArea className="h-[380px] pr-2">
            <div className="space-y-3">
              {items.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <AlertIcon type={alert.alertType} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.BAIXA
                        }`}
                      >
                        {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(String(alert.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm leading-snug">{alert.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="outline" size="xs">
                        <Eye className="size-3" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDismiss(alert.id)}
                        disabled={dismissingId === alert.id}
                      >
                        {dismissingId === alert.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        Dispensar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
