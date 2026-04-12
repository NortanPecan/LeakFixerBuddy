import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateChallengeProgress } from "@/lib/challenge-utils";
import { requireAuthenticatedUser, requireSelf } from "@/lib/server-auth";

// GET /api/challenges?userId=xxx or /api/challenges?id=xxx
export async function GET(request: NextRequest) {
  const auth = requireAuthenticatedUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const challengeId = searchParams.get("id");
  const status = searchParams.get("status");
  const directionId = searchParams.get("directionId");

  // Get single challenge by ID
  if (challengeId && !userId) {
    try {
      const challenge = await db.challenge.findUnique({
        where: { id: challengeId },
        include: {
          direction: true,
          progressDetails: true,
        },
      });

      if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }

      if (challenge.userId !== auth.session.userId) {
        return NextResponse.json(
          { error: "Forbidden", hint: "You can only access your own challenges" },
          { status: 403 }
        );
      }

      const challengeWithProgress = await calculateChallengeProgress(challenge, challenge.userId);

      let linkedRituals: unknown[] = [];
      let linkedSkills: unknown[] = [];
      let linkedTraits: unknown[] = [];

      try {
        const config = JSON.parse(challenge.config || "{}");
        if (config.linkedRitualIds?.length) {
          linkedRituals = await db.ritual.findMany({
            where: { id: { in: config.linkedRitualIds } },
            select: { id: true, title: true, category: true },
          });
        }
        if (config.linkedSkillIds?.length) {
          linkedSkills = await db.skill.findMany({
            where: { id: { in: config.linkedSkillIds } },
            select: { id: true, name: true, level: true },
          });
        }
        if (config.linkedTraitIds?.length) {
          linkedTraits = await db.trait.findMany({
            where: { id: { in: config.linkedTraitIds } },
            select: { id: true, name: true, score: true },
          });
        }
      } catch {
        // ignore parse errors
      }

      const trackerDays: Array<{ date: string; value: number | null; met: boolean }> = [];
      if (challengeWithProgress.type === "tracker") {
        try {
          const tcfg = JSON.parse(challenge.config || "{}") as Record<string, unknown>;
          const metric = tcfg.metric as string;
          const target = (tcfg.target as number) || 1;
          const uid = challenge.userId;

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const dEnd = new Date(d);
            dEnd.setHours(23, 59, 59, 999);
            const dateStr = d.toISOString().split("T")[0];

            let value: number | null = null;
            let met = false;

            if (metric === "water_streak") {
              const fd = await db.fitnessDaily.findFirst({ where: { userId: uid, date: d } });
              value = fd?.water ?? null;
              met = fd ? (fd.water ?? 0) >= (fd.waterTarget ?? 2000) : false;
            } else if (metric === "gym_count") {
              const cnt = await db.gymWorkout.count({
                where: {
                  period: { userId: uid },
                  status: "completed",
                  date: { gte: d, lte: dEnd },
                },
              });
              value = cnt;
              met = cnt > 0;
            } else if (metric === "ritual_rate") {
              const rits = await db.ritual.findMany({
                where: { userId: uid, status: "active" },
                select: { id: true },
              });
              if (rits.length > 0) {
                const comps = await db.ritualCompletion.findMany({
                  where: { ritualId: { in: rits.map((r) => r.id) }, date: d, completed: true },
                });
                value = comps.length;
                met = comps.length > 0;
              }
            } else if (metric === "no_food_bad") {
              const badCnt = await db.foodEntry.count({
                where: { userId: uid, quality: "bad", date: { gte: d, lte: dEnd } },
              });
              value = badCnt;
              met = badCnt === 0;
            } else if (metric === "sleep_avg") {
              const st = await db.dailyState.findFirst({ where: { userId: uid, date: d } });
              value = st?.sleepHours ?? null;
              met = (st?.sleepHours ?? 0) >= target;
            } else if (metric === "mood_avg") {
              const st = await db.dailyState.findFirst({ where: { userId: uid, date: d } });
              value = st?.mood ?? null;
              met = (st?.mood ?? 0) >= target;
            }

            trackerDays.push({ date: dateStr, value, met });
          }
        } catch {
          // ignore tracker parse errors
        }
      }

      return NextResponse.json({
        success: true,
        challenge: {
          ...challengeWithProgress,
          linkedRituals,
          linkedSkills,
          linkedTraits,
          trackerDays,
        },
      });
    } catch (error) {
      console.error("Error fetching challenge:", error);
      return NextResponse.json({ error: "Failed to fetch challenge" }, { status: 500 });
    }
  }

  const selfCheck = requireSelf(request, userId);
  if ("error" in selfCheck) return selfCheck.error;

  try {
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (directionId) where.directionId = directionId;

    const challenges = await db.challenge.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        direction: { select: { id: true, title: true, color: true } },
      },
    });

    const challengesWithProgress = await Promise.all(
      challenges.map((c) => calculateChallengeProgress(c, userId!))
    );

    return NextResponse.json({ success: true, challenges: challengesWithProgress });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}

// POST /api/challenges - Create challenge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      name,
      title,
      description,
      type,
      category,
      zone,
      directionId,
      chainId,
      config,
      startDate,
      duration,
      endDate,
      status,
    } = body;

    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    if (!name) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }

    const activeCount = await db.challenge.count({ where: { userId, status: "active" } });
    if (activeCount >= 3) {
      return NextResponse.json(
        { error: "Максимум 3 активных челленджа", code: "LIMIT_REACHED" },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date();
    let calculatedEndDate = endDate ? new Date(endDate) : null;

    if (!calculatedEndDate && duration) {
      calculatedEndDate = new Date(start);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + duration);
      calculatedEndDate.setHours(23, 59, 59, 999);
    }

    const challenge = await db.challenge.create({
      data: {
        userId,
        name,
        title,
        description,
        type: type || "custom",
        category: category || "general",
        zone: zone || "general",
        directionId: directionId || null,
        chainId: chainId || null,
        config: typeof config === "object" ? JSON.stringify(config) : config || "{}",
        startDate: start,
        duration: duration || 30,
        endDate: calculatedEndDate,
        status: status || "active",
      },
      include: {
        direction: { select: { id: true, title: true, color: true } },
      },
    });

    return NextResponse.json({ success: true, challenge });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}

// PATCH /api/challenges - Update challenge or manually mark a day
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      title,
      description,
      category,
      directionId,
      config,
      status,
      progress,
      startDate,
      endDate,
      markDay,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const challenge = await db.challenge.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, duration: true, name: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auth = requireSelf(request, challenge.userId);
    if ("error" in auth) return auth.error;

    if (markDay) {
      const todayStr = new Date().toISOString().split("T")[0];
      const existing = await db.challengeProgress.findFirst({ where: { challengeId: id } });
      if (existing) {
        const lastChecked = existing.lastCheckedAt.toISOString().split("T")[0];
        if (lastChecked === todayStr) {
          return NextResponse.json({
            success: true,
            challenge,
            daysCompleted: existing.daysCompleted,
            alreadyMarked: true,
          });
        }
        await db.challengeProgress.update({
          where: { id: existing.id },
          data: {
            daysCompleted: { increment: 1 },
            currentStreak: { increment: 1 },
            lastCheckedAt: new Date(),
          },
        });
      } else {
        await db.challengeProgress.create({
          data: { challengeId: id, daysCompleted: 1, currentStreak: 1 },
        });
      }

      const daysCompleted = existing ? existing.daysCompleted + 1 : 1;
      const newProgress = Math.min(100, Math.round((daysCompleted / challenge.duration) * 100));
      const newStatus = newProgress >= 100 ? "completed" : challenge.status;
      const updated = await db.challenge.update({
        where: { id },
        data: { progress: newProgress, status: newStatus },
      });

      if (newStatus === "completed" && challenge.status === "active") {
        try {
          await db.achievement.create({
            data: {
              userId: challenge.userId,
              code: "CHALLENGE_FIRST",
              metadata: JSON.stringify({
                challengeId: challenge.id,
                challengeName: challenge.name,
              }),
            },
          });
        } catch {
          // already exists
        }

        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            const tgUser = await db.appUser.findUnique({
              where: { id: challenge.userId },
              select: { telegramId: true },
            });
            if (tgUser?.telegramId) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: tgUser.telegramId,
                  text: `🏆 <b>Челлендж завершён!</b>\n\n<b>${challenge.name}</b>\n\n🎉 Отличная работа! Ты выполнил поставленную цель.`,
                  parse_mode: "HTML",
                }),
              });
            }
          }
        } catch {
          // non-critical
        }
      }

      return NextResponse.json({ success: true, challenge: updated, daysCompleted });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (directionId !== undefined) updateData.directionId = directionId || null;
    if (config !== undefined)
      updateData.config = typeof config === "object" ? JSON.stringify(config) : config;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const updatedChallenge = await db.challenge.update({
      where: { id },
      data: updateData,
      include: { direction: { select: { id: true, title: true, color: true } } },
    });

    return NextResponse.json({ success: true, challenge: updatedChallenge });
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 });
  }
}

// DELETE /api/challenges?id=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const challenge = await db.challenge.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auth = requireSelf(request, challenge.userId);
    if ("error" in auth) return auth.error;

    await db.challengeProgress.deleteMany({ where: { challengeId: id } });
    await db.challenge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return NextResponse.json({ error: "Failed to delete challenge" }, { status: 500 });
  }
}
