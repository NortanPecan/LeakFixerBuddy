'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Trophy,
  Flame,
  Target,
  Star,
  Calendar,
  CheckCircle,
  XCircle,
  Timer,
  Trash2,
  Zap,
  Compass,
  RefreshCw,
  Heart,
  TrendingUp
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

// Zone config
const ZONE_CONFIG: Record<string, { label: string; emoji: string }> = {
  health: { label: 'Здоровье', emoji: '💪' },
  money: { label: 'Деньги', emoji: '💰' },
  learning: { label: 'Обучение', emoji: '📚' },
  relationships: { label: 'Отношения', emoji: '👥' },
  mind: { label: 'Мышление', emoji: '🧠' },
  productivity: { label: 'Продуктивность', emoji: '⚡' },
  general: { label: 'Общее', emoji: '📦' },
}

// Challenge type config
const TYPE_CONFIG: Record<string, { label: string; icon: typeof Trophy; description: string }> = {
  ritual: { 
    label: 'На ритуалы', 
    icon: Flame, 
    description: 'Выполняй ритуалы каждый день без пропусков' 
  },
  chain: { 
    label: 'На цепочку', 
    icon: Target, 
    description: 'Завершай шаги в цепочке задач' 
  },
  custom: { 
    label: 'Свободный', 
    icon: Star, 
    description: 'Выполняй действия в выбранной зоне' 
  },
}

interface Challenge {
  id: string
  name: string
  description?: string
  type: string
  zone: string
  directionId?: string
  config: string
  duration: number
  progress: number
  progressPercentage: number
  daysCompleted: number
  currentStreak: number
  startDate: string
  endDate?: string
  status: string
  direction?: { id: string; title: string; color: string }
  linkedRituals?: Array<{ id: string; title: string; category: string }>
  linkedSkills?: Array<{ id: string; name: string; level: number }>
  linkedTraits?: Array<{ id: string; name: string; score: number }>
}

export function ChallengeDetailScreen() {
  const { selectedContentId, setScreen } = useAppStore()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadChallenge = async () => {
    if (!selectedContentId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/challenges?id=${selectedContentId}`)
      const data = await res.json()
      if (data.success && data.challenge) {
        setChallenge(data.challenge)
      } else {
        setError('Челендж не найден')
      }
    } catch (err) {
      console.error('Failed to load challenge:', err)
      setError('Не удалось загрузить челендж')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChallenge()
  }, [selectedContentId])

  const handleDelete = async () => {
    if (!challenge || !confirm('Отменить челендж?')) return
    
    try {
      await fetch(`/api/challenges?id=${challenge.id}`, { method: 'DELETE' })
      setScreen('goals')
    } catch (error) {
      console.error('Failed to delete challenge:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  const getDaysRemaining = () => {
    if (!challenge) return 0
    const start = new Date(challenge.startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + challenge.duration)
    const now = new Date()
    const remaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, remaining)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen('goals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Skeleton className="h-6 w-40" />
        </div>
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error || !challenge) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen('goals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Ошибка</h1>
        </div>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400">{error || 'Челендж не найден'}</p>
              <Button size="sm" variant="outline" onClick={loadChallenge}>
                <RefreshCw className="w-4 h-4 mr-1" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const typeConfig = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.custom
  const zoneConfig = ZONE_CONFIG[challenge.zone] || ZONE_CONFIG.general
  const TypeIcon = typeConfig.icon
  const daysRemaining = getDaysRemaining()

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen('goals')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold truncate">{challenge.name}</h1>
      </div>

      {/* Direction link */}
      {challenge.direction && (
        <Card 
          className="cursor-pointer hover:bg-card/80 transition-colors"
          style={{ borderLeftWidth: 3, borderLeftColor: challenge.direction.color }}
          onClick={() => setScreen('goals')}
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <Compass className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Направление</div>
                <div className="font-medium">{challenge.direction.title}</div>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: challenge.direction?.color 
                    ? `${challenge.direction.color}20` 
                    : 'hsl(var(--primary) / 0.2)'
                }}
              >
                <TypeIcon 
                  className="w-6 h-6" 
                  style={{ color: challenge.direction?.color || 'hsl(var(--primary))' }} 
                />
              </div>
              <div>
                <div className="font-medium">{typeConfig.label}</div>
                <div className="text-sm text-muted-foreground">
                  {zoneConfig.emoji} {zoneConfig.label}
                </div>
              </div>
            </div>
            {challenge.status === 'completed' ? (
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-3 h-3 mr-1" /> Выполнен
              </Badge>
            ) : challenge.status === 'failed' ? (
              <Badge className="bg-red-500/20 text-red-400">
                <XCircle className="w-3 h-3 mr-1" /> Провален
              </Badge>
            ) : (
              <Badge className="bg-primary/20 text-primary">
                <Timer className="w-3 h-3 mr-1" /> Активен
              </Badge>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{challenge.progressPercentage}%</span>
            </div>
            <Progress value={challenge.progressPercentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {challenge.type === 'chain' 
                  ? `${challenge.daysCompleted} шагов`
                  : `${challenge.daysCompleted}/${challenge.duration} дней`
                }
              </span>
              {challenge.status === 'active' && (
                <span>Осталось {daysRemaining} дней</span>
              )}
            </div>
          </div>

          {/* Streak */}
          {challenge.currentStreak > 0 && challenge.status === 'active' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium text-orange-400">{challenge.currentStreak} дней подряд</div>
                <div className="text-xs text-muted-foreground">Продолжай в том же духе!</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description / Context */}
      {challenge.description && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Зачем я это делаю</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{challenge.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Период</div>
              <div className="font-medium">
                {formatDate(challenge.startDate)} — {challenge.endDate ? formatDate(challenge.endDate) : `${challenge.duration} дней`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Тип</div>
              <div className="font-medium">{typeConfig.description}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Длительность</div>
              <div className="font-medium">{challenge.duration} дней</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked entities - what supports this challenge */}
      {(challenge.linkedRituals?.length || challenge.linkedSkills?.length || challenge.linkedTraits?.length) ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Что помогает достижению
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Linked Rituals */}
            {challenge.linkedRituals && challenge.linkedRituals.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Ритуалы</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.linkedRituals.map(r => (
                    <Badge key={r.id} variant="outline" className="text-xs">
                      <Flame className="w-3 h-3 mr-1" />
                      {r.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Skills */}
            {challenge.linkedSkills && challenge.linkedSkills.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Навыки</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.linkedSkills.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      {s.name} (Lvl {s.level})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Traits */}
            {challenge.linkedTraits && challenge.linkedTraits.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Качества</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.linkedTraits.map(t => (
                    <Badge key={t.id} variant="outline" className="text-xs">
                      <Heart className="w-3 h-3 mr-1" />
                      {t.name} ({t.score}/10)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* How it works */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Как это работает</h3>
          {challenge.type === 'ritual' && (
            <p className="text-sm text-muted-foreground">
              Выполняй свои ритуалы каждый день. Прогресс считается автоматически на основе выполненных ритуалов. 
              Старайся не пропускать дни, чтобы сохранить серию!
            </p>
          )}
          {challenge.type === 'chain' && (
            <p className="text-sm text-muted-foreground">
              Завершай задачи в цепочке. Прогресс считается автоматически на основе выполненных задач из цепочек.
              Каждая завершённая задача приближает тебя к цели!
            </p>
          )}
          {challenge.type === 'custom' && (
            <p className="text-sm text-muted-foreground">
              Выполняй действия в зоне «{zoneConfig.label}». Прогресс считается на основе созданных и выполненных задач 
              в этой зоне. Установи свою цель и достигай её!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete button */}
      {challenge.status === 'active' && (
        <Button 
          variant="outline" 
          className="text-red-500 border-red-500/30 hover:bg-red-500/10"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Отменить челендж
        </Button>
      )}
    </div>
  )
}
