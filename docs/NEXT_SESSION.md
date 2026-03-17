# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-17
> Ветка: `claude/code-review-cV4rg`

---

## Последняя сессия (2026-03-17)

### ✅ Сделано

| # | Задача | Детали |
|---|--------|--------|
| 1 | **GymPeriod миграция** | Применена `prisma/migrations/20260317_gym_period_schedule.sql` |
| 2 | **GymContext.tsx** | Весь state + handlers вынесен из GymScreen (~1200 строк) |
| 3 | **7 диалоговых компонентов** | GymWizardDialogs, GymWorkoutDetailDialog, GymExerciseLibraryDialog, GymPostWorkoutDialog, GymQuickCompleteDialog, AddWorkoutDialog, CompletionPreviewDialog |
| 4 | **GymScreen: 2697 → 895 строк** | -67%, Context/Dialog паттерн |
| 5 | **Чистка документации** | Удалено 11 устаревших .md, оставлено 3 актуальных |

### Архитектурные решения сессии
- **GymContext паттерн**: `useGymContext()` в каждом диалоге — без props-дрилла
- Все компоненты в `src/features/gym/components/`
- `setSelectedTemplate` добавлен в GymContext экспорт

---

## Задачи — приоритет по порядку

### 1. Push-уведомления через Telegram Bot 🔴 ВЫСОКИЙ
**Что нужно**: Когда пользователь не открывает приложение — бот шлёт напоминание о ритуалах/привычках.

**Шаги:**
- API endpoint `/api/telegram/notify` (POST → TG Bot API sendMessage)
- Логика: если пользователь не делал checkin сегодня → уведомить
- Триггер: cron-job или Vercel cron

**Требования**: `TELEGRAM_BOT_TOKEN` уже в ENV

---

### 2. Streak Protection (щит стрика) 🟡 СРЕДНИЙ
**Что нужно**: 1 раз в неделю можно "защитить" стрик (не потерять при пропуске).

**Шаги:**
- Миграция: добавить `streakShield: Int @default(1)` и `lastShieldUsed: DateTime?` в `UserSettings`
- API: PATCH `/api/user-settings` — use shield
- UI: кнопка в HabitsScreen/RitualsScreen при пропуске

**SQL для миграции:**
```sql
ALTER TABLE user_settings ADD COLUMN "streakShield" integer NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN "lastShieldUsed" timestamp;
```

---

### 3. Finance: Monthly Budget Goals 🟡 СРЕДНИЙ
**Что нужно**: Установить лимит расходов по каждой категории на месяц.

**Шаги:**
- Миграция: таблица `budget_goals` (userId, categoryId, month, amount)
- API: GET/POST/PATCH `/api/finance/budget`
- UI: в FinanceScreen — панель целей vs фактические расходы

---

### 4. Buddy Privacy Settings 🟢 НИЗКИЙ
**Что нужно**: Настроить что видит бадди (100% / 70% / только streak).

**Шаги:**
- Миграция: `buddyPrivacy: String @default("full")` в UserSettings
- UI: раздел в SettingsScreen

---

### 5. Buddy Matching v2 (по ликам) 🟢 НИЗКИЙ
**Что нужно**: Найти пользователей с похожим LEAK-профилем (не только категории ритуалов).

**Шаги:**
- Вычислять leak-profile per user (из weekly report)
- Хранить в БД или считать on-demand
- Алгоритм сходства (cosine similarity по метрикам)

---

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | `claude/code-review-cV4rg` |
| **Git** | Claude Code делает git самостоятельно |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor |
| **API** | ~70 endpoints в `src/app/api/` |

## Структура gym модуля (после рефакторинга)
```
src/features/gym/
├── GymContext.tsx           # Весь state + handlers
├── constants.ts
├── types.ts
├── index.ts
└── components/
    ├── GymWizardDialogs.tsx          # Wizard 4 шага + exercise picker
    ├── GymWorkoutDetailDialog.tsx    # Детали тренировки (615 строк → отдельный)
    ├── GymExerciseLibraryDialog.tsx  # Библиотека упражнений
    ├── GymPostWorkoutDialog.tsx      # Заметки/оценка после тренировки
    ├── GymQuickCompleteDialog.tsx    # Быстрое завершение с весами
    ├── AddWorkoutDialog.tsx          # Добавить тренировку из календаря
    └── CompletionPreviewDialog.tsx   # Превью итогов тренировки
```
