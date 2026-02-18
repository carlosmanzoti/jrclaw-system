"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CRJAIConfig } from "@/components/recuperacao-judicial/crj-ai-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function IANegociacoesPage() {
  const [selectedJrcId, setSelectedJrcId] = useState<string | null>(null);

  const { data: cases, isLoading } = trpc.rj.cases.list.useQuery();

  const jrcId = selectedJrcId || cases?.[0]?.id || null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* JRC selector if multiple */}
      {cases && cases.length > 1 && (
        <div className="shrink-0 border-b px-6 py-3 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Caso RJ:
          </span>
          <Select
            value={jrcId || ""}
            onValueChange={(v) => setSelectedJrcId(v)}
          >
            <SelectTrigger className="w-[350px]">
              <SelectValue placeholder="Selecione o caso RJ" />
            </SelectTrigger>
            <SelectContent>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_?.numero_processo || "Sem numero"} —{" "}
                  {c.case_?.cliente?.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <CRJAIConfig jrcId={jrcId} />
      </div>
    </div>
  );
}
