import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { 
  journeyProgress, 
  journeyLessons, 
  journeyTasks,
  journeyUnlocks,
  journeyAchievements 
} from '@/lib/supabase-rest'
import type { JourneyProgress, JourneyLesson, JourneyTask } from '@/lib/database.types'

// GET /api/journey - Get user's journey progress
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create journey progress using REST API
    let progressResult = await journeyProgress()
      .select('*')
      .eq('user_id', user.id)
      .getSingle<JourneyProgress>()

    let progress = progressResult.data

    if (!progress) {
      // Create new progress
      const newProgressData = {
        user_id: user.id,
        current_day: 1,
        started_at: new Date().toISOString(),
      }
      
      const createResult = await journeyProgress().insert(newProgressData)
      
      if (createResult.error || !createResult.data || createResult.data.length === 0) {
        console.error('Error creating progress:', createResult.error)
        return NextResponse.json(
          { error: 'Failed to create progress' },
          { status: 500 }
        )
      }
      
      progress = createResult.data[0]
    }

    // Get tasks for this progress
    const tasksResult = await journeyTasks()
      .select('*')
      .eq('progress_id', progress.id)
      .get()

    // Get unlocks for this progress
    const unlocksResult = await journeyUnlocks()
      .select('*')
      .eq('progress_id', progress.id)
      .get()

    // Get achievements for this progress
    const achievementsResult = await journeyAchievements()
      .select('*')
      .eq('progress_id', progress.id)
      .get()

    // Get current lesson
    const lessonResult = await journeyLessons()
      .select('*')
      .eq('day', progress.current_day)
      .getSingle<JourneyLesson>()

    const currentLesson = lessonResult.data

    // Calculate progress percentage
    const progressPercent = Math.round((progress.current_day / 30) * 100)

    // Get completed days count
    const completedTasks = tasksResult.data || []
    const completedDaysSet = new Set(completedTasks.map(t => t.day))
    const completedDaysCount = completedDaysSet.size

    // Calculate XP for current streak bonus
    let streakMultiplier = 1
    if (progress.streak >= 30) streakMultiplier = 5
    else if (progress.streak >= 21) streakMultiplier = 3
    else if (progress.streak >= 14) streakMultiplier = 2.5
    else if (progress.streak >= 7) streakMultiplier = 2

    return NextResponse.json({
      progress: {
        ...progress,
        progressPercent,
        completedDaysCount,
        streakMultiplier,
        tasks: tasksResult.data || [],
        unlocks: unlocksResult.data || [],
        achievements: achievementsResult.data || [],
      },
      currentLesson,
    })
  } catch (error) {
    console.error('Error fetching journey progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}

// POST /api/journey - Start journey with goal selection
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    console.log('[Journey POST] User:', user)
    
    if (!user) {
      console.log('[Journey POST] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goal } = body
    console.log('[Journey POST] Goal:', goal, 'UserId:', user.id)

    // Check if already started
    const existingResult = await journeyProgress()
      .select('*')
      .eq('user_id', user.id)
      .getSingle<JourneyProgress>()
    
    console.log('[Journey POST] Existing result:', { 
      data: existingResult.data, 
      error: existingResult.error 
    })

    if (existingResult.error && existingResult.error.code !== 'NOT_FOUND') {
      console.error('[Journey POST] Error checking existing progress:', existingResult.error)
      return NextResponse.json(
        { error: 'Failed to check progress', details: existingResult.error },
        { status: 500 }
      )
    }

    // If progress exists with a goal, journey already started
    if (existingResult.data && existingResult.data.goal) {
      console.log('[Journey POST] Journey already started for user:', user.id)
      return NextResponse.json({ error: 'Journey already started', progress: existingResult.data }, { status: 400 })
    }

    // If progress exists WITHOUT a goal, update it with the goal
    if (existingResult.data && !existingResult.data.goal) {
      console.log('[Journey POST] Updating existing progress with goal:', goal)
      const updateResult = await journeyProgress()
        .eq('user_id', user.id)
        .update({ goal: goal || 'all' })
      
      if (updateResult.error || !updateResult.data) {
        console.error('[Journey POST] Error updating progress:', updateResult.error)
        return NextResponse.json(
          { error: 'Failed to update goal', details: updateResult.error },
          { status: 500 }
        )
      }
      
      const progress = updateResult.data[0]
      
      // Create initial unlocks if not exist
      const existingUnlocks = await journeyUnlocks()
        .select('*')
        .eq('progress_id', progress.id)
        .get()
      
      if (!existingUnlocks.data || existingUnlocks.data.length === 0) {
        await journeyUnlocks().insert([
          { progress_id: progress.id, feature: 'profile' },
          { progress_id: progress.id, feature: 'mood' },
          { progress_id: progress.id, feature: 'weight' },
        ])
      }
      
      console.log('[Journey POST] Updated progress:', progress)
      return NextResponse.json({ progress })
    }

    // Create progress with goal
    const progressData = {
      user_id: user.id,
      goal: goal || 'all',
      current_day: 1,
      started_at: new Date().toISOString(),
    }
    
    console.log('[Journey POST] Creating progress with data:', progressData)
    const createResult = await journeyProgress().insert(progressData)
    console.log('[Journey POST] Create result:', { data: createResult.data, error: createResult.error })
    
    if (createResult.error || !createResult.data) {
      console.error('[Journey POST] Error creating progress:', createResult.error)
      return NextResponse.json(
        { error: 'Failed to start journey', details: createResult.error },
        { status: 500 }
      )
    }
    
    const progress = createResult.data[0]
    console.log('[Journey POST] Created progress:', progress)

    // Unlock initial features
    const unlocksResult = await journeyUnlocks().insert([
      { progress_id: progress.id, feature: 'profile' },
      { progress_id: progress.id, feature: 'mood' },
      { progress_id: progress.id, feature: 'weight' },
    ])
    
    if (unlocksResult.error) {
      console.error('[Journey POST] Error creating unlocks:', unlocksResult.error)
    }

    console.log('[Journey POST] Success! Returning progress')
    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error starting journey:', error)
    return NextResponse.json(
      { error: 'Failed to start journey' },
      { status: 500 }
    )
  }
}

// PUT /api/journey - Update goal or complete day
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goal, completeDay } = body

    const progressResult = await journeyProgress()
      .select('*')
      .eq('user_id', user.id)
      .getSingle<JourneyProgress>()

    if (!progressResult.data) {
      return NextResponse.json({ error: 'Journey not started' }, { status: 404 })
    }

    const progress = progressResult.data

    if (goal) {
      const updateResult = await journeyProgress()
        .eq('user_id', user.id)
        .update({ goal })
      
      if (updateResult.error || !updateResult.data) {
        return NextResponse.json(
          { error: 'Failed to update goal' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ progress: updateResult.data[0] })
    }

    if (completeDay) {
      // Get lesson for XP reward
      const lessonResult = await journeyLessons()
        .select('*')
        .eq('day', progress.current_day)
        .getSingle<JourneyLesson>()

      const lesson = lessonResult.data

      // Calculate XP with streak bonus
      let streakMultiplier = 1
      if (progress.streak >= 30) streakMultiplier = 5
      else if (progress.streak >= 21) streakMultiplier = 3
      else if (progress.streak >= 14) streakMultiplier = 2.5
      else if (progress.streak >= 7) streakMultiplier = 2

      const xpReward = Math.round((lesson?.reward_xp || 0) * streakMultiplier)

      // Advance to next day
      const updateData = {
        current_day: Math.min(progress.current_day + 1, 30),
        total_xp: progress.total_xp + xpReward,
        streak: progress.streak + 1,
        last_active_at: new Date().toISOString(),
        completed_at: progress.current_day === 30 ? new Date().toISOString() : null,
      }
      
      const updatedResult = await journeyProgress()
        .eq('id', progress.id)
        .update(updateData)
      
      if (updatedResult.error || !updatedResult.data) {
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        )
      }
      
      const updated = updatedResult.data[0]

      // Get existing unlocks
      const existingUnlocksResult = await journeyUnlocks()
        .select('feature')
        .eq('progress_id', progress.id)
        .get()
      
      const existingUnlocks = (existingUnlocksResult.data || []).map(u => u.feature)

      // Unlock features for next day
      if (lesson?.unlocks) {
        const unlocks = JSON.parse(lesson.unlocks)
        if (Array.isArray(unlocks) && unlocks.length > 0) {
          const newUnlocks = unlocks.filter((f: string) => !existingUnlocks.includes(f))

          if (newUnlocks.length > 0) {
            await journeyUnlocks().insert(
              newUnlocks.map((feature: string) => ({
                progress_id: progress.id,
                feature,
              }))
            )
          }
        }
      }

      // Check for achievement
      if (lesson?.achievement) {
        const existingAchievementResult = await journeyAchievements()
          .select('*')
          .eq('progress_id', progress.id)
          .eq('code', lesson.achievement)
          .getSingle()

        if (!existingAchievementResult.data) {
          await journeyAchievements().insert({
            progress_id: progress.id,
            code: lesson.achievement,
          })
        }
      }

      // Get updated unlocks and achievements
      const unlocksResult = await journeyUnlocks()
        .select('*')
        .eq('progress_id', progress.id)
        .get()
      
      const achievementsResult = await journeyAchievements()
        .select('*')
        .eq('progress_id', progress.id)
        .get()

      return NextResponse.json({
        progress: {
          ...updated,
          unlocks: unlocksResult.data || [],
          achievements: achievementsResult.data || [],
        },
        xpEarned: xpReward,
        achievement: lesson?.achievement,
        newUnlocks: lesson?.unlocks ? JSON.parse(lesson.unlocks) : [],
      })
    }

    return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
  } catch (error) {
    console.error('Error updating journey:', error)
    return NextResponse.json(
      { error: 'Failed to update journey' },
      { status: 500 }
    )
  }
}
