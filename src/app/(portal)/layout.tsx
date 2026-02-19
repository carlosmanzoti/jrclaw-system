import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Portal do Cliente — JRC Law",
  description: "Portal de acompanhamento para clientes",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
