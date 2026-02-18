"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Trash2, AlertTriangle, Handshake, ExternalLink, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_NATURE_LABELS,
  CREDIT_STATUS_LABELS,
  GUARANTEE_TYPE_LABELS,
  INDEXATION_TYPE_LABELS,
  NATURE_TO_CLASS,
} from "@/lib/rj-constants";
import { CRJ_STATUS_LABELS, CRJ_STATUS_COLORS } from "@/lib/crj-constants";

interface CreditorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
  creditorId: string | null;
}

export function CreditorForm({ open, onOpenChange, jrcId, creditorId }: CreditorFormProps) {
  const utils = trpc.useUtils();
  const isEditing = !!creditorId;

  const { data: existing } = trpc.rj.creditors.getById.useQuery(
    { id: creditorId! },
    { enabled: !!creditorId && open }
  );

  const [warnings, setWarnings] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    pessoa_fisica: false,
    classe: "CLASSE_III_QUIROGRAFARIO",
    natureza: "QUIROGRAFARIO",
    status: "HABILITADO",
    valor_original: 0,
    valor_atualizado: 0,
    tipo_garantia: "NONE",
    valor_garantia: 0,
    valor_avaliacao_garantia: 0,
    descricao_garantia: "",
    matricula_imovel: "",
    desagio_percentual: undefined as number | undefined,
    carencia_meses: undefined as number | undefined,
    parcelas: undefined as number | undefined,
    indexador: "",
    juros_percentual: undefined as number | undefined,
    observacoes: "",
  });

  // Load existing data
  useEffect(() => {
    if (existing) {
      setForm({
        nome: existing.nome,
        cpf_cnpj: existing.cpf_cnpj || "",
        pessoa_fisica: existing.pessoa_fisica,
        classe: existing.classe,
        natureza: existing.natureza,
        status: existing.status,
        valor_original: Number(existing.valor_original) / 100,
        valor_atualizado: Number(existing.valor_atualizado) / 100,
        tipo_garantia: existing.tipo_garantia,
        valor_garantia: Number(existing.valor_garantia) / 100,
        valor_avaliacao_garantia: Number(existing.valor_avaliacao_garantia) / 100,
        descricao_garantia: existing.descricao_garantia || "",
        matricula_imovel: existing.matricula_imovel || "",
        desagio_percentual: existing.desagio_percentual ?? undefined,
        carencia_meses: existing.carencia_meses ?? undefined,
        parcelas: existing.parcelas ?? undefined,
        indexador: existing.indexador || "",
        juros_percentual: existing.juros_percentual ?? undefined,
        observacoes: existing.observacoes || "",
      });
    } else if (!creditorId) {
      setForm({
        nome: "", cpf_cnpj: "", pessoa_fisica: false,
        classe: "CLASSE_III_QUIROGRAFARIO", natureza: "QUIROGRAFARIO", status: "HABILITADO",
        valor_original: 0, valor_atualizado: 0,
        tipo_garantia: "NONE", valor_garantia: 0, valor_avaliacao_garantia: 0,
        descricao_garantia: "", matricula_imovel: "",
        desagio_percentual: undefined, carencia_meses: undefined, parcelas: undefined,
        indexador: "", juros_percentual: undefined, observacoes: "",
      });
    }
  }, [existing, creditorId]);

  const createMutation = trpc.rj.creditors.create.useMutation({
    onSuccess: (result) => {
      setWarnings(result.warnings);
      if (result.warnings.length === 0) {
        onOpenChange(false);
      }
      utils.rj.creditors.invalidate();
      utils.rj.cases.invalidate();
    },
  });

  const updateMutation = trpc.rj.creditors.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      utils.rj.creditors.invalidate();
      utils.rj.cases.invalidate();
    },
  });

  const deleteMutation = trpc.rj.creditors.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      utils.rj.creditors.invalidate();
      utils.rj.cases.invalidate();
    },
  });

  const handleSubmit = () => {
    if (isEditing) {
      updateMutation.mutate({
        id: creditorId!,
        ...form,
        indexador: form.indexador || undefined,
      });
    } else {
      createMutation.mutate({
        jrc_id: jrcId,
        ...form,
        indexador: form.indexador || undefined,
      });
    }
  };

  const handleNatureChange = (nature: string) => {
    const suggestedClass = NATURE_TO_CLASS[nature] || form.classe;
    setForm((f) => ({ ...f, natureza: nature, classe: suggestedClass }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] overflow-hidden p-0 sm:max-w-[480px]">
        <SheetHeader className="px-6 py-4">
          <SheetTitle>{isEditing ? "Editar Credor" : "Novo Credor"}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] px-6">
          <div className="space-y-6 pb-6">
            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle className="h-4 w-4" /> Avisos
                </div>
                {warnings.map((w, i) => (
                  <p key={i} className="mt-1 text-xs text-amber-700">{w}</p>
                ))}
              </div>
            )}

            {/* Identification */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Identificação</h3>
              <div className="space-y-2">
                <Label className="text-xs">Nome / Razão Social *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">CPF/CNPJ</Label>
                <Input
                  value={form.cpf_cnpj}
                  onChange={(e) => setForm((f) => ({ ...f, cpf_cnpj: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.pessoa_fisica}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, pessoa_fisica: v }))}
                />
                <Label className="text-xs">Pessoa Física</Label>
              </div>
            </section>

            <Separator />

            {/* Classification */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Classificação</h3>
              <div className="space-y-2">
                <Label className="text-xs">Natureza do Crédito *</Label>
                <Select value={form.natureza} onValueChange={handleNatureChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDIT_NATURE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Classe *</Label>
                <Select value={form.classe} onValueChange={(v) => setForm((f) => ({ ...f, classe: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDIT_CLASS_SHORT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CREDIT_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </section>

            <Separator />

            {/* Values */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Valores (R$)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Valor Original *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_original || ""}
                    onChange={(e) => setForm((f) => ({ ...f, valor_original: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Valor Atualizado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_atualizado || ""}
                    onChange={(e) => setForm((f) => ({ ...f, valor_atualizado: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Guarantee (only for Class II) */}
            {form.classe === "CLASSE_II_GARANTIA_REAL" && (
              <>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Garantia Real</h3>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Garantia</Label>
                    <Select value={form.tipo_garantia} onValueChange={(v) => setForm((f) => ({ ...f, tipo_garantia: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GUARANTEE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Valor da Garantia</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.valor_garantia || ""}
                        onChange={(e) => setForm((f) => ({ ...f, valor_garantia: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Avaliação</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.valor_avaliacao_garantia || ""}
                        onChange={(e) => setForm((f) => ({ ...f, valor_avaliacao_garantia: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Matrícula do Imóvel</Label>
                    <Input
                      value={form.matricula_imovel}
                      onChange={(e) => setForm((f) => ({ ...f, matricula_imovel: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Descrição da Garantia</Label>
                    <Textarea
                      value={form.descricao_garantia}
                      onChange={(e) => setForm((f) => ({ ...f, descricao_garantia: e.target.value }))}
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Payment Terms */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Condições de Pagamento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Deságio (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.desagio_percentual ?? ""}
                    onChange={(e) => setForm((f) => ({
                      ...f, desagio_percentual: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Carência (meses)</Label>
                  <Input
                    type="number"
                    value={form.carencia_meses ?? ""}
                    onChange={(e) => setForm((f) => ({
                      ...f, carencia_meses: e.target.value ? parseInt(e.target.value) : undefined,
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Parcelas</Label>
                  <Input
                    type="number"
                    value={form.parcelas ?? ""}
                    onChange={(e) => setForm((f) => ({
                      ...f, parcelas: e.target.value ? parseInt(e.target.value) : undefined,
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Juros a.a. (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.juros_percentual ?? ""}
                    onChange={(e) => setForm((f) => ({
                      ...f, juros_percentual: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Indexador</Label>
                <Select value={form.indexador} onValueChange={(v) => setForm((f) => ({ ...f, indexador: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDEXATION_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Separator />

            {/* Notes */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Observações</h3>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                className="text-sm"
                rows={3}
                placeholder="Observações sobre este credor..."
              />
            </section>

            {/* CRJ Negotiation Link */}
            {isEditing && (
              <>
                <Separator />
                <CRJNegotiationSection creditorId={creditorId!} jrcId={jrcId} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          {isEditing ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                if (confirm("Excluir este credor?")) {
                  deleteMutation.mutate({ id: creditorId! });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-1 h-3 w-3" /> Excluir
            </Button>
          ) : (
            <div />
          )}
          <Button size="sm" onClick={handleSubmit} disabled={isPending || !form.nome}>
            <Save className="mr-1 h-3 w-3" />
            {isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar Credor"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ========== CRJ Negotiation Section ==========

function CRJNegotiationSection({
  creditorId,
  jrcId,
}: {
  creditorId: string;
  jrcId: string;
}) {
  const { data: negotiations, isLoading } =
    trpc.crjNeg.negotiations.list.useQuery({
      jrc_id: jrcId,
    });

  const utils = trpc.useUtils();
  const createMutation = trpc.crjNeg.negotiations.create.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
    },
  });

  // Filter negotiations for this creditor
  const creditorNegs = (negotiations || []).filter(
    (n) => n.creditor_id === creditorId && n.status !== "CANCELADA"
  );

  const handleQuickCreate = () => {
    createMutation.mutate({
      jrc_id: jrcId,
      creditor_id: creditorId,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Handshake className="h-4 w-4 text-emerald-600" />
          Negociação Individual (CRJ)
        </h3>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando...</div>
      ) : creditorNegs.length > 0 ? (
        <div className="space-y-2">
          {creditorNegs.map((neg) => (
            <a
              key={neg.id}
              href={`/recuperacao-judicial/negociacoes?neg=${neg.id}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{neg.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {neg._count?.rounds || 0} rodada(s) | {neg._count?.events || 0}{" "}
                  evento(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[9px] ${
                    CRJ_STATUS_COLORS[neg.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {CRJ_STATUS_LABELS[neg.status] || neg.status}
                </Badge>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Nenhuma negociação individual ativa
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={handleQuickCreate}
            disabled={createMutation.isPending}
          >
            <Plus className="mr-1 h-3 w-3" />
            {createMutation.isPending ? "Criando..." : "Criar Negociação"}
          </Button>
        </div>
      )}
    </section>
  );
}
