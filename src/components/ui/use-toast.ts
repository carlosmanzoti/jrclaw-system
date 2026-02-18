"use client"

import { useState, useCallback } from "react"

interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

// Simple in-memory toast system (no external dependency)
// For production, consider shadcn/ui Toaster + sonner
let listeners: Array<(toast: Toast) => void> = []
let toastCount = 0

function dispatch(toast: Omit<Toast, "id">) {
  const id = String(++toastCount)
  const t = { ...toast, id }
  listeners.forEach((fn) => fn(t))
  // Auto dismiss
  setTimeout(() => {
    dismissListeners.forEach((fn) => fn(id))
  }, 4000)
  return id
}

let dismissListeners: Array<(id: string) => void> = []

export function useToast() {
  const toast = useCallback((props: Omit<Toast, "id">) => {
    dispatch(props)
  }, [])

  return { toast }
}
