import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workoutId } = body;

    if (!workoutId) {
      return NextResponse.json({ error: "workoutId is required" }, { status: 400 });
    }

    // Update workout: set completed = false, status = in_progress
    const workout = await db.gymWorkout.update({
      where: { id: workoutId },
      data: {
        completed: false,
        status: "in_progress",
      },
    });

    return NextResponse.json({ success: true, workout });
  } catch (error) {
    console.error("Failed to undo workout completion:", error);
    return NextResponse.json({ error: "Failed to undo completion" }, { status: 500 });
  }
}
