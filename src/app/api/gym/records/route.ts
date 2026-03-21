import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

// GET - Return max weight per exercise template for a user (Personal Records)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    // Max weight per template across all periods, with exercise name
    const rows = await db.$queryRaw<Array<{ template_id: string; max_weight: number; name: string }>>`
      SELECT ge.template_id, MAX(ges.weight) AS max_weight, get.name
      FROM gym_exercise_sets ges
      JOIN gym_exercises ge ON ges.exercise_id = ge.id
      JOIN gym_workouts gw ON ge.workout_id = gw.id
      JOIN gym_periods gp ON gw.period_id = gp.id
      JOIN gym_exercise_templates get ON ge.template_id = get.id
      WHERE gp.user_id = ${userId}::uuid
        AND ge.template_id IS NOT NULL
        AND ges.weight IS NOT NULL
      GROUP BY ge.template_id, get.name
      ORDER BY max_weight DESC
    `

    const records: Record<string, number> = {}
    const topPRs: Array<{ templateId: string; name: string; maxWeight: number }> = []
    for (const row of rows) {
      records[row.template_id] = Number(row.max_weight)
      topPRs.push({ templateId: row.template_id, name: row.name, maxWeight: Number(row.max_weight) })
    }

    // Historical weight progression for top 5 exercises (last 10 workouts each)
    const top5Ids = topPRs.slice(0, 5).map(r => r.templateId)
    const history: Record<string, Array<{ date: string; weight: number }>> = {}

    if (top5Ids.length > 0) {
      const histRows = await db.$queryRaw<Array<{ template_id: string; workout_date: string; max_weight: number }>>`
        SELECT ge.template_id,
               gw.workout_date::text AS workout_date,
               MAX(ges.weight)       AS max_weight
        FROM gym_exercise_sets ges
        JOIN gym_exercises ge   ON ges.exercise_id = ge.id
        JOIN gym_workouts gw    ON ge.workout_id   = gw.id
        JOIN gym_periods gp     ON gw.period_id    = gp.id
        WHERE gp.user_id = ${userId}::uuid
          AND ge.template_id = ANY(${top5Ids}::uuid[])
          AND ges.weight IS NOT NULL
        GROUP BY ge.template_id, gw.workout_date
        ORDER BY ge.template_id, gw.workout_date
      `
      for (const r of histRows) {
        if (!history[r.template_id]) history[r.template_id] = []
        history[r.template_id].push({ date: r.workout_date, weight: Number(r.max_weight) })
      }
      // Keep last 10 per exercise
      for (const id of Object.keys(history)) {
        history[id] = history[id].slice(-10)
      }
    }

    return NextResponse.json({ success: true, records, topPRs, history })
  } catch (error) {
    console.error('Records error:', error)
    return NextResponse.json({ error: 'Failed to get records' }, { status: 500 })
  }
}
