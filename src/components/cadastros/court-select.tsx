"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Landmark, X } from "lucide-react"
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

// ─── Props ────────────────────────────────────────────────

interface CourtSelectProps {
  value: string | null | undefined
  onChange: (courtId: string | null) => void
  state?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────

export function CourtSelect({
  value,
  onChange,
  state,
  placeholder = "Selecionar vara...",
  disabled,
  className,
}: CourtSelectProps) {
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

  // Search courts via tRPC
  const { data: results, isLoading } = trpc.court.search.useQuery(
    { search: debouncedSearch, state },
    { enabled: debouncedSearch.length > 0 }
  )

  // Fetch the selected court details so we can display its name
  const { data: selectedCourt } = trpc.court.getById.useQuery(
    { id: value! },
    { enabled: !!value }
  )

  const displayText = selectedCourt
    ? `${selectedCourt.name} — ${selectedCourt.comarca}/${selectedCourt.state}`
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
            {value && <Landmark className="size-4 shrink-0 text-muted-foreground" />}
            {value ? displayText : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar vara, comarca, tribunal..."
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
                <CommandEmpty>Nenhuma vara encontrada.</CommandEmpty>
                <CommandGroup>
                  {results?.map((court) => (
                    <CommandItem
                      key={court.id}
                      value={court.id}
                      onSelect={() => {
                        onChange(court.id)
                        setOpen(false)
                        setInputValue("")
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Landmark className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">
                            {court.shortName || court.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {court.comarca}/{court.state}
                            {court.tribunal && ` — ${court.tribunal}`}
                          </p>
                        </div>
                      </div>
                      {value === court.id && (
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
