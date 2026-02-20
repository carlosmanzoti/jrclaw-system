import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function generateTrackingCode(): Promise<string> {
  const year = new Date().getFullYear();
  // Count existing complaints this year to get next sequence
  const count = await db.complaint.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `DEN-${year}-${seq}`;
}

const VALID_CATEGORIES = [
  "ASSEDIO_MORAL",
  "ASSEDIO_SEXUAL",
  "DISCRIMINACAO",
  "DESVIO_ETICO",
  "CONFLITO_INTERESSES",
  "IRREGULARIDADE_FINANCEIRA",
  "CONDICOES_TRABALHO",
  "RELACAO_INTERPESSOAL",
  "SUGESTAO_MELHORIA",
  "ELOGIO",
  "OUTRO_COMPLAINT",
] as const;

type ComplaintCategory = (typeof VALID_CATEGORIES)[number];

// Limited public-facing status label map
const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Recebido",
  UNDER_ANALYSIS: "Em análise",
  INVESTIGATING: "Em investigação",
  ACTION_TAKEN: "Providências tomadas",
  RESOLVED_COMPLAINT: "Resolvido",
  DISMISSED: "Arquivado",
  ARCHIVED_COMPLAINT: "Arquivado",
};

// ─── POST: create anonymous complaint ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      isAnonymous = true,
      category,
      title,
      description,
      involvedPersonDescription,
    } = body as {
      isAnonymous?: boolean;
      category?: string;
      title?: string;
      description?: string;
      involvedPersonDescription?: string;
    };

    if (!category || !VALID_CATEGORIES.includes(category as ComplaintCategory)) {
      return NextResponse.json(
        { error: "Categoria inválida." },
        { status: 400 }
      );
    }

    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Título é obrigatório (mínimo 3 caracteres)." },
        { status: 400 }
      );
    }

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Descrição é obrigatória (mínimo 10 caracteres)." },
        { status: 400 }
      );
    }

    const trackingCode = await generateTrackingCode();

    const complaint = await db.complaint.create({
      data: {
        isAnonymous: Boolean(isAnonymous),
        category: category as ComplaintCategory,
        title: title.trim(),
        description: description.trim(),
        involvedPersonDescription: involvedPersonDescription?.trim() ?? null,
        status: "RECEIVED",
        channel: "EXTERNAL_LINK",
        trackingCode,
        timeline: [
          {
            date: new Date().toISOString(),
            action: "Denúncia recebida via canal público.",
          },
        ],
      },
      select: {
        id: true,
        trackingCode: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        trackingCode: complaint.trackingCode,
        message: "Denúncia registrada com sucesso.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ouvidoria/POST]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

// ─── GET: get complaint status by trackingCode ────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Código de acompanhamento é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const complaint = await db.complaint.findUnique({
      where: { trackingCode: code },
      select: {
        trackingCode: true,
        category: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        timeline: true,
        // explicitly excluded: submitterId, assigneeId, resolution details, evidence
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "Denúncia não encontrada. Verifique o código informado." },
        { status: 404 }
      );
    }

    // Parse timeline JSON safely
    let timelineEvents: { date: string; action: string }[] = [];
    if (Array.isArray(complaint.timeline)) {
      timelineEvents = (
        complaint.timeline as { date: string; action: string }[]
      ).map((e) => ({
        date: e.date,
        action: e.action,
      }));
    }

    return NextResponse.json({
      trackingCode: complaint.trackingCode,
      category: complaint.category,
      title: complaint.title,
      status: complaint.status,
      statusLabel: STATUS_LABEL[complaint.status] ?? complaint.status,
      receivedAt: complaint.createdAt,
      lastUpdatedAt: complaint.updatedAt,
      timeline: timelineEvents,
    });
  } catch (error) {
    console.error("[ouvidoria/GET]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
