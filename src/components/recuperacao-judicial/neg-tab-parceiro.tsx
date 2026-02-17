"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  formatCentavos,
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_COLORS,
} from "@/lib/rj-constants";
import { Star, Users, DollarSign, TrendingUp, Shield } from "lucide-react";

interface NegTabParceiroProps {
  jrcId: string;
}

export function NegTabParceiro({ jrcId }: NegTabParceiroProps) {
  const { data: partners, isLoading } = trpc.rj.negotiations.partners.useQuery({
    jrc_id: jrcId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const creditors = partners?.creditors ?? [];

  const totalParceiros = creditors.length;
  const totalValorOriginal = creditors.reduce(
    (sum, p) => sum + (Number(p.creditor?.valor_atualizado ?? 0)),
    0
  );
  const totalValorProposto = creditors.reduce(
    (sum, p) => sum + (Number(p.valor_proposto ?? 0)),
    0
  );

  const kpis = [
    {
      title: "Total Credores Parceiros",
      value: totalParceiros.toString(),
      icon: Users,
      description: "Credores que apoiam o plano",
    },
    {
      title: "Valor Original Total",
      value: formatCentavos(totalValorOriginal),
      icon: DollarSign,
      description: "Soma dos créditos originais",
    },
    {
      title: "Valor Proposto Total",
      value: formatCentavos(totalValorProposto),
      icon: TrendingUp,
      description: "Soma dos valores propostos",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-sm font-medium">Programa Credor Parceiro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Programa Credor Parceiro identifica credores que apoiam o plano de
            recuperação e podem receber tratamento diferenciado, como prioridade no
            pagamento ou redução menor no deságio.
          </p>
        </CardContent>
      </Card>

      {/* Row 3: Partners Table */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-sm font-medium">Credores Parceiros</CardTitle>
        </CardHeader>
        <CardContent>
          {creditors.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Nenhum credor parceiro identificado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="text-right">Valor Original</TableHead>
                  <TableHead className="text-right">Valor Proposto</TableHead>
                  <TableHead>Voto</TableHead>
                  <TableHead>Negociação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditors.map((partner) => {
                  const creditor = partner.creditor;
                  const negotiation = partner.negotiation;

                  return (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">
                        {creditor?.nome ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {creditor?.cpf_cnpj ?? "—"}
                      </TableCell>
                      <TableCell>
                        {creditor?.classe ? (
                          <Badge
                            variant="outline"
                            className={CREDIT_CLASS_COLORS[creditor.classe] ?? ""}
                          >
                            {CREDIT_CLASS_SHORT_LABELS[creditor.classe] ?? creditor.classe}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCentavos(creditor?.valor_atualizado)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCentavos(partner.valor_proposto)}
                      </TableCell>
                      <TableCell>
                        {creditor?.voto ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {negotiation?.titulo ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
