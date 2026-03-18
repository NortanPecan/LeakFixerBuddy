import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate } from '@/lib/date-utils'
import { analyzeLeakWithAI } from '@/lib/ai-analyze-leak'
import { formatLeakAnalysisForTelegram } from '@/lib/ai-leak-prompts'
import { callAI } from '@/lib/ai-provider'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

// ─── Types ─────────────────────────────────────────────────────────────────

interface TelegramUser {
  id: number
  first_name?: string
  username?: string
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: { id: number; type: string }
  text?: string
  reply_to_message?: { message_id: number }
}

interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

interface InlineButton {
  text: string
  callback_data?: string
  url?: string
}

type InlineKeyboard = InlineButton[][]

// ─── Button config ─────────────────────────────────────────────────────────

const TG_BUTTONS = [
  { id: 'gym',      emoji: '💪', label: 'Зал' },
  { id: 'food',     emoji: '🍽️', label: 'Питание' },
  { id: 'water',    emoji: '💧', label: 'Вода' },
  { id: 'rituals',  emoji: '✅', label: 'Ритуалы' },
  { id: 'sleep',    emoji: '😴', label: 'Сон' },
  { id: 'weight',   emoji: '⚖️', label: 'Вес' },
  { id: 'mood',     emoji: '😊', label: 'Настроение' },
  { id: 'energy',   emoji: '⚡', label: 'Энергия' },
  { id: 'finance',  emoji: '💰', label: 'Финансы' },
  { id: 'summary',  emoji: '📊', label: 'Сводка' },
  { id: 'tasks',    emoji: '📋', label: 'Задачи' },
  { id: 'leaks',        emoji: '🔍', label: 'Лики' },
  { id: 'achievements', emoji: '🏅', label: 'Достижения' },
] as const

// ─── Regex commands ─────────────────────────────────────────────────────────

const WATER_RE    = /^(?:вода|water)\s+(\d+(?:[.,]\d+)?)\s*(?:мл|ml)?$/i
const WEIGHT_RE   = /^(?:вес|weight|вага)\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?$/i
const MOOD_RE     = /^(?:настроение|mood|настр)\s+(\d+(?:[.,]\d+)?)$/i
const ENERGY_RE   = /^(?:энергия|energy|энерг)\s+(\d+(?:[.,]\d+)?)$/i
const FOOD_RE     = /^(?:ел|ела|еда|съел|съела|food|ate)\s+(.+?)(?:\s+(\d+(?:[.,]\d+)?)\s*(?:ккал|кал|cal|kcal)?)?$/i
const GYM_RE      = /^(?:зал|gym|трен(?:ировка)?)\s*(?:(\d+(?:[.,]\d+)?)\s*(?:мин|min|минут)?)?$/i
const TASK_RE     = /^(?:задача|задание|task)\s+(.+)$/i
const RITUALS_RE  = /^(?:ритуалы|ритуал|rituals?)$/i
const SLEEP_RE    = /^(?:сон|sleep)\s+(\d+(?:[.,]\d+)?)\s*(?:ч|ч\.|часов?|час|hour|h)?$/i
const SUMMARY_RE  = /^(?:сводка|отчёт|отчет|report|summary|итог|итоги)$/i
const INCOME_RE   = /^(?:доход|income|заработал|заработала|получил|получила)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i
const EXPENSE_RE  = /^(?:расход|расходы|потратил|потратила|купил|купила|expense)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i
const MENU_RE     = /^(?:меню|menu|\/start|\/menu)$/i
const HELP_RE     = /^(?:помощь|help|старт|start|команды)$/i
const LEAK_RE         = /^(?:лик|leak|утечка)\s+(.+)$/i
const ACHIEVEMENTS_RE = /^(?:ачивменты|ачивмент|достижения|достижение|achievement|badge|бейдж)$/i

// ─── Telegram API ──────────────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(keyboard && { reply_markup: { inline_keyboard: keyboard } }),
      }),
    })
  } catch { /* best-effort */ }
}

async function editMessageText(chatId: number, messageId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        ...(keyboard && { reply_markup: { inline_keyboard: keyboard } }),
      }),
    })
  } catch { /* best-effort */ }
}

async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    })
  } catch { /* best-effort */ }
}

// Returns the new message_id so we can store it as pending
async function sendForceReply(chatId: number, text: string): Promise<number | null> {
  if (!BOT_TOKEN) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true },
      }),
    })
    const data = await res.json()
    return data.ok ? (data.result?.message_id ?? null) : null
  } catch { return null }
}

// ─── Pending action helpers (ForceReply + AI confirm) ─────────────────────────

const PENDING_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface PendingForceReply {
  __type: 'forceReply'
  action: 'sleep' | 'weight' | 'mood' | 'energy'
  botMessageId: number
}

interface PendingAiConfirm {
  __type: 'aiConfirm'
  aiType: string
  display: string
  data: Record<string, unknown>
  originalText: string
}

type PendingPayload = PendingForceReply | PendingAiConfirm

async function storePending(userId: string, payload: PendingPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS)
  // Store one pending per user — upsert via delete+create since no unique key on text
  // Use a Note with special zone as lightweight KV
  await db.note.deleteMany({ where: { userId, zone: '__tg_pending' } })
  await db.note.create({
    data: { userId, text: JSON.stringify(payload), zone: '__tg_pending', type: 'thought', date: new Date() },
  })
  // Also store in FleetingThought with short TTL for auto-cleanup
  await db.fleetingThought.create({ data: { userId, text: JSON.stringify(payload), expiresAt } }).catch(() => {})
}

async function getPendingForUserId(userId: string): Promise<PendingPayload | null> {
  const note = await db.note.findFirst({ where: { userId, zone: '__tg_pending' }, orderBy: { date: 'desc' } })
  if (!note) return null
  try {
    return JSON.parse(note.text) as PendingPayload
  } catch { return null }
}

async function clearPendingForUserId(userId: string): Promise<void> {
  await db.note.deleteMany({ where: { userId, zone: '__tg_pending' } })
}

// ─── Button settings helpers ───────────────────────────────────────────────

async function getHiddenTgButtons(userId: string): Promise<string[]> {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { hiddenWidgets: true },
  })
  const widgets = (settings?.hiddenWidgets as string[] | null) ?? []
  return widgets.filter((w) => w.startsWith('tg_'))
}

async function toggleTgButton(userId: string, btnId: string): Promise<boolean> {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { hiddenWidgets: true },
  })
  const widgets = (settings?.hiddenWidgets as string[] | null) ?? []
  const key = `tg_${btnId}`
  const isHidden = widgets.includes(key)
  const newWidgets = isHidden ? widgets.filter((w) => w !== key) : [...widgets, key]
  await db.userSettings.upsert({
    where: { userId },
    update: { hiddenWidgets: newWidgets },
    create: { userId, hiddenWidgets: newWidgets },
  })
  return !isHidden // true = now visible
}

// ─── Keyboards ─────────────────────────────────────────────────────────────

function buildMainMenuKeyboard(hiddenBtns: string[]): InlineKeyboard {
  const visible = TG_BUTTONS.filter((b) => !hiddenBtns.includes(`tg_${b.id}`))
  const rows: InlineButton[][] = []
  for (let i = 0; i < visible.length; i += 3) {
    rows.push(
      visible.slice(i, i + 3).map((b) => ({
        text: `${b.emoji} ${b.label}`,
        callback_data: `btn_${b.id}`,
      }))
    )
  }
  rows.push([{ text: '⚙️ Настройки кнопок', callback_data: 'btn_settings' }])
  return rows
}

function buildSettingsKeyboard(hiddenBtns: string[]): InlineKeyboard {
  const rows: InlineButton[][] = []
  for (let i = 0; i < TG_BUTTONS.length; i += 2) {
    rows.push(
      TG_BUTTONS.slice(i, i + 2).map((b) => {
        const on = !hiddenBtns.includes(`tg_${b.id}`)
        return { text: `${b.emoji} ${b.label} ${on ? '✅' : '❌'}`, callback_data: `toggle_tg_${b.id}` }
      })
    )
  }
  rows.push([{ text: '← Главное меню', callback_data: 'btn_menu' }])
  return rows
}

// ─── Module summaries ──────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return `${dd}.${mm}.${yy}`
}

function backBtn(): InlineButton[][] {
  return [[{ text: '← Меню', callback_data: 'btn_menu' }]]
}

// GYM

interface ExerciseWithSets {
  name: string
  targetSets: number
  targetReps: number | null
  weight: number | null
  nextWeight: number | null
  sets: { weight: number | null; reps: number | null; isWarmup: boolean; completed: boolean }[]
}

function formatExerciseLine(ex: ExerciseWithSets, isPR: boolean): string {
  const workingSets = ex.sets.filter((s) => !s.isWarmup && s.completed)
  const setsCount = workingSets.length || ex.targetSets || 4
  const reps = ex.targetReps || (workingSets[0]?.reps ?? 12)
  const w = workingSets[0]?.weight ?? ex.weight

  let line = `${ex.name} — ${setsCount}х${reps}`
  if (w) {
    line += `х${w}кг`
    if (ex.nextWeight && ex.nextWeight !== w) line += `(${ex.nextWeight})`
  }
  if (isPR) line += ' 🏆'
  return line
}

async function getGymSummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999)

  const workout = await db.gymWorkout.findFirst({
    where: {
      period: { userId, isActive: true },
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { sets: { orderBy: { setNum: 'asc' } } },
      },
    },
    orderBy: { date: 'desc' },
  })

  // Fallback: last completed workout
  const source = workout ?? await db.gymWorkout.findFirst({
    where: { period: { userId, isActive: true } },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { sets: { orderBy: { setNum: 'asc' } } },
      },
    },
    orderBy: { date: 'desc' },
  })

  if (!source) {
    return {
      text: '💪 Тренировок пока нет. Добавь их в приложении!',
      keyboard: backBtn(),
    }
  }

  const isToday = !!workout
  const dateStr = formatDate(source.date)
  const statusEmoji = source.status === 'completed' ? '✅' : isToday ? '🔄' : '📅'

  // Personal records: max weight per exercise name
  const exerciseNames = source.exercises.map((e) => e.name)
  const prRecords: Record<string, number> = {}
  if (exerciseNames.length > 0) {
    const sets = await db.gymExerciseSet.findMany({
      where: {
        exercise: {
          workout: { period: { userId } },
          name: { in: exerciseNames },
        },
        weight: { not: null },
      },
      select: { weight: true, exercise: { select: { name: true } } },
    })
    for (const s of sets) {
      const n = s.exercise.name
      if (s.weight && (!prRecords[n] || s.weight > prRecords[n])) prRecords[n] = s.weight
    }
  }

  const lines = source.exercises.map((ex) => {
    const workingSets = ex.sets.filter((s) => !s.isWarmup && s.completed)
    const usedWeight = workingSets[0]?.weight ?? ex.weight
    const isPR = !!usedWeight && !!prRecords[ex.name] && usedWeight >= prRecords[ex.name]
    return formatExerciseLine(ex as ExerciseWithSets, isPR)
  })

  const name = source.name || 'Тренировка'
  const label = isToday ? 'Сегодня' : 'Последняя'
  let text = `${statusEmoji} <b>${name}</b>\n📅 ${dateStr} (${label})\n\n${lines.join('\n')}`

  if (source.stretchingDone) text += '\n\n🧘 Растяжка: выполнена'

  const keyboard: InlineKeyboard = []
  if (isToday && source.status !== 'completed') {
    keyboard.push([{ text: '✅ Отметить выполненной', callback_data: `gym_done_${source.id}` }])
  }
  keyboard.push(...backBtn())

  return { text, keyboard }
}

// WATER

async function getWaterSummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } })
  const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null
  const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000
  const water = fd?.water ?? 0
  const pct = Math.min(100, Math.round((water / target) * 100))

  const filled = Math.round(pct / 20)
  const bar = '🔵'.repeat(filled) + '⚪'.repeat(5 - filled)

  const text = `💧 <b>Вода сегодня</b>\n\n${water} / ${target} мл (${pct}%)\n${bar}`
  const keyboard: InlineKeyboard = [
    [
      { text: '+200 мл', callback_data: 'water_add_200' },
      { text: '+350 мл', callback_data: 'water_add_350' },
      { text: '+500 мл', callback_data: 'water_add_500' },
    ],
    ...backBtn(),
  ]
  return { text, keyboard }
}

// FOOD

async function getFoodSummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999)

  const entries = await db.foodEntry.findMany({
    where: { userId, date: { gte: startOfDay, lt: endOfDay } },
    orderBy: { createdAt: 'asc' },
  })

  if (entries.length === 0) {
    return {
      text: '🍽️ <b>Питание сегодня</b>\n\nЗаписей нет.\n\nДобавь: <code>ел название 400</code>',
      keyboard: backBtn(),
    }
  }

  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0)
  const qualityMap: Record<string, string> = { good: '🟢', neutral: '🟡', bad: '🔴' }
  const lines = entries.map((e) => {
    const q = qualityMap[e.quality ?? ''] ?? '⚪'
    const cal = e.calories ? ` — ${e.calories} ккал` : ''
    return `${q} ${e.name}${cal}`
  })

  const text = `🍽️ <b>Питание сегодня</b>\n\n${lines.join('\n')}\n\n<b>Итого: ${totalCal > 0 ? `${totalCal} ккал` : `${entries.length} записей`}</b>`
  return { text, keyboard: backBtn() }
}

// RITUALS

async function getRitualsSummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const [rituals, completions] = await Promise.all([
    db.ritual.findMany({ where: { userId, status: 'active' }, select: { id: true, title: true } }),
    db.ritualCompletion.findMany({ where: { userId, date: today, completed: true }, select: { ritualId: true } }),
  ])

  if (rituals.length === 0) {
    return { text: '✅ <b>Ритуалы</b>\n\nНет активных ритуалов. Добавь в приложении!', keyboard: backBtn() }
  }

  const doneIds = new Set(completions.map((c) => c.ritualId))
  const lines = rituals.map((r) => `${doneIds.has(r.id) ? '✅' : '⬜'} ${r.title}`)
  const doneCount = doneIds.size

  const text = `✅ <b>Ритуалы сегодня</b> — ${doneCount}/${rituals.length}\n\n${lines.join('\n')}`
  const keyboard: InlineKeyboard = []
  if (doneCount < rituals.length) {
    keyboard.push([{ text: '🙌 Отметить все выполненными', callback_data: 'rituals_done_all' }])
  }
  keyboard.push(...backBtn())
  return { text, keyboard }
}

// FINANCE

async function getFinanceSummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const txns = await db.transaction.findMany({
    where: { userId, date: { gte: startOfMonth } },
    select: { amount: true },
  })

  const income  = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const balance = income - expense

  const monthName = today.toLocaleDateString('ru-RU', { month: 'long' })
  const sign = balance >= 0 ? '+' : ''
  const emoji = balance >= 0 ? '💚' : '🔴'

  const text =
    `💰 <b>Финансы — ${monthName}</b>\n\n` +
    `💚 Доходы:  <b>${income.toLocaleString('ru-RU')} ₽</b>\n` +
    `💸 Расходы: <b>${expense.toLocaleString('ru-RU')} ₽</b>\n\n` +
    `${emoji} Баланс: <b>${sign}${balance.toLocaleString('ru-RU')} ₽</b>\n\n` +
    `Добавить: <code>доход 5000 зарплата</code> / <code>расход 500 кофе</code>`

  return { text, keyboard: backBtn() }
}

// TASKS

async function getTasksSummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const tasks = await db.task.findMany({
    where: { userId, date: today },
    orderBy: { createdAt: 'asc' },
  })

  if (tasks.length === 0) {
    return {
      text: '📋 <b>Задачи сегодня</b>\n\nЗадач нет.\n\nДобавить: <code>задача купить хлеб</code>',
      keyboard: backBtn(),
    }
  }

  const lines = tasks.map((t) => `${t.status === 'done' ? '✅' : '⬜'} ${t.text}`)
  const done = tasks.filter((t) => t.status === 'done').length

  const text = `📋 <b>Задачи сегодня</b> — ${done}/${tasks.length}\n\n${lines.join('\n')}`
  return { text, keyboard: backBtn() }
}

// WEIGHT

async function getWeightSummary(userId: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const last = await db.measurement.findFirst({
    where: { userId, type: 'weight' },
    orderBy: { date: 'desc' },
  })
  const text = last
    ? `⚖️ <b>Вес</b>\n\nПоследнее: <b>${last.value} кг</b>\n📅 ${formatDate(last.date)}\n\nЗаписать: <code>вес 74.5</code>`
    : `⚖️ <b>Вес</b>\n\nЗаписей нет.\n\nЗаписать: <code>вес 74.5</code>`
  return { text, keyboard: backBtn() }
}

// MOOD / ENERGY / SLEEP — quick status

async function getMoodEnergySummary(userId: string, today: Date): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const state = await db.dailyState.findFirst({ where: { userId, date: today } })
  const moodEmoji  = (state?.mood  ?? 0) >= 8 ? '😊' : (state?.mood  ?? 0) >= 5 ? '😐' : '😔'
  const energyEmoji = (state?.energy ?? 0) >= 8 ? '⚡' : (state?.energy ?? 0) >= 5 ? '🔋' : '🪫'

  let text = '😊 <b>Состояние сегодня</b>\n\n'
  text += state?.mood    ? `${moodEmoji} Настроение: <b>${state.mood}/10</b>\n`    : '😊 Настроение: не записано\n'
  text += state?.energy  ? `${energyEmoji} Энергия: <b>${state.energy}/10</b>\n`  : '⚡ Энергия: не записано\n'
  text += state?.sleepHours ? `😴 Сон: <b>${state.sleepHours} ч</b>\n` : '😴 Сон: не записан\n'
  text += '\nЗаписать: <code>настроение 8</code> / <code>энергия 7</code> / <code>сон 8</code>'

  return { text, keyboard: backBtn() }
}

// FULL SUMMARY (same as text command)

async function buildFullSummary(userId: string, today: Date): Promise<string> {
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999)

  const [fitnessDaily, dailyState, foodEntries, ritualCompletions, activeRituals, checkins] = await Promise.all([
    db.fitnessDaily.findFirst({ where: { userId, date: startOfDay } }),
    db.dailyState.findFirst({ where: { userId, date: startOfDay } }),
    db.foodEntry.findMany({ where: { userId, date: { gte: startOfDay, lt: endOfDay } }, select: { calories: true } }),
    db.ritualCompletion.findMany({ where: { userId, date: startOfDay, completed: true } }),
    db.ritual.findMany({ where: { userId, status: 'active' } }),
    db.dailyCheckin.findMany({ where: { userId, date: startOfDay } }).catch(() => []),
  ])

  const water       = fitnessDaily?.water ?? 0
  const waterTarget = fitnessDaily?.waterTarget ?? 2000
  const waterPct    = Math.round((water / waterTarget) * 100)
  const calories    = foodEntries.reduce((s, f) => s + (f.calories || 0), 0)
  const ritDone     = ritualCompletions.length
  const ritTotal    = activeRituals.length
  const morningDone = checkins.some((c: { type: string }) => c.type === 'morning')
  const eveningDone = checkins.some((c: { type: string }) => c.type === 'evening')

  const filled  = Math.min(5, Math.round(waterPct / 20))
  const waterBar = '🔵'.repeat(filled) + '⚪'.repeat(5 - filled)
  const todayStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  let msg = `📊 <b>Сводка за ${todayStr}</b>\n\n`
  msg += `💧 Вода: <b>${water}/${waterTarget} мл</b> ${waterBar}\n`
  if (calories > 0)    msg += `🍽️ Калории: <b>${calories} ккал</b>\n`
  if (ritTotal > 0)    msg += `✅ Ритуалы: <b>${ritDone}/${ritTotal}</b>\n`
  if (dailyState?.mood)       msg += `😊 Настроение: <b>${dailyState.mood}/10</b>\n`
  if (dailyState?.energy)     msg += `⚡ Энергия: <b>${dailyState.energy}/10</b>\n`
  if (dailyState?.sleepHours) msg += `😴 Сон: <b>${dailyState.sleepHours} ч</b>\n`
  msg += `\n${morningDone ? '☀️' : '○'} Утро  ${eveningDone ? '🌙' : '○'} Вечер`
  return msg
}

// LEAKS

const LEAK_TYPE_LABELS: Record<string, string> = {
  low_energy: 'Низкая энергия',
  chronic_low_energy: 'Хроническая усталость',
  no_gym: 'Мало тренировок',
  gym_dropout: 'Бросил зал',
  ritual_consistency: 'Непостоянство ритуалов',
  ritual_erosion: 'Эрозия ритуалов',
  missed_checkins: 'Пропуск чек-инов',
  calorie_spikes: 'Скачки калорий',
  no_habits: 'Нет привычек',
  weekend_ritual_drop: 'Срыв в выходные',
  high_stress: 'Высокий стресс',
  sleep_deficit: 'Дефицит сна',
  expense_spike: 'Скачок расходов',
  tracking_dropout: 'Не ввожу данные',
  low_tracking: 'Мало трекинга',
}

async function getLeaksSummary(userId: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const patterns = await db.userAiPattern.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  if (patterns.length === 0) {
    return {
      text: '🔍 <b>Лики</b>\n\nAI-анализов пока нет.\n\nНапиши: <code>лик описание проблемы</code>\nили открой раздел «Лики» в приложении.',
      keyboard: backBtn(),
    }
  }

  let text = '🔍 <b>Твои лики (AI-анализы)</b>\n\n'

  for (const p of patterns) {
    const label = LEAK_TYPE_LABELS[p.leakType] ?? p.leakType
    const analysis = p.lastAnalysis as { cause?: string; urgency?: string; solutions?: { text: string }[] } | null
    const urgencyEmoji = analysis?.urgency === 'now' ? '🔴' : analysis?.urgency === 'thisWeek' ? '🟡' : '🟢'
    const topSolution = analysis?.solutions?.[0]?.text ?? '—'
    text += `${urgencyEmoji} <b>${label}</b>\n`
    if (analysis?.cause) text += `  Причина: ${analysis.cause.slice(0, 80)}${analysis.cause.length > 80 ? '…' : ''}\n`
    text += `  💡 ${topSolution.slice(0, 90)}${topSolution.length > 90 ? '…' : ''}\n`
    text += `  Анализов: ${p.analysisCount} | Провайдер: ${p.lastProvider ?? '?'}\n\n`
  }

  text += '\nОбновить анализ: <code>лик описание</code>'

  return { text, keyboard: backBtn() }
}

// ACHIEVEMENTS

const ACHIEVEMENT_LABELS_TG: Record<string, { emoji: string; label: string }> = {
  GREAT_DAY_FIRST: { emoji: '🌟', label: 'Отличный день!' },
  QUALITY_WEEK:    { emoji: '🏆', label: 'Неделя качества' },
  STREAK_7:        { emoji: '🔥', label: '7 дней подряд' },
  STREAK_30:       { emoji: '💎', label: 'Месяц силы' },
  WATER_WEEK:      { emoji: '💧', label: 'Водный марафон' },
  GYM_10:          { emoji: '💪', label: 'Железный' },
}

async function getAchievementsSummary(userId: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const achievements = await db.achievement.findMany({
    where: { userId },
    orderBy: { obtainedAt: 'desc' },
  })

  if (achievements.length === 0) {
    return {
      text:
        '🏅 <b>Достижения</b>\n\nПока пусто — продолжай и они придут!\n\n' +
        '💡 Как получить первые:\n' +
        '• <b>🌟 Отличный день!</b> — набери 80+ баллов за день\n' +
        '• <b>🏆 Неделя качества</b> — 7 дней подряд 70+ баллов',
      keyboard: backBtn(),
    }
  }

  let text = `🏅 <b>Твои достижения — ${achievements.length}</b>\n\n`
  for (const a of achievements) {
    const def = ACHIEVEMENT_LABELS_TG[a.code] ?? { emoji: '🎯', label: a.code }
    const date = a.obtainedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    text += `${def.emoji} <b>${def.label}</b>\n  📅 ${date}\n\n`
  }

  return { text, keyboard: backBtn() }
}

// ─── AI Input Classification ───────────────────────────────────────────────────

const AI_CLASSIFY_SYSTEM = `Ты анализируешь сообщения пользователя фитнес-приложения.
Определи что хотел сделать пользователь и извлеки данные.
Отвечай только JSON без markdown блоков:
{"type":"food|water|weight|mood|energy|sleep|task|gym|income|expense|unknown","data":{},"display":"строка для подтверждения","confidence":0.0-1.0}

Типы и их data:
- food: {"name":"название","calories":число или null,"weight_g":число или null}
- water: {"amount_ml":число}
- weight: {"kg":число}
- mood: {"score":1-10}
- energy: {"score":1-10}
- sleep: {"hours":число}
- task: {"text":"текст задачи"}
- gym: {"duration_min":число или null}
- income: {"amount":число,"desc":"описание или null"}
- expense: {"amount":число,"desc":"описание или null"}
- unknown: {}

Примеры (еда — разговорные формы):
"яблоко 500 грамм 300 калорий" → {"type":"food","data":{"name":"яблоко","calories":300,"weight_g":500},"display":"🍽️ яблоко (300 ккал, 500г)","confidence":0.95}
"скушал яблоко" → {"type":"food","data":{"name":"яблоко","calories":null,"weight_g":null},"display":"🍽️ яблоко","confidence":0.9}
"съел гречку с курицей 400 ккал" → {"type":"food","data":{"name":"гречка с курицей","calories":400,"weight_g":null},"display":"🍽️ гречка с курицей (400 ккал)","confidence":0.95}
"выпил кофе" → {"type":"food","data":{"name":"кофе","calories":null,"weight_g":null},"display":"🍽️ кофе","confidence":0.85}
"выпил протеиновый коктейль 300 ккал" → {"type":"food","data":{"name":"протеиновый коктейль","calories":300,"weight_g":null},"display":"🍽️ протеиновый коктейль (300 ккал)","confidence":0.95}
"поел и выпил воды" → {"type":"food","data":{"name":"приём пищи","calories":null,"weight_g":null},"display":"🍽️ приём пищи","confidence":0.7}

Примеры (вода):
"выпил стакан воды" → {"type":"water","data":{"amount_ml":250},"display":"💧 +250 мл воды","confidence":0.85}
"выпил литр воды" → {"type":"water","data":{"amount_ml":1000},"display":"💧 +1000 мл воды","confidence":0.9}
"попил воды 500мл" → {"type":"water","data":{"amount_ml":500},"display":"💧 +500 мл воды","confidence":0.95}

Примеры (активность):
"бегал 40 минут" → {"type":"gym","data":{"duration_min":40},"display":"💪 Тренировка 40 мин","confidence":0.9}
"побегал 30 минут" → {"type":"gym","data":{"duration_min":30},"display":"💪 Пробежка 30 мин","confidence":0.9}
"сходил в зал на час" → {"type":"gym","data":{"duration_min":60},"display":"💪 Тренировка 60 мин","confidence":0.9}
"покачался" → {"type":"gym","data":{"duration_min":null},"display":"💪 Тренировка","confidence":0.85}
"поплавал 45 минут" → {"type":"gym","data":{"duration_min":45},"display":"💪 Плавание 45 мин","confidence":0.9}

Примеры (финансы):
"купил кофе 150 руб" → {"type":"expense","data":{"amount":150,"desc":"кофе"},"display":"💸 Расход −150₽ (кофе)","confidence":0.9}
"заплатил за такси 500" → {"type":"expense","data":{"amount":500,"desc":"такси"},"display":"💸 Расход −500₽ (такси)","confidence":0.9}
"получил зп 50000" → {"type":"income","data":{"amount":50000,"desc":"зп"},"display":"💚 Доход +50000₽ (зп)","confidence":0.9}`

interface AiClassifyResult {
  type: string
  data: Record<string, unknown>
  display: string
  confidence: number
}

async function classifyUnknownInput(text: string, userId: string): Promise<AiClassifyResult | null> {
  // First check user's own learned patterns
  const userPattern = await db.userAiPattern.findUnique({
    where: { userId_leakType: { userId, leakType: 'tg_input_patterns' } },
  })
  if (userPattern?.lastAnalysis) {
    const patterns = userPattern.lastAnalysis as Array<{ regex: string; type: string; data: Record<string, unknown>; display: string }>
    for (const p of patterns) {
      try {
        if (new RegExp(p.regex, 'i').test(text)) {
          return { type: p.type, data: p.data, display: p.display, confidence: 1.0 }
        }
      } catch { /* bad regex */ }
    }
  }

  // Call AI for classification
  try {
    const { text: aiText } = await callAI(AI_CLASSIFY_SYSTEM, text, {
      userId,
      callType: 'tg-classify',
    })
    const result = JSON.parse(aiText.trim()) as AiClassifyResult
    if (result.type && result.confidence >= 0.6) return result
    return null
  } catch {
    return null
  }
}

async function saveLearnedPattern(userId: string, originalText: string, type: string, data: Record<string, unknown>, display: string): Promise<void> {
  try {
    // Build a simple regex from the original text (escaped, case-insensitive)
    // Replace numbers with \d+ pattern for reuse
    const regexStr = originalText.replace(/\d+(?:[.,]\d+)?/g, '\\d+(?:[.,]\\d+)?').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\\d\+/g, '\\d+')

    const existing = await db.userAiPattern.findUnique({
      where: { userId_leakType: { userId, leakType: 'tg_input_patterns' } },
    })
    const patterns = (existing?.lastAnalysis as Array<{ regex: string; type: string; data: Record<string, unknown>; display: string }> ?? [])
    // Avoid duplicates
    if (!patterns.some(p => p.regex === regexStr)) {
      patterns.unshift({ regex: regexStr, type, data, display })
      if (patterns.length > 50) patterns.splice(50)
    }

    // Cast to satisfy Prisma Json type
    const patternsJson = patterns as unknown as Record<string, unknown>[]
    await db.userAiPattern.upsert({
      where: { userId_leakType: { userId, leakType: 'tg_input_patterns' } },
      update: { lastAnalysis: patternsJson, updatedAt: new Date() },
      create: {
        userId,
        leakType: 'tg_input_patterns',
        lastAnalysis: patternsJson,
        triedSolutions: [],
        whatWorked: [],
        analysisCount: 0,
      },
    })
  } catch { /* non-critical */ }
}

async function executeClassifiedAction(userId: string, type: string, data: Record<string, unknown>, today: Date): Promise<string> {
  switch (type) {
    case 'food': {
      const name = String(data.name ?? 'блюдо')
      const calories = data.calories != null ? Number(data.calories) : undefined
      await db.foodEntry.create({ data: { userId, name, mealType: 'snack', date: today, ...(calories != null && { calories }) } })
      return `🍽️ <b>${name}</b>${calories ? ` (${calories} ккал)` : ''} добавлено в питание!`
    }
    case 'water': {
      const amount = Number(data.amount_ml ?? 250)
      let fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } })
      const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null
      const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000
      const current = fd?.water ?? 0
      if (!fd) fd = await db.fitnessDaily.create({ data: { userId, date: today, water: amount, waterTarget: target } })
      else fd = await db.fitnessDaily.update({ where: { id: fd.id }, data: { water: current + amount } })
      return `💧 +${amount} мл воды! Сегодня: <b>${fd.water}/${target} мл</b>`
    }
    case 'weight': {
      const value = Number(data.kg)
      await db.measurement.create({ data: { userId, type: 'weight', value, unit: 'kg' } })
      return `⚖️ Вес <b>${value} кг</b> записан!`
    }
    case 'mood': {
      const score = Math.round(Number(data.score))
      await db.dailyState.upsert({ where: { userId_date: { userId, date: today } }, update: { mood: score }, create: { userId, date: today, mood: score, energy: 5 } })
      return `😊 Настроение <b>${score}/10</b> записано!`
    }
    case 'energy': {
      const score = Math.round(Number(data.score))
      await db.dailyState.upsert({ where: { userId_date: { userId, date: today } }, update: { energy: score }, create: { userId, date: today, mood: 5, energy: score } })
      return `⚡ Энергия <b>${score}/10</b> записана!`
    }
    case 'sleep': {
      const hours = Number(data.hours)
      await db.dailyState.upsert({ where: { userId_date: { userId, date: today } }, update: { sleepHours: hours }, create: { userId, date: today, mood: 5, energy: 5, sleepHours: hours } })
      return `😴 Сон <b>${hours} ч</b> записан!`
    }
    case 'task': {
      const text = String(data.text ?? '')
      await db.task.create({ data: { userId, text, status: 'todo', date: today } })
      return `✅ Задача <b>${text}</b> добавлена!`
    }
    case 'gym': {
      const duration = data.duration_min ? Number(data.duration_min) : null
      const durText = duration ? ` ${duration} мин` : ''
      await db.note.create({ data: { userId, text: `Тренировка${durText} — быстрая запись через Telegram`, type: 'thought', date: new Date() } })
      return `💪 Тренировка${durText} записана!`
    }
    case 'income': {
      const amount = Number(data.amount)
      const desc = data.desc ? String(data.desc) : null
      const account = await db.account.findFirst({ where: { userId }, select: { id: true } })
      if (!account) return '❌ Нет счёта. Создай в приложении.'
      await db.transaction.create({ data: { userId, accountId: account.id, amount, description: desc, date: today } })
      return `💚 Доход <b>+${amount}₽</b>${desc ? ` (${desc})` : ''} записан!`
    }
    case 'expense': {
      const amount = Number(data.amount)
      const desc = data.desc ? String(data.desc) : null
      const account = await db.account.findFirst({ where: { userId }, select: { id: true } })
      if (!account) return '❌ Нет счёта. Создай в приложении.'
      await db.transaction.create({ data: { userId, accountId: account.id, amount: -Math.abs(amount), description: desc, date: today } })
      return `💸 Расход <b>−${amount}₽</b>${desc ? ` (${desc})` : ''} записан!`
    }
    default:
      return '✅ Сохранено!'
  }
}

// ─── Leak classifier (keyword-based) ──────────────────────────────────────

function classifyLeakFromText(text: string): string {
  const t = text.toLowerCase()
  if (/(?:трен|зал|gym|спорт|качал|упражн)/.test(t)) {
    if (/(?:бросил|перестал|не хожу|забил|пропускаю|dropout)/.test(t)) return 'gym_dropout'
    return 'no_gym'
  }
  if (/(?:усталост|нет сил|мало энерги|низкая энерги|не могу встать|вялост)/.test(t)) return 'low_energy'
  if (/(?:хронич|всегда устал|постоянно нет сил)/.test(t)) return 'chronic_low_energy'
  if (/(?:ритуал|привычк|habit|не делаю)/.test(t)) return 'ritual_consistency'
  if (/(?:сон|сплю|недосып|sleep|ложусь поздно)/.test(t)) return 'sleep_deficit'
  if (/(?:стресс|тревог|переживаю|нервничаю|anxiety)/.test(t)) return 'high_stress'
  if (/(?:расход|трачу|деньги|финанс|покупк)/.test(t)) return 'expense_spike'
  if (/(?:срыв|снова|опять|чекап|не заполняю)/.test(t)) return 'tracking_dropout'
  if (/(?:еда|питание|переел|food|калори)/.test(t)) return 'calorie_spikes'
  return 'low_energy' // generic fallback
}

// ─── Text command handler ──────────────────────────────────────────────────

async function handleCommand(userId: string, text: string): Promise<{ reply: string; keyboard?: InlineKeyboard }> {
  const t = text.trim()
  const today = normalizeToDate(new Date())

  // Menu / help → show keyboard
  if (MENU_RE.test(t) || HELP_RE.test(t)) {
    const hidden = await getHiddenTgButtons(userId)
    const keyboard = buildMainMenuKeyboard(hidden)
    const reply =
      '👋 <b>LeakFixer Buddy</b>\n\n' +
      'Выбери раздел кнопкой или напиши команду:\n\n' +
      '💧 <b>вода 500</b>  ⚖️ <b>вес 74.5</b>  😊 <b>настроение 8</b>\n' +
      '⚡ <b>энергия 7</b>  🍽️ <b>ел пицца 800</b>  💪 <b>зал 60</b>\n' +
      '✅ <b>задача текст</b>  🙌 <b>ритуалы</b>  😴 <b>сон 8</b>\n' +
      '📊 <b>сводка</b>  💚 <b>доход 5000</b>  💸 <b>расход 500</b>\n\n' +
      '🤖 <b>лик описание проблемы</b> — AI-анализ лика\n' +
      '💬 Пишешь в любом формате — AI поймёт и уточнит!'
    return { reply, keyboard }
  }

  // Water
  const waterMatch = t.match(WATER_RE)
  if (waterMatch) {
    const amount = parseFloat(waterMatch[1].replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return { reply: '❌ Укажи количество мл: <b>вода 500</b>' }

    let fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } })
    const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null
    const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000
    const current = fd?.water ?? 0

    if (!fd) {
      fd = await db.fitnessDaily.create({ data: { userId, date: today, water: amount, waterTarget: target } })
    } else {
      fd = await db.fitnessDaily.update({ where: { id: fd.id }, data: { water: current + amount } })
    }

    const newAmt = fd.water
    const pct = Math.round((newAmt / target) * 100)
    return { reply: `💧 +${amount} мл записано!\nСегодня: <b>${newAmt} / ${target} мл</b> (${pct}%)` }
  }

  // Weight
  const weightMatch = t.match(WEIGHT_RE)
  if (weightMatch) {
    const value = parseFloat(weightMatch[1].replace(',', '.'))
    if (isNaN(value) || value <= 0) return { reply: '❌ Укажи вес: <b>вес 74.5</b>' }
    await db.measurement.create({ data: { userId, type: 'weight', value, unit: 'kg' } })
    return { reply: `⚖️ Вес <b>${value} кг</b> записан!` }
  }

  // Mood
  const moodMatch = t.match(MOOD_RE)
  if (moodMatch) {
    const score = Math.round(parseFloat(moodMatch[1].replace(',', '.')))
    if (isNaN(score) || score < 1 || score > 10) return { reply: '❌ Настроение от 1 до 10: <b>настроение 7</b>' }
    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { mood: score },
      create: { userId, date: today, mood: score, energy: 5 },
    })
    const e = score >= 8 ? '😊' : score >= 5 ? '😐' : '😔'
    return { reply: `${e} Настроение <b>${score}/10</b> записано!` }
  }

  // Energy
  const energyMatch = t.match(ENERGY_RE)
  if (energyMatch) {
    const score = Math.round(parseFloat(energyMatch[1].replace(',', '.')))
    if (isNaN(score) || score < 1 || score > 10) return { reply: '❌ Энергия от 1 до 10: <b>энергия 7</b>' }
    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { energy: score },
      create: { userId, date: today, mood: 5, energy: score },
    })
    const e = score >= 8 ? '⚡' : score >= 5 ? '🔋' : '🪫'
    return { reply: `${e} Энергия <b>${score}/10</b> записана!` }
  }

  // Food
  const foodMatch = t.match(FOOD_RE)
  if (foodMatch) {
    const name = foodMatch[1].trim()
    const calories = foodMatch[2] ? Math.round(parseFloat(foodMatch[2].replace(',', '.'))) : undefined
    await db.foodEntry.create({
      data: { userId, name, mealType: 'snack', date: today, ...(calories !== undefined && { calories }) },
    })
    const calText = calories !== undefined ? ` (${calories} ккал)` : ''
    return { reply: `🍽️ <b>${name}</b>${calText} записано!` }
  }

  // Gym
  const gymMatch = t.match(GYM_RE)
  if (gymMatch) {
    const duration = gymMatch[1] ? Math.round(parseFloat(gymMatch[1].replace(',', '.'))) : null
    const period = await db.gymPeriod.findFirst({
      where: { userId, isActive: true },
      include: { workouts: { orderBy: { date: 'asc' } } },
    })
    if (period) {
      const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0)
      const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999)
      const todayWorkout = period.workouts.find(
        (w) => w.date >= startOfDay && w.date <= endOfDay && w.status !== 'completed'
      )
      if (todayWorkout) {
        await db.gymWorkout.update({
          where: { id: todayWorkout.id },
          data: { status: 'completed', completed: true, ...(duration && { duration }) },
        })
        const durText = duration ? ` (${duration} мин)` : ''
        return { reply: `💪 Тренировка «${todayWorkout.name || 'Тренировка'}»${durText} выполнена!` }
      }
    }
    const durText = duration ? ` ${duration} мин` : ''
    await db.note.create({
      data: { userId, text: `Тренировка${durText} — быстрая запись через Telegram`, type: 'thought', date: new Date() },
    })
    return { reply: duration ? `💪 Тренировка <b>${duration} мин</b> записана!` : '💪 Тренировка записана!' }
  }

  // Task
  const taskMatch = t.match(TASK_RE)
  if (taskMatch) {
    const taskText = taskMatch[1].trim()
    if (!taskText) return { reply: '❌ Укажи текст задачи: <b>задача купить хлеб</b>' }
    await db.task.create({ data: { userId, text: taskText, status: 'todo', date: today } })
    return { reply: `✅ Задача <b>${taskText}</b> добавлена!` }
  }

  // Rituals
  if (RITUALS_RE.test(t)) {
    const rituals = await db.ritual.findMany({ where: { userId, status: 'active' }, select: { id: true } })
    if (rituals.length === 0) return { reply: '📋 Нет активных ритуалов. Добавь их в приложении.' }
    let done = 0
    for (const r of rituals) {
      try {
        await db.ritualCompletion.upsert({
          where: { ritualId_date: { ritualId: r.id, date: today } },
          update: { completed: true },
          create: { ritualId: r.id, userId, date: today, completed: true },
        })
        done++
      } catch { /* skip */ }
    }
    return { reply: `🙌 <b>${done} из ${rituals.length}</b> ритуалов выполнено!` }
  }

  // Sleep
  const sleepMatch = t.match(SLEEP_RE)
  if (sleepMatch) {
    const hours = parseFloat(sleepMatch[1].replace(',', '.'))
    if (isNaN(hours) || hours <= 0 || hours > 24) return { reply: '❌ Укажи часы: <b>сон 8</b> или <b>сон 7.5</b>' }
    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { sleepHours: hours },
      create: { userId, date: today, mood: 5, energy: 5, sleepHours: hours },
    })
    const e = hours >= 8 ? '😴' : hours >= 6 ? '🛌' : '😵'
    return { reply: `${e} Сон <b>${hours} ч</b> записан!` }
  }

  // Income
  const incomeMatch = t.match(INCOME_RE)
  if (incomeMatch) {
    const amount = parseFloat(incomeMatch[1].replace(',', '.'))
    const description = incomeMatch[2]?.trim() || null
    if (isNaN(amount) || amount <= 0) return { reply: '❌ Укажи сумму: <b>доход 5000</b>' }
    const account = await db.account.findFirst({ where: { userId }, select: { id: true } })
    if (!account) return { reply: '❌ Нет счёта. Создай в приложении: Финансы → Счета.' }
    await db.transaction.create({ data: { userId, accountId: account.id, amount, description, date: today } })
    return { reply: `💚 Доход <b>+${amount}₽</b>${description ? ` (${description})` : ''} записан!` }
  }

  // Expense
  const expenseMatch = t.match(EXPENSE_RE)
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1].replace(',', '.'))
    const description = expenseMatch[2]?.trim() || null
    if (isNaN(amount) || amount <= 0) return { reply: '❌ Укажи сумму: <b>расход 500 кофе</b>' }
    const account = await db.account.findFirst({ where: { userId }, select: { id: true } })
    if (!account) return { reply: '❌ Нет счёта. Создай в приложении: Финансы → Счета.' }
    await db.transaction.create({ data: { userId, accountId: account.id, amount: -Math.abs(amount), description, date: today } })
    return { reply: `💸 Расход <b>−${amount}₽</b>${description ? ` (${description})` : ''} записан!` }
  }

  // Summary
  if (SUMMARY_RE.test(t)) {
    const reply = await buildFullSummary(userId, today)
    return { reply, keyboard: backBtn() }
  }

  // Лик — AI-анализ произвольной проблемы
  const leakMatch = t.match(LEAK_RE)
  if (leakMatch) {
    const userText = leakMatch[1].trim()
    if (!userText) {
      return {
        reply:
          '🔍 Напиши описание проблемы после команды:\n\n' +
          '<code>лик не могу встать на тренировку</code>\n' +
          '<code>лик снова срыв в питании</code>\n' +
          '<code>лик очень низкая энергия весь день</code>',
      }
    }

    const leakType = classifyLeakFromText(userText)

    try {
      // Прямой вызов функции — никаких self-referential HTTP запросов
      const { analysis, provider } = await analyzeLeakWithAI({
        userId,
        leakType,
        leakMessage: userText,
        severity: 'warning',
        callType: 'telegram-leak',
      })
      const reply = formatLeakAnalysisForTelegram(leakType, analysis, provider)
      return { reply, keyboard: backBtn() }
    } catch (err) {
      console.error('[Telegram /лик] AI error:', err)
      return {
        reply: '❌ AI-анализ не ответил. Попробуй чуть позже.',
      }
    }
  }

  // Achievements
  if (ACHIEVEMENTS_RE.test(t)) {
    const { text: achText, keyboard: achKeyboard } = await getAchievementsSummary(userId)
    return { reply: achText, keyboard: achKeyboard }
  }

  // Unknown — try AI classification
  return { reply: '__AI_CLASSIFY__' }
}

// ─── Callback query handler ────────────────────────────────────────────────

async function handleCallback(
  cbQueryId: string,
  data: string,
  userId: string,
  chatId: number,
  messageId: number
): Promise<void> {
  const today = normalizeToDate(new Date())
  await answerCallback(cbQueryId)

  // Back to main menu
  if (data === 'btn_menu') {
    const hidden = await getHiddenTgButtons(userId)
    const keyboard = buildMainMenuKeyboard(hidden)
    await editMessageText(chatId, messageId, '👋 <b>LeakFixer Buddy</b>\n\nВыбери раздел:', keyboard)
    return
  }

  // Settings screen
  if (data === 'btn_settings') {
    const hidden = await getHiddenTgButtons(userId)
    const keyboard = buildSettingsKeyboard(hidden)
    await editMessageText(chatId, messageId, '⚙️ <b>Настройки кнопок</b>\n\nНажми чтобы вкл/выкл:', keyboard)
    return
  }

  // Toggle button visibility
  if (data.startsWith('toggle_tg_')) {
    const btnId = data.replace('toggle_tg_', '')
    const isNowVisible = await toggleTgButton(userId, btnId)
    const hidden = await getHiddenTgButtons(userId)
    const keyboard = buildSettingsKeyboard(hidden)
    const btn = TG_BUTTONS.find((b) => b.id === btnId)
    await answerCallback(cbQueryId, `${btn?.emoji ?? ''} ${btn?.label ?? btnId} ${isNowVisible ? 'включено ✅' : 'скрыто ❌'}`)
    await editMessageText(chatId, messageId, '⚙️ <b>Настройки кнопок</b>\n\nНажми чтобы вкл/выкл:', keyboard)
    return
  }

  // Water quick-add buttons
  if (data.startsWith('water_add_')) {
    const amount = parseInt(data.replace('water_add_', ''), 10)
    let fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } })
    const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null
    const target  = fd?.waterTarget ?? profile?.waterBaseline ?? 2000
    const current = fd?.water ?? 0

    if (!fd) {
      fd = await db.fitnessDaily.create({ data: { userId, date: today, water: amount, waterTarget: target } })
    } else {
      fd = await db.fitnessDaily.update({ where: { id: fd.id }, data: { water: current + amount } })
    }
    const newAmt = fd.water
    const pct    = Math.min(100, Math.round((newAmt / target) * 100))
    const filled = Math.round(pct / 20)
    const bar    = '🔵'.repeat(filled) + '⚪'.repeat(5 - filled)
    const text   = `💧 <b>Вода сегодня</b>\n\n${newAmt} / ${target} мл (${pct}%)\n${bar}`
    const keyboard: InlineKeyboard = [
      [
        { text: '+200 мл', callback_data: 'water_add_200' },
        { text: '+350 мл', callback_data: 'water_add_350' },
        { text: '+500 мл', callback_data: 'water_add_500' },
      ],
      ...backBtn(),
    ]
    await editMessageText(chatId, messageId, text, keyboard)
    return
  }

  // Mark rituals all done
  if (data === 'rituals_done_all') {
    const rituals = await db.ritual.findMany({ where: { userId, status: 'active' }, select: { id: true } })
    let done = 0
    for (const r of rituals) {
      try {
        await db.ritualCompletion.upsert({
          where: { ritualId_date: { ritualId: r.id, date: today } },
          update: { completed: true },
          create: { ritualId: r.id, userId, date: today, completed: true },
        })
        done++
      } catch { /* skip */ }
    }
    const { text, keyboard } = await getRitualsSummary(userId, today)
    await answerCallback(cbQueryId, `🙌 ${done} ритуалов выполнено!`)
    await editMessageText(chatId, messageId, text, keyboard)
    return
  }

  // Mark gym workout complete
  if (data.startsWith('gym_done_')) {
    const workoutId = data.replace('gym_done_', '')
    await db.gymWorkout.update({
      where: { id: workoutId },
      data: { status: 'completed', completed: true },
    })
    await answerCallback(cbQueryId, '✅ Тренировка выполнена!')
    const { text, keyboard } = await getGymSummary(userId, today)
    await editMessageText(chatId, messageId, text, keyboard)
    return
  }

  // AI confirm / reject
  if (data === 'ai_confirm' || data === 'ai_reject') {
    const pending = await getPendingForUserId(userId)
    await clearPendingForUserId(userId)
    if (data === 'ai_reject' || !pending || pending.__type !== 'aiConfirm') {
      await answerCallback(cbQueryId, '❌ Отменено')
      await editMessageText(chatId, messageId, '❌ Действие отменено.\n\nНапиши <b>помощь</b> чтобы увидеть команды.', backBtn())
      return
    }
    const { aiType, display, data: actionData, originalText } = pending
    try {
      const confirmText = await executeClassifiedAction(userId, aiType, actionData, today)
      await saveLearnedPattern(userId, originalText, aiType, actionData, display)
      await answerCallback(cbQueryId, '✅ Сохранено!')
      await editMessageText(chatId, messageId, confirmText, backBtn())
    } catch (err) {
      console.error('[ai_confirm] error:', err)
      await answerCallback(cbQueryId, '❌ Ошибка сохранения')
    }
    return
  }

  // ForceReply buttons — ask user to type value
  const forceReplyMap: Record<string, { action: 'sleep' | 'weight' | 'mood' | 'energy'; prompt: string }> = {
    btn_sleep:  { action: 'sleep',  prompt: '😴 Сколько часов ты спал? Ответь числом (напр. <b>7.5</b>):' },
    btn_weight: { action: 'weight', prompt: '⚖️ Введи текущий вес в кг (напр. <b>74.5</b>):' },
    btn_mood:   { action: 'mood',   prompt: '😊 Оцени настроение от 1 до 10 (напр. <b>7</b>):' },
    btn_energy: { action: 'energy', prompt: '⚡ Оцени энергию от 1 до 10 (напр. <b>7</b>):' },
  }
  if (data in forceReplyMap) {
    const { action, prompt } = forceReplyMap[data]
    const botMsgId = await sendForceReply(chatId, prompt)
    if (botMsgId) {
      await storePending(userId, { __type: 'forceReply', action, botMessageId: botMsgId })
    }
    return
  }

  // Module buttons → show summary (edit existing message)
  const moduleHandlers: Record<string, () => Promise<{ text: string; keyboard: InlineKeyboard }>> = {
    btn_gym:     () => getGymSummary(userId, today),
    btn_water:   () => getWaterSummary(userId, today),
    btn_food:    () => getFoodSummary(userId, today),
    btn_rituals: () => getRitualsSummary(userId, today),
    btn_finance: () => getFinanceSummary(userId, today),
    btn_tasks:   () => getTasksSummary(userId, today),
    btn_summary: async () => ({ text: await buildFullSummary(userId, today), keyboard: backBtn() }),
    btn_leaks:        () => getLeaksSummary(userId),
    btn_achievements: () => getAchievementsSummary(userId),
  }

  const handler = moduleHandlers[data]
  if (handler) {
    const { text, keyboard } = await handler()
    await editMessageText(chatId, messageId, text, keyboard)
    return
  }
}

// ─── Route handlers ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (WEBHOOK_SECRET) {
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')
    if (secretHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Callback query (button press) ────────────────────────────────────────
  if (update.callback_query) {
    const cb = update.callback_query
    if (!cb.data || !cb.message) return NextResponse.json({ ok: true })

    let telegramId: bigint
    try { telegramId = BigInt(cb.from.id) } catch { return NextResponse.json({ ok: true }) }

    const user = await db.appUser.findUnique({ where: { telegramId }, select: { id: true } })
    if (!user) {
      await answerCallback(cb.id, '👋 Войди в приложение чтобы привязать аккаунт')
      return NextResponse.json({ ok: true })
    }

    try {
      await handleCallback(cb.id, cb.data, user.id, cb.message.chat.id, cb.message.message_id)
    } catch (err) {
      console.error('[Telegram webhook] callback error:', err)
      await answerCallback(cb.id, '❌ Ошибка, попробуй ещё раз')
    }
    return NextResponse.json({ ok: true })
  }

  // ── Text message ──────────────────────────────────────────────────────────
  const message = update.message
  if (!message?.text || !message.from) return NextResponse.json({ ok: true })

  let telegramId: bigint
  try { telegramId = BigInt(message.from.id) } catch { return NextResponse.json({ ok: true }) }

  const chatId = message.chat.id
  const text   = message.text.trim()

  const user = await db.appUser.findUnique({
    where: { telegramId },
    select: { id: true, telegramFirstName: true },
  })

  if (!user) {
    await sendMessage(chatId, '👋 Привет! Сначала войди в <b>LeakFixer Buddy</b> через Telegram, чтобы привязать аккаунт.')
    return NextResponse.json({ ok: true })
  }

  try {
    // ── Check if this is a reply to a ForceReply prompt ───────────────────
    if (message.reply_to_message) {
      const pending = await getPendingForUserId(user.id)
      if (pending && pending.__type === 'forceReply') {
        await clearPendingForUserId(user.id)
        const today = normalizeToDate(new Date())
        const val = text.trim().replace(',', '.')
        const num = parseFloat(val)
        let reply = ''
        switch (pending.action) {
          case 'sleep':
            if (isNaN(num) || num <= 0 || num > 24) { reply = '❌ Укажи часы, например <b>7.5</b>'; break }
            await db.dailyState.upsert({ where: { userId_date: { userId: user.id, date: today } }, update: { sleepHours: num }, create: { userId: user.id, date: today, mood: 5, energy: 5, sleepHours: num } })
            reply = `😴 Сон <b>${num} ч</b> записан!`; break
          case 'weight':
            if (isNaN(num) || num <= 0) { reply = '❌ Укажи вес в кг, например <b>74.5</b>'; break }
            await db.measurement.create({ data: { userId: user.id, type: 'weight', value: num, unit: 'kg' } })
            reply = `⚖️ Вес <b>${num} кг</b> записан!`; break
          case 'mood': {
            const score = Math.round(num)
            if (isNaN(score) || score < 1 || score > 10) { reply = '❌ От 1 до 10, например <b>7</b>'; break }
            await db.dailyState.upsert({ where: { userId_date: { userId: user.id, date: today } }, update: { mood: score }, create: { userId: user.id, date: today, mood: score, energy: 5 } })
            reply = `😊 Настроение <b>${score}/10</b> записано!`; break
          }
          case 'energy': {
            const score = Math.round(num)
            if (isNaN(score) || score < 1 || score > 10) { reply = '❌ От 1 до 10, например <b>7</b>'; break }
            await db.dailyState.upsert({ where: { userId_date: { userId: user.id, date: today } }, update: { energy: score }, create: { userId: user.id, date: today, mood: 5, energy: score } })
            reply = `⚡ Энергия <b>${score}/10</b> записана!`; break
          }
        }
        if (reply) { await sendMessage(chatId, reply); return }
      }
    }

    const { reply, keyboard } = await handleCommand(user.id, text)

    // ── AI classification for unknown messages ────────────────────────────
    if (reply === '__AI_CLASSIFY__') {
      const classified = await classifyUnknownInput(text, user.id).catch(() => null)
      if (classified && classified.type !== 'unknown') {
        await storePending(user.id, {
          __type: 'aiConfirm',
          aiType: classified.type,
          display: classified.display,
          data: classified.data,
          originalText: text,
        })
        await sendMessage(
          chatId,
          `🤖 Похоже, ты хочешь записать:\n\n<b>${classified.display}</b>\n\nВсё верно?`,
          [[
            { text: '✅ Да, записать', callback_data: 'ai_confirm' },
            { text: '❌ Нет', callback_data: 'ai_reject' },
          ]]
        )
      } else {
        await sendMessage(
          chatId,
          '🤔 Не понял команду. Напиши <b>помощь</b> или нажми кнопку.\n\nПримеры: <code>вода 500</code>, <code>вес 74.5</code>, <code>настроение 8</code>\n🍽️ <code>ел пицца 800</code>, <code>яблоко 300 ккал</code>\n💡 <code>лик описание проблемы</code> — AI-анализ лика'
        )
      }
      return
    }

    await sendMessage(chatId, reply, keyboard)
  } catch (err) {
    console.error('[Telegram webhook] command error:', err)
    await sendMessage(chatId, '❌ Произошла ошибка при сохранении. Попробуй ещё раз.')
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description: 'LeakFixer Buddy Telegram webhook',
    configured: !!BOT_TOKEN,
  })
}
