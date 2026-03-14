'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { showSuccessToast, showErrorToast, isOnline } from '@/lib/network-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Calendar, Clock, Link2 } from 'lucide-react'

const ZONES = [
  { id: 'LeakFixer', label: 'LeakFixer', icon: '🔧' },
  { id: 'AI', label: 'ИИ', icon: '🤖' },
  { id: 'Poker', label: 'Покер', icon: '♠️' },
  { id: 'Health', label: 'Здоровье', icon: '❤️' },
]

export function CreateTaskScreen() {
  const { user, setScreen, selectedDate } = useAppStore()
  const [isSaving, setIsSaving] = useState(false)

  const [text, setText] = useState('')
  const [date, setDate] = useState(() => selectedDate || new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('')
  const [zone, setZone] = useState('')
  const [notes, setNotes] = useState('')
  const [noDate, setNoDate] = useState(false)
  const [quickDate, setQuickDate] = useState<'today' | 'tomorrow' | 'custom'>('today')

  // Quick date helpers
  const getToday = () => new Date().toISOString().split('T')[0]
  const getTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const handleQuickDate = (mode: 'today' | 'tomorrow' | 'custom') => {
    setQuickDate(mode)
    setNoDate(false)
    if (mode === 'today') setDate(getToday())
    else if (mode === 'tomorrow') setDate(getTomorrow())
  }

  const handleSave = async () => {
    if (!user?.id || !text.trim()) return

    if (!isOnline()) {
      showErrorToast(new Error('Нет подключения к интернету'), 'создание дела')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/tasks', {
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
      if (!response.ok) throw new Error('Failed to create task')
      showSuccessToast('Дело создано')
      setScreen('tasks')
    } catch (error) {
      showErrorToast(error, 'создание дела')
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

        {/* Date - Quick Actions */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Дата
          </Label>
          
          {/* Quick date buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={noDate ? 'outline' : quickDate === 'today' ? 'default' : 'outline'}
              onClick={() => handleQuickDate('today')}
              className="flex-1"
            >
              Сегодня
            </Button>
            <Button
              size="sm"
              variant={quickDate === 'tomorrow' ? 'default' : 'outline'}
              onClick={() => handleQuickDate('tomorrow')}
              className="flex-1"
            >
              Завтра
            </Button>
            <Button
              size="sm"
              variant={quickDate === 'custom' ? 'default' : 'outline'}
              onClick={() => handleQuickDate('custom')}
              className="flex-1"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Custom date picker or no date toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={noDate ? 'default' : 'outline'}
              onClick={() => setNoDate(!noDate)}
              className="text-xs"
            >
              Без даты
            </Button>
            {!noDate && quickDate === 'custom' && (
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1"
              />
            )}
            {!noDate && quickDate !== 'custom' && (
              <div className="flex-1 text-sm text-muted-foreground flex items-center">
                {quickDate === 'today' ? getToday() : getTomorrow()}
              </div>
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
