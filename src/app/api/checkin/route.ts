import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

/**
 * GET /api/checkin?userId=...&date=YYYY-MM-DD
 * Returns today's morning and evening check-ins for the user
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date");

  if (!userId || !date) {
    return NextResponse.json({ error: "userId and date required" }, { status: 400 });
  }

  const auth = requireSelf(request, userId);
  if ("error" in auth) return auth.error;

  try {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const checkins = await db.dailyCheckin.findMany({
      where: { userId, date: dateObj },
      orderBy: { type: "asc" },
    });

    const morning = checkins.find((c) => c.type === "morning") || null;
    const evening = checkins.find((c) => c.type === "evening") || null;

    return NextResponse.json({ success: true, morning, evening });
  } catch (error) {
    console.error("[Checkin GET] Error:", error);
    return NextResponse.json({ error: "Failed to load check-ins" }, { status: 500 });
  }
}

/**
 * POST /api/checkin
 * Save or update a morning or evening check-in
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, type, ...fields } = body;

    if (!userId || !date || !type) {
      return NextResponse.json({ error: "userId, date, type required" }, { status: 400 });
    }

    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    if (type !== "morning" && type !== "evening") {
      return NextResponse.json({ error: "type must be morning or evening" }, { status: 400 });
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const sanitized = sanitizeFields(type, fields);

    // Upsert — create or update check-in for this day+type
    const checkin = await db.dailyCheckin.upsert({
      where: {
        userId_date_type: { userId, date: dateObj, type },
      },
      create: {
        userId,
        date: dateObj,
        type,
        ...(sanitized as object),
      },
      update: sanitized as object,
    });

    return NextResponse.json({ success: true, checkin });
  } catch (error) {
    console.error("[Checkin POST] Error:", error);
    return NextResponse.json({ error: "Failed to save check-in" }, { status: 500 });
  }
}

function sanitizeFields(type: "morning" | "evening", fields: Record<string, unknown>) {
  if (type === "morning") {
    const result: Record<string, unknown> = {};
    if (typeof fields.energy === "number") result.energy = fields.energy;
    if (typeof fields.focusWord === "string") result.focusWord = fields.focusWord;
    if (typeof fields.task1 === "string") result.task1 = fields.task1;
    if (typeof fields.task2 === "string") result.task2 = fields.task2;
    if (typeof fields.task3 === "string") result.task3 = fields.task3;
    if (typeof fields.intention === "string") result.intention = fields.intention;
    return result;
  }
  const result: Record<string, unknown> = {};
  if (typeof fields.dayRating === "number") result.dayRating = fields.dayRating;
  if (typeof fields.task1Done === "boolean") result.task1Done = fields.task1Done;
  if (typeof fields.task2Done === "boolean") result.task2Done = fields.task2Done;
  if (typeof fields.task3Done === "boolean") result.task3Done = fields.task3Done;
  if (typeof fields.win === "string") result.win = fields.win;
  if (typeof fields.reframe === "string") result.reframe = fields.reframe;
  if (typeof fields.eveningNote === "string") result.eveningNote = fields.eveningNote;
  return result;
}
