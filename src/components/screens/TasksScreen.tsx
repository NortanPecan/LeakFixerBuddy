'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  CheckCircle2,
  Circle,
  ChevronRight,
  Link2,
  Calendar,
  Clock,
  AlertTriangle,
  Sparkles,
  Target
} from 'lucide-react'

interface Task {
  id: string
  chainId: string | null
  text: string
  status: string
  order: number
  date: string | null
  time: string | null
  zone: string | null
  chain?: { id: string; title: string; status: string } | null
}

interface Chain {
  id: string
  title: string
  status: string
  completedCount: number
  totalCount: number
  currentTask: {
    id: string
    text: string
    date: string | null
    daysWaiting: number
  } | null
  isStale: boolean
  daysSinceLastActivity: number
  tasks: Task[]
}

const ZONE_COLORS: Record<string, string> = {
  Steam: 'bg-blue-500/20 text-blue-300',
  LeakFixer: 'bg-emerald-500/20 text-emerald-300',
  AI: 'bg-purple-500/20 text-purple-300',
  Poker: 'bg-orange-500/20 text-orange-300',
  Health: 'bg-red-500/20 text-red-300',
  default: 'bg-muted text-muted-foreground'
}

export function TasksScreen() {
  const { user, setScreen } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [noDateTasks, setNoDateTasks] = useState<Task[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today')

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Сегодня'
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра'
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        // Load tasks for selected date
        const tasksResponse = await fetch(`/api/tasks?userId=${user.id}&date=${selectedDate}`)
        const tasksData = await tasksResponse.json()
        setTasks(tasksData.tasks || [])

        // Load tasks without date
        const noDateResponse = await fetch(`/api/tasks?userId=${user.id}&noDate=true`)
        const noDateData = await noDateResponse.json()
        setNoDateTasks(noDateData.tasks || [])

        // Load chains
        const chainsResponse = await fetch(`/api/chains?userId=${user.id}`)
        const chainsData = await chainsResponse.json()
        setChains(chainsData.chains || [])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id, selectedDate])

  // Handle date change
  const handleDateChange = (mode: 'today' | 'tomorrow' | 'custom') => {
    setDateMode(mode)
    const today = new Date()
    if (mode === 'today') {
      setSelectedDate(today.toISOString().split('T')[0])
    } else if (mode === 'tomorrow') {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      setSelectedDate(tomorrow.toISOString().split('T')[0])
    }
  }

  // Toggle task completion
  const handleToggleTask = async (task: Task, completed: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          status: completed ? 'done' : 'todo',
          date: completed ? today : task.date
        })
      })

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: completed ? 'done' : 'todo' } : t
      ))
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  // Get today's tasks (todo status)
  const todayTodoTasks = tasks.filter(t => t.status === 'todo')
  const todayDoneTasks = tasks.filter(t => t.status === 'done')

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Дела</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : `${todayTodoTasks.length} дел на сегодня`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScreen('create-chain')}
          >
            <Link2 className="w-4 h-4 mr-1" />
            Цепочка
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => setScreen('create-task')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Дело
          </Button>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex gap-1">
        {(['today', 'tomorrow', 'custom'] as const).map(mode => (
          <Button
            key={mode}
            size="sm"
            variant={dateMode === mode ? 'default' : 'outline'}
            onClick={() => handleDateChange(mode)}
            className="flex-1"
          >
            {mode === 'today' && 'Сегодня'}
            {mode === 'tomorrow' && 'Завтра'}
            {mode === 'custom' && <Calendar className="w-4 h-4" />}
          </Button>
        ))}
      </div>

      {/* Today's tasks */}
      {!isLoading && todayTodoTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {formatDateDisplay(selectedDate)}
            </span>
          </div>
          {todayTodoTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggleTask}
            />
          ))}
        </div>
      )}

      {/* Completed tasks */}
      {!isLoading && todayDoneTasks.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 px-1 cursor-pointer text-muted-foreground">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
            <span className="text-sm">Выполнено ({todayDoneTasks.length})</span>
          </summary>
          <div className="space-y-2 mt-2">
            {todayDoneTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                isCompleted
              />
            ))}
          </div>
        </details>
      )}

      {/* Tasks without date */}
      {!isLoading && noDateTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Circle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Без даты</span>
          </div>
          {noDateTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggleTask}
            />
          ))}
        </div>
      )}

      {/* Empty state for today */}
      {!isLoading && todayTodoTasks.length === 0 && (
        <Card className="bg-card/50 backdrop-blur border-dashed">
          <CardContent className="pt-6 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Нет дел на {formatDateDisplay(selectedDate).toLowerCase()}</p>
            <Button onClick={() => setScreen('create-task')}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить дело
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chains section */}
      {!isLoading && chains.length > 0 && (
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Цепочки</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setScreen('create-chain')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {chains.map(chain => (
            <ChainCard
              key={chain.id}
              chain={chain}
              onClick={() => {
                // Store chain ID and navigate to chain detail
                localStorage.setItem('selectedChainId', chain.id)
                setScreen('chain')
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state for chains */}
      {!isLoading && chains.length === 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Создай первую цепочку</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Цепочки — это шаги к твоим целям
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-primary"
                  onClick={() => setScreen('create-chain')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Создать цепочку
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  onToggle,
  isCompleted = false
}: {
  task: Task
  onToggle: (task: Task, completed: boolean) => void
  isCompleted?: boolean
}) {
  const zoneColor = task.zone ? ZONE_COLORS[task.zone] || ZONE_COLORS.default : null

  return (
    <Card className={`bg-card/50 backdrop-blur cursor-pointer transition-all hover:bg-card/70 ${
      isCompleted ? 'opacity-60' : ''
    }`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-3">
          {/* Complete button */}
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isCompleted
                ? 'bg-emerald-500 text-white'
                : 'bg-muted hover:bg-muted/70'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(task, !isCompleted)
            }}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.text}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {task.chain && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {task.chain.title}
                </span>
              )}
              {task.time && (
                <span className="text-xs text-muted-foreground">{task.time}</span>
              )}
              {zoneColor && (
                <Badge className={`text-[10px] px-1.5 py-0 ${zoneColor}`}>
                  {task.zone}
                </Badge>
              )}
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

// Chain Card Component
function ChainCard({
  chain,
  onClick
}: {
  chain: Chain
  onClick: () => void
}) {
  return (
    <Card
      className={`bg-card/50 backdrop-blur cursor-pointer transition-all hover:bg-card/70 ${
        chain.isStale ? 'border-orange-500/30' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{chain.completedCount}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{chain.title}</p>
              {chain.isStale && (
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {chain.currentTask ? (
                <span className="text-xs text-muted-foreground truncate">
                  Текущий: {chain.currentTask.text}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {chain.completedCount}/{chain.totalCount} шагов
                </span>
              )}
            </div>
          </div>

          {/* Stale warning */}
          {chain.isStale && chain.currentTask && (
            <div className="text-right shrink-0">
              <p className="text-xs text-orange-400">{chain.currentTask.daysWaiting}д</p>
              <p className="text-[10px] text-muted-foreground">стоит</p>
            </div>
          )}

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}
