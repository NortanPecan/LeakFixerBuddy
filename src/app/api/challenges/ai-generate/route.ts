import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'
import { requireSelf } from '@/lib/server-auth'

// Leak type → base template for challenge
const LEAK_TEMPLATES: Record<string, { name: string; duration: number; zone: string; type: string; config: Record<string, unknown> }> = {
  no_gym:              { name: '10 тренировок за месяц',    duration: 30, zone: 'health',    type: 'tracker', config: { metric: 'gym_count', target: 10 } },
  gym_dropout:         { name: '10 тренировок за месяц',    duration: 30, zone: 'health',    type: 'tracker', config: { metric: 'gym_count', target: 10 } },
  ritual_erosion:      { name: '21 день ритуалов',          duration: 21, zone: 'health',    type: 'ritual',  config: {} },
  ritual_consistency:  { name: '21 день ритуалов',          duration: 21, zone: 'health',    type: 'ritual',  config: {} },
  low_energy:          { name: '14 дней сна 7+ часов',      duration: 14, zone: 'health',    type: 'tracker', config: { metric: 'sleep_avg', target: 7 } },
  chronic_low_energy:  { name: '14 дней сна 7+ часов',      duration: 14, zone: 'health',    type: 'tracker', config: { metric: 'sleep_avg', target: 7 } },
  sleep_deficit:       { name: '14 дней сна 7+ часов',      duration: 14, zone: 'health',    type: 'tracker', config: { metric: 'sleep_avg', target: 7 } },
  high_spend_days:     { name: 'Месяц финансовой дисциплины', duration: 30, zone: 'savings', type: 'custom',  config: { targetCount: 30, periodDays: 30, actionType: 'days' } },
  expense_spike:       { name: 'Месяц финансовой дисциплины', duration: 30, zone: 'savings', type: 'custom',  config: { targetCount: 30, periodDays: 30, actionType: 'days' } },
  calorie_spikes:      { name: '14 дней без срывов',        duration: 14, zone: 'health',    type: 'tracker', config: { metric: 'no_food_bad', target: 12 } },
  missed_checkins:     { name: '7 дней нормы воды',         duration: 7,  zone: 'health',    type: 'tracker', config: { metric: 'water_streak', target: 7 } },
  weekend_ritual_drop: { name: '30 дней без пропусков',     duration: 30, zone: 'health',    type: 'ritual',  config: {} },
  high_stress:         { name: '14 дней настроения 6+',     duration: 14, zone: 'health',    type: 'tracker', config: { metric: 'mood_avg', target: 6 } },
  default:             { name: '21 день роста',             duration: 21, zone: 'leakfixer', type: 'custom',  config: { targetCount: 21, periodDays: 21, actionType: 'days' } },
}

const AI_CHALLENGE_SYSTEM = `Ты генерируешь персональный челлендж для борьбы с паттерном поведения ("ликом").
Ответь ТОЛЬКО JSON без markdown блоков:
{"name":"Название челленджа (до 40 символов)","description":"Мотивирующее описание (1-2 предложения, до 120 символов)"}
Название должно быть конкретным, мотивирующим, на русском.`

// POST /api/challenges/ai-generate
// body: { userId, leakType?, leakMessage? }
export async function POST(request: NextRequest) {
  try {
    const { userId, leakType, leakMessage } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    await requireSelf(request, userId)

    const activeCount = await db.challenge.count({ where: { userId, status: 'active' } })
    if (activeCount >= 3) {
      return NextResponse.json({ error: 'Максимум 3 активных челленджа', code: 'LIMIT_REACHED' }, { status: 400 })
    }

    // Get latest UserAiPattern if leakType not provided
    let resolvedLeakType = leakType
    if (!resolvedLeakType) {
      const latest = await db.userAiPattern.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })
      resolvedLeakType = latest?.leakType ?? 'default'
    }

    const template = LEAK_TEMPLATES[resolvedLeakType] ?? LEAK_TEMPLATES.default

    // Ask AI for personalized name/description
    let name        = template.name
    let description = `Преодолей свой ${resolvedLeakType} за ${template.duration} дней. Маленькие шаги каждый день.`

    try {
      const userMessage = `Лик пользователя: "${resolvedLeakType}"\nОписание: "${leakMessage ?? resolvedLeakType}"\nБазовый шаблон: "${template.name}", ${template.duration} дней`
      const { text } = await callAI(AI_CHALLENGE_SYSTEM, userMessage, {
        userId,
        callType: 'ai-challenge',
        leakType: resolvedLeakType,
      })
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      if (parsed.name)        name        = parsed.name
      if (parsed.description) description = parsed.description
    } catch {
      // Fallback to template defaults — not critical
    }

    // Create the challenge
    const challenge = await db.challenge.create({
      data: {
        userId,
        name,
        description,
        type:     template.type,
        zone:     template.zone,
        category: 'lifestyle',
        duration: template.duration,
        config:   JSON.stringify({ ...template.config, leakType: resolvedLeakType, aiGenerated: true }),
        status:   'active',
      },
    })

    return NextResponse.json({ success: true, challenge, name, description })
  } catch (error) {
    console.error('[challenges/ai-generate]', error)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
