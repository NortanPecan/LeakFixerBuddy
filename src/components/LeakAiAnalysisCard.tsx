'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
                <div className="space-y-2">
                  {analysis.solutions.map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 text-sm">{PRIORITY_EMOJI[s.priority] ?? '🟡'}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white/80">{s.text}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-white/30">📅</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 border-white/20 text-white/40"
                          >
                            {s.deadline}
                          </Badge>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
