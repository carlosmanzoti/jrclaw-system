"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  INDEXATION_TYPE_LABELS,
} from "@/lib/rj-constants";

interface SubclassFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
  subclassId: string | null;
}

interface Criterion {
  descricao: string;
  tipo: string;
  valor: string;
  potestativo: boolean;
}

export function SubclassForm({ open, onOpenChange, jrcId, subclassId }: SubclassFormProps) {
  const utils = trpc.useUtils();
  const isEditing = !!subclassId;

  const { data: existing } = trpc.rj.subclasses.list.useQuery(
    { jrc_id: jrcId },
    { enabled: open }
  );

  const editData = existing?.find((s) => s.id === subclassId);

  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    classe_base: "CLASSE_III_QUIROGRAFARIO",
    criterios_objetivos: [] as Criterion[],
    justificativa_interesse_homogeneo: "",
    protecao_direitos: "",
    desagio_percentual: undefined as number | undefined,
    carencia_meses: undefined as number | undefined,
    parcelas: undefined as number | undefined,
    indexador: "",
    juros_percentual: undefined as number | undefined,
    cor: "#a855f7",
  });

  const [validation, setValidation] = useState<{
    valid: boolean;
    requirements: Record<string, { met: boolean; issues: string[] }>;
  } | null>(null);

  useEffect(() => {
    if (editData && subclassId) {
      setForm({
        nome: editData.nome,
        descricao: editData.descricao || "",
        classe_base: editData.classe_base,
        criterios_objetivos: (editData.criterios_objetivos as unknown as Criterion[]) || [],
        justificativa_interesse_homogeneo: editData.justificativa_interesse_homogeneo || "",
        protecao_direitos: editData.protecao_direitos || "",
        desagio_percentual: editData.desagio_percentual ?? undefined,
        carencia_meses: editData.carencia_meses ?? undefined,
        parcelas: editData.parcelas ?? undefined,
        indexador: editData.indexador || "",
        juros_percentual: editData.juros_percentual ?? undefined,
        cor: editData.cor || "#a855f7",
      });
    } else if (!subclassId) {
      setForm({
        nome: "", descricao: "", classe_base: "CLASSE_III_QUIROGRAFARIO",
        criterios_objetivos: [], justificativa_interesse_homogeneo: "",
        protecao_direitos: "", desagio_percentual: undefined,
        carencia_meses: undefined, parcelas: undefined,
        indexador: "", juros_percentual: undefined, cor: "#a855f7",
      });
    }
    setValidation(null);
  }, [editData, subclassId, open]);

  const createMutation = trpc.rj.subclasses.create.useMutation({
    onSuccess: () => { onOpenChange(false); utils.rj.subclasses.invalidate(); },
  });

  const updateMutation = trpc.rj.subclasses.update.useMutation({
    onSuccess: () => { onOpenChange(false); utils.rj.subclasses.invalidate(); },
  });

  const { data: stjValidation } = trpc.rj.subclasses.validate.useQuery(
    { id: subclassId! },
    { enabled: !!subclassId && open }
  );

  const addCriterion = () => {
    setForm((f) => ({
      ...f,
      criterios_objetivos: [
        ...f.criterios_objetivos,
        { descricao: "", tipo: "FAIXA_VALOR", valor: "", potestativo: false },
      ],
    }));
  };

  const removeCriterion = (index: number) => {
    setForm((f) => ({
      ...f,
      criterios_objetivos: f.criterios_objetivos.filter((_, i) => i !== index),
    }));
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: unknown) => {
    setForm((f) => ({
      ...f,
      criterios_objetivos: f.criterios_objetivos.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  // Client-side quick validation
  const runValidation = () => {
    const result = {
      valid: true,
      requirements: {
        criterios_objetivos: { met: true, issues: [] as string[] },
        interesse_homogeneo: { met: true, issues: [] as string[] },
        protecao_direitos: { met: true, issues: [] as string[] },
      },
    };

    if (form.criterios_objetivos.length === 0) {
      result.requirements.criterios_objetivos.met = false;
      result.requirements.criterios_objetivos.issues.push("Defina ao menos um critério objetivo.");
      result.valid = false;
    }

    const potestativos = form.criterios_objetivos.filter((c) => c.potestativo);
    if (potestativos.length > 0) {
      result.requirements.criterios_objetivos.met = false;
      result.requirements.criterios_objetivos.issues.push(
        `${potestativos.length} critério(s) potestativo(s) — vedado pelo STJ.`
      );
      result.valid = false;
    }

    if (!form.justificativa_interesse_homogeneo || form.justificativa_interesse_homogeneo.length < 50) {
      result.requirements.interesse_homogeneo.met = false;
      result.requirements.interesse_homogeneo.issues.push("Justificativa insuficiente (mín. 50 caracteres).");
      result.valid = false;
    }

    if (!form.protecao_direitos || form.protecao_direitos.length < 50) {
      result.requirements.protecao_direitos.met = false;
      result.requirements.protecao_direitos.issues.push("Demonstração insuficiente (mín. 50 caracteres).");
      result.valid = false;
    }

    setValidation(result);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      criterios_objetivos: form.criterios_objetivos.length > 0 ? form.criterios_objetivos : undefined,
      indexador: form.indexador || undefined,
    };
    if (isEditing) {
      updateMutation.mutate({ id: subclassId!, ...payload });
    } else {
      createMutation.mutate({ jrc_id: jrcId, ...payload });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEditing ? "Editar Subclasse" : "Nova Subclasse"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-160px)] px-6">
          <div className="space-y-6 py-4">
            {/* 1. Identification */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">1. Identificação</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Nome da Subclasse *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="Ex: Quirografários até R$ 50.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Classe Base *</Label>
                  <Select value={form.classe_base} onValueChange={(v) => setForm((f) => ({ ...f, classe_base: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CREDIT_CLASS_SHORT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="text-sm"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Cor</Label>
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className="h-6 w-8 cursor-pointer rounded border"
                />
              </div>
            </section>

            <Separator />

            {/* 2. Objective Criteria (STJ Requirement 1) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">2. Critérios Objetivos (STJ)</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCriterion}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Os critérios devem ser objetivos e não potestativos (não podem depender exclusivamente da vontade do devedor).
              </p>
              {form.criterios_objetivos.map((crit, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={crit.descricao}
                        onChange={(e) => updateCriterion(i, "descricao", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Ex: Créditos com valor até R$ 50.000,00"
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={crit.tipo} onValueChange={(v) => updateCriterion(i, "tipo", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FAIXA_VALOR">Faixa de Valor</SelectItem>
                          <SelectItem value="NATUREZA_CREDITO">Natureza</SelectItem>
                          <SelectItem value="TIPO_GARANTIA">Garantia</SelectItem>
                          <SelectItem value="SETOR">Setor</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-5 h-7 w-7 p-0 text-red-500"
                      onClick={() => removeCriterion(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={crit.potestativo}
                      onCheckedChange={(v) => updateCriterion(i, "potestativo", v)}
                    />
                    <Label className="text-xs text-red-600">
                      Critério potestativo? {crit.potestativo && "(VEDADO pelo STJ)"}
                    </Label>
                    {crit.potestativo && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>
                </div>
              ))}
              {form.criterios_objetivos.length === 0 && (
                <p className="text-xs italic text-muted-foreground">
                  Nenhum critério definido. Clique em &quot;Adicionar&quot;.
                </p>
              )}
            </section>

            <Separator />

            {/* 3. Homogeneous Interests (STJ Requirement 2) */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">3. Interesses Homogêneos (STJ)</h3>
              <Textarea
                value={form.justificativa_interesse_homogeneo}
                onChange={(e) => setForm((f) => ({ ...f, justificativa_interesse_homogeneo: e.target.value }))}
                className="text-sm"
                rows={3}
                placeholder="Justifique como os credores desta subclasse compartilham situação fática e jurídica semelhante..."
              />
              <p className="text-[10px] text-muted-foreground">
                {form.justificativa_interesse_homogeneo.length}/50 caracteres mínimos
              </p>
            </section>

            <Separator />

            {/* 4. Rights Protection (STJ Requirement 3) */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">4. Proteção de Direitos (STJ)</h3>
              <Textarea
                value={form.protecao_direitos}
                onChange={(e) => setForm((f) => ({ ...f, protecao_direitos: e.target.value }))}
                className="text-sm"
                rows={3}
                placeholder="Demonstre que a subclassificação não prejudica excessivamente os credores..."
              />
              <p className="text-[10px] text-muted-foreground">
                {form.protecao_direitos.length}/50 caracteres mínimos
              </p>
            </section>

            <Separator />

            {/* 5. Payment Conditions */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">5. Condições de Pagamento</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Deságio (%)</Label>
                  <Input
                    type="number" step="0.1" min="0" max="100"
                    value={form.desagio_percentual ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, desagio_percentual: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Carência (meses)</Label>
                  <Input
                    type="number"
                    value={form.carencia_meses ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, carencia_meses: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parcelas</Label>
                  <Input
                    type="number"
                    value={form.parcelas ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, parcelas: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Indexador</Label>
                  <Select value={form.indexador} onValueChange={(v) => setForm((f) => ({ ...f, indexador: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDEXATION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Juros a.a. (%)</Label>
                  <Input
                    type="number" step="0.1"
                    value={form.juros_percentual ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, juros_percentual: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* 6. Validation Preview */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">6. Validação STJ</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={runValidation}>
                  Validar Requisitos
                </Button>
              </div>
              {validation && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    {validation.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${validation.valid ? "text-emerald-700" : "text-red-700"}`}>
                      {validation.valid ? "Subclasse válida conforme STJ" : "Subclasse não atende requisitos STJ"}
                    </span>
                  </div>
                  {Object.entries(validation.requirements).map(([key, req]) => (
                    <div key={key} className="ml-6 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="font-medium">
                          {key === "criterios_objetivos" ? "Critérios Objetivos" :
                           key === "interesse_homogeneo" ? "Interesses Homogêneos" :
                           "Proteção de Direitos"}
                        </span>
                      </div>
                      {req.issues.map((issue, i) => (
                        <p key={i} className="ml-5 text-[10px] text-red-600">{issue}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {stjValidation && isEditing && !validation && (
                <div className="rounded-lg border p-3 text-xs">
                  <Badge className={stjValidation.valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                    {stjValidation.valid ? "Validada pelo servidor" : "Não válida"}
                  </Badge>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.nome}>
            <Save className="mr-1 h-3 w-3" />
            {isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar Subclasse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
