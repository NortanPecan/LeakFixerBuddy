'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Plus, Star, TrendingUp, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

interface Skill {
  id: string
  name: string
  description?: string
  category: string
  level: number
  maxLevel: number
  xp: number
  xpToNext: number
  icon?: string
  color?: string
}

const CATEGORIES = [
  { value: 'health', label: '🏥 Здоровье' },
  { value: 'money', label: '💰 Деньги' },
  { value: 'learning', label: '📚 Обучение' },
  { value: 'relationships', label: '👥 Отношения' },
  { value: 'mind', label: '🧠 Мышление' },
  { value: 'productivity', label: '⚡ Продуктивность' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function SkillsScreen() {
  const { user } = useAppStore()
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', category: 'general', color: '#10b981'
  })

  useEffect(() => {
    if (!user?.id) return
    setIsLoading(true)
    fetch(`/api/skills?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setSkills(data.skills || []))
      .finally(() => setIsLoading(false))
  }, [user?.id])

  const handleCreate = async () => {
    if (!user?.id || !form.name) return
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...form })
    })
    const data = await res.json()
    if (data.skill) {
      setSkills(prev => [...prev, data.skill])
      setShowDialog(false)
      setForm({ name: '', description: '', category: 'general', color: '#10b981' })
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/skills?id=${id}`, { method: 'DELETE' })
    setSkills(prev => prev.filter(s => s.id !== id))
  }

  const handleAddXP = async (skill: Skill) => {
    await fetch('/api/skills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: skill.id, 
        xpGained: 25, 
        reason: 'manual' 
      })
    })
    // Refresh skills
    const res = await fetch(`/api/skills?userId=${user?.id}`)
    const data = await res.json()
    setSkills(data.skills || [])
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Навыки</h1>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новый
        </Button>
      </div>

      {/* Skills Grid */}
      <div className="grid gap-3">
        {skills.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">Навыков пока нет</p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Добавить навык
              </Button>
            </CardContent>
          </Card>
        ) : (
          skills.map(skill => (
            <Card key={skill.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">{skill.name}</div>
                    {skill.description && (
                      <div className="text-sm text-muted-foreground">{skill.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Lvl {skill.level}/{skill.maxLevel}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(skill.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <Progress value={(skill.xp / skill.xpToNext) * 100} className="h-2 mb-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {skill.xp}/{skill.xpToNext} XP
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleAddXP(skill)}>
                    <TrendingUp className="w-3 h-3 mr-1" /> +25 XP
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый навык</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Программирование"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input 
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Краткое описание"
              />
            </div>
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate}>Создать</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
