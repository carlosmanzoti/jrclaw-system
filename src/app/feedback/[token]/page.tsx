"use client";

import { useEffect, useState, useCallback, use } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

type FeedbackType = "NPS" | "CSAT" | "CES" | "FULL_FEEDBACK";

interface FeedbackData {
  id: string;
  clientName: string;
  clientCompany?: string;
  type: FeedbackType;
  triggerMoment?: string;
}

type PageState =
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "error"
  | "already_responded"
  | "expired";

// ─── NPS colour helpers ────────────────────────────────────────────────────

function npsColor(score: number | null): string {
  if (score === null) return "bg-gray-200";
  if (score <= 6) return "bg-red-500";
  if (score <= 8) return "bg-yellow-400";
  return "bg-green-500";
}

function npsLabel(score: number | null): string {
  if (score === null) return "";
  if (score <= 6) return "Detrator — lamentamos a experiência";
  if (score <= 8) return "Neutro — há espaço para melhorar";
  return "Promotor — que ótimo, obrigado!";
}

function npsFollowUp(score: number | null): string {
  if (score === null) return "Gostaria de deixar algum comentário?";
  if (score <= 6) return "O que podemos melhorar?";
  if (score <= 8) return "O que faria dar 9 ou 10?";
  return "O que mais gostou?";
}

// ─── Sub-components ────────────────────────────────────────────────────────

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

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-8 w-8 rounded text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A961] ${
              value !== null && n <= value
                ? "bg-[#C9A961] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            aria-label={`${n}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Ruim</span>
        <span>Excelente</span>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  // NPS
  const [npsScore, setNpsScore] = useState<number | null>(null);
  // CSAT dimensions (1-10)
  const [csatCommunication, setCsatCommunication] = useState<number | null>(null);
  const [csatResult, setCsatResult] = useState<number | null>(null);
  const [csatSpeed, setCsatSpeed] = useState<number | null>(null);
  const [csatCompetence, setCsatCompetence] = useState<number | null>(null);
  const [csatTransparency, setCsatTransparency] = useState<number | null>(null);
  // CES (1-7)
  const [cesScore, setCesScore] = useState<number | null>(null);
  // Comments
  const [positiveComment, setPositiveComment] = useState("");
  const [improvementComment, setImprovementComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  // Fetch feedback form data on mount
  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback/${token}`);
      const data = (await res.json()) as {
        error?: string;
        alreadyResponded?: boolean;
        expired?: boolean;
        id?: string;
        clientName?: string;
        clientCompany?: string;
        type?: FeedbackType;
        triggerMoment?: string;
      };

      if (!res.ok) {
        if (data.alreadyResponded) {
          setPageState("already_responded");
        } else if (data.expired) {
          setPageState("expired");
        } else {
          setErrorMessage(data.error ?? "Erro ao carregar formulário.");
          setPageState("error");
        }
        return;
      }

      setFeedbackData({
        id: data.id!,
        clientName: data.clientName!,
        clientCompany: data.clientCompany,
        type: data.type!,
        triggerMoment: data.triggerMoment,
      });
      setPageState("ready");
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackData) return;

    const type = feedbackData.type;

    // Basic validation
    if ((type === "NPS" || type === "FULL_FEEDBACK") && npsScore === null) {
      alert("Por favor, selecione uma nota NPS.");
      return;
    }

    setPageState("submitting");

    const payload: Record<string, unknown> = {};

    if (type === "NPS" || type === "FULL_FEEDBACK") {
      payload.npsScore = npsScore;
    }
    if (type === "CSAT" || type === "FULL_FEEDBACK") {
      payload.csatCommunication = csatCommunication;
      payload.csatResult = csatResult;
      payload.csatSpeed = csatSpeed;
      payload.csatCompetence = csatCompetence;
      payload.csatTransparency = csatTransparency;
    }
    if (type === "CES" || type === "FULL_FEEDBACK") {
      payload.cesScore = cesScore;
    }

    payload.positiveComment = positiveComment || undefined;
    payload.improvementComment = improvementComment || undefined;
    if (wouldRecommend !== null) payload.wouldRecommend = wouldRecommend;

    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPageState("success");
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMessage(data.error ?? "Erro ao enviar resposta.");
        setPageState("error");
      }
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
      setPageState("error");
    }
  }

  // ─── Render states ───────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A961] border-t-transparent" />
        </div>
      </Shell>
    );
  }

  if (pageState === "already_responded") {
    return (
      <Shell>
        <StatusCard
          emoji="✅"
          title="Resposta já registrada"
          message="Você já preencheu este formulário. Agradecemos pelo seu feedback!"
          color="green"
        />
      </Shell>
    );
  }

  if (pageState === "expired") {
    return (
      <Shell>
        <StatusCard
          emoji="⏰"
          title="Link expirado"
          message="Este link de feedback não está mais disponível. Por favor, entre em contato com o escritório caso precise de suporte."
          color="yellow"
        />
      </Shell>
    );
  }

  if (pageState === "error") {
    return (
      <Shell>
        <StatusCard
          emoji="⚠️"
          title="Algo deu errado"
          message={errorMessage}
          color="red"
        />
      </Shell>
    );
  }

  if (pageState === "success") {
    return (
      <Shell>
        <div className="text-center py-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-3">
            Muito obrigado!
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-2">
            Sua avaliação foi registrada com sucesso. Ela é fundamental para
            continuarmos melhorando nossos serviços.
          </p>
          <p className="text-sm text-gray-400">
            Equipe JRCLaw — Gestão Jurídica
          </p>
        </div>
      </Shell>
    );
  }

  if (!feedbackData) return null;

  const { type, clientName, clientCompany, triggerMoment } = feedbackData;
  const isSubmitting = pageState === "submitting";

  const showNps = type === "NPS" || type === "FULL_FEEDBACK";
  const showCsat = type === "CSAT" || type === "FULL_FEEDBACK";
  const showCes = type === "CES" || type === "FULL_FEEDBACK";

  return (
    <Shell>
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">
          Olá, {clientName}
          {clientCompany ? ` — ${clientCompany}` : ""}!
        </h2>
        {triggerMoment && (
          <p className="text-sm text-gray-500 italic">
            Sobre: {triggerMoment}
          </p>
        )}
        <p className="mt-2 text-gray-600">
          Sua opinião é muito importante para nós. Por favor, reserve um momento
          para preencher este formulário.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ─── NPS ─────────────────────────────────────── */}
        {showNps && (
          <section>
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-1">
              NPS — Recomendação
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Em uma escala de 0 a 10, qual a probabilidade de você recomendar o
              JRCLaw a um amigo ou colega?
            </p>

            {/* Slider */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>0 — Não recomendaria</span>
                <span>10 — Recomendaria muito</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={npsScore ?? 5}
                onChange={(e) => setNpsScore(Number(e.target.value))}
                className="w-full accent-[#C9A961] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <span key={i}>{i}</span>
                ))}
              </div>
            </div>

            {/* Score badge */}
            <div className="flex items-center gap-3 mt-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-white text-xl font-bold ${npsColor(npsScore)}`}
              >
                {npsScore ?? "—"}
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {npsLabel(npsScore)}
              </p>
            </div>

            {/* NPS follow-up text */}
            {npsScore !== null && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {npsFollowUp(npsScore)}
                </label>
                <textarea
                  rows={3}
                  value={improvementComment}
                  onChange={(e) => setImprovementComment(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
                  placeholder="Escreva sua resposta aqui..."
                />
              </div>
            )}
          </section>
        )}

        {/* ─── CSAT ─────────────────────────────────────── */}
        {showCsat && (
          <section>
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-1">
              CSAT — Satisfação por dimensão
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Avalie cada dimensão de 1 (ruim) a 10 (excelente).
            </p>
            <div className="space-y-5">
              <StarRating
                label="Comunicação"
                value={csatCommunication}
                onChange={setCsatCommunication}
              />
              <StarRating
                label="Resultado"
                value={csatResult}
                onChange={setCsatResult}
              />
              <StarRating
                label="Agilidade"
                value={csatSpeed}
                onChange={setCsatSpeed}
              />
              <StarRating
                label="Competência"
                value={csatCompetence}
                onChange={setCsatCompetence}
              />
              <StarRating
                label="Transparência"
                value={csatTransparency}
                onChange={setCsatTransparency}
              />
            </div>
          </section>
        )}

        {/* ─── CES ─────────────────────────────────────── */}
        {showCes && (
          <section>
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-1">
              CES — Esforço do cliente
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              O quanto foi fácil resolver sua demanda com o JRCLaw?
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCesScore(n)}
                  className={`h-12 w-12 rounded-lg text-base font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A961] ${
                    cesScore === n
                      ? "bg-[#C9A961] text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-label={`CES ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2 max-w-xs">
              <span>1 — Muito difícil</span>
              <span>7 — Muito fácil</span>
            </div>
          </section>
        )}

        {/* ─── Open text comments ────────────────────────── */}
        <section>
          <h3 className="text-base font-semibold text-[#1A1A2E] mb-4">
            Comentários
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                O que mais gostou?
              </label>
              <textarea
                rows={3}
                value={positiveComment}
                onChange={(e) => setPositiveComment(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
                placeholder="Pontos positivos, destaques da equipe..."
              />
            </div>
            {!showNps && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  O que podemos melhorar?
                </label>
                <textarea
                  rows={3}
                  value={improvementComment}
                  onChange={(e) => setImprovementComment(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-[#C9A961] focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
                  placeholder="Sugestões, pontos de atenção..."
                />
              </div>
            )}
          </div>
        </section>

        {/* ─── Would recommend ───────────────────────────── */}
        {!showNps && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Você recomendaria o JRCLaw a outras pessoas?
            </h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A961] ${
                  wouldRecommend === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A961] ${
                  wouldRecommend === false
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Não
              </button>
            </div>
          </section>
        )}

        {/* ─── Submit ────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[#C9A961] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:ring-offset-2 disabled:opacity-60"
        >
          {isSubmitting ? "Enviando..." : "Enviar avaliação"}
        </button>
      </form>
    </Shell>
  );
}

// ─── Shell layout ──────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="hidden text-xs text-gray-400 sm:block">
            Formulário de avaliação
          </span>
        </div>
      </header>

      {/* Card */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          JRCLaw — Gestão Jurídica Empresarial
          <br />
          Maringá/PR e Balsas/MA
        </p>
      </main>
    </div>
  );
}

// ─── Status card ───────────────────────────────────────────────────────────

function StatusCard({
  emoji,
  title,
  message,
  color,
}: {
  emoji: string;
  title: string;
  message: string;
  color: "green" | "yellow" | "red";
}) {
  const bgMap = {
    green: "bg-green-100",
    yellow: "bg-yellow-100",
    red: "bg-red-100",
  };

  return (
    <div className="text-center py-8">
      <div
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${bgMap[color]}`}
      >
        <span className="text-3xl">{emoji}</span>
      </div>
      <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">{title}</h2>
      <p className="text-gray-600 max-w-sm mx-auto">{message}</p>
    </div>
  );
}
