import { ImportTemplatesList } from "@/components/importar/import-templates-list"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ImportTemplatesPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/importar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Templates de importação</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie templates salvos para reutilizar mapeamentos
          </p>
        </div>
      </div>

      <ImportTemplatesList />
    </div>
  )
}
