'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Zap
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
  type: string
  zone: string
  chainId?: string
  config: string
  duration: number
  progress: number
  startDate: string
  endDate?: string
  status: string
  createdAt: string
  progressPercentage: number
  daysCompleted: number
  currentStreak: number
  lastCheckedAt?: string
}

export function ChallengeDetailScreen() {
  const { selectedContentId, setScreen } = useAppStore()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadChallenge = async () => {
      if (!selectedContentId) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/challenges?id=${selectedContentId}`)
        const data = await res.json()
        if (data.success && data.challenge) {
          setChallenge(data.challenge)
        }
      } catch (error) {
        console.error('Failed to load challenge:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChallenge()
  }, [selectedContentId])

  const handleDelete = async () => {
    if (!challenge || !confirm('Удалить челендж?')) return
    
    try {
      await fetch(`/api/challenges?id=${challenge.id}`, { method: 'DELETE' })
      setScreen('challenges')
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen('challenges')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Загрузка...</h1>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen('challenges')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Челендж не найден</h1>
        </div>
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
        <Button variant="ghost" size="icon" onClick={() => setScreen('challenges')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold truncate">{challenge.name}</h1>
      </div>

      {/* Status card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/20">
                <TypeIcon className="w-6 h-6 text-primary" />
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

      {/* Description based on type */}
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
