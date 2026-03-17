# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-17 (сессия 2)
> Ветка: `claude/telegram-push-notifications-uag21`

---

## Последняя сессия (2026-03-17, сессия 2)

### ✅ Сделано

| # | Задача | Детали |
|---|--------|--------|
| 1 | **Telegram push-уведомления** | `/api/telegram/notify` — утром (06:00 UTC) и вечером (17:00 UTC), пропускает тех кто уже сделал checkin |
| 2 | **Streak Protection (щит)** | `/api/streak/shield` GET+POST, баннер в RitualsScreen, кулдаун 7 дней |
| 3 | **Finance: Monthly Budget Goals** | Кнопка ✏️ на каждой категории, диалог ввода лимита, цветная прогресс-полоска |
| 4 | **Buddy Privacy Settings** | `buddyPrivacy` в UserSettings, фильтрация в dashboard, раздел в SettingsScreen |
| 5 | **worklog.md архив** | 1322 → 381 строк, Task IDs 1–39 → `worklog.archive.md` |

### Архитектурные решения сессии

- **`/api/telegram/notify`** — отдельный endpoint для checkin-напоминаний (vs `/api/notifications/send-reminder` для ритуалов). GET+POST, `?type=morning|evening`
- **Streak shield** — хранится в `AppUser.streakShieldUsedAt`, не в UserSettings. 7-дневный кулдаун. Активация ручная + авто при логине (уже было в auth).
- **Budget goals** — через `Category.monthlyTarget` (уже был в схеме), без новой таблицы `budget_goals`. PATCH `/api/categories` уже поддерживал это поле.
- **Buddy privacy** — три уровня: `full` / `partial` / `streak`. Фильтрация в dashboard route — `null` вместо скрытых полей.

### Миграции этой сессии (применить в Supabase SQL Editor)

| Файл | Таблица | Статус |
|------|---------|--------|
| `prisma/migrations/20260317_checkin_reminders.sql` | `user_settings.checkin_reminders` | ✅ применена |
| `prisma/migrations/20260317_streak_shield.sql` | `app_users.streak_shield_used_at` | ✅ применена |
| `prisma/migrations/20260317_buddy_privacy.sql` | `user_settings.buddy_privacy` | ⚠️ применить! |

---

## Задачи — следующая сессия (по приоритету)

### 1. Buddy Matching v2 (по ЛИКУ-профилю) 🔴 ВЫСОКИЙ
**Что нужно**: Матчинг по похожим паттернам поведения из Leak Engine, а не только по категориям ритуалов.

**Шаги:**
- Из weekly report — извлекать `leakProfile` (топ-3 паттерна пользователя)
- Хранить в `UserProfile.leakProfile Json?` (или считать on-demand)
- В `/api/buddies/suggest` — сортировать по схожести leak-профилей
- Миграция: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS "leak_profile" jsonb;`

---

### 2. HabitsScreen: статистика + streak на карточке привычки 🟡 СРЕДНИЙ
**Что нужно**: На карточке каждой привычки видна полоска прогресса за 7 дней и текущий стрик.

**Шаги:**
- `/api/habits` — добавить `last7Days` (массив boolean) в ответ каждой привычки
- HabitsScreen — маленькая dot-визуализация 7 дней + `🔥 N` стрик

---

### 3. Wellbeing: еженедельный отчёт настроения 🟡 СРЕДНИЙ
**Что нужно**: В WeeklyReport — раздел с графиком настроения/энергии за неделю.

**Шаги:**
- `/api/wellbeing/weekly` уже есть — проверить что возвращает
- WeeklyReportScreen — добавить секцию с мини-графиком (7 точек mood + energy)
- Цветовая кодировка: зелёный ≥7, жёлтый 4-6, красный ≤3

---

### 4. Daily Summary: утренний и вечерний checkin на HomeScreen 🟢 НИЗКИЙ
**Что нужно**: На HomeScreen показывать статус утреннего/вечернего чек-ина с быстрым доступом.

**Шаги:**
- Загружать `GET /api/checkin?userId=...&date=today` при загрузке HomeScreen
- Показывать два бейджа: `☀️ Утро ✅` / `🌙 Вечер ⏳`
- Тап → открывает DailySummaryScreen

---

### 5. Onboarding: шаг с выбором Buddy Privacy 🟢 НИЗКИЙ
**Что нужно**: При первом запуске — объяснить и настроить приватность бадди.

**Шаги:**
- В OnboardingScreen добавить шаг с выбором `buddyPrivacy`
- Сохранять через PATCH `/api/settings`

---

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | `claude/telegram-push-notifications-uag21` |
| **Git** | Claude Code делает git самостоятельно |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor |
| **API** | ~75 endpoints в `src/app/api/` |

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |

## Новые API endpoints (эта сессия)

```
GET/POST /api/telegram/notify?type=morning|evening  — checkin напоминания
GET      /api/streak/shield?userId=xxx              — статус щита
POST     /api/streak/shield { userId }              — активировать щит
```
