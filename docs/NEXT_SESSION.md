# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-17 (сессия 8)
> Ветка: `claude/telegram-webhook-setup-sCxHz`

---

## Последняя сессия (2026-03-17, сессия 8)

### ✅ Сделано

| # | Задача | Детали |
|---|--------|--------|
| — | **DailySummaryScreen: сон** | `sleepHours` в сетке статистики (3 колонки: настроение/энергия/сон) |
| — | **DailySummaryScreen: оценка дня** | Score 0–100 в заголовке. Формула: ритуалы 25%, вода 20%, настроение 20%, энергия 15%, чекапы 10%+10%. Цвет: зелёный/жёлтый/красный |
| — | **StatsScreen: графики** | `/api/stats/history` +калории/вода/вес. Три новых chart: калории, вода, вес (14 дней) |
| — | **Telegram: `сводка`** | Мини-итоги дня — вода/ккал/ритуалы/настроение/сон/чекапы в одном сообщении |
| — | **Telegram: `доход` / `расход`** | `доход 5000 зарплата` → `transaction +N`, `расход 500 кофе` → `transaction -N` |
| — | **WeeklyReport: мини-бар еды** | DayRow теперь показывает цветную полоску качества еды (good/neutral/bad) |
| — | **Supplement reminder cron** | `/api/notifications/send-supplement-reminder`, 08:00 UTC = 11:00 MSK |
| — | **HomeScreen: supplements toggle** | БАДы в настройках виджетов (ProfileScreen) + `{showSupplements && ...}` в HomeScreen |

---

## ⚠️ Telegram webhook — ЗАРЕГИСТРИРОВАТЬ вручную

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://leak-fixer-buddy.vercel.app/api/telegram/webhook" \
  -d "secret_token=LeakFixer2026Secret"
```

Затем в Vercel ENV добавить `TELEGRAM_WEBHOOK_SECRET=LeakFixer2026Secret`.

> **Важно:** токен бота попал в открытый чат — перевыпусти его через @BotFather (`/revoke`).

---

## ⚠️ Миграции — применить в Supabase (если ещё не)

| Файл | Таблица | Статус |
|------|---------|--------|
| `prisma/migrations/20260317_gym_stretching.sql` | `gym_workouts.stretching_done` | применить |
| `prisma/migrations/20260317_emotion_logs.sql` | `emotion_logs` | применить |
| `prisma/migrations/20260317_fleeting_thoughts.sql` | `fleeting_thoughts` | применить |
| `prisma/migrations/20260317_hidden_widgets.sql` | `user_settings.hidden_widgets` | применить |

---

## Задачи — следующая сессия (по приоритету)

### 1. 🔴 Зарегистрировать Telegram webhook (ручной шаг)
Единственное что нельзя автоматизировать — `setWebhook` вызов после перевыпуска токена.
После регистрации бот начнёт принимать сообщения и отвечать на 12 команд.

### 2. 🟡 Supplement reminder — отдельный флаг
Сейчас `send-supplement-reminder` проверяет `ritualReminders`. Нужен отдельный `supplementReminders`:
- Добавить `supplementReminders Boolean @default(true)` в `schema.prisma`
- Миграция `prisma/migrations/YYYYMMDD_supplement_reminders.sql`
- SettingsScreen: Switch для переключения
- `send-supplement-reminder/route.ts`: изменить `where: { supplementReminders: true }`

### 3. 🟡 StatsScreen — выбор периода (7д/14д/30д/90д)
Сейчас `?days=30` фиксировано, в UI `last14Days` жёстко. Добавить:
- State `periodDays: 14 | 30 | 90`
- Кнопки переключения
- Пересчёт `last14Days` → `lastNDays` от нужного числа

### 4. 🟢 DailySummaryScreen — share оценки дня
Кнопка «Поделиться» рядом со score: формирует текст типа
`📊 Мой день: 83/100 — Отличный! 💧100% 🍽️ 1800ккал ✅ 4/5 ритуалов`
и копирует в clipboard или открывает Telegram.

### 5. 🟢 Ачивменты за оценку дня
Первый раз получить 80+, 7 дней подряд 70+ → значок в ProfileScreen.
Хранить в `Achievement` (таблица уже есть).

---

## Telegram bot — полный список команд (v3, 12 команд)

| Команда | Действие |
|---------|---------|
| `вода 500` | +500 мл к воде дня |
| `вес 74.5` | замер веса |
| `настроение 8` | mood 1–10 |
| `энергия 7` | energy 1–10 |
| `ел пицца 800` | food entry |
| `зал 60` | gym workout |
| `задача купить хлеб` | task |
| `ритуалы` | отметить все выполненными |
| `сон 8` | sleepHours |
| `сводка` | мини-итоги дня |
| `доход 5000 зарплата` | income transaction |
| `расход 500 кофе` | expense transaction |
| `помощь` | список команд |

---

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 8 * * *` | 08:00 | 11:00 | Supplement reminder (новый) |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | `claude/telegram-webhook-setup-sCxHz` |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor |
| **Transaction.amount** | Положительный = доход, отрицательный = расход (нет поля type!) |
| **Supplement reminder** | Пока использует `ritualReminders`, нужен отдельный флаг |
