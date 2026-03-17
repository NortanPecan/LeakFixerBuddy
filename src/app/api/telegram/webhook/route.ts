import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate } from '@/lib/date-utils'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
// Optional secret token set when registering webhook via setWebhook API
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

// ─── Telegram types ────────────────────────────────────────────────────────

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

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

// ─── Regex commands ────────────────────────────────────────────────────────
// "вода 500" / "вода 500 мл" → add 500 ml water
// "вес 74.5" / "вес 74.5 кг" → weight measurement
// "настроение 8" / "mood 8" → mood score 1-10
// "энергия 7" / "energy 7" → energy score 1-10
// "ел пицца 800" / "ел пицца 800 ккал" → food entry (name + optional calories)
// "еда пицца 800" → same
// "зал" / "зал 60" / "зал 60 мин" → gym workout (optional duration)
// "помощь" / "help" → show help

const WATER_RE = /^(?:вода|water)\s+(\d+(?:[.,]\d+)?)\s*(?:мл|ml)?$/i
const WEIGHT_RE = /^(?:вес|weight|вага)\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?$/i
const MOOD_RE = /^(?:настроение|mood|настр)\s+(\d+(?:[.,]\d+)?)$/i
const ENERGY_RE = /^(?:энергия|energy|энерг)\s+(\d+(?:[.,]\d+)?)$/i
const FOOD_RE = /^(?:ел|ела|еда|съел|съела|food|ate)\s+(.+?)(?:\s+(\d+(?:[.,]\d+)?)\s*(?:ккал|кал|cal|kcal)?)?$/i
const GYM_RE = /^(?:зал|gym|трен(?:ировка)?)\s*(?:(\d+(?:[.,]\d+)?)\s*(?:мин|min|минут)?)?$/i
const TASK_RE = /^(?:задача|задание|task)\s+(.+)$/i
const RITUALS_RE = /^(?:ритуалы|ритуал|rituals?)$/i
const SLEEP_RE = /^(?:сон|sleep)\s+(\d+(?:[.,]\d+)?)\s*(?:ч|ч\.|часов?|час|hour|h)?$/i
const SUMMARY_RE = /^(?:сводка|отчёт|отчет|report|summary|итог|итоги)$/i
const INCOME_RE = /^(?:доход|income|заработал|заработала|получил|получила)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i
const EXPENSE_RE = /^(?:расход|расходы|потратил|потратила|купил|купила|expense)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i

// ─── Send Telegram message ────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch {
    // best-effort
  }
}

// ─── Parse & handle command ───────────────────────────────────────────────

async function handleCommand(
  userId: string,
  text: string,
  chatId: number
): Promise<string> {
  const t = text.trim()
  const today = normalizeToDate(new Date())

  // — Water ——————————————————————————————————————————————————
  const waterMatch = t.match(WATER_RE)
  if (waterMatch) {
    const amount = parseFloat(waterMatch[1].replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return '❌ Укажи количество мл: <b>вода 500</b>'

    // Get current water for today, then add
    let fitnessDaily = await db.fitnessDaily.findFirst({
      where: { userId, date: today },
    })
    const profile = !fitnessDaily
      ? await db.userProfile.findUnique({ where: { userId } })
      : null
    const target = fitnessDaily?.waterTarget ?? profile?.waterBaseline ?? 2000
    const current = fitnessDaily?.water ?? 0

    if (!fitnessDaily) {
      fitnessDaily = await db.fitnessDaily.create({
        data: { userId, date: today, water: amount, waterTarget: target },
      })
    } else {
      fitnessDaily = await db.fitnessDaily.update({
        where: { id: fitnessDaily.id },
        data: { water: current + amount },
      })
    }

    const newAmount = fitnessDaily.water
    const pct = Math.round((newAmount / target) * 100)
    return `💧 +${amount} мл воды записано!\nСегодня: <b>${newAmount} / ${target} мл</b> (${pct}%)`
  }

  // — Weight ——————————————————————————————————————————————————
  const weightMatch = t.match(WEIGHT_RE)
  if (weightMatch) {
    const value = parseFloat(weightMatch[1].replace(',', '.'))
    if (isNaN(value) || value <= 0) return '❌ Укажи вес: <b>вес 74.5</b>'

    await db.measurement.create({
      data: { userId, type: 'weight', value, unit: 'kg' },
    })
    return `⚖️ Вес <b>${value} кг</b> записан!`
  }

  // — Mood ———————————————————————————————————————————————————
  const moodMatch = t.match(MOOD_RE)
  if (moodMatch) {
    const score = Math.round(parseFloat(moodMatch[1].replace(',', '.')))
    if (isNaN(score) || score < 1 || score > 10)
      return '❌ Настроение от 1 до 10: <b>настроение 7</b>'

    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { mood: score },
      create: { userId, date: today, mood: score, energy: 5 },
    })
    const emoji = score >= 8 ? '😊' : score >= 5 ? '😐' : '😔'
    return `${emoji} Настроение <b>${score}/10</b> записано!`
  }

  // — Energy ——————————————————————————————————————————————————
  const energyMatch = t.match(ENERGY_RE)
  if (energyMatch) {
    const score = Math.round(parseFloat(energyMatch[1].replace(',', '.')))
    if (isNaN(score) || score < 1 || score > 10)
      return '❌ Энергия от 1 до 10: <b>энергия 7</b>'

    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { energy: score },
      create: { userId, date: today, mood: 5, energy: score },
    })
    const emoji = score >= 8 ? '⚡' : score >= 5 ? '🔋' : '🪫'
    return `${emoji} Энергия <b>${score}/10</b> записана!`
  }

  // — Gym ————————————————————————————————————————————————————
  const gymMatch = t.match(GYM_RE)
  if (gymMatch) {
    const duration = gymMatch[1]
      ? Math.round(parseFloat(gymMatch[1].replace(',', '.')))
      : null

    // Find active GymPeriod
    const period = await db.gymPeriod.findFirst({
      where: { userId, isActive: true },
      include: { workouts: { orderBy: { scheduledDate: 'asc' } } },
    })

    if (period) {
      // Find today's scheduled workout or create a quick one
      const todayWorkout = period.workouts.find(
        (w) =>
          w.scheduledDate &&
          normalizeToDate(w.scheduledDate).getTime() === today.getTime() &&
          w.status === 'scheduled'
      )

      if (todayWorkout) {
        await db.gymWorkout.update({
          where: { id: todayWorkout.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            ...(duration && { duration }),
          },
        })
        const durText = duration ? ` (${duration} мин)` : ''
        return `💪 Тренировка «${todayWorkout.name}»${durText} отмечена как выполненная!`
      }
    }

    // No period or no today workout — create a standalone log entry
    // We store it as a note for now (lightweight, no schema change needed)
    const durText = duration ? ` ${duration} мин` : ''
    const note = await db.note.create({
      data: {
        userId,
        title: `Тренировка${durText}`,
        content: `Быстрая запись тренировки через Telegram${durText ? ` — ${duration} мин` : ''}.`,
      },
    })
    void note
    const reply = duration
      ? `💪 Тренировка <b>${duration} мин</b> записана!`
      : '💪 Тренировка записана!'
    return reply
  }

  // — Food ———————————————————————————————————————————————————
  const foodMatch = t.match(FOOD_RE)
  if (foodMatch) {
    const name = foodMatch[1].trim()
    const calories = foodMatch[2]
      ? Math.round(parseFloat(foodMatch[2].replace(',', '.')))
      : undefined

    await db.foodEntry.create({
      data: {
        userId,
        name,
        mealType: 'snack',
        date: today,
        ...(calories !== undefined && { calories }),
      },
    })

    const calText = calories !== undefined ? ` (${calories} ккал)` : ''
    return `🍽️ <b>${name}</b>${calText} записано!`
  }

  // — Task ———————————————————————————————————————————————————
  const taskMatch = t.match(TASK_RE)
  if (taskMatch) {
    const text = taskMatch[1].trim()
    if (!text) return '❌ Укажи текст задачи: <b>задача купить хлеб</b>'

    await db.task.create({
      data: {
        userId,
        text,
        status: 'todo',
        date: today,
      },
    })
    return `✅ Задача <b>${text}</b> добавлена!`
  }

  // — Rituals (mark all today's active rituals done) ————————
  if (RITUALS_RE.test(t)) {
    const rituals = await db.ritual.findMany({
      where: { userId, status: 'active' },
      select: { id: true, title: true },
    })

    if (rituals.length === 0) {
      return '📋 У тебя нет активных ритуалов. Добавь их в приложении.'
    }

    let done = 0
    for (const ritual of rituals) {
      try {
        await db.ritualCompletion.upsert({
          where: { ritualId_date: { ritualId: ritual.id, date: today } },
          update: { completed: true },
          create: { ritualId: ritual.id, userId, date: today, completed: true },
        })
        done++
      } catch {
        // skip duplicates or errors for individual rituals
      }
    }

    return `🙌 <b>${done} из ${rituals.length}</b> ритуалов отмечено выполненными!`
  }

  // — Sleep ——————————————————————————————————————————————————
  const sleepMatch = t.match(SLEEP_RE)
  if (sleepMatch) {
    const hours = parseFloat(sleepMatch[1].replace(',', '.'))
    if (isNaN(hours) || hours <= 0 || hours > 24)
      return '❌ Укажи часы сна: <b>сон 8</b> или <b>сон 7.5</b>'

    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { sleepHours: hours },
      create: { userId, date: today, mood: 5, energy: 5, sleepHours: hours },
    })

    const emoji = hours >= 8 ? '😴' : hours >= 6 ? '🛌' : '😵'
    return `${emoji} Сон <b>${hours} ч</b> записан!`
  }

  // — Income ————————————————————————————————————————————————
  const incomeMatch = t.match(INCOME_RE)
  if (incomeMatch) {
    const amount = parseFloat(incomeMatch[1].replace(',', '.'))
    const description = incomeMatch[2]?.trim() || null
    if (isNaN(amount) || amount <= 0) return '❌ Укажи сумму: <b>доход 5000</b>'

    const account = await db.account.findFirst({ where: { userId }, select: { id: true } })
    if (!account) return '❌ Нет счёта. Создай его в приложении: Финансы → Счета.'

    await db.transaction.create({
      data: { userId, accountId: account.id, amount, description, date: today },
    })
    return `💚 Доход <b>+${amount}₽</b>${description ? ` (${description})` : ''} записан!`
  }

  // — Expense ———————————————————————————————————————————————
  const expenseMatch = t.match(EXPENSE_RE)
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1].replace(',', '.'))
    const description = expenseMatch[2]?.trim() || null
    if (isNaN(amount) || amount <= 0) return '❌ Укажи сумму: <b>расход 500 кофе</b>'

    const account = await db.account.findFirst({ where: { userId }, select: { id: true } })
    if (!account) return '❌ Нет счёта. Создай его в приложении: Финансы → Счета.'

    await db.transaction.create({
      data: { userId, accountId: account.id, amount: -Math.abs(amount), description, date: today },
    })
    return `💸 Расход <b>−${amount}₽</b>${description ? ` (${description})` : ''} записан!`
  }

  // — Summary (today's mini-report) ————————————————————————
  if (SUMMARY_RE.test(t)) {
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    const [fitnessDaily, dailyState, foodEntries, ritualCompletions, activeRituals, checkins] = await Promise.all([
      db.fitnessDaily.findFirst({ where: { userId, date: startOfDay } }),
      db.dailyState.findFirst({ where: { userId, date: startOfDay } }),
      db.foodEntry.findMany({ where: { userId, date: { gte: startOfDay, lt: endOfDay } }, select: { calories: true } }),
      db.ritualCompletion.findMany({ where: { userId, date: startOfDay, completed: true } }),
      db.ritual.findMany({ where: { userId, status: 'active' } }),
      db.dailyCheckin.findMany({ where: { userId, date: startOfDay } }).catch(() => []),
    ])

    const water = fitnessDaily?.water ?? 0
    const waterTarget = fitnessDaily?.waterTarget ?? 2000
    const waterPct = Math.round((water / waterTarget) * 100)
    const calories = foodEntries.reduce((s, f) => s + (f.calories || 0), 0)
    const ritualsTotal = activeRituals.length
    const ritualsDone = ritualCompletions.length
    const morningDone = checkins.some(c => c.type === 'morning')
    const eveningDone = checkins.some(c => c.type === 'evening')

    const waterBar = waterPct >= 100 ? '🔵🔵🔵🔵🔵' : waterPct >= 80 ? '🔵🔵🔵🔵⚪' : waterPct >= 60 ? '🔵🔵🔵⚪⚪' : waterPct >= 40 ? '🔵🔵⚪⚪⚪' : waterPct >= 20 ? '🔵⚪⚪⚪⚪' : '⚪⚪⚪⚪⚪'
    const todayStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

    let msg = `📊 <b>Сводка за ${todayStr}</b>\n\n`
    msg += `💧 Вода: <b>${water}/${waterTarget} мл</b> ${waterBar}\n`
    if (calories > 0) msg += `🍽️ Калории: <b>${calories} ккал</b>\n`
    if (ritualsTotal > 0) msg += `✅ Ритуалы: <b>${ritualsDone}/${ritualsTotal}</b>\n`
    if (dailyState?.mood) msg += `😊 Настроение: <b>${dailyState.mood}/10</b>\n`
    if (dailyState?.energy) msg += `⚡ Энергия: <b>${dailyState.energy}/10</b>\n`
    if (dailyState?.sleepHours) msg += `😴 Сон: <b>${dailyState.sleepHours} ч</b>\n`
    msg += `\n${morningDone ? '☀️' : '○'} Утро  ${eveningDone ? '🌙' : '○'} Вечер`

    return msg
  }

  // — Help / unknown ————————————————————————————————————————
  if (/^(?:помощь|help|старт|start|команды)$/i.test(t)) {
    return (
      '📋 <b>Команды быстрого ввода:</b>\n\n' +
      '💧 <b>вода 500</b> — добавить 500 мл воды\n' +
      '⚖️ <b>вес 74.5</b> — записать вес (кг)\n' +
      '😊 <b>настроение 8</b> — настроение 1–10\n' +
      '⚡ <b>энергия 7</b> — энергия 1–10\n' +
      '🍽️ <b>ел пицца 800</b> — еда (название + ккал)\n' +
      '💪 <b>зал 60</b> — тренировка (мин, опционально)\n' +
      '✅ <b>задача купить хлеб</b> — добавить задачу\n' +
      '🙌 <b>ритуалы</b> — отметить все ритуалы выполненными\n' +
      '😴 <b>сон 8</b> — записать часы сна\n' +
      '📊 <b>сводка</b> — итоги дня\n' +
      '💚 <b>доход 5000 зарплата</b> — записать доход\n' +
      '💸 <b>расход 500 кофе</b> — записать расход\n\n' +
      'Открой <b>LeakFixer Buddy</b> для полного трекинга.'
    )
  }

  return (
    '🤔 Не понял команду. Напиши <b>помощь</b> для списка команд.\n\n' +
    'Примеры: <code>вода 500</code>, <code>вес 74.5</code>, <code>настроение 8</code>, <code>ел пицца 800</code>, <code>зал 60</code>, <code>задача текст</code>, <code>ритуалы</code>, <code>сон 8</code>, <code>сводка</code>'
  )
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Verify secret token if configured
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

  const message = update.message
  if (!message || !message.text || !message.from) {
    // Non-text updates (stickers, photos, etc.) — just ack
    return NextResponse.json({ ok: true })
  }

  const telegramId = BigInt(message.from.id)
  const chatId = message.chat.id
  const text = message.text.trim()

  // Find user by telegramId
  const user = await db.appUser.findUnique({
    where: { telegramId },
    select: { id: true, telegramFirstName: true },
  })

  if (!user) {
    await sendMessage(
      chatId,
      '👋 Привет! Сначала войди в <b>LeakFixer Buddy</b> через Telegram, чтобы привязать аккаунт.'
    )
    return NextResponse.json({ ok: true })
  }

  try {
    const reply = await handleCommand(user.id, text, chatId)
    await sendMessage(chatId, reply)
  } catch (err) {
    console.error('[Telegram webhook] Error handling command:', err)
    await sendMessage(chatId, '❌ Произошла ошибка при сохранении. Попробуй ещё раз.')
  }

  return NextResponse.json({ ok: true })
}

// GET — health check / webhook info
export async function GET() {
  return NextResponse.json({
    ok: true,
    description: 'LeakFixer Buddy Telegram webhook',
    configured: !!BOT_TOKEN,
  })
}
