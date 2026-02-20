"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Gavel, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// ─── Judge title labels ───────────────────────────────────

const JUDGE_TITLE_LABELS: Record<string, string> = {
  JUIZ: "Juiz",
  JUIZ_FEDERAL: "Juiz Fed.",
  JUIZ_TRABALHO: "Juiz Trab.",
  JUIZ_SUBSTITUTO: "Subst.",
  DESEMBARGADOR_TJ: "Des.",
  DESEMBARGADOR_FEDERAL: "Des. Fed.",
  MINISTRO_STJ: "Min. STJ",
  MINISTRO_TST: "Min. TST",
  MINISTRO_STF: "Min. STF",
}

// ─── Props ────────────────────────────────────────────────

interface JudgeSelectProps {
  value: string | null | undefined
  onChange: (judgeId: string | null) => void
  courtId?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────

export function JudgeSelect({
  value,
  onChange,
  courtId,
  placeholder = "Selecionar juiz...",
  disabled,
  className,
}: JudgeSelectProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce the search input (300ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(inputValue)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [inputValue])

  // Search judges via tRPC
  const { data: results, isLoading } = trpc.court.judges.search.useQuery(
    { search: debouncedSearch, courtId },
    { enabled: debouncedSearch.length > 0 }
  )

  // Fetch the selected judge details so we can display name + title
  const { data: selectedJudge } = trpc.court.judges.getById.useQuery(
    { id: value! },
    { enabled: !!value }
  )

  const displayText = selectedJudge
    ? `${JUDGE_TITLE_LABELS[selectedJudge.title] || selectedJudge.title} ${selectedJudge.name}`
    : value
      ? "Carregando..."
      : ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value && <Gavel className="size-4 shrink-0 text-muted-foreground" />}
            {value ? displayText : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar juiz por nome..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading && debouncedSearch.length > 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum juiz encontrado.</CommandEmpty>
                <CommandGroup>
                  {results?.map((judge) => (
                    <CommandItem
                      key={judge.id}
                      value={judge.id}
                      onSelect={() => {
                        onChange(judge.id)
                        setOpen(false)
                        setInputValue("")
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Gavel className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">
                            {JUDGE_TITLE_LABELS[judge.title] || judge.title}{" "}
                            {judge.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {judge.court
                              ? judge.court.shortName || judge.court.name
                              : "Sem vara vinculada"}
                          </p>
                        </div>
                      </div>
                      {value === judge.id && (
                        <Check className="ml-2 size-4 shrink-0" style={{ color: "#C9A961" }} />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Clear selection option */}
            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onChange(null)
                      setOpen(false)
                      setInputValue("")
                    }}
                  >
                    <X className="mr-2 size-4 text-muted-foreground" />
                    Limpar seleção
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
