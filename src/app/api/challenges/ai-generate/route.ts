import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'

// Leak type → base template for challenge
const LEAK_TEMPLATES: Record<string, { name: string; duration: number; zone: string; type: string; config: Record<string, unknown> }> = {
  no_gym:              { name: '7 тренировок за 2 недели',  duration: 14, zone: 'health',    type: 'ritual', config: { targetCount: 7, periodDays: 14 } },
  ritual_erosion:      { name: '21 день ритуалов',          duration: 21, zone: 'health',    type: 'ritual', config: {} },
  low_energy:          { name: '14 дней энергии',           duration: 14, zone: 'health',    type: 'ritual', config: {} },
  high_spend_days:     { name: 'Месяц финансовой дисциплины', duration: 30, zone: 'savings', type: 'custom', config: { targetCount: 30, periodDays: 30, actionType: 'days' } },
  poor_sleep:          { name: '7 дней качественного сна',  duration: 7,  zone: 'life',     type: 'ritual', config: {} },
  overeating:          { name: '14 дней без срывов',        duration: 14, zone: 'health',    type: 'ritual', config: {} },
  procrastination:     { name: '21 день продуктивности',    duration: 21, zone: 'leakfixer', type: 'custom', config: { targetCount: 21, periodDays: 21, actionType: 'days' } },
  emotional_eating:    { name: '14 дней осознанного питания', duration: 14, zone: 'health',  type: 'ritual', config: {} },
  skipped_rituals:     { name: '30 дней без пропусков',     duration: 30, zone: 'health',    type: 'ritual', config: {} },
  default:             { name: '21 день роста',             duration: 21, zone: 'leakfixer', type: 'custom', config: { targetCount: 21, periodDays: 21, actionType: 'days' } },
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
