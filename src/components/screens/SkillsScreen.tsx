'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, Star, TrendingUp, Trash2, Edit2, Filter, StarOff,
  RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react'
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
  importance: number
  icon?: string
  color?: string
}

const CATEGORIES = [
  { value: 'all', label: 'Все категории' },
  { value: 'health', label: '🏥 Здоровье' },
  { value: 'money', label: '💰 Деньги' },
  { value: 'learning', label: '📚 Обучение' },
  { value: 'relationships', label: '👥 Отношения' },
  { value: 'mind', label: '🧠 Мышление' },
  { value: 'productivity', label: '⚡ Продуктивность' },
]

const IMPORTANCE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Неважный', color: 'bg-gray-200 text-gray-600' },
  2: { label: 'Обычный', color: 'bg-blue-100 text-blue-600' },
  3: { label: 'Важный', color: 'bg-amber-100 text-amber-600' },
}

export function SkillsScreen() {
  const { user } = useAppStore()
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', category: 'general', color: '#10b981', importance: 2
  })
  const [isSaving, setIsSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterImportance, setFilterImportance] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [xpLoading, setXpLoading] = useState<string | null>(null)

  const loadSkills = async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ userId: user.id })
      if (filterCategory !== 'all') params.set('category', filterCategory)
      if (filterImportance !== 'all') params.set('importance', filterImportance)
      
      const res = await fetch(`/api/skills?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSkills(data.skills || [])
    } catch (err) {
      console.error('Load skills error:', err)
      setError('Не удалось загрузить навыки')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSkills()
  }, [user?.id, filterCategory, filterImportance])

  const handleCreate = async () => {
    if (!user?.id || !form.name.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...form })
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      if (data.skill) {
        setSkills(prev => [...prev, data.skill])
        closeDialog()
      }
    } catch (err) {
      console.error('Create skill error:', err)
      setError('Не удалось создать навык')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingSkill || !form.name.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSkill.id, 
          name: form.name,
          description: form.description,
          category: form.category,
          importance: form.importance
        })
      })
      if (!res.ok) throw new Error('Failed to update')
      const data = await res.json()
      if (data.skill) {
        setSkills(prev => prev.map(s => s.id === editingSkill.id ? data.skill : s))
        closeDialog()
      }
    } catch (err) {
      console.error('Edit skill error:', err)
      setError('Не удалось обновить навык')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить навык?')) return
    try {
      const res = await fetch(`/api/skills?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSkills(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Delete skill error:', err)
      setError('Не удалось удалить навык')
    }
  }

  const handleAddXP = async (skill: Skill) => {
    setXpLoading(skill.id)
    try {
      await fetch('/api/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: skill.id, 
          xpGained: 25, 
          reason: 'manual' 
        })
      })
      await loadSkills()
    } catch (err) {
      console.error('Add XP error:', err)
    } finally {
      setXpLoading(null)
    }
  }

  const openEditDialog = (skill: Skill) => {
    setEditingSkill(skill)
    setForm({
      name: skill.name,
      description: skill.description || '',
      category: skill.category,
      color: skill.color || '#10b981',
      importance: skill.importance
    })
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditingSkill(null)
    setForm({ name: '', description: '', category: 'general', color: '#10b981', importance: 2 })
  }

  // Skeleton component
  const SkillSkeleton = () => (
    <Card className="bg-card/50">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded mb-2" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Навыки</h1>
          <p className="text-muted-foreground text-sm">
            {!isLoading && `${skills.length} навыков`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новый
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={loadSkills}>
                <RefreshCw className="w-4 h-4 mr-1" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-fit"
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter className="w-4 h-4 mr-1" />
        Фильтры
        {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
      </Button>

      {showFilters && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Категория</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Важность</Label>
                <Select value={filterImportance} onValueChange={setFilterImportance}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="3">⭐ Важные</SelectItem>
                    <SelectItem value="2">Обычные</SelectItem>
                    <SelectItem value="1">Неважные</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterCategory !== 'all' || filterImportance !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="self-end"
                  onClick={() => { setFilterCategory('all'); setFilterImportance('all') }}
                >
                  <X className="w-4 h-4 mr-1" /> Сбросить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkillSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && skills.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Навыков пока нет</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Добавить навык
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Skills Grid */}
      {!isLoading && skills.length > 0 && (
        <div className="grid gap-3">
          {skills.map(skill => (
            <Card key={skill.id} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{skill.name}</span>
                      {skill.importance === 3 && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </div>
                    {skill.description && (
                      <div className="text-sm text-muted-foreground">{skill.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={IMPORTANCE_LABELS[skill.importance]?.color || ''}>
                      Lvl {skill.level}/{skill.maxLevel}
                    </Badge>
                  </div>
                </div>
                <Progress value={(skill.xp / skill.xpToNext) * 100} className="h-2 mb-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {skill.xp}/{skill.xpToNext} XP
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(skill)}
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDelete(skill.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddXP(skill)}
                      disabled={xpLoading === skill.id}
                    >
                      {xpLoading === skill.id ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      )}
                      +25 XP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSkill ? 'Редактировать навык' : 'Новый навык'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название *</Label>
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
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Важность</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map(imp => (
                  <Button
                    key={imp}
                    type="button"
                    variant={form.importance === imp ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm(prev => ({ ...prev, importance: imp }))}
                    className="flex-1"
                  >
                    {imp === 1 ? <StarOff className="w-4 h-4" /> : imp === 2 ? <Star className="w-4 h-4" /> : <Star className="w-4 h-4 fill-current" />}
                    <span className="ml-1">{imp}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {IMPORTANCE_LABELS[form.importance]?.label}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeDialog}>
                Отмена
              </Button>
              <Button 
                className="flex-1" 
                onClick={editingSkill ? handleEdit : handleCreate}
                disabled={!form.name.trim() || isSaving}
              >
                {isSaving ? 'Сохранение...' : editingSkill ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
