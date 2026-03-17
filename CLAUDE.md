# LeakFixer Buddy — Claude Instructions

## Проект
Self-improvement social network. Next.js 14 App Router + TypeScript + Prisma + Supabase PostgreSQL.

---

## КРИТИЧЕСКИЕ правила

- **ВЕТКА**: только `claude/buddy-matching-v2-jyJbK` — никогда не пушить в main/master без разрешения
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
├── app/api/              # ~90 API endpoints (Prisma → Supabase)
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

### Вычисления без новых API
- **TDEE**: Harris-Benedict BMR (10w + 6.25h - 5age + 5) × 1.55, считается на фронте в DailySummaryScreen
- **1RM**: Epley formula `weight * (1 + reps/30)`, считается в GymWorkoutDetailDialog
- **Корреляции**: чистый JS из массива DayData[], никаких доп. запросов
- **PR badge**: сравнение с `personalRecords` map из `/api/gym/records`

---

## Текущее состояние (2026-03-17, сессия 5)

### Что реализовано (полный список)

**Фундамент и UX**
- ✅ Lazy loading всех экранов (React.lazy + Suspense)
- ✅ Email + Telegram авторизация
- ✅ Утренний/вечерний чекап с автопоказом по времени
- ✅ HomeScreen: статус чекапа (☀️/🌙 badges), стрик-баннер (7/14/21/30/60/90 дней)
- ✅ Быстрый ввод на HomeScreen: "вода 300", "вес 74.5", "настроение 7", "зал", "ел", "ритуалы"
- ✅ Оптимистичные обновления воды (+200/+350/+500 мл)

**Трекинг**
- ✅ Gym: периодизация (GymPeriod wizard), тренировки, упражнения, подходы
- ✅ Gym: растяжка после тренировки (stretchingDone), 1RM (Epley), PR badge 🏆
- ✅ Еда: фиксация приёмов, качество (good/neutral/bad), 3-сегментный бар
- ✅ Вода, вес, настроение/энергия, БАДы, замеры тела
- ✅ Ритуалы/привычки: 7-day dots, streak, 30-дневный % выполнения
- ✅ Финансы: доходы/расходы, категории, лимиты (monthlyTarget), остаток бюджета
- ✅ Задачи, заметки, эмоции, мимолётные мысли (TTL 48ч)

**Аналитика**
- ✅ WeeklyReport: MoodEnergyChart (SVG polyline), CorrelationInsights, BestDay, SmartRecommendation
- ✅ MonthlyReport с 11 паттернами (Leak Engine)
- ✅ TDEE рекомендация в DailySummaryScreen (Harris-Benedict)
- ✅ 7-дневная скользящая средняя калорий
- ✅ Личные рекорды PR + SVG-sparkline прогресса весов в ProfileScreen
- ✅ Процентиль сообщества ("топ X%") на ProfileScreen

**Социальные фичи**
- ✅ Buddy matching (Jaccard по leak_profile)
- ✅ Buddy Privacy (full/partial/streak), выбор в Settings
- ✅ Buddy comparison dashboard

**Геймификация**
- ✅ Стрики, очки, "X дней с приложением"
- ✅ Streak Protection (щит, кулдаун 7 дней)
- ✅ "Ранняя пташка" бейдж ⚡ при входе до 9:00

**Уведомления**
- ✅ Telegram push: утро (06:00 UTC), вечер (17:00 UTC), ритуалы (16:00 UTC)
- ✅ Vercel Cron расписание

**Прочее UX**
- ✅ Рефрейминг при срыве еды (DailySummaryScreen) + "Умные замены" (5.2)
- ✅ Рефрейминг при провале ритуалов
- ✅ "🍽️ Я ел сегодня" кнопка когда нет записей о еде (5.10)
- ✅ Поиск по еде в HealthScreen (фильтр по имени)
- ✅ Export данных + готовый AI-промпт

### ⚠️ Миграции — ПРИМЕНИТЬ в Supabase!

| Файл | Таблица |
|------|---------|
| `prisma/migrations/20260317_gym_stretching.sql` | `gym_workouts.stretching_done` |
| `prisma/migrations/20260317_emotion_logs.sql` | `emotion_logs` |
| `prisma/migrations/20260317_fleeting_thoughts.sql` | `fleeting_thoughts` |

---

## Следующие задачи (приоритет)

### 1. 🔴 Telegram-бот: быстрый ввод (6.1)
Пишешь боту "зал 45 минут" или "съел пиццу 800 ккал" → regex/LLM парсит → записывает в БД.
**Нужно обсудить**: TELEGRAM_BOT_TOKEN уже есть в ENV, нужен сценарий использования.
Реализация: webhook `/api/telegram/webhook`, простой regex-парсер (без LLM для начала).

### 2. 🟡 Прогресс от первого дня — расширить (2.4)
Добавить в карточку "За X дней" изменение веса: первый замер vs последний.
Данные уже есть в `/api/measurements`, нужно добавить `firstByType` в ответ.

### 3. 🟡 Прогрессивный онбординг (7.1)
Первые 7 дней — только базовые блоки. На 8+ день открываются продвинутые фичи.
Реализация: `user.day` уже есть в AppUser, нужна логика показа/скрытия.

### 4. 🟢 Настраиваемый HomeScreen (7.2/7.3)
Пользователь скрывает/показывает блоки. Настройки в `UserSettings` (новое поле `hiddenWidgets`).

### 5. 🟢 Экспорт в MD + AI-промпт (7.8)
Доделать ExportScreen: включить данные за месяц + готовый структурированный промпт для анализа.

---

## Что делали в сессии 2026-03-17 (сессия 1)

### GymPeriod миграция + рефакторинг GymScreen
- Применена миграция `prisma/migrations/20260317_gym_period_schedule.sql`
- GymScreen: 2697 → 895 строк (Context/Dialog паттерн, 7 отдельных компонентов)

---

## Что делали в сессии 2026-03-17 (сессия 2)

### Telegram Push + Streak Shield + Finance + Buddy Privacy
- `/api/telegram/notify` — утренний и вечерний checkin reminder
- `/api/streak/shield` — щит стрика (кулдаун 7 дней)
- Finance Budget Goals (monthlyTarget), цветная Progress-полоска
- Buddy Privacy три уровня (full/partial/streak) в Settings

---

## Что делали в сессии 2026-03-17 (сессии 4–5)

### Сессия 4 — большой пакет фич
- **5.22** Растяжка после тренировки (stretchingDone в Prisma + кнопка в GymPostWorkoutDialog)
- **5.6** Рефрейминг срыва в еде (карточка в DailySummaryScreen при bad>2)
- **2.5** Личные рекорды PR (`/api/gym/records`, 🏆 badge в GymWorkoutDetailDialog)
- **5.21** 1RM расчёт (Epley formula под упражнением)
- **5.7** Быстрое добавление воды (+200/+350/+500 мл, optimistic update)
- **5.9** Мини-бар качества еды (3 сегмента: зелёный/жёлтый/красный)
- **7.4** Быстрый ввод на HomeScreen (regex-парсер 8 команд)
- **5.8** TDEE рекомендация (Harris-Benedict BMR × 1.55)
- **2.4** Карточка "За X дней" (очки/стрик/тренировки на ProfileScreen)
- **2.8** Стрик-баннер на HomeScreen (7/14/21/30/60/90 дней)
- **3.2** CorrelationInsights в WeeklyReport
- **3.10** Процентиль сообщества (`/api/stats/community`)
- **2.7** Рефрейминг провала ритуалов
- **5.26** (частично) PR в ProfileScreen (топ-5 упражнений)
- **5.0** completionRate30d в HabitsScreen
- **Finance** Остаток бюджета под каждой категорией

### Сессия 5 — доработки и новые фичи
- **Best Day** Карточка 🌟 лучшего дня в WeeklyReportScreen
- **UX** Поиск по еде в HealthScreen (Input-фильтр при 4+ записях)
- **6.5** SmartRecommendation в WeeklyReport (rule-based, 5 областей анализа)
- **5.2** "Умные замены" в reframe-карточке (6 готовых свопов bad→good)
- **5.26** SVG-sparkline прогресса весов в ProfileScreen (↑зелёный/↓жёлтый)
- **5.10** Кнопка "🍽️ Я ел сегодня" в DailySummaryScreen (для начинающих)
- **API** `/api/gym/records` расширен: теперь возвращает `history[]` (последние 10 тренировок на упражнение)

---

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка истёкших fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |
