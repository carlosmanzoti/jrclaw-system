import { Mail } from "lucide-react"

export default function EmailPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">E-mail</h1>
          <p className="text-[#666666]">
            Cliente de e-mail integrado com Microsoft Outlook.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Mail className="size-12 text-[#666666]/50" />
          <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
          <p className="mt-2 text-sm text-[#666666] text-center">
            O cliente de e-mail será implementado na próxima fase.
          </p>
        </div>
      </div>
    </div>
  )
}
