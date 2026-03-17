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

## Текущее состояние (2026-03-17, сессия 8)

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
- ✅ Telegram push: утро (06:00 UTC), вечер (17:00 UTC), ритуалы (16:00 UTC), БАДы (08:00 UTC)
- ✅ Vercel Cron расписание (5 cron jobs)

**Прочее UX**
- ✅ Рефрейминг при срыве еды (DailySummaryScreen) + "Умные замены" (5.2)
- ✅ Рефрейминг при провале ритуалов
- ✅ "🍽️ Я ел сегодня" кнопка когда нет записей о еде (5.10)
- ✅ Поиск по еде в HealthScreen (фильтр по имени)
- ✅ Export данных + готовый AI-промпт

**Telegram quick input (сессия 6)**
- ✅ `POST /api/telegram/webhook` — regex-парсер 6 команд: вода N, вес N, настроение N, энергия N, ел [name] [N ккал], зал [N мин]
- ✅ Верификация через `TELEGRAM_WEBHOOK_SECRET` (заголовок `X-Telegram-Bot-Api-Secret-Token`)
- ✅ Поиск пользователя по `telegramId`, ответы с результатом, `/help` → список команд

**Онбординг и персонализация (сессия 6)**
- ✅ Прогрессивный онбординг (7.1): до дня 8 скрыты EmotionWidget, FleetingThoughts, Wellbeing, «Лики недели», «Месячный анализ», «Фокус недели»; показывается баннер «🔓 ещё X дн.»
- ✅ Карточка «За X дней»: показывает изменение веса (первый → текущий замер, дельта кг)
- ✅ Настраиваемый HomeScreen (7.2/7.3): `hiddenWidgets Json` в `UserSettings`, переключатели в ProfileScreen → Настройки (Вес, Велнес)

### ⚠️ Миграции — статус

| Файл | Таблица | Статус |
|------|---------|--------|
| `prisma/migrations/20260317_gym_period_schedule.sql` | `gym_periods`, `gym_workouts` | ✅ применена |
| `prisma/migrations/20260317_gym_stretching.sql` | `gym_workouts.stretching_done` | ✅ применена |
| `prisma/migrations/20260317_emotion_logs.sql` | `emotion_logs` | ✅ применена |
| `prisma/migrations/20260317_fleeting_thoughts.sql` | `fleeting_thoughts` | ✅ применена |
| `prisma/migrations/20260317_hidden_widgets.sql` | `user_settings.hidden_widgets` | ✅ применена |

---

## Следующие задачи (приоритет, сессия 9)

### 1. 🔴 Зарегистрировать Telegram webhook (ручной шаг, 1 команда)
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://leak-fixer-buddy.vercel.app/api/telegram/webhook" \
  -d "secret_token=LeakFixer2026Secret"
```
Vercel ENV: `TELEGRAM_WEBHOOK_SECRET=LeakFixer2026Secret`.
**Важно:** токен бота попал в открытый чат — перевыпусти через @BotFather `/revoke` сначала!

### 2. 🟡 Supplement reminder — добавить отдельный флаг в UserSettings
Сейчас supplement reminder использует `ritualReminders`. Добавить `supplementReminders Boolean @default(true)` в schema.prisma, миграцию, переключатель в SettingsScreen.
Файлы: `prisma/schema.prisma`, `prisma/migrations/YYYYMMDD_supplement_reminders.sql`, `src/components/screens/SettingsScreen.tsx`, `src/app/api/notifications/send-supplement-reminder/route.ts`.

### 3. 🟡 Ачивменты за оценку дня
В DailySummaryScreen отображается оценка 0–100. Можно добавить badge-награды при достижении порогов: первый день 80+, 7 дней подряд 70+, и т.д. Хранить в таблице `Achievement`.

### 4. 🟢 Stripe/платёж или Export расширить
ExportScreen уже экспортирует данные. Добавить кнопку «Отправить на email» (простой mailto: с данными) или PDF export через window.print().

### 5. 🟢 StatsScreen — добавить сводку за выбранный период
Сейчас период 14/30 дней фиксирован. Добавить кнопки 7д/14д/30д/90д и пересчёт статистики (averages, totals) для выбранного диапазона.

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

## Что делали в сессии 2026-03-17 (сессия 6)

### Telegram webhook + онбординг + персонализация

**6.1 — Telegram webhook быстрый ввод** (`src/app/api/telegram/webhook/route.ts`)
- Принимает Telegram updates (POST), находит пользователя по `telegramId`
- Regex-парсер 6 команд: `вода N`, `вес N`, `настроение N`, `энергия N`, `ел [name] [N ккал]`, `зал [N мин]`
- Вода: получает текущий остаток и прибавляет (не перезаписывает)
- Зал: если есть активный GymPeriod с тренировкой на сегодня — отмечает completed, иначе создаёт Note
- Ответы с emoji-подтверждением, команда `помощь` → список
- `TELEGRAM_WEBHOOK_SECRET` — опциональная верификация через заголовок
- GET → healthcheck `{ ok, configured }`
- Исправлен баг: `earlyBird` не деструктурировался в `CheckinStatusBlock` → ReferenceError на продакшне

**2.4 — Прогресс веса от первого дня**
- `/api/measurements` теперь возвращает `firstByType` (первый замер каждого типа, `orderBy: date asc`)
- ProfileScreen карточка «За X дней»: строка `75.0 → 72.5 кг (−2.5 кг)` ниже трёх плиток, цвет зелёный если снизил, оранжевый если набрал

**7.1 — Прогрессивный онбординг**
- HomeScreen: `user.day < 8` скрывает EmotionWidget, FleetingThoughtsWidget, WellbeingWidget, «Фокус недели», «Лики недели», «Месячный анализ»
- Баннер «🔓 Аналитика откроется на 8-й день (ещё X дн.)» виден на днях 1–7
- Решение: простые inline условия `(user?.day ?? 1) >= 8`, без нового стейта

**7.2/7.3 — Настраиваемый HomeScreen**
- Prisma schema: `hiddenWidgets Json @default("[]")` в `UserSettings`
- Миграция: `prisma/migrations/20260317_hidden_widgets.sql` (применена)
- `UserSettings` interface расширен полем `hiddenWidgets?: string[]`
- HomeScreen: грузит настройки при монтировании, скрывает виджеты `weight` и `wellbeing` если они в массиве
- ProfileScreen → Настройки: раздел «Виджеты главного экрана» с двумя Switch (Вес / Велнес), PATCH `/api/settings`
- Решение: хранить как JSON массив строк-идентификаторов, а не булевы поля (проще расширять)

### Что НЕ успели / осталось
- Регистрация webhook в Telegram (нужен ручной `setWebhook` вызов с правильным `secret_token`)

---

## Что делали в сессии 2026-03-17 (сессия 7)

### Автономная работа ~2 часа — большой пакет фич

**7.2 — Настраиваемый HomeScreen расширен**
- ProfileScreen: 7 переключателей: Вес, Велнес, Настроение/Энергия, Вода, Еда, Ритуалы, Быстрый ввод
- HomeScreen: динамическая сетка сводки (`style.gridTemplateColumns`) — нет пустых ячеек

**6.1 — Telegram-парсер расширен (+3 команды)**
- `задача [текст]` → `db.task.create`
- `ритуалы` → `db.ritualCompletion.upsert` (все активные ритуалы)
- `сон 8` → `db.dailyState.upsert({ sleepHours })`

**7.8 — ExportScreen: данные за месяц + AI-промпт**
- +3 entity: замеры тела, тренировки/PR, финансы
- AI-промпты переписаны для 4 провайдеров (Claude/GPT/Gemini/Generic)

**7.1 — Двухуровневый онбординг**
- `ONBOARDING_UNLOCKS[]` с `{id, unlockDay}`, хелпер `isUnlocked()`
- День 8: аналитика. День 15: финансы и buddy (шорткаты на HomeScreen)

**Buddy UX + Telegram персонализация + Journey UX + sleep корреляция**
- BuddyScreen: фильтр по категории, badge % совместимости
- Telegram notify: персональный текст с именем, стриком, ритуалами
- JourneyScreen: кнопки назад, ACHIEVEMENT_LABELS
- Фикс ritual reminder: `r.name` → `r.title`
- WeeklyReport: корреляции сон→энергия и зал→настроение следующего дня

---

## Что делали в сессии 2026-03-17 (сессия 8)

### Автономная работа — доработки и новые фичи

**DailySummaryScreen**
- `sleepHours` отображается в сетке статистики (3 колонки: настроение/энергия/сон)
- Оценка дня 0–100 в заголовке: ритуалы 25%, вода 20%, настроение 20%, энергия 15%, чекапы по 10%
- Цветовая кодировка: зелёный ≥75, жёлтый ≥50, красный <50

**StatsScreen — новые графики**
- `/api/stats/history` расширен: калории, вода (мл), вес (кг) в день
- Три новых chart: AreaChart калорий, AreaChart воды, LineChart веса (последние 14 дней)

**Telegram бот — 3 новые команды**
- `сводка` / `отчёт` — мини-итоги дня: вода/ккал/ритуалы/настроение/сон/чекапы
- `доход 5000 зарплата` → `db.transaction.create({ amount: +N })`
- `расход 500 кофе` → `db.transaction.create({ amount: -N })`
- Итого 12 команд в боте

**WeeklyReport — мини-бар качества еды**
- API: `foodGood / foodNeutral / foodBad` в DayData
- DayRow: цветная полоска зелёный/жёлтый/красный (пропорционально кол-ву записей)

**Уведомления**
- Новый endpoint `/api/notifications/send-supplement-reminder`
- Vercel cron 08:00 UTC → 11:00 MSK: напоминает о непринятых БАДах
- Кому: пользователи с `ritualReminders: true` у которых есть `isActive` supplements

**HomeScreen — БАДы в настройках виджетов**
- ProfileScreen: `{ id: 'supplements', label: 'БАДы (в сводке)' }` в WIDGET_CONFIG
- HomeScreen: supplements карточка теперь оборачивается `{showSupplements && ...}`

### Решения (важно)
- Transaction: нет поля `type`, знак amount определяет доход/расход (+ = доход, − = расход)
- Оценка дня: взвешенная формула `(score/weight)*100`, отображается только если `weight > 0`
- Supplement reminder использует флаг `ritualReminders` (отдельного флага нет в схеме)

---

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка истёкших fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 8 * * *` | 08:00 | 11:00 | Supplement reminder (новый) |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |

## Telegram webhook — активация (разовая)

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d url=https://<vercel-domain>/api/telegram/webhook \
  -d secret_token=<TELEGRAM_WEBHOOK_SECRET>
```
ENV Vercel: добавить `TELEGRAM_WEBHOOK_SECRET` (любая строка ≥ 16 символов).
