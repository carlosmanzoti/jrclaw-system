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
import { Plus, FileWarning, Scale, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CHALLENGE_TYPE_LABELS,
  CHALLENGE_RESOLUTION_LABELS,
  CHALLENGE_RESOLUTION_COLORS,
  CREDIT_CLASS_SHORT_LABELS,
  formatCentavos,
} from "@/lib/rj-constants";

interface QCTabImpugnacoesProps {
  jrcId: string;
}

export function QCTabImpugnacoes({ jrcId }: QCTabImpugnacoesProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "HABILITACAO",
    requerente_nome: "",
    requerente_cpf_cnpj: "",
    valor_pretendido: 0,
    classe_pretendida: "",
    numero_processo: "",
    data_protocolo: "",
    fundamentacao: "",
  });

  const utils = trpc.useUtils();
  const { data: challenges, isLoading } = trpc.rj.challenges.list.useQuery({ jrc_id: jrcId });

  const createMutation = trpc.rj.challenges.create.useMutation({
    onSuccess: () => { setShowForm(false); utils.rj.challenges.invalidate(); },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const pendentes = challenges?.filter((c) => c.resolucao === "PENDENTE").length ?? 0;
  const total = challenges?.length ?? 0;
  const valorTotal = challenges?.reduce((s, c) => s + Number(c.valor_pretendido), 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Scale className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <FileWarning className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{total - pendentes}</p>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div>
              <p className="text-lg font-bold">{formatCentavos(BigInt(valorTotal))}</p>
              <p className="text-xs text-muted-foreground">Valor Impactado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Habilitações e Impugnações</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-3 w-3" /> Nova Habilitação/Impugnação
        </Button>
      </div>

      {/* Table */}
      {challenges && challenges.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Requerente</th>
                <th className="px-3 py-2 text-left">Credor Vinculado</th>
                <th className="px-3 py-2 text-right">Valor Pretendido</th>
                <th className="px-3 py-2 text-left">Classe Pretendida</th>
                <th className="px-3 py-2 text-left">Protocolo</th>
                <th className="px-3 py-2 text-left">Resolução</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((ch) => (
                <tr key={ch.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {CHALLENGE_TYPE_LABELS[ch.tipo] || ch.tipo}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div>{ch.requerente_nome}</div>
                    {ch.requerente_cpf_cnpj && (
                      <span className="text-[10px] text-muted-foreground">{ch.requerente_cpf_cnpj}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {ch.creditor ? ch.creditor.nome : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium">
                    {formatCentavos(ch.valor_pretendido)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {ch.classe_pretendida ? CREDIT_CLASS_SHORT_LABELS[ch.classe_pretendida] || ch.classe_pretendida : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {ch.data_protocolo ? new Date(ch.data_protocolo).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[10px] ${CHALLENGE_RESOLUTION_COLORS[ch.resolucao] || ""}`}>
                      {CHALLENGE_RESOLUTION_LABELS[ch.resolucao] || ch.resolucao}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma habilitação ou impugnação registrada.</p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Habilitação / Impugnação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHALLENGE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Requerente *</Label>
                <Input
                  value={formData.requerente_nome}
                  onChange={(e) => setFormData((f) => ({ ...f, requerente_nome: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">CPF/CNPJ</Label>
                <Input
                  value={formData.requerente_cpf_cnpj}
                  onChange={(e) => setFormData((f) => ({ ...f, requerente_cpf_cnpj: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Valor Pretendido (R$)</Label>
                <Input
                  type="number" step="0.01"
                  value={formData.valor_pretendido || ""}
                  onChange={(e) => setFormData((f) => ({ ...f, valor_pretendido: parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Classe Pretendida</Label>
                <Select value={formData.classe_pretendida} onValueChange={(v) => setFormData((f) => ({ ...f, classe_pretendida: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDIT_CLASS_SHORT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data de Protocolo</Label>
              <Input
                type="date"
                value={formData.data_protocolo}
                onChange={(e) => setFormData((f) => ({ ...f, data_protocolo: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fundamentação</Label>
              <Textarea
                value={formData.fundamentacao}
                onChange={(e) => setFormData((f) => ({ ...f, fundamentacao: e.target.value }))}
                className="text-sm" rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                createMutation.mutate({
                  jrc_id: jrcId,
                  tipo: formData.tipo,
                  requerente_nome: formData.requerente_nome,
                  requerente_cpf_cnpj: formData.requerente_cpf_cnpj || undefined,
                  valor_pretendido: formData.valor_pretendido,
                  classe_pretendida: formData.classe_pretendida || undefined,
                  data_protocolo: formData.data_protocolo ? new Date(formData.data_protocolo) : undefined,
                  fundamentacao: formData.fundamentacao || undefined,
                });
              }}
              disabled={createMutation.isPending || !formData.requerente_nome}
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
