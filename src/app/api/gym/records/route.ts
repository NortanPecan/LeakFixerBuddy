import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Return max weight per exercise template for a user (Personal Records)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, records, topPRs })
  } catch (error) {
    console.error('Records error:', error)
    return NextResponse.json({ error: 'Failed to get records' }, { status: 500 })
  }
}
