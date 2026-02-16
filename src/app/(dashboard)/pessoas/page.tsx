import { UserRound } from "lucide-react"

export default function PessoasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
        <p className="text-muted-foreground">
          Cadastro universal de pessoas: partes, juízes, peritos e outros.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <UserRound className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          O cadastro de pessoas será implementado na próxima fase.
        </p>
      </div>
    </div>
  )
}
