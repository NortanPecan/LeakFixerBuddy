'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, Heart, TrendingUp, TrendingDown, Trash2, Edit2, RefreshCw,
  AlertTriangle
} from 'lucide-react'
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
  targetScore: number | null
  gap?: number
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
  const [topGaps, setTopGaps] = useState<Trait[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTrait, setEditingTrait] = useState<Trait | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', type: 'positive', category: 'mind', score: 5, targetScore: 8
  })
  const [isSaving, setIsSaving] = useState(false)

  const loadTraits = async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/traits?userId=${user.id}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTraits(data.traits || [])
      setTopGaps(data.topGaps || [])
    } catch (err) {
      console.error('Load traits error:', err)
      setError('Не удалось загрузить качества')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTraits()
  }, [user?.id])

  const handleCreate = async () => {
    if (!user?.id || !form.name.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          ...form,
          targetScore: form.targetScore || null
        })
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      if (data.trait) {
        await loadTraits()
        closeDialog()
      }
    } catch (err) {
      console.error('Create trait error:', err)
      setError('Не удалось создать качество')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingTrait || !form.name.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/traits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingTrait.id, 
          name: form.name,
          description: form.description,
          type: form.type,
          category: form.category,
          targetScore: form.targetScore || null
        })
      })
      if (!res.ok) throw new Error('Failed to update')
      await loadTraits()
      closeDialog()
    } catch (err) {
      console.error('Edit trait error:', err)
      setError('Не удалось обновить качество')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить качество?')) return
    try {
      const res = await fetch(`/api/traits?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setTraits(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error('Delete trait error:', err)
      setError('Не удалось удалить качество')
    }
  }

  const handleChangeScore = async (trait: Trait, delta: number) => {
    const newScore = Math.max(1, Math.min(10, trait.score + delta))
    try {
      await fetch('/api/traits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trait.id, scoreChange: delta, reason: 'manual' })
      })
      setTraits(prev => prev.map(t => t.id === trait.id ? { ...t, score: newScore } : t))
    } catch (err) {
      console.error('Change score error:', err)
    }
  }

  const openEditDialog = (trait: Trait) => {
    setEditingTrait(trait)
    setForm({
      name: trait.name,
      description: trait.description || '',
      type: trait.type,
      category: trait.category,
      score: trait.score,
      targetScore: trait.targetScore || 8
    })
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditingTrait(null)
    setForm({ name: '', description: '', type: 'positive', category: 'mind', score: 5, targetScore: 8 })
  }

  const positiveTraits = traits.filter(t => t.type === 'positive')
  const negativeTraits = traits.filter(t => t.type === 'negative')
  const neutralTraits = traits.filter(t => t.type === 'neutral')

  // Skeleton
  const TraitSkeleton = () => (
    <Card className="bg-card/50">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <Skeleton className="h-3 w-48 mb-3" />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </CardContent>
    </Card>
  )

  const renderTrait = (trait: Trait) => {
    const hasTarget = trait.targetScore !== null && trait.type === 'positive'
    const progressPercent = hasTarget ? (trait.score / (trait.targetScore || 10)) * 100 : (trait.score / 10) * 100

    return (
      <Card key={trait.id} className="bg-card/50 backdrop-blur">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">{trait.name}</div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => openEditDialog(trait)}
              >
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(trait.id)}>
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
          {trait.description && (
            <div className="text-sm text-muted-foreground mb-2">{trait.description}</div>
          )}
          
          {/* Progress bar for positive traits with target */}
          {hasTarget && (
            <div className="mb-2">
              <Progress value={progressPercent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Текущий: {trait.score}</span>
                <span>Цель: {trait.targetScore}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleChangeScore(trait, -1)}>
                <TrendingDown className="w-3 h-3" />
              </Button>
              <Badge variant="outline">
                {trait.score}{hasTarget ? `/${trait.targetScore}` : '/10'}
              </Badge>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleChangeScore(trait, 1)}>
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
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Качества</h1>
          <p className="text-muted-foreground text-sm">
            {!isLoading && `${traits.length} качеств`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новое
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={loadTraits}>
                <RefreshCw className="w-4 h-4 mr-1" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <TraitSkeleton key={i} />)}
        </div>
      )}

      {/* TOP-3 Gaps Analytics */}
      {!isLoading && topGaps.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              ТОП-3 зоны для развития
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topGaps.map((trait, idx) => (
              <div key={trait.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">#{idx + 1}</span>
                  <span>{trait.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(trait.score / (trait.targetScore || 10)) * 100} className="h-2 w-16" />
                  <span className="text-sm text-muted-foreground">
                    {trait.score} → {trait.targetScore}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && traits.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Качеств пока нет</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Добавить качество
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Positive */}
      {!isLoading && positiveTraits.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Положительные ({positiveTraits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {positiveTraits.map(renderTrait)}
          </CardContent>
        </Card>
      )}

      {/* Negative */}
      {!isLoading && negativeTraits.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-500 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Отрицательные ({negativeTraits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {negativeTraits.map(renderTrait)}
          </CardContent>
        </Card>
      )}

      {/* Neutral */}
      {!isLoading && neutralTraits.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Нейтральные ({neutralTraits.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {neutralTraits.map(renderTrait)}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTrait ? 'Редактировать качество' : 'Новое качество'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название *</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Текущий уровень (1-10)</Label>
                <Input 
                  type="number"
                  min={1}
                  max={10}
                  value={form.score}
                  onChange={e => setForm(prev => ({ ...prev, score: parseInt(e.target.value) || 5 }))}
                />
              </div>
              {form.type === 'positive' && (
                <div className="space-y-2">
                  <Label>Целевой уровень</Label>
                  <Input 
                    type="number"
                    min={1}
                    max={10}
                    value={form.targetScore}
                    onChange={e => setForm(prev => ({ ...prev, targetScore: parseInt(e.target.value) || 8 }))}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeDialog}>
                Отмена
              </Button>
              <Button 
                className="flex-1" 
                onClick={editingTrait ? handleEdit : handleCreate}
                disabled={!form.name.trim() || isSaving}
              >
                {isSaving ? 'Сохранение...' : editingTrait ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
