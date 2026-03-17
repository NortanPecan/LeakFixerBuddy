# LeakFixer Buddy — Claude Instructions

## Проект
Self-improvement social network. Next.js 14 App Router + TypeScript + Prisma + Supabase PostgreSQL.

---

## КРИТИЧЕСКИЕ правила

- **ВЕТКА**: только `claude/telegram-push-notifications-uag21` — никогда не пушить в main/master без разрешения
- **БД**: только Supabase PostgreSQL через Prisma ORM (локальной БД нет!)
- **Язык UI**: русский
- **Lint**: `bun run lint` перед каждым коммитом (0 ошибок!)
- **Миграции**: применяются вручную через Supabase SQL Editor, файл кладём в `prisma/migrations/`

---

## Путь к проекту
`/home/user/LeakFixerBuddy`

## Обязательно читать перед работой
1. `docs/NEXT_SESSION.md` — текущий статус и задачи
2. `docs/FEATURE_MAP.md` — полная карта фич

---

## Структура

```
src/
├── app/api/              # ~75 API endpoints (Prisma → Supabase)
├── components/screens/   # Основные экраны
├── features/
│   ├── gym/
│   │   ├── GymContext.tsx        # Весь state + handlers (useGymContext)
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── components/           # Все диалоги GymScreen (7 компонентов)
│   │       ├── GymWizardDialogs.tsx
│   │       ├── GymWorkoutDetailDialog.tsx
│   │       ├── GymExerciseLibraryDialog.tsx
│   │       ├── GymPostWorkoutDialog.tsx
│   │       ├── GymQuickCompleteDialog.tsx
│   │       ├── AddWorkoutDialog.tsx
│   │       └── CompletionPreviewDialog.tsx
│   └── profile/
│       ├── constants.ts
│       └── components/ (QuickAccess.tsx, DonateCard.tsx)
├── lib/
│   ├── db.ts             # Prisma client
│   ├── store.ts          # Zustand (Screen type здесь)
│   ├── network-utils.ts  # showSuccessToast, showErrorToast
│   ├── streak-utils.ts   # calculateStreak, calculateHabitStreak
│   └── mood-utils.ts     # getMoodStatus, getMoodStatusText
└── prisma/schema.prisma
```

---

## Стек
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Zustand (state), Prisma ORM, Supabase PostgreSQL
- shadcn/ui компоненты
- React.lazy + Suspense (code splitting)

## Команды
```bash
bun run lint          # проверка линтера (0 ошибок!)
bun run build         # сборка
bun prisma generate   # после изменений schema.prisma
```

## ENV переменные
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL           # pooler :6543
DIRECT_DATABASE_URL    # direct :5432
TELEGRAM_BOT_TOKEN
CRON_SECRET            # Bearer-токен для защиты cron endpoints
```

---

## Паттерны кода

### GymScreen — Context/Dialog паттерн
Весь state и логика в `GymContext.tsx`. Каждый диалог — отдельный компонент, получает всё через `useGymContext()` (без props).

```tsx
// ✅ Правильно — компонент диалога
export function GymWorkoutDetailDialog() {
  const { selectedWorkout, handleDeleteExercise, ... } = useGymContext()
  return <Dialog open={showWorkoutDetail} ...>...</Dialog>
}
```

### Миграции schema.prisma
Новые модели → `prisma/schema.prisma` → SQL в `prisma/migrations/YYYYMMDD_name.sql` → применить вручную в Supabase SQL Editor.

### Telegram Cron endpoints
Защищены `CRON_SECRET` (Authorization: Bearer). GET + POST оба поддерживаются.

---

## Текущее состояние (2026-03-17, сессия 2)

### Что реализовано
- ✅ Leak Engine (weekly + monthly reports с 11 паттернами)
- ✅ GymScreen полный рефакторинг: 2697 → 895 строк (Context + 7 диалогов)
- ✅ GymPeriod: wizard 4 шага, WeeklySchedule, WorkoutDetail, QuickComplete
- ✅ Buddy matching (базовый, по категориям ритуалов)
- ✅ MonthlyReport + WeeklyReport экраны
- ✅ Социальные фичи: Buddy comparison, badges, week-over-week
- ✅ **Telegram push-уведомления** — checkin reminders (06:00 + 17:00 UTC), ritual reminders (16:00 UTC)
- ✅ **Streak Protection** — щит в RitualsScreen, API `/api/streak/shield`, кулдаун 7 дней
- ✅ **Finance Budget Goals** — лимит расходов на категорию, цветная прогресс-полоска
- ✅ **Buddy Privacy** — three levels (full/partial/streak), фильтрация в dashboard

### Незавершённые задачи (приоритет)
1. **Buddy Matching v2** — матчинг по похожим ЛИКАМ (`leakProfile` в UserProfile)
2. **HabitsScreen: 7-day dots + streak** — визуализация прогресса на карточке привычки
3. **WeeklyReport: mood/energy graph** — мини-график настроения за 7 дней
4. **HomeScreen: checkin status badges** — статус утреннего/вечернего чек-ина
5. **Onboarding: Buddy Privacy шаг** — выбор приватности при первом запуске

### Технический долг
- `worklog.md` — актуален (381 строк), архив в `worklog.archive.md`

---

## Что делали в сессии 2026-03-17 (сессия 1)

### GymPeriod миграция
Применена миграция `prisma/migrations/20260317_gym_period_schedule.sql`.

### Рефакторинг GymScreen (Context/Dialog паттерн)
- Создан `GymContext.tsx` — весь state и все handlers (~1200 строк)
- Извлечены все 7 диалогов в `features/gym/components/`
- GymScreen: **2697 → 895 строк** (-67%)

---

## Что делали в сессии 2026-03-17 (сессия 2)

### Telegram Push-уведомления
- Создан `/api/telegram/notify` — утренний и вечерний checkin reminder
- `checkinReminders` в UserSettings (миграция применена)
- Vercel Cron: 06:00 UTC (утро) + 17:00 UTC (вечер) + 16:00 UTC (ритуалы)
- Тумблер в SettingsScreen

### Streak Protection (щит)
- `streakShieldUsedAt` уже был в `AppUser` — использовали его
- Создан `/api/streak/shield` GET (статус) + POST (активация, кулдаун 7 дней)
- SQL миграция для `streak_shield_used_at` на `app_users` (применена)
- Зелёный/серый баннер щита в RitualsScreen

### Finance Monthly Budget Goals
- `Category.monthlyTarget` уже был в схеме — новых миграций не нужно
- Кнопка ✏️ у каждой категории → диалог → PATCH `/api/categories`
- Цветная Progress: зелёный (<70%), жёлтый (70-100%), красный (>100%)

### Buddy Privacy Settings
- `buddyPrivacy String @default("full")` добавлен в UserSettings
- SQL миграция `20260317_buddy_privacy.sql` — **применить в Supabase!**
- Фильтрация в `/api/buddies/dashboard` по уровню: full / partial / streak
- Карточка с 3 кнопками в SettingsScreen

### worklog.md
- 1322 → 381 строк, Task IDs 1–39 → `worklog.archive.md`
