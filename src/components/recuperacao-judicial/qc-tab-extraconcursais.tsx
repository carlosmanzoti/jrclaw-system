"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { formatCentavos } from "@/lib/rj-constants";
import {
  Plus,
  Shield,
  X,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  Handshake,
  Building2,
  Timer,
  Info,
  ChevronRight,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  CircleDot,
} from "lucide-react";

// ========== CONSTANTS ==========

const GUARANTEE_LABELS: Record<string, string> = {
  ALIENACAO_FIDUCIARIA_IMOVEL: "Alienacao Fiduciaria de Imovel",
  ALIENACAO_FIDUCIARIA_MOVEL: "Alienacao Fiduciaria de Movel",
  CESSAO_FIDUCIARIA_RECEBIVEIS: "Cessao Fiduciaria de Recebiveis",
  CESSAO_FIDUCIARIA_DIREITOS_CREDITORIOS: "Cessao Fiduciaria de Dir. Creditorios",
  HIPOTECA: "Hipoteca",
  PENHOR_AGRICOLA: "Penhor Agricola",
  PENHOR_MERCANTIL: "Penhor Mercantil",
  RESERVA_DOMINIO: "Reserva de Dominio",
  ARRENDAMENTO_MERCANTIL: "Arrendamento Mercantil (Leasing)",
  CESSAO_FIDUCIARIA_TITULOS: "Cessao Fiduciaria de Titulos",
  OUTRO: "Outro",
};

const GUARANTEE_COLORS: Record<string, string> = {
  ALIENACAO_FIDUCIARIA_IMOVEL: "bg-blue-100 text-blue-700",
  ALIENACAO_FIDUCIARIA_MOVEL: "bg-sky-100 text-sky-700",
  CESSAO_FIDUCIARIA_RECEBIVEIS: "bg-purple-100 text-purple-700",
  CESSAO_FIDUCIARIA_DIREITOS_CREDITORIOS: "bg-violet-100 text-violet-700",
  HIPOTECA: "bg-emerald-100 text-emerald-700",
  PENHOR_AGRICOLA: "bg-orange-100 text-orange-700",
  ARRENDAMENTO_MERCANTIL: "bg-gray-100 text-gray-700",
  RESERVA_DOMINIO: "bg-amber-100 text-amber-700",
  PENHOR_MERCANTIL: "bg-orange-100 text-orange-700",
  CESSAO_FIDUCIARIA_TITULOS: "bg-violet-100 text-violet-700",
  OUTRO: "bg-gray-100 text-gray-700",
};

const NEG_STATUS_LABELS: Record<string, string> = {
  NAO_INICIADA: "Nao Iniciada",
  EM_NEGOCIACAO: "Em Negociacao",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  CONTRAPROPOSTA: "Contraproposta",
  ACORDO: "Acordo",
  EXECUCAO_GARANTIA: "Execucao da Garantia",
  BUSCA_APREENSAO_JUDICIAL: "Busca e Apreensao",
};

const NEG_STATUS_COLORS: Record<string, string> = {
  NAO_INICIADA: "bg-gray-100 text-gray-600",
  EM_NEGOCIACAO: "bg-blue-100 text-blue-700",
  PROPOSTA_ENVIADA: "bg-indigo-100 text-indigo-700",
  CONTRAPROPOSTA: "bg-amber-100 text-amber-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
  EXECUCAO_GARANTIA: "bg-red-100 text-red-700",
  BUSCA_APREENSAO_JUDICIAL: "bg-red-100 text-red-800",
};

const SITUACAO_LABELS: Record<string, string> = {
  EM_POSSE_DEVEDOR: "Em posse do devedor",
  EM_POSSE_CREDOR: "Em posse do credor",
  BUSCA_APREENSAO: "Busca e apreensao em curso",
  CONSOLIDADO: "Consolidado",
  LEILAO_AGENDADO: "Leilao agendado",
  VENDIDO: "Vendido",
  PERECIDO: "Perecido",
};

const RISCO_LABELS: Record<string, string> = {
  BAIXO: "Baixo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Critico",
};

const RISCO_COLORS: Record<string, string> = {
  BAIXO: "bg-emerald-100 text-emerald-700",
  MEDIO: "bg-amber-100 text-amber-700",
  ALTO: "bg-orange-100 text-orange-700",
  CRITICO: "bg-red-100 text-red-700",
};

const IMPACTO_LABELS: Record<string, string> = {
  BAIXO: "Baixo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Critico",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONTATO_TELEFONICO: "Contato Telefonico",
  EMAIL_ENVIADO: "E-mail Enviado",
  EMAIL_RECEBIDO: "E-mail Recebido",
  REUNIAO: "Reuniao",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  CONTRAPROPOSTA_RECEBIDA: "Contraproposta Recebida",
  ACORDO: "Acordo",
  NOTIFICACAO_JUDICIAL: "Notificacao Judicial",
  BUSCA_APREENSAO: "Busca e Apreensao",
  OBSERVACAO: "Observacao",
};

const EVENT_TYPE_ICONS: Record<string, typeof Phone> = {
  CONTATO_TELEFONICO: Phone,
  EMAIL_ENVIADO: Mail,
  EMAIL_RECEBIDO: Mail,
  REUNIAO: MessageSquare,
  PROPOSTA_ENVIADA: FileText,
  CONTRAPROPOSTA_RECEBIDA: FileText,
  ACORDO: Handshake,
  NOTIFICACAO_JUDICIAL: AlertTriangle,
  BUSCA_APREENSAO: AlertTriangle,
  OBSERVACAO: CircleDot,
};

// ========== TYPES ==========

interface ExtraconcursalCreditor {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  valor_total: number | string;
  avaliacao_valor: number | string;
  saldo_devedor: number | string;
  tipo_garantia: string;
  descricao_garantia: string | null;
  matricula_registro: string | null;
  localizacao_bem: string | null;
  situacao_bem: string;
  essencial_atividade: boolean;
  justificativa_essencialidade: string | null;
  risco_perda_bem: string;
  impacto_operacional: string;
  status_negociacao: string;
  data_deferimento_rj: string | null;
  prazo_suspensao_fim: string | null;
  observacoes: string | null;
  eventos?: NegotiationEvent[];
  rodada_atual?: number;
}

interface NegotiationEvent {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
  rodada: number;
  responsavel_id: string | null;
  valor_proposto: number | string | null;
}

interface ExtraconcursalSummary {
  total_credito: number | string;
  total_garantia: number | string;
  exposicao: number | string;
  em_negociacao: number;
  bens_essenciais: number;
  stay_ativo: number;
  stay_encerrado: number;
}

// ========== HELPERS ==========

function toNumber(val: number | string | bigint | null | undefined): number {
  if (val == null) return 0;
  return Number(val);
}

function formatBRL(centavos: number | string | bigint | null | undefined): string {
  const num = toNumber(centavos);
  if (isNaN(num)) return "R$ 0,00";
  return (num / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcExposure(credito: number | string, garantia: number | string): number {
  return toNumber(credito) - toNumber(garantia);
}

function calcStayDaysRemaining(stayFim: string | null): number | null {
  if (!stayFim) return null;
  const end = new Date(stayFim);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getStayBadge(stayFim: string | null): { label: string; className: string } {
  const days = calcStayDaysRemaining(stayFim);
  if (days === null) return { label: "N/A", className: "bg-gray-100 text-gray-500" };
  if (days <= 0) return { label: "Expirado", className: "bg-gray-100 text-gray-500" };
  if (days < 30) return { label: `${days}d`, className: "bg-red-100 text-red-700" };
  if (days <= 60) return { label: `${days}d`, className: "bg-amber-100 text-amber-700" };
  return { label: `${days}d`, className: "bg-emerald-100 text-emerald-700" };
}

// ========== PROPS ==========

interface QCTabExtraconcursaisProps {
  jrcId: string;
}

// ========== SUB-COMPONENTS ==========

/** KPI card row */
function KPICards({ summary }: { summary: ExtraconcursalSummary }) {
  const exposicao = toNumber(summary.exposicao);

  const kpis = [
    {
      title: "Total Creditos Extraconcursais",
      value: formatBRL(summary.total_credito),
      icon: DollarSign,
      description: "Soma de todos os creditos",
    },
    {
      title: "Total em Garantias",
      value: formatBRL(summary.total_garantia),
      icon: Shield,
      description: "Valor de avaliacao dos bens",
    },
    {
      title: "Exposicao Liquida",
      value: formatBRL(summary.exposicao),
      icon: TrendingDown,
      description: exposicao > 0 ? "Descoberto" : "Coberto pelas garantias",
      className: exposicao > 0 ? "text-red-600" : "text-emerald-600",
    },
    {
      title: "Em Negociacao",
      value: String(summary.em_negociacao),
      icon: Handshake,
      description: "Credores em tratativa",
    },
    {
      title: "Bens Essenciais",
      value: String(summary.bens_essenciais),
      icon: Building2,
      description: "Art. 49, par. 3 — essenciais",
    },
    {
      title: "Stay Period",
      value: `${summary.stay_ativo} ativos`,
      icon: Timer,
      description: `${summary.stay_encerrado} expirado(s)`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${"className" in kpi ? kpi.className : ""}`}>
              {kpi.value}
            </div>
            <p className="text-[10px] text-muted-foreground">{kpi.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Main creditors data table */
function CreditorsTable({
  creditors,
  search,
  onSelectCreditor,
}: {
  creditors: ExtraconcursalCreditor[];
  search: string;
  onSelectCreditor: (c: ExtraconcursalCreditor) => void;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return creditors;
    const lower = search.toLowerCase();
    return creditors.filter(
      (c) =>
        c.nome.toLowerCase().includes(lower) ||
        (c.cpf_cnpj && c.cpf_cnpj.includes(search))
    );
  }, [creditors, search]);

  if (filtered.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Nenhum credor extraconcursal encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b">
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Credor</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tipo Garantia</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Valor Credito</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Valor Garantia</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Exposicao</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Essencial?</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Stay Period</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status Negociacao</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Risco</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => {
            const exposure = calcExposure(c.valor_total, c.avaliacao_valor);
            const stayBadge = getStayBadge(c.prazo_suspensao_fim);

            return (
              <tr
                key={c.id}
                className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                onClick={() => onSelectCreditor(c)}
              >
                <td className="px-3 py-2">
                  <div className="max-w-[200px]">
                    <span className="truncate font-medium">{c.nome}</span>
                    {c.cpf_cnpj && (
                      <span className="block text-[10px] text-muted-foreground">{c.cpf_cnpj}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${GUARANTEE_COLORS[c.tipo_garantia] || "bg-gray-100 text-gray-700"}`}
                  >
                    {GUARANTEE_LABELS[c.tipo_garantia] || c.tipo_garantia}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium">
                  {formatBRL(c.valor_total)}
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium">
                  {formatBRL(c.avaliacao_valor)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`text-xs font-semibold ${
                      exposure > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {formatBRL(Math.abs(exposure))}
                    {exposure > 0 ? " (descoberto)" : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {c.essencial_atividade ? (
                    <Shield className="mx-auto h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="mx-auto h-4 w-4 text-gray-400" />
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge variant="outline" className={`text-[10px] ${stayBadge.className}`}>
                    {stayBadge.label}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${NEG_STATUS_COLORS[c.status_negociacao] || ""}`}
                  >
                    {NEG_STATUS_LABELS[c.status_negociacao] || c.status_negociacao}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${RISCO_COLORS[c.risco_perda_bem] || ""}`}
                  >
                    {RISCO_LABELS[c.risco_perda_bem] || c.risco_perda_bem}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t bg-muted/30">
          <tr>
            <td colSpan={2} className="px-3 py-2 text-xs font-semibold">
              Total: {filtered.length} credores
            </td>
            <td className="px-3 py-2 text-right text-xs font-semibold">
              {formatBRL(filtered.reduce((s, c) => s + toNumber(c.valor_total), 0))}
            </td>
            <td className="px-3 py-2 text-right text-xs font-semibold">
              {formatBRL(filtered.reduce((s, c) => s + toNumber(c.avaliacao_valor), 0))}
            </td>
            <td colSpan={5} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Creation form dialog */
function CreateCreditorDialog({
  open,
  onOpenChange,
  jrcId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
}) {
  const utils = trpc.useUtils();
  const createMutation = trpc.rj.extraconcursals.create.useMutation({
    onSuccess: () => {
      utils.rj.extraconcursals.invalidate();
      onOpenChange(false);
      resetForm();
    },
  });

  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorGarantia, setValorGarantia] = useState("");
  const [saldoDevedor, setSaldoDevedor] = useState("");
  const [tipoGarantia, setTipoGarantia] = useState("ALIENACAO_FIDUCIARIA_IMOVEL");
  const [descricaoGarantia, setDescricaoGarantia] = useState("");
  const [matriculaRegistro, setMatriculaRegistro] = useState("");
  const [localizacaoBem, setLocalizacaoBem] = useState("");
  const [situacaoBem, setSituacaoBem] = useState("EM_POSSE_DEVEDOR");
  const [essencial, setEssencial] = useState(false);
  const [justificativaEssencialidade, setJustificativaEssencialidade] = useState("");
  const [riscoPerda, setRiscoPerda] = useState("MEDIO");
  const [impactoOperacional, setImpactoOperacional] = useState("MEDIO");
  const [observacoes, setObservacoes] = useState("");

  function resetForm() {
    setNome("");
    setCpfCnpj("");
    setValorTotal("");
    setValorGarantia("");
    setSaldoDevedor("");
    setTipoGarantia("ALIENACAO_FIDUCIARIA_IMOVEL");
    setDescricaoGarantia("");
    setMatriculaRegistro("");
    setLocalizacaoBem("");
    setSituacaoBem("EM_POSSE_DEVEDOR");
    setEssencial(false);
    setJustificativaEssencialidade("");
    setRiscoPerda("MEDIO");
    setImpactoOperacional("MEDIO");
    setObservacoes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    const parseCentavos = (val: string) => {
      const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
      return isNaN(num) ? 0 : Math.round(num * 100);
    };

    createMutation.mutate({
      jrc_id: jrcId,
      nome: nome.trim(),
      cpf_cnpj: cpfCnpj.trim() || undefined,
      valor_total: parseCentavos(valorTotal),
      valor_garantia: parseCentavos(valorGarantia),
      saldo_devedor: parseCentavos(saldoDevedor),
      tipo_garantia: tipoGarantia,
      descricao_garantia: descricaoGarantia.trim() || "Sem descrição",
      matricula_registro: matriculaRegistro.trim() || undefined,
      avaliacao_valor: parseCentavos(valorGarantia),
      localizacao_bem: localizacaoBem.trim() || undefined,
      situacao_bem: situacaoBem,
      essencial_atividade: essencial,
      justificativa_essencialidade: essencial ? justificativaEssencialidade.trim() || undefined : undefined,
      risco_perda_bem: riscoPerda,
      impacto_operacional: impactoOperacional,
      observacoes: observacoes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Credor Extraconcursal</DialogTitle>
          <DialogDescription>
            Cadastre um credor com garantia extraconcursal (art. 49, par. 3 da Lei 11.101/2005).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identification */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ec-nome">Nome do Credor *</Label>
              <Input
                id="ec-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome ou razao social"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-cpfcnpj">CPF/CNPJ</Label>
              <Input
                id="ec-cpfcnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
          </div>

          {/* Values */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ec-valor-total">Valor Total (R$)</Label>
              <Input
                id="ec-valor-total"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-valor-garantia">Valor Garantia (R$)</Label>
              <Input
                id="ec-valor-garantia"
                value={valorGarantia}
                onChange={(e) => setValorGarantia(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-saldo-devedor">Saldo Devedor (R$)</Label>
              <Input
                id="ec-saldo-devedor"
                value={saldoDevedor}
                onChange={(e) => setSaldoDevedor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Guarantee type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Garantia</Label>
              <Select value={tipoGarantia} onValueChange={setTipoGarantia}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GUARANTEE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Situacao do Bem</Label>
              <Select value={situacaoBem} onValueChange={setSituacaoBem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITUACAO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ec-desc-garantia">Descricao da Garantia</Label>
            <Textarea
              id="ec-desc-garantia"
              value={descricaoGarantia}
              onChange={(e) => setDescricaoGarantia(e.target.value)}
              placeholder="Descreva o bem dado em garantia, caracteristicas, estado de conservacao..."
              rows={3}
            />
          </div>

          {/* Location and registration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ec-matricula">Matricula / Registro</Label>
              <Input
                id="ec-matricula"
                value={matriculaRegistro}
                onChange={(e) => setMatriculaRegistro(e.target.value)}
                placeholder="Ex: Matricula 12345 - CRI de Maringa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-localizacao">Localizacao do Bem</Label>
              <Input
                id="ec-localizacao"
                value={localizacaoBem}
                onChange={(e) => setLocalizacaoBem(e.target.value)}
                placeholder="Endereco ou localizacao"
              />
            </div>
          </div>

          {/* Essential asset toggle */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ec-essencial" className="text-sm font-medium">
                  Bem essencial a atividade empresarial?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se sim, aplica-se o stay period de 180 dias (art. 49, par. 3).
                </p>
              </div>
              <Switch
                id="ec-essencial"
                checked={essencial}
                onCheckedChange={setEssencial}
              />
            </div>

            {essencial && (
              <div className="space-y-2">
                <Label htmlFor="ec-justificativa">Justificativa da Essencialidade</Label>
                <Textarea
                  id="ec-justificativa"
                  value={justificativaEssencialidade}
                  onChange={(e) => setJustificativaEssencialidade(e.target.value)}
                  placeholder="Explique por que este bem e essencial para a atividade economica da empresa recuperanda..."
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Info card about art. 49 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-800">
                  Art. 49, par. 3 - Lei 11.101/2005
                </p>
                <p className="text-xs text-blue-700">
                  Os credores titulares de posicao de proprietario fiduciario de bens moveis ou
                  imoveis, de arrendador mercantil, de proprietario ou promitente vendedor de imovel
                  com contratos contendo clausula de irrevogabilidade ou irretratabilidade, inclusive
                  em incorporacoes imobiliarias, ou de proprietario em contrato de venda com reserva
                  de dominio, nao se sujeitam ao plano de recuperacao judicial. Porem, se o bem
                  for essencial a atividade empresarial, o credor nao podera retira-lo ou vende-lo
                  durante o stay period de 180 dias.
                </p>
              </div>
            </div>
          </div>

          {/* Risk and impact */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Risco de Perda</Label>
              <Select value={riscoPerda} onValueChange={setRiscoPerda}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISCO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impacto Operacional</Label>
              <Select value={impactoOperacional} onValueChange={setImpactoOperacional}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACTO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="ec-obs">Observacoes</Label>
            <Textarea
              id="ec-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observacoes gerais sobre este credor extraconcursal..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !nome.trim()}>
              {createMutation.isPending ? "Salvando..." : "Salvar Credor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Creditor detail sheet (slides from right) */
function CreditorDetailSheet({
  creditor: listCreditor,
  open,
  onOpenChange,
  jrcId,
}: {
  creditor: ExtraconcursalCreditor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
}) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventType, setEventType] = useState("OBSERVACAO");
  const [eventDescricao, setEventDescricao] = useState("");
  const [eventValor, setEventValor] = useState("");

  // Fetch full creditor data with events
  const { data: fullCreditor } = trpc.rj.extraconcursals.getById.useQuery(
    { id: listCreditor?.id || "" },
    { enabled: !!listCreditor?.id && open }
  );
  const creditor = (fullCreditor || listCreditor) as ExtraconcursalCreditor | null;

  const utils = trpc.useUtils();

  const addEventMutation = trpc.rj.extraconcursals.events.create.useMutation({
    onSuccess: () => {
      utils.rj.extraconcursals.invalidate();
      setShowEventForm(false);
      setEventDescricao("");
      setEventValor("");
    },
  });

  if (!creditor) return null;

  const exposure = calcExposure(creditor.valor_total, creditor.avaliacao_valor);
  const stayDays = calcStayDaysRemaining(creditor.prazo_suspensao_fim);
  const stayBadge = getStayBadge(creditor.prazo_suspensao_fim);

  // Calculate stay progress percentage (based on 180 day period)
  const stayTotal = 180;
  const stayElapsed = stayDays !== null ? Math.max(0, stayTotal - stayDays) : stayTotal;
  const stayPercent = Math.min(100, Math.round((stayElapsed / stayTotal) * 100));

  // Group events by rodada
  const eventsByRodada = useMemo(() => {
    const groups: Record<number, NegotiationEvent[]> = {};
    for (const ev of creditor.eventos || []) {
      const r = ev.rodada || 0;
      if (!groups[r]) groups[r] = [];
      groups[r].push(ev);
    }
    // Sort events within each group by date descending
    for (const key of Object.keys(groups)) {
      groups[Number(key)].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );
    }
    return groups;
  }, [creditor.eventos]);

  const rodadas = Object.keys(eventsByRodada)
    .map(Number)
    .sort((a, b) => b - a);

  const isCessaoRecebiveis =
    creditor.tipo_garantia === "CESSAO_FIDUCIARIA_RECEBIVEIS" ||
    creditor.tipo_garantia === "CESSAO_FIDUCIARIA_DIREITOS_CREDITORIOS" ||
    creditor.tipo_garantia === "CESSAO_FIDUCIARIA_TITULOS";

  const isStayExpired = stayDays !== null && stayDays <= 0;

  function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventDescricao.trim()) return;

    const parseCentavosVal = (val: string): number | undefined => {
      if (!val.trim()) return undefined;
      const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
      return isNaN(num) ? undefined : num;
    };

    if (!creditor) return;
    addEventMutation.mutate({
      extraconcursal_creditor_id: creditor.id,
      rodada: ((creditor as unknown as { rodada_atual?: number }).rodada_atual) || 1,
      tipo: eventType,
      descricao: eventDescricao.trim(),
      valor_proposto: parseCentavosVal(eventValor),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {creditor.nome}
            <Badge
              variant="outline"
              className={`text-[10px] ${NEG_STATUS_COLORS[creditor.status_negociacao] || ""}`}
            >
              {NEG_STATUS_LABELS[creditor.status_negociacao] || creditor.status_negociacao}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            {creditor.cpf_cnpj || "Sem CPF/CNPJ"} — {GUARANTEE_LABELS[creditor.tipo_garantia] || creditor.tipo_garantia}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {/* Alert cards */}
          {isCessaoRecebiveis && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Risco de Trava Bancaria</p>
                  <p className="text-xs text-amber-700">
                    Credito com cessao fiduciaria de recebiveis. O banco pode reter recebiveis
                    automaticamente (trava bancaria). Verifique a existencia de conta vinculada
                    e negocie a liberacao parcial dos recebiveis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isStayExpired && creditor.essencial_atividade && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Stay Period Expirado</p>
                  <p className="text-xs text-red-700">
                    O prazo de 180 dias expirou. O credor pode requerer a restituicao do bem
                    ou executar a garantia. Priorize a negociacao ou peticione ao juizo para
                    manutencao do bem.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stay Period Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4" />
                Stay Period (180 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {creditor.data_deferimento_rj
                    ? new Date(creditor.data_deferimento_rj).toLocaleDateString("pt-BR")
                    : "N/A"}
                </span>
                <Badge variant="outline" className={stayBadge.className}>
                  {stayDays !== null && stayDays > 0
                    ? `${stayDays} dias restantes`
                    : stayDays !== null
                    ? "Expirado"
                    : "Nao definido"}
                </Badge>
                <span className="text-muted-foreground">
                  {creditor.prazo_suspensao_fim
                    ? new Date(creditor.prazo_suspensao_fim).toLocaleDateString("pt-BR")
                    : "N/A"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stayPercent >= 100
                      ? "bg-gray-400"
                      : stayPercent >= 83
                      ? "bg-red-500"
                      : stayPercent >= 67
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${stayPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {stayElapsed} de {stayTotal} dias decorridos ({stayPercent}%)
              </p>
            </CardContent>
          </Card>

          {/* Exposure Analysis Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4" />
                Analise de Exposicao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Credito Total</p>
                  <p className="text-sm font-bold">{formatBRL(creditor.valor_total)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Valor Garantia</p>
                  <p className="text-sm font-bold">{formatBRL(creditor.avaliacao_valor)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Exposicao</p>
                  <p
                    className={`text-sm font-bold ${
                      exposure > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {formatBRL(Math.abs(exposure))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {exposure > 0 ? "Descoberto" : "Coberto"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Situacao do Bem</p>
                  <p className="text-xs font-medium">
                    {SITUACAO_LABELS[creditor.situacao_bem] || creditor.situacao_bem}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Essencial?</p>
                  <p className="text-xs font-medium">
                    {creditor.essencial_atividade ? "Sim" : "Nao"}
                  </p>
                </div>
              </div>

              {creditor.descricao_garantia && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">
                    Descricao da Garantia
                  </p>
                  <p className="text-xs">{creditor.descricao_garantia}</p>
                </div>
              )}

              {creditor.matricula_registro && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Matricula/Registro:</span> {creditor.matricula_registro}
                </p>
              )}

              {creditor.localizacao_bem && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Localizacao:</span> {creditor.localizacao_bem}
                </p>
              )}

              {creditor.justificativa_essencialidade && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-medium text-emerald-800 mb-1">
                    Justificativa da Essencialidade
                  </p>
                  <p className="text-xs text-emerald-700">{creditor.justificativa_essencialidade}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk assessment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Risco de Perda</p>
              <Badge
                variant="outline"
                className={RISCO_COLORS[creditor.risco_perda_bem] || ""}
              >
                {RISCO_LABELS[creditor.risco_perda_bem] || creditor.risco_perda_bem}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Impacto Operacional</p>
              <Badge
                variant="outline"
                className={RISCO_COLORS[creditor.impacto_operacional] || ""}
              >
                {IMPACTO_LABELS[creditor.impacto_operacional] || creditor.impacto_operacional}
              </Badge>
            </div>
          </div>

          {/* Observations */}
          {creditor.observacoes && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Observacoes</p>
              <p className="text-xs">{creditor.observacoes}</p>
            </div>
          )}

          {/* Negotiation Events Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Historico de Negociacao
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowEventForm(!showEventForm)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Registrar Evento
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event creation form */}
              {showEventForm && (
                <form onSubmit={handleAddEvent} className="rounded-lg border p-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={eventType} onValueChange={setEventType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Proposto (opcional)</Label>
                      <Input
                        value={eventValor}
                        onChange={(e) => setEventValor(e.target.value)}
                        placeholder="R$ 0,00"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descricao</Label>
                    <Textarea
                      value={eventDescricao}
                      onChange={(e) => setEventDescricao(e.target.value)}
                      placeholder="Descreva o que aconteceu..."
                      rows={2}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowEventForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={addEventMutation.isPending}
                    >
                      {addEventMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Events grouped by rodada */}
              {rodadas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum evento de negociacao registrado.
                </p>
              ) : (
                rodadas.map((rodada) => (
                  <div key={rodada} className="space-y-2">
                    {rodada > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Rodada {rodada}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {eventsByRodada[rodada].map((ev) => {
                      const IconComp = EVENT_TYPE_ICONS[ev.tipo] || CircleDot;
                      return (
                        <div
                          key={ev.id}
                          className="flex gap-3 rounded-lg border p-3"
                        >
                          <div className="mt-0.5">
                            <IconComp className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                {EVENT_TYPE_LABELS[ev.tipo] || ev.tipo}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(ev.data).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{ev.descricao}</p>
                            {ev.valor_proposto != null && toNumber(ev.valor_proposto) > 0 && (
                              <p className="text-xs font-medium text-blue-600 mt-1">
                                Valor proposto: {formatBRL(ev.valor_proposto)}
                              </p>
                            )}
                            {ev.responsavel_id && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                por {ev.responsavel_id}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ========== MAIN COMPONENT ==========

export function QCTabExtraconcursais({ jrcId }: QCTabExtraconcursaisProps) {
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCreditor, setSelectedCreditor] = useState<ExtraconcursalCreditor | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: creditors, isLoading: loadingList } = trpc.rj.extraconcursals.list.useQuery({
    jrc_id: jrcId,
  });

  const { data: summary, isLoading: loadingSummary } = trpc.rj.extraconcursals.summary.useQuery({
    jrc_id: jrcId,
  });

  const isLoading = loadingList || loadingSummary;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const items = (creditors || []) as unknown as ExtraconcursalCreditor[];

  const summaryData: ExtraconcursalSummary = (summary as unknown as ExtraconcursalSummary) || {
    total_credito: items.reduce((s, c) => s + toNumber(c.valor_total), 0),
    total_garantia: items.reduce((s, c) => s + toNumber(c.avaliacao_valor), 0),
    exposicao:
      items.reduce((s, c) => s + toNumber(c.valor_total), 0) -
      items.reduce((s, c) => s + toNumber(c.avaliacao_valor), 0),
    em_negociacao: items.filter(
      (c) => c.status_negociacao === "EM_NEGOCIACAO" || c.status_negociacao === "PROPOSTA_ENVIADA" || c.status_negociacao === "CONTRAPROPOSTA"
    ).length,
    bens_essenciais: items.filter((c) => c.essencial_atividade).length,
    stay_ativo: items.filter((c) => {
      const d = calcStayDaysRemaining(c.prazo_suspensao_fim);
      return d !== null && d > 0;
    }).length,
    stay_encerrado: items.filter((c) => {
      const d = calcStayDaysRemaining(c.prazo_suspensao_fim);
      return d !== null && d <= 0;
    }).length,
  };

  function handleSelectCreditor(c: ExtraconcursalCreditor) {
    setSelectedCreditor(c);
    setShowDetail(true);
  }

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards */}
      <KPICards summary={summaryData} />

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar credor extraconcursal por nome ou CPF/CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-sm text-xs"
        />
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Novo Credor Extraconcursal
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <CreditorsTable
            creditors={items}
            search={search}
            onSelectCreditor={handleSelectCreditor}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateCreditorDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        jrcId={jrcId}
      />

      {/* Detail Sheet */}
      <CreditorDetailSheet
        creditor={selectedCreditor}
        open={showDetail}
        onOpenChange={(open) => {
          setShowDetail(open);
          if (!open) setSelectedCreditor(null);
        }}
        jrcId={jrcId}
      />
    </div>
  );
}
