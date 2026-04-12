import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Fetch workout with exercises (v1.5: auto-create sets if missing)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const workout = await db.gymWorkout.findUnique({
      where: { id },
      include: {
        workoutTemplate: true,
        exercises: {
          orderBy: { order: "asc" },
          include: {
            template: true,
            workoutTemplateExercise: {
              include: {
                exerciseTemplate: true,
              },
            },
            sets: {
              orderBy: { setNum: "asc" },
            },
          },
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // v1.5: Auto-create sets for exercises that don't have any
    for (const exercise of workout.exercises) {
      if (!exercise.sets || exercise.sets.length === 0) {
        // Determine target sets and reps
        const targetSets =
          exercise.targetSets ||
          exercise.workoutTemplateExercise?.defaultSets ||
          exercise.template?.defaultSets ||
          4;
        const targetReps =
          exercise.targetReps ||
          exercise.workoutTemplateExercise?.defaultReps ||
          exercise.template?.defaultReps;
        const weight =
          exercise.weight ||
          exercise.workoutTemplateExercise?.defaultWeight ||
          exercise.template?.currentWeight;

        // Create sets
        const setsData: {
          exerciseId: string;
          setNum: number;
          weight: number | null | undefined;
          reps: number | null | undefined;
          completed: boolean;
          isWarmup: boolean;
        }[] = [];
        for (let i = 1; i <= targetSets; i++) {
          setsData.push({
            exerciseId: exercise.id,
            setNum: i,
            weight,
            reps: targetReps,
            completed: false,
            isWarmup: false,
          });
        }

        if (setsData.length > 0) {
          await db.gymExerciseSet.createMany({ data: setsData });
        }
      }
    }

    // Re-fetch with updated sets
    const updatedWorkout = await db.gymWorkout.findUnique({
      where: { id },
      include: {
        workoutTemplate: true,
        exercises: {
          orderBy: { order: "asc" },
          include: {
            template: true,
            workoutTemplateExercise: {
              include: {
                exerciseTemplate: true,
              },
            },
            sets: {
              orderBy: { setNum: "asc" },
            },
          },
        },
      },
    });

    if (!updatedWorkout) {
      return NextResponse.json({ error: "Workout not found after update" }, { status: 404 });
    }

    // Parse muscle groups if stored as JSON string
    let muscleGroups: string[] = [];
    if (updatedWorkout.muscleGroups) {
      try {
        muscleGroups = JSON.parse(updatedWorkout.muscleGroups);
      } catch {
        muscleGroups = [];
      }
    }

    return NextResponse.json({
      workout: {
        ...updatedWorkout,
        muscleGroups,
        exercises: updatedWorkout.exercises.map((e) => ({
          ...e,
          sets: e.sets,
        })),
      },
    });
  } catch (error) {
    console.error("Fetch workout error:", error);
    return NextResponse.json({ error: "Failed to fetch workout" }, { status: 500 });
  }
}
