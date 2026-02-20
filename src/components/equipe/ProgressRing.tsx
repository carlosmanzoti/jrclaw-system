"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  progress: number      // 0 to 1
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  className?: string
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = "#C9A84C",
  label,
  className,
}: ProgressRingProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clampedProgress)
  const percentage = Math.round(clampedProgress * 100)
  const center = size / 2

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${percentage}%`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none text-[#374151]"
          style={{ fontSize: size * 0.2 }}
        >
          {percentage}%
        </span>
        {label && (
          <span
            className="text-gray-500 leading-none mt-0.5 text-center px-1"
            style={{ fontSize: size * 0.12 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
