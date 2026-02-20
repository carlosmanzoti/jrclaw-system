"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Category labels ────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "ASSEDIO_MORAL", label: "Assédio moral" },
  { value: "ASSEDIO_SEXUAL", label: "Assédio sexual" },
  { value: "DISCRIMINACAO", label: "Discriminação" },
  { value: "DESVIO_ETICO", label: "Desvio ético" },
  { value: "CONFLITO_INTERESSES", label: "Conflito de interesses" },
  { value: "IRREGULARIDADE_FINANCEIRA", label: "Irregularidade financeira" },
  { value: "CONDICOES_TRABALHO", label: "Condições de trabalho" },
  { value: "RELACAO_INTERPESSOAL", label: "Relação interpessoal" },
  { value: "SUGESTAO_MELHORIA", label: "Sugestão de melhoria" },
  { value: "ELOGIO", label: "Elogio" },
  { value: "OUTRO_COMPLAINT", label: "Outro" },
] as const;

type PageState = "form" | "submitting" | "success" | "error";

// ─── Main page ─────────────────────────────────────────────────────────────

export default function OuvidoriaPage() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  // Form fields
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [involvedPersons, setInvolvedPersons] = useState("");
  // evidence upload is UI-only in this iteration
  const [evidenceFileName, setEvidenceFileName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!category) {
      alert("Por favor, selecione uma categoria.");
      return;
    }
    if (title.trim().length < 3) {
      alert("O título deve ter ao menos 3 caracteres.");
      return;
    }
    if (description.trim().length < 10) {
      alert("A descrição deve ter ao menos 10 caracteres.");
      return;
    }

    setPageState("submitting");

    try {
      const res = await fetch("/api/ouvidoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAnonymous,
          category,
          title: title.trim(),
          description: description.trim(),
          involvedPersonDescription: involvedPersons.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        trackingCode?: string;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setErrorMessage(data.error ?? "Erro ao registrar denúncia.");
        setPageState("error");
        return;
      }

      setTrackingCode(data.trackingCode ?? "");
      setPageState("success");
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
      setPageState("error");
    }
  }

  // ─── Success screen ────────────────────────────────────────────────────

  if (pageState === "success") {
    return (
      <Shell>
        <div className="text-center py-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-3">
            Denúncia registrada!
          </h2>
          <p className="text-gray-600 mb-6">
            Sua denúncia foi recebida com sucesso e será analisada com total
            confidencialidade.
          </p>

          {trackingCode && (
            <div className="mx-auto mb-6 max-w-sm rounded-xl border-2 border-[#C9A961] bg-[#fdf8ef] p-5">
              <p className="text-xs text-gray-500 mb-1">
                Seu código de acompanhamento:
              </p>
              <p className="text-2xl font-bold tracking-widest text-[#1A1A2E]">
                {trackingCode}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Guarde este código. Você poderá acompanhar o status da sua
                denúncia a qualquer momento.
              </p>
            </div>
          )}

          <Link
            href="/ouvidoria/acompanhar"
            className="inline-block rounded-lg bg-[#C9A961] px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Acompanhar minha denúncia
          </Link>
        </div>
      </Shell>
    );
  }

  if (pageState === "error") {
    return (
      <Shell>
        <div className="text-center py-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
            Algo deu errado
          </h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => setPageState("form")}
            className="rounded-lg border border-[#C9A961] px-5 py-2 text-sm font-medium text-[#C9A961] hover:bg-[#fdf8ef]"
          >
            Tentar novamente
          </button>
        </div>
      </Shell>
    );
  }

  const isSubmitting = pageState === "submitting";

  // ─── Form ──────────────────────────────────────────────────────────────

  return (
    <Shell>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
          Canal de Denúncia e Ouvidoria
        </h2>
        <p className="text-gray-600 text-sm">
          Este canal é destinado ao registro confidencial de denúncias, sugestões
          e elogios. Todas as informações são tratadas com sigilo e
          responsabilidade.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anonymous toggle */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Enviar anonimamente
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sua identidade não será vinculada à denúncia.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:ring-offset-2 ${
                isAnonymous ? "bg-[#C9A961]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {!isAnonymous && (
            <p className="mt-2 text-xs text-amber-600">
              Ao desativar o anonimato, sua identidade poderá ser verificada
              internamente para fins de apuração.
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961] bg-white"
          >
            <option value="">Selecione uma categoria...</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder="Resumo em poucas palavras"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Descrição <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Descreva o ocorrido com o máximo de detalhes possível (quando, onde, o que aconteceu)..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
          />
          <p className="text-xs text-gray-400 mt-1">
            {description.length} caracteres
          </p>
        </div>

        {/* Involved persons */}
        <div>
          <label
            htmlFor="involved"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Pessoas envolvidas{" "}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="involved"
            type="text"
            value={involvedPersons}
            onChange={(e) => setInvolvedPersons(e.target.value)}
            placeholder="Ex.: cargo ou nome das pessoas envolvidas"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
          />
        </div>

        {/* Evidence upload (UI placeholder) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Evidências{" "}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <label
            htmlFor="evidence-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-[#C9A961] hover:bg-[#fdf8ef] transition-colors"
          >
            <span className="text-2xl mb-2">📎</span>
            <span className="text-sm font-medium text-gray-600">
              {evidenceFileName
                ? evidenceFileName
                : "Clique para selecionar arquivo"}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              PDF, imagem ou documento (máx. 10 MB)
            </span>
            <input
              id="evidence-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setEvidenceFileName(file.name);
              }}
            />
          </label>
          <p className="text-xs text-amber-600 mt-1">
            O envio de arquivos estará disponível em breve. Por ora, descreva as
            evidências no campo de descrição.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
          <strong>Confidencialidade:</strong> Esta denúncia será tratada com
          total sigilo. Apenas o comitê de ouvidoria terá acesso ao conteúdo. O
          anonimato é garantido para denúncias anônimas.
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[#C9A961] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:ring-offset-2 disabled:opacity-60"
        >
          {isSubmitting ? "Registrando..." : "Registrar denúncia"}
        </button>

        {/* Track existing */}
        <p className="text-center text-sm text-gray-500">
          Já registrou uma denúncia?{" "}
          <Link
            href="/ouvidoria/acompanhar"
            className="font-medium text-[#C9A961] hover:underline"
          >
            Acompanhar por código
          </Link>
        </p>
      </form>
    </Shell>
  );
}

// ─── Shell layout ───────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="hidden text-xs text-gray-400 sm:block">
            Canal de Ouvidoria
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          JRCLaw — Gestão Jurídica Empresarial
          <br />
          Canal de ouvidoria e conformidade
        </p>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A1A2E]">
        <span className="text-sm font-bold text-[#C9A961]">JRC</span>
      </div>
      <div className="leading-tight">
        <span className="text-lg font-bold text-[#C9A961]">JRC</span>
        <span className="text-lg font-semibold text-[#1A1A2E]">Law</span>
        <p className="text-xs text-gray-500">Gestão Jurídica</p>
      </div>
    </div>
  );
}
