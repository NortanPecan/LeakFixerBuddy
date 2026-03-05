'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Clock, Save } from 'lucide-react'
import {
  CATEGORY_LABELS,
  TIME_WINDOW_LABELS,
  DAY_PRESETS,
  DAYS_OF_WEEK,
  ATTRIBUTE_LABELS,
  type RitualCategory,
  type TimeWindow,
  type AttributeKey
} from '@/lib/rituals/data'

export function CreateRitualScreen() {
  const { user, setScreen } = useAppStore()
  const [isSaving, setIsSaving] = useState(false)
  
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<RitualCategory>('health')
  const [dayPreset, setDayPreset] = useState<string>('everyday')
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('any')
  const [goalShort, setGoalShort] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeKey[]>(['health', 'will'])

  const getSelectedDays = () => {
    if (dayPreset === 'custom') return customDays
    const preset = DAY_PRESETS.find(p => p.value === dayPreset)
    return preset?.days || [1, 2, 3, 4, 5, 6, 7]
  }

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  const toggleAttribute = (attr: AttributeKey) => {
    setSelectedAttributes(prev =>
      prev.includes(attr)
        ? prev.filter(a => a !== attr)
        : [...prev, attr]
    )
  }

  const handleSave = async () => {
    if (!user?.id || !title.trim()) return
    
    setIsSaving(true)
    try {
      await fetch('/api/rituals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim(),
          type: 'regular',
          category,
          days: getSelectedDays(),
          timeWindow,
          goalShort: goalShort.trim() || undefined,
          description: description.trim() || undefined,
          attributes: selectedAttributes
        })
      })
      setScreen('rituals')
    } catch (error) {
      console.error('Failed to save ritual:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen('rituals')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Новый ритуал</h1>
          <p className="text-sm text-muted-foreground">Создай полезную привычку</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Название *</Label>
          <Input placeholder="Например: Медитация утром" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Категория</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(CATEGORY_LABELS) as [RitualCategory, { label: string; color: string; icon: string }][]).map(([key, value]) => (
              <button
                key={key}
                className={"p-2 rounded-xl text-sm " + (category === key ? value.color : 'bg-muted/30')}
                onClick={() => setCategory(key)}
              >
                {value.icon} {value.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Дни</Label>
          <div className="grid grid-cols-2 gap-2">
            {DAY_PRESETS.filter(p => p.value !== 'custom').map(preset => (
              <button
                key={preset.value}
                className={"p-2 rounded-xl text-sm " + (dayPreset === preset.value ? 'bg-primary/20 text-primary' : 'bg-muted/30')}
                onClick={() => setDayPreset(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {dayPreset === 'custom' && (
            <div className="flex gap-1 mt-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  className={"w-9 h-9 rounded-lg text-sm " + (customDays.includes(day.value) ? 'bg-primary text-white' : 'bg-muted/30')}
                  onClick={() => toggleCustomDay(day.value)}
                >
                  {day.short}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Clock className="w-4 h-4" />Время</Label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(TIME_WINDOW_LABELS) as [TimeWindow, string][]).map(([key, label]) => (
              <button
                key={key}
                className={"p-2 rounded-xl text-sm " + (timeWindow === key ? 'bg-primary/20 text-primary' : 'bg-muted/30')}
                onClick={() => setTimeWindow(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Качества</Label>
          <div className="flex gap-2">
            {(Object.entries(ATTRIBUTE_LABELS) as [AttributeKey, { label: string; icon: string; color: string }][]).map(([key, value]) => (
              <button
                key={key}
                className={"flex-1 p-3 rounded-xl text-center text-sm " + (selectedAttributes.includes(key) ? value.color + ' text-white' : 'bg-muted/30')}
                onClick={() => toggleAttribute(key)}
              >
                {value.icon} {value.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Цель</Label>
          <Input placeholder="Зачем тебе этот ритуал?" value={goalShort} onChange={e => setGoalShort(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea placeholder="Подробности..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={() => setScreen('rituals')}>Отмена</Button>
        <Button className="flex-1 bg-primary" disabled={!title.trim() || isSaving} onClick={handleSave}>
          {isSaving ? 'Сохранение...' : 'Создать'}
        </Button>
      </div>
    </div>
  )
}
