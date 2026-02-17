import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DIRECT_URL: !!process.env.DIRECT_URL,
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  try {
    const result = await db.$queryRaw`SELECT 1 as ok`;
    checks.database = { connected: true, result };

    const userCount = await db.user.count();
    checks.users = { count: userCount };

    if (userCount > 0) {
      const admin = await db.user.findFirst({
        where: { email: "admin@jrclaw.com.br" },
        select: { id: true, email: true, name: true, active: true, role: true },
      });
      checks.adminUser = admin ?? "not found";
    }
  } catch (error) {
    checks.database = {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(checks);
}
