"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Vote,
  Save,
  RotateCcw,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  VOTE_DIRECTION_LABELS,
  formatCentavos,
  formatPercentage,
  SCENARIO_TYPE_LABELS,
  SCENARIO_TYPE_COLORS,
} from "@/lib/rj-constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface PRJTabVotacaoProps {
  jrcId: string;
}

type VoteOverrides = Record<string, { voto?: string; presente_agc?: boolean }>;

export function PRJTabVotacao({ jrcId }: PRJTabVotacaoProps) {
  const [overrides, setOverrides] = useState<VoteOverrides>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioType, setScenarioType] = useState("BASE");
  const [scenarioDesc, setScenarioDesc] = useState("");

  const { data: creditors, isLoading: loadingCreditors } = trpc.rj.creditors.list.useQuery({
    jrc_id: jrcId,
    limit: 500,
  });

  const { data: votingResult, isLoading: loadingVoting } = trpc.rj.voting.simulate.useQuery(
    { jrc_id: jrcId, overrides: Object.keys(overrides).length > 0 ? overrides : undefined },
    { enabled: !!jrcId }
  );

  const { data: scenarios } = trpc.rj.voting.scenarios.list.useQuery({ jrc_id: jrcId });

  const utils = trpc.useUtils();

  const saveScenario = trpc.rj.voting.scenarios.create.useMutation({
    onSuccess: () => {
      utils.rj.voting.scenarios.list.invalidate({ jrc_id: jrcId });
      setSaveDialogOpen(false);
      setScenarioName("");
      setScenarioDesc("");
    },
  });

  const handleVoteChange = (creditorId: string, field: "voto" | "presente_agc", value: string | boolean) => {
    setOverrides((prev) => ({
      ...prev,
      [creditorId]: {
        ...prev[creditorId],
        [field]: value,
      },
    }));
  };

  const resetOverrides = () => setOverrides({});

  const hasOverrides = Object.keys(overrides).length > 0;

  if (loadingCreditors || loadingVoting) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!votingResult) return null;

  const classes = [
    "CLASSE_I_TRABALHISTA",
    "CLASSE_II_GARANTIA_REAL",
    "CLASSE_III_QUIROGRAFARIO",
    "CLASSE_IV_ME_EPP",
  ];

  const quorumChartData = classes.map((cls) => {
    const r = votingResult.por_classe[cls];
    return {
      classe: CREDIT_CLASS_SHORT_LABELS[cls] || cls,
      "A Favor (%)": r ? r.quorum_cabecas : 0,
      "Valor A Favor (%)": r ? r.quorum_valor : 0,
      aprovado: r?.aprovado || false,
    };
  });

  const totalFavor = Object.values(votingResult.por_classe).reduce((s, r) => s + r.votos_favor_cabecas, 0);
  const totalContra = Object.values(votingResult.por_classe).reduce((s, r) => s + r.votos_contra_cabecas, 0);
  const totalAbstencao = (votingResult.resumo.total_presentes || 0) - totalFavor - totalContra;

  const pieData = [
    { name: "A Favor", value: totalFavor, fill: "#10b981" },
    { name: "Contra", value: totalContra, fill: "#ef4444" },
    { name: "Abstenção", value: Math.max(0, totalAbstencao), fill: "#f59e0b" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Result Banner */}
      <Card className={votingResult.plano_aprovado ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {votingResult.plano_aprovado ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
            <div>
              <h2 className="text-lg font-bold">
                {votingResult.plano_aprovado ? "Plano APROVADO" : "Plano REJEITADO"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {votingResult.resumo.classes_aprovadas} de{" "}
                {votingResult.resumo.classes_aprovadas + votingResult.resumo.classes_rejeitadas} classes
                aprovaram | {votingResult.resumo.total_presentes} de{" "}
                {votingResult.resumo.total_credores} credores presentes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasOverrides && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                Cenário modificado
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={resetOverrides} disabled={!hasOverrides}>
              <RotateCcw className="mr-1 h-4 w-4" /> Resetar
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Save className="mr-1 h-4 w-4" /> Salvar Cenário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Salvar Cenário de Votação</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="Ex: Cenário base com adesão parcial" />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={scenarioType} onValueChange={setScenarioType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCENARIO_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={scenarioDesc} onChange={(e) => setScenarioDesc(e.target.value)} />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!scenarioName.trim() || saveScenario.isPending}
                    onClick={() => {
                      saveScenario.mutate({
                        jrc_id: jrcId,
                        nome: scenarioName,
                        tipo: scenarioType,
                        descricao: scenarioDesc || undefined,
                        overrides: overrides,
                      });
                    }}
                  >
                    {saveScenario.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Quorum Results per Class */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {classes.map((cls) => {
          const r = votingResult.por_classe[cls];
          if (!r) return null;
          return (
            <Card key={cls} className={r.aprovado ? "border-emerald-200" : r.presentes === 0 ? "border-gray-200 opacity-60" : "border-red-200"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{CREDIT_CLASS_SHORT_LABELS[cls]}</span>
                  {r.presentes > 0 ? (
                    r.aprovado ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Aprovado</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Rejeitado</Badge>
                    )
                  ) : (
                    <Badge variant="outline">Sem presentes</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Presentes</span>
                  <span className="font-medium">{r.presentes} / {r.total_credores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quorum Cabeça</span>
                  <span className="font-medium">{formatPercentage(r.quorum_cabecas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quorum Valor</span>
                  <span className="font-medium">{formatPercentage(r.quorum_valor)}</span>
                </div>
                <div className="mt-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>A favor: {r.votos_favor_cabecas}</span>
                    <span>Contra: {r.votos_contra_cabecas}</span>
                  </div>
                  <div className="mt-0.5 flex h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="bg-emerald-500" style={{ width: `${r.quorum_cabecas}%` }} />
                    <div className="bg-red-500" style={{ width: `${100 - r.quorum_cabecas}%` }} />
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{r.regra}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quorum por Classe (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={quorumChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="classe" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="A Favor (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Valor A Favor (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição de Votos (Geral)</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                Sem votos registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cram Down Analysis */}
      {!votingResult.plano_aprovado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Análise de Cram Down (Art. 58, §1º)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={votingResult.cram_down.viavel ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                {votingResult.cram_down.viavel ? "Cram Down Viável" : "Cram Down Inviável"}
              </Badge>
            </div>
            <div className="space-y-2">
              {votingResult.cram_down.requisitos.map((req) => (
                <div key={req.numero} className="flex items-start gap-2 rounded-lg border p-2">
                  {req.atendido ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Requisito {req.numero}: {req.descricao}</p>
                    <p className="text-xs text-muted-foreground">{req.detalhe}</p>
                  </div>
                </div>
              ))}
            </div>
            {votingResult.cram_down.bloqueios.length > 0 && (
              <div className="mt-2 rounded-lg bg-red-50 p-3">
                <p className="text-xs font-medium text-red-700">Bloqueios:</p>
                <ul className="ml-4 mt-1 list-disc text-xs text-red-600">
                  {votingResult.cram_down.bloqueios.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pivotal Creditors */}
      {votingResult.pivotal_creditors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> Credores Pivotais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Credores cuja mudança de voto alteraria o resultado da votação na sua classe.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 text-left">Credor</th>
                    <th className="pb-2 pr-4 text-left">Classe</th>
                    <th className="pb-2 pr-4 text-right">Valor</th>
                    <th className="pb-2 pr-4 text-left">Impacto</th>
                    <th className="pb-2 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {votingResult.pivotal_creditors.slice(0, 15).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.nome}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {CREDIT_CLASS_SHORT_LABELS[p.classe] || p.classe}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right text-xs">
                        {p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge className={p.impacto === "APROVACAO" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                          {p.impacto === "APROVACAO" ? "Aprovaria" : "Rejeitaria"}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{p.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vote Override Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Vote className="h-4 w-4" /> Simulação de Votos (What-If)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Altere votos e presença dos credores para simular diferentes cenários.
          </p>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 text-left">Credor</th>
                  <th className="pb-2 pr-3 text-left">Classe</th>
                  <th className="pb-2 pr-3 text-right">Valor</th>
                  <th className="pb-2 pr-3 text-center">Presente</th>
                  <th className="pb-2 text-left">Voto</th>
                </tr>
              </thead>
              <tbody>
                {(creditors?.items || []).slice(0, 100).map((c) => {
                  const cred = c as unknown as { id: string; nome: string; classe: string; valor_atualizado: bigint; voto: string | null; presente_agc: boolean };
                  const override = overrides[cred.id];
                  const currentVoto = override?.voto ?? cred.voto ?? "";
                  const currentPresente = override?.presente_agc ?? cred.presente_agc ?? false;

                  return (
                    <tr key={cred.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 text-xs">{cred.nome}</td>
                      <td className="py-1.5 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {CREDIT_CLASS_SHORT_LABELS[cred.classe] || cred.classe}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3 text-right text-xs">
                        {formatCentavos(cred.valor_atualizado)}
                      </td>
                      <td className="py-1.5 pr-3 text-center">
                        <input
                          type="checkbox"
                          checked={currentPresente}
                          onChange={(e) => handleVoteChange(cred.id, "presente_agc", e.target.checked)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="py-1.5">
                        <select
                          value={currentVoto}
                          onChange={(e) => handleVoteChange(cred.id, "voto", e.target.value)}
                          className="h-7 rounded border bg-background px-1.5 text-xs"
                          disabled={!currentPresente}
                        >
                          <option value="">—</option>
                          <option value="FAVOR">A Favor</option>
                          <option value="CONTRA">Contra</option>
                          <option value="ABSTENCAO">Abstenção</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Saved Scenarios */}
      {scenarios && scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cenários Salvos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.nome}</span>
                    <Badge className={SCENARIO_TYPE_COLORS[s.tipo] || "bg-gray-100"}>
                      {SCENARIO_TYPE_LABELS[s.tipo] || s.tipo}
                    </Badge>
                  </div>
                  {s.descricao && (
                    <p className="mt-1 text-xs text-muted-foreground">{s.descricao}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {s.aprovado ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">Aprovado</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 text-xs">Rejeitado</Badge>
                    )}
                    {s.cram_down_viavel && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">Cram Down Viável</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                      if (s.overrides && typeof s.overrides === "object") {
                        setOverrides(s.overrides as VoteOverrides);
                      }
                    }}
                  >
                    <Eye className="mr-1 h-3 w-3" /> Carregar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
