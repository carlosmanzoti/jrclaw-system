"use client"

import { useState } from "react"
import { ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { OutlookMessage } from "@/lib/microsoft-graph"
import { EmailActivityModal } from "./email-activity-modal"

interface EmailActivityButtonProps {
  message: OutlookMessage
  isMock?: boolean
}

export function EmailActivityButton({ message, isMock }: EmailActivityButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setOpen(true)}
              disabled={isMock}
            >
              <ListTodo className="size-3" /> Atividade
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Criar atividade, prazo ou evento a partir deste e-mail</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <EmailActivityModal
        open={open}
        onOpenChange={setOpen}
        message={message}
      />
    </>
  )
}
