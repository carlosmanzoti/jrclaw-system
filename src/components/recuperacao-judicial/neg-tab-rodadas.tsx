"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ChevronRight,
  Users,
  Calendar,
  Percent,
  Hash,
  Link2,
  Unlink,
  Handshake,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  formatCentavos,
  NEGOTIATION_PHASE_LABELS,
  NEGOTIATION_PHASE_COLORS,
  NEGOTIATION_PRIORITY_LABELS,
  NEGOTIATION_PRIORITY_COLORS,
  CREDITOR_NEG_STATUS_LABELS,
  CREDITOR_NEG_STATUS_COLORS,
  CREDIT_CLASS_SHORT_LABELS,
} from "@/lib/rj-constants";
import {
  CRJ_STATUS_LABELS,
  CRJ_STATUS_COLORS,
  CRJ_PRIORITY_COLORS,
  formatBRL,
} from "@/lib/crj-constants";

interface NegTabRodadasProps {
  jrcId: string;
}

interface CreateFormState {
  titulo: string;
  descricao: string;
  prioridade: string;
  data_limite: string;
  desagio_proposto: string;
  carencia_proposta: string;
  parcelas_propostas: string;
  juros_proposto: string;
}

const initialFormState: CreateFormState = {
  titulo: "",
  descricao: "",
  prioridade: "MEDIA",
  data_limite: "",
  desagio_proposto: "",
  carencia_proposta: "",
  parcelas_propostas: "",
  juros_proposto: "",
};

export function NegTabRodadas({ jrcId }: NegTabRodadasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addCreditorOpen, setAddCreditorOpen] = useState(false);
  const [linkCrjOpen, setLinkCrjOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(initialFormState);
  const [creditorSearch, setCreditorSearch] = useState("");
  const [crjSearch, setCrjSearch] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: negotiations, isLoading: loadingList } =
    trpc.rj.negotiations.list.useQuery({ jrc_id: jrcId });

  const { data: selectedNeg, isLoading: loadingDetail } =
    trpc.rj.negotiations.getById.useQuery(
      { id: selectedId! },
      { enabled: !!selectedId }
    );

  const { data: availableCreditors, isLoading: loadingCreditors } =
    trpc.rj.creditors.list.useQuery({ jrc_id: jrcId });

  // CRJ negotiations for linking
  const { data: crjNegotiations } = trpc.crjNeg.negotiations.list.useQuery(
    { jrc_id: jrcId },
    { enabled: linkCrjOpen }
  );

  // Mutations
  const createMutation = trpc.rj.negotiations.create.useMutation({
    onSuccess: (data) => {
      utils.rj.negotiations.invalidate();
      setCreateOpen(false);
      setForm(initialFormState);
      if (data?.id) {
        setSelectedId(data.id);
      }
    },
  });

  const updateMutation = trpc.rj.negotiations.update.useMutation({
    onSuccess: () => {
      utils.rj.negotiations.invalidate();
    },
  });

  const addCreditorMutation = trpc.rj.negotiations.creditors.add.useMutation({
    onSuccess: () => {
      utils.rj.negotiations.invalidate();
      setAddCreditorOpen(false);
      setCreditorSearch("");
    },
  });

  const updateCreditorMutation =
    trpc.rj.negotiations.creditors.update.useMutation({
      onSuccess: () => {
        utils.rj.negotiations.invalidate();
      },
    });

  const linkCrjMutation = trpc.rj.negotiations.linkCrj.useMutation({
    onSuccess: () => {
      utils.rj.negotiations.invalidate();
      setLinkCrjOpen(false);
      setCrjSearch("");
    },
  });

  const unlinkCrjMutation = trpc.rj.negotiations.unlinkCrj.useMutation({
    onSuccess: () => {
      utils.rj.negotiations.invalidate();
    },
  });

  // Handlers
  const handleCreate = () => {
    createMutation.mutate({
      jrc_id: jrcId,
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      prioridade: form.prioridade,
      data_limite: form.data_limite ? new Date(form.data_limite) : undefined,
      desagio_proposto: form.desagio_proposto
        ? parseFloat(form.desagio_proposto)
        : undefined,
      carencia_proposta: form.carencia_proposta
        ? parseInt(form.carencia_proposta, 10)
        : undefined,
      parcelas_propostas: form.parcelas_propostas
        ? parseInt(form.parcelas_propostas, 10)
        : undefined,
      juros_proposto: form.juros_proposto
        ? parseFloat(form.juros_proposto)
        : undefined,
    });
  };

  const handleAddCreditor = (creditorId: string) => {
    if (!selectedId) return;
    addCreditorMutation.mutate({
      negotiation_id: selectedId,
      creditor_ids: [creditorId],
    });
  };

  const handleCreditorStatusChange = (
    creditorNegId: string,
    newStatus: string
  ) => {
    updateCreditorMutation.mutate({
      id: creditorNegId,
      status: newStatus,
    });
  };

  const handleLinkCrj = (crjNegId: string) => {
    if (!selectedId) return;
    linkCrjMutation.mutate({
      rj_negotiation_id: selectedId,
      crj_negotiation_ids: [crjNegId],
    });
  };

  const handleUnlinkCrj = (crjNegId: string) => {
    if (!selectedId) return;
    unlinkCrjMutation.mutate({
      rj_negotiation_id: selectedId,
      crj_negotiation_id: crjNegId,
    });
  };

  const updateField = (field: keyof CreateFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Filtered creditors for the add dialog (exclude already added)
  const existingCreditorIds = new Set(
    (selectedNeg?.credores || []).map(
      (c: { creditor_id: string }) => c.creditor_id
    )
  );

  const filteredAvailableCreditors = (availableCreditors?.items || []).filter(
    (c: { id: string; nome: string }) => {
      if (existingCreditorIds.has(c.id)) return false;
      if (creditorSearch) {
        return c.nome.toLowerCase().includes(creditorSearch.toLowerCase());
      }
      return true;
    }
  );

  // Filtered CRJ negotiations for linking (exclude already linked)
  const linkedCrjIds = new Set(
    (selectedNeg?.crj_links || []).map(
      (l: { crj_negotiation_id: string }) => l.crj_negotiation_id
    )
  );

  const filteredCrjNegotiations = (crjNegotiations || []).filter(
    (n: { id: string; title: string; creditor?: { nome?: string } }) => {
      if (linkedCrjIds.has(n.id)) return false;
      if (crjSearch) {
        const search = crjSearch.toLowerCase();
        return (
          n.title.toLowerCase().includes(search) ||
          (n.creditor?.nome || "").toLowerCase().includes(search)
        );
      }
      return true;
    }
  );

  // Loading state
  if (loadingList) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-[400px]" />
          <Skeleton className="col-span-2 h-[400px]" />
        </div>
      </div>
    );
  }

  const items = negotiations || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="text-sm font-semibold">Rodadas de Negociação</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">
              <Plus className="mr-1 h-3 w-3" /> Nova Rodada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Rodada de Negociação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => updateField("titulo", e.target.value)}
                  placeholder="Ex: Rodada 1 - Quirografários"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.descricao}
                  onChange={(e) => updateField("descricao", e.target.value)}
                  placeholder="Objetivo e estratégia desta rodada..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={form.prioridade}
                    onValueChange={(v) => updateField("prioridade", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NEGOTIATION_PRIORITY_LABELS).map(
                        ([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Limite</Label>
                  <Input
                    type="date"
                    value={form.data_limite}
                    onChange={(e) => updateField("data_limite", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    <Percent className="mr-1 inline h-3 w-3" />
                    Deságio Proposto (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.desagio_proposto}
                    onChange={(e) =>
                      updateField("desagio_proposto", e.target.value)
                    }
                    placeholder="Ex: 40"
                  />
                </div>
                <div>
                  <Label>
                    <Calendar className="mr-1 inline h-3 w-3" />
                    Carência (meses)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.carencia_proposta}
                    onChange={(e) =>
                      updateField("carencia_proposta", e.target.value)
                    }
                    placeholder="Ex: 12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    <Hash className="mr-1 inline h-3 w-3" />
                    Parcelas
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.parcelas_propostas}
                    onChange={(e) =>
                      updateField("parcelas_propostas", e.target.value)
                    }
                    placeholder="Ex: 60"
                  />
                </div>
                <div>
                  <Label>
                    <Percent className="mr-1 inline h-3 w-3" />
                    Juros Proposto (% a.a.)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.juros_proposto}
                    onChange={(e) =>
                      updateField("juros_proposto", e.target.value)
                    }
                    placeholder="Ex: 3.5"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!form.titulo.trim() || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? "Criando..." : "Criar Rodada"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content: 2-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Negotiations List (1/3) */}
        <div className="w-1/3 overflow-y-auto border-r">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma rodada de negociação
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crie uma nova rodada para iniciar as negociações com credores.
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {items.map((neg) => (
                  <Card
                    key={neg.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedId === neg.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedId(neg.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {neg.titulo}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge
                              className={`text-[10px] ${
                                NEGOTIATION_PHASE_COLORS[neg.fase] || ""
                              }`}
                            >
                              {NEGOTIATION_PHASE_LABELS[neg.fase] || neg.fase}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                NEGOTIATION_PRIORITY_COLORS[neg.prioridade] ||
                                ""
                              }`}
                            >
                              {NEGOTIATION_PRIORITY_LABELS[neg.prioridade] ||
                                neg.prioridade}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {neg._count?.credores ?? 0} credores
                            </span>
                            {neg._count?.crj_links != null && neg._count.crj_links > 0 && (
                              <span className="flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                {neg._count.crj_links} CRJ
                              </span>
                            )}
                            {neg.valor_total_original != null && (
                              <span className="font-medium">
                                {formatCentavos(neg.valor_total_original)}
                              </span>
                            )}
                          </div>
                          {neg.data_limite && (
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Limite:{" "}
                              {new Date(neg.data_limite).toLocaleDateString(
                                "pt-BR"
                              )}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors ${
                            selectedId === neg.id ? "text-primary" : ""
                          }`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Selected Negotiation Detail (2/3) */}
        <div className="flex w-2/3 flex-col overflow-y-auto">
          {!selectedId ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <ChevronRight className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Selecione uma rodada para ver os detalhes
                </p>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : !selectedNeg ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Rodada não encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {/* Detail Header */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {selectedNeg.titulo}
                      </CardTitle>
                      {selectedNeg.descricao && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedNeg.descricao}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          NEGOTIATION_PHASE_COLORS[selectedNeg.fase] || ""
                        }
                      >
                        {NEGOTIATION_PHASE_LABELS[selectedNeg.fase] ||
                          selectedNeg.fase}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          NEGOTIATION_PRIORITY_COLORS[
                            selectedNeg.prioridade
                          ] || ""
                        }
                      >
                        {NEGOTIATION_PRIORITY_LABELS[
                          selectedNeg.prioridade
                        ] || selectedNeg.prioridade}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    {selectedNeg.data_limite && (
                      <div>
                        <span className="text-muted-foreground">
                          Data Limite:{" "}
                        </span>
                        <span className="font-medium">
                          {new Date(
                            selectedNeg.data_limite
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    {selectedNeg.created_at && (
                      <div>
                        <span className="text-muted-foreground">Criada: </span>
                        <span className="font-medium">
                          {new Date(
                            selectedNeg.created_at
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Terms */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Termos da Proposta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-3 text-center">
                      <Percent className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {selectedNeg.desagio_proposto != null
                          ? `${selectedNeg.desagio_proposto}%`
                          : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Deságio
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <Calendar className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {selectedNeg.carencia_proposta != null
                          ? `${selectedNeg.carencia_proposta}m`
                          : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Carência
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <Hash className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {selectedNeg.parcelas_propostas != null
                          ? `${selectedNeg.parcelas_propostas}x`
                          : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Parcelas
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <Percent className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {selectedNeg.juros_proposto != null
                          ? `${selectedNeg.juros_proposto}%`
                          : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Juros a.a.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linked CRJ Individual Negotiations */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Handshake className="h-4 w-4" />
                      Negociações Individuais (CRJ)
                      {selectedNeg.crj_links?.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {selectedNeg.crj_links.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <Dialog open={linkCrjOpen} onOpenChange={setLinkCrjOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Link2 className="mr-1 h-3 w-3" /> Vincular CRJ
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Vincular Negociações CRJ</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Vincule negociações individuais (CRJ) a esta rodada coletiva
                            para acompanhar o progresso de cada credor.
                          </p>
                          <Input
                            placeholder="Buscar por título ou credor..."
                            value={crjSearch}
                            onChange={(e) => setCrjSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="max-h-[300px] overflow-y-auto">
                            {filteredCrjNegotiations.length === 0 ? (
                              <p className="py-6 text-center text-xs text-muted-foreground">
                                {crjSearch
                                  ? "Nenhuma negociação encontrada"
                                  : "Todas as negociações já estão vinculadas"}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {filteredCrjNegotiations.map(
                                  (n: {
                                    id: string;
                                    title: string;
                                    status: string;
                                    credit_amount: bigint | number;
                                    creditor?: { nome?: string; classe?: string };
                                  }) => (
                                    <div
                                      key={n.id}
                                      className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium">
                                          {n.title}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-2">
                                          <Badge
                                            className={`text-[9px] ${CRJ_STATUS_COLORS[n.status] || ""}`}
                                          >
                                            {CRJ_STATUS_LABELS[n.status] || n.status}
                                          </Badge>
                                          <span className="text-[10px] text-muted-foreground">
                                            {n.creditor?.nome || "—"}
                                          </span>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 shrink-0 text-xs"
                                        disabled={linkCrjMutation.isPending}
                                        onClick={() => handleLinkCrj(n.id)}
                                      >
                                        <Link2 className="mr-1 h-3 w-3" />
                                        Vincular
                                      </Button>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedNeg.crj_links || selectedNeg.crj_links.length === 0 ? (
                    <div className="py-6 text-center">
                      <Link2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">
                        Nenhuma negociação CRJ vinculada a esta rodada.
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Vincule negociações individuais para acompanhar o progresso.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="pb-2 pr-3 text-left">Negociação</th>
                            <th className="pb-2 pr-3 text-left">Credor</th>
                            <th className="pb-2 pr-3 text-left">Status</th>
                            <th className="pb-2 pr-3 text-right">Crédito</th>
                            <th className="pb-2 pr-3 text-right">Proposto</th>
                            <th className="pb-2 pr-3 text-right">Deságio</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedNeg.crj_links.map(
                            (link: {
                              crj_negotiation_id: string;
                              crj_negotiation: {
                                id: string;
                                title: string;
                                status: string;
                                priority: string;
                                credit_amount: bigint | number;
                                proposed_amount: bigint | number | null;
                                agreed_amount: bigint | number | null;
                                discount_percentage: number | null;
                                creditor: { id: string; nome: string; classe: string } | null;
                              };
                            }) => {
                              const crj = link.crj_negotiation;
                              return (
                                <tr key={link.crj_negotiation_id} className="border-b last:border-0">
                                  <td className="py-2 pr-3">
                                    <span className="text-xs font-medium">{crj.title}</span>
                                  </td>
                                  <td className="py-2 pr-3">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">{crj.creditor?.nome || "—"}</span>
                                      {crj.creditor?.classe && (
                                        <Badge variant="outline" className="text-[9px]">
                                          {CREDIT_CLASS_SHORT_LABELS[crj.creditor.classe] || crj.creditor.classe}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3">
                                    <Badge
                                      className={`text-[10px] ${CRJ_STATUS_COLORS[crj.status] || ""}`}
                                    >
                                      {CRJ_STATUS_LABELS[crj.status] || crj.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-3 text-right text-xs">
                                    {formatBRL(crj.credit_amount)}
                                  </td>
                                  <td className="py-2 pr-3 text-right text-xs font-medium">
                                    {crj.proposed_amount ? formatBRL(crj.proposed_amount) : "—"}
                                  </td>
                                  <td className="py-2 pr-3 text-right text-xs">
                                    {crj.discount_percentage != null
                                      ? `${crj.discount_percentage.toFixed(1)}%`
                                      : "—"}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleUnlinkCrj(crj.id)}
                                      disabled={unlinkCrjMutation.isPending}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Creditors Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Credores na Rodada
                      {selectedNeg.credores?.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {selectedNeg.credores.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <Dialog
                      open={addCreditorOpen}
                      onOpenChange={setAddCreditorOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Plus className="mr-1 h-3 w-3" /> Adicionar Credores
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            Adicionar Credores do QGC
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <Input
                            placeholder="Buscar credor por nome..."
                            value={creditorSearch}
                            onChange={(e) => setCreditorSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="max-h-[300px] overflow-y-auto">
                            {loadingCreditors ? (
                              <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                              </div>
                            ) : filteredAvailableCreditors.length === 0 ? (
                              <p className="py-6 text-center text-xs text-muted-foreground">
                                {creditorSearch
                                  ? "Nenhum credor encontrado"
                                  : "Todos os credores já foram adicionados"}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {filteredAvailableCreditors.map(
                                  (c: {
                                    id: string;
                                    nome: string;
                                    classe: string;
                                    valor_original: bigint | number | string;
                                  }) => (
                                    <div
                                      key={c.id}
                                      className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium">
                                          {c.nome}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-2">
                                          <Badge
                                            variant="outline"
                                            className="text-[9px]"
                                          >
                                            {CREDIT_CLASS_SHORT_LABELS[
                                              c.classe
                                            ] || c.classe}
                                          </Badge>
                                          <span className="text-[10px] text-muted-foreground">
                                            {formatCentavos(c.valor_original)}
                                          </span>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 shrink-0 text-xs"
                                        disabled={
                                          addCreditorMutation.isPending
                                        }
                                        onClick={() =>
                                          handleAddCreditor(c.id)
                                        }
                                      >
                                        <Plus className="mr-1 h-3 w-3" />{" "}
                                        Adicionar
                                      </Button>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedNeg.credores ||
                  selectedNeg.credores.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">
                        Nenhum credor adicionado a esta rodada.
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Clique em &quot;Adicionar Credores&quot; para selecionar
                        do QGC.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="pb-2 pr-3 text-left">Nome</th>
                            <th className="pb-2 pr-3 text-left">Classe</th>
                            <th className="pb-2 pr-3 text-right">
                              Valor Original
                            </th>
                            <th className="pb-2 pr-3 text-right">
                              Valor Proposto
                            </th>
                            <th className="pb-2 pr-3 text-left">Status</th>
                            <th className="pb-2 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedNeg.credores.map((cn) => (
                              <tr
                                key={cn.id}
                                className="border-b last:border-0"
                              >
                                <td className="py-2 pr-3">
                                  <span className="text-xs font-medium">
                                    {cn.creditor?.nome || "—"}
                                  </span>
                                </td>
                                <td className="py-2 pr-3">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {CREDIT_CLASS_SHORT_LABELS[cn.creditor?.classe] ||
                                      cn.creditor?.classe || "—"}
                                  </Badge>
                                </td>
                                <td className="py-2 pr-3 text-right text-xs">
                                  {formatCentavos(cn.valor_original)}
                                </td>
                                <td className="py-2 pr-3 text-right text-xs font-medium">
                                  {cn.valor_proposto != null
                                    ? formatCentavos(cn.valor_proposto)
                                    : "--"}
                                </td>
                                <td className="py-2 pr-3">
                                  <Badge
                                    className={`text-[10px] ${
                                      CREDITOR_NEG_STATUS_COLORS[cn.status] ||
                                      ""
                                    }`}
                                  >
                                    {CREDITOR_NEG_STATUS_LABELS[cn.status] ||
                                      cn.status}
                                  </Badge>
                                </td>
                                <td className="py-2">
                                  <Select
                                    value={cn.status}
                                    onValueChange={(v) =>
                                      handleCreditorStatusChange(cn.id, v)
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-[160px] text-[10px]">
                                      <SelectValue placeholder="Alterar status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(
                                        CREDITOR_NEG_STATUS_LABELS
                                      ).map(([k, v]) => (
                                        <SelectItem
                                          key={k}
                                          value={k}
                                          className="text-xs"
                                        >
                                          {v}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
