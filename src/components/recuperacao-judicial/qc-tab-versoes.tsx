"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  GitCompare,
  History,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  TABLE_VERSION_TYPE_LABELS,
  formatCentavos,
} from "@/lib/rj-constants";

interface QCTabVersoesProps {
  jrcId: string;
}

export function QCTabVersoes({ jrcId }: QCTabVersoesProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareIds, setCompareIds] = useState<{ a: string; b: string }>({ a: "", b: "" });
  const [newVersion, setNewVersion] = useState({
    tipo: "INICIAL",
    titulo: "",
    descricao: "",
  });

  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.rj.versions.list.useQuery({ jrc_id: jrcId });

  const createMutation = trpc.rj.versions.create.useMutation({
    onSuccess: () => {
      setShowCreateDialog(false);
      setNewVersion({ tipo: "INICIAL", titulo: "", descricao: "" });
      utils.rj.versions.invalidate();
    },
  });

  const { data: comparison, isLoading: loadingCompare } = trpc.rj.versions.compare.useQuery(
    { version_a_id: compareIds.a, version_b_id: compareIds.b },
    { enabled: !!compareIds.a && !!compareIds.b && showCompareDialog }
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Versões do Quadro de Credores</h2>
          <p className="text-xs text-muted-foreground">
            Snapshots históricos do QGC para acompanhamento e comparação.
          </p>
        </div>
        <div className="flex gap-2">
          {versions && versions.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCompareIds({
                  a: versions[1]?.id || "",
                  b: versions[0]?.id || "",
                });
                setShowCompareDialog(true);
              }}
            >
              <GitCompare className="mr-1 h-3 w-3" /> Comparar
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-3 w-3" /> Criar Versão
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {versions && versions.length > 0 ? (
        <div className="relative space-y-4 pl-8">
          {/* Vertical line */}
          <div className="absolute bottom-0 left-3 top-0 w-px bg-border" />

          {versions.map((v, i) => {
            const summaryData = v.summary_data as {
              total_credores?: number;
              total_credito?: string;
            } | null;

            return (
              <div key={v.id} className="relative">
                {/* Dot */}
                <div
                  className={`absolute -left-5 top-3 h-3 w-3 rounded-full border-2 ${
                    i === 0
                      ? "border-primary bg-primary"
                      : "border-muted-foreground bg-background"
                  }`}
                />

                <Card className={i === 0 ? "border-primary/30" : ""}>
                  <CardContent className="flex items-start justify-between py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">v{v.versao}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {TABLE_VERSION_TYPE_LABELS[v.tipo] || v.tipo}
                        </Badge>
                        {v.publicada && (
                          <Badge className="bg-emerald-100 text-[10px] text-emerald-700">
                            <FileCheck className="mr-1 h-3 w-3" /> Publicada
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{v.titulo}</p>
                      {v.descricao && (
                        <p className="text-xs text-muted-foreground">{v.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <History className="mr-1 inline h-3 w-3" />
                          {new Date(v.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {summaryData && (
                          <>
                            <span>{summaryData.total_credores ?? 0} credores</span>
                            <span>
                              {summaryData.total_credito
                                ? formatCentavos(BigInt(summaryData.total_credito))
                                : "R$ 0,00"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {i < (versions.length - 1) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setCompareIds({ a: versions[i + 1].id, b: v.id });
                          setShowCompareDialog(true);
                        }}
                      >
                        <GitCompare className="mr-1 h-3 w-3" /> vs anterior
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <History className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma versão criada.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie a primeira versão para começar a rastrear alterações no quadro de credores.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Version Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Versão do QGC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Versão *</Label>
              <Select
                value={newVersion.tipo}
                onValueChange={(v) => setNewVersion((f) => ({ ...f, tipo: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TABLE_VERSION_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Título *</Label>
              <Input
                value={newVersion.titulo}
                onChange={(e) => setNewVersion((f) => ({ ...f, titulo: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Ex: QGC v1 — Lista Inicial do AJ"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={newVersion.descricao}
                onChange={(e) => setNewVersion((f) => ({ ...f, descricao: e.target.value }))}
                className="text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  jrc_id: jrcId,
                  tipo: newVersion.tipo,
                  titulo: newVersion.titulo,
                  descricao: newVersion.descricao || undefined,
                })
              }
              disabled={createMutation.isPending || !newVersion.titulo}
            >
              {createMutation.isPending ? "Criando..." : "Criar Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comparação de Versões</DialogTitle>
          </DialogHeader>

          {loadingCompare ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : comparison ? (
            <div className="space-y-4 py-2">
              {/* Header */}
              <div className="flex items-center justify-center gap-3 text-sm">
                <Badge variant="outline">
                  v{comparison.version_a.versao} — {comparison.version_a.titulo}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">
                  v{comparison.version_b.versao} — {comparison.version_b.titulo}
                </Badge>
              </div>

              {/* Changes Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      +{comparison.changes.added}
                    </p>
                    <p className="text-xs text-muted-foreground">Adicionados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      -{comparison.changes.removed}
                    </p>
                    <p className="text-xs text-muted-foreground">Removidos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      ~{comparison.changes.modified}
                    </p>
                    <p className="text-xs text-muted-foreground">Modificados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detail lists */}
              {comparison.changes.details.added.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-emerald-700">
                    Credores Adicionados
                  </p>
                  <div className="max-h-32 overflow-y-auto rounded border text-xs">
                    {comparison.changes.details.added.map(
                      (c: { nome: string; classe: string; valor_atualizado: string }, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between border-b px-2 py-1 last:border-0"
                        >
                          <span>{c.nome}</span>
                          <span className="text-muted-foreground">
                            {formatCentavos(BigInt(c.valor_atualizado))}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {comparison.changes.details.removed.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-red-700">
                    Credores Removidos
                  </p>
                  <div className="max-h-32 overflow-y-auto rounded border text-xs">
                    {comparison.changes.details.removed.map(
                      (c: { nome: string; valor_atualizado: string }, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between border-b px-2 py-1 last:border-0"
                        >
                          <span>{c.nome}</span>
                          <span className="text-muted-foreground">
                            {formatCentavos(BigInt(c.valor_atualizado))}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {comparison.changes.details.modified.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-amber-700">
                    Credores Modificados
                  </p>
                  <div className="max-h-32 overflow-y-auto rounded border text-xs">
                    {comparison.changes.details.modified.map(
                      (c: { nome: string; valor_atualizado: string; classe: string }, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between border-b px-2 py-1 last:border-0"
                        >
                          <span>{c.nome}</span>
                          <span>{c.classe}</span>
                          <span className="text-muted-foreground">
                            {formatCentavos(BigInt(c.valor_atualizado))}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
