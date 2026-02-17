"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
  Scale,
  FileText,
} from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  JURISPRUDENCIA: "Jurisprudência",
  SUMULA: "Súmula",
  DOUTRINA: "Doutrina",
  ARTIGO: "Artigo",
  LEGISLACAO: "Legislação",
  MODELO_PECA: "Modelo de Peça",
  PARECER_INTERNO: "Parecer Interno",
  PESQUISA: "Pesquisa",
  TESE: "Tese",
  NOTA_TECNICA: "Nota Técnica",
  LIVRO: "Livro",
  ENUNCIADO: "Enunciado",
  CONTRATO_MODELO: "Contrato Modelo",
  ESTRATEGIA: "Estratégia",
  CASO_REFERENCIA: "Caso Referência",
  MATERIAL_ESTUDO: "Material de Estudo",
  TABELA_REFERENCIA: "Tabela Referência",
  OUTRO: "Outro",
}

const TYPE_COLORS: Record<string, string> = {
  JURISPRUDENCIA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  SUMULA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  DOUTRINA: "bg-[#C9A961]/10 text-[#C9A961]",
  ARTIGO: "bg-[#6F42C1]/10 text-[#6F42C1]",
  LEGISLACAO: "bg-[#28A745]/10 text-[#28A745]",
  MODELO_PECA: "bg-[#FD7E14]/10 text-[#FD7E14]",
  PARECER_INTERNO: "bg-[#C9A961]/10 text-[#C9A961]",
  PESQUISA: "bg-[#6F42C1]/10 text-[#6F42C1]",
  TESE: "bg-[#6F42C1]/10 text-[#6F42C1]",
  NOTA_TECNICA: "bg-[#FD7E14]/10 text-[#FD7E14]",
  LIVRO: "bg-[#C9A961]/10 text-[#C9A961]",
  ENUNCIADO: "bg-[#17A2B8]/10 text-[#17A2B8]",
  CONTRATO_MODELO: "bg-[#FD7E14]/10 text-[#FD7E14]",
  ESTRATEGIA: "bg-[#DC3545]/10 text-[#DC3545]",
  CASO_REFERENCIA: "bg-[#DC3545]/10 text-[#DC3545]",
  MATERIAL_ESTUDO: "bg-[#6F42C1]/10 text-[#6F42C1]",
  TABELA_REFERENCIA: "bg-gray-100 text-gray-600",
  OUTRO: "bg-gray-50 text-gray-600",
}

export interface BibliotecaRefEntry {
  id: string
  titulo: string
  tipo: string
  area?: string | null
  resumo?: string | null
  relevancia?: number | null
  favorito?: boolean
}

interface BibliotecaReferencesProps {
  entries: BibliotecaRefEntry[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSearchMore?: () => void
  onClear?: () => void
  compact?: boolean
}

export function BibliotecaReferences({
  entries,
  selectedIds,
  onToggle,
  onSearchMore,
  onClear,
  compact = false,
}: BibliotecaReferencesProps) {
  const [expanded, setExpanded] = useState(!compact)
  const selectedCount = entries.filter((e) => selectedIds.has(e.id)).length

  if (entries.length === 0) return null

  return (
    <div className="border rounded-lg bg-[#F7F3F1] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F7F3F1]/80 transition-colors"
      >
        <Scale className="size-4 text-[#17A2B8]" />
        <span className="text-xs font-medium flex-1 text-left">
          Harvey Specter consultou a Biblioteca — {entries.length} referência(s)
        </span>
        <Badge variant="outline" className="text-[10px]">
          {selectedCount}/{entries.length} selecionada(s)
        </Badge>
        {expanded ? (
          <ChevronUp className="size-3.5 text-[#666666]" />
        ) : (
          <ChevronDown className="size-3.5 text-[#666666]" />
        )}
      </button>

      {/* Entries list */}
      {expanded && (
        <div className="border-t">
          <div className="max-h-[240px] overflow-y-auto">
            {entries.map((entry) => (
              <label
                key={entry.id}
                className="flex items-start gap-2 px-3 py-2 hover:bg-white/50 cursor-pointer border-b last:border-b-0"
              >
                <Checkbox
                  checked={selectedIds.has(entry.id)}
                  onCheckedChange={() => onToggle(entry.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] px-1 py-0 ${TYPE_COLORS[entry.tipo] || TYPE_COLORS.OUTRO}`}>
                      {TYPE_LABELS[entry.tipo] || entry.tipo}
                    </Badge>
                    <span className="text-xs font-medium truncate">{entry.titulo}</span>
                  </div>
                  {entry.resumo && (
                    <p className="text-[10px] text-[#666666] line-clamp-1 mt-0.5">
                      {entry.resumo}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-2.5 ${
                        i < (entry.relevancia || 0)
                          ? "fill-[#C9A961] text-[#C9A961]"
                          : "text-[#666666]/20"
                      }`}
                    />
                  ))}
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-3 py-2 border-t bg-white/50">
            {onSearchMore && (
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onSearchMore}>
                <Search className="size-3 mr-1" />
                Buscar mais
              </Button>
            )}
            {onClear && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onClear}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Compact inline reference list for chat messages */
interface ChatReferencesProps {
  entries: { id: string; titulo: string; tipo: string }[]
}

export function ChatBibliotecaReferences({ entries }: ChatReferencesProps) {
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) return null

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-[#17A2B8] hover:text-[#17A2B8]/80"
      >
        <BookOpen className="size-3" />
        <span>Referências consultadas ({entries.length})</span>
        {expanded ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-4">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-1">
              <Badge className={`text-[8px] px-1 py-0 ${TYPE_COLORS[entry.tipo] || ""}`}>
                {TYPE_LABELS[entry.tipo] || entry.tipo}
              </Badge>
              <span className="text-[10px] text-[#666666] truncate">{entry.titulo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
