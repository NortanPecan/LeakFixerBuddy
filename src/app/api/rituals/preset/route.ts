import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPresetById, SWAMP_ESCAPE_PRESET } from '@/lib/rituals/presets'

// GET - Get available presets
export async function GET() {
  try {
    const presets = [SWAMP_ESCAPE_PRESET]
    return NextResponse.json({ presets })
  } catch (error) {
    console.error('Fetch presets error:', error)
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
  }
}

// POST - Apply preset to user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, presetId } = body

    if (!userId || !presetId) {
      return NextResponse.json({ error: 'userId and presetId required' }, { status: 400 })
    }

    const preset = getPresetById(presetId)
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    // Check if preset already applied
    const existingRituals = await db.ritual.findFirst({
      where: { userId, presetId }
    })

    if (existingRituals) {
      return NextResponse.json({ error: 'Preset already applied' }, { status: 400 })
    }

    // Create rituals from preset
    const createdRituals = []
    for (let i = 0; i < preset.rituals.length; i++) {
      const presetRitual = preset.rituals[i]
      
      const ritual = await db.ritual.create({
        data: {
          userId,
          title: presetRitual.title,
          type: 'regular',
          category: presetRitual.category,
          days: JSON.stringify(presetRitual.days),
          timeWindow: presetRitual.timeWindow,
          reminder: false,
          goalShort: presetRitual.goalShort,
          description: presetRitual.description,
          attributes: JSON.stringify(presetRitual.attributes),
          isFromPreset: true,
          presetId,
          sortOrder: i
        }
      })
      createdRituals.push(ritual)
    }

    // Initialize user attributes
    const attrKeys = ['health', 'mind', 'will']
    for (const key of attrKeys) {
      await db.userAttribute.upsert({
        where: { userId_key: { userId, key } },
        update: {},
        create: { userId, key, points: 0, level: 1 }
      })
    }

    // Award preset achievement
    await db.achievement.upsert({
      where: { userId_code: { userId, code: 'PRESET_APPLIED' } },
      update: {},
      create: { userId, code: 'PRESET_APPLIED' }
    })

    return NextResponse.json({ 
      success: true, 
      count: createdRituals.length,
      rituals: createdRituals 
    })
  } catch (error) {
    console.error('Apply preset error:', error)
    return NextResponse.json({ error: 'Failed to apply preset' }, { status: 500 })
  }
}
