'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore, Screen } from '@/lib/store'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getTodayKey } from '@/lib/date-utils'
import { showSuccessToast, showErrorToast } from '@/lib/network-utils'

interface SearchAction {
  id: string
  label: string
  sublabel?: string
  emoji: string
  keywords: string[]
  type: 'navigate' | 'quick-log'
  screen?: Screen
  handler?: () => Promise<void>
}

interface QuickSearchProps {
  open: boolean
  onClose: () => void
}

export function QuickSearch({ open, onClose }: QuickSearchProps) {
  const { user, setScreen } = useAppStore()
  const [query, setQuery] = useState('')
  const [logValue, setLogValue] = useState('')
  const [activeAction, setActiveAction] = useState<SearchAction | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setLogValue('')
      setActiveAction(null)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const navigate = useCallback((screen: Screen) => {
    setScreen(screen)
    onClose()
  }, [setScreen, onClose])

  const ACTIONS: SearchAction[] = [
    {
      id: 'weight', label: 'Записать вес', sublabel: 'кг', emoji: '⚖️',
      keywords: ['вес', 'kg', 'кг', 'weight'],
      type: 'quick-log',
      handler: async () => {
        if (!user?.id || !logValue) return
        await fetch('/api/weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, value: parseFloat(logValue) }),
        })
        showSuccessToast(`Вес ${logValue} кг записан`)
      },
    },
    {
      id: 'water', label: 'Добавить воду', sublabel: 'мл', emoji: '💧',
      keywords: ['вода', 'water', 'пить', 'ml', 'мл'],
      type: 'quick-log',
      handler: async () => {
        if (!user?.id || !logValue) return
        const today = getTodayKey()
        await fetch('/api/water', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, date: today, amount: parseInt(logValue) }),
        })
        showSuccessToast(`+${logValue} мл воды`)
      },
    },
    {
      id: 'food', label: 'Записать еду', sublabel: 'название', emoji: '🍽️',
      keywords: ['еда', 'поел', 'съел', 'food', 'ккал', 'калории', 'обед', 'завтрак', 'ужин'],
      type: 'quick-log',
      handler: async () => {
        if (!user?.id || !logValue) return
        const today = getTodayKey()
        await fetch('/api/food', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id, date: today,
            name: logValue, calories: 0,
            mealType: 'snack', protein: 0, fat: 0, carbs: 0,
          }),
        })
        showSuccessToast(`${logValue} добавлено`)
      },
    },
    {
      id: 'supplement', label: 'Отметить БАД/добавку', sublabel: 'название', emoji: '💊',
      keywords: ['бад', 'добавка', 'витамин', 'supplement', 'pill', 'таблетка', 'омега', 'витамины'],
      type: 'navigate',
      screen: 'health',
    },
    {
      id: 'note', label: 'Быстрая заметка', sublabel: 'мысль...', emoji: '📝',
      keywords: ['заметка', 'мысль', 'note', 'запись', 'идея'],
      type: 'quick-log',
      handler: async () => {
        if (!user?.id || !logValue) return
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, text: logValue, type: 'reflection', zone: 'general' }),
        })
        showSuccessToast('Заметка сохранена')
      },
    },
    {
      id: 'gym', label: 'Открыть тренировки', emoji: '💪',
      keywords: ['зал', 'тренировка', 'gym', 'workout', 'жим', 'упражнение'],
      type: 'navigate', screen: 'gym',
    },
    {
      id: 'finance', label: 'Финансы', emoji: '💰',
      keywords: ['финансы', 'деньги', 'расход', 'доход', 'трата', 'finance', 'money'],
      type: 'navigate', screen: 'finance',
    },
    {
      id: 'rituals', label: 'Ритуалы', emoji: '🔥',
      keywords: ['ритуал', 'привычка', 'habit', 'ritual', 'утро'],
      type: 'navigate', screen: 'rituals',
    },
    {
      id: 'tasks', label: 'Задачи', emoji: '📋',
      keywords: ['задача', 'дело', 'task', 'todo', 'список'],
      type: 'navigate', screen: 'tasks',
    },
    {
      id: 'mood', label: 'Обновить настроение', emoji: '🎭',
      keywords: ['настроение', 'энергия', 'mood', 'energy', 'состояние'],
      type: 'navigate', screen: 'home',
    },
    {
      id: 'health', label: 'Питание и здоровье', emoji: '❤️',
      keywords: ['питание', 'здоровье', 'health', 'nutrition'],
      type: 'navigate', screen: 'health',
    },
    {
      id: 'goals', label: 'Цели', emoji: '🎯',
      keywords: ['цель', 'goal', 'цели'],
      type: 'navigate', screen: 'goals',
    },
    {
      id: 'stats', label: 'Статистика', emoji: '📊',
      keywords: ['статистика', 'stats', 'аналитика', 'прогресс'],
      type: 'navigate', screen: 'stats',
    },
    {
      id: 'export', label: 'Экспорт данных', emoji: '📤',
      keywords: ['экспорт', 'export', 'данные', 'выгрузка'],
      type: 'navigate', screen: 'export',
    },
    {
      id: 'weekly-report', label: 'Недельный отчёт', emoji: '🔍',
      keywords: ['отчёт', 'лики', 'неделя', 'паттерны', 'report', 'weekly'],
      type: 'navigate', screen: 'weekly-report',
    },
    {
      id: 'habits', label: 'Привычки', emoji: '🔄',
      keywords: ['привычки', 'habit', 'habits', 'трекер'],
      type: 'navigate', screen: 'habits',
    },
    {
      id: 'daily-summary', label: 'Сводка дня', emoji: '📊',
      keywords: ['сводка', 'день', 'дневная', 'summary', 'daily'],
      type: 'navigate', screen: 'daily-summary',
    },
  ]

  const filtered = query.length < 1
    ? ACTIONS.slice(0, 6) // Show top 6 by default
    : ACTIONS.filter(a =>
        a.keywords.some(k => k.includes(query.toLowerCase())) ||
        a.label.toLowerCase().includes(query.toLowerCase())
      )

  const handleSelect = async (action: SearchAction) => {
    if (action.type === 'navigate') {
      navigate(action.screen!)
      return
    }
    // quick-log — need to ask for value
    setActiveAction(action)
    setLogValue('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleLogSave = async () => {
    if (!activeAction?.handler || !logValue.trim() || isSaving) return
    setIsSaving(true)
    try {
      await activeAction.handler()
      onClose()
    } catch (e) {
      showErrorToast(e, 'quick log')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden"
        style={{
          background: 'rgba(10, 15, 30, 0.97)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Search input */}
        <div className="p-3 border-b border-white/10">
          {activeAction ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>{activeAction.emoji}</span>
                <span>{activeAction.label}</span>
                <button
                  className="ml-auto text-white/30 hover:text-white/60 text-xs"
                  onClick={() => setActiveAction(null)}
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={activeAction.sublabel || 'Введите значение...'}
                  value={logValue}
                  onChange={e => setLogValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogSave()}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-10"
                  autoFocus
                />
                <button
                  onClick={handleLogSave}
                  disabled={!logValue.trim() || isSaving}
                  className="px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                  }}
                >
                  {isSaving ? '...' : '✓'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-lg">🔍</span>
              <Input
                ref={inputRef}
                placeholder="Вес, вода, еда, зал, заметка..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 text-white placeholder:text-white/30 h-10 focus-visible:ring-0 p-0 text-base"
                autoFocus
              />
              {query && (
                <button
                  className="text-white/30 hover:text-white/60"
                  onClick={() => setQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {!activeAction && (
          <div className="py-1 max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-white/30 text-sm">
                Ничего не найдено
              </div>
            ) : (
              filtered.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className="text-xl w-8 text-center">{action.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">{action.label}</div>
                    {action.sublabel && (
                      <div className="text-xs text-white/40">{action.sublabel}</div>
                    )}
                  </div>
                  {action.type === 'navigate' ? (
                    <span className="text-white/20 text-xs">→</span>
                  ) : (
                    <span className="text-indigo-400/60 text-xs">+ добавить</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* Footer hint */}
        {!activeAction && (
          <div className="px-4 py-2 border-t border-white/5">
            <p className="text-xs text-white/20 text-center">
              Быстрый ввод без навигации
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
