import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Get lesson for current day
 * GET /api/lessons?day=<number>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const day = parseInt(searchParams.get('day') || '1')

    // Get lesson for the day
    let lesson = await db.lesson.findUnique({
      where: { day }
    })

    // If no lesson exists, create default lessons
    if (!lesson) {
      // Create default lessons
      const defaultLessons = [
        { day: 1, title: 'Введение в LeakFixer', description: 'Начни свой путь к лучшей версии себя' },
        { day: 2, title: 'Определяем утечки энергии', description: 'Найди точки потери ресурсов' },
        { day: 3, title: 'Ставим цели правильно', description: 'SMART цели и их достижение' },
        { day: 4, title: 'Привычки: малые изменения', description: 'Как формировать полезные привычки' },
        { day: 5, title: 'Трекинг прогресса', description: 'Измеряй то, что хочешь улучшить' },
        { day: 6, title: 'Утренняя рутина', description: 'Начни день правильно' },
        { day: 7, title: 'Отдых и восстановление', description: 'Важность качественного отдыха' },
        { day: 8, title: 'Питание: основы', description: 'Топливо для твоего тела' },
        { day: 9, title: 'Физическая активность', description: 'Движение — это жизнь' },
        { day: 10, title: 'Управление стрессом', description: 'Техники релаксации' },
      ]

      // Create lessons that don't exist
      for (const lessonData of defaultLessons) {
        await db.lesson.upsert({
          where: { day: lessonData.day },
          create: lessonData,
          update: lessonData
        })
      }

      // Try to get the lesson again
      lesson = await db.lesson.findUnique({ where: { day } })
    }

    // Get upcoming lessons
    const upcomingLessons = await db.lesson.findMany({
      where: { day: { gt: day } },
      orderBy: { day: 'asc' },
      take: 5
    })

    return NextResponse.json({
      lesson: lesson ? {
        id: lesson.id,
        day: lesson.day,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        content: lesson.content
      } : null,
      upcomingLessons: upcomingLessons.map(l => ({
        id: l.id,
        day: l.day,
        title: l.title,
        description: l.description
      }))
    })
  } catch (error) {
    console.error('Get lesson error:', error)
    return NextResponse.json(
      { error: 'Failed to get lesson' },
      { status: 500 }
    )
  }
}
