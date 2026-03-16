'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { showErrorToast } from '@/lib/network-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle2, Circle, Filter } from 'lucide-react'
import { CATEGORY_LABELS, TIME_WINDOW_LABELS, type Ritual, type TimeWindow, type RitualCategory } from '@/lib/rituals/data'

const TIME_WINDOW_ORDER: TimeWindow[] = ['morning', 'day', 'evening', 'any']

const TIME_WINDOW_EMOJI: Record<TimeWindow, string> = {
  morning: '🌅',
  day: '☀️',
  evening: '🌙',
  any: '⏰',
}

export function AllRitualsScreen() {
  const { user, setScreen, selectedDate } = useAppStore()
  const [rituals, setRituals] = useState<Ritual[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<RitualCategory | 'all'>('all')

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const res = await fetch(`/api/rituals?userId=${user.id}&date=${selectedDate}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setRituals(data.rituals || [])
      } catch {
        showErrorToast('Не удалось загрузить ритуалы')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id, selectedDate])

  const filtered = filterCategory === 'all'
    ? rituals
    : rituals.filter(r => r.category === filterCategory)

  const grouped = TIME_WINDOW_ORDER.reduce<Record<TimeWindow, Ritual[]>>((acc, tw) => {
    acc[tw] = filtered.filter(r => r.timeWindow === tw)
    return acc
  }, { morning: [], day: [], evening: [], any: [] })

  const categories = Array.from(new Set(rituals.map(r => r.category))) as RitualCategory[]
  const completedCount = rituals.filter(r => r.completedToday).length

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-40" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScreen('rituals')}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Все ритуалы</h1>
            <p className="text-xs text-muted-foreground">
              {completedCount} из {rituals.length} выполнено
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {rituals.length} ритуалов
        </Badge>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="text-xs shrink-0"
            onClick={() => setFilterCategory('all')}
          >
            <Filter className="w-3 h-3 mr-1" />
            Все
          </Button>
          {categories.map(cat => {
            const cfg = CATEGORY_LABELS[cat]
            return (
              <Button
                key={cat}
                variant={filterCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="text-xs shrink-0"
                onClick={() => setFilterCategory(cat)}
              >
                {cfg.icon} {cfg.label}
              </Button>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">Нет ритуалов</p>
          <p className="text-sm mt-1">Создай первый ритуал</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setScreen('create-ritual')}
          >
            Создать ритуал
          </Button>
        </div>
      )}

      {/* Grouped by time window */}
      {TIME_WINDOW_ORDER.map(tw => {
        const group = grouped[tw]
        if (group.length === 0) return null
        return (
          <div key={tw} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{TIME_WINDOW_EMOJI[tw]}</span>
              <span className="text-sm font-semibold text-muted-foreground">
                {TIME_WINDOW_LABELS[tw]}
              </span>
              <span className="text-xs text-muted-foreground">
                ({group.filter(r => r.completedToday).length}/{group.length})
              </span>
            </div>
            {group.map(ritual => (
              <RitualRow key={ritual.id} ritual={ritual} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function RitualRow({ ritual }: { ritual: Ritual }) {
  const cat = CATEGORY_LABELS[ritual.category]
  const days = ritual.days
  const dayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const isEveryDay = days.length === 7

  return (
    <Card className={`border transition-colors ${ritual.completedToday ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
      <CardContent className="p-3 flex items-center gap-3">
        {ritual.completedToday
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${ritual.completedToday ? 'line-through text-muted-foreground' : ''}`}>
            {ritual.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
            {!isEveryDay && days.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {days.map(d => dayLabels[d]).join(', ')}
              </span>
            )}
            {isEveryDay && (
              <span className="text-xs text-muted-foreground">Каждый день</span>
            )}
          </div>
        </div>
        {(ritual.streak ?? 0) > 0 && (
          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-orange-400">🔥 {ritual.streak}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
