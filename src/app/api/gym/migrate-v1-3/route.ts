import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Migration script: v1.2 → v1.3
 *
 * This endpoint migrates existing GymWorkout data to add:
 * - cycleNumber: which cycle the workout belongs to (1-8)
 * - workoutNum: which workout in the cycle (1-4)
 *
 * It also ensures existing data remains intact.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get("confirm") === "true";

    if (!confirm) {
      return NextResponse.json({
        message: "Migration requires confirm=true parameter",
        hint: "Add ?confirm=true to the URL to run migration",
      });
    }

    // Get all periods
    const periods = await db.gymPeriod.findMany({
      include: {
        workouts: {
          orderBy: { date: "asc" },
        },
      },
    });

    const results = {
      periodsProcessed: 0,
      workoutsUpdated: 0,
      errors: [] as string[],
    };

    for (const period of periods) {
      try {
        // Parse daySchedule
        let daySchedule: Array<{ type: string; dayNum: number; workoutNum?: number }> = [];
        if (period.daySchedule) {
          try {
            daySchedule = JSON.parse(period.daySchedule);
          } catch {
            results.errors.push(`Period ${period.id}: Failed to parse daySchedule`);
            continue;
          }
        }

        // Calculate workouts per cycle from daySchedule
        const workoutsInSchedule = daySchedule.filter((d) => d.type === "workout");
        const workoutsPerCycle = workoutsInSchedule.length || period.workoutsPerCycle;

        // Update each workout
        for (let i = 0; i < period.workouts.length; i++) {
          const workout = period.workouts[i];

          // Calculate cycleNumber and workoutNum based on position
          // Each cycle has 'workoutsPerCycle' workouts
          const positionInPeriod = i;
          const cycleNumber = Math.floor(positionInPeriod / workoutsPerCycle) + 1;

          // workoutNum is the position within the cycle
          const positionInCycle = positionInPeriod % workoutsPerCycle;

          // Find workoutNum from daySchedule if available
          let workoutNum = positionInCycle + 1;
          if (daySchedule.length > 0) {
            // Map position to actual workoutNum from schedule
            const scheduledWorkout = workoutsInSchedule[positionInCycle];
            if (scheduledWorkout?.workoutNum) {
              workoutNum = scheduledWorkout.workoutNum;
            }
          }

          // Update workout
          await db.gymWorkout.update({
            where: { id: workout.id },
            data: {
              cycleNumber,
              workoutNum,
            },
          });

          results.workoutsUpdated++;
        }

        results.periodsProcessed++;
      } catch (error) {
        results.errors.push(
          `Period ${period.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check migration status
 */
export async function GET(request: NextRequest) {
  try {
    // Count workouts with and without cycleNumber
    const totalWorkouts = await db.gymWorkout.count();
    const migratedWorkouts = await db.gymWorkout.count({
      where: { cycleNumber: { not: null } },
    });
    const unmigratedWorkouts = totalWorkouts - migratedWorkouts;

    // Check if migration is needed
    const needsMigration = unmigratedWorkouts > 0;

    return NextResponse.json({
      totalWorkouts,
      migratedWorkouts,
      unmigratedWorkouts,
      needsMigration,
      hint: needsMigration
        ? "POST /api/gym/migrate-v1-3?confirm=true to run migration"
        : "All workouts already migrated",
    });
  } catch (error) {
    console.error("Migration status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
