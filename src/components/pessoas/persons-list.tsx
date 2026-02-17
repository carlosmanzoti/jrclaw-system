"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  UserRound,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Filter,
  X,
  Download,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  PERSON_TYPE_LABELS,
  PERSON_SUBTYPE_LABELS,
  PERSON_SEGMENT_LABELS,
} from "@/lib/constants"

interface PersonsListProps {
  defaultTipo?: string
  title?: string
}

const TYPE_COLORS: Record<string, string> = {
  CLIENTE: "bg-[#17A2B8]/10 text-[#17A2B8]",
  PARTE_CONTRARIA: "bg-[#DC3545]/10 text-[#DC3545]",
  JUIZ: "bg-[#C9A961]/10 text-[#C9A961]",
  DESEMBARGADOR: "bg-[#C9A961]/10 text-[#C9A961]",
  PERITO: "bg-[#C9A961]/10 text-[#C9A961]",
  ADMINISTRADOR_JUDICIAL: "bg-[#28A745]/10 text-[#28A745]",
  CREDOR: "bg-orange-100 text-orange-700",
  TESTEMUNHA: "bg-gray-100 text-gray-700",
  OUTRO: "bg-gray-100 text-gray-700",
}

export function PersonsList({ defaultTipo, title }: PersonsListProps = {}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState<string>(defaultTipo || "")
  const [subtipoFilter, setSubtipoFilter] = useState<string>("")
  const [segmentoFilter, setSegmentoFilter] = useState<string>("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const utils = trpc.useUtils()

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => setDebouncedSearch(value), 300)
    setSearchTimeout(timeout)
  }

  const { data, isLoading } = trpc.persons.list.useQuery({
    search: debouncedSearch || undefined,
    tipo: (tipoFilter as "CLIENTE") || undefined,
    subtipo: (subtipoFilter as "PESSOA_FISICA") || undefined,
    segmento: (segmentoFilter as "AGRO") || undefined,
    limit: 50,
  })

  const deleteMutation = trpc.persons.delete.useMutation({
    onSuccess: () => {
      utils.persons.list.invalidate()
      setDeleteId(null)
    },
  })

  const persons = data?.items ?? []
  const total = data?.total ?? 0

  const hasActiveFilters = tipoFilter || subtipoFilter || segmentoFilter

  const clearFilters = () => {
    setTipoFilter("")
    setSubtipoFilter("")
    setSegmentoFilter("")
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title || "Pessoas"}</h1>
          <p className="text-[#666666]">
            {total} {total === 1 ? "pessoa cadastrada" : "pessoas cadastradas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => alert("Em desenvolvimento")}>
            <Download className="mr-2 size-4" />
            Exportar
          </Button>
          <Button asChild>
            <Link href="/pessoas/novo">
              <Plus className="mr-2 size-4" />
              Nova Pessoa
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#666666]" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ, e-mail, cidade..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 size-4" />
            Filtros
            {hasActiveFilters && (
              <Badge className="ml-2 size-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                !
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSON_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subtipoFilter} onValueChange={setSubtipoFilter}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Subtipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSON_SUBTYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSON_SEGMENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 size-3" />
                Limpar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden md:table-cell">CPF/CNPJ</TableHead>
              <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
              <TableHead className="hidden lg:table-cell">Contato</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-5 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : persons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-[#666666]">
                  {debouncedSearch || hasActiveFilters
                    ? "Nenhuma pessoa encontrada com esses filtros."
                    : "Nenhuma pessoa cadastrada ainda."}
                </TableCell>
              </TableRow>
            ) : (
              persons.map((person) => (
                <TableRow
                  key={person.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/pessoas/${person.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        {person.subtipo === "PESSOA_JURIDICA" ? (
                          <Building2 className="size-4 text-[#666666]" />
                        ) : (
                          <UserRound className="size-4 text-[#666666]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{person.nome}</p>
                        {person.razao_social && person.razao_social !== person.nome && (
                          <p className="text-xs text-[#666666] truncate">
                            {person.razao_social}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={TYPE_COLORS[person.tipo] || ""}
                    >
                      {PERSON_TYPE_LABELS[person.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm">
                    {person.cpf_cnpj || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {person.cidade && person.estado
                      ? `${person.cidade}/${person.estado}`
                      : person.cidade || person.estado || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {person.celular || person.email || "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/pessoas/${person.id}`)}>
                          <Eye className="mr-2 size-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/pessoas/${person.id}?edit=true`)}
                        >
                          <Pencil className="mr-2 size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(person.id)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
          {deleteMutation.error && (
            <p className="text-sm text-destructive">
              {deleteMutation.error.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
