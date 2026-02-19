"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { InvestigationDetail } from "@/components/investigation/investigation-detail";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvestigacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: investigation,
    isLoading,
    refetch,
  } = trpc.investigation.getById.useQuery({ id });

  const { data: assetsData } = trpc.investigation.getAssets.useQuery(
    { investigationId: id },
    { enabled: !!id }
  );

  const { data: timeline } = trpc.investigation.getTimeline.useQuery(
    { investigationId: id },
    { enabled: !!id }
  );

  const { data: alerts } = trpc.investigation.getAlerts.useQuery(
    { investigationId: id },
    { enabled: !!id }
  );

  const startScanMutation = trpc.investigation.startScan.useMutation({
    onSuccess: () => refetch(),
  });

  const generateReportMutation = trpc.investigation.generateReport.useMutation();

  const analyzeWithAIMutation = trpc.investigation.analyzeWithAI.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Investigacao nao encontrada
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Verifique o ID informado e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InvestigationDetail
      investigation={investigation}
      assets={assetsData?.items ?? []}
      timeline={timeline ?? []}
      alerts={alerts ?? []}
      onStartScan={() => startScanMutation.mutate({ investigationId: id })}
      onGenerateReport={() =>
        generateReportMutation.mutate({ investigationId: id, reportType: "DOSSIE_COMPLETO" })
      }
      onAnalyzeWithAI={() =>
        analyzeWithAIMutation.mutate({ investigationId: id })
      }
      isScanning={startScanMutation.isPending}
      isGeneratingReport={generateReportMutation.isPending}
      isAnalyzing={analyzeWithAIMutation.isPending}
      onRefresh={refetch}
    />
  );
}
