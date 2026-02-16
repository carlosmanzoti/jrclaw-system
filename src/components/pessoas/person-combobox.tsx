"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus, UserRound, Building2 } from "lucide-react"
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
import { PERSON_TYPE_LABELS } from "@/lib/constants"
import { PersonQuickCreate } from "./person-quick-create"

interface PersonComboboxProps {
  value?: string
  onSelect: (personId: string, personName: string) => void
  tipo?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PersonCombobox({
  value,
  onSelect,
  tipo,
  placeholder = "Selecionar pessoa...",
  disabled,
  className,
}: PersonComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  const { data: results } = trpc.persons.search.useQuery(
    { query: search || "a", tipo: tipo as "CLIENTE" | undefined, limit: 10 },
    { enabled: search.length > 0 || open }
  )

  // Fetch selected person name
  const { data: selectedPerson } = trpc.persons.getById.useQuery(
    { id: value! },
    { enabled: !!value }
  )

  const displayName = selectedPerson?.nome || (value ? "Carregando..." : "")

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          >
            <span className="truncate">{value ? displayName : placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nome, CPF/CNPJ..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
              <CommandGroup>
                {results?.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.id}
                    onSelect={() => {
                      onSelect(person.id, person.nome)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {person.subtipo === "PESSOA_JURIDICA" ? (
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <UserRound className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm truncate">{person.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {PERSON_TYPE_LABELS[person.tipo]}
                          {person.cpf_cnpj && ` - ${person.cpf_cnpj}`}
                          {person.cidade && ` - ${person.cidade}/${person.estado}`}
                        </p>
                      </div>
                    </div>
                    {value === person.id && <Check className="ml-2 size-4 shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setQuickCreateOpen(true)
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Cadastrar nova pessoa
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <PersonQuickCreate
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultTipo={tipo}
        onCreated={(id, nome) => {
          onSelect(id, nome)
          setQuickCreateOpen(false)
        }}
      />
    </>
  )
}
