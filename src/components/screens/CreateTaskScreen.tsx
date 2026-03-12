'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Calendar, Clock, Link2 } from 'lucide-react'

const ZONES = [
  { id: 'Steam', label: 'Steam', icon: '🎮' },
  { id: 'LeakFixer', label: 'LeakFixer', icon: '🔧' },
  { id: 'AI', label: 'ИИ', icon: '🤖' },
  { id: 'Poker', label: 'Покер', icon: '♠️' },
  { id: 'Health', label: 'Здоровье', icon: '❤️' },
]

export function CreateTaskScreen() {
  const { user, setScreen } = useAppStore()
  const [isSaving, setIsSaving] = useState(false)

  const [text, setText] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('')
  const [zone, setZone] = useState('')
  const [notes, setNotes] = useState('')
  const [noDate, setNoDate] = useState(false)

  const handleSave = async () => {
    if (!user?.id || !text.trim()) return

    setIsSaving(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: text.trim(),
          date: noDate ? null : date,
          time: time || undefined,
          zone: zone || undefined,
          notes: notes.trim() || undefined
        })
      })
      setScreen('tasks')
    } catch (error) {
      console.error('Failed to save task:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen('tasks')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Новое дело</h1>
          <p className="text-sm text-muted-foreground">Добавь задачу</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Task text */}
        <div className="space-y-2">
          <Label>Что нужно сделать? *</Label>
          <Input
            placeholder="Например: Написать ТЗ для ритуалов"
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Дата
          </Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={noDate ? 'default' : 'outline'}
              onClick={() => setNoDate(true)}
            >
              Без даты
            </Button>
            {!noDate && (
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1"
              />
            )}
          </div>
        </div>

        {/* Time */}
        {!noDate && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Время (опционально)
            </Label>
            <Input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        )}

        {/* Zone */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Зона
          </Label>
          <div className="flex flex-wrap gap-2">
            {ZONES.map(z => (
              <button
                key={z.id}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  zone === z.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
                onClick={() => setZone(zone === z.id ? '' : z.id)}
              >
                {z.icon} {z.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Заметки</Label>
          <Textarea
            placeholder="Подробности..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setScreen('tasks')}
        >
          Отмена
        </Button>
        <Button
          className="flex-1 bg-primary"
          disabled={!text.trim() || isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Сохранение...' : 'Создать'}
        </Button>
      </div>
    </div>
  )
}
