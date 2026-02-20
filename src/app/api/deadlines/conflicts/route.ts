import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL_CONFIGS } from "@/lib/ai";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { DEADLINE_CONFLICT_PROMPT, buildConflictContext } from "@/lib/deadline-ai-prompts";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { deadlines } = body;

    if (!deadlines || !Array.isArray(deadlines)) {
      return NextResponse.json({ error: "deadlines array é obrigatório" }, { status: 400 });
    }

    const context = buildConflictContext(deadlines);

    const config = MODEL_CONFIGS.standard;
    const { text } = await generateText({
      model: anthropic(config.model),
      system: DEADLINE_CONFLICT_PROMPT,
      prompt: context,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta da IA inválida" }, { status: 500 });
    }

    const conflicts = JSON.parse(jsonMatch[0]);
    return NextResponse.json(conflicts);
  } catch (error) {
    console.error("[AI Deadline Conflicts]", error);
    return NextResponse.json(
      { error: "Erro ao detectar conflitos de prazos" },
      { status: 500 }
    );
  }
}
