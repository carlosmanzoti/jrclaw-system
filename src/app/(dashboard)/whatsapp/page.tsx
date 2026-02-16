import { MessageCircle } from "lucide-react"

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground">
          Central de mensagens WhatsApp integrada.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <MessageCircle className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          A integração com WhatsApp será implementada na próxima fase.
        </p>
      </div>
    </div>
  )
}
