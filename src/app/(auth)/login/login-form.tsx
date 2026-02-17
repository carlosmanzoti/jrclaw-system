"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-strong p-8">
      <div className="text-center mb-6">
        <h2 className="text-lg font-medium text-[#2A2A2A]">
          Entrar no sistema
        </h2>
        <p className="text-sm text-[#666666] mt-1">
          Informe suas credenciais para acessar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#2A2A2A]"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-10 rounded-md border border-[#CCCCCC] bg-[#F2F2F2] px-3 text-sm text-[#2A2A2A] placeholder:text-[#999999] outline-none transition-colors focus:border-[#C9A961] focus:shadow-[0_0_0_3px_rgba(201,169,97,0.15)]"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#2A2A2A]"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full h-10 rounded-md border border-[#CCCCCC] bg-[#F2F2F2] px-3 text-sm text-[#2A2A2A] placeholder:text-[#999999] outline-none transition-colors focus:border-[#C9A961] focus:shadow-[0_0_0_3px_rgba(201,169,97,0.15)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-[#C9A961] text-[#2A2A2A] text-sm font-medium shadow-subtle hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
    </div>
  );
}
