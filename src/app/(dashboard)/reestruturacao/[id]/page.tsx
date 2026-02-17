import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StratNegDetail } from "@/components/reestruturacao/strat-neg-detail";

export default function NegociacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <DashboardShell>
      <StratNegDetail params={params} />
    </DashboardShell>
  );
}
