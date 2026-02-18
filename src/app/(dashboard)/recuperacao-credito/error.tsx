"use client";

export default function RecuperacaoCreditoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white border rounded-xl p-8 max-w-lg text-center shadow-sm">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2">
          Erro no Módulo Recuperação de Crédito
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || "Ocorreu um erro ao carregar esta pagina."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#C9A961] text-[#2A2A2A] rounded-lg font-semibold text-sm hover:bg-[#B8984F] transition-colors"
          >
            Tentar Novamente
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm border hover:bg-gray-50 transition-colors"
          >
            Voltar ao Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
