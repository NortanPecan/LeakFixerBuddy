'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast, isOnline } from '@/lib/network-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Target,
  Edit3,
  Trash2,
  GripVertical
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getTodayKey, getTomorrowKey } from '@/lib/date-utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  LeakFixer: 'bg-emerald-500/20 text-emerald-300',
  AI: 'bg-purple-500/20 text-purple-300',
  Poker: 'bg-orange-500/20 text-orange-300',
  Health: 'bg-red-500/20 text-red-300',
  default: 'bg-muted text-muted-foreground'
}

export function TasksScreen() {
  const { user, setScreen, selectedDate, selectedDateObj, setSelectedChainId, goToToday } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [noDateTasks, setNoDateTasks] = useState<Task[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    text: '',
    date: '',
    time: '',
    zone: ''
  })
  const [zoneFilter, setZoneFilter] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  // Sync dateMode with selectedDate from store
  // Also reset to today if persisted date is in the past
  useEffect(() => {
    const today = getTodayKey()
    const tomorrow = getTomorrowKey()

    // Reset to today if selected date is in the past
    if (selectedDate < today) {
      goToToday()
      setDateMode('today')
    } else if (selectedDate === today) {
      setDateMode('today')
    } else if (selectedDate === tomorrow) {
      setDateMode('tomorrow')
    } else {
      setDateMode('custom')
    }
  }, [selectedDate, goToToday])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      setIsLoading(true)
      setError(null)
      try {
        // Load tasks for selected date
        const tasksResponse = await fetch(`/api/tasks?userId=${user.id}&date=${selectedDate}`)
        if (!tasksResponse.ok) throw new Error('Failed to load tasks')
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
      } catch (err) {
        showErrorToast(err, 'loading tasks')
        setError('Не удалось загрузить задачи')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id, selectedDate])

  // Handle date change
  const { goToNextDay } = useAppStore()
  const handleDateChange = (mode: 'today' | 'tomorrow' | 'custom') => {
    if (mode === 'today') {
      goToToday()
    } else if (mode === 'tomorrow') {
      goToToday()
      goToNextDay()
    }
    // custom mode just keeps current selectedDate
  }

  // Toggle task completion
  const handleToggleTask = async (task: Task, completed: boolean) => {
    setTogglingId(task.id)
    try {
      const today = getTodayKey()
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          status: completed ? 'done' : 'todo',
          date: completed ? today : task.date
        })
      })
      if (!response.ok) throw new Error('Failed to toggle')

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: completed ? 'done' : 'todo' } : t
      ))
      showSuccessToast(completed ? 'Дело выполнено' : 'Дело восстановлено')
    } catch (err) {
      showErrorToast(err, 'toggling task')
    } finally {
      setTogglingId(null)
    }
  }

  // Open edit dialog
  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setEditForm({
      text: task.text,
      date: task.date || '',
      time: task.time || '',
      zone: task.zone || ''
    })
  }

  // Update task
  const handleUpdateTask = async () => {
    if (!editingTask || !editForm.text.trim()) return
    if (!isOnline()) {
      showErrorToast(new Error('Нет подключения к интернету'), 'update task')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: editingTask.id,
          text: editForm.text.trim(),
          date: editForm.date || null,
          time: editForm.time || null,
          zone: editForm.zone || null
        })
      })
      if (!response.ok) throw new Error('Failed to update')

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === editingTask.id ? {
          ...t,
          text: editForm.text,
          date: editForm.date || null,
          time: editForm.time || null,
          zone: editForm.zone || null
        } : t
      ))
      setNoDateTasks(prev => prev.map(t =>
        t.id === editingTask.id ? {
          ...t,
          text: editForm.text,
          date: editForm.date || null,
          time: editForm.time || null,
          zone: editForm.zone || null
        } : t
      ))
      setEditingTask(null)
      showSuccessToast('Дело обновлено')
    } catch (err) {
      showErrorToast(err, 'updating task')
    } finally {
      setIsUpdating(false)
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!isOnline()) {
      showErrorToast(new Error('Нет подключения к интернету'), 'delete task')
      return
    }

    try {
      const response = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete')

      setTasks(prev => prev.filter(t => t.id !== taskId))
      setNoDateTasks(prev => prev.filter(t => t.id !== taskId))
      setEditingTask(null)
      showSuccessToast('Дело удалено')
    } catch (err) {
      showErrorToast(err, 'deleting task')
    }
  }

  // Get today's tasks (todo status) with zone filter
  const todayTodoTasks = tasks.filter(t => 
    t.status === 'todo' && (!zoneFilter || t.zone === zoneFilter)
  )
  const todayDoneTasks = tasks.filter(t => 
    t.status === 'done' && (!zoneFilter || t.zone === zoneFilter)
  )

  // Get unique zones from tasks
  const availableZones = [...new Set(tasks.map(t => t.zone).filter(Boolean))] as string[]

  // Handle drag end for task reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setTasks(prev => {
        const oldIndex = prev.findIndex(t => t.id === active.id)
        const newIndex = prev.findIndex(t => t.id === over.id)
        const newTasks = arrayMove(prev, oldIndex, newIndex)
        
        // Update order in backend
        updateTasksOrder(newTasks.filter(t => t.status === 'todo'))
        
        return newTasks
      })
    }
  }, [])

  // Update tasks order in backend
  const updateTasksOrder = async (tasks: Task[]) => {
    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map((t, i) => ({ id: t.id, order: i }))
        })
      })
    } catch (err) {
      showErrorToast(err, 'reordering tasks')
    }
  }

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

      {/* Zone filter */}
      {!isLoading && availableZones.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant={zoneFilter === null ? 'default' : 'outline'}
            onClick={() => setZoneFilter(null)}
            className="text-xs"
          >
            Все
          </Button>
          {availableZones.map(zone => (
            <Button
              key={zone}
              size="sm"
              variant={zoneFilter === zone ? 'default' : 'outline'}
              onClick={() => setZoneFilter(zone)}
              className={`text-xs ${zoneFilter === zone ? ZONE_COLORS[zone] || '' : ''}`}
            >
              {zone}
            </Button>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400">{error}</p>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Today's tasks with DnD */}
      {!isLoading && todayTodoTasks.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {formatDateDisplay(selectedDate)}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                перетащите для изменения порядка
              </span>
            </div>
            <SortableContext
              items={todayTodoTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {todayTodoTasks.map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteTask}
                  togglingId={togglingId}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
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
                onEdit={openEditDialog}
                onDelete={handleDeleteTask}
                isCompleted
                togglingId={togglingId}
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
              onEdit={openEditDialog}
              onDelete={handleDeleteTask}
              togglingId={togglingId}
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
                setSelectedChainId(chain.id)
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

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать дело</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Текст</Label>
              <Input
                value={editForm.text}
                onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Что нужно сделать?"
              />
            </div>

            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Время</Label>
              <Input
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Зона</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ZONE_COLORS).filter(z => z !== 'default').map(zone => (
                  <Button
                    key={zone}
                    size="sm"
                    variant={editForm.zone === zone ? 'default' : 'outline'}
                    onClick={() => setEditForm(prev => ({ ...prev, zone: prev.zone === zone ? '' : zone }))}
                  >
                    {zone}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingTask(null)}
                disabled={isUpdating}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleUpdateTask}
                disabled={!editForm.text.trim() || isUpdating}
              >
                {isUpdating ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  isCompleted = false,
  togglingId
}: {
  task: Task
  onToggle: (task: Task, completed: boolean) => void
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  isCompleted?: boolean
  togglingId: string | null
}) {
  const zoneColor = task.zone ? ZONE_COLORS[task.zone] || ZONE_COLORS.default : null
  const isToggling = togglingId === task.id

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
            } ${isToggling ? 'opacity-50' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isToggling) {
                onToggle(task, !isCompleted)
              }
            }}
            disabled={isToggling}
          >
            {isToggling ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
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

          {/* Edit/Delete buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(task)}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Sortable Task Card Component (wraps TaskCard with DnD)
function SortableTaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  togglingId
}: {
  task: Task
  onToggle: (task: Task, completed: boolean) => void
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  togglingId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const zoneColor = task.zone ? ZONE_COLORS[task.zone] || ZONE_COLORS.default : null
  const isToggling = togglingId === task.id

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-card/50 backdrop-blur cursor-pointer transition-all hover:bg-card/70 ${
        isDragging ? 'shadow-lg opacity-90 border-primary/50' : ''
      }`}
    >
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            className="w-6 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Complete button */}
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              'bg-muted hover:bg-muted/70'
            } ${isToggling ? 'opacity-50' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isToggling) {
                onToggle(task, true)  // Mark as done
              }
            }}
            disabled={isToggling}
          >
            {isToggling ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
            <p className="font-medium truncate">
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

          {/* Edit/Delete buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(task)}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
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
