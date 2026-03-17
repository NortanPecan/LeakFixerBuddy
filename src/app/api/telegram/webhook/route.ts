import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate } from '@/lib/date-utils'

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
      '📊 <b>сводка</b>  💚 <b>доход 5000</b>  💸 <b>расход 500</b>'
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
      data: { userId, title: `Тренировка${durText}`, content: `Быстрая запись через Telegram${durText ? ` — ${duration} мин` : ''}.` },
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

  // Unknown
  return {
    reply: '🤔 Не понял команду. Напиши <b>помощь</b> или нажми кнопку.\n\nПримеры: <code>вода 500</code>, <code>вес 74.5</code>, <code>настроение 8</code>',
  }
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

  // Module buttons → send new message
  const moduleHandlers: Record<string, () => Promise<{ text: string; keyboard: InlineKeyboard }>> = {
    btn_gym:     () => getGymSummary(userId, today),
    btn_water:   () => getWaterSummary(userId, today),
    btn_food:    () => getFoodSummary(userId, today),
    btn_rituals: () => getRitualsSummary(userId, today),
    btn_finance: () => getFinanceSummary(userId, today),
    btn_tasks:   () => getTasksSummary(userId, today),
    btn_weight:  () => getWeightSummary(userId),
    btn_mood:    () => getMoodEnergySummary(userId, today),
    btn_energy:  () => getMoodEnergySummary(userId, today),
    btn_sleep:   () => getMoodEnergySummary(userId, today),
    btn_summary: async () => ({ text: await buildFullSummary(userId, today), keyboard: backBtn() }),
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
    const { reply, keyboard } = await handleCommand(user.id, text)
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
