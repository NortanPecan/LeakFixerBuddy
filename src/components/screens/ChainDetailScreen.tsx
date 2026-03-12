'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Flag,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Sparkles,
  Link2
} from 'lucide-react'

interface Task {
  id: string
  text: string
  status: string
  order: number
  date: string | null
  time: string | null
  zone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Chain {
  id: string
  title: string
  status: string
  tasks: Task[]
}

export function ChainDetailScreen() {
  const { user, setScreen } = useAppStore()
  const [chain, setChain] = useState<Chain | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddStep, setShowAddStep] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [newStepText, setNewStepText] = useState('')
  const [completedTask, setCompletedTask] = useState<Task | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Load chain data
  useEffect(() => {
    const loadChain = async () => {
      const chainId = localStorage.getItem('selectedChainId')
      if (!chainId || !user?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/chains?userId=${user.id}&status=all`)
        const data = await response.json()
        const foundChain = data.chains?.find((c: Chain) => c.id === chainId)
        setChain(foundChain || null)
      } catch (error) {
        console.error('Failed to load chain:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadChain()
  }, [user?.id])

  // Complete a task
  const handleCompleteTask = async (task: Task) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          status: 'done',
          date: today
        })
      })

      // Update local state
      setChain(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === task.id ? { ...t, status: 'done' } : t
        )
      } : null)

      // Show modal to add next step
      setCompletedTask(task)
      setShowCompleteModal(true)
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  // Add next step after completing
  const handleAddNextStep = async () => {
    if (!chain || !newStepText.trim() || !user?.id) return
    setIsAdding(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          chainId: chain.id,
          text: newStepText.trim()
        })
      })

      // Reload chain
      const response = await fetch(`/api/chains?userId=${user.id}&status=all`)
      const data = await response.json()
      const foundChain = data.chains?.find((c: Chain) => c.id === chain.id)
      setChain(foundChain || null)

      setNewStepText('')
      setShowAddStep(false)
      setShowCompleteModal(false)
    } catch (error) {
      console.error('Failed to add step:', error)
    } finally {
      setIsAdding(false)
    }
  }

  // Complete chain
  const handleCompleteChain = async () => {
    if (!chain) return
    try {
      await fetch('/api/chains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: chain.id,
          status: 'completed'
        })
      })
      setScreen('tasks')
    } catch (error) {
      console.error('Failed to complete chain:', error)
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE'
      })

      setChain(prev => prev ? {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      } : null)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen('tasks')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    )
  }

  if (!chain) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen('tasks')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-lg">Цепочка не найдена</div>
        </div>
      </div>
    )
  }

  const completedTasks = chain.tasks.filter(t => t.status === 'done')
  const todoTasks = chain.tasks.filter(t => t.status === 'todo')
  const currentTask = todoTasks[0]

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen('tasks')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{chain.title}</h1>
          <p className="text-sm text-muted-foreground">
            {completedTasks.length} из {chain.tasks.length} шагов
          </p>
        </div>
        {chain.status === 'completed' && (
          <Badge className="bg-emerald-500/20 text-emerald-300">
            <Flag className="w-3 h-3 mr-1" />
            Завершена
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${chain.tasks.length > 0 ? (completedTasks.length / chain.tasks.length) * 100 : 0}%`
          }}
        />
      </div>

      {/* Chain visualization */}
      <div className="space-y-0">
        {chain.tasks.map((task, index) => {
          const isDone = task.status === 'done'
          const isCurrent = task.id === currentTask?.id
          const isLast = index === chain.tasks.length - 1

          return (
            <div key={task.id} className="flex gap-3">
              {/* Timeline node */}
              <div className="flex flex-col items-center">
                <button
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={() => isCurrent && handleCompleteTask(task)}
                  disabled={!isCurrent || chain.status === 'completed'}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>
                {/* Connecting line */}
                {!isLast && (
                  <div className={`w-0.5 h-12 ${isDone ? 'bg-emerald-500' : 'bg-muted'}`} />
                )}
              </div>

              {/* Task content */}
              <div className={`flex-1 pb-6 ${!isLast ? '' : ''}`}>
                <Card className={`bg-card/50 backdrop-blur ${
                  isCurrent ? 'border-primary/50' : ''
                } ${isDone ? 'opacity-70' : ''}`}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                          {task.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {task.time && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.time}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isDone && chain.status !== 'completed' && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        })}

        {/* Add next step node */}
        {chain.status !== 'completed' && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
                onClick={() => setShowAddStep(true)}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 pb-6">
              <button
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setShowAddStep(true)}
              >
                Добавить шаг
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Complete chain button */}
      {chain.status !== 'completed' && todoTasks.length === 0 && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div className="flex-1">
                <p className="font-medium">Цель достигнута?</p>
                <p className="text-sm text-muted-foreground">Завершить цепочку</p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCompleteChain}
              >
                <Flag className="w-4 h-4 mr-1" />
                Завершить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Step Modal */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый шаг</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Что нужно сделать?"
              value={newStepText}
              onChange={e => setNewStepText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNextStep()}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddStep(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                disabled={!newStepText.trim() || isAdding}
                onClick={handleAddNextStep}
              >
                {isAdding ? 'Добавление...' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Task Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Шаг выполнен!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Отлично! Что дальше?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="bg-primary"
                onClick={() => {
                  setShowCompleteModal(false)
                  setShowAddStep(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить следующий шаг
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
              >
                Пока нет
              </Button>
              <Button
                variant="ghost"
                className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => {
                  setShowCompleteModal(false)
                  if (todoTasks.length <= 1) {
                    handleCompleteChain()
                  }
                }}
              >
                <Flag className="w-4 h-4 mr-2" />
                Цель достигнута — завершить цепочку
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
