import { MessageCircle } from "lucide-react"

export default function WhatsAppPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">WhatsApp</h1>
          <p className="text-[#666666]">
            Central de mensagens WhatsApp integrada.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <MessageCircle className="size-12 text-[#666666]/50" />
          <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
          <p className="mt-2 text-sm text-[#666666] text-center">
            A integração com WhatsApp será implementada na próxima fase.
          </p>
        </div>
      </div>
    </div>
  )
}
