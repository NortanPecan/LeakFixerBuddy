import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCronSecret } from "@/lib/cron-auth";

/**
 * GET/POST /api/cron/cleanup-thoughts
 * Deletes expired fleeting thoughts.
 * Protected by CRON_SECRET (Authorization: Bearer).
 * Runs daily at 03:00 UTC via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  const cronAuthError = requireCronSecret(request);
  if (cronAuthError) return cronAuthError;

  try {
    const result = await db.fleetingThought.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    console.log(`[Cleanup Thoughts] Deleted ${result.count} expired thoughts`);
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("[Cleanup Thoughts]", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
