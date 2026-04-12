import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStartOfDay, getStartOfNextDay } from "@/lib/date-utils";
import { requireSelf } from "@/lib/server-auth";

function normalizeIncrement(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

/**
 * Log habit completion
 * POST /api/habits/log
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { habitId, userId, completed = true, count = 1, note } = body;

    if (!habitId || !userId) {
      return NextResponse.json({ error: "Habit ID and User ID required" }, { status: 400 });
    }

    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    const habit = await db.habit.findUnique({
      where: { id: habitId },
      select: { userId: true, target: true },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    if (habit.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = getStartOfDay(new Date());
    const tomorrow = getStartOfNextDay(today);
    const targetCount = habit.target || 1;
    const increment = normalizeIncrement(count);

    const existingLog = await db.habitLog.findFirst({
      where: {
        habitId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    let log;
    if (existingLog) {
      const nextCount = completed ? existingLog.count + increment : 0;
      const isCompleted = nextCount >= targetCount;

      log = await db.habitLog.update({
        where: { id: existingLog.id },
        data: {
          completed: isCompleted,
          count: nextCount,
          note,
        },
      });
    } else {
      const initialCount = completed ? increment : 0;
      const isCompleted = initialCount >= targetCount;

      log = await db.habitLog.create({
        data: {
          habitId,
          userId,
          completed: isCompleted,
          count: initialCount,
          note,
          date: today,
        },
      });
    }

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        habitId: log.habitId,
        completed: log.completed,
        count: log.count,
        isCompleted: log.completed,
      },
    });
  } catch (error) {
    console.error("Log habit error:", error);
    return NextResponse.json({ error: "Failed to log habit" }, { status: 500 });
  }
}
