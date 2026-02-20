"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Building2, X } from "lucide-react"
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

interface AdministratorSelectProps {
  value: string | null | undefined
  onChange: (adminId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────

export function AdministratorSelect({
  value,
  onChange,
  placeholder = "Selecionar administrador judicial...",
  disabled,
  className,
}: AdministratorSelectProps) {
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

  // Search administrators via tRPC
  const { data: results, isLoading } = trpc.judicialAdmin.search.useQuery(
    { search: debouncedSearch },
    { enabled: debouncedSearch.length > 0 }
  )

  // Fetch the selected administrator details so we can display its name
  const { data: selectedAdmin } = trpc.judicialAdmin.getById.useQuery(
    { id: value! },
    { enabled: !!value }
  )

  const displayText = selectedAdmin
    ? selectedAdmin.tradeName
      ? `${selectedAdmin.companyName} (${selectedAdmin.tradeName})`
      : selectedAdmin.companyName
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
            {value && <Building2 className="size-4 shrink-0 text-muted-foreground" />}
            {value ? displayText : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por razão social, CNPJ, cidade..."
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
                <CommandEmpty>Nenhum administrador judicial encontrado.</CommandEmpty>
                <CommandGroup>
                  {results?.map((admin) => (
                    <CommandItem
                      key={admin.id}
                      value={admin.id}
                      onSelect={() => {
                        onChange(admin.id)
                        setOpen(false)
                        setInputValue("")
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{admin.companyName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {admin.cnpj && `${admin.cnpj}`}
                            {admin.cnpj && (admin.city || admin.state) && " — "}
                            {admin.city && admin.state
                              ? `${admin.city}/${admin.state}`
                              : admin.city || admin.state || ""}
                            {!admin.cnpj && !admin.city && !admin.state && admin.tradeName
                              ? admin.tradeName
                              : ""}
                          </p>
                        </div>
                      </div>
                      {value === admin.id && (
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
