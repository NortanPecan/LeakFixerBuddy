'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast, isOnline } from '@/lib/network-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Plus,
  Target,
  Flame,
  Sparkles,
  X,
  Trash2,
  Pencil
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

interface Habit {
  id: string
  name: string
  icon: string
  color: string
  target: number
  streak: number
  completed: number
  isCompleted: boolean
  last7Days?: { date: string; completed: boolean }[]
}

interface WeeklyStat {
  date: string
  completed: number
  total: number
}

// Icons for habit selection
const HABIT_ICONS = ['🧘', '📚', '🚶', '💊', '💪', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '⚡']
const HABIT_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']

export function HabitsScreen() {
  const { user } = useAppStore()
  const [habits, setHabits] = useState<Habit[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', icon: '✨', color: '#10b981', target: 1 })
  const [newHabit, setNewHabit] = useState({
    name: '',
    icon: '✨',
    color: '#10b981',
    target: 1
  })

  // Load habits from API
  const loadHabits = useCallback(async () => {
    if (!user?.id) return
    if (!isOnline()) {
      showErrorToast(new Error('No internet connection'), 'loading habits')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/habits?userId=${user.id}`)
      const data = await response.json()
      setHabits(data.habits || [])
      setWeeklyStats(data.weeklyStats || [])
    } catch (error) {
      showErrorToast(error, 'loading habits')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  // Complete habit
  const handleCompleteHabit = async (habitId: string) => {
    if (!user?.id) return
    if (!isOnline()) {
      showErrorToast(new Error('No internet connection'), 'completing habit')
      return
    }

    try {
      const response = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          userId: user.id,
          completed: true
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setHabits(prev => prev.map(h =>
          h.id === habitId
            ? { ...h, completed: data.log.count, isCompleted: data.log.isCompleted }
            : h
        ))
        showSuccessToast('Habit completed!')
      }
    } catch (error) {
      showErrorToast(error, 'completing habit')
    }
  }

  // Create new habit
  const handleCreateHabit = async () => {
    if (!user?.id || !newHabit.name.trim()) return
    if (!isOnline()) {
      showErrorToast(new Error('No internet connection'), 'creating habit')
      return
    }

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newHabit.name.trim(),
          icon: newHabit.icon,
          color: newHabit.color,
          target: newHabit.target
        })
      })

      const data = await response.json()

      if (data.success) {
        setHabits(prev => [...prev, data.habit])
        setIsAddOpen(false)
        setNewHabit({ name: '', icon: '✨', color: '#10b981', target: 1 })
        showSuccessToast('Habit created successfully!')
      }
    } catch (error) {
      showErrorToast(error, 'creating habit')
    }
  }

  // Open edit dialog
  const openEditDialog = (habit: Habit) => {
    setEditForm({ name: habit.name, icon: habit.icon, color: habit.color, target: habit.target })
    setEditingHabit(habit)
  }

  // Save habit edit
  const handleSaveEdit = async () => {
    if (!editingHabit || !editForm.name.trim()) return
    setIsSavingEdit(true)
    try {
      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId: editingHabit.id,
          name: editForm.name.trim(),
          icon: editForm.icon,
          color: editForm.color,
          target: editForm.target,
        })
      })
      const data = await res.json()
      if (data.success) {
        setHabits(prev => prev.map(h => h.id === editingHabit.id
          ? { ...h, name: data.habit.name, icon: data.habit.icon, color: data.habit.color, target: data.habit.target }
          : h
        ))
        setEditingHabit(null)
        showSuccessToast('Привычка обновлена')
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      showErrorToast(error, 'updating habit')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Delete habit
  const handleDeleteHabit = async () => {
    if (!deletingHabit) return
    if (!isOnline()) {
      showErrorToast(new Error('No internet connection'), 'deleting habit')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/habits?habitId=${deletingHabit.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setHabits(prev => prev.filter(h => h.id !== deletingHabit.id))
        setDeletingHabit(null)
        showSuccessToast('Привычка удалена')
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      showErrorToast(error, 'deleting habit')
    } finally {
      setIsDeleting(false)
    }
  }

  const completedCount = habits.filter(h => h.isCompleted).length
  const totalProgress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0

  // Use real weekly stats from API, fallback to empty if not loaded
  const weeklyData = weeklyStats.length === 7 ? weeklyStats : [
    { date: '', completed: 0, total: habits.length },
    { date: '', completed: 0, total: habits.length },
    { date: '', completed: 0, total: habits.length },
    { date: '', completed: 0, total: habits.length },
    { date: '', completed: 0, total: habits.length },
    { date: '', completed: 0, total: habits.length },
    { date: '', completed: 0, total: habits.length }
  ]

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Привычки</h1>
          <p className="text-muted-foreground text-sm">
            {completedCount} из {habits.length} выполнено сегодня
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Новая привычка</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Медитация"
                />
              </div>

              <div className="space-y-2">
                <Label>Иконка</Label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map((icon) => (
                    <Button
                      key={icon}
                      type="button"
                      variant={newHabit.icon === icon ? 'default' : 'outline'}
                      size="sm"
                      className="text-lg h-10 w-10 p-0"
                      onClick={() => setNewHabit(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Цвет</Label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_COLORS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant={newHabit.color === color ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      style={{ backgroundColor: newHabit.color === color ? color : undefined }}
                      onClick={() => setNewHabit(prev => ({ ...prev, color }))}
                    >
                      <span
                        className="w-5 h-5 rounded-full block"
                        style={{ backgroundColor: color }}
                      />
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Цель (раз в день)</Label>
                <Input
                  id="target"
                  type="number"
                  min={1}
                  value={newHabit.target}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, target: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>
                  Отмена
                </Button>
                <Button className="flex-1 bg-primary" onClick={handleCreateHabit}>
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall progress */}
      {habits.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">Прогресс дня</span>
              </div>
              <span className="text-sm font-medium text-primary">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Habits list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="w-9 h-9 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : habits.length > 0 ? (
        <div className="space-y-3">
          {habits.map((habit) => {
            const progress = (habit.completed / habit.target) * 100

            return (
              <Card
                key={habit.id}
                className={`bg-card/50 backdrop-blur transition-all ${habit.isCompleted ? 'opacity-60' : ''}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${habit.color}20` }}
                    >
                      {habit.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{habit.name}</p>
                        {habit.isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span>{habit.streak} дней</span>
                        <span>•</span>
                        <span>{habit.completed}/{habit.target}</span>
                      </div>
                      {habit.target > 1 && (
                        <Progress value={progress} className="h-1 mt-2" />
                      )}
                      {/* 7-day heatmap */}
                      {habit.last7Days && (
                        <div className="flex gap-0.5 mt-2">
                          {habit.last7Days.map(({ date, completed: done }) => (
                            <div
                              key={date}
                              className="w-3.5 h-3.5 rounded-sm"
                              title={date}
                              style={{
                                background: done
                                  ? (habit.color || '#10b981')
                                  : 'rgba(255,255,255,0.08)',
                                opacity: done ? 0.9 : 1,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant={habit.isCompleted ? 'outline' : 'default'}
                        size="sm"
                        className={`shrink-0 ${habit.isCompleted ? '' : 'bg-primary hover:bg-primary/90'}`}
                        onClick={() => handleCompleteHabit(habit.id)}
                      >
                        {habit.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => openEditDialog(habit)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => setDeletingHabit(habit)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed border-muted-foreground/30 bg-card/30">
          <CardContent className="pt-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">У вас пока нет привычек</p>
            <p className="text-sm text-muted-foreground mt-1">
              Нажмите "Добавить" чтобы создать первую привычку
            </p>
          </CardContent>
        </Card>
      )}

      {/* Weekly stats */}
      {habits.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Статистика недели
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => {
                const { completed, total } = weeklyData[i]
                const percentage = total > 0 ? (completed / total) * 100 : 0
                return (
                  <div key={day} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{day}</div>
                    <div
                      className="w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: percentage === 100 ? '#10b981' :
                          percentage >= 75 ? '#10b98180' :
                          percentage >= 50 ? '#f59e0b40' :
                          percentage > 0 ? '#ef444420' : '#1e2a24'
                      }}
                    >
                      {completed}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit habit dialog */}
      <Dialog open={!!editingHabit} onOpenChange={() => setEditingHabit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать привычку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Название</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Название привычки"
              />
            </div>
            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={editForm.icon === icon ? 'default' : 'outline'}
                    size="sm"
                    className="text-lg h-10 w-10 p-0"
                    onClick={() => setEditForm(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    style={{ outline: editForm.color === color ? `2px solid ${color}` : undefined }}
                    onClick={() => setEditForm(prev => ({ ...prev, color }))}
                  >
                    <span className="w-5 h-5 rounded-full block" style={{ backgroundColor: color }} />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target">Цель (раз в день)</Label>
              <Input
                id="edit-target"
                type="number"
                min={1}
                value={editForm.target}
                onChange={(e) => setEditForm(prev => ({ ...prev, target: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingHabit(null)} disabled={isSavingEdit}>
                Отмена
              </Button>
              <Button className="flex-1 bg-primary" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingHabit} onOpenChange={() => setDeletingHabit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить привычку?</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <p className="text-muted-foreground mb-4">
              Вы уверены, что хотите удалить привычку "{deletingHabit?.name}"? 
              История выполнений будет потеряна.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setDeletingHabit(null)}
                disabled={isDeleting}
              >
                Отмена
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1" 
                onClick={handleDeleteHabit}
                disabled={isDeleting}
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
