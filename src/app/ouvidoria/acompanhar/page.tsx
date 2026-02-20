"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: string;
  action: string;
}

interface ComplaintStatus {
  trackingCode: string;
  category: string;
  title: string;
  status: string;
  statusLabel: string;
  receivedAt: string;
  lastUpdatedAt: string;
  timeline: TimelineEvent[];
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; dot: string; icon: string }
> = {
  RECEIVED: {
    color: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-400",
    icon: "📥",
  },
  UNDER_ANALYSIS: {
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    dot: "bg-yellow-400",
    icon: "🔍",
  },
  INVESTIGATING: {
    color: "text-orange-700",
    bg: "bg-orange-50",
    dot: "bg-orange-400",
    icon: "🕵️",
  },
  ACTION_TAKEN: {
    color: "text-purple-700",
    bg: "bg-purple-50",
    dot: "bg-purple-400",
    icon: "⚡",
  },
  RESOLVED_COMPLAINT: {
    color: "text-green-700",
    bg: "bg-green-50",
    dot: "bg-green-500",
    icon: "✅",
  },
  DISMISSED: {
    color: "text-gray-700",
    bg: "bg-gray-50",
    dot: "bg-gray-400",
    icon: "📂",
  },
  ARCHIVED_COMPLAINT: {
    color: "text-gray-700",
    bg: "bg-gray-50",
    dot: "bg-gray-400",
    icon: "📂",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      color: "text-gray-700",
      bg: "bg-gray-50",
      dot: "bg-gray-400",
      icon: "📋",
    }
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Supplementary info ───────────────────────────────────────────────────

function SupplementaryForm({ trackingCode }: { trackingCode: string }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  // In this iteration, just UI — could POST to an endpoint in the future
  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 5) return;
    // Future: POST /api/ouvidoria/supplement with { trackingCode, text }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        Informação adicional enviada. Nossa equipe irá considerar no processo de
        apuração.
      </div>
    );
  }

  return (
    <form onSubmit={handleSend} className="space-y-3">
      <p className="text-sm text-gray-600">
        Deseja acrescentar informações adicionais à sua denúncia?
      </p>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Informe detalhes adicionais, novas evidências ou correções..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
      />
      <button
        type="submit"
        disabled={text.trim().length < 5}
        className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Enviar informação adicional
      </button>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AcompanharPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complaint, setComplaint] = useState<ComplaintStatus | null>(null);
  const [showSupplementary, setShowSupplementary] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setComplaint(null);
    setShowSupplementary(false);

    try {
      const res = await fetch(`/api/ouvidoria?code=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as ComplaintStatus & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Denúncia não encontrada.");
        setLoading(false);
        return;
      }

      setComplaint(data);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  const cfg = complaint ? getStatusConfig(complaint.status) : null;

  return (
    <Shell>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
          Acompanhar Denúncia
        </h2>
        <p className="text-sm text-gray-600">
          Insira o código de acompanhamento recebido ao registrar sua denúncia.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex.: DEN-2026-0001"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
          maxLength={20}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-lg bg-[#C9A961] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "..." : "Buscar"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Result */}
      {complaint && cfg && (
        <div className="space-y-6">
          {/* Status badge */}
          <div className={`rounded-lg border p-4 ${cfg.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{cfg.icon}</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">
                  Código: <span className="font-mono font-bold">{complaint.trackingCode}</span>
                </p>
                <p className={`text-base font-bold ${cfg.color}`}>
                  {complaint.statusLabel}
                </p>
                <p className="text-sm text-gray-700 mt-1 font-medium">
                  {complaint.title}
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Recebida em</p>
              <p className="font-medium text-gray-700">
                {formatDate(complaint.receivedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Última atualização</p>
              <p className="font-medium text-gray-700">
                {formatDate(complaint.lastUpdatedAt)}
              </p>
            </div>
          </div>

          {/* Timeline */}
          {complaint.timeline.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Histórico de ações
              </h3>
              <ol className="relative border-l border-gray-200 space-y-4 pl-5">
                {complaint.timeline.map((ev, idx) => (
                  <li key={idx} className="relative">
                    <span
                      className={`absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`}
                    />
                    <p className="text-xs text-gray-400 mb-0.5">
                      {formatDate(ev.date)}
                    </p>
                    <p className="text-sm text-gray-700">{ev.action}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Privacy notice */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
            Por questão de confidencialidade, detalhes internos do processo de
            apuração não são exibidos neste canal público.
          </div>

          {/* Supplementary info */}
          <div>
            {!showSupplementary ? (
              <button
                type="button"
                onClick={() => setShowSupplementary(true)}
                className="text-sm font-medium text-[#C9A961] hover:underline"
              >
                + Adicionar informação complementar
              </button>
            ) : (
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Informação complementar
                </h3>
                <SupplementaryForm trackingCode={complaint.trackingCode} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Register new */}
      <div className="mt-10 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Não tem um código?{" "}
          <Link
            href="/ouvidoria"
            className="font-medium text-[#C9A961] hover:underline"
          >
            Registrar nova denúncia
          </Link>
        </p>
      </div>
    </Shell>
  );
}

// ─── Shell layout ────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="hidden text-xs text-gray-400 sm:block">
            Acompanhamento — Ouvidoria
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
