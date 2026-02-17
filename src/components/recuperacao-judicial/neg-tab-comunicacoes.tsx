"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, MessageSquare, Phone, Mail, Video, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  NEG_ACTIVITY_TYPE_LABELS,
  COMMUNICATION_CHANNEL_LABELS,
} from "@/lib/rj-constants";

interface NegTabComunicacoesProps {
  jrcId: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-3.5 w-3.5" />,
  WHATSAPP: <MessageSquare className="h-3.5 w-3.5" />,
  TELEFONE: <Phone className="h-3.5 w-3.5" />,
  REUNIAO_VIRTUAL: <Video className="h-3.5 w-3.5" />,
  REUNIAO_PRESENCIAL: <MessageSquare className="h-3.5 w-3.5" />,
  CARTA: <Mail className="h-3.5 w-3.5" />,
  SISTEMA: <Clock className="h-3.5 w-3.5" />,
};

function groupActivitiesByDate(
  activities: Array<{
    id: string;
    tipo: string;
    canal: string | null;
    descricao: string;
    resultado: string | null;
    creditor_nome: string | null;
    data_atividade: Date | string;
    negotiation: { id: string; titulo: string } | null;
  }>
): Record<string, typeof activities> {
  const groups: Record<string, typeof activities> = {};
  for (const activity of activities) {
    const date = new Date(activity.data_atividade);
    const key = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
  }
  return groups;
}

export function NegTabComunicacoes({ jrcId }: NegTabComunicacoesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [negotiationId, setNegotiationId] = useState("");
  const [tipo, setTipo] = useState("");
  const [canal, setCanal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [resultado, setResultado] = useState("");
  const [creditorNome, setCreditorNome] = useState("");

  const { data: activities, isLoading: loadingActivities } =
    trpc.rj.negotiations.activities.list.useQuery({
      jrc_id: jrcId,
      limit: 100,
    });

  const { data: negotiations, isLoading: loadingNegotiations } =
    trpc.rj.negotiations.list.useQuery({ jrc_id: jrcId });

  const utils = trpc.useUtils();

  const createActivity = trpc.rj.negotiations.activities.create.useMutation({
    onSuccess: () => {
      utils.rj.negotiations.activities.invalidate();
      resetForm();
      setDialogOpen(false);
    },
  });

  const resetForm = () => {
    setNegotiationId("");
    setTipo("");
    setCanal("");
    setDescricao("");
    setResultado("");
    setCreditorNome("");
  };

  const handleSubmit = () => {
    if (!negotiationId || !tipo || !descricao.trim()) return;
    createActivity.mutate({
      negotiation_id: negotiationId,
      tipo,
      canal: canal || undefined,
      descricao: descricao.trim(),
      resultado: resultado.trim() || undefined,
      creditor_nome: creditorNome.trim() || undefined,
    });
  };

  if (loadingActivities || loadingNegotiations) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const grouped = groupActivitiesByDate(activities || []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Comunicações</h2>
          <p className="text-sm text-muted-foreground">
            Registro de atividades e comunicações com credores
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Registrar Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Atividade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Negotiation select */}
              <div>
                <Label>Negociação *</Label>
                <Select value={negotiationId} onValueChange={setNegotiationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a negociação" />
                  </SelectTrigger>
                  <SelectContent>
                    {(negotiations || []).map((neg) => (
                      <SelectItem key={neg.id} value={neg.id}>
                        {neg.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity type */}
              <div>
                <Label>Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NEG_ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel */}
              <div>
                <Label>Canal</Label>
                <Select value={canal} onValueChange={setCanal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMMUNICATION_CHANNEL_LABELS).map(
                      ([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva a atividade realizada..."
                  rows={3}
                />
              </div>

              {/* Result */}
              <div>
                <Label>Resultado</Label>
                <Textarea
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value)}
                  placeholder="Resultado ou observação (opcional)"
                  rows={2}
                />
              </div>

              {/* Creditor name */}
              <div>
                <Label>Nome do Credor</Label>
                <Input
                  value={creditorNome}
                  onChange={(e) => setCreditorNome(e.target.value)}
                  placeholder="Nome do credor envolvido (opcional)"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  !negotiationId ||
                  !tipo ||
                  !descricao.trim() ||
                  createActivity.isPending
                }
              >
                {createActivity.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activity Timeline */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </p>
            <p className="text-xs text-muted-foreground">
              Clique em &quot;Registrar Atividade&quot; para adicionar a
              primeira.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([dateLabel, dateActivities]) => (
          <div key={dateLabel}>
            <h3 className="mb-3 text-sm font-medium capitalize text-muted-foreground">
              {dateLabel}
            </h3>
            <div className="space-y-3">
              {dateActivities.map((activity) => {
                const time = new Date(activity.data_atividade).toLocaleTimeString(
                  "pt-BR",
                  { hour: "2-digit", minute: "2-digit" }
                );
                return (
                  <Card key={activity.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        {/* Time */}
                        <div className="flex items-center gap-1 pt-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{time}</span>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {NEG_ACTIVITY_TYPE_LABELS[activity.tipo] ||
                                activity.tipo}
                            </Badge>
                            {activity.canal && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                {CHANNEL_ICONS[activity.canal]}
                                {COMMUNICATION_CHANNEL_LABELS[activity.canal] ||
                                  activity.canal}
                              </Badge>
                            )}
                            {activity.negotiation && (
                              <span className="text-xs text-muted-foreground">
                                {activity.negotiation.titulo}
                              </span>
                            )}
                            {activity.creditor_nome && (
                              <span className="text-xs text-muted-foreground">
                                &middot; {activity.creditor_nome}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{activity.descricao}</p>
                          {activity.resultado && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <span className="font-medium">Resultado:</span>{" "}
                              {activity.resultado}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
