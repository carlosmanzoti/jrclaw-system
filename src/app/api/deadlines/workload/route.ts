import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL_CONFIGS } from "@/lib/ai";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { WORKLOAD_ANALYSIS_PROMPT, buildWorkloadContext } from "@/lib/deadline-ai-prompts";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { teamData } = body;

    if (!teamData || !Array.isArray(teamData)) {
      return NextResponse.json({ error: "teamData array é obrigatório" }, { status: 400 });
    }

    const context = buildWorkloadContext(teamData);

    const config = MODEL_CONFIGS.standard;
    const { text } = await generateText({
      model: anthropic(config.model),
      system: WORKLOAD_ANALYSIS_PROMPT,
      prompt: context,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta da IA inválida" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[AI Workload Analysis]", error);
    return NextResponse.json(
      { error: "Erro ao analisar carga de trabalho" },
      { status: 500 }
    );
  }
}
