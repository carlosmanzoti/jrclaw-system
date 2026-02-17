"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  Scale,
  FileText,
  ScrollText,
  Briefcase,
  Search,
  GraduationCap,
  Target,
  Award,
  Table,
  Handshake,
  Plus,
  Scissors,
  Upload,
  Search as SearchIcon,
  Star,
  Library,
} from "lucide-react"

interface BibliotecaSidebarProps {
  selectedTipo: string
  onTipoChange: (tipo: string) => void
  counts: Record<string, number>
  onAction: (action: string) => void
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  JURISPRUDENCIA: { label: "Jurisprudência", icon: Scale, color: "text-[#17A2B8]" },
  SUMULA: { label: "Súmula", icon: BookOpen, color: "text-[#17A2B8]" },
  DOUTRINA: { label: "Doutrina", icon: BookOpen, color: "text-[#C9A961]" },
  ARTIGO: { label: "Artigo", icon: FileText, color: "text-[#6F42C1]" },
  LEGISLACAO: { label: "Legislação", icon: ScrollText, color: "text-[#28A745]" },
  MODELO_PECA: { label: "Modelo de Peça", icon: FileText, color: "text-[#FD7E14]" },
  PARECER_INTERNO: { label: "Parecer Interno", icon: Briefcase, color: "text-[#C9A961]" },
  PESQUISA: { label: "Pesquisa", icon: Search, color: "text-[#6F42C1]" },
  TESE: { label: "Tese", icon: GraduationCap, color: "text-[#6F42C1]" },
  NOTA_TECNICA: { label: "Nota Técnica", icon: FileText, color: "text-[#FD7E14]" },
  LIVRO: { label: "Livro", icon: BookOpen, color: "text-[#C9A961]" },
  ENUNCIADO: { label: "Enunciado", icon: BookOpen, color: "text-[#17A2B8]" },
  CONTRATO_MODELO: { label: "Contrato Modelo", icon: Handshake, color: "text-[#FD7E14]" },
  ESTRATEGIA: { label: "Estratégia", icon: Target, color: "text-[#DC3545]" },
  CASO_REFERENCIA: { label: "Caso Referência", icon: Award, color: "text-[#DC3545]" },
  MATERIAL_ESTUDO: { label: "Material de Estudo", icon: GraduationCap, color: "text-[#6F42C1]" },
  TABELA_REFERENCIA: { label: "Tabela Referência", icon: Table, color: "text-gray-600" },
  OUTRO: { label: "Outro", icon: FileText, color: "text-gray-600" },
}

export function BibliotecaSidebar({
  selectedTipo,
  onTipoChange,
  counts,
  onAction,
}: BibliotecaSidebarProps) {
  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0)

  return (
    <div className="w-[220px] h-full flex flex-col bg-[#F7F3F1] border-r">
      {/* Navigation header */}
      <div className="p-3 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className={`w-full justify-start gap-2 ${
            selectedTipo === "" ? "bg-white shadow-sm font-semibold" : ""
          }`}
          onClick={() => onTipoChange("")}
        >
          <Library className="h-4 w-4 text-gray-600" />
          <span className="flex-1 text-left">Todos</span>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center">
              {totalCount}
            </Badge>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onAction("favoritos")}
        >
          <Star className="h-4 w-4 text-[#C9A961]" />
          <span className="flex-1 text-left">Favoritos</span>
        </Button>
      </div>

      <Separator />

      {/* Type list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-0.5">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            const count = counts[key] || 0
            const isSelected = selectedTipo === key

            return (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className={`w-full justify-start gap-2 h-8 text-xs ${
                  isSelected ? "bg-white shadow-sm font-semibold" : ""
                }`}
                onClick={() => onTipoChange(key)}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
                <span className="flex-1 text-left truncate">{config.label}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 h-4 min-w-[16px] justify-center"
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
      </ScrollArea>

      {/* Actions section */}
      <Separator />
      <div className="p-3 space-y-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
          Ações
        </p>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => onAction("nova")}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Entrada
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => onAction("clipper")}
        >
          <Scissors className="h-3.5 w-3.5" />
          Clipper
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => onAction("bulk")}
        >
          <Upload className="h-3.5 w-3.5" />
          Importar Múltiplos
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => onAction("search")}
        >
          <SearchIcon className="h-3.5 w-3.5" />
          Busca Avançada
        </Button>
      </div>
    </div>
  )
}
