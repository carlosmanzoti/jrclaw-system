"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertTriangle, CheckCircle2, AlertCircle, Pencil, Trash2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_COLORS,
  SUBCLASS_VALIDATION_LABELS,
  SUBCLASS_VALIDATION_COLORS,
  CRAM_DOWN_RISK_LABELS,
  CRAM_DOWN_RISK_COLORS,
  formatCentavos,
  formatPercentage,
} from "@/lib/rj-constants";
import { SubclassForm } from "./subclass-form";

interface QCTabSubclassesProps {
  jrcId: string;
}

export function QCTabSubclasses({ jrcId }: QCTabSubclassesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: subclasses, isLoading } = trpc.rj.subclasses.list.useQuery({ jrc_id: jrcId });
  const { data: cramDown } = trpc.rj.subclasses.cramDownRisk.useQuery({ jrc_id: jrcId });

  const deleteMutation = trpc.rj.subclasses.delete.useMutation({
    onSuccess: () => utils.rj.subclasses.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Subclasses de Credores</h2>
          <p className="text-xs text-muted-foreground">
            Conforme REsp 1.634.844/SP — STJ. Subclasses devem atender critérios objetivos,
            interesses homogêneos e proteção de direitos.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditingId(null); setShowForm(true); }}>
          <Plus className="mr-1 h-3 w-3" /> Nova Subclasse
        </Button>
      </div>

      {/* Cram Down Risk Alert */}
      {cramDown && cramDown.risk !== "BAIXO" && (
        <Card className={`border-2 ${
          cramDown.risk === "CRITICO" ? "border-red-300 bg-red-50" :
          cramDown.risk === "ALTO" ? "border-orange-300 bg-orange-50" :
          "border-amber-300 bg-amber-50"
        }`}>
          <CardContent className="flex items-start gap-3 py-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 ${
              cramDown.risk === "CRITICO" ? "text-red-600" :
              cramDown.risk === "ALTO" ? "text-orange-600" : "text-amber-600"
            }`} />
            <div>
              <p className="text-sm font-semibold">
                Risco de Cram Down: {CRAM_DOWN_RISK_LABELS[cramDown.risk]}
              </p>
              <p className="text-xs text-muted-foreground">
                Diferença máxima de deságio entre subclasses: {formatPercentage(cramDown.maxHaircutDiff)}
              </p>
              {cramDown.details.map((d, i) => (
                <p key={i} className="mt-1 text-xs">{d}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subclass Cards */}
      {subclasses && subclasses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subclasses.map((sc) => (
            <Card key={sc.id} className="relative">
              {sc.cor && (
                <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg" style={{ backgroundColor: sc.cor }} />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{sc.nome}</CardTitle>
                    <Badge variant="outline" className={`mt-1 text-[10px] ${CREDIT_CLASS_COLORS[sc.classe_base] || ""}`}>
                      {CREDIT_CLASS_SHORT_LABELS[sc.classe_base]}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => { setEditingId(sc.id); setShowForm(true); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => {
                        if (confirm("Excluir subclasse? Os credores serão desvinculados.")) {
                          deleteMutation.mutate({ id: sc.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {sc.descricao && (
                  <p className="text-muted-foreground line-clamp-2">{sc.descricao}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{sc._count.credores} credores</span>
                  </div>
                  <span className="font-medium">{formatCentavos(sc.total_valor)}</span>
                </div>
                <div className="flex gap-2">
                  {sc.desagio_percentual != null && (
                    <span>Deságio: {formatPercentage(sc.desagio_percentual)}</span>
                  )}
                  {sc.parcelas != null && <span>{sc.parcelas}x</span>}
                  {sc.carencia_meses != null && <span>Carência: {sc.carencia_meses}m</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${SUBCLASS_VALIDATION_COLORS[sc.validacao] || ""}`}>
                    {sc.validacao === "VALIDADA" ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : sc.validacao === "REJEITADA" ? (
                      <AlertCircle className="mr-1 h-3 w-3" />
                    ) : null}
                    {SUBCLASS_VALIDATION_LABELS[sc.validacao] || sc.validacao}
                  </Badge>
                  {sc.risco_cram_down && (
                    <Badge className={`text-[10px] ${CRAM_DOWN_RISK_COLORS[sc.risco_cram_down] || ""}`}>
                      CD: {CRAM_DOWN_RISK_LABELS[sc.risco_cram_down]}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma subclasse criada.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Subclasses permitem tratamento diferenciado dentro de uma mesma classe de credores.
            </p>
          </CardContent>
        </Card>
      )}

      <SubclassForm
        open={showForm}
        onOpenChange={setShowForm}
        jrcId={jrcId}
        subclassId={editingId}
      />
    </div>
  );
}
