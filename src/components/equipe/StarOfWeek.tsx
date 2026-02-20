"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface StarOfWeekProps {
  name: string
  avatarUrl?: string
  message: string
  fromName: string
  className?: string
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

export function StarOfWeek({ name, avatarUrl, message, fromName, className }: StarOfWeekProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-md",
        "border-2 border-[#C9A84C]",
        className
      )}
    >
      {/* Subtle gold background gradient */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top center, #C9A84C 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <CardContent className="relative pt-5 pb-5 px-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Star
            className="h-5 w-5 fill-[#C9A84C] text-[#C9A84C] animate-pulse"
            aria-hidden="true"
          />
          <span className="text-sm font-bold text-[#C9A84C] uppercase tracking-widest">
            Estrela da Semana
          </span>
          <Star
            className="h-5 w-5 fill-[#C9A84C] text-[#C9A84C] animate-pulse"
            aria-hidden="true"
          />
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center gap-3 mb-4">
          <div className="relative">
            <div
              className="absolute -inset-1.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, #C9A84C, #C9A961, #C9A84C)",
              }}
              aria-hidden="true"
            />
            <Avatar
              size="lg"
              className="relative ring-2 ring-white"
              style={{ width: 72, height: 72 }}
            >
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback
                className="text-xl font-bold"
                style={{ backgroundColor: "#C9A84C22", color: "#C9A84C" }}
              >
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="text-lg font-bold text-[#374151]">{name}</p>
          </div>
        </div>

        {/* Recognition message */}
        <blockquote className="border-l-[3px] border-[#C9A84C] pl-3 mb-3">
          <p className="text-sm text-gray-700 italic leading-relaxed">"{message}"</p>
        </blockquote>

        {/* From */}
        <p className="text-xs text-gray-400 text-right">
          — <span className="font-medium text-gray-500">{fromName}</span>
        </p>
      </CardContent>
    </Card>
  )
}
