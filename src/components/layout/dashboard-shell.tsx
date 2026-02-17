"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="!min-h-0 h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0">
        <AppHeader />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
