'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeakAiAnalysisCard } from '@/components/LeakAiAnalysisCard'
import { showErrorToast, showSuccessToast } from '@/lib/network-utils'
import { Brain, Lightbulb, NotebookPen, RefreshCw, Sparkles } from 'lucide-react'

interface LeakNote {
  id: string
  text: string
  createdAt: string
}

interface LeakHint {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  emoji: string
  days?: string[]
}

interface LeakPattern {
  leakType: string
  analysisCount: number
  whatWorked: string[]
  updatedAt: string
}

interface ManualLeakDraft {
  leakType: string
  leakMessage: string
  severity: 'info' | 'warning' | 'critical'
}

const SEVERITY_OPTIONS: Array<{
  id: 'info' | 'warning' | 'critical'
  label: string
  description: string
}> = [
  { id: 'info', label: 'Сигнал', description: 'Наблюдение, которое стоит проверить' },
  { id: 'warning', label: 'Проблема', description: 'Повторяется и уже мешает' },
  { id: 'critical', label: 'Срочно', description: 'Сильно влияет и требует реакции' },
]

const SEVERITY_STYLES: Record<'info' | 'warning' | 'critical', string> = {
  info: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  critical: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
}

function getCurrentMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function extractTitle(text: string): string {
  const [firstLine] = text.split('\n').map(line => line.trim()).filter(Boolean)
  if (!firstLine) return 'Новый лик'
  return firstLine.slice(0, 60)
}

function extractPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date
  }
}

export function LeaksScreen() {
  const { user, setScreen } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notes, setNotes] = useState<LeakNote[]>([])
  const [signals, setSignals] = useState<LeakHint[]>([])
  const [patterns, setPatterns] = useState<LeakPattern[]>([])
  const [activeTab, setActiveTab] = useState('inbox')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('warning')
  const [submitting, setSubmitting] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<ManualLeakDraft | null>(null)

  const hasDraft = title.trim().length > 0 || details.trim().length > 0

  const loadData = async (showSkeleton = false) => {
    if (!user?.id) return

    if (showSkeleton) setLoading(true)
    else setRefreshing(true)

    try {
      const weekStart = getCurrentMonday()
      const [notesRes, signalsRes, patternsRes] = await Promise.all([
        fetch(`/api/notes?userId=${user.id}&zone=leaks&limit=20`),
        fetch(`/api/weekly-report?userId=${user.id}&weekStart=${weekStart}`),
        fetch(`/api/ai/patterns?userId=${user.id}`),
      ])

      const notesData = await notesRes.json()
      const signalsData = await signalsRes.json()
      const patternsData = await patternsRes.json()

      setNotes(Array.isArray(notesData.notes) ? notesData.notes : [])
      setSignals(Array.isArray(signalsData.leakHints) ? signalsData.leakHints : [])
      setPatterns(Array.isArray(patternsData.patterns) ? patternsData.patterns : [])
    } catch (error) {
      showErrorToast(error, 'load leaks module')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [user?.id])

  const createLeakNote = async (prepareAnalysis: boolean) => {
    if (!user?.id) return
    if (!title.trim() && !details.trim()) return

    setSubmitting(true)
    try {
      const text = [title.trim(), details.trim()].filter(Boolean).join('\n')
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text,
          type: 'leak',
          zone: 'leaks',
        }),
      })

      if (!response.ok) {
        throw response
      }

      const noteTitle = title.trim() || extractTitle(text)
      const noteMessage = details.trim() || text

      showSuccessToast(prepareAnalysis ? 'Лик сохранён и готов к разбору' : 'Лик сохранён в inbox')

      setTitle('')
      setDetails('')
      setSeverity('warning')
      setActiveTab('inbox')

      if (prepareAnalysis) {
        setSelectedDraft({
          leakType: noteTitle,
          leakMessage: noteMessage,
          severity,
        })
      }

      await loadData(false)
    } catch (error) {
      showErrorToast(error, 'create leak note')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDraftLabel = useMemo(() => {
    if (!selectedDraft) return null
    return extractTitle(selectedDraft.leakType)
  }, [selectedDraft])

  if (!user?.id) {
    return (
      <div className="pb-20">
        <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent className="pt-6">
            <p className="text-white/70 text-sm">
              Модуль ликов станет доступен после авторизации.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                Leaks
              </CardTitle>
              <CardDescription className="text-white/60 mt-1">
                Отдельный контур для захвата ликов, сигналов и AI-паттернов.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 text-white/80 border-white/10">Inbox: {notes.length}</Badge>
            <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">Signals: {signals.length}</Badge>
            <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">Patterns: {patterns.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-white/70" />
            Быстрый capture
          </CardTitle>
          <CardDescription className="text-white/55">
            Сохрани мысль сейчас, а разбор сделай сразу или позже.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Коротко назови лик или паттерн"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Что произошло, где это проявляется, что могло повлиять, что хочешь исправить..."
            className="min-h-28 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />

          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((option) => {
              const isActive = severity === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSeverity(option.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? SEVERITY_STYLES[option.id]
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-[11px] opacity-80">{option.description}</div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => createLeakNote(true)}
              disabled={!hasDraft || submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Сохранить и разобрать
            </Button>
            <Button
              variant="outline"
              onClick={() => createLeakNote(false)}
              disabled={!hasDraft || submitting}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
            >
              Сохранить в inbox
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {selectedDraft && (
            <Card style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-300" />
                  Готово к AI-разбору
                </CardTitle>
                <CardDescription className="text-white/60">
                  {selectedDraftLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-white/75 mb-2">{selectedDraft.leakMessage}</p>
                <LeakAiAnalysisCard
                  userId={user.id}
                  leakType={selectedDraft.leakType}
                  leakMessage={selectedDraft.leakMessage}
                  severity={selectedDraft.severity}
                />
              </CardContent>
            </Card>
          )}

          {notes.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  Здесь будут лежать сохранённые лики и наблюдения, которые можно разобрать позже.
                </p>
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => {
              const noteTitle = extractTitle(note.text)
              const notePreview = extractPreview(note.text)

              return (
                <Card key={note.id} style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-medium">{noteTitle}</div>
                        <div className="text-xs text-white/35 mt-1">{formatDate(note.createdAt)}</div>
                        <p className="text-sm text-white/70 mt-2">{notePreview}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDraft({
                            leakType: noteTitle,
                            leakMessage: note.text,
                            severity: 'warning',
                          })
                          setActiveTab('inbox')
                        }}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        Разобрать
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              Сигналы, которые уже удалось вытащить из weekly data.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScreen('weekly-report')}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
            >
              В недельный отчёт
            </Button>
          </div>

          {signals.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  Пока мало данных для автосигналов. Здесь появятся найденные паттерны недели.
                </p>
              </CardContent>
            </Card>
          ) : (
            signals.map((signal, index) => (
              <Card
                key={`${signal.type}-${index}`}
                style={{
                  background: 'rgba(15,23,42,0.82)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <div className="text-2xl">{signal.emoji}</div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={SEVERITY_STYLES[signal.severity]}>{signal.severity}</Badge>
                        {signal.days?.map((day) => (
                          <Badge key={day} variant="outline" className="border-white/10 text-white/55">
                            {day}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-white/75">{signal.message}</p>
                      <LeakAiAnalysisCard
                        userId={user.id}
                        leakType={signal.type}
                        leakMessage={signal.message}
                        severity={signal.severity}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <p className="text-sm text-white/60">
            Здесь накапливается история AI-разборов и то, что уже реально помогало.
          </p>

          {patterns.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  AI-паттерны появятся после первых разборов сигналов или ручных ликов.
                </p>
              </CardContent>
            </Card>
          ) : (
            patterns.map((pattern) => (
              <Card key={pattern.leakType} style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-medium">{pattern.leakType}</div>
                      <div className="text-xs text-white/35 mt-1">
                        Последнее обновление: {formatDate(pattern.updatedAt)}
                      </div>
                    </div>
                    <Badge className="bg-white/10 text-white/75 border-white/10">
                      Анализов: {pattern.analysisCount}
                    </Badge>
                  </div>

                  {pattern.whatWorked.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-white/40 flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Что уже сработало
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pattern.whatWorked.map((item) => (
                          <Badge
                            key={item}
                            className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20 whitespace-normal text-left"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white/55">
                      Пока нет отмеченных решений, которые пользователь подтвердил как рабочие.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
