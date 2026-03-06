'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Plus, Target, ChevronRight, Sparkles, Trash2, Edit2, Check
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

interface Direction {
  id: string
  title: string
  description?: string
  color: string
  icon?: string
  status: string
  _count?: { challenges: number }
}

interface Challenge {
  id: string
  name: string
  type: string
  status: string
  progress: number
  directionId?: string
}

const CATEGORY_OPTIONS = [
  { value: 'health', label: '🏥 Здоровье' },
  { value: 'money', label: '💰 Деньги' },
  { value: 'learning', label: '📚 Обучение' },
  { value: 'relationships', label: '👥 Отношения' },
  { value: 'mind', label: '🧠 Мышление' },
  { value: 'productivity', label: '⚡ Продуктивность' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function GoalsScreen() {
  const { user } = useAppStore()
  const [directions, setDirections] = useState<Direction[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialogs
  const [showDirectionDialog, setShowDirectionDialog] = useState(false)
  const [showChallengeDialog, setShowChallengeDialog] = useState(false)
  const [editingDirection, setEditingDirection] = useState<Direction | null>(null)
  
  // Forms
  const [directionForm, setDirectionForm] = useState({
    title: '', description: '', color: '#10b981'
  })
  const [challengeForm, setChallengeForm] = useState({
    name: '', type: 'custom', directionId: '', duration: 30
  })

  // Load data
  useEffect(() => {
    if (!user?.id) return
    
    const loadData = async () => {
      setIsLoading(true)
      
      const [dirs, chals] = await Promise.all([
        fetch(`/api/directions?userId=${user.id}`).then(r => r.json()),
        fetch(`/api/challenges?userId=${user.id}`).then(r => r.json())
      ])
      
      setDirections(dirs.directions || [])
      setChallenges(chals.challenges || [])
      setIsLoading(false)
    }
    
    loadData()
  }, [user?.id])

  // Direction CRUD
  const handleCreateDirection = async () => {
    if (!user?.id || !directionForm.title) return
    
    const res = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...directionForm })
    })
    const data = await res.json()
    if (data.direction) {
      setDirections(prev => [...prev, data.direction])
      setShowDirectionDialog(false)
      setDirectionForm({ title: '', description: '', color: '#10b981' })
    }
  }

  const handleDeleteDirection = async (id: string) => {
    await fetch(`/api/directions?id=${id}`, { method: 'DELETE' })
    setDirections(prev => prev.filter(d => d.id !== id))
  }

  // Challenge CRUD
  const handleCreateChallenge = async () => {
    if (!user?.id || !challengeForm.name) return
    
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        ...challengeForm,
        directionId: challengeForm.directionId || null
      })
    })
    const data = await res.json()
    if (data.challenge) {
      setChallenges(prev => [...prev, data.challenge])
      setShowChallengeDialog(false)
      setChallengeForm({ name: '', type: 'custom', directionId: '', duration: 30 })
    }
  }

  // Group challenges by status
  const activeChallenges = challenges.filter(c => c.status === 'active')
  const plannedChallenges = challenges.filter(c => c.status === 'planned')
  const completedChallenges = challenges.filter(c => c.status === 'completed')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Цели</h1>
        <Button size="sm" onClick={() => setShowChallengeDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новый челендж
        </Button>
      </div>

      {/* Directions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Направления</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowDirectionDialog(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {directions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Создайте направление — это ваша большая цель
            </p>
          ) : (
            directions.map(dir => (
              <div 
                key={dir.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: dir.color }}
                />
                <div className="flex-1">
                  <div className="font-medium">{dir.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {dir._count?.challenges || 0} челенджей
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); handleDeleteDirection(dir.id) }}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Active Challenges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500" />
            Активные ({activeChallenges.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeChallenges.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Нет активных челенджей
            </p>
          ) : (
            activeChallenges.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <div className="font-medium">{ch.name}</div>
                  <Progress value={ch.progress} className="h-1 mt-2" />
                </div>
                <Badge variant="outline">{ch.progress}%</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Planned Challenges */}
      {plannedChallenges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Запланировано</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plannedChallenges.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <div className="flex-1 font-medium">{ch.name}</div>
                <Badge variant="outline" className="text-muted-foreground">План</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Direction Dialog */}
      <Dialog open={showDirectionDialog} onOpenChange={setShowDirectionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новое направление</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                value={directionForm.title}
                onChange={e => setDirectionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Например: Здоровье"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание (опционально)</Label>
              <Input 
                value={directionForm.description}
                onChange={e => setDirectionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Краткое описание цели"
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded-full ${directionForm.color === c ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setDirectionForm(prev => ({ ...prev, color: c }))}
                  />
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateDirection}>
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Dialog */}
      <Dialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый челендж</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                value={challengeForm.name}
                onChange={e => setChallengeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Что делаем?"
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select 
                value={challengeForm.type}
                onValueChange={v => setChallengeForm(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Свой</SelectItem>
                  <SelectItem value="ritual">Ритуал</SelectItem>
                  <SelectItem value="chain">Цепочка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Направление (опционально)</Label>
              <Select 
                value={challengeForm.directionId}
                onValueChange={v => setChallengeForm(prev => ({ ...prev, directionId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без направления" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Без направления</SelectItem>
                  {directions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreateChallenge}>
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
