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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { JR_STATUS_LABELS, JR_STATUS_COLORS } from "@/lib/rj-constants";
import { PRJTabVotacao } from "./prj-tab-votacao";
import { PRJTabProjecoes } from "./prj-tab-projecoes";
import { PRJTabStress } from "./prj-tab-stress";
import { PRJTabAGC } from "./prj-tab-agc";

export function PRJLayout() {
  const [selectedJrcId, setSelectedJrcId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("votacao");

  const { data: cases, isLoading: loadingCases } = trpc.rj.cases.list.useQuery();

  const jrcId = selectedJrcId || cases?.[0]?.id || null;

  const { data: jrc } = trpc.rj.cases.getById.useQuery(
    { id: jrcId! },
    { enabled: !!jrcId }
  );

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
            <a href="/processos" className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Ir para Processos
            </a>
            <a href="/recuperacao-judicial" className="inline-flex items-center rounded-md bg-[#C9A961] px-4 py-2 text-sm font-medium text-[#2A2A2A] hover:bg-[#B8984F]">
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
          <h1 className="text-lg font-semibold">Aprovação do Plano de Recuperação</h1>
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
                    {c.case_?.numero_processo || "Sem número"} — {c.case_?.cliente?.nome}
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
      </div>

      {/* Main content */}
      {jrcId ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <div className="border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="votacao">Simulador de Votação</TabsTrigger>
                <TabsTrigger value="projecoes">Projeções Financeiras</TabsTrigger>
                <TabsTrigger value="stress">Stress Test</TabsTrigger>
                <TabsTrigger value="agc">Painel AGC</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="votacao" className="m-0 h-full">
                <PRJTabVotacao jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="projecoes" className="m-0 h-full">
                <PRJTabProjecoes jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="stress" className="m-0 h-full">
                <PRJTabStress jrcId={jrcId} />
              </TabsContent>
              <TabsContent value="agc" className="m-0 h-full">
                <PRJTabAGC jrcId={jrcId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Selecione um caso de Recuperação Judicial</p>
        </div>
      )}

      {/* Status bar */}
      {jrc && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-1 text-xs text-muted-foreground">
          <span>
            Processo: {jrc.case_?.numero_processo || "—"} | Cliente: {jrc.case_?.cliente?.nome || "—"}
          </span>
          <span>
            {jrc.total_credores} credores | Plano v{jrc.plano_versao} |{" "}
            {jrc.plano_aprovado ? "Aprovado" : "Pendente"}
          </span>
        </div>
      )}
    </div>
  );
}
