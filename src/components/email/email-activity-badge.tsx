"use client"

import { ListTodo } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface EmailActivityBadgeProps {
  count: number
}

export function EmailActivityBadge({ count }: EmailActivityBadgeProps) {
  if (count === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center size-4 rounded-full bg-emerald-100 text-emerald-700">
            <ListTodo className="size-2.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {count} atividade{count > 1 ? "s" : ""} vinculada{count > 1 ? "s" : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
