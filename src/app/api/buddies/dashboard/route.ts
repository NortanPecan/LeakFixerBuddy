import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

// GET /api/buddies/dashboard?userId=xxx&buddyId=xxx
// Returns the buddy's shared stats (public data)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const buddyId = searchParams.get("buddyId");

    if (!userId || !buddyId) {
      return NextResponse.json({ error: "userId and buddyId required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    // Verify they are actually buddies
    const buddyRelation = await db.buddy.findFirst({
      where: {
        OR: [
          { userId, partnerId: buddyId, status: "accepted" },
          { userId: buddyId, partnerId: userId, status: "accepted" },
        ],
      },
    });

    if (!buddyRelation) {
      return NextResponse.json({ error: "Not buddies" }, { status: 403 });
    }

    // Get buddy's privacy setting
    const buddySettings = await db.userSettings.findUnique({
      where: { userId: buddyId },
      select: { buddyPrivacy: true },
    });
    const privacy = buddySettings?.buddyPrivacy ?? "full";

    // Get buddy user info
    const buddyUser = await db.appUser.findUnique({
      where: { id: buddyId },
      select: {
        id: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        username: true,
        day: true,
        streak: true,
        points: true,
      },
    });

    if (!buddyUser) {
      return NextResponse.json({ error: "Buddy not found" }, { status: 404 });
    }

    const buddyName = buddyUser.telegramFirstName
      ? `${buddyUser.telegramFirstName}${buddyUser.telegramLastName ? ` ${buddyUser.telegramLastName}` : ""}`
      : buddyUser.firstName
        ? `${buddyUser.firstName}${buddyUser.lastName ? ` ${buddyUser.lastName}` : ""}`
        : buddyUser.telegramUsername || buddyUser.username || "Бадди";

    // Active rituals count
    const activeRituals = await db.ritual.count({
      where: { userId: buddyId, status: "active" },
    });

    // Today's ritual completions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCompletions = await db.ritualCompletion.count({
      where: {
        userId: buddyId,
        date: { gte: today, lt: tomorrow },
        completed: true,
      },
    });

    // Active gym period
    const gymPeriod = await db.gymPeriod.findFirst({
      where: { userId: buddyId, isActive: true },
      select: { name: true, currentDay: true, totalCycles: true },
    });

    // Latest weight (from Measurement model)
    const latestWeight = await db.measurement.findFirst({
      where: { userId: buddyId, type: "weight" },
      orderBy: { date: "desc" },
      select: { value: true, date: true },
    });

    // This week's workout count (via period relation)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const buddyPeriods = await db.gymPeriod.findMany({
      where: { userId: buddyId },
      select: { id: true },
    });
    const periodIds = buddyPeriods.map((p) => p.id);

    const weekWorkouts =
      periodIds.length > 0
        ? await db.gymWorkout.count({
            where: {
              periodId: { in: periodIds },
              status: "completed",
              date: { gte: weekStart },
            },
          })
        : 0;

    // Active challenges
    const activeChallenges = await db.challenge.count({
      where: { userId: buddyId, status: "active" },
    });

    // Get 7-day range
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Bulk fetch both users' 7-day completions in 2 queries instead of 14
    const [buddyWeekCompletions, myWeekCompletions, currentUser, myTodayCompletions] =
      await Promise.all([
        db.ritualCompletion.findMany({
          where: { userId: buddyId, date: { gte: sevenDaysAgo }, completed: true },
          select: { date: true },
        }),
        db.ritualCompletion.findMany({
          where: { userId, date: { gte: sevenDaysAgo }, completed: true },
          select: { date: true },
        }),
        db.appUser.findUnique({
          where: { id: userId },
          select: {
            telegramFirstName: true,
            telegramLastName: true,
            telegramUsername: true,
            firstName: true,
            lastName: true,
            telegramPhotoUrl: true,
            photoUrl: true,
            day: true,
            streak: true,
            points: true,
          },
        }),
        db.ritualCompletion.count({
          where: { userId, date: { gte: today, lt: tomorrow }, completed: true },
        }),
      ]);

    const myName = currentUser?.telegramFirstName
      ? `${currentUser.telegramFirstName}${currentUser.telegramLastName ? ` ${currentUser.telegramLastName}` : ""}`
      : currentUser?.firstName || currentUser?.telegramUsername || "Я";

    // Build 7-day arrays from bulk data
    const buildLast7Days = (completions: { date: Date }[]) => {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const dateStr = d.toISOString().split("T")[0];
        const count = completions.filter(
          (c) => c.date.toISOString().split("T")[0] === dateStr
        ).length;
        return { date: dateStr, completions: count };
      });
    };

    const last7Days = buildLast7Days(buddyWeekCompletions);
    const myLast7Days = buildLast7Days(myWeekCompletions);

    // Build response based on buddy's privacy setting
    // full    → show everything
    // partial → hide weight & points; show streak, rituals, gym
    // streak  → show only streak, day, name
    const buddyPayload = {
      id: buddyUser.id,
      name: buddyName,
      photoUrl: buddyUser.telegramPhotoUrl || buddyUser.photoUrl,
      day: buddyUser.day,
      streak: buddyUser.streak,
      points: privacy === "full" ? buddyUser.points : null,
      privacy,
    };

    const statsPayload =
      privacy === "streak"
        ? {
            activeRituals: null,
            todayCompletions: null,
            weekWorkouts: null,
            activeChallenges: null,
            gymPeriod: null,
            latestWeight: null,
            last7Days: [],
          }
        : {
            activeRituals,
            todayCompletions,
            weekWorkouts,
            activeChallenges,
            gymPeriod: gymPeriod ? `${gymPeriod.name} (день ${gymPeriod.currentDay})` : null,
            latestWeight:
              privacy === "full" && latestWeight
                ? { weight: latestWeight.value, date: latestWeight.date }
                : null,
            last7Days,
          };

    return NextResponse.json({
      success: true,
      buddy: buddyPayload,
      me: {
        name: myName,
        photoUrl: currentUser?.telegramPhotoUrl || currentUser?.photoUrl,
        day: currentUser?.day,
        streak: currentUser?.streak,
        points: currentUser?.points,
        todayCompletions: myTodayCompletions,
        last7Days: myLast7Days,
      },
      stats: statsPayload,
    });
  } catch (error) {
    console.error("Buddy dashboard error:", error);
    return NextResponse.json({ error: "Failed to load buddy dashboard" }, { status: 500 });
  }
}
