# LeakFixer Buddy — Claude Instructions

## Проект
Self-improvement social network. Next.js 14 App Router + TypeScript + Prisma + Supabase PostgreSQL.

---

## КРИТИЧЕСКИЕ правила

- **ВЕТКА**: только `claude/hopeful-hamilton-tkw1n` — никогда не пушить в main/master без разрешения
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
│   ├── db.ts               # Prisma client
│   ├── store.ts            # Zustand (Screen type здесь)
│   ├── network-utils.ts    # showSuccessToast, showErrorToast
│   ├── streak-utils.ts     # calculateStreak, calculateHabitStreak
│   ├── mood-utils.ts       # getMoodStatus, getMoodStatusText
│   ├── ai-provider.ts      # Groq + Gemini fallback, логирует в ai_logs
│   ├── ai-leak-prompts.ts  # Промпт-билдер, парсер JSON-ответа, Telegram-форматтер
│   └── ai-analyze-leak.ts  # Shared функция analyzeLeakWithAI() — используется API + Telegram
└── prisma/schema.prisma
```

---

## Стек
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Zustand (state), Prisma ORM, Supabase PostgreSQL
- shadcn/ui компоненты
- React.lazy + Suspense (code splitting)
- **AI**: Groq (`llama-3.3-70b-versatile`) primary + Gemini 2.5 Flash-Lite fallback

## Команды
```bash
bun run lint          # проверка линтера (0 ошибок!)
bun run build         # сборка
bun run db:generate   # после изменений schema.prisma
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
GROQ_API_KEY           # console.groq.com — первичный AI провайдер
GEMINI_API_KEY         # aistudio.google.com — fallback AI провайдер
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

## Текущее состояние (2026-03-17, сессия 11)

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

**AI-анализ ликов (сессии 10–11)**
- ✅ `src/lib/ai-provider.ts` — Groq primary + Gemini fallback, таймауты, логирование каждого вызова в `ai_logs`
- ✅ `src/lib/ai-leak-prompts.ts` — системный промпт, билдер пользовательского контекста (7 дней статистики + паттерны), JSON-парсер ответа, Telegram-форматтер
- ✅ `src/lib/ai-analyze-leak.ts` — shared функция `analyzeLeakWithAI()`, используется и в API-роуте и в Telegram напрямую
- ✅ `POST /api/ai/analyze-leak` — собирает контекст юзера, вызывает AI, сохраняет в `user_ai_patterns`
- ✅ `GET /api/ai/analyze-leak` — возвращает кешированный анализ без нового AI-вызова
- ✅ `PATCH /api/ai/analyze-leak` — фидбек по решению: `{ userId, leakType, solutionText, worked }` → пишет в `triedSolutions[].worked` и `whatWorked`
- ✅ `GET /api/ai/recommendations` — возвращает свежайший `UserAiPattern` пользователя за последние 7 дней
- ✅ `src/components/LeakAiAnalysisCard.tsx` — кнопка «🤖 Разобрать с ИИ» + карточка (причина / 3 решения с дедлайнами / персональное наблюдение)
- ✅ `LeakAiAnalysisCard` — кнопка «📋 Добавить в задачи»: все 3 решения → `POST /api/tasks` с автоконвертацией дедлайна в дату
- ✅ `LeakAiAnalysisCard` — фидбек «✅ Сработало» / «❌ Не помогло» под каждым решением (оптимистично)
- ✅ WeeklyReportScreen — `LeakAiAnalysisCard` под каждым ликом
- ✅ MonthlyReportScreen — `LeakAiAnalysisCard` под каждым глубоким ликом
- ✅ Telegram команда `лик [текст]` — keyword-классификатор + прямой вызов AI (без self-referential HTTP)
- ✅ HomeScreen виджет «💡 AI Рекомендации» — тип лика + топ-решение + кнопка «Все» → WeeklyReport; скрывается через `hiddenWidgets` (`ai_recommendations`)
- ✅ ProfileScreen → Виджеты: переключатель «AI Рекомендации»
- ✅ `ai_logs` таблица — логирует промпт/ответ/модель/юзер/латентность/провайдер/ошибки
- ✅ `user_ai_patterns` таблица — хранит историю анализов, tried solutions, whatWorked по каждому типу лика
- ✅ Прокси-архитектура: ключи только на сервере, фронт не знает ни ключей, ни провайдера

**Telegram bot (сессии 6–9)**
- ✅ `POST /api/telegram/webhook` — 13 текстовых команд: вода/вес/настроение/энергия/ел/зал/задача/ритуалы/сон/сводка/доход/расход/помощь
- ✅ Верификация через `TELEGRAM_WEBHOOK_SECRET`, GET → healthcheck
- ✅ Inline keyboard: главное меню с 11 кнопками (💪🍽️💧✅😴⚖️😊⚡💰📊📋)
- ✅ Callback handlers для каждого модуля — сводки прямо в боте
- ✅ GYM сводка: упражнения в формате `Жим — 4х12х50кг(55) 🏆`, кнопка «Отметить выполненной»
- ✅ Вода: live-обновление без нового сообщения, кнопки +200/+350/+500 мл
- ✅ Ритуалы: список с ✅/⬜, кнопка «Отметить все выполненными»
- ✅ ⚙️ Настройки кнопок: каждую кнопку можно вкл/выкл прямо в боте, хранится в `hidden_widgets` (префикс `tg_`)
- ✅ Webhook зарегистрирован, токен перевыпущен через @BotFather

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
| `prisma/migrations/20260317_user_ai_patterns.sql` | `user_ai_patterns` | ✅ применена |
| `prisma/migrations/20260317_ai_logs.sql` | `ai_logs` | ✅ применена |

---

## Следующие задачи (приоритет, сессия 12)

### 1. 🔴 Supplement reminder — отдельный флаг (30 мин)
Сейчас `/api/notifications/send-supplement-reminder` проверяет `ritualReminders`. Нужен отдельный флаг.
- `prisma/schema.prisma`: добавить `supplementReminders Boolean @default(true)`
- `prisma/migrations/20260317_supplement_reminders.sql` + применить в Supabase SQL Editor
- `SettingsScreen.tsx`: Switch «Напоминание о БАДах»
- `send-supplement-reminder/route.ts`: заменить `ritualReminders` → `supplementReminders`

### 2. 🟡 StatsScreen — выбор периода 7д/14д/30д/90д (1 час)
Сейчас `?days=30` и `last14Days` жёстко захардкожено.
- State `periodDays: 7 | 14 | 30 | 90` + кнопки-переключатели в UI
- API: передавать `?days=N`, пересчёт всех chart и averages
- Файлы: `src/components/screens/StatsScreen.tsx`, `src/app/api/stats/history/route.ts`

### 3. 🟡 Ачивменты за оценку дня (2 часа)
Таблица `Achievement` уже есть в Prisma schema.
- Триггеры: первый 80+ → badge «Отличный день», 7 дней подряд 70+ → badge «Неделя качества»
- API: `POST /api/achievements/check` → проверка условий и запись
- UI: показывать popup при выдаче, список в ProfileScreen

### 4. 🟢 Telegram bot — inline ввод данных через ForceReply (1.5 часа)
Сейчас кнопки «Сон», «Вес», «Настроение», «Энергия» только показывают текущее значение.
- Flow: нажал кнопку → бот спрашивает значение (ForceReply) → пользователь отвечает → записывается
- Хранить `pendingAction` в `fleeting_thoughts` (TTL 5 мин) или временной Note
- Файл: `webhook/route.ts` — проверять `message.reply_to_message`

### 5. 🟢 DailySummaryScreen — кнопка «Поделиться» оценкой (30 мин)
Кнопка рядом со score формирует текст:
`📊 Мой день: 83/100 — Отличный! 💧100% 🍽️1800ккал ✅4/5 ритуалов`
→ `navigator.clipboard.writeText()` или `window.open('tg://msg?text=...')`
Файл: `src/components/screens/DailySummaryScreen.tsx`

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

## Что делали в сессии 2026-03-17 (сессия 9)

### Telegram inline keyboard + настройки кнопок

**Telegram webhook — полный рефактор** (`src/app/api/telegram/webhook/route.ts`)

Главное: файл переписан с 454 → 570 строк, добавлены inline keyboard и callback handler.

**Inline keyboard (новое)**
- Главное меню 11 кнопок по 3 в ряд + ⚙️ Настройки — появляется при `/start`, `меню`, `помощь`
- `sendMessage` расширен параметром `keyboard?: InlineKeyboard`
- `editMessageText` — редактирует существующее сообщение (live-обновление без нового сообщения)
- `answerCallbackQuery` — подтверждение нажатия в 10-секундный лимит Telegram

**Callback handlers (11 модулей)**
- `btn_gym` → `getGymSummary`: сегодняшняя / последняя тренировка. Формат: `Жим — 4х12х50кг(55) 🏆`. PR определяется сравнением текущего веса с max по всем сетам этого упражнения. Кнопка «Отметить выполненной» → `gym_done_{id}` → обновляет статус и перерисовывает
- `btn_water` → `getWaterSummary`: статус + бар + кнопки +200/+350/+500 → `water_add_{N}` → live-update того же сообщения
- `btn_food` → `getFoodSummary`: список с 🟢🟡🔴, сумма ккал
- `btn_rituals` → `getRitualsSummary`: список ✅/⬜ + кнопка «Отметить все» → `rituals_done_all`
- `btn_finance` → баланс месяца (доходы/расходы/итог)
- `btn_tasks` → список задач дня с ✅/⬜
- `btn_weight` → последний замер + подсказка команды
- `btn_mood` / `btn_energy` / `btn_sleep` → единый `getMoodEnergySummary` (настроение + энергия + сон)
- `btn_summary` → полная сводка дня (= текстовая команда `сводка`)
- `btn_settings` → экран настроек кнопок
- `btn_menu` → назад в главное меню (editMessageText)

**Настройки кнопок (toggle)**
- `btn_settings` → `buildSettingsKeyboard`: каждая кнопка с ✅/❌, нажатие → `toggle_tg_{id}`
- `toggle_tg_{id}` → `toggleTgButton(userId, btnId)` → upsert в `user_settings.hidden_widgets` (добавляет/убирает строку `tg_gym`, `tg_food` и т.д.)
- После toggle: `editMessageText` с обновлённой клавиатурой (без нового сообщения)
- `getHiddenTgButtons` фильтрует `hidden_widgets` по префиксу `tg_`
- Решение: переиспользуем существующее поле `hiddenWidgets jsonb` — миграция не нужна

**Решения сессии**
- Telegram `editMessageText` вместо `sendMessage` для интерактивных экранов (вода, настройки) — меньше спама
- PR в GYM: не дёргаем `/api/gym/records`, а делаем один JOIN-запрос к `gym_exercise_sets` прямо в webhook
- Настройки кнопок в `hidden_widgets` с префиксом `tg_` — расширяемо без изменения схемы
- Все текстовые команды сохранены без изменений

**Что настроили (ручные шаги пользователя)**
- ✅ Применены все 4 миграции в Supabase SQL Editor (emotion_logs, fleeting_thoughts, stretching_done, hidden_widgets) — верифицировано через MCP
- ✅ Токен бота перевыпущен через @BotFather
- ✅ Новый токен обновлён в Vercel ENV
- ✅ `TELEGRAM_WEBHOOK_SECRET` добавлен в Vercel ENV
- ✅ Webhook зарегистрирован через браузер (`setWebhook?url=...&secret_token=...`)

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

## Что делали в сессии 2026-03-17 (сессия 10)

### AI-анализ ликов — полная реализация

**Новые файлы:**
- `src/lib/ai-provider.ts` — Groq + Gemini с fallback, таймауты (15с/20с), логирует каждый вызов в `ai_logs` (включая ошибки и фолбеки). Принимает `AiCallOptions { userId, callType, leakType }`
- `src/lib/ai-leak-prompts.ts` — системный промпт-коуч, `buildLeakAnalysisMessage()` собирает контекст (профиль + 7 дней статистики + прошлые паттерны), `parseLeakAnalysis()` достаёт JSON из ответа с graceful fallback, `formatLeakAnalysisForTelegram()` для бота
- `src/lib/ai-analyze-leak.ts` — shared `analyzeLeakWithAI()`: загружает контекст из БД, вызывает AI, сохраняет в `user_ai_patterns`. Используется и в API-роуте и в Telegram напрямую (без HTTP)
- `src/app/api/ai/analyze-leak/route.ts` — тонкая обёртка над shared функцией. GET — кеш без AI
- `src/components/LeakAiAnalysisCard.tsx` — кнопка «🤖 Разобрать с ИИ», lazy-fetch, показывает urgency badge + причину + 3 решения с дедлайнами + персональное наблюдение + провайдер

**Изменённые файлы:**
- `WeeklyReportScreen.tsx` — `LeakAiAnalysisCard` встроена в каждый лик-хинт
- `MonthlyReportScreen.tsx` — `LeakAiAnalysisCard` встроена в каждый глубокий лик
- `telegram/webhook/route.ts` — команда `лик [текст]` + keyword-классификатор `classifyLeakFromText()`

**Новые таблицы в БД:**
- `user_ai_patterns` — `@@unique(userId, leakType)`, хранит `lastAnalysis JSON`, `triedSolutions JSON[]`, `whatWorked JSON[]`, `analysisCount`, `lastProvider`
- `ai_logs` — аудит всех AI-вызовов: `callType`, `leakType`, `provider`, `model`, `system_prompt` (≤2000), `user_message` (≤4000), `response` (≤4000), `success`, `error_msg`, `latency_ms`

### Принятые решения (важно для следующих сессий)

- **Прокси**: ключи `GROQ_API_KEY` / `GEMINI_API_KEY` только на сервере. Фронт вызывает `/api/ai/analyze-leak`, никогда не AI-провайдеров напрямую.
- **Telegram `лик`**: не делаем self-referential HTTP fetch (ненадёжно в serverless). Импортируем `analyzeLeakWithAI()` напрямую из `@/lib/ai-analyze-leak`.
- **`NEXT_PUBLIC_VERCEL_URL` не существует** — Vercel ставит только `VERCEL_URL` (без NEXT_PUBLIC_). В serverless-коде нет смысла использовать NEXT_PUBLIC_ переменные.
- **ai_logs**: логирование не должно ломать основной флоу — всё в `try/catch`, ошибка логируется в console но не бросается дальше.
- **Персонализация**: контекст для промпта собирается каждый раз из живых данных (7 дней), а не кешируется отдельно.

### Баги исправлены в этой сессии

- **Telegram `лик` → «AI временно недоступен»**: причина — self-referential fetch с `NEXT_PUBLIC_VERCEL_URL` (пустая на сервере). Исправлено: прямой импорт `analyzeLeakWithAI()`.

### Ручные шаги (уже выполнены пользователем)

- ✅ `user_ai_patterns` миграция применена в Supabase
- ✅ `ai_logs` миграция применена в Supabase
- ✅ `GROQ_API_KEY` добавлен в Vercel ENV
- ✅ `GEMINI_API_KEY` добавлен в Vercel ENV

---

## Что делали в сессии 2026-03-17 (сессия 11)

### AI-рекомендации — все три уровня внедрения

**Новые файлы:**
- `src/app/api/ai/recommendations/route.ts` — `GET /api/ai/recommendations?userId=...` возвращает свежайший `UserAiPattern` (< 7 дней) пользователя. Используется виджетом на HomeScreen.

**Изменённые файлы:**
- `src/app/api/ai/analyze-leak/route.ts` — добавлен `PATCH` handler: принимает `{ userId, leakType, solutionText, worked }`, обновляет `triedSolutions[].worked` и `whatWorked` в `UserAiPattern`
- `src/components/LeakAiAnalysisCard.tsx` — три новых возможности:
  1. Кнопка «📋 Добавить в задачи» — каждое из 3 решений становится `Task` (POST /api/tasks, zone: 'LeakFixer', date из дедлайна AI)
  2. Фидбек «✅ Сработало» / «❌ Не помогло» под каждым решением — оптимистичное обновление UI + PATCH на сервер
  3. Конвертер дедлайна: "сегодня"→today, "завтра"→+1, "за N дней"→+N, "неделя"→+7, "месяц"→+30
- `src/components/screens/HomeScreen.tsx` — виджет «💡 AI Рекомендации»: загружает `GET /api/ai/recommendations` при монтировании, показывается между «Фокус недели» и «Лики недели» (только день >= 8), скрывается через `hiddenWidgets['ai_recommendations']`
- `src/components/screens/ProfileScreen.tsx` — добавлен переключатель «AI Рекомендации» в раздел «Виджеты главного экрана»

### Принятые решения (важно для следующих сессий)

- **Фидбек в `PATCH /api/ai/analyze-leak`** — не отдельный endpoint `/feedback`, а в тот же route: чище, меньше файлов
- **Дедлайн → дата**: парсим текст AI регуляркой (`/(\d+)\s*дн/`, `недел`, `месяц`), fallback → +7 дней. Не пытаемся парсить произвольный русский текст полностью.
- **Виджет на HomeScreen**: IIFE-паттерн `{(() => { ... })()}` — вместо вынесения в отдельный компонент, сохраняет локальный доступ к `setScreen`
- **`triedSolutions`**: если решение не найдено в массиве при фидбеке — добавляем новую запись (graceful handling)
- **Следующий AI-анализ учитывает фидбек**: `buildLeakAnalysisMessage()` уже включает `triedSolutions` и `whatWorked` в промпт через `pastPatterns` — миграций не нужно

### Ничего не осталось незакончено — все три уровня реализованы полностью

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
