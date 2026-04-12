import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  addDaysToDateKey,
  compareDateKeys,
  formatDateKey,
  getStartOfDay,
  normalizeToDate,
  parseDateKey,
} from "@/lib/date-utils";
import { calculateRitualStreak, parseScheduleDays, type CompletionEntry } from "@/lib/streak-utils";
import { requireAuthenticatedUser, requireSelf } from "@/lib/server-auth";

interface StringArrayContainer {
  readonly attributes?: string | null;
  readonly days?: string | null;
}

function parseStringArray(serialized: string | null | undefined): string[] {
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function resolvePeriodDays(value: string | null): number {
  const parsed = Number.parseInt(value || "30", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
}

// POST - Mark ritual as complete/incomplete for a date
// Body: { ritualId, userId, date?: string, completed: boolean, note?: string, mood?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ritualId, userId, date, completed = true, note, mood } = body;

    if (!ritualId || !userId) {
      return NextResponse.json({ error: "ritualId and userId required" }, { status: 400 });
    }

    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    const ritual = await db.ritual.findUnique({
      where: { id: ritualId },
    });

    if (!ritual) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 });
    }

    if (ritual.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetDate = date ? parseDateKey(date) : normalizeToDate(new Date());

    const completion = await db.ritualCompletion.upsert({
      where: {
        ritualId_date: {
          ritualId,
          date: targetDate,
        },
      },
      update: {
        completed,
        note,
        mood,
      },
      create: {
        ritualId,
        userId,
        date: targetDate,
        completed,
        note,
        mood,
      },
    });

    if (completed && ritual.attributes) {
      const attributes = parseStringArray(ritual.attributes);
      for (const attr of attributes) {
        await db.userAttribute.upsert({
          where: {
            userId_key: {
              userId,
              key: attr,
            },
          },
          update: {
            points: { increment: 10 },
          },
          create: {
            userId,
            key: attr,
            points: 10,
            level: 1,
          },
        });
      }

      const attrRecords = await db.userAttribute.findMany({
        where: { userId },
      });

      for (const attrRecord of attrRecords) {
        const newLevel = Math.floor(attrRecord.points / 100) + 1;
        if (newLevel > attrRecord.level) {
          await db.userAttribute.update({
            where: { id: attrRecord.id },
            data: { level: newLevel },
          });
        }
      }
    }

    if (completed) {
      await checkAchievements(userId, ritual);
      await incrementLinkedChallenges(userId, ritualId, targetDate).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      completion: {
        ...completion,
        date: formatDateKey(completion.date),
      },
    });
  } catch (error) {
    console.error("Complete ritual error:", error);
    return NextResponse.json({ error: "Failed to complete ritual" }, { status: 500 });
  }
}

// GET - Get completions for a ritual
// /api/rituals/complete?ritualId=xxx&days=30
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuthenticatedUser(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const ritualId = searchParams.get("ritualId");
    const days = resolvePeriodDays(searchParams.get("days"));

    if (!ritualId) {
      return NextResponse.json({ error: "ritualId required" }, { status: 400 });
    }

    const referenceDate = getStartOfDay(new Date());
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - (days - 1));

    const completions = await db.ritualCompletion.findMany({
      where: {
        ritualId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    const ritual = await db.ritual.findUnique({
      where: { id: ritualId },
    });

    if (!ritual) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 });
    }

    if (ritual.userId !== auth.session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const completionEntries: CompletionEntry[] = completions.map((completion) => ({
      date: completion.date,
      completed: completion.completed,
    }));

    const streakResult = calculateRitualStreak({
      completions: completionEntries,
      scheduledDays: parseScheduleDays(ritual.days),
      periodDays: days,
      referenceDate,
    });

    const stats = {
      streak: streakResult.streak,
      maxStreak: streakResult.maxStreak,
      completedDays: streakResult.completedScheduledDays,
      scheduledDays: streakResult.scheduledDays,
      totalDays: days,
      completionRate: streakResult.completionRate,
    };

    return NextResponse.json({
      success: true,
      completions: completions.map((completion) => ({
        ...completion,
        date: formatDateKey(completion.date),
      })),
      stats,
    });
  } catch (error) {
    console.error("Fetch completions error:", error);
    return NextResponse.json({ error: "Failed to fetch completions" }, { status: 500 });
  }
}

async function incrementLinkedChallenges(userId: string, ritualId: string, completionDate: Date) {
  const activeChallenges = await db.challenge.findMany({
    where: { userId, status: "active", type: "ritual" },
    select: { id: true, config: true, duration: true },
  });

  const completionDateKey = formatDateKey(completionDate);

  for (const challenge of activeChallenges) {
    try {
      const config = JSON.parse(challenge.config || "{}") as {
        linkedRitualIds?: string[];
        selectedRitualIds?: string[];
      };
      const linked = config.selectedRitualIds ?? config.linkedRitualIds ?? [];
      if (linked.length > 0 && !linked.includes(ritualId)) {
        continue;
      }

      const existing = await db.challengeProgress.findFirst({
        where: { challengeId: challenge.id },
      });

      if (existing) {
        const lastCheckedKey = formatDateKey(existing.lastCheckedAt);
        if (lastCheckedKey === completionDateKey) {
          continue;
        }

        const shouldAdvanceReference = compareDateKeys(completionDateKey, lastCheckedKey) > 0;
        const nextCurrentStreak =
          shouldAdvanceReference && completionDateKey === addDaysToDateKey(lastCheckedKey, 1)
            ? existing.currentStreak + 1
            : shouldAdvanceReference
              ? 1
              : existing.currentStreak;

        await db.challengeProgress.update({
          where: { id: existing.id },
          data: {
            daysCompleted: { increment: 1 },
            currentStreak: nextCurrentStreak,
            ...(shouldAdvanceReference ? { lastCheckedAt: completionDate } : {}),
          },
        });

        if (existing.daysCompleted + 1 >= challenge.duration) {
          await db.challenge.update({
            where: { id: challenge.id },
            data: { status: "completed", progress: 100 },
          });
        }
      } else {
        await db.challengeProgress.create({
          data: {
            challengeId: challenge.id,
            daysCompleted: 1,
            currentStreak: 1,
            lastCheckedAt: completionDate,
          },
        });
      }
    } catch {
      // Per-challenge errors are non-critical.
    }
  }
}

async function checkAchievements(userId: string, ritual: StringArrayContainer & { id: string }) {
  try {
    const completions = await db.ritualCompletion.findMany({
      where: { ritualId: ritual.id, completed: true },
      select: { date: true, completed: true },
      orderBy: { date: "asc" },
    });

    if (completions.length === 0) {
      return;
    }

    const earliestDate = getStartOfDay(completions[0].date);
    const referenceDate = getStartOfDay(new Date());
    const periodDays = Math.max(
      1,
      Math.floor((referenceDate.getTime() - earliestDate.getTime()) / 86400000) + 1
    );

    const streakResult = calculateRitualStreak({
      completions: completions.map((completion) => ({
        date: completion.date,
        completed: completion.completed,
      })),
      scheduledDays: parseScheduleDays(ritual.days),
      periodDays,
      referenceDate,
    });

    const streakAchievements = [
      { code: "RITUAL_STREAK_3", threshold: 3 },
      { code: "RITUAL_STREAK_7", threshold: 7 },
      { code: "RITUAL_STREAK_30", threshold: 30 },
    ];

    for (const achievement of streakAchievements) {
      if (streakResult.maxStreak >= achievement.threshold) {
        await db.achievement.upsert({
          where: { userId_code: { userId, code: achievement.code } },
          update: {},
          create: { userId, code: achievement.code },
        });
      }
    }
  } catch (error) {
    console.error("Check achievements error:", error);
  }
}
