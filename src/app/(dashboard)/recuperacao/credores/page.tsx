"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, Plus, Upload, Download, FileText, Pencil, Trash2, Handshake, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Mock data for demonstration (will be replaced with real data)
const MOCK_CREDORES: any[] = []

const CLASSES_LABELS: Record<string, string> = {
  I_TRABALHISTA: "I - Trabalhista",
  II_GARANTIA_REAL: "II - Garantia Real",
  III_QUIROGRAFARIO: "III - Quirografário",
  IV_ME_EPP: "IV - ME/EPP",
}

export default function CredoresPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCredor, setSelectedCredor] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setSelectedCredor(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    alert("Em desenvolvimento")
    setDeleteDialogOpen(false)
    setSelectedCredor(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/recuperacao">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-heading">Credores</h1>
              <p className="text-[#666666]">
                Quadro geral de credores da recuperação judicial.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
              <Upload className="size-4 mr-2" />
              Importar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
              <Download className="size-4 mr-2" />
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
              <FileText className="size-4 mr-2" />
              Exportar Relatório PDF
            </Button>
            <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
              <Plus className="size-4 mr-2" />
              Novo Credor
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total de Credores</CardDescription>
              <CardTitle className="text-2xl">{MOCK_CREDORES.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Classe I - Trabalhista</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Classe III - Quirografário</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Valor Total</CardDescription>
              <CardTitle className="text-2xl">R$ 0,00</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Creditors Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quadro de Credores</CardTitle>
            <CardDescription>Lista completa de credores com valores e classificação</CardDescription>
          </CardHeader>
          <CardContent>
            {MOCK_CREDORES.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <Users className="size-12 text-[#666666]/50" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum credor cadastrado</h3>
                <p className="mt-2 text-sm text-[#666666] text-center">
                  Cadastre credores manualmente ou importe uma planilha Excel.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
                    <Upload className="size-4 mr-2" />
                    Importar Excel
                  </Button>
                  <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
                    <Plus className="size-4 mr-2" />
                    Novo Credor
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative overflow-auto max-h-[500px] rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#F7F3F1] z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Credor</th>
                      <th className="text-left p-3 font-medium">CPF/CNPJ</th>
                      <th className="text-left p-3 font-medium">Classe</th>
                      <th className="text-right p-3 font-medium">Valor Original</th>
                      <th className="text-right p-3 font-medium">Valor Atualizado</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_CREDORES.map((credor: any) => (
                      <tr key={credor.id} className="border-b hover:bg-[#F7F3F1]/50">
                        <td className="p-3 font-medium">{credor.nome}</td>
                        <td className="p-3 text-[#666666]">{credor.cpf_cnpj}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {CLASSES_LABELS[credor.classe] || credor.classe}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{credor.valor_original}</td>
                        <td className="p-3 text-right font-medium">{credor.valor_atualizado}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs">{credor.status}</Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => alert("Em desenvolvimento")}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(credor.id)}>
                              <Trash2 className="size-3 text-[#DC3545]" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => alert("Em desenvolvimento")}>
                              <Handshake className="size-3 mr-1" />
                              Negociar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Credor</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
