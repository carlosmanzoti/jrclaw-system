"use client";

import { useState, useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download, Upload, Trash2, Tags, ArrowUpDown, Filter, Handshake } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_CLASS_SHORT_LABELS,
  CREDIT_CLASS_COLORS,
  CREDIT_NATURE_LABELS,
  CREDIT_STATUS_LABELS,
  CREDIT_STATUS_COLORS,
  formatCentavos,
  formatPercentage,
} from "@/lib/rj-constants";
import { CRJ_STATUS_LABELS, CRJ_STATUS_COLORS } from "@/lib/crj-constants";
import { CreditorForm } from "./creditor-form";
import { ImportWizard } from "./import-wizard";

interface QCTabListaProps {
  jrcId: string;
}

type CreditorRow = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  classe: string;
  natureza: string;
  status: string;
  valor_original: bigint;
  valor_atualizado: bigint;
  valor_garantia: bigint;
  desagio_percentual: number | null;
  parcelas: number | null;
  carencia_meses: number | null;
  subclass: { id: string; nome: string; cor: string | null } | null;
  crj_negotiations: { id: string; status: string; title: string }[];
};

export function QCTabLista({ jrcId }: QCTabListaProps) {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [naturezaFilter, setNaturezaFilter] = useState("ALL");

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.rj.creditors.list.useQuery({
    jrc_id: jrcId,
    limit: 500,
    search: search || undefined,
  });

  const deleteMutation = trpc.rj.creditors.delete.useMutation({
    onSuccess: () => utils.rj.creditors.invalidate(),
  });

  const exportMutation = trpc.rj.creditors.export.useMutation({
    onSuccess: (data) => {
      const blob = new Blob(
        [Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0))],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const items: CreditorRow[] = useMemo(() => {
    const all = (data?.items || []) as CreditorRow[];
    if (naturezaFilter === "ALL") return all;
    return all.filter((c) => c.natureza === naturezaFilter);
  }, [data, naturezaFilter]);

  const columns = useMemo<ColumnDef<CreditorRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        id: "index",
        header: "#",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.index + 1}</span>,
        size: 50,
      },
      {
        accessorKey: "nome",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
            Nome <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <span className="truncate font-medium">{row.original.nome}</span>
            {row.original.cpf_cnpj && (
              <span className="block text-[10px] text-muted-foreground">{row.original.cpf_cnpj}</span>
            )}
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "classe",
        header: "Classe",
        cell: ({ row }) => (
          <Badge variant="outline" className={`text-[10px] ${CREDIT_CLASS_COLORS[row.original.classe] || ""}`}>
            {CREDIT_CLASS_SHORT_LABELS[row.original.classe] || row.original.classe}
          </Badge>
        ),
        size: 110,
      },
      {
        accessorKey: "natureza",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
            Natureza <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className={`text-xs ${row.original.natureza === "A_DEFINIR" ? "font-medium text-amber-600" : ""}`}>
            {CREDIT_NATURE_LABELS[row.original.natureza] || row.original.natureza}
          </span>
        ),
        size: 140,
      },
      {
        id: "subclass",
        header: "Subclasse",
        cell: ({ row }) => (
          row.original.subclass ? (
            <Badge
              variant="outline"
              className="text-[10px]"
              style={row.original.subclass.cor ? { borderColor: row.original.subclass.cor } : undefined}
            >
              {row.original.subclass.nome}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        ),
        size: 120,
      },
      {
        accessorKey: "valor_original",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
            Valor Original <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium">{formatCentavos(row.original.valor_original)}</span>
        ),
        size: 140,
        sortingFn: (a, b) => Number(a.original.valor_original) - Number(b.original.valor_original),
      },
      {
        accessorKey: "valor_atualizado",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
            Valor Atualizado <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold">{formatCentavos(row.original.valor_atualizado)}</span>
        ),
        size: 150,
        sortingFn: (a, b) => Number(a.original.valor_atualizado) - Number(b.original.valor_atualizado),
      },
      {
        accessorKey: "desagio_percentual",
        header: "Deságio",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.desagio_percentual != null ? formatPercentage(row.original.desagio_percentual) : "—"}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: "parcelas",
        header: "Parcelas",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.parcelas ?? "—"}</span>
        ),
        size: 70,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline" className={`text-[10px] ${CREDIT_STATUS_COLORS[row.original.status] || ""}`}>
            {CREDIT_STATUS_LABELS[row.original.status] || row.original.status}
          </Badge>
        ),
        size: 120,
      },
      {
        id: "crj",
        header: "Negociação",
        cell: ({ row }) => {
          const neg = row.original.crj_negotiations?.[0];
          if (!neg) {
            return <span className="text-[10px] text-muted-foreground">—</span>;
          }
          return (
            <a
              href={`/recuperacao-judicial/negociacoes?neg=${neg.id}`}
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Handshake className="h-3 w-3 text-emerald-600" />
              <Badge className={`text-[9px] ${CRJ_STATUS_COLORS[neg.status] || "bg-gray-100 text-gray-700"}`}>
                {CRJ_STATUS_LABELS[neg.status] || neg.status}
              </Badge>
            </a>
          );
        },
        size: 120,
      },
    ],
    []
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, rowSelection, globalFilter: search },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Input
          placeholder="Buscar credor por nome ou CPF/CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-xs text-xs"
        />
        <Select value={naturezaFilter} onValueChange={setNaturezaFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Natureza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as naturezas</SelectItem>
            {Object.entries(CREDIT_NATURE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowImport(true)}>
          <Upload className="mr-1 h-3 w-3" /> Importar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => exportMutation.mutate({ jrc_id: jrcId })}
          disabled={exportMutation.isPending}
        >
          <Download className="mr-1 h-3 w-3" /> Exportar
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={() => { setEditingId(null); setShowForm(true); }}>
          <Plus className="mr-1 h-3 w-3" /> Novo Credor
        </Button>
      </div>

      {/* Mass actions bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 text-sm">
          <span className="font-medium">{selectedCount} selecionado(s)</span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Tags className="mr-1 h-3 w-3" /> Atribuir Subclasse
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-red-600 hover:text-red-700"
            onClick={() => {
              const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
              const selectedRows = items.filter((_, i) => ids.includes(String(i)));
              if (confirm(`Excluir ${selectedCount} credores?`)) {
                selectedRows.forEach((r) => deleteMutation.mutate({ id: r.id }));
                setRowSelection({});
              }
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Excluir
          </Button>
        </div>
      )}

      {/* Table */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum credor encontrado. Clique em &quot;Novo Credor&quot; ou &quot;Importar&quot; para começar.
                </td>
              </tr>
            ) : (
              <>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                      onClick={() => { setEditingId(row.original.id); setShowForm(true); }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-xs font-semibold">
                  Total: {items.length} credores
                </td>
                <td className="px-3 py-2 text-xs font-semibold">
                  {formatCentavos(items.reduce((s, c) => s + BigInt(c.valor_original), BigInt(0)))}
                </td>
                <td className="px-3 py-2 text-xs font-semibold">
                  {formatCentavos(items.reduce((s, c) => s + BigInt(c.valor_atualizado), BigInt(0)))}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Creditor Form Sheet */}
      <CreditorForm
        open={showForm}
        onOpenChange={setShowForm}
        jrcId={jrcId}
        creditorId={editingId}
      />

      {/* Import Wizard */}
      <ImportWizard
        open={showImport}
        onOpenChange={setShowImport}
        jrcId={jrcId}
      />
    </div>
  );
}
