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
import { Textarea } from '@/components/ui/textarea'
import {
  Plus, Target, ChevronRight, Sparkles, Trash2, Edit2, Check,
  Compass, Trophy, Flame, Calendar, Clock, RefreshCw, ArrowRight, Play
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

// Types
interface Direction {
  id: string
  title: string
  description?: string
  horizon: string
  color: string
  icon?: string
  status: string
  _count?: { challenges: number }
}

interface Challenge {
  id: string
  name: string
  title?: string
  description?: string
  type: string
  category: string
  zone: string
  status: string
  progress: number
  progressPercentage: number
  daysCompleted: number
  currentStreak: number
  duration: number
  startDate: Date
  endDate?: Date
  directionId?: string
  direction?: { id: string; title: string; color: string }
}

interface LinkedEntity {
  id: string
  title?: string
  name?: string
  category?: string
  level?: number
  score?: number
}

// Config - 8 categories with emojis
const CATEGORY_OPTIONS = [
  { value: 'health', label: 'Здоровье', emoji: '💪' },
  { value: 'money', label: 'Деньги', emoji: '💰' },
  { value: 'projects', label: 'Проекты', emoji: '🚀' },
  { value: 'relationships', label: 'Отношения', emoji: '❤️' },
  { value: 'learning', label: 'Обучение', emoji: '📚' },
  { value: 'lifestyle', label: 'Образ жизни', emoji: '🏠' },
  { value: 'career', label: 'Карьера', emoji: '👔' },
  { value: 'general', label: 'Общее', emoji: '📦' },
]

const HORIZON_OPTIONS = [
  { value: 'year', label: 'Год' },
  { value: 'season', label: 'Сезон' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'month', label: 'Месяц' },
]

const CHALLENGE_TYPES = [
  { value: 'custom', label: 'Свободный', icon: Sparkles },
  { value: 'ritual', label: 'На ритуалы', icon: Flame },
  { value: 'chain', label: 'На цепочку', icon: Target },
]

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Запланирован', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'active', label: 'Активен', color: 'bg-primary/20 text-primary' },
  { value: 'completed', label: 'Выполнен', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'failed', label: 'Провален', color: 'bg-red-500/20 text-red-400' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function GoalsScreen() {
  const { user, setScreen, setSelectedContentId } = useAppStore()
  const [directions, setDirections] = useState<Direction[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Linked entities for challenge dialog
  const [availableRituals, setAvailableRituals] = useState<LinkedEntity[]>([])
  const [availableSkills, setAvailableSkills] = useState<LinkedEntity[]>([])
  const [availableTraits, setAvailableTraits] = useState<LinkedEntity[]>([])
  
  // Dialogs
  const [showDirectionDialog, setShowDirectionDialog] = useState(false)
  const [showChallengeDialog, setShowChallengeDialog] = useState(false)
  const [editingDirection, setEditingDirection] = useState<Direction | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Forms
  const [directionForm, setDirectionForm] = useState({
    title: '', description: '', horizon: 'year', color: '#10b981'
  })
  const [challengeForm, setChallengeForm] = useState({
    name: '', 
    description: '',
    type: 'custom', 
    category: 'general',
    directionId: '', 
    duration: 30,
    zone: 'general',
    status: 'active',
    linkedRitualIds: [] as string[],
    linkedSkillIds: [] as string[],
    linkedTraitIds: [] as string[]
  })

  // Load data
  const loadData = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [dirsRes, chalsRes] = await Promise.all([
        fetch(`/api/directions?userId=${user.id}`),
        fetch(`/api/challenges?userId=${user.id}`)
      ])
      
      if (!dirsRes.ok || !chalsRes.ok) throw new Error('Failed to load')
      
      const dirs = await dirsRes.json()
      const chals = await chalsRes.json()
      
      setDirections(dirs.directions || [])
      setChallenges(chals.challenges || [])
    } catch (err) {
      console.error('Load error:', err)
      setError('Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Load linked entities when challenge dialog opens
  useEffect(() => {
    if (showChallengeDialog && user?.id) {
      const loadLinkedEntities = async () => {
        try {
          const [ritualsRes, skillsRes, traitsRes] = await Promise.all([
            fetch(`/api/rituals?userId=${user.id}`),
            fetch(`/api/skills?userId=${user.id}`),
            fetch(`/api/traits?userId=${user.id}`)
          ])
          
          const ritualsData = await ritualsRes.json()
          const skillsData = await skillsRes.json()
          const traitsData = await traitsRes.json()
          
          setAvailableRituals(ritualsData.rituals || [])
          setAvailableSkills(skillsData.skills || [])
          setAvailableTraits(traitsData.traits || [])
        } catch (err) {
          console.error('Failed to load linked entities:', err)
        }
      }
      loadLinkedEntities()
    }
  }, [showChallengeDialog, user?.id])

  // Direction CRUD
  const handleCreateDirection = async () => {
    if (!user?.id || !directionForm.title.trim()) return
    setIsSaving(true)
    
    try {
      const res = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...directionForm })
      })
      const data = await res.json()
      if (data.direction) {
        setDirections(prev => [...prev, data.direction])
        closeDirectionDialog()
      }
    } catch (err) {
      console.error('Create direction error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateDirection = async () => {
    if (!editingDirection || !directionForm.title.trim()) return
    setIsSaving(true)
    
    try {
      const res = await fetch('/api/directions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDirection.id, ...directionForm })
      })
      const data = await res.json()
      if (data.direction) {
        setDirections(prev => prev.map(d => d.id === editingDirection.id ? data.direction : d))
        closeDirectionDialog()
      }
    } catch (err) {
      console.error('Update direction error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDirection = async (id: string) => {
    if (!confirm('Удалить направление? Челенджи останутся без направления.')) return
    
    try {
      await fetch(`/api/directions?id=${id}`, { method: 'DELETE' })
      setDirections(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error('Delete direction error:', err)
    }
  }

  const openEditDirection = (dir: Direction) => {
    setEditingDirection(dir)
    setDirectionForm({
      title: dir.title,
      description: dir.description || '',
      horizon: dir.horizon || 'year',
      color: dir.color
    })
    setShowDirectionDialog(true)
  }

  const closeDirectionDialog = () => {
    setShowDirectionDialog(false)
    setEditingDirection(null)
    setDirectionForm({ title: '', description: '', horizon: 'year', color: '#10b981' })
  }

  // Challenge CRUD
  const handleCreateChallenge = async () => {
    if (!user?.id || !challengeForm.name.trim()) return
    setIsSaving(true)
    
    try {
      // Build config with linked entities
      const config = {
        linkedRitualIds: challengeForm.linkedRitualIds,
        linkedSkillIds: challengeForm.linkedSkillIds,
        linkedTraitIds: challengeForm.linkedTraitIds
      }
      
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          name: challengeForm.name,
          description: challengeForm.description,
          type: challengeForm.type,
          category: challengeForm.category,
          zone: challengeForm.zone,
          duration: challengeForm.duration,
          status: challengeForm.status,
          directionId: challengeForm.directionId || null,
          config
        })
      })
      const data = await res.json()
      if (data.challenge) {
        setChallenges(prev => [...prev, data.challenge])
        closeChallengeDialog()
      }
    } catch (err) {
      console.error('Create challenge error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('Удалить челендж?')) return
    
    try {
      await fetch(`/api/challenges?id=${id}`, { method: 'DELETE' })
      setChallenges(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Delete challenge error:', err)
    }
  }

  const closeChallengeDialog = () => {
    setShowChallengeDialog(false)
    setChallengeForm({
      name: '', description: '', type: 'custom', category: 'general', directionId: '', duration: 30, zone: 'general', status: 'active',
      linkedRitualIds: [], linkedSkillIds: [], linkedTraitIds: []
    })
  }

  // Start planned challenge
  const handleStartChallenge = async (id: string) => {
    try {
      const res = await fetch('/api/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'active', startDate: new Date().toISOString() })
      })
      const data = await res.json()
      if (data.challenge) {
        setChallenges(prev => prev.map(c => c.id === id ? data.challenge : c))
      }
    } catch (err) {
      console.error('Start challenge error:', err)
    }
  }

  // Group challenges by status
  const activeChallenges = challenges.filter(c => c.status === 'active')
  const plannedChallenges = challenges.filter(c => c.status === 'planned')
  const completedChallenges = challenges.filter(c => c.status === 'completed' || c.status === 'failed')

  // Get challenges for direction
  const getChallengesForDirection = (dirId: string) => 
    challenges.filter(c => c.directionId === dirId && c.status === 'active')

  // Get category info
  const getCategoryInfo = (category: string) => 
    CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[7]

  // Skeleton components
  const DirectionSkeleton = () => (
    <div className="flex-shrink-0 w-32">
      <Skeleton className="h-20 rounded-lg" />
    </div>
  )

  const ChallengeSkeleton = () => (
    <Card className="bg-card/50">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => <DirectionSkeleton key={i} />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <ChallengeSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400">{error}</p>
              <Button size="sm" variant="outline" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-1" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Цели</h1>
        <Button size="sm" onClick={() => setShowChallengeDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Челендж
        </Button>
      </div>

      {/* Directions Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Compass className="w-4 h-4" />
            <span className="text-sm font-medium">Направления</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowDirectionDialog(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {directions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3 text-center">
              <Compass className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-2">
                Создай направления — большие цели, к которым идёшь
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowDirectionDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Направление
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {directions.map(dir => {
              const dirChallenges = getChallengesForDirection(dir.id)
              const horizonLabel = HORIZON_OPTIONS.find(h => h.value === dir.horizon)?.label || 'Год'
              return (
                <Card 
                  key={dir.id}
                  className="flex-shrink-0 w-36 cursor-pointer hover:bg-card/80 transition-colors relative group"
                  style={{ borderLeftWidth: 3, borderLeftColor: dir.color }}
                  onClick={() => openEditDirection(dir)}
                >
                  <CardContent className="pt-3 pb-2 px-3">
                    <div className="font-medium text-sm truncate mb-1">{dir.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {dirChallenges.length} активных челенджей
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      🎯 {horizonLabel}
                    </div>
                    {dir.description && (
                      <div className="text-xs text-muted-foreground/70 truncate mt-1">
                        {dir.description}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDirection(dir.id) }}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
            <Card 
              className="flex-shrink-0 w-24 border-dashed cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-center"
              onClick={() => setShowDirectionDialog(true)}
            >
              <div className="text-center text-muted-foreground">
                <Plus className="w-6 h-6 mx-auto mb-1" />
                <span className="text-xs">Добавить</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Active Challenges */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Активные ({activeChallenges.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeChallenges.length === 0 ? (
            <div className="text-center py-4">
              <Target className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm mb-3">
                Нет активных челенджей
              </p>
              <Button size="sm" onClick={() => setShowChallengeDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Создать челендж
              </Button>
            </div>
          ) : (
            activeChallenges.map(ch => {
              const catInfo = getCategoryInfo(ch.category)
              return (
                <div 
                  key={ch.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedContentId(ch.id)
                    setScreen('challenge-detail')
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: ch.direction?.color ? `${ch.direction.color}20` : '#10b98120' }}
                  >
                    {ch.type === 'ritual' ? (
                      <Flame className="w-5 h-5" style={{ color: ch.direction?.color || '#10b981' }} />
                    ) : ch.type === 'chain' ? (
                      <Target className="w-5 h-5" style={{ color: ch.direction?.color || '#10b981' }} />
                    ) : (
                      <Sparkles className="w-5 h-5" style={{ color: ch.direction?.color || '#10b981' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{ch.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {catInfo.emoji} {catInfo.label}
                      </Badge>
                    </div>
                    {ch.direction && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] px-1.5 mt-1"
                        style={{ borderColor: ch.direction.color, color: ch.direction.color }}
                      >
                        {ch.direction.title}
                      </Badge>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <Progress value={ch.progressPercentage} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {ch.progressPercentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{ch.daysCompleted}/{ch.duration} дней</span>
                      {ch.currentStreak > 0 && (
                        <>
                          <span>•</span>
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span className="text-orange-400">{ch.currentStreak} серия</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleDeleteChallenge(ch.id) }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Planned Challenges */}
      {plannedChallenges.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Запланировано ({plannedChallenges.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plannedChallenges.map(ch => {
              const catInfo = getCategoryInfo(ch.category)
              return (
                <div 
                  key={ch.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/20"
                >
                  <div className="flex-1 cursor-pointer hover:bg-muted/30 rounded-lg"
                    onClick={() => {
                      setSelectedContentId(ch.id)
                      setScreen('challenge-detail')
                    }}
                  >
                    <div className="font-medium">{ch.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {catInfo.emoji} {catInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {ch.duration} дней
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleStartChallenge(ch.id)}
                    className="shrink-0"
                  >
                    <Play className="w-4 h-4 mr-1" /> Начать
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Завершённые ({completedChallenges.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedChallenges.slice(0, 5).map(ch => (
              <div 
                key={ch.id} 
                className="flex items-center gap-3 p-2 rounded-lg opacity-70"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{ch.name}</div>
                </div>
                <Badge 
                  variant={ch.status === 'completed' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {ch.status === 'completed' ? '✓' : '✗'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Direction Dialog */}
      <Dialog open={showDirectionDialog} onOpenChange={closeDirectionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingDirection ? 'Редактировать направление' : 'Новое направление'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input 
                value={directionForm.title}
                onChange={e => setDirectionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Например: Тело, Деньги, Отношения"
              />
            </div>
            <div className="space-y-2">
              <Label>Видение (зачем это важно)</Label>
              <Textarea 
                value={directionForm.description}
                onChange={e => setDirectionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Куда я хочу прийти..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Горизонт планирования</Label>
              <Select 
                value={directionForm.horizon}
                onValueChange={v => setDirectionForm(prev => ({ ...prev, horizon: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORIZON_OPTIONS.map(h => (
                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${directionForm.color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setDirectionForm(prev => ({ ...prev, color: c }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeDirectionDialog}>
                Отмена
              </Button>
              <Button 
                className="flex-1" 
                onClick={editingDirection ? handleUpdateDirection : handleCreateDirection}
                disabled={!directionForm.title.trim() || isSaving}
              >
                {isSaving ? 'Сохранение...' : editingDirection ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Dialog */}
      <Dialog open={showChallengeDialog} onOpenChange={closeChallengeDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый челендж</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input 
                value={challengeForm.name}
                onChange={e => setChallengeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Что делаем?"
              />
            </div>
            <div className="space-y-2">
              <Label>Контекст (зачем я это делаю)</Label>
              <Textarea 
                value={challengeForm.description}
                onChange={e => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Почему это важно..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <div className="grid grid-cols-3 gap-2">
                {CHALLENGE_TYPES.map(t => {
                  const Icon = t.icon
                  return (
                    <Button
                      key={t.value}
                      type="button"
                      variant={challengeForm.type === t.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChallengeForm(prev => ({ ...prev, type: t.value }))}
                      className="flex-col h-auto py-2"
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-xs">{t.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select 
                  value={challengeForm.category}
                  onValueChange={v => setChallengeForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Длительность</Label>
                <Input 
                  type="number"
                  value={challengeForm.duration}
                  onChange={e => setChallengeForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Направление (опционально)</Label>
              <Select 
                value={challengeForm.directionId}
                onValueChange={v => setChallengeForm(prev => ({ ...prev, directionId: v === '_none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без направления" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Без направления</SelectItem>
                  {directions.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select 
                value={challengeForm.status}
                onValueChange={v => setChallengeForm(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="planned">Запланированный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Linked Entities */}
            <div className="space-y-3">
              <Label className="text-muted-foreground">Связанные сущности (опционально)</Label>
              
              {/* Rituals */}
              {availableRituals.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Ритуалы
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableRituals.slice(0, 6).map(r => (
                      <Badge 
                        key={r.id}
                        variant={challengeForm.linkedRitualIds.includes(r.id) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => setChallengeForm(prev => ({
                          ...prev,
                          linkedRitualIds: prev.linkedRitualIds.includes(r.id)
                            ? prev.linkedRitualIds.filter(id => id !== r.id)
                            : [...prev.linkedRitualIds, r.id]
                        }))}
                      >
                        {r.title || r.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skills */}
              {availableSkills.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Навыки
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSkills.slice(0, 6).map(s => (
                      <Badge 
                        key={s.id}
                        variant={challengeForm.linkedSkillIds.includes(s.id) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => setChallengeForm(prev => ({
                          ...prev,
                          linkedSkillIds: prev.linkedSkillIds.includes(s.id)
                            ? prev.linkedSkillIds.filter(id => id !== s.id)
                            : [...prev.linkedSkillIds, s.id]
                        }))}
                      >
                        {s.name} (Lvl {s.level || 1})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Traits */}
              {availableTraits.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> Качества
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTraits.slice(0, 6).map(t => (
                      <Badge 
                        key={t.id}
                        variant={challengeForm.linkedTraitIds.includes(t.id) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => setChallengeForm(prev => ({
                          ...prev,
                          linkedTraitIds: prev.linkedTraitIds.includes(t.id)
                            ? prev.linkedTraitIds.filter(id => id !== t.id)
                            : [...prev.linkedTraitIds, t.id]
                        }))}
                      >
                        {t.name} ({t.score || 5}/10)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeChallengeDialog}>
                Отмена
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreateChallenge}
                disabled={!challengeForm.name.trim() || isSaving}
              >
                {isSaving ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
