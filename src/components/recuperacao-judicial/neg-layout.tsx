"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { JR_STATUS_LABELS, JR_STATUS_COLORS } from "@/lib/rj-constants";
import { CRJTabDashboard } from "./crj-tab-dashboard";
import { CRJTabNegotiations } from "./crj-tab-negotiations";
import { NegTabRodadas } from "./neg-tab-rodadas";
import { NegTabParceiro } from "./neg-tab-parceiro";
import { NegTabComunicacoes } from "./neg-tab-comunicacoes";
import { NegTabMediacao } from "./neg-tab-mediacao";
import { NegTabComparativo } from "./neg-tab-comparativo";
import { CRJCreateWizard } from "./crj-create-wizard";
import { CRJNegotiationDetail } from "./crj-negotiation-detail";
import {
  Plus,
  Download,
  Upload,
  Handshake,
  CheckCircle,
} from "lucide-react";

export function NegLayout() {
  const [selectedJrcId, setSelectedJrcId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedNegId, setSelectedNegId] = useState<string | null>(null);

  const { data: cases, isLoading: loadingCases } = trpc.rj.cases.list.useQuery();

  const jrcId = selectedJrcId || cases?.[0]?.id || null;

  const { data: jrc } = trpc.rj.cases.getById.useQuery(
    { id: jrcId! },
    { enabled: !!jrcId }
  );

  // Import creditors from QGC
  const utils = trpc.useUtils();
  const bulkCreateMutation = trpc.crjNeg.negotiations.bulkCreate.useMutation({
    onSuccess: (result) => {
      utils.crjNeg.invalidate();
      setImporting(false);
      setImportDialogOpen(false);
    },
    onError: () => {
      setImporting(false);
    },
  });

  // Get QGC creditors for import dialog
  const { data: qgcCreditors } = trpc.rj.creditors.list.useQuery(
    { jrc_id: jrcId! },
    { enabled: !!jrcId && importDialogOpen }
  );

  const handleImportAll = () => {
    if (!jrcId || !qgcCreditors?.items?.length) return;
    setImporting(true);
    bulkCreateMutation.mutate({
      jrc_id: jrcId,
      creditor_ids: qgcCreditors.items.map((c: { id: string }) => c.id),
    });
  };

  if (loadingCases) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold">Nenhum caso de Recuperação Judicial</h2>
          <p className="text-sm text-muted-foreground">
            Processos do tipo &quot;Recuperação Judicial&quot; aparecem automaticamente.
            Crie um na tela de Processos para começar.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <a
              href="/processos"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Ir para Processos
            </a>
            <a
              href="/recuperacao-judicial"
              className="inline-flex items-center rounded-md bg-[#C9A961] px-4 py-2 text-sm font-medium text-[#2A2A2A] hover:bg-[#B8984F]"
            >
              Dashboard RJ
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Negociações com Credores</h1>
          {cases.length > 1 && (
            <Select
              value={jrcId || ""}
              onValueChange={(v) => setSelectedJrcId(v)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione o caso RJ" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_?.numero_processo || "Sem número"} —{" "}
                    {c.case_?.cliente?.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {jrc && (
            <Badge className={JR_STATUS_COLORS[jrc.status_rj] || "bg-gray-100"}>
              {JR_STATUS_LABELS[jrc.status_rj] || jrc.status_rj}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        {jrcId && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nova Negociação
            </Button>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Importar do QGC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Importar Credores do QGC</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Importar credores do Quadro Geral de Credores para criar
                    negociações individuais automaticamente. Credores que já
                    possuem negociação ativa serão ignorados.
                  </p>
                  {qgcCreditors?.items ? (
                    <div className="rounded-lg border p-4 text-center">
                      <Handshake className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {qgcCreditors.items.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        credores disponíveis no QGC
                      </p>
                    </div>
                  ) : (
                    <Skeleton className="h-24" />
                  )}
                  {bulkCreateMutation.isSuccess && (
                    <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {bulkCreateMutation.data?.created} negociações criadas,{" "}
                        {bulkCreateMutation.data?.skipped} ignoradas (já
                        existentes)
                      </span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleImportAll}
                    disabled={
                      importing ||
                      !qgcCreditors?.items?.length ||
                      bulkCreateMutation.isSuccess
                    }
                  >
                    {importing
                      ? "Importando..."
                      : bulkCreateMutation.isSuccess
                      ? "Importação concluída"
                      : "Importar Todos os Credores"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Download className="mr-1 h-3.5 w-3.5" />
              Exportar Relatório
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      {jrcId ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            <div className="border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="individuais">
                  Negociações Individuais
                </TabsTrigger>
                <TabsTrigger value="rodadas">Rodadas Coletivas</TabsTrigger>
                <TabsTrigger value="parceiro">Credor Parceiro</TabsTrigger>
                <TabsTrigger value="comunicacoes">Comunicações</TabsTrigger>
                <TabsTrigger value="mediacao">Mediação</TabsTrigger>
                <TabsTrigger value="comparativo">RJ vs Falência</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="dashboard" className="m-0 h-full">
                <CRJTabDashboard jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="individuais" className="m-0 h-full">
                {selectedNegId ? (
                  <CRJNegotiationDetail
                    negotiationId={selectedNegId}
                    onBack={() => setSelectedNegId(null)}
                  />
                ) : (
                  <CRJTabNegotiations
                    jrcId={jrcId}
                    onSelectNegotiation={(id) => setSelectedNegId(id)}
                  />
                )}
              </TabsContent>
              <TabsContent value="rodadas" className="m-0 h-full">
                <NegTabRodadas jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="parceiro" className="m-0 h-full">
                <NegTabParceiro jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="comunicacoes" className="m-0 h-full">
                <NegTabComunicacoes jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="mediacao" className="m-0 h-full">
                <NegTabMediacao jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="comparativo" className="m-0 h-full">
                <NegTabComparativo jrcId={jrcId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">
            Selecione um caso de Recuperação Judicial
          </p>
        </div>
      )}

      {/* Status bar */}
      {jrc && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-1 text-xs text-muted-foreground">
          <span>
            Processo: {jrc.case_?.numero_processo || "—"} | Cliente:{" "}
            {jrc.case_?.cliente?.nome || "—"}
          </span>
          <span>
            {jrc.total_credores} credores | Plano v{jrc.plano_versao} |{" "}
            {jrc.plano_aprovado ? "Aprovado" : "Pendente"}
          </span>
        </div>
      )}

      {/* Create Wizard */}
      {jrcId && (
        <CRJCreateWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          jrcId={jrcId}
        />
      )}
    </div>
  );
}
