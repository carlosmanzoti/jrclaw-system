import { Users } from "lucide-react"

export default function CredoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credores</h1>
        <p className="text-muted-foreground">
          Quadro geral de credores da recuperação judicial.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Users className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          O quadro de credores será implementado na próxima fase.
        </p>
      </div>
    </div>
  )
}
