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
        // Неделя 1: Фундамент
        { day: 1, title: 'Введение в LeakFixer', description: 'Начни свой путь к лучшей версии себя. Пойми концепцию «утечек» и как их закрывать.' },
        { day: 2, title: 'Определяем утечки энергии', description: 'Найди точки потери ресурсов: время, деньги, энергия, фокус. Запиши 3 главные утечки.' },
        { day: 3, title: 'Ставим цели правильно', description: 'SMART цели и их достижение. Создай первое направление в разделе Goals.' },
        { day: 4, title: 'Привычки: малые изменения', description: 'Как формировать полезные привычки. Добавь 2-3 привычки и начни отслеживать.' },
        { day: 5, title: 'Трекинг прогресса', description: 'Измеряй то, что хочешь улучшить. Заполни профиль: вес, рост, цели.' },
        { day: 6, title: 'Утренняя рутина', description: 'Начни день правильно. Создай утренний блок ритуалов и выполни его сегодня.' },
        { day: 7, title: 'Недельный обзор #1', description: 'Итоги первой недели: что получилось, что нет. Скорректируй ритуалы и привычки.' },
        // Неделя 2: Здоровье и фитнес
        { day: 8, title: 'Вода и питание', description: 'Отслеживай воду и калории. Настрой дневную норму воды и добавь первый приём пищи.' },
        { day: 9, title: 'Тренировки: введение', description: 'Настрой систему GYM. Создай первый тренировочный период с расписанием.' },
        { day: 10, title: 'Управление стрессом', description: 'Техники релаксации и осознанности. Добавь вечерний ритуал для восстановления.' },
        { day: 11, title: 'Тренировки: первая сессия', description: 'Проведи первую тренировку. Запиши упражнения, веса, подходы. Оцени самочувствие.' },
        { day: 12, title: 'Измерения тела', description: 'Зафиксируй параметры тела. Запиши вес, обхваты. Это точка отсчёта для прогресса.' },
        { day: 13, title: 'Сон и восстановление', description: 'Качество сна влияет на всё. Добавь вечерний ритуал и отслеживай настроение утром.' },
        { day: 14, title: 'Недельный обзор #2', description: 'Как изменилось здоровье за неделю? Сравни показатели с прошлой неделей.' },
        // Неделя 3: Продуктивность и деньги
        { day: 15, title: 'Направления жизни', description: 'Определи 3-5 сфер, которые важны. Создай направления с видением и конкретными целями.' },
        { day: 16, title: 'Челленджи', description: 'Создай 30-дневный челлендж. Привяжи к направлению и начни отслеживание.' },
        { day: 17, title: 'Финансы: основы', description: 'Настрой финансовый учёт. Создай счета и категории, внеси первые транзакции.' },
        { day: 18, title: 'Финансы: расходы', description: 'Записывай все расходы сегодня. Найди категории, где уходит больше всего.' },
        { day: 19, title: 'Заметки и рефлексия', description: 'Начни вести заметки. Рефрейминг — как переосмыслить негативные мысли в позитив.' },
        { day: 20, title: 'Контент и обучение', description: 'Добавь книгу или курс, который читаешь/проходишь сейчас. Отметь прогресс.' },
        { day: 21, title: 'Недельный обзор #3', description: 'Финансовый итог недели, прогресс по направлениям. Что скорректировать?' },
        // Неделя 4: Мастерство
        { day: 22, title: 'Навыки и качества', description: 'Добавь навыки, которые развиваешь. Оцени текущий уровень по каждому.' },
        { day: 23, title: 'Черты характера', description: 'Определи 3-5 черт характера для развития. Начни отслеживать их каждую неделю.' },
        { day: 24, title: 'Система бадди', description: 'Найди партнёра по отчётности с похожими целями. Договоритесь о формате поддержки.' },
        { day: 25, title: 'Экспорт и AI-анализ', description: 'Экспортируй свои данные и проанализируй с помощью AI. Получи персональные рекомендации.' },
        { day: 26, title: 'Продвинутые тренировки', description: 'Создай шаблоны тренировок для прогрессии весов. Планируй следующий цикл.' },
        { day: 27, title: 'Глубокая аналитика', description: 'Изучи все графики за месяц. Найди паттерны: в какие дни продуктивность выше?' },
        { day: 28, title: 'Персональные ритуалы', description: 'Создай уникальные ритуалы под свои цели. Свяжи их с навыками и направлениями.' },
        { day: 29, title: 'Настройка системы', description: 'Финальная кастомизация: темы, зоны, напоминания. Сделай приложение идеальным для себя.' },
        { day: 30, title: 'Финальный обзор', description: 'Поздравляю с завершением курса! Подведи итоги месяца и поставь цели на следующий.' },
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
