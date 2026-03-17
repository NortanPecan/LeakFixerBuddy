'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const EMOTIONS = [
  { key: 'joy',      emoji: '😊', label: 'Радость' },
  { key: 'calm',     emoji: '😌', label: 'Спокойствие' },
  { key: 'excited',  emoji: '🤩', label: 'Воодушевление' },
  { key: 'focused',  emoji: '🎯', label: 'Фокус' },
  { key: 'anxiety',  emoji: '😰', label: 'Тревога' },
  { key: 'anger',    emoji: '😤', label: 'Злость' },
  { key: 'sad',      emoji: '😔', label: 'Грусть' },
  { key: 'tired',    emoji: '😴', label: 'Усталость' },
]

interface EmotionLog {
  id: string
  emotion: string
  intensity: number
  note: string | null
  createdAt: string
}

interface Props {
  userId: string
}

export function EmotionWidget({ userId }: Props) {
  const [logs, setLogs] = useState<EmotionLog[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/emotions?userId=${userId}&date=${today}`)
      const data = await res.json()
      if (data.success) setLogs(data.logs)
    } catch {
      // silent
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleEmotionTap = async (emotionKey: string) => {
    if (saving) return
    setSaving(emotionKey)
    try {
      const res = await fetch('/api/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emotion: emotionKey, intensity: 3 }),
      })
      const data = await res.json()
      if (data.success) {
        setLogs(prev => [data.log, ...prev])
      }
    } catch {
      // silent
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/emotions?id=${id}`, { method: 'DELETE' })
      setLogs(prev => prev.filter(l => l.id !== id))
    } catch {
      // silent
    }
  }

  // Last 3 logs today
  const recent = logs.slice(0, 3)

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🌡️ Как ты сейчас?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Emotion buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {EMOTIONS.map(e => (
            <button
              key={e.key}
              onClick={() => handleEmotionTap(e.key)}
              disabled={saving === e.key}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-xs ${
                saving === e.key
                  ? 'opacity-50 scale-95'
                  : 'hover:bg-muted/60 active:scale-95'
              }`}
            >
              <span className="text-2xl">{e.emoji}</span>
              <span className="text-muted-foreground text-[10px] leading-tight text-center">{e.label}</span>
            </button>
          ))}
        </div>

        {/* Today's log */}
        {recent.length > 0 && (
          <div className="space-y-1 border-t border-border/30 pt-2">
            {recent.map(log => {
              const em = EMOTIONS.find(e => e.key === log.emotion)
              const time = new Date(log.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span>{em?.emoji ?? '❓'}</span>
                    <span className="text-muted-foreground">{em?.label}</span>
                    <span className="text-muted-foreground/50">{time}</span>
                  </span>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-muted-foreground/30 hover:text-destructive text-xs px-1"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {logs.length > 3 && (
              <p className="text-[10px] text-muted-foreground/50 text-right">
                +{logs.length - 3} ещё сегодня
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
