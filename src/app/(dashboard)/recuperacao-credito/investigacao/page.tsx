"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { InvestigationList } from "@/components/investigation/investigation-list";
import { NewInvestigationDialog } from "@/components/investigation/new-investigation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Shield,
  AlertTriangle,
  TrendingUp,
  FileSearch,
} from "lucide-react";

export default function InvestigacaoPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: listData, isLoading, refetch } =
    trpc.investigation.list.useQuery({
      status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
      search: searchQuery || undefined,
    });

  const { data: stats } = trpc.investigation.getDashboardStats.useQuery({});

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Investigacao Patrimonial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Levantamento patrimonial e analise de risco de alvos para
            recuperacao de credito
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="size-4 mr-2" />
          Nova Investigacao
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Em Andamento
                </p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  {stats?.activeInvestigations ?? 0}
                </p>
              </div>
              <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center">
                <FileSearch className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Concluidas
                </p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {stats?.completedInPeriod ?? 0}
                </p>
              </div>
              <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
                <Shield className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Alto Risco
                </p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {stats?.pendingAlerts ?? 0}
                </p>
              </div>
              <div className="size-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Patrimonio Total
                </p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(stats?.totalPatrimonyTracked ?? 0)}
                </p>
              </div>
              <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="CONCLUIDA">Concluida</SelectItem>
                <SelectItem value="ARQUIVADA">Arquivada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                <SelectItem value="PF">Pessoa Fisica</SelectItem>
                <SelectItem value="PJ">Pessoa Juridica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Investigation List */}
      <InvestigationList
        investigations={listData?.items ?? []}
        isLoading={isLoading}
      />

      {/* New Investigation Dialog */}
      <NewInvestigationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
