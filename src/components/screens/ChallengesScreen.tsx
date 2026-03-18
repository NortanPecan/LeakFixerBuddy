'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
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
  CheckCircle,
  XCircle,
  Timer,
  Star,
  BarChart2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast } from '@/lib/network-utils'

// ─── Zone config ─────────────────────────────────────────────────────────────
const ZONE_CONFIG: Record<string, { label: string; emoji: string }> = {
  leakfixer: { label: 'LeakFixer',   emoji: '🔧' },
  ai:        { label: 'ИИ',          emoji: '🤖' },
  poker:     { label: 'Покер',       emoji: '♠️' },
  health:    { label: 'Здоровье',    emoji: '💪' },
  life:      { label: 'Жизнь',       emoji: '🏠' },
  savings:   { label: 'Резерв',      emoji: '💰' },
  general:   { label: 'Общее',       emoji: '📦' },
}

// ─── Templates ───────────────────────────────────────────────────────────────
interface ChallengeTemplate {
  name: string
  emoji: string
  type: string
  zone: string
  duration: number
  description: string
  config?: Record<string, unknown>
}
const TEMPLATES: ChallengeTemplate[] = [
  { name: '21 день ритуалов',    emoji: '🔥', type: 'ritual',  zone: 'health',    duration: 21, description: 'Выполняй все ритуалы 21 день подряд без пропусков' },
  { name: '💧 7 дней нормы воды', emoji: '💧', type: 'tracker', zone: 'health',    duration: 7,  description: 'Выполняй норму воды 7 дней из 7',               config: { metric: 'water_streak', target: 7 } },
  { name: '💪 10 тренировок',    emoji: '💪', type: 'tracker', zone: 'health',    duration: 30, description: '10 завершённых тренировок за месяц',             config: { metric: 'gym_count', target: 10 } },
  { name: '😴 Сон 7+ часов',     emoji: '😴', type: 'tracker', zone: 'life',      duration: 14, description: 'Держи среднее время сна от 7 часов 2 недели',    config: { metric: 'sleep_avg', target: 7 } },
  { name: '😊 Настроение 6+',    emoji: '😊', type: 'tracker', zone: 'health',    duration: 14, description: 'Поддерживай среднее настроение выше 6/10',       config: { metric: 'mood_avg', target: 6 } },
  { name: '🥗 14 дней без срывов', emoji: '🥗', type: 'tracker', zone: 'health',  duration: 14, description: '14 дней без плохих приёмов пищи',               config: { metric: 'no_food_bad', target: 12 } },
  { name: '✅ 21 день ритуалов', emoji: '✅', type: 'tracker', zone: 'health',    duration: 21, description: 'Хотя бы один ритуал 21 день из 21',             config: { metric: 'ritual_rate', target: 21 } },
  { name: 'Месяц сбережений',    emoji: '💰', type: 'custom',  zone: 'savings',   duration: 30, description: 'Откладывай и контролируй бюджет 30 дней',        config: { targetCount: 30, periodDays: 30, actionType: 'days' } },
  { name: '30 дней LeakFixer',   emoji: '🔧', type: 'custom',  zone: 'leakfixer', duration: 30, description: 'Работай над своими ликами 30 дней',              config: { targetCount: 30, periodDays: 30, actionType: 'days' } },
]

// ─── Type icons ───────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, typeof Trophy> = {
  ritual:  Flame,
  chain:   Target,
  custom:  Star,
  tracker: BarChart2,
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Challenge {
  id: string
  name: string
  type: string
  zone: string
  config: string
  duration: number
  progress: number
  progressPercentage: number
  daysCompleted: number
  currentStreak: number
  status: string
  startDate: Date
  endDate: Date | null
}

interface Ritual {
  id: string
  title: string
  category: string
}

type CreateTab = 'custom' | 'template'

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'ritual',
  zone: 'general',
  duration: '21',
  targetCount: '',
  periodDays: '30',
  actionType: 'actions',
  selectedRitualIds: [] as string[],
  trackerConfig: {} as Record<string, unknown>,
}

// ─── Progress label ───────────────────────────────────────────────────────────
function getProgressLabel(c: Challenge): string {
  if (c.type !== 'tracker') return `${c.daysCompleted}/${c.duration} дней`
  try {
    const cfg = JSON.parse(c.config ?? '{}') as Record<string, unknown>
    const metric = cfg.metric as string
    const target = cfg.target as number
    if (metric === 'gym_count')     return `${c.daysCompleted}/${target} тренировок`
    if (metric === 'water_streak')  return `${c.daysCompleted}/${target} дней нормы воды`
    if (metric === 'ritual_rate')   return `${c.daysCompleted}/${target} дней ритуалов`
    if (metric === 'no_food_bad')   return `${c.daysCompleted}/${target} дней без срывов`
    if (metric === 'sleep_avg')     return `ср. сон: ${c.daysCompleted} ч / цель ${target} ч`
    if (metric === 'mood_avg')      return `ср. настр.: ${c.daysCompleted} / цель ${target}`
  } catch { /* ignore */ }
  return `${c.daysCompleted}/${c.duration} дней`
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ChallengesScreen() {
  const { user, setScreen, setSelectedContentId } = useAppStore()
  const [challenges, setChallenges]   = useState<Challenge[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<'active' | 'completed'>('active')
  const [showCreate, setShowCreate]   = useState(false)
  const [createTab, setCreateTab]     = useState<CreateTab>('template')
  const [rituals, setRituals]         = useState<Ritual[]>([])
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [pendingInvites, setPendingInvites] = useState<Array<{
    id: string; status: string;
    challenge: { name: string; duration: number; zone: string };
    initiator: { firstName: string | null; username: string | null };
  }>>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)

  // ── Load challenges ─────────────────────────────────────────────────────
  const loadChallenges = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/challenges?userId=${user.id}&status=${filter}`)
      const data = await res.json()
      if (data.success) setChallenges(data.challenges)
    } catch (err) {
      showErrorToast(err, 'загрузка челленджей')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChallenges() }, [user?.id, filter])

  // Load pending buddy challenge invites
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/buddy-challenges?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.received) setPendingInvites(d.received.filter((b: { status: string }) => b.status === 'pending'))
      })
      .catch(() => {})
  }, [user?.id])

  const respondToInvite = async (id: string, status: 'accepted' | 'declined') => {
    if (!user?.id) return
    setRespondingId(id)
    try {
      await fetch('/api/buddy-challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, userId: user.id }),
      })
      setPendingInvites(prev => prev.filter(i => i.id !== id))
      showSuccessToast(status === 'accepted' ? '✅ Челлендж принят!' : 'Отклонено')
      if (status === 'accepted') loadChallenges()
    } catch (err) {
      showErrorToast(err, 'ответ на приглашение')
    } finally {
      setRespondingId(null)
    }
  }

  // ── Load rituals when dialog opens ──────────────────────────────────────
  useEffect(() => {
    if (!showCreate || !user?.id) return
    fetch(`/api/rituals?userId=${user.id}&status=active`)
      .then(r => r.json())
      .then(d => { if (d.rituals) setRituals(d.rituals) })
      .catch(() => {})
  }, [showCreate, user?.id])

  // ── Toggle ritual selection ─────────────────────────────────────────────
  const toggleRitual = (id: string) => {
    setForm(prev => ({
      ...prev,
      selectedRitualIds: prev.selectedRitualIds.includes(id)
        ? prev.selectedRitualIds.filter(r => r !== id)
        : [...prev.selectedRitualIds, id],
    }))
  }

  // ── Apply template ──────────────────────────────────────────────────────
  const applyTemplate = (t: ChallengeTemplate) => {
    setForm({
      ...EMPTY_FORM,
      name:          t.name,
      description:   t.description,
      type:          t.type,
      zone:          t.zone,
      duration:      String(t.duration),
      targetCount:   t.config?.targetCount ? String(t.config.targetCount) : '',
      periodDays:    t.config?.periodDays  ? String(t.config.periodDays)  : '30',
      actionType:    (t.config?.actionType as string) ?? 'actions',
      selectedRitualIds: [],
      trackerConfig: t.type === 'tracker' ? (t.config ?? {}) : {},
    })
    setCreateTab('custom')
  }

  // ── Create challenge ────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!user?.id || !form.name.trim()) return
    setSaving(true)
    try {
      const config: Record<string, unknown> = {}
      if (form.type === 'ritual') {
        config.selectedRitualIds = form.selectedRitualIds
      } else if (form.type === 'tracker') {
        Object.assign(config, form.trackerConfig)
      } else if (form.type === 'custom') {
        config.targetCount = parseInt(form.targetCount) || 0
        config.periodDays  = parseInt(form.periodDays)  || 30
        config.actionType  = form.actionType
      }

      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:      user.id,
          name:        form.name.trim(),
          description: form.description.trim() || undefined,
          type:        form.type,
          zone:        form.zone,
          duration:    parseInt(form.duration) || 21,
          config,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') {
          showErrorToast(null, data.error)
        } else {
          throw new Error()
        }
        return
      }
      showSuccessToast('Челлендж создан 🏆')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      loadChallenges()
    } catch (err) {
      showErrorToast(err, 'создание челленджа')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/challenges?id=${id}`, { method: 'DELETE' })
      setChallenges(prev => prev.filter(c => c.id !== id))
      showSuccessToast('Удалено')
    } catch (err) {
      showErrorToast(err, 'удаление')
    }
  }

  // ── Status badge ────────────────────────────────────────────────────────
  const statusBadge = (s: string) => {
    if (s === 'completed') return <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Выполнен</Badge>
    if (s === 'failed')    return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Провален</Badge>
    return                        <Badge className="bg-primary/20 text-primary"><Timer className="w-3 h-3 mr-1" />Активен</Badge>
  }

  const active    = challenges.filter(c => c.status === 'active')
  const finished  = challenges.filter(c => c.status === 'completed' || c.status === 'failed')

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Челленджи</h1>
        <Button size="sm" className="bg-primary" onClick={() => setShowCreate(true)} disabled={active.length >= 3}>
          <Plus className="w-4 h-4 mr-1" />Новый
        </Button>
      </div>
      {active.length >= 3 && (
        <p className="text-xs text-amber-400/80 -mt-2">⚠️ Достигнут лимит: 3 активных челленджа. Заверши один, чтобы начать новый.</p>
      )}

      {/* Pending buddy invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wide">🤝 Приглашения от бадди</p>
          {pendingInvites.map(inv => (
            <Card key={inv.id} className="bg-blue-500/10 border border-blue-500/30">
              <CardContent className="pt-3 pb-3">
                <p className="font-medium text-sm">{inv.challenge.name}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  от {inv.initiator.firstName ?? inv.initiator.username ?? 'Бадди'} · {inv.challenge.duration} дней
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                    onClick={() => respondToInvite(inv.id, 'accepted')}
                    disabled={respondingId === inv.id}
                  >✅ Принять</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs text-red-400 border-red-500/30"
                    onClick={() => respondToInvite(inv.id, 'declined')}
                    disabled={respondingId === inv.id}
                  >❌ Отклонить</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(['active', 'completed'] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            className={filter === f ? 'bg-primary' : ''}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? `Активные (${active.length})` : `Завершённые (${finished.length})`}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <Card key={i} className="bg-card/50 animate-pulse">
              <CardContent className="pt-4 h-20" />
            </Card>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">Нет {filter === 'active' ? 'активных' : 'завершённых'} челленджей</p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" />Создать
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => {
            const TypeIcon   = TYPE_ICONS[c.type] ?? Trophy
            const zoneConf   = ZONE_CONFIG[c.zone] ?? ZONE_CONFIG.general
            return (
              <Card
                key={c.id}
                className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
                onClick={() => { setSelectedContentId(c.id); setScreen('challenge-detail') }}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{c.name}</h3>
                        {statusBadge(c.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>{zoneConf.emoji} {zoneConf.label}</span>
                        <span>•</span>
                        <span>{c.duration} дней</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{getProgressLabel(c)}</span>
                          <span className="font-medium">{c.progressPercentage}%</span>
                        </div>
                        <Progress value={c.progressPercentage} className="h-1.5" />
                      </div>
                      {c.currentStreak > 0 && c.status === 'active' && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-orange-400">
                          <Flame className="w-3 h-3" />{c.currentStreak} дней подряд
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

      {/* ── Create Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={open => { setShowCreate(open); if (!open) { setForm(EMPTY_FORM); setCreateTab('template') } }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый челлендж</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-2">
            {([['template', '📋 Шаблоны'], ['custom', '✏️ Свой']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setCreateTab(t)}
                className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${createTab === t ? 'bg-background text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Template picker */}
          {createTab === 'template' && (
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{ZONE_CONFIG[t.zone]?.emoji} {ZONE_CONFIG[t.zone]?.label} · {t.duration} дней</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom form */}
          {createTab === 'custom' && (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input
                  placeholder="21 день ритуалов"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Зачем это делаю <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
                <Textarea
                  placeholder="Мотивация, цель..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="h-16 resize-none"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Тип</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ritual"><div className="flex items-center gap-2"><Flame className="w-4 h-4" />На ритуалы</div></SelectItem>
                    <SelectItem value="custom"><div className="flex items-center gap-2"><Star className="w-4 h-4" />Свободный</div></SelectItem>
                    <SelectItem value="chain"><div className="flex items-center gap-2"><Target className="w-4 h-4" />На цепочку</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zone */}
              <div className="space-y-1.5">
                <Label>Зона</Label>
                <Select value={form.zone} onValueChange={v => setForm(p => ({ ...p, zone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ZONE_CONFIG).map(([key, c]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2"><span>{c.emoji}</span>{c.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label>Длительность (дней)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="21"
                  value={form.duration}
                  onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                />
              </div>

              {/* Ritual selector */}
              {form.type === 'ritual' && (
                <div className="space-y-1.5">
                  <Label>Ритуалы для отслеживания</Label>
                  {rituals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет активных ритуалов. Создай ритуалы в разделе «Привычки».</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {rituals.map(r => (
                        <label key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/40 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={form.selectedRitualIds.includes(r.id)}
                            onChange={() => toggleRitual(r.id)}
                            className="accent-primary"
                          />
                          <span className="text-sm">{r.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {form.selectedRitualIds.length === 0 && rituals.length > 0 && (
                    <p className="text-xs text-muted-foreground">Не выбрано — будут учитываться все активные ритуалы</p>
                  )}
                </div>
              )}

              {/* Custom settings */}
              {form.type === 'custom' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Цель (кол-во действий)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="21"
                      value={form.targetCount}
                      onChange={e => setForm(p => ({ ...p, targetCount: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Отмена</Button>
                <Button className="flex-1 bg-primary" onClick={handleCreate} disabled={!form.name.trim() || saving}>
                  {saving ? 'Создаю...' : 'Создать'}
                </Button>
              </div>
            </div>
          )}

          {/* Template selected — quick preview + confirm */}
          {createTab === 'template' && form.name && (
            <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              <p className="text-sm font-medium">Выбран: {form.name}</p>
              <p className="text-xs text-muted-foreground">{form.description}</p>
              <Button className="w-full bg-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Создаю...' : '🏆 Начать челлендж'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
