import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { journeyLessons, journeyProgress, journeyTasks } from "@/lib/supabase-rest";
import type { JourneyLesson, JourneyProgress, JourneyTask } from "@/lib/database.types";

// GET /api/journey/day/[day] - Get lesson for a specific day
export async function GET(request: NextRequest, { params }: { params: Promise<{ day: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { day: dayParam } = await params;
    const day = parseInt(dayParam, 10);

    if (isNaN(day) || day < 1 || day > 30) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }

    // Get lesson using REST API
    const lessonResult = await journeyLessons()
      .select("*")
      .eq("day", day)
      .getSingle<JourneyLesson>();

    if (!lessonResult.data) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const lesson = lessonResult.data;

    // Get user progress
    const progressResult = await journeyProgress()
      .select("*")
      .eq("user_id", user.id)
      .getSingle<JourneyProgress>();

    const progress = progressResult.data;

    // Get tasks for this day
    let dayTasks: JourneyTask[] = [];
    if (progress) {
      const tasksResult = await journeyTasks()
        .select("*")
        .eq("progress_id", progress.id)
        .eq("day", day)
        .get();

      dayTasks = tasksResult.data || [];
    }

    // Parse tasks and add completion status
    const tasks = JSON.parse(lesson.tasks || "[]").map(
      (task: {
        id: string;
        type: string;
        target: string;
        description: string;
        reward: number;
        autoVerify: boolean;
        count?: number;
      }) => {
        const completedTask = dayTasks.find((t) => t.task_id === task.id);
        return {
          ...task,
          completed: completedTask?.completed || false,
          completedAt: completedTask?.completed_at || null,
        };
      }
    );

    // Check if all tasks completed
    const allTasksCompleted = tasks.every((t: { completed: boolean }) => t.completed);

    return NextResponse.json({
      lesson: {
        ...lesson,
        tasks,
        parsedQuote: lesson.quote,
        parsedTip: lesson.tip,
        parsedUnlocks: lesson.unlocks ? JSON.parse(lesson.unlocks) : [],
      },
      progress: progress
        ? {
            current_day: progress.current_day,
            total_xp: progress.total_xp,
            streak: progress.streak,
          }
        : null,
      allTasksCompleted,
      canAccess: !progress || day <= progress.current_day,
    });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json({ error: "Failed to fetch lesson" }, { status: 500 });
  }
}
