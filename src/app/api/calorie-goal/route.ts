import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

// TDEE: Harris-Benedict BMR × activity multiplier
function calcTDEE(
  weight: number,
  height: number,
  age: number,
  sex: string,
  workProfile?: string | null
): number {
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const multiplier =
    workProfile === "physical"
      ? 1.725
      : workProfile === "mixed"
        ? 1.55
        : workProfile === "variable"
          ? 1.375
          : 1.2; // sedentary / default

  return Math.round(bmr * multiplier);
}

// ─── GET /api/calorie-goal?userId=xxx ─────────────────────────────────────────
// Returns goal data + adaptive daily target + this-week progress
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await requireSelf(request, userId);

  const profile = await db.userProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ goal: null, profile: null });

  // Build goal object
  const hasGoal = !!(profile.targetWeight && profile.weightDeadline);

  let tdee: number | null = null;
  if (profile.weight && profile.height && profile.age && profile.sex) {
    tdee = calcTDEE(profile.weight, profile.height, profile.age, profile.sex, profile.workProfile);
  }

  let goalData = null;
  if (hasGoal) {
    const startWeight = profile.weightStart ?? profile.weight ?? 0;
    const targetWeight = profile.targetWeight!;
    const startDate = profile.weightStartAt ?? profile.createdAt;
    const deadline = new Date(profile.weightDeadline!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(
      1,
      Math.round((deadline.getTime() - new Date(startDate).getTime()) / 86400000)
    );
    const daysLeft = Math.max(0, Math.round((deadline.getTime() - today.getTime()) / 86400000));
    const daysElapsed = totalDays - daysLeft;

    // Planned weight loss (7700 kcal = 1 kg)
    const totalDeficit = (startWeight - targetWeight) * 7700;
    const dailyDeficitPlan = totalDeficit / totalDays;

    // Weight progress: get latest measurement
    const latestMeasurement = await db.bodyMeasurement.findFirst({
      where: { userId, type: "weight" },
      orderBy: { date: "desc" },
    });
    const currentWeight = latestMeasurement?.value ?? profile.weight ?? startWeight;

    // Remaining deficit based on current weight
    const remainingDeficit = (currentWeight - targetWeight) * 7700;
    const adaptiveDailyDeficit = daysLeft > 0 ? remainingDeficit / daysLeft : dailyDeficitPlan;

    const dailyTarget = tdee
      ? Math.round(tdee - adaptiveDailyDeficit)
      : (profile.targetCalories ?? null);

    // Safety warning: deficit > 1000 kcal/day is too aggressive
    const isTooAggressive = adaptiveDailyDeficit > 1000;
    // Warning: losing more than 1kg/week (7700/7 = 1100 kcal/day)
    const isUnrealistic = adaptiveDailyDeficit > 1100;

    // This week's actual calories (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekDays = await db.fitnessDaily.findMany({
      where: { userId, date: { gte: weekStart } },
      orderBy: { date: "asc" },
    });

    const weekData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const dayRecord = weekDays.find(
        (wd) => new Date(wd.date).toDateString() === d.toDateString()
      );
      return {
        date: d.toISOString().split("T")[0],
        calories: dayRecord?.calories ?? null,
        target: dailyTarget,
      };
    });

    const weekCalories = weekData.reduce((sum, d) => sum + (d.calories ?? 0), 0);
    const weekTarget = (dailyTarget ?? 0) * 7;
    const weekSurplus = weekCalories - weekTarget;

    // Projected weight at deadline (based on current trajectory)
    const avgDailyCalories =
      weekCalories / Math.max(1, weekData.filter((d) => d.calories !== null).length);
    const projectedDeficitPerDay = tdee ? tdee - avgDailyCalories : adaptiveDailyDeficit;
    const projectedWeightLoss = (projectedDeficitPerDay * daysLeft) / 7700;
    const projectedWeight = currentWeight - projectedWeightLoss;

    // Progress %
    const weightLostSoFar = startWeight - currentWeight;
    const totalToLose = startWeight - targetWeight;
    const progressPct = totalToLose > 0 ? Math.round((weightLostSoFar / totalToLose) * 100) : 0;

    goalData = {
      startWeight,
      targetWeight,
      currentWeight,
      startDate: new Date(startDate).toISOString().split("T")[0],
      deadline: deadline.toISOString().split("T")[0],
      totalDays,
      daysLeft,
      daysElapsed,
      progressPct: Math.max(0, Math.min(100, progressPct)),
      dailyTarget,
      adaptiveDailyDeficit: Math.round(adaptiveDailyDeficit),
      isTooAggressive,
      isUnrealistic,
      weekData,
      weekCalories,
      weekTarget,
      weekSurplus: Math.round(weekSurplus),
      projectedWeight: Math.round(projectedWeight * 10) / 10,
      tdee,
    };
  }

  return NextResponse.json({
    goal: goalData,
    profile: {
      weight: profile.weight,
      height: profile.height,
      age: profile.age,
      sex: profile.sex,
      targetWeight: profile.targetWeight,
      weightDeadline: profile.weightDeadline,
      weightStart: profile.weightStart,
      tdee,
    },
  });
}

// ─── PATCH /api/calorie-goal ───────────────────────────────────────────────────
// Set or update goal: { userId, targetWeight, deadline, startWeight? }
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      targetWeight?: number;
      deadline?: string;
      startWeight?: number;
      clearGoal?: boolean;
    };
    const { userId, targetWeight, deadline, startWeight, clearGoal } = body;

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    await requireSelf(request, userId);

    if (clearGoal) {
      await db.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          targetWeight: null,
          weightDeadline: null,
          weightStart: null,
          weightStartAt: null,
        },
        update: {
          targetWeight: null,
          weightDeadline: null,
          weightStart: null,
          weightStartAt: null,
        },
      });
      return NextResponse.json({ success: true, cleared: true });
    }

    if (targetWeight === undefined || !deadline) {
      return NextResponse.json({ error: "targetWeight and deadline required" }, { status: 400 });
    }

    // Validate: deadline must be in the future
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return NextResponse.json({ error: "Дедлайн должен быть в будущем" }, { status: 400 });
    }

    // Get current weight for startWeight if not provided
    let resolvedStartWeight = startWeight;
    if (!resolvedStartWeight) {
      const profile = await db.userProfile.findUnique({ where: { userId } });
      const latestMeasurement = await db.bodyMeasurement.findFirst({
        where: { userId, type: "weight" },
        orderBy: { date: "desc" },
      });
      resolvedStartWeight = latestMeasurement?.value ?? profile?.weight ?? undefined;
    }

    await db.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        targetWeight,
        weightDeadline: deadlineDate,
        weightStart: resolvedStartWeight ?? null,
        weightStartAt: new Date(),
      },
      update: {
        targetWeight,
        weightDeadline: deadlineDate,
        weightStart: resolvedStartWeight ?? undefined,
        weightStartAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[calorie-goal PATCH]", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
