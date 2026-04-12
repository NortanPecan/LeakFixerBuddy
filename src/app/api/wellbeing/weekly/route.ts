import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getQuestionsForPreset, PRESET_INFO, PresetLevel } from "@/lib/wellbeing-config";
import {
  calculateWellbeingScore,
  countAnsweredQuestions,
  getWeeklyQuestionsCount,
  getISOWeek,
  getISOWeekDates,
} from "@/lib/wellbeing-utils";
import { requireSelf } from "@/lib/server-auth";

/**
 * GET /api/wellbeing/weekly?userId=xxx&year=2025&week=23
 * Get weekly wellbeing data for a specific ISO week
 * If no year/week provided, returns current week's data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const yearStr = searchParams.get("year");
    const weekStr = searchParams.get("week");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    // Determine target week
    let year: number;
    let week: number;

    if (yearStr && weekStr) {
      year = parseInt(yearStr);
      week = parseInt(weekStr);
    } else {
      const isoWeek = getISOWeek(new Date());
      year = isoWeek.year;
      week = isoWeek.week;
    }

    // Get user settings for preset
    const settings = await db.userWellbeingSettings.findUnique({
      where: { userId },
    });

    const currentSettingsPreset = (settings?.preset || "core") as PresetLevel;

    // Get existing weekly record
    const weeklyRecord = await db.weeklyWellbeing.findUnique({
      where: {
        userId_year_week: {
          userId,
          year,
          week,
        },
      },
    });

    // BUG-5 FIX: Use record's preset if exists
    const recordPreset = weeklyRecord?.preset || null;
    const preset = recordPreset || currentSettingsPreset;
    const presetInfo = PRESET_INFO[preset];

    // Only expanded and full presets have weekly questions
    if (preset === "core") {
      return NextResponse.json({
        success: true,
        data: {
          year,
          week,
          preset,
          recordPreset,
          currentSettingsPreset,
          presetInfo,
          questions: [],
          answers: {},
          scores: null,
          progress: { answered: 0, total: 0, percentage: 100, isComplete: true },
          message: "Core preset has no weekly questions",
        },
      });
    }

    const questions = getQuestionsForPreset(preset as PresetLevel, "weekly");
    const weekDates = getISOWeekDates(year, week);

    const answers = weeklyRecord?.answers ? JSON.parse(weeklyRecord.answers) : {};

    const scores = weeklyRecord?.scores ? JSON.parse(weeklyRecord.scores) : null;

    const answeredCount = countAnsweredQuestions(answers, preset as PresetLevel, "weekly");
    const totalQuestions = getWeeklyQuestionsCount(preset as PresetLevel);

    return NextResponse.json({
      success: true,
      data: {
        year,
        week,
        weekDates: {
          start: weekDates.start.toISOString().split("T")[0],
          end: weekDates.end.toISOString().split("T")[0],
        },
        preset,
        recordPreset, // BUG-5 FIX
        currentSettingsPreset,
        presetInfo,
        questions,
        answers,
        scores,
        progress: {
          answered: answeredCount,
          total: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100,
          isComplete: totalQuestions === 0 || answeredCount >= totalQuestions,
        },
        completedAt: weeklyRecord?.completedAt || null,
      },
    });
  } catch (error) {
    console.error("Get weekly wellbeing error:", error);
    return NextResponse.json({ error: "Failed to get weekly wellbeing" }, { status: 500 });
  }
}

/**
 * POST /api/wellbeing/weekly
 * Save or update weekly wellbeing answers
 * Body: { userId, year?, week?, preset, answers: { questionId: value } }
 *
 * BUG-2 FIX: Allows partial saves (no requirement to answer all questions)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, year, week, preset, answers } = body;

    if (!userId || !preset || !answers) {
      return NextResponse.json({ error: "userId, preset, and answers required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    const validPresets = ["expanded", "full"];
    if (!validPresets.includes(preset)) {
      return NextResponse.json(
        { error: "Invalid preset for weekly. Use expanded or full" },
        { status: 400 }
      );
    }

    // Determine year/week
    let targetYear: number;
    let targetWeek: number;

    if (year && week) {
      targetYear = parseInt(year);
      targetWeek = parseInt(week);
    } else {
      const isoWeek = getISOWeek(new Date());
      targetYear = isoWeek.year;
      targetWeek = isoWeek.week;
    }

    // Calculate scores
    const scores = calculateWellbeingScore(answers, preset as PresetLevel, "weekly");

    // BUG-2 FIX: Allow partial saves - check completion but don't require it
    const answeredCount = countAnsweredQuestions(answers, preset as PresetLevel, "weekly");
    const totalQuestions = getWeeklyQuestionsCount(preset as PresetLevel);
    const isComplete = answeredCount >= totalQuestions;

    const weeklyWellbeing = await db.weeklyWellbeing.upsert({
      where: {
        userId_year_week: {
          userId,
          year: targetYear,
          week: targetWeek,
        },
      },
      update: {
        preset,
        answers: JSON.stringify(answers),
        scores: JSON.stringify(scores),
        completedAt: isComplete ? new Date() : null,
      },
      create: {
        userId,
        year: targetYear,
        week: targetWeek,
        preset,
        answers: JSON.stringify(answers),
        scores: JSON.stringify(scores),
        completedAt: isComplete ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        year: targetYear,
        week: targetWeek,
        preset,
        scores,
        progress: {
          answered: answeredCount,
          total: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100,
          isComplete,
        },
        completedAt: weeklyWellbeing.completedAt,
      },
    });
  } catch (error) {
    console.error("Save weekly wellbeing error:", error);
    return NextResponse.json({ error: "Failed to save weekly wellbeing" }, { status: 500 });
  }
}

/**
 * PUT /api/wellbeing/weekly?userId=xxx&checkIncomplete=true
 * Check if there's an incomplete week (current or previous)
 *
 * BUG-4 FIX: Now also checks current week
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    // Get user settings
    const settings = await db.userWellbeingSettings.findUnique({
      where: { userId },
    });

    const preset = (settings?.preset || "core") as PresetLevel;

    if (preset === "core") {
      return NextResponse.json({
        success: true,
        hasIncomplete: false,
        message: "Core preset has no weekly questions",
      });
    }

    const currentWeek = getISOWeek(new Date());
    const totalQuestions = getWeeklyQuestionsCount(preset);

    // BUG-4 FIX: Check current week first
    const currentWeekRecord = await db.weeklyWellbeing.findUnique({
      where: {
        userId_year_week: {
          userId,
          year: currentWeek.year,
          week: currentWeek.week,
        },
      },
    });

    // Current week is incomplete if: no record OR record exists but not completed
    const currentWeekIncomplete = !currentWeekRecord || !currentWeekRecord.completedAt;

    if (currentWeekIncomplete) {
      return NextResponse.json({
        success: true,
        hasIncomplete: true,
        incompleteWeek: {
          year: currentWeek.year,
          week: currentWeek.week,
        },
        isCurrentWeek: true,
      });
    }

    // BUG-4: Also check previous week
    const prevWeek = currentWeek.week - 1;
    const prevYear = prevWeek < 1 ? currentWeek.year - 1 : currentWeek.year;
    const actualPrevWeek = prevWeek < 1 ? 52 : prevWeek;

    const prevWeekRecord = await db.weeklyWellbeing.findUnique({
      where: {
        userId_year_week: {
          userId,
          year: prevYear,
          week: actualPrevWeek,
        },
      },
    });

    const prevWeekIncomplete = !prevWeekRecord || !prevWeekRecord.completedAt;

    return NextResponse.json({
      success: true,
      hasIncomplete: prevWeekIncomplete,
      incompleteWeek: prevWeekIncomplete
        ? {
            year: prevYear,
            week: actualPrevWeek,
          }
        : null,
      isCurrentWeek: false,
    });
  } catch (error) {
    console.error("Check incomplete week error:", error);
    return NextResponse.json({ error: "Failed to check incomplete week" }, { status: 500 });
  }
}
