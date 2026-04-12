import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/tasks/reorder - Batch update tasks order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks } = body as { tasks: Array<{ id: string; order: number }> };

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "tasks array is required" }, { status: 400 });
    }

    // Update all tasks in a transaction
    await db.$transaction(
      tasks.map(({ id, order }) =>
        db.task.update({
          where: { id },
          data: { order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 });
  }
}
