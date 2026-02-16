import { Mail } from "lucide-react"

export default function EmailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">E-mail</h1>
        <p className="text-muted-foreground">
          Cliente de e-mail integrado com Microsoft Outlook.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Mail className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          O cliente de e-mail será implementado na próxima fase.
        </p>
      </div>
    </div>
  )
}
