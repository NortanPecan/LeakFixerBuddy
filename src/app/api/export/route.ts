import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Export data as markdown
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const entities = searchParams.get('entities')?.split(',') || ['rituals', 'tasks', 'challenges', 'skills', 'traits', 'notes']

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    // Ensure dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    const dateRange = `${formatDate(start)} — ${formatDate(end)}`

    let markdown = `# Сводка за период ${dateRange}\n\n`

    // Fetch and format each entity type
    if (entities.includes('rituals')) {
      const rituals = await db.ritual.findMany({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' }
      })

      const completions = await db.ritualCompletion.findMany({
        where: { 
          userId,
          date: { gte: start, lte: end }
        }
      })

      const completedCount = completions.filter(c => c.completed).length
      const totalPossible = rituals.length * Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const completionRate = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0

      // Find most stable and most missed rituals
      const ritualStats = new Map<string, { completed: number; total: number }>()
      rituals.forEach(r => ritualStats.set(r.id, { completed: 0, total: 0 }))
      completions.forEach(c => {
        const stat = ritualStats.get(c.ritualId)
        if (stat) {
          stat.total++
          if (c.completed) stat.completed++
        }
      })

      const ritualCompletionRates = Array.from(ritualStats.entries()).map(([id, stats]) => {
        const ritual = rituals.find(r => r.id === id)
        return {
          name: ritual?.title || 'Unknown',
          rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
        }
      })

      const topStable = ritualCompletionRates.filter(r => r.rate > 0).sort((a, b) => b.rate - a.rate).slice(0, 3)
      const mostMissed = ritualCompletionRates.filter(r => r.rate < 100).sort((a, b) => a.rate - b.rate).slice(0, 3)

      markdown += `## Ритуалы\n`
      markdown += `- Выполнено ${completionRate}% от всех запланированных\n`
      if (topStable.length > 0) {
        markdown += `- Топ ритуалов по стабильности: ${topStable.map(r => `${r.name} (${r.rate}%)`).join(', ')}\n`
      }
      if (mostMissed.length > 0) {
        markdown += `- Ритуалы, которые чаще всего пропускались: ${mostMissed.map(r => `${r.name} (${r.rate}%)`).join(', ')}\n`
      }
      markdown += `- Активных ритуалов: ${rituals.length}\n\n`
    }

    if (entities.includes('tasks')) {
      const tasks = await db.task.findMany({
        where: { 
          userId,
          createdAt: { gte: start, lte: end }
        }
      })

      const completed = tasks.filter(t => t.status === 'done').length
      const pending = tasks.filter(t => t.status === 'todo').length
      const overdue = tasks.filter(t => t.status === 'todo' && t.date && new Date(t.date) < new Date()).length

      markdown += `## Задачи\n`
      markdown += `- Всего задач за период: ${tasks.length}\n`
      markdown += `- Выполнено: ${completed}\n`
      markdown += `- В ожидании: ${pending}\n`
      markdown += `- Просрочено: ${overdue}\n\n`
    }

    if (entities.includes('challenges')) {
      const challenges = await db.challenge.findMany({
        where: { userId, status: 'active' },
        include: { progressDetails: true }
      })

      markdown += `## Челенджи\n`
      if (challenges.length === 0) {
        markdown += `- Нет активных челенджей\n\n`
      } else {
        challenges.forEach(c => {
          const progress = c.progressDetails[0]
          markdown += `- **${c.name}**: ${c.progress}% (дней выполнено: ${progress?.daysCompleted || 0}/${c.duration})\n`
        })
        markdown += `\n`
      }
    }

    if (entities.includes('skills')) {
      const skills = await db.skill.findMany({
        where: { userId, isArchived: false },
        orderBy: [{ importance: 'desc' }, { level: 'desc' }]
      })

      const recentHistory = await db.skillHistory.findMany({
        where: {
          skill: { userId },
          createdAt: { gte: start, lte: end }
        },
        include: { skill: true }
      })

      const skillProgress = new Map<string, number>()
      recentHistory.forEach(h => {
        const current = skillProgress.get(h.skillId) || 0
        skillProgress.set(h.skillId, current + (h.newLevel - h.oldLevel))
      })

      markdown += `## Навыки\n`
      if (skills.length === 0) {
        markdown += `- Навыков пока нет\n\n`
      } else {
        const withProgress = Array.from(skillProgress.entries())
          .map(([id, progress]) => {
            const skill = skills.find(s => s.id === id)
            return { name: skill?.name || 'Unknown', progress }
          })
          .filter(s => s.progress > 0)

        if (withProgress.length > 0) {
          markdown += `- Навыки с прогрессом за период: ${withProgress.map(s => `${s.name} (+${s.progress} ур.)`).join(', ')}\n`
        }
        markdown += `- Всего навыков: ${skills.length}\n`
        markdown += `- Важные (важность 3): ${skills.filter(s => s.importance === 3).map(s => s.name).join(', ') || 'нет'}\n\n`
      }
    }

    if (entities.includes('traits')) {
      const traits = await db.trait.findMany({
        where: { userId, isArchived: false }
      })

      const traitsWithGap = traits
        .filter(t => t.type === 'positive' && t.targetScore !== null)
        .map(t => ({
          name: t.name,
          current: t.score,
          target: t.targetScore!,
          gap: t.targetScore! - t.score
        }))
        .filter(t => t.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 3)

      markdown += `## Качества\n`
      if (traitsWithGap.length > 0) {
        markdown += `- ТОП-3 качества с наибольшим разрывом:\n`
        traitsWithGap.forEach(t => {
          markdown += `  - ${t.name}: ${t.current}/${t.target} (разрыв: ${t.gap})\n`
        })
      }
      markdown += `- Всего качеств: ${traits.length}\n\n`
    }

    if (entities.includes('notes')) {
      const notes = await db.note.findMany({
        where: { 
          userId,
          createdAt: { gte: start, lte: end }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      markdown += `## Заметки/Мысли\n`
      if (notes.length === 0) {
        markdown += `- Нет заметок за период\n\n`
      } else {
        markdown += `- Всего заметок: ${notes.length}\n`
        notes.forEach(n => {
          const preview = n.text.substring(0, 100) + (n.text.length > 100 ? '...' : '')
          markdown += `  - [${formatDate(new Date(n.createdAt))}] ${preview}\n`
        })
        markdown += `\n`
      }
    }

    // Add footer
    markdown += `---\n`
    markdown += `_Сгенерировано LeakFixer Buddy ${formatDate(new Date())}_\n`

    return NextResponse.json({ markdown, dateRange })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
