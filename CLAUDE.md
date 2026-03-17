# LeakFixer Buddy — Claude Instructions

## Проект
Self-improvement social network. Next.js 14 App Router + TypeScript + Prisma + Supabase PostgreSQL.

---

## КРИТИЧЕСКИЕ правила

- **ВЕТКА**: только `claude/code-review-cV4rg` — никогда не пушить в main/master без разрешения
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
├── app/api/              # ~70 API endpoints (Prisma → Supabase)
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

---

## Текущее состояние (2026-03-17)

### Что реализовано
- ✅ Leak Engine (weekly + monthly reports с 11 паттернами)
- ✅ GymScreen полный рефакторинг: 2697 → 895 строк (Context + 7 диалогов)
- ✅ GymPeriod: wizard 4 шага, WeeklySchedule, WorkoutDetail, QuickComplete
- ✅ Buddy matching (базовый, по категориям ритуалов)
- ✅ MonthlyReport + WeeklyReport экраны
- ✅ Социальные фичи: Buddy comparison, badges, week-over-week

### Незавершённые задачи (приоритет)
1. **Push-уведомления через Telegram Bot** — напоминания о ритуалах (нужен TELEGRAM_BOT_TOKEN)
2. **Streak protection** — щит стрика 1×/нед (нужна миграция: поле `streakShield` в UserSettings)
3. **Finance: monthly budget goals** — цели по категориям на месяц
4. **Privacy Settings для Buddy** — что видит бадди (миграция: новые поля в UserSettings)
5. **Buddy Matching v2** — матчинг по похожим ЛИКАМ (не только категориям)

### Технический долг
- `worklog.md` — вырос до ~1300 строк, стоит периодически архивировать

---

## Что делали в сессии 2026-03-17

### GymPeriod миграция
Применена миграция `prisma/migrations/20260317_gym_period_schedule.sql` — добавлены поля для WeeklySchedule и рефакторинга GymScreen.

### Рефакторинг GymScreen (Context/Dialog паттерн)
- Создан `GymContext.tsx` — весь state и все handlers (~1200 строк)
- Извлечены все 7 диалогов в `features/gym/components/`
- GymScreen: **2697 → 895 строк** (-67%)
- `GymContext.tsx`: добавлен экспорт `setSelectedTemplate`
- Все компоненты на `useGymContext()` — без props-дрилла

### Документация
- Удалено 11 устаревших .md файлов (аудиты, планы 2025, старые инструкции)
- Оставлено 3 рабочих: CLAUDE.md, docs/NEXT_SESSION.md, docs/FEATURE_MAP.md
