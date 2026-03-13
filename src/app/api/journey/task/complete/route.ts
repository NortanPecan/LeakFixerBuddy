import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { journeyProgress, journeyTasks, journeyLessons } from '@/lib/supabase-rest'
import type { JourneyProgress, JourneyTask, JourneyLesson } from '@/lib/database.types'

// POST /api/journey/task/complete - Complete a task
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { day, taskId, xpEarned } = body

    if (!day || !taskId) {
      return NextResponse.json({ error: 'Missing day or taskId' }, { status: 400 })
    }

    // Get user progress
    const progressResult = await journeyProgress()
      .select('*')
      .eq('user_id', user.id)
      .getSingle<JourneyProgress>()

    if (!progressResult.data) {
      return NextResponse.json({ error: 'Journey not started' }, { status: 404 })
    }

    const progress = progressResult.data

    // Check if task already completed
    const existingTaskResult = await journeyTasks()
      .select('*')
      .eq('progress_id', progress.id)
      .eq('day', day)
      .eq('task_id', taskId)
      .getSingle<JourneyTask>()

    if (existingTaskResult.data?.completed) {
      return NextResponse.json({
        error: 'Task already completed',
        task: existingTaskResult.data,
      })
    }

    // Complete the task using upsert
    const taskData = {
      progress_id: progress.id,
      day,
      task_id: taskId,
      completed: true,
      completed_at: new Date().toISOString(),
      xp_earned: xpEarned || 0,
    }

    const upsertResult = await journeyTasks()
      .upsert(taskData, { onConflict: 'progress_id,day,task_id' })

    if (upsertResult.error || !upsertResult.data) {
      console.error('Error completing task:', upsertResult.error)
      return NextResponse.json(
        { error: 'Failed to complete task' },
        { status: 500 }
      )
    }

    const task = upsertResult.data[0]

    // Check if all tasks for this day are completed
    const lessonResult = await journeyLessons()
      .select('*')
      .eq('day', day)
      .getSingle<JourneyLesson>()

    if (lessonResult.data) {
      const allTasks = JSON.parse(lessonResult.data.tasks || '[]')
      
      // Get all completed tasks for this day
      const completedTasksResult = await journeyTasks()
        .select('*')
        .eq('progress_id', progress.id)
        .eq('day', day)
        .eq('completed', true)
        .get()

      const completedCount = (completedTasksResult.data || []).length
      const allCompleted = completedCount >= allTasks.length

      return NextResponse.json({
        task,
        allTasksCompleted: allCompleted,
        totalCompleted: completedCount,
        totalTasks: allTasks.length,
      })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}

// GET /api/journey/task/complete - Check task status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const day = searchParams.get('day')
    const taskId = searchParams.get('taskId')

    if (!day || !taskId) {
      return NextResponse.json({ error: 'Missing day or taskId' }, { status: 400 })
    }

    // Get progress
    const progressResult = await journeyProgress()
      .select('*')
      .eq('user_id', user.id)
      .getSingle<JourneyProgress>()

    if (!progressResult.data) {
      return NextResponse.json({
        completed: false,
        task: null,
      })
    }

    // Get task
    const taskResult = await journeyTasks()
      .select('*')
      .eq('progress_id', progressResult.data.id)
      .eq('day', parseInt(day, 10))
      .eq('task_id', taskId)
      .getSingle<JourneyTask>()

    return NextResponse.json({
      completed: taskResult.data?.completed || false,
      task: taskResult.data || null,
    })
  } catch (error) {
    console.error('Error checking task:', error)
    return NextResponse.json(
      { error: 'Failed to check task' },
      { status: 500 }
    )
  }
}
