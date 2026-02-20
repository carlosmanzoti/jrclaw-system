import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Cron job: runs daily at 7:00 AM (Vercel Cron).
 * - Marks all overdue PENDENTE deadlines as PERDIDO.
 * - Returns count of affected records.
 *
 * Protected by CRON_SECRET header.
 * Can also be tested manually: GET /api/cron/prazos?secret=YOUR_SECRET
 */
export async function GET(request: NextRequest) {
  // Validate secret
  const secret = request.headers.get("x-cron-secret") ||
    request.nextUrl.searchParams.get("secret");

  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Mark overdue legacy deadlines as PERDIDO
  const legacyResult = await db.deadline.updateMany({
    where: {
      status: "PENDENTE",
      data_limite: { lt: now },
    },
    data: {
      status: "PERDIDO",
    },
  });

  // Mark overdue DeadlineNew records as VENCIDO
  const ACTIVE_STATUSES = ["FUTURO", "CORRENDO", "PROXIMO", "URGENTE", "HOJE"];
  const newResult = await db.deadlineNew.updateMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      data_fim_prazo: { lt: now },
    },
    data: {
      status: "VENCIDO",
    },
  });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    overdue_marked_legacy: legacyResult.count,
    overdue_marked_new: newResult.count,
  });
}
