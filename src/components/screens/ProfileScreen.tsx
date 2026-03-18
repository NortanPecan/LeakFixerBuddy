'use client'

import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast, isOnline } from '@/lib/network-utils'
import { useTheme } from 'next-themes'
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
  BookOpen,
  Download
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { LEAK_TYPE_LABELS } from '@/lib/leak-types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/rituals/data'
import {
  MEASUREMENT_TYPES,
  FEEDBACK_TYPES,
  ZONES_CONFIG,
  THEME_OPTIONS,
  type Measurement,
  type Buddy,
  type UserSettings,
  type ActivityStats,
  type UserAttribute,
} from '@/features/profile'
import { QuickAccess, DonateCard } from '@/features/profile'

// ─── All achievement definitions (earned + locked for motivation) ─────────────
const ALL_ACHIEVEMENT_DEFS = [
  { code: 'GREAT_DAY_FIRST',  emoji: '🌟', label: 'Отличный день!', desc: 'Набрать 80+ баллов за день' },
  { code: 'QUALITY_WEEK',     emoji: '🏆', label: 'Неделя качества', desc: '7 дней подряд 70+ баллов' },
  { code: 'STREAK_7',         emoji: '🔥', label: '7 дней подряд',   desc: 'Серия из 7 дней' },
  { code: 'STREAK_30',        emoji: '💎', label: 'Месяц силы',      desc: 'Серия из 30 дней' },
  { code: 'WATER_WEEK',       emoji: '💧', label: 'Водный марафон',  desc: '7 дней норма воды' },
  { code: 'GYM_10',           emoji: '💪', label: 'Железный',        desc: '10 тренировок выполнено' },
  { code: 'CHALLENGE_FIRST',  emoji: '🏆', label: 'Первый вызов',    desc: 'Завершить первый челлендж' },
]

// LEAK_TYPE_LABELS imported from @/lib/leak-types

function WeightSparkline({ data }: { data: Array<{ date: string; weight: number }> }) {
  if (data.length < 2) return null
  const W = 120, H = 24, PAD = 2
  const weights = data.map(d => d.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1
  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.weight - minW) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const rising = last.weight >= prev.weight
  return (
    <div className="flex items-center gap-2 pl-6">
      <svg width={W} height={H} className="overflow-visible">
        <polyline points={points} fill="none" stroke={rising ? '#10b981' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-xs ${rising ? 'text-emerald-400' : 'text-yellow-400'}`}>
        {rising ? '↑' : '↓'} {data[0].weight}→{last.weight} кг
      </span>
    </div>
  )
}

export function ProfileScreen() {
  const { user, profile, isDemoMode, isOwnerMode, setScreen } = useAppStore()
  const { setTheme } = useTheme()
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalCaloriesBurned: 0,
    totalWaterMl: 0
  })
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>({})
  const [firstMeasurements, setFirstMeasurements] = useState<Record<string, { value: number; date: string }>>({})
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [attributes, setAttributes] = useState<UserAttribute[]>([])
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [newMeasurement, setNewMeasurement] = useState({ type: 'weight', value: '' })
  
  // Personal records (5.26)
  const [topPRs, setTopPRs] = useState<Array<{ templateId: string; name: string; maxWeight: number }>>([])
  const [prHistory, setPrHistory] = useState<Record<string, Array<{ date: string; weight: number }>>>({})

  // Community percentile (3.10)
  const [communityStats, setCommunityStats] = useState<{ streakPercentile: number; pointsPercentile: number; totalUsers: number } | null>(null)

  // Achievements
  const [achievements, setAchievements] = useState<Array<{ code: string; obtainedAt: string }>>([])

  // AI patterns history
  const [aiPatterns, setAiPatterns] = useState<Array<{ leakType: string; analysisCount: number; whatWorked: unknown[]; updatedAt: string }>>([])

  // AI transformation narrative (2.4)
  const [transformation, setTransformation] = useState<{ narrative: string; cached: boolean; createdAt: string } | null>(null)
  const [transformationLoading, setTransformationLoading] = useState(false)

  // New state
  const [bio, setBio] = useState('')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    ritualReminders: true,
    taskReminders: true,
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
  const [adminFeedbacks, setAdminFeedbacks] = useState<Array<{
    id: string; type: string; message: string; status: string; createdAt: string;
    user: { firstName: string | null; username: string | null; day: number; streak: number }
  }>>([])
  const [adminFeedbackCounts, setAdminFeedbackCounts] = useState<Record<string, number>>({})
  const [adminFeedbackFilter, setAdminFeedbackFilter] = useState<string>('new')
  const [isLoadingAdminFeedbacks, setIsLoadingAdminFeedbacks] = useState(false)

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        // Load measurements
        const measurementsRes = await fetch(`/api/measurements?userId=${user.id}`)
        if (measurementsRes.ok) {
          const measurementsData = await measurementsRes.json()
          setMeasurements(measurementsData.latestByType || {})
          setFirstMeasurements(measurementsData.firstByType || {})
        }

        // Load buddies
        const buddiesRes = await fetch(`/api/buddies?userId=${user.id}`)
        if (buddiesRes.ok) {
          const buddiesData = await buddiesRes.json()
          setBuddies(buddiesData.buddies || [])
        }

        // Load attributes
        const attrsRes = await fetch(`/api/rituals/attributes?userId=${user.id}`)
        if (attrsRes.ok) {
          const attrsData = await attrsRes.json()
          setAttributes(attrsData.attributes || [])
        }

        // Load settings
        const settingsRes = await fetch(`/api/settings?userId=${user.id}`)
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          if (settingsData.settings) {
            setSettings(settingsData.settings)
            // Apply saved theme
            if (settingsData.settings.theme) {
              setTheme(settingsData.settings.theme)
            }
          }
        }

        // Load activity stats
        const statsRes = await fetch(`/api/stats?userId=${user.id}`)
        const statsData = statsRes.ok ? await statsRes.json() : {}
        if (statsData.stats) {
          setActivityStats({
            activeRituals: statsData.stats.activeRituals || 0,
            completedTasks7Days: statsData.stats.completedTasks7Days || 0,
            activeChains: statsData.stats.activeChains || 0,
            completedChains: statsData.stats.completedChains || 0,
            inProgressContent: statsData.stats.inProgressContent || 0
          })
          setAttributes(statsData.stats.attributes || attributes)
          
          // Set real workout count from API
          setStats(prev => ({
            ...prev,
            totalWorkouts: statsData.stats.totalWorkouts || 0
          }))
        }

        // Load personal records (5.26)
        fetch(`/api/gym/records?userId=${user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return
            if (d.topPRs) setTopPRs(d.topPRs.slice(0, 5))
            if (d.history) setPrHistory(d.history)
          })
          .catch(() => {/* silent */})

        // Load community percentile (3.10)
        fetch(`/api/stats/community?userId=${user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.success) setCommunityStats({ streakPercentile: d.streakPercentile, pointsPercentile: d.pointsPercentile, totalUsers: d.totalUsers }) })
          .catch(() => {/* silent */})

        // Load achievements
        fetch(`/api/achievements/check?userId=${user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.achievements) setAchievements(d.achievements) })
          .catch(() => {/* silent */})

        // Load AI patterns history
        fetch(`/api/ai/patterns?userId=${user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.patterns) setAiPatterns(d.patterns) })
          .catch(() => {/* silent */})

        // Load AI transformation narrative (2.4) — only if 30+ days and not hidden
        if ((user.day ?? 0) >= 30 && !(settingsData.settings?.hiddenWidgets ?? []).includes('transformation')) {
          setTransformationLoading(true)
          fetch(`/api/ai/transformation?userId=${user.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.narrative) setTransformation(d) })
            .catch(() => {/* silent */})
            .finally(() => setTransformationLoading(false))
        }

        // Set bio from profile
        if (profile?.bio) {
          setBio(profile.bio)
        }
      } catch (error) {
        showErrorToast(error, 'load data')
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
      showSuccessToast('Биография сохранена')
    } catch (error) {
      showErrorToast(error, 'save bio')
    }
  }

  // Update setting
  const handleToggleWidget = async (widgetId: string) => {
    const current = settings.hiddenWidgets ?? []
    const updated = current.includes(widgetId)
      ? current.filter((w) => w !== widgetId)
      : [...current, widgetId]
    const newSettings = { ...settings, hiddenWidgets: updated }
    setSettings(newSettings)
    if (user?.id) {
      try {
        await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, hiddenWidgets: updated }),
        })
      } catch (error) {
        showErrorToast(error, 'save widget setting')
      }
    }
  }

  const handleSettingChange = async (key: keyof UserSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    // Apply theme immediately
    if (key === 'theme' && typeof value === 'string') {
      setTheme(value)
    }
    
    if (user?.id) {
      try {
        await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, ...newSettings })
        })
      } catch (error) {
        showErrorToast(error, 'save setting')
      }
    }
  }

  // Send feedback
  const handleSendFeedback = async () => {
    if (!user?.id || !feedback.message.trim()) return

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: feedback.type,
          message: feedback.message
        })
      })
      if (!res.ok) throw new Error('send failed')
      setFeedback({ type: 'idea', message: '' })
      setFeedbackSent(true)
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch (error) {
      showErrorToast(error, 'send feedback')
    }
  }

  const loadAdminFeedbacks = async (filter = adminFeedbackFilter) => {
    if (!user?.id) return
    setIsLoadingAdminFeedbacks(true)
    try {
      const url = `/api/admin/feedback?userId=${user.id}${filter !== 'all' ? `&status=${filter}` : ''}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      setAdminFeedbacks(data.feedbacks || [])
      setAdminFeedbackCounts(data.counts || {})
    } catch { /* silent */ } finally {
      setIsLoadingAdminFeedbacks(false)
    }
  }

  const handleMarkFeedback = async (feedbackId: string, status: string) => {
    if (!user?.id) return
    try {
      await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, feedbackId, status })
      })
      setAdminFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, status } : f))
      setAdminFeedbackCounts(prev => {
        const old = adminFeedbacks.find(f => f.id === feedbackId)
        if (!old) return prev
        return {
          ...prev,
          [old.status]: Math.max(0, (prev[old.status] || 0) - 1),
          [status]: (prev[status] || 0) + 1
        }
      })
    } catch { /* silent */ }
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
      setFirstMeasurements(data.firstByType || {})
      setShowMeasurements(false)
      setNewMeasurement({ type: 'weight', value: '' })
      showSuccessToast('Замер добавлен')
    } catch (error) {
      showErrorToast(error, 'add measurement')
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

      {/* Progress since day 1 (2.4) */}
      {user && user.day > 1 && (
        <Card className="bg-gradient-to-r from-primary/5 to-card/50 border border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">За {user.day} дней в приложении</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-background/50">
                <div className="text-lg font-bold text-yellow-400">{user.points}</div>
                <div className="text-[10px] text-muted-foreground">очков</div>
                {communityStats && communityStats.pointsPercentile >= 50 && (
                  <div className="text-[9px] text-yellow-400/60 mt-0.5">топ {100 - communityStats.pointsPercentile}%</div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-background/50">
                <div className="text-lg font-bold text-orange-400">🔥 {user.streak}</div>
                <div className="text-[10px] text-muted-foreground">серия</div>
                {communityStats && communityStats.streakPercentile >= 50 && (
                  <div className="text-[9px] text-orange-400/60 mt-0.5">топ {100 - communityStats.streakPercentile}%</div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-background/50">
                <div className="text-lg font-bold text-cyan-400">{stats.totalWorkouts}</div>
                <div className="text-[10px] text-muted-foreground">тренировок</div>
              </div>
            </div>
            {/* Weight delta since day 1 (2.4) */}
            {measurements['weight'] && firstMeasurements['weight'] &&
              measurements['weight'].value !== firstMeasurements['weight'].value && (
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Вес с первого дня</span>
                <span className={
                  measurements['weight'].value < firstMeasurements['weight'].value
                    ? 'text-emerald-400 font-semibold'
                    : 'text-orange-400 font-semibold'
                }>
                  {firstMeasurements['weight'].value} → {measurements['weight'].value} кг
                  {' '}({measurements['weight'].value - firstMeasurements['weight'].value > 0 ? '+' : ''}
                  {(measurements['weight'].value - firstMeasurements['weight'].value).toFixed(1)} кг)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Transformation narrative (2.4) */}
      {(user?.day ?? 0) >= 30 && !(settings.hiddenWidgets ?? []).includes('transformation') && (transformationLoading || transformation) && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Как я изменился
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transformationLoading && !transformation ? (
              <p className="text-sm text-muted-foreground animate-pulse">AI анализирует твой прогресс…</p>
            ) : transformation ? (
              <>
                <p className="text-sm text-foreground leading-relaxed">{transformation.narrative}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {transformation.cached ? '📦 Из кеша' : '🤖 Только что'} · обновляется раз в 7 дней
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Personal Records (5.26) */}
      {topPRs.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Личные рекорды
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPRs.map((pr, i) => {
                const hist = prHistory[pr.templateId] ?? []
                return (
                  <div key={pr.templateId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm">{pr.name}</span>
                      </div>
                      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                        🏆 {pr.maxWeight} кг
                      </Badge>
                    </div>
                    {hist.length >= 2 && (
                      <WeightSparkline data={hist} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>🏅 Достижения</span>
            <span className="text-sm font-normal text-muted-foreground">
              {achievements.length}/{ALL_ACHIEVEMENT_DEFS.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {ALL_ACHIEVEMENT_DEFS.map(def => {
              const earned = achievements.find(a => a.code === def.code)
              return (
                <div
                  key={def.code}
                  className={`flex flex-col items-center p-2 rounded-lg text-center ${
                    earned ? 'bg-yellow-500/10' : 'bg-muted/20 grayscale opacity-50'
                  }`}
                >
                  <span className="text-2xl">{def.emoji}</span>
                  <p className="text-[11px] font-medium mt-1 leading-tight">{def.label}</p>
                  {earned ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(earned.obtainedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-tight">{def.desc}</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Patterns History */}
      {aiPatterns.filter(p => p.leakType !== 'tg_input_patterns').length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              История AI-анализов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiPatterns
              .filter(p => p.leakType !== 'tg_input_patterns')
              .slice(0, 5)
              .map((p) => {
                const label = LEAK_TYPE_LABELS[p.leakType] ?? p.leakType
                const workedCount = Array.isArray(p.whatWorked) ? p.whatWorked.length : 0
                const updatedDate = new Date(p.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                return (
                  <div key={p.leakType} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.analysisCount} {p.analysisCount === 1 ? 'анализ' : p.analysisCount < 5 ? 'анализа' : 'анализов'}
                        {workedCount > 0 && ` · ${workedCount} сработало ✅`}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{updatedDate}</span>
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

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
      <QuickAccess onNavigate={setScreen} />

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

      {/* Calorie Goal */}
      <Card className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors" onClick={() => setScreen('calorie-goal')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              🎯 Цель по калоражу
            </CardTitle>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Адаптивный план питания до цели по весу</p>
        </CardContent>
      </Card>

      {/* Navigation settings */}
      <Card className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors" onClick={() => setScreen('settings')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Навигация и интерфейс
            </CardTitle>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Настройте нижнее меню и разделы</p>
        </CardContent>
      </Card>

      {/* Buddies */}
      <Card className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors" onClick={() => setScreen('buddies')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Бадди
            </CardTitle>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {buddies.filter(b => b.status === 'accepted').length > 0 ? (
            <div className="space-y-2">
              {buddies.filter(b => b.status === 'accepted').slice(0, 3).map(buddy => (
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
                        🤝 Партнёр
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Активен
                  </Badge>
                </div>
              ))}
              {buddies.filter(b => b.status === 'accepted').length > 3 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  + ещё {buddies.filter(b => b.status === 'accepted').length - 3} бадди
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Добавьте партнёра для отчётности</p>
              <p className="text-xs text-primary mt-1">Нажмите, чтобы найти бадди →</p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Напоминание о весе</Label>
                  <p className="text-xs text-muted-foreground">Если не записал сегодня</p>
                </div>
              </div>
              <Switch 
                checked={settings.weightReminder}
                onCheckedChange={(checked) => handleSettingChange('weightReminder', checked)}
              />
            </div>
            {settings.weightReminder && (
              <div className="flex items-center justify-between pl-8">
                <Label className="text-sm text-muted-foreground">Время напоминания</Label>
                <Input
                  type="time"
                  value={settings.weightReminderTime || '08:00'}
                  onChange={(e) => handleSettingChange('weightReminderTime', e.target.value)}
                  className="w-28 h-8 text-sm"
                />
              </div>
            )}
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

          {/* Home screen widgets (7.2/7.3) */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Виджеты главного экрана</p>
            {[
              { id: 'weight', label: 'Вес' },
              { id: 'wellbeing', label: 'Велнес' },
              { id: 'mood', label: 'Настроение / Энергия' },
              { id: 'water', label: 'Вода (в сводке)' },
              { id: 'food', label: 'Еда (в сводке)' },
              { id: 'rituals', label: 'Ритуалы (в сводке)' },
              { id: 'supplements', label: 'БАДы (в сводке)' },
              { id: 'quickinput', label: 'Быстрый ввод' },
              { id: 'ai_recommendations', label: 'AI Рекомендации' },
              { id: 'daily_tip', label: 'Совет дня (AI)' },
              { id: 'transformation', label: 'AI-нарратив «Как я изменился»' },
              { id: 'challenges', label: 'Активные челленджи' },
            ].map(({ id, label }) => {
              const hidden = (settings.hiddenWidgets ?? []).includes(id)
              return (
                <div key={id} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={!hidden} onCheckedChange={() => handleToggleWidget(id)} />
                </div>
              )
            })}
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
      <DonateCard />

      {/* Demo notice */}
      {isDemoMode && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-400">
                🎮 Демо-режим активен
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (confirm('Переключиться на Owner-режим? Демо-данные будут недоступны.')) {
                    localStorage.removeItem('leakfixer-auth-mode')
                    localStorage.setItem('leakfixer-auth-mode', 'owner')
                    window.location.reload()
                  }
                }}
              >
                Owner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner notice + Admin Feedbacks */}
      {isOwnerMode && (
        <>
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-emerald-400">
                  👤 Owner-режим (тестовый профиль)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    if (confirm('Переключиться на Демо-режим?')) {
                      localStorage.removeItem('leakfixer-auth-mode')
                      localStorage.setItem('leakfixer-auth-mode', 'demo')
                      window.location.reload()
                    }
                  }}
                >
                  Demo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin: Feedbacks from users */}
          <Card className="bg-card/50 backdrop-blur border-emerald-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  Фидбеки пользователей
                  {adminFeedbackCounts['new'] > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      {adminFeedbackCounts['new']} новых
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => loadAdminFeedbacks(adminFeedbackFilter)}
                >
                  Обновить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Filter tabs */}
              <div className="flex gap-1 flex-wrap">
                {(['new', 'read', 'resolved', 'all'] as const).map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={adminFeedbackFilter === f ? 'default' : 'outline'}
                    className={`text-xs h-7 ${adminFeedbackFilter === f ? 'bg-primary' : ''}`}
                    onClick={() => {
                      setAdminFeedbackFilter(f)
                      loadAdminFeedbacks(f)
                    }}
                  >
                    {f === 'new' ? `Новые${adminFeedbackCounts['new'] ? ` (${adminFeedbackCounts['new']})` : ''}` :
                     f === 'read' ? 'Прочитано' :
                     f === 'resolved' ? 'Решено' : 'Все'}
                  </Button>
                ))}
              </div>

              {/* Load button (lazy) */}
              {adminFeedbacks.length === 0 && !isLoadingAdminFeedbacks && (
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => loadAdminFeedbacks(adminFeedbackFilter)}
                >
                  Загрузить фидбеки
                </Button>
              )}

              {isLoadingAdminFeedbacks && (
                <p className="text-center text-sm text-muted-foreground py-2">Загрузка...</p>
              )}

              {/* Feedback list */}
              <div className="space-y-2">
                {adminFeedbacks.map(fb => (
                  <div
                    key={fb.id}
                    className={`p-3 rounded-xl border text-sm space-y-1.5 ${
                      fb.status === 'new' ? 'border-yellow-500/30 bg-yellow-500/5' :
                      fb.status === 'resolved' ? 'border-emerald-500/20 bg-emerald-500/5' :
                      'border-white/10 bg-white/3'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-xs ${
                          fb.type === 'bug' ? 'bg-red-500/20 text-red-400' :
                          fb.type === 'idea' ? 'bg-blue-500/20 text-blue-400' :
                          fb.type === 'review' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {fb.type === 'bug' ? '🐛 Баг' :
                           fb.type === 'idea' ? '💡 Идея' :
                           fb.type === 'review' ? '⭐ Отзыв' : '❓ Вопрос'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {fb.user?.firstName || fb.user?.username || 'Аноним'}
                          {' · '}день {fb.user?.day} · стрик {fb.user?.streak}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(fb.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{fb.message}</p>
                    {fb.status !== 'resolved' && (
                      <div className="flex gap-1.5 pt-1">
                        {fb.status === 'new' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => handleMarkFeedback(fb.id, 'read')}
                          >
                            Прочитано
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2 border-emerald-500/30 text-emerald-400"
                          onClick={() => handleMarkFeedback(fb.id, 'resolved')}
                        >
                          Решено ✓
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {adminFeedbacks.length === 0 && !isLoadingAdminFeedbacks && adminFeedbackCounts['new'] !== undefined && (
                  <p className="text-center text-sm text-muted-foreground py-3">Нет фидбеков в этой категории</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
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
    </div>
  )
}
