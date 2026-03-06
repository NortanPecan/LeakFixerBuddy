'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Heart, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

interface Trait {
  id: string
  name: string
  description?: string
  type: string
  category: string
  score: number
  icon?: string
  color?: string
}

const TYPES = [
  { value: 'positive', label: '✅ Положительная' },
  { value: 'negative', label: '❌ Отрицательная' },
  { value: 'neutral', label: '⚪ Нейтральная' },
]

const CATEGORIES = [
  { value: 'health', label: '🏥 Здоровье' },
  { value: 'mind', label: '🧠 Мышление' },
  { value: 'will', label: '💪 Воля' },
  { value: 'social', label: '👥 Социальные' },
  { value: 'productivity', label: '⚡ Продуктивность' },
]

export function TraitsScreen() {
  const { user } = useAppStore()
  const [traits, setTraits] = useState<Trait[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', type: 'positive', category: 'mind', score: 5
  })

  useEffect(() => {
    if (!user?.id) return
    setIsLoading(true)
    fetch(`/api/traits?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setTraits(data.traits || []))
      .finally(() => setIsLoading(false))
  }, [user?.id])

  const handleCreate = async () => {
    if (!user?.id || !form.name) return
    const res = await fetch('/api/traits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...form })
    })
    const data = await res.json()
    if (data.trait) {
      setTraits(prev => [...prev, data.trait])
      setShowDialog(false)
      setForm({ name: '', description: '', type: 'positive', category: 'mind', score: 5 })
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/traits?id=${id}`, { method: 'DELETE' })
    setTraits(prev => prev.filter(t => t.id !== id))
  }

  const handleChangeScore = async (trait: Trait, delta: number) => {
    const newScore = Math.max(1, Math.min(10, trait.score + delta))
    await fetch('/api/traits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: trait.id, scoreChange: delta, reason: 'manual' })
    })
    setTraits(prev => prev.map(t => t.id === trait.id ? { ...t, score: newScore } : t))
  }

  const positiveTraits = traits.filter(t => t.type === 'positive')
  const negativeTraits = traits.filter(t => t.type === 'negative')
  const neutralTraits = traits.filter(t => t.type === 'neutral')

  const renderTrait = (trait: Trait) => (
    <Card key={trait.id}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">{trait.name}</div>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(trait.id)}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        {trait.description && (
          <div className="text-sm text-muted-foreground mb-2">{trait.description}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleChangeScore(trait, -1)}>
              <TrendingDown className="w-3 h-3" />
            </Button>
            <Badge variant="outline">{trait.score}/10</Badge>
            <Button variant="outline" size="sm" onClick={() => handleChangeScore(trait, 1)}>
              <TrendingUp className="w-3 h-3" />
            </Button>
          </div>
          <Badge variant={trait.type === 'positive' ? 'default' : trait.type === 'negative' ? 'destructive' : 'secondary'}>
            {trait.type === 'positive' ? '+' : trait.type === 'negative' ? '-' : '~'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Черты</h1>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новая
        </Button>
      </div>

      {/* Positive */}
      {positiveTraits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-500">Положительные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {positiveTraits.map(renderTrait)}
          </CardContent>
        </Card>
      )}

      {/* Negative */}
      {negativeTraits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-500">Отрицательные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {negativeTraits.map(renderTrait)}
          </CardContent>
        </Card>
      )}

      {/* Neutral */}
      {neutralTraits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Нейтральные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {neutralTraits.map(renderTrait)}
          </CardContent>
        </Card>
      )}

      {traits.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Черт пока нет</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Добавить черту
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая черта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Дисциплинированность"
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
              <Label>Тип</Label>
              <Select value={form.type} onValueChange={v => setForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label>Начальный уровень (1-10)</Label>
              <Input 
                type="number"
                min={1}
                max={10}
                value={form.score}
                onChange={e => setForm(prev => ({ ...prev, score: parseInt(e.target.value) || 5 }))}
              />
            </div>
            <Button className="w-full" onClick={handleCreate}>Создать</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
