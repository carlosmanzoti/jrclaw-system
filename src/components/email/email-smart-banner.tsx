"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Clock, Calendar, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { OutlookMessage } from "@/lib/microsoft-graph"
import { EmailDataExtractor } from "@/lib/email-parser"
import { EmailActivityModal } from "./email-activity-modal"

interface EmailSmartBannerProps {
  message: OutlookMessage
}

export function EmailSmartBanner({ message }: EmailSmartBannerProps) {
  const [show, setShow] = useState(false)
  const [bannerText, setBannerText] = useState("")
  const [bannerType, setBannerType] = useState<"prazo" | "reuniao" | "info">("info")
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    try {
      const extractor = new EmailDataExtractor(
        message.subject,
        message.body?.content || message.bodyPreview || ""
      )

      const deadline = extractor.extractDeadlineInfo()
      const meeting = extractor.extractMeetingInfo()
      const processos = extractor.extractProcessNumbers()

      if (deadline) {
        setShow(true)
        setBannerType("prazo")
        const tipoLabel = deadline.tipo_prazo === "FATAL" ? "fatal" : "ordinário"
        setBannerText(
          `Prazo ${tipoLabel} detectado: ${deadline.dias} dias (${deadline.contagem === "DIAS_UTEIS" ? "úteis" : "corridos"})`
        )
      } else if (meeting) {
        setShow(true)
        setBannerType("reuniao")
        setBannerText(
          meeting.link
            ? "Reunião virtual detectada neste e-mail"
            : "Evento/reunião detectado neste e-mail"
        )
      } else if (processos.length > 0) {
        setShow(true)
        setBannerType("info")
        setBannerText(`Processo detectado: ${processos[0].numero}`)
      } else {
        setShow(false)
      }
    } catch {
      setShow(false)
    }
  }, [message.id, message.subject, message.body, message.bodyPreview])

  if (!show) return null

  const bannerConfig = {
    prazo: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: <AlertTriangle className="size-3.5 text-red-600" />,
      badgeClass: "bg-red-100 text-red-700",
    },
    reuniao: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-800",
      icon: <Calendar className="size-3.5 text-blue-600" />,
      badgeClass: "bg-blue-100 text-blue-700",
    },
    info: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      icon: <Sparkles className="size-3.5 text-amber-600" />,
      badgeClass: "bg-amber-100 text-amber-700",
    },
  }

  const config = bannerConfig[bannerType]

  return (
    <>
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-md text-xs ${config.bg}`}>
        {config.icon}
        <span className={`flex-1 ${config.text}`}>{bannerText}</span>
        <Badge variant="outline" className={`text-[10px] ${config.badgeClass}`}>
          {bannerType === "prazo" ? (
            <><Clock className="size-2.5 mr-0.5" /> Prazo</>
          ) : bannerType === "reuniao" ? (
            <><Calendar className="size-2.5 mr-0.5" /> Evento</>
          ) : (
            <><Sparkles className="size-2.5 mr-0.5" /> Detectado</>
          )}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => setModalOpen(true)}
        >
          Criar atividade
        </Button>
      </div>

      <EmailActivityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        message={message}
      />
    </>
  )
}
