import { ImportWizard } from "@/components/importar/import-wizard"
import Link from "next/link"
import { History, FileStack } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ImportarPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Importação Inteligente</h1>
          <p className="text-sm text-muted-foreground">
            Importe dados de sistemas externos com mapeamento automático por IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/importar/templates">
              <FileStack className="mr-2 h-4 w-4" />
              Templates
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/importar/historico">
              <History className="mr-2 h-4 w-4" />
              Histórico
            </Link>
          </Button>
        </div>
      </div>

      <ImportWizard />
    </div>
  )
}
