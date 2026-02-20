import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// ─── GET: fetch ClientFeedback by accessToken ──────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const feedback = await db.clientFeedback.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        clientName: true,
        clientCompany: true,
        type: true,
        triggerMoment: true,
        status: true,
        expiresAt: true,
        // do NOT expose scores or tokens to the public GET
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Formulário não encontrado." },
        { status: 404 }
      );
    }

    if (feedback.status === "RESPONDED" || feedback.status === "FOLLOWED_UP") {
      return NextResponse.json(
        { error: "Este formulário já foi respondido.", alreadyResponded: true },
        { status: 409 }
      );
    }

    if (feedback.status === "EXPIRED_CF" || new Date() > feedback.expiresAt) {
      // If not already marked expired, update it
      if (feedback.status !== "EXPIRED_CF") {
        await db.clientFeedback.update({
          where: { accessToken: token },
          data: { status: "EXPIRED_CF" },
        });
      }
      return NextResponse.json(
        { error: "Este link expirou.", expired: true },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: feedback.id,
      clientName: feedback.clientName,
      clientCompany: feedback.clientCompany,
      type: feedback.type,
      triggerMoment: feedback.triggerMoment,
    });
  } catch (error) {
    console.error("[feedback/GET]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

// ─── POST: submit feedback response ────────────────────────────────────────

function calcNpsCategory(score: number): "PROMOTER" | "PASSIVE" | "DETRACTOR" {
  if (score >= 9) return "PROMOTER";
  if (score >= 7) return "PASSIVE";
  return "DETRACTOR";
}

function calcCsatOverall(scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter((s): s is number => typeof s === "number");
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await req.json();

    const feedback = await db.clientFeedback.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        type: true,
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Formulário não encontrado." },
        { status: 404 }
      );
    }

    if (feedback.status === "RESPONDED" || feedback.status === "FOLLOWED_UP") {
      return NextResponse.json(
        { error: "Este formulário já foi respondido.", alreadyResponded: true },
        { status: 409 }
      );
    }

    if (feedback.status === "EXPIRED_CF" || new Date() > feedback.expiresAt) {
      return NextResponse.json(
        { error: "Este link expirou.", expired: true },
        { status: 410 }
      );
    }

    const {
      npsScore,
      csatCommunication,
      csatResult,
      csatSpeed,
      csatCompetence,
      csatTransparency,
      cesScore,
      positiveComment,
      improvementComment,
      wouldRecommend,
    } = body as {
      npsScore?: number;
      csatCommunication?: number;
      csatResult?: number;
      csatSpeed?: number;
      csatCompetence?: number;
      csatTransparency?: number;
      cesScore?: number;
      positiveComment?: string;
      improvementComment?: string;
      wouldRecommend?: boolean;
    };

    const npsCategory =
      typeof npsScore === "number" ? calcNpsCategory(npsScore) : undefined;

    const csatOverall = calcCsatOverall([
      csatCommunication,
      csatResult,
      csatSpeed,
      csatCompetence,
      csatTransparency,
    ]);

    const updated = await db.clientFeedback.update({
      where: { id: feedback.id },
      data: {
        npsScore: typeof npsScore === "number" ? npsScore : undefined,
        npsCategory,
        csatCommunication:
          typeof csatCommunication === "number" ? csatCommunication : undefined,
        csatResult: typeof csatResult === "number" ? csatResult : undefined,
        csatSpeed: typeof csatSpeed === "number" ? csatSpeed : undefined,
        csatCompetence:
          typeof csatCompetence === "number" ? csatCompetence : undefined,
        csatTransparency:
          typeof csatTransparency === "number" ? csatTransparency : undefined,
        csatOverall: csatOverall ?? undefined,
        cesScore: typeof cesScore === "number" ? cesScore : undefined,
        positiveComment: positiveComment ?? undefined,
        improvementComment: improvementComment ?? undefined,
        wouldRecommend: typeof wouldRecommend === "boolean" ? wouldRecommend : undefined,
        status: "RESPONDED",
        respondedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("[feedback/POST]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
