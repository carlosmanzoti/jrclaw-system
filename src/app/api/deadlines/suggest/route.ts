import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL_CONFIGS } from "@/lib/ai";
import { generateText } from "ai";
import { DEADLINE_SUGGESTION_PROMPT, buildDeadlineSuggestionContext } from "@/lib/deadline-ai-prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { movimentoTexto, tipoProcesso, jurisdicao, uf, parteContraria, processoEletronico } = body;

    if (!movimentoTexto) {
      return NextResponse.json({ error: "movimentoTexto é obrigatório" }, { status: 400 });
    }

    const context = buildDeadlineSuggestionContext({
      movimentoTexto,
      tipoProcesso,
      jurisdicao,
      uf,
      parteContraria,
      processoEletronico,
    });

    const config = MODEL_CONFIGS.standard;
    const { text } = await generateText({
      model: anthropic(config.model),
      system: DEADLINE_SUGGESTION_PROMPT,
      prompt: context,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta da IA inválida" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Deadline Suggest]", error);
    return NextResponse.json(
      { error: "Erro ao processar sugestão de prazos" },
      { status: 500 }
    );
  }
}
