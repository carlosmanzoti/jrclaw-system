import { Sparkles } from "lucide-react"

export default function ConfeccaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Confecção (IA)</h1>
        <p className="text-muted-foreground">
          Geração de peças processuais, pareceres e e-mails com inteligência artificial.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Sparkles className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          O módulo de confecção com IA será implementado na próxima fase.
        </p>
      </div>
    </div>
  )
}
