import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH - Update workout status (v1.4)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { workoutId, status } = body;

    if (!workoutId || !status) {
      return NextResponse.json({ error: "workoutId and status required" }, { status: 400 });
    }

    // Validate status transition
    const validStatuses = ["planned", "in_progress", "completed", "skipped", "rescheduled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get current workout to check transition
    const currentWorkout = await db.gymWorkout.findUnique({
      where: { id: workoutId },
    });

    if (!currentWorkout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Update workout status
    const workout = await db.gymWorkout.update({
      where: { id: workoutId },
      data: {
        status,
        completed: status === "completed",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ workout });
  } catch (error) {
    console.error("Update workout status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
