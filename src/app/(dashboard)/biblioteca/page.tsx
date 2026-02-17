"use client"

import { useState, useMemo, useCallback } from "react"
import { BibliotecaList } from "@/components/biblioteca/biblioteca-list"
import { BibliotecaSidebar } from "@/components/biblioteca/biblioteca-sidebar"
import { BibliotecaForm } from "@/components/biblioteca/biblioteca-form"
import { BibliotecaClipper } from "@/components/biblioteca/biblioteca-clipper"
import { BibliotecaClippers } from "@/components/biblioteca/biblioteca-clippers"
import { BibliotecaBulkUpload } from "@/components/biblioteca/biblioteca-bulk-upload"
import { BibliotecaSearchModal } from "@/components/biblioteca/biblioteca-search-modal"
import { trpc } from "@/lib/trpc"

export default function BibliotecaPage() {
  const [sidebarTipo, setSidebarTipo] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showClipper, setShowClipper] = useState(false)
  const [showClippers, setShowClippers] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [editEntry, setEditEntry] = useState<any>(null)

  // Fetch type counts for sidebar
  const { data: allEntries } = trpc.biblioteca.list.useQuery({ limit: 999 })

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (allEntries?.items) {
      for (const item of allEntries.items) {
        counts[item.tipo] = (counts[item.tipo] || 0) + 1
      }
    }
    return counts
  }, [allEntries?.items])

  const handleSidebarAction = useCallback((action: string) => {
    switch (action) {
      case "nova":
        setEditEntry(null)
        setShowForm(true)
        break
      case "clipper":
        setShowClippers(true)
        break
      case "bulk":
        setShowBulkUpload(true)
        break
      case "search":
        setShowSearch(true)
        break
      case "favoritos":
        // Let the list component handle this via sidebar type filter
        setSidebarTipo("__favoritos__")
        break
    }
  }, [])

  return (
    <div className="h-full flex min-h-0">
      {/* Sidebar */}
      <BibliotecaSidebar
        selectedTipo={sidebarTipo}
        onTipoChange={setSidebarTipo}
        counts={typeCounts}
        onAction={handleSidebarAction}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Biblioteca Jurídica</h1>
            <p className="text-[#666666] text-sm">
              Base de conhecimento do escritório — jurisprudência, doutrina, legislação e modelos.
            </p>
          </div>
          <BibliotecaList sidebarTipoFilter={sidebarTipo} />
        </div>
      </div>

      {/* Modals */}
      <BibliotecaForm
        open={showForm}
        onOpenChange={setShowForm}
        entryId={editEntry?.id}
      />
      <BibliotecaClipper
        open={showClipper}
        onOpenChange={setShowClipper}
      />
      <BibliotecaClippers
        open={showClippers}
        onOpenChange={setShowClippers}
      />
      <BibliotecaBulkUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
      />
      <BibliotecaSearchModal
        open={showSearch}
        onOpenChange={setShowSearch}
      />
    </div>
  )
}
