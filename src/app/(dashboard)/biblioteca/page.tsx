"use client"

import { BibliotecaList } from "@/components/biblioteca/biblioteca-list"

export default function BibliotecaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca Jurídica</h1>
        <p className="text-muted-foreground">
          Base de conhecimento do escritório — jurisprudência, doutrina, legislação e modelos.
        </p>
      </div>
      <BibliotecaList />
    </div>
  )
}
