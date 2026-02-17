"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Calendar, User, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { NEGOTIATION_PHASE_LABELS, NEGOTIATION_PHASE_COLORS } from "@/lib/rj-constants";

interface NegTabMediacaoProps {
  jrcId: string;
}

export function NegTabMediacao({ jrcId }: NegTabMediacaoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNegId, setSelectedNegId] = useState("");
  const [mediadorNome, setMediadorNome] = useState("");
  const [mediadorContato, setMediadorContato] = useState("");
  const [proximaSessao, setProximaSessao] = useState("");

  const { data: negotiations, isLoading } = trpc.rj.negotiations.list.useQuery({
    jrc_id: jrcId,
  });

  const utils = trpc.useUtils();

  const updateNegotiation = trpc.rj.negotiations.update.useMutation({
    onSuccess: () => {
      utils.rj.negotiations.invalidate();
      resetForm();
      setDialogOpen(false);
    },
  });

  const resetForm = () => {
    setSelectedNegId("");
    setMediadorNome("");
    setMediadorContato("");
    setProximaSessao("");
  };

  const handleActivateMediation = () => {
    if (!selectedNegId || !mediadorNome.trim()) return;
    updateNegotiation.mutate({
      id: selectedNegId,
      mediacao_ativa: true,
      mediador_nome: mediadorNome.trim(),
      mediador_contato: mediadorContato.trim() || undefined,
      proxima_sessao: proximaSessao ? new Date(proximaSessao) : undefined,
    });
  };

  // Filter negotiations with active mediation
  const activeMediations = useMemo(
    () => (negotiations || []).filter((n) => n.mediacao_ativa === true),
    [negotiations]
  );

  // Negotiations available to activate mediation (not yet active)
  const availableForMediation = useMemo(
    () => (negotiations || []).filter((n) => !n.mediacao_ativa),
    [negotiations]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mediacao Digital</h2>
          <p className="text-sm text-muted-foreground">
            Sessoes de mediacao digital para resolucao de impasses na negociacao
            com credores.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={availableForMediation.length === 0}
            >
              <Plus className="mr-1 h-4 w-4" /> Ativar Mediacao
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ativar Mediacao</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Negotiation select */}
              <div>
                <Label>Negociacao *</Label>
                <Select value={selectedNegId} onValueChange={setSelectedNegId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a negociacao" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForMediation.map((neg) => (
                      <SelectItem key={neg.id} value={neg.id}>
                        {neg.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mediator name */}
              <div>
                <Label>Nome do Mediador *</Label>
                <Input
                  value={mediadorNome}
                  onChange={(e) => setMediadorNome(e.target.value)}
                  placeholder="Nome completo do mediador"
                />
              </div>

              {/* Mediator contact */}
              <div>
                <Label>Contato do Mediador</Label>
                <Input
                  value={mediadorContato}
                  onChange={(e) => setMediadorContato(e.target.value)}
                  placeholder="E-mail ou telefone"
                />
              </div>

              {/* Next session */}
              <div>
                <Label>Proxima Sessao</Label>
                <Input
                  type="datetime-local"
                  value={proximaSessao}
                  onChange={(e) => setProximaSessao(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleActivateMediation}
                disabled={
                  !selectedNegId ||
                  !mediadorNome.trim() ||
                  updateNegotiation.isPending
                }
              >
                {updateNegotiation.isPending ? "Ativando..." : "Ativar Mediacao"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active mediations */}
      {activeMediations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma mediacao ativa no momento.
            </p>
            <p className="text-xs text-muted-foreground">
              Ative a mediacao em uma negociacao para acompanhar as sessoes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeMediations.map((neg) => {
            const proximaSessaoDate = neg.proxima_sessao
              ? new Date(neg.proxima_sessao)
              : null;
            const isPast =
              proximaSessaoDate && proximaSessaoDate < new Date();

            return (
              <Card key={neg.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="truncate">{neg.titulo}</span>
                    <Badge
                      className={
                        NEGOTIATION_PHASE_COLORS[neg.fase] ||
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {NEGOTIATION_PHASE_LABELS[neg.fase] || neg.fase}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Mediator info */}
                  {neg.mediador_nome && (
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {neg.mediador_nome}
                        </p>
                        {neg.mediador_contato && (
                          <p className="text-xs text-muted-foreground">
                            {neg.mediador_contato}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next session */}
                  {proximaSessaoDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {proximaSessaoDate.toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          {proximaSessaoDate.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {isPast && (
                          <Badge
                            variant="destructive"
                            className="mt-0.5 text-[10px]"
                          >
                            Sessao passada
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Creditors count */}
                  <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                    <span>
                      {neg._count.credores} credor
                      {neg._count.credores !== 1 ? "es" : ""}
                    </span>
                    <span>
                      {neg._count.atividades} atividade
                      {neg._count.atividades !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
