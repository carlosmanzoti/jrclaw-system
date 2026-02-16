import { BookOpen } from "lucide-react"

export default function BibliotecaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
        <p className="text-muted-foreground">
          Biblioteca jurídica e base de conhecimento do escritório.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <BookOpen className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          A biblioteca jurídica será implementada na próxima fase.
        </p>
      </div>
    </div>
  )
}
