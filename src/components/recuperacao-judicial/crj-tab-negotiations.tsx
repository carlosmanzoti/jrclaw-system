"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import {
  CRJ_STATUS_LABELS,
  CRJ_STATUS_COLORS,
  CRJ_STATUS_ORDER,
  CRJ_TYPE_LABELS,
  CRJ_PRIORITY_LABELS,
  CRJ_PRIORITY_COLORS,
  formatBRL,
  formatPercent,
  daysSince,
} from "@/lib/crj-constants";
import {
  Search,
  LayoutList,
  LayoutGrid,
  ChevronRight,
  Clock,
  User,
  Filter,
  X,
} from "lucide-react";

interface CRJTabNegotiationsProps {
  jrcId: string;
  onSelectNegotiation?: (id: string) => void;
}

type ViewMode = "list" | "kanban";

export function CRJTabNegotiations({
  jrcId,
  onSelectNegotiation,
}: CRJTabNegotiationsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const { data: negotiations, isLoading } =
    trpc.crjNeg.negotiations.list.useQuery({
      jrc_id: jrcId,
      search: search || undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      type: filterType !== "all" ? filterType : undefined,
      priority: filterPriority !== "all" ? filterPriority : undefined,
      assigned_to_id: filterAssignee !== "all" ? filterAssignee : undefined,
    });

  const utils = trpc.useUtils();

  const updateMutation = trpc.crjNeg.negotiations.update.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
    },
  });

  // Get unique assignees for filter
  const assignees = useMemo(() => {
    if (!negotiations) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const n of negotiations) {
      if (n.assigned_to) {
        map.set(n.assigned_to.id, {
          id: n.assigned_to.id,
          name: n.assigned_to.name || "Sem nome",
        });
      }
    }
    return Array.from(map.values());
  }, [negotiations]);

  const items = negotiations || [];

  const hasActiveFilters =
    filterStatus !== "all" ||
    filterType !== "all" ||
    filterPriority !== "all" ||
    filterAssignee !== "all";

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterType("all");
    setFilterPriority("all");
    setFilterAssignee("all");
    setSearch("");
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((n) => n.id)));
    }
  };

  // Bulk status change
  const handleBulkStatus = (newStatus: string) => {
    for (const id of selectedIds) {
      updateMutation.mutate({ id, status: newStatus });
    }
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por credor, título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-1 h-3.5 w-3.5" />
          Filtros
          {hasActiveFilters && (
            <Badge className="ml-1.5 h-4 w-4 rounded-full bg-primary p-0 text-[10px] text-primary-foreground">
              !
            </Badge>
          )}
        </Button>

        {/* View toggle */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-r-none px-2"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-l-none px-2"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(CRJ_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(CRJ_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(CRJ_PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {assignees.length > 0 && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3 w-3" /> Limpar
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {items.length} negociação(ões)
          </span>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-primary/5 px-6 py-2">
          <span className="text-xs font-medium">
            {selectedIds.size} selecionada(s)
          </span>
          <Select onValueChange={handleBulkStatus}>
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder="Alterar status em lote" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CRJ_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters || search
                  ? "Nenhuma negociação encontrada com os filtros aplicados"
                  : "Nenhuma negociação individual cadastrada"}
              </p>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <ListViewContent
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onSelectNegotiation={onSelectNegotiation}
          />
        ) : (
          <KanbanViewContent
            items={items}
            onSelectNegotiation={onSelectNegotiation}
            onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
          />
        )}
      </div>
    </div>
  );
}

// ========== List View ==========

interface ListViewProps {
  items: Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    credit_amount: bigint | number;
    proposed_amount: bigint | number | null;
    agreed_amount: bigint | number | null;
    discount_percentage: number | null;
    target_date: Date | string | null;
    updated_at: Date | string;
    creditor: {
      id: string;
      nome: string;
      cpf_cnpj: string | null;
      classe: string;
    } | null;
    assigned_to: {
      id: string;
      name: string | null;
      avatar_url: string | null;
    } | null;
    _count: {
      rounds: number;
      proposals: number;
      events: number;
      emails: number;
    };
  }>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onSelectNegotiation?: (id: string) => void;
}

function ListViewContent({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onSelectNegotiation,
}: ListViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 pr-2">
              <Checkbox
                checked={selectedIds.size === items.length && items.length > 0}
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="px-2 py-2.5">Credor</th>
            <th className="px-2 py-2.5">Status</th>
            <th className="px-2 py-2.5">Tipo</th>
            <th className="px-2 py-2.5">Prioridade</th>
            <th className="px-2 py-2.5 text-right">Crédito</th>
            <th className="px-2 py-2.5 text-right">Proposto</th>
            <th className="px-2 py-2.5 text-right">Deságio</th>
            <th className="px-2 py-2.5">Responsável</th>
            <th className="px-2 py-2.5">Prazo</th>
            <th className="px-2 py-2.5 text-right">Rodadas</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((neg) => {
            const isOverdue =
              neg.target_date &&
              new Date(neg.target_date) < new Date() &&
              !["CONCLUIDA", "CANCELADA"].includes(neg.status);
            const stale =
              daysSince(neg.updated_at) > 7 &&
              !["CONCLUIDA", "CANCELADA", "SUSPENSA"].includes(neg.status);

            return (
              <tr
                key={neg.id}
                className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                onClick={() => onSelectNegotiation?.(neg.id)}
              >
                <td className="px-4 py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(neg.id)}
                    onCheckedChange={() => onToggleSelect(neg.id)}
                  />
                </td>
                <td className="max-w-[200px] px-2 py-2">
                  <div>
                    <p className="truncate text-sm font-medium">
                      {neg.creditor?.nome || "—"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {neg.creditor?.cpf_cnpj || ""}{" "}
                      {neg.creditor?.classe ? `• ${neg.creditor.classe}` : ""}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <Badge
                    className={`text-[10px] ${
                      CRJ_STATUS_COLORS[neg.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {CRJ_STATUS_LABELS[neg.status] || neg.status}
                  </Badge>
                </td>
                <td className="px-2 py-2 text-xs text-muted-foreground">
                  {CRJ_TYPE_LABELS[neg.type] || neg.type}
                </td>
                <td className="px-2 py-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      CRJ_PRIORITY_COLORS[neg.priority] || ""
                    }`}
                  >
                    {CRJ_PRIORITY_LABELS[neg.priority] || neg.priority}
                  </Badge>
                </td>
                <td className="px-2 py-2 text-right text-xs">
                  {formatBRL(neg.credit_amount)}
                </td>
                <td className="px-2 py-2 text-right text-xs font-medium">
                  {neg.proposed_amount ? formatBRL(neg.proposed_amount) : "—"}
                </td>
                <td className="px-2 py-2 text-right text-xs">
                  {neg.discount_percentage != null
                    ? formatPercent(neg.discount_percentage)
                    : "—"}
                </td>
                <td className="px-2 py-2">
                  {neg.assigned_to ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                        {neg.assigned_to.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="max-w-[80px] truncate text-xs">
                        {neg.assigned_to.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {neg.target_date ? (
                    <span
                      className={`text-xs ${
                        isOverdue
                          ? "font-medium text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(neg.target_date).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                  {neg._count.rounds}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    {stale && (
                      <span title="Sem movimentação há +7 dias">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ========== Kanban View ==========

interface KanbanViewProps {
  items: Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    credit_amount: bigint | number;
    proposed_amount: bigint | number | null;
    discount_percentage: number | null;
    target_date: Date | string | null;
    updated_at: Date | string;
    creditor: {
      nome: string;
      classe: string;
    } | null;
    assigned_to: {
      name: string | null;
    } | null;
    _count: {
      rounds: number;
    };
  }>;
  onSelectNegotiation?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}

function KanbanViewContent({
  items,
  onSelectNegotiation,
  onStatusChange,
}: KanbanViewProps) {
  // Group items by status in pipeline order
  const columns = useMemo(() => {
    const map: Record<string, typeof items> = {};
    for (const status of [...CRJ_STATUS_ORDER, "SUSPENSA", "CANCELADA"]) {
      map[status] = [];
    }
    for (const item of items) {
      if (!map[item.status]) map[item.status] = [];
      map[item.status].push(item);
    }
    // Only show columns that have items or are in the main pipeline
    return [...CRJ_STATUS_ORDER, "SUSPENSA", "CANCELADA"]
      .filter((s) => (map[s]?.length || 0) > 0 || CRJ_STATUS_ORDER.includes(s))
      .map((status) => ({ status, items: map[status] || [] }));
  }, [items]);

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {columns.map(({ status, items: colItems }) => (
        <div
          key={status}
          className="flex w-[260px] min-w-[260px] flex-col rounded-lg border bg-muted/20"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between rounded-t-lg border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge
                className={`text-[10px] ${
                  CRJ_STATUS_COLORS[status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {CRJ_STATUS_LABELS[status] || status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {colItems.length}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {colItems.length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">
                Nenhuma negociação
              </div>
            ) : (
              colItems.map((neg) => {
                const stale =
                  daysSince(neg.updated_at) > 7 &&
                  !["CONCLUIDA", "CANCELADA", "SUSPENSA"].includes(neg.status);

                return (
                  <Card
                    key={neg.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => onSelectNegotiation?.(neg.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <p className="line-clamp-1 text-xs font-medium">
                          {neg.creditor?.nome || neg.title}
                        </p>
                        {stale && (
                          <span title="Sem movimentação">
                            <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            CRJ_PRIORITY_COLORS[neg.priority] || ""
                          }`}
                        >
                          {CRJ_PRIORITY_LABELS[neg.priority]}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          {neg.creditor?.classe || "—"}
                        </Badge>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-medium">
                          {formatBRL(neg.credit_amount)}
                        </span>
                        {neg.discount_percentage != null && (
                          <span>
                            -{formatPercent(neg.discount_percentage)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        {neg.assigned_to ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="max-w-[100px] truncate text-muted-foreground">
                              {neg.assigned_to.name}
                            </span>
                          </div>
                        ) : (
                          <span />
                        )}
                        {neg._count.rounds > 0 && (
                          <span className="text-muted-foreground">
                            {neg._count.rounds} rod.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
