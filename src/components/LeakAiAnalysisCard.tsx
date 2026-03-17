'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { showSuccessToast, showErrorToast } from '@/lib/network-utils'

interface LeakSolution {
  text: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

interface LeakAnalysis {
  cause: string
  solutions: LeakSolution[]
  personalizedInsight: string
  urgency: 'now' | 'thisWeek' | 'thisMonth'
  provider?: 'groq' | 'gemini'
}

interface LeakAiAnalysisCardProps {
  userId: string
  leakType: string
  leakMessage: string
  severity: 'info' | 'warning' | 'critical'
}

const URGENCY_LABEL: Record<string, { text: string; color: string }> = {
  now:       { text: 'Срочно',           color: 'bg-red-500/20 text-red-400' },
  thisWeek:  { text: 'На этой неделе',   color: 'bg-yellow-500/20 text-yellow-400' },
  thisMonth: { text: 'В этом месяце',    color: 'bg-indigo-500/20 text-indigo-400' },
}

const PRIORITY_EMOJI: Record<string, string> = {
  high:   '🔴',
  medium: '🟡',
  low:    '🟢',
}

const PROVIDER_LABEL: Record<string, string> = {
  groq:   'Groq Llama',
  gemini: 'Gemini',
}

/** Конвертирует дедлайн-строку AI в дату YYYY-MM-DD */
function deadlineToDate(deadline: string): string {
  const d = new Date()
  const lower = deadline.toLowerCase()
  if (lower.includes('сегодня')) {
    // today
  } else if (lower.includes('завтра')) {
    d.setDate(d.getDate() + 1)
  } else {
    const daysMatch = lower.match(/(\d+)\s*дн/)
    if (daysMatch) {
      d.setDate(d.getDate() + parseInt(daysMatch[1]))
    } else if (lower.includes('недел')) {
      d.setDate(d.getDate() + 7)
    } else if (lower.includes('месяц')) {
      d.setDate(d.getDate() + 30)
    } else {
      d.setDate(d.getDate() + 7)
    }
  }
  return d.toISOString().split('T')[0]
}

export function LeakAiAnalysisCard({
  userId,
  leakType,
  leakMessage,
  severity,
}: LeakAiAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<LeakAnalysis | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [open, setOpen]         = useState(false)
  const [tasksAdded, setTasksAdded] = useState(false)
  const [addingTasks, setAddingTasks] = useState(false)
  // feedbacks: index → true (worked) | false (not worked) | null (no feedback yet)
  const [feedbacks, setFeedbacks] = useState<Record<number, boolean | null>>({})

  const analyze = async () => {
    if (analysis) {
      setOpen(o => !o)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/analyze-leak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, leakType, leakMessage, severity }),
      })
      const data = (await res.json()) as {
        success: boolean
        analysis?: LeakAnalysis
        provider?: string
        error?: string
      }
      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
        setProvider(data.provider ?? null)
        setOpen(true)
      } else {
        setError(data.error ?? 'Ошибка анализа')
      }
    } catch {
      setError('Нет соединения')
    } finally {
      setLoading(false)
    }
  }

  const addTasksFromSolutions = async () => {
    if (!analysis || tasksAdded || addingTasks) return
    setAddingTasks(true)
    try {
      await Promise.all(
        analysis.solutions.map(s =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              text: s.text,
              date: deadlineToDate(s.deadline),
              zone: 'LeakFixer',
              notes: `Дедлайн: ${s.deadline}`,
            }),
          })
        )
      )
      setTasksAdded(true)
      showSuccessToast(`✅ ${analysis.solutions.length} задачи добавлены`)
    } catch {
      showErrorToast('Не удалось добавить задачи')
    } finally {
      setAddingTasks(false)
    }
  }

  const sendFeedback = async (index: number, worked: boolean) => {
    if (!analysis || feedbacks[index] !== undefined) return
    // Оптимистично обновляем UI
    setFeedbacks(prev => ({ ...prev, [index]: worked }))
    try {
      await fetch('/api/ai/analyze-leak', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          leakType,
          solutionText: analysis.solutions[index].text,
          worked,
        }),
      })
    } catch {
      // Фидбек не критичен — не показываем ошибку
    }
  }

  const urgencyInfo = analysis ? (URGENCY_LABEL[analysis.urgency] ?? URGENCY_LABEL.thisWeek) : null

  return (
    <div className="mt-2">
      {/* Кнопка анализа */}
      <button
        onClick={analyze}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Анализирую…
          </>
        ) : analysis ? (
          open ? '▲ Скрыть анализ' : '▼ Показать анализ'
        ) : (
          '🤖 Разобрать с ИИ'
        )}
      </button>

      {/* Ошибка */}
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}

      {/* Результат анализа */}
      {analysis && open && (
        <Card
          className="mt-2"
          style={{
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <CardContent className="pt-3 pb-3 space-y-3">
            {/* Заголовок + urgency */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
                🤖 AI-анализ
              </span>
              <div className="flex items-center gap-1.5">
                {urgencyInfo && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgencyInfo.color}`}>
                    {urgencyInfo.text}
                  </span>
                )}
                {provider && (
                  <span className="text-[10px] text-white/30">
                    {PROVIDER_LABEL[provider] ?? provider}
                  </span>
                )}
              </div>
            </div>

            {/* Причина */}
            <div>
              <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">Причина</p>
              <p className="text-sm text-white/80">{analysis.cause}</p>
            </div>

            {/* Решения */}
            {analysis.solutions.length > 0 && (
              <div>
                <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1.5">Что делать</p>
                <div className="space-y-2.5">
                  {analysis.solutions.map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 text-sm">{PRIORITY_EMOJI[s.priority] ?? '🟡'}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white/80">{s.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-white/30">📅</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 border-white/20 text-white/40"
                            >
                              {s.deadline}
                            </Badge>
                          </div>
                          {/* Фидбек кнопки */}
                          {feedbacks[i] === undefined || feedbacks[i] === null ? (
                            <div className="flex gap-1 ml-auto">
                              <button
                                onClick={() => sendFeedback(i, true)}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                              >
                                ✅ Сработало
                              </button>
                              <button
                                onClick={() => sendFeedback(i, false)}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              >
                                ❌ Не помогло
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/30 ml-auto">
                              {feedbacks[i] ? '✅ Отмечено' : '❌ Отмечено'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Персональное наблюдение */}
            {analysis.personalizedInsight && (
              <div
                className="rounded-lg p-2.5"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">🧠 Персональное</p>
                <p className="text-xs text-white/70">{analysis.personalizedInsight}</p>
              </div>
            )}

            {/* Кнопка «Добавить в задачи» */}
            {analysis.solutions.length > 0 && (
              <button
                onClick={addTasksFromSolutions}
                disabled={tasksAdded || addingTasks}
                className={`w-full text-xs py-1.5 rounded-lg transition-colors font-medium ${
                  tasksAdded
                    ? 'bg-green-500/10 text-green-400 cursor-default'
                    : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50'
                }`}
              >
                {addingTasks ? '⏳ Добавляю...' : tasksAdded ? '✅ Задачи добавлены' : '📋 Добавить в задачи'}
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
