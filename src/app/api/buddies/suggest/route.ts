import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

/**
 * GET /api/buddies/suggest?userId=...
 *
 * Buddy Matching v2: matching by leak profile similarity (Leak Engine patterns)
 * + activity patterns + ritual categories.
 *
 * Scoring algorithm:
 * 1. Leak profile Jaccard similarity → up to +5 points
 * 2. Same day range (± 7 days) → +3 points
 * 3. Similar streak (within 30%) → +2 points
 * 4. Matching activity types (rituals/habits/gym) → +1 each
 * 5. Ritual category overlap → +1 or +2 points
 *
 * Returns top 5 candidates with match scores and reasons.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  await requireSelf(request, userId);

  try {
    // Get current user's profile and leak profile
    const [currentUser, currentProfile] = await Promise.all([
      db.appUser.findUnique({
        where: { id: userId },
        select: { id: true, day: true, streak: true },
      }),
      db.userProfile.findUnique({
        where: { userId },
        select: { leakProfile: true },
      }),
    ]);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all existing buddy relationships for current user
    const existingBuddies = await db.buddy.findMany({
      where: {
        OR: [{ userId }, { partnerId: userId }],
      },
      select: { userId: true, partnerId: true, status: true },
    });

    const excludeIds = new Set<string>([userId]);
    existingBuddies.forEach((b) => {
      if (b.status !== "rejected") {
        excludeIds.add(b.userId === userId ? b.partnerId : b.userId);
      }
    });

    // Get all other users + their profiles (for leak profile matching)
    const candidates = await db.appUser.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
      },
      select: {
        id: true,
        day: true,
        streak: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        firstName: true,
        lastName: true,
        username: true,
        photoUrl: true,
        profile: {
          select: { leakProfile: true },
        },
      },
      take: 100,
    });

    // Score each candidate
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidateIds = candidates.map((c) => c.id);

    const [
      ritualActivity,
      gymActivity,
      habitActivity,
      candidateRitualCategories,
      myActiveCategories,
    ] = await Promise.all([
      db.ritualCompletion.groupBy({
        by: ["userId"],
        where: {
          userId: { in: candidateIds },
          date: { gte: sevenDaysAgo },
          completed: true,
        },
        _count: { id: true },
      }),
      db.gymPeriod.findMany({
        where: { userId: { in: candidateIds } },
        select: { userId: true },
      }),
      db.habitLog.groupBy({
        by: ["userId"],
        where: {
          userId: { in: candidateIds },
          date: { gte: sevenDaysAgo },
        },
        _count: { id: true },
      }),
      db.ritual.findMany({
        where: { userId: { in: candidateIds }, status: "active" },
        select: { userId: true, category: true },
      }),
      db.ritual.findMany({
        where: { userId, status: "active" },
        select: { category: true },
      }),
    ]);

    const [myRituals, myGym, myHabits] = await Promise.all([
      db.ritualCompletion.count({
        where: { userId, date: { gte: sevenDaysAgo }, completed: true },
      }),
      db.gymPeriod.count({ where: { userId } }),
      db.habitLog.count({ where: { userId, date: { gte: sevenDaysAgo } } }),
    ]);

    const ritualMap = new Map(ritualActivity.map((r) => [r.userId, r._count.id]));
    const gymMap = new Set(gymActivity.map((g) => g.userId));
    const habitMap = new Map(habitActivity.map((h) => [h.userId, h._count.id]));

    const myCategorySet = new Set(myActiveCategories.map((r) => r.category));
    const candidateCategoryMap = new Map<string, Set<string>>();
    for (const r of candidateRitualCategories) {
      if (!candidateCategoryMap.has(r.userId)) {
        candidateCategoryMap.set(r.userId, new Set());
      }
      candidateCategoryMap.get(r.userId)!.add(r.category);
    }

    // Parse current user's leak profile
    const myLeakTypes = parseLeakProfile(currentProfile?.leakProfile);
    const myLeakSet = new Set(myLeakTypes);

    const CATEGORY_LABELS: Record<string, string> = {
      health: "Здоровье",
      money: "Финансы",
      learning: "Обучение",
      relationships: "Отношения",
      mind: "Психология",
      productivity: "Продуктивность",
    };

    const LEAK_LABELS: Record<string, string> = {
      low_energy: "Низкая энергия",
      ritual_consistency: "Ритуалы",
      high_spend_days: "Расходы",
      gym_mood: "Зал и настроение",
      energy_to_day_quality: "Энергия → день",
      no_gym: "Нет тренировок",
      missed_checkins: "Пропуск чекинов",
      calorie_spikes: "Скачки калорий",
      no_habits: "Нет привычек",
      rituals_quality: "Ритуалы → день",
      weekend_drop: "Выходные",
    };

    // Score and rank
    const scored = candidates
      .map((candidate) => {
        let score = 0;
        const reasons: string[] = [];

        // --- Leak Profile Jaccard Similarity (up to +5 points) ---
        const theirLeakTypes = parseLeakProfile(candidate.profile?.leakProfile);
        if (myLeakTypes.length > 0 && theirLeakTypes.length > 0) {
          const theirLeakSet = new Set(theirLeakTypes);
          const shared: string[] = [];
          for (const t of myLeakSet) {
            if (theirLeakSet.has(t)) shared.push(t);
          }
          const union = new Set([...myLeakSet, ...theirLeakSet]);
          const jaccard = union.size > 0 ? shared.length / union.size : 0;

          if (jaccard >= 0.6) {
            score += 5;
            reasons.push(
              `Похожий ЛИК: ${shared
                .slice(0, 2)
                .map((t) => LEAK_LABELS[t] || t)
                .join(", ")}`
            );
          } else if (jaccard >= 0.33) {
            score += 3;
            reasons.push(
              `Общие паттерны: ${shared
                .slice(0, 2)
                .map((t) => LEAK_LABELS[t] || t)
                .join(", ")}`
            );
          } else if (shared.length > 0) {
            score += 1;
            reasons.push(`Схожий паттерн: ${LEAK_LABELS[shared[0]] || shared[0]}`);
          }
        }

        // --- Day range match (± 7 days) → +3 ---
        const dayDiff = Math.abs((candidate.day || 1) - (currentUser.day || 1));
        if (dayDiff <= 7) {
          score += 3;
          reasons.push(`День ${candidate.day || 1} (близко к вашему)`);
        } else if (dayDiff <= 14) {
          score += 1;
        }

        // --- Streak similarity (within 30%) → +2 ---
        const myStreak = currentUser.streak || 0;
        const theirStreak = candidate.streak || 0;
        if (myStreak > 0 && theirStreak > 0) {
          const ratio = Math.min(myStreak, theirStreak) / Math.max(myStreak, theirStreak);
          if (ratio >= 0.7) {
            score += 2;
            reasons.push(`Стрик ${theirStreak} дн.`);
          } else if (ratio >= 0.4) {
            score += 1;
          }
        }

        // --- Activity pattern similarity → +1 each ---
        const hasRituals = (ritualMap.get(candidate.id) || 0) > 0;
        const hasGym = gymMap.has(candidate.id);
        const hasHabits = (habitMap.get(candidate.id) || 0) > 0;

        if (myRituals > 0 && hasRituals) {
          score += 1;
          reasons.push("Ритуалы");
        }
        if (myGym > 0 && hasGym) {
          score += 1;
          reasons.push("Тренировки");
        }
        if (myHabits > 0 && hasHabits) {
          score += 1;
          reasons.push("Привычки");
        }

        // --- Ritual category overlap → +1 or +2 ---
        if (myCategorySet.size > 0) {
          const theirCategories = candidateCategoryMap.get(candidate.id);
          if (theirCategories) {
            const shared: string[] = [];
            for (const cat of myCategorySet) {
              if (theirCategories.has(cat)) shared.push(cat);
            }
            if (shared.length >= 2) {
              score += 2;
              reasons.push(
                `Общие зоны: ${shared
                  .slice(0, 2)
                  .map((c) => CATEGORY_LABELS[c] || c)
                  .join(", ")}`
              );
            } else if (shared.length === 1) {
              score += 1;
              const cat = shared[0];
              reasons.push(`Общая зона: ${CATEGORY_LABELS[cat] || cat}`);
            }
          }
        }

        // Name
        const name = candidate.telegramFirstName
          ? `${candidate.telegramFirstName}${candidate.telegramLastName ? ` ${candidate.telegramLastName}` : ""}`
          : candidate.firstName
            ? `${candidate.firstName}${candidate.lastName ? ` ${candidate.lastName}` : ""}`
            : candidate.telegramUsername || candidate.username || "Пользователь";

        return {
          id: candidate.id,
          name,
          username: candidate.telegramUsername || candidate.username,
          photoUrl: candidate.telegramPhotoUrl || candidate.photoUrl,
          day: candidate.day || 1,
          streak: candidate.streak || 0,
          score,
          reasons: reasons.slice(0, 3),
          leakOverlap: theirLeakTypes.filter((t) => myLeakSet.has(t)),
          categories: Array.from(candidateCategoryMap.get(candidate.id) ?? []),
        };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      suggestions: scored,
      currentUserDay: currentUser.day,
      myLeakProfile: myLeakTypes,
    });
  } catch (error) {
    console.error("[Buddy Suggest] Error:", error);
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}

/** Parse leakProfile JSON field → string[] */
function parseLeakProfile(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  return [];
}
