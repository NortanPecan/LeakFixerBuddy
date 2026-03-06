'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Trophy,
  Plus,
  Flame,
  Target,
  Zap,
  Calendar,
  CheckCircle,
  XCircle,
  Timer,
  Star
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

// Zone config
const ZONE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  steam: { label: 'Steam', emoji: '🎮', color: '#1b2838' },
  leakfixer: { label: 'LeakFixer', emoji: '🔧', color: '#4a5568' },
  ai: { label: 'ИИ', emoji: '🤖', color: '#6366f1' },
  poker: { label: 'Покер', emoji: '♠️', color: '#059669' },
  health: { label: 'Здоровье', emoji: '💪', color: '#dc2626' },
  life: { label: 'Жизнь', emoji: '🏠', color: '#f59e0b' },
  savings: { label: 'Резерв', emoji: '💰', color: '#10b981' },
  general: { label: 'Общее', emoji: '📦', color: '#6b7280' },
}

// Challenge type icons
const TYPE_ICONS: Record<string, typeof Trophy> = {
  ritual: Flame,
  chain: Target,
  custom: Star,
}

interface Challenge {
  id: string
  name: string
  type: string
  zone: string
  duration: number
  progress: number
  progressPercentage: number
  daysCompleted: number
  currentStreak: number
  status: string
  startDate: Date
  endDate: Date | null
  createdAt: Date
}

export function ChallengesScreen() {
  const { user, setScreen, setSelectedContentId } = useAppStore()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')
  
  // Create form state
  const [newChallenge, setNewChallenge] = useState({
    name: '',
    type: 'ritual',
    zone: 'general',
    duration: '14',
    targetDays: '',
    targetSteps: '',
    targetCount: '',
    periodDays: '30',
    actionType: 'actions'
  })

  // Load challenges
  useEffect(() => {
    const loadChallenges = async () => {
      if (!user?.id) return
      
      setLoading(true)
      setError(null)
      try {
        const status = filter === 'all' ? '' : `&status=${filter}`
        const res = await fetch(`/api/challenges?userId=${user.id}${status}`)
        if (!res.ok) throw new Error('Failed to load challenges')
        const data = await res.json()
        if (data.success) {
          setChallenges(data.challenges)
        }
      } catch (err) {
        console.error('Failed to load challenges:', err)
        setError('Не удалось загрузить челенджи')
      } finally {
        setLoading(false)
      }
    }
    
    loadChallenges()
  }, [user?.id, filter])

  // Create challenge
  const handleCreateChallenge = async () => {
    if (!user?.id || !newChallenge.name) return
    
    try {
      const config: Record<string, unknown> = {}
      
      if (newChallenge.type === 'ritual') {
        config.targetDays = parseInt(newChallenge.targetDays) || parseInt(newChallenge.duration)
      } else if (newChallenge.type === 'chain') {
        config.targetSteps = parseInt(newChallenge.targetSteps) || 0
      } else if (newChallenge.type === 'custom') {
        config.targetCount = parseInt(newChallenge.targetCount) || 0
        config.periodDays = parseInt(newChallenge.periodDays) || 30
        config.actionType = newChallenge.actionType
      }
      
      await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newChallenge.name,
          type: newChallenge.type,
          zone: newChallenge.zone,
          duration: parseInt(newChallenge.duration),
          config
        })
      })
      
      // Reload
      const res = await fetch(`/api/challenges?userId=${user.id}`)
      const data = await res.json()
      if (data.success) {
        setChallenges(data.challenges)
      }
      
      setShowCreateDialog(false)
      setNewChallenge({
        name: '',
        type: 'ritual',
        zone: 'general',
        duration: '14',
        targetDays: '',
        targetSteps: '',
        targetCount: '',
        periodDays: '30',
        actionType: 'actions'
      })
    } catch (error) {
      console.error('Failed to create challenge:', error)
    }
  }

  // Delete challenge
  const handleDeleteChallenge = async (id: string) => {
    try {
      await fetch(`/api/challenges?id=${id}`, { method: 'DELETE' })
      setChallenges(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      console.error('Failed to delete challenge:', error)
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Выполнен</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Провален</Badge>
      default:
        return <Badge className="bg-primary/20 text-primary"><Timer className="w-3 h-3 mr-1" />Активен</Badge>
    }
  }

  // Active challenges
  const activeChallenges = challenges.filter(c => c.status === 'active')
  const completedChallenges = challenges.filter(c => c.status !== 'active')

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Челенджи</h1>
        {/* Loading skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/50 backdrop-blur animate-pulse">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Челенджи</h1>
        <Button size="sm" className="bg-primary" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Новый
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button 
          variant={filter === 'active' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'bg-primary' : ''}
        >
          Активные ({activeChallenges.length})
        </Button>
        <Button 
          variant={filter === 'completed' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-primary' : ''}
        >
          Завершённые ({completedChallenges.length})
        </Button>
      </div>

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

      {/* Challenges list */}
      {challenges.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Нет челенджей</p>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Создать первый челендж
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {challenges.map(challenge => {
            const TypeIcon = TYPE_ICONS[challenge.type] || Trophy
            const zoneConfig = ZONE_CONFIG[challenge.zone] || ZONE_CONFIG.general
            
            return (
              <Card 
                key={challenge.id} 
                className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
                onClick={() => {
                  setSelectedContentId(challenge.id)
                  setScreen('challenge-detail')
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{challenge.name}</h3>
                        {getStatusBadge(challenge.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span>{zoneConfig.emoji} {zoneConfig.label}</span>
                        <span>•</span>
                        <span>{challenge.duration} дней</span>
                      </div>
                      
                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {challenge.type === 'chain' 
                              ? `${challenge.daysCompleted} шагов`
                              : `${challenge.daysCompleted}/${challenge.duration} дней`
                            }
                          </span>
                          <span className="font-medium">{challenge.progressPercentage}%</span>
                        </div>
                        <Progress value={challenge.progressPercentage} className="h-2" />
                      </div>
                      
                      {/* Streak */}
                      {challenge.currentStreak > 0 && challenge.status === 'active' && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-orange-400">
                          <Flame className="w-3 h-3" />
                          <span>{challenge.currentStreak} дней подряд</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Challenge Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый челендж</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="14 дней ритуалов"
                value={newChallenge.name}
                onChange={e => setNewChallenge(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={newChallenge.type} onValueChange={v => setNewChallenge(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ritual">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      На ритуалы
                    </div>
                  </SelectItem>
                  <SelectItem value="chain">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      На цепочку
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Свободный
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Зона</Label>
              <Select value={newChallenge.zone} onValueChange={v => setNewChallenge(prev => ({ ...prev, zone: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ZONE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{config.emoji}</span>
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Длительность (дней)</Label>
              <Input
                type="number"
                placeholder="14"
                value={newChallenge.duration}
                onChange={e => setNewChallenge(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
            
            {newChallenge.type === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Цель (количество действий)</Label>
                  <Input
                    type="number"
                    placeholder="20"
                    value={newChallenge.targetCount}
                    onChange={e => setNewChallenge(prev => ({ ...prev, targetCount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Период (дней)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={newChallenge.periodDays}
                    onChange={e => setNewChallenge(prev => ({ ...prev, periodDays: e.target.value }))}
                  />
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                Отмена
              </Button>
              <Button 
                className="flex-1 bg-primary" 
                onClick={handleCreateChallenge}
                disabled={!newChallenge.name}
              >
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}