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
import { QCSidebar } from "./qc-sidebar";
import { QCTabResumo } from "./qc-tab-resumo";
import { QCTabLista } from "./qc-tab-lista";
import { QCTabSubclasses } from "./qc-tab-subclasses";
import { QCTabImpugnacoes } from "./qc-tab-impugnacoes";
import { QCTabVersoes } from "./qc-tab-versoes";
import { QCTabPagamentos } from "./qc-tab-pagamentos";

export function QCLayout() {
  const [selectedJrcId, setSelectedJrcId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("resumo");

  const { data: cases, isLoading: loadingCases } = trpc.rj.cases.list.useQuery();

  // Auto-select first case
  const jrcId = selectedJrcId || cases?.[0]?.id || null;

  const { data: jrc, isLoading: loadingJrc } = trpc.rj.cases.getById.useQuery(
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
            Para utilizar o Quadro de Credores, primeiro crie um processo do tipo
            &quot;Recuperação Judicial&quot; e vincule-o a um caso RJ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Quadro Geral de Credores</h1>
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
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[320px] shrink-0 overflow-y-auto border-r bg-muted/30">
            <QCSidebar jrcId={jrcId} jrc={jrc} loading={loadingJrc} />
          </div>

          {/* Tabs content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
              <div className="border-b px-4">
                <TabsList className="h-10">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="lista">Lista de Credores</TabsTrigger>
                  <TabsTrigger value="subclasses">Subclasses</TabsTrigger>
                  <TabsTrigger value="impugnacoes">Impugnações</TabsTrigger>
                  <TabsTrigger value="versoes">Versões</TabsTrigger>
                  <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="resumo" className="m-0 h-full">
                  <QCTabResumo jrcId={jrcId} />
                </TabsContent>
                <TabsContent value="lista" className="m-0 h-full">
                  <QCTabLista jrcId={jrcId} />
                </TabsContent>
                <TabsContent value="subclasses" className="m-0 h-full">
                  <QCTabSubclasses jrcId={jrcId} />
                </TabsContent>
                <TabsContent value="impugnacoes" className="m-0 h-full">
                  <QCTabImpugnacoes jrcId={jrcId} />
                </TabsContent>
                <TabsContent value="versoes" className="m-0 h-full">
                  <QCTabVersoes jrcId={jrcId} />
                </TabsContent>
                <TabsContent value="pagamentos" className="m-0 h-full">
                  <QCTabPagamentos jrcId={jrcId} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
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
            {jrc.total_credores} credores | Última atualização:{" "}
            {new Date(jrc.updated_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}
    </div>
  );
}
