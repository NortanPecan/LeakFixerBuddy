'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  User,
  Settings,
  Bell,
  Moon,
  Globe,
  ChevronRight,
  Trophy,
  Flame,
  Target,
  Dumbbell,
  Scale,
  Droplets,
  Edit,
  TrendingUp,
  TrendingDown,
  Users,
  Plus,
  Ruler,
  Heart,
  Brain,
  Zap,
  Calendar,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Star,
  Coffee,
  ExternalLink,
  Check,
  Sun,
  Monitor,
  Sparkles,
  Wallet,
  StickyNote,
  BookOpen
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/rituals/data'

// Work profile labels
const WORK_PROFILE_LABELS: Record<string, string> = {
  sedentary: 'Сидячий',
  moderate: 'Умеренный',
  active: 'Активный',
  very_active: 'Очень активный'
}

// Measurement types
const MEASUREMENT_TYPES = [
  { key: 'weight', label: 'Вес', unit: 'кг', icon: Scale },
  { key: 'waist', label: 'Талия', unit: 'см', icon: Ruler },
  { key: 'hips', label: 'Бёдра', unit: 'см', icon: Ruler },
  { key: 'chest', label: 'Грудь', unit: 'см', icon: Ruler },
  { key: 'bicep', label: 'Бицепс', unit: 'см', icon: Ruler },
  { key: 'thigh', label: 'Бедро', unit: 'см', icon: Ruler },
]

// Feedback types
const FEEDBACK_TYPES = [
  { key: 'bug', label: 'Баг / Ошибка', icon: Bug },
  { key: 'idea', label: 'Идея', icon: Lightbulb },
  { key: 'question', label: 'Вопрос', icon: HelpCircle },
  { key: 'review', label: 'Отзыв', icon: Star },
]

// Zones config
const ZONES_CONFIG = [
  { key: 'zoneSteamEnabled', label: 'Steam', emoji: '🎮' },
  { key: 'zoneLeakfixerEnabled', label: 'LeakFixer', emoji: '🔧' },
  { key: 'zoneAiEnabled', label: 'ИИ', emoji: '🤖' },
  { key: 'zonePokerEnabled', label: 'Покер', emoji: '♠️' },
  { key: 'zoneHealthEnabled', label: 'Здоровье', emoji: '💪' },
]

// Theme options
const THEME_OPTIONS = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'system', label: 'Системная', icon: Monitor },
]

// Donate URL (hardcoded for MVP)
const DONATE_URL = 'https://boosty.to/leakfixer'

interface Measurement {
  type: string
  value: number
  date: string
  trend: number
}

interface Buddy {
  id: string
  partnerId: string
  partnerName: string
  partnerPhoto?: string
  status: string
}

interface UserAttribute {
  key: AttributeKey
  points: number
  level: number
}

interface UserSettings {
  ritualReminders: boolean
  taskReminders: boolean
  zoneSteamEnabled: boolean
  zoneLeakfixerEnabled: boolean
  zoneAiEnabled: boolean
  zonePokerEnabled: boolean
  zoneHealthEnabled: boolean
  theme: string
}

interface ActivityStats {
  activeRituals: number
  completedTasks7Days: number
  activeChains: number
  completedChains: number
  inProgressContent: number
}

export function ProfileScreen() {
  const { user, profile, isDemoMode, setScreen } = useAppStore()
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalCaloriesBurned: 0,
    totalWaterMl: 0
  })
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>({})
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [attributes, setAttributes] = useState<UserAttribute[]>([])
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [showAddBuddy, setShowAddBuddy] = useState(false)
  const [newMeasurement, setNewMeasurement] = useState({ type: 'weight', value: '' })
  const [newBuddy, setNewBuddy] = useState({ name: '', telegramId: '' })
  
  // New state
  const [bio, setBio] = useState('')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    ritualReminders: true,
    taskReminders: true,
    zoneSteamEnabled: true,
    zoneLeakfixerEnabled: true,
    zoneAiEnabled: true,
    zonePokerEnabled: true,
    zoneHealthEnabled: true,
    theme: 'system'
  })
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    activeRituals: 0,
    completedTasks7Days: 0,
    activeChains: 0,
    completedChains: 0,
    inProgressContent: 0
  })
  const [feedback, setFeedback] = useState({ type: 'idea', message: '' })
  const [feedbackSent, setFeedbackSent] = useState(false)

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        // Load measurements
        const measurementsRes = await fetch(`/api/measurements?userId=${user.id}`)
        const measurementsData = await measurementsRes.json()
        setMeasurements(measurementsData.latestByType || {})

        // Load buddies
        const buddiesRes = await fetch(`/api/buddies?userId=${user.id}`)
        const buddiesData = await buddiesRes.json()
        setBuddies(buddiesData.buddies || [])

        // Load attributes
        const attrsRes = await fetch(`/api/rituals/attributes?userId=${user.id}`)
        const attrsData = await attrsRes.json()
        setAttributes(attrsData.attributes || [])

        // Load settings
        const settingsRes = await fetch(`/api/settings?userId=${user.id}`)
        const settingsData = await settingsRes.json()
        if (settingsData.settings) {
          setSettings(settingsData.settings)
        }

        // Load activity stats
        const statsRes = await fetch(`/api/stats?userId=${user.id}`)
        const statsData = await statsRes.json()
        if (statsData.stats) {
          setActivityStats({
            activeRituals: statsData.stats.activeRituals || 0,
            completedTasks7Days: statsData.stats.completedTasks7Days || 0,
            activeChains: statsData.stats.activeChains || 0,
            completedChains: statsData.stats.completedChains || 0,
            inProgressContent: statsData.stats.inProgressContent || 0
          })
          setAttributes(statsData.stats.attributes || attributes)
        }

        // Set bio from profile
        if (profile?.bio) {
          setBio(profile.bio)
        }

        // Mock stats
        setStats({
          totalWorkouts: 12,
          totalCaloriesBurned: 3250,
          totalWaterMl: 45000
        })
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }

    loadData()
  }, [user?.id, profile?.bio])

  // Save bio
  const handleSaveBio = async () => {
    if (!user?.id) return
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          profile: { bio }
        })
      })
      setIsEditingBio(false)
    } catch (error) {
      console.error('Failed to save bio:', error)
    }
  }

  // Update setting
  const handleSettingChange = async (key: keyof UserSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    if (user?.id) {
      try {
        await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, ...newSettings })
        })
      } catch (error) {
        console.error('Failed to save setting:', error)
      }
    }
  }

  // Send feedback
  const handleSendFeedback = async () => {
    if (!user?.id || !feedback.message.trim()) return
    
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: feedback.type,
          message: feedback.message
        })
      })
      setFeedback({ type: 'idea', message: '' })
      setFeedbackSent(true)
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch (error) {
      console.error('Failed to send feedback:', error)
    }
  }

  const handleAddMeasurement = async () => {
    if (!user?.id || !newMeasurement.value) return

    try {
      await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: newMeasurement.type,
          value: parseFloat(newMeasurement.value)
        })
      })

      // Refresh measurements
      const res = await fetch(`/api/measurements?userId=${user.id}`)
      const data = await res.json()
      setMeasurements(data.latestByType || {})
      setShowMeasurements(false)
      setNewMeasurement({ type: 'weight', value: '' })
    } catch (error) {
      console.error('Failed to add measurement:', error)
    }
  }

  const handleAddBuddy = async () => {
    if (!user?.id || !newBuddy.name) return

    try {
      await fetch('/api/buddies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          partnerId: newBuddy.telegramId || `demo_${Date.now()}`,
          partnerName: newBuddy.name
        })
      })

      // Refresh buddies
      const res = await fetch(`/api/buddies?userId=${user.id}`)
      const data = await res.json()
      setBuddies(data.buddies || [])
      setShowAddBuddy(false)
      setNewBuddy({ name: '', telegramId: '' })
    } catch (error) {
      console.error('Failed to add buddy:', error)
    }
  }

  const initials = user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || 'U'
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.username || 'Пользователь'

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground">Профиль</h1>

      {/* User card with avatar, name and bio */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={user?.photoUrl || undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground">{displayName}</p>
              {user?.username && (
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  День {user?.day || 1}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Flame className="w-3 h-3 mr-1 text-orange-400" />
                  {user?.streak || 0}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Bio section */}
          <div className="mt-4 pt-4 border-t border-border/50">
            {isEditingBio ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Напишите немного о себе..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{bio.length}/200</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(false)}>
                      Отмена
                    </Button>
                    <Button size="sm" onClick={handleSaveBio}>
                      <Check className="w-4 h-4 mr-1" />
                      Сохранить
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="flex items-start gap-2 cursor-pointer hover:bg-muted/30 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => setIsEditingBio(true)}
              >
                {bio ? (
                  <p className="text-sm text-muted-foreground flex-1">{bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic flex-1">
                    Добавьте информацию о себе...
                  </p>
                )}
                <Edit className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Points / Streak / Workouts */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 text-center">
            <Trophy className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <p className="text-xl font-bold text-primary">{user?.points || 0}</p>
            <p className="text-xs text-muted-foreground">Очки</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 text-center">
            <Target className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-xl font-bold text-primary">{user?.streak || 0}</p>
            <p className="text-xs text-muted-foreground">Серия</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 text-center">
            <Dumbbell className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
            <p className="text-xl font-bold text-primary">{stats.totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Тренировок</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Сводка активности
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{activityStats.activeRituals}</p>
                <p className="text-xs text-muted-foreground">Активных ритуалов</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{activityStats.completedTasks7Days}</p>
                <p className="text-xs text-muted-foreground">Дел за 7 дней</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{activityStats.activeChains}/{activityStats.completedChains}</p>
                <p className="text-xs text-muted-foreground">Цепочек акт/зав</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{activityStats.inProgressContent}</p>
                <p className="text-xs text-muted-foreground">В процессе изучения</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attributes / Characteristics */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Характеристики
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Накапливаются, когда ты выполняешь ритуалы
          </p>
          <div className="space-y-3">
            {(Object.entries(ATTRIBUTE_LABELS) as [AttributeKey, { label: string; icon: string; color: string }][]).map(([key, value]) => {
              const attr = attributes.find(a => a.key === key)
              const points = attr?.points || 0
              const level = attr?.level || 1
              const progress = (points % 100)

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{value.icon}</span>
                      <span className="text-sm font-medium">{value.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Уровень {level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{points} очков</span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Быстрый доступ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setScreen('finance')}
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span className="font-medium">Финансы</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setScreen('notes')}
          >
            <div className="flex items-center gap-3">
              <StickyNote className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Заметки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setScreen('development')}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span className="font-medium">Развитие / Контент</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setScreen('gym')}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-medium">GYM / Тренировки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Body Measurements */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Замеры тела
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowMeasurements(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {MEASUREMENT_TYPES.slice(0, 6).map(({ key, label, unit }) => {
              const measurement = measurements[key]
              return (
                <div
                  key={key}
                  className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setNewMeasurement({ type: key, value: '' })
                    setShowMeasurements(true)
                  }}
                >
                  <p className="text-xl font-bold text-primary">
                    {measurement?.value?.toFixed(1) || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {measurement && measurement.trend !== 0 && (
                    <p className={`text-xs flex items-center justify-center gap-0.5 mt-1 ${
                      measurement.trend > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {measurement.trend > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {measurement.trend > 0 ? '+' : ''}{measurement.trend.toFixed(1)} {unit}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Buddies */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Бадди
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowAddBuddy(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {buddies.length > 0 ? (
            <div className="space-y-2">
              {buddies.map(buddy => (
                <div
                  key={buddy.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={buddy.partnerPhoto} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {buddy.partnerName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{buddy.partnerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {buddy.status === 'accepted' ? '🤝 Партнёр' :
                         buddy.status === 'pending' ? '⏳ Ожидание' : '❌ Отклонено'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={buddy.status === 'accepted' ? 'border-emerald-500 text-emerald-400' : 'border-yellow-500 text-yellow-400'}
                  >
                    {buddy.status === 'accepted' ? 'Активен' : 'Ожидание'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Добавьте партнёра для отчётности</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddBuddy(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить бадди
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notifications */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Уведомления</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <Label className="text-sm">Напоминания по ритуалам</Label>
              </div>
              <Switch 
                checked={settings.ritualReminders}
                onCheckedChange={(checked) => handleSettingChange('ritualReminders', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <Label className="text-sm">Напоминания по делам</Label>
              </div>
              <Switch 
                checked={settings.taskReminders}
                onCheckedChange={(checked) => handleSettingChange('taskReminders', checked)}
              />
            </div>
          </div>

          {/* Zones */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Активные зоны</p>
            <div className="flex flex-wrap gap-2">
              {ZONES_CONFIG.map(({ key, label, emoji }) => (
                <Badge
                  key={key}
                  variant={settings[key as keyof UserSettings] ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all ${
                    settings[key as keyof UserSettings] 
                      ? 'bg-primary text-primary-foreground' 
                      : 'opacity-50'
                  }`}
                  onClick={() => handleSettingChange(key as keyof UserSettings, !settings[key as keyof UserSettings])}
                >
                  {emoji} {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Тема оформления</p>
            <Select value={settings.theme} onValueChange={(value) => handleSettingChange('theme', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите тему" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Обратная связь
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-emerald-400">Спасибо за обратную связь!</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Тип сообщения</Label>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TYPES.map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={feedback.type === key ? 'default' : 'outline'}
                      size="sm"
                      className={feedback.type === key ? 'bg-primary' : ''}
                      onClick={() => setFeedback(prev => ({ ...prev, type: key }))}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Сообщение</Label>
                <Textarea
                  placeholder="Опишите вашу идею, проблему или вопрос..."
                  value={feedback.message}
                  onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[100px] resize-none"
                />
              </div>
              <Button 
                className="w-full bg-primary" 
                onClick={handleSendFeedback}
                disabled={!feedback.message.trim()}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Отправить
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Support / Donate */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Поддержать проект</p>
              <p className="text-xs text-muted-foreground">Помочь развитию LeakFixer</p>
            </div>
            <Button 
              variant="default" 
              className="bg-primary"
              onClick={() => window.open(DONATE_URL, '_blank')}
            >
              <Heart className="w-4 h-4 mr-1" />
              Донат
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo notice */}
      {isDemoMode && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-400">
              🎮 Демо-режим активен. Данные сохраняются локально в браузере.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        LeakFixer v1.0.0 • Next.js 16
      </p>

      {/* Add Measurement Dialog */}
      <Dialog open={showMeasurements} onOpenChange={setShowMeasurements}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить замер</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Тип замера</Label>
              <div className="grid grid-cols-3 gap-2">
                {MEASUREMENT_TYPES.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={newMeasurement.type === key ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs ${newMeasurement.type === key ? 'bg-primary' : ''}`}
                    onClick={() => setNewMeasurement(prev => ({ ...prev, type: key }))}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Значение</Label>
              <Input
                id="value"
                type="number"
                step="0.1"
                placeholder={`Введите значение в ${MEASUREMENT_TYPES.find(t => t.key === newMeasurement.type)?.unit}`}
                value={newMeasurement.value}
                onChange={e => setNewMeasurement(prev => ({ ...prev, value: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowMeasurements(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleAddMeasurement}
                disabled={!newMeasurement.value}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Buddy Dialog */}
      <Dialog open={showAddBuddy} onOpenChange={setShowAddBuddy}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить бадди</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="buddyName">Имя</Label>
              <Input
                id="buddyName"
                placeholder="Как зовут партнёра?"
                value={newBuddy.name}
                onChange={e => setNewBuddy(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramId">Telegram ID (опционально)</Label>
              <Input
                id="telegramId"
                placeholder="@username или ID"
                value={newBuddy.telegramId}
                onChange={e => setNewBuddy(prev => ({ ...prev, telegramId: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddBuddy(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleAddBuddy}
                disabled={!newBuddy.name}
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
