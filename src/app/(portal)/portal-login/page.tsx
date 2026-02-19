"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Scale } from "lucide-react"

export default function PortalLoginPage() {
  const router = useRouter()
  const [cpfCnpj, setCpfCnpj] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpfCnpj, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao fazer login")
        return
      }

      if (data.requiresPasswordChange) {
        router.push("/portal-trocar-senha")
      } else {
        router.push("/portal-meus-processos")
      }
    } catch {
      setError("Erro de conexao. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Scale className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">JRC Law — Advocacia Empresarial</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-medium text-muted-foreground">CPF ou CNPJ</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              placeholder="000.000.000-00"
              value={cpfCnpj}
              onChange={e => setCpfCnpj(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              placeholder="Digite sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-600">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Acesso exclusivo para clientes do escritorio.
        </p>
      </div>
    </div>
  )
}
