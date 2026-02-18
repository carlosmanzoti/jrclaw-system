import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL_CONFIGS } from "@/lib/ai";
import { generateText } from "ai";
import { DEADLINE_AUDIT_PROMPT, buildAuditContext } from "@/lib/deadline-ai-prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, result, auditTrail } = body;

    if (!input || !result) {
      return NextResponse.json({ error: "input e result são obrigatórios" }, { status: 400 });
    }

    const context = buildAuditContext({ input, result, auditTrail: auditTrail || [] });

    // Use premium model for critical audits
    const config = MODEL_CONFIGS.premium;
    const { text } = await generateText({
      model: anthropic(config.model),
      system: DEADLINE_AUDIT_PROMPT,
      prompt: context,
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0.1, // Very low temperature for precise audit
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta da IA inválida" }, { status: 500 });
    }

    const auditResult = JSON.parse(jsonMatch[0]);
    return NextResponse.json(auditResult);
  } catch (error) {
    console.error("[AI Deadline Audit]", error);
    return NextResponse.json(
      { error: "Erro ao auditar cálculo de prazo" },
      { status: 500 }
    );
  }
}
