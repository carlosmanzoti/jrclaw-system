import { StratNegDetail } from "@/components/reestruturacao/strat-neg-detail";

export default function NegociacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <StratNegDetail params={params} />;
}
