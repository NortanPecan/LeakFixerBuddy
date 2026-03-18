# LeakFixer Buddy — Claude Instructions

## Проект
Self-improvement social network. Next.js 14 App Router + TypeScript + Prisma + Supabase PostgreSQL.

---

## КРИТИЧЕСКИЕ правила

- **ВЕТКА**: только `claude/challenge-detail-screen-2312J` — никогда не пушить в main/master без разрешения
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

## Текущее состояние (2026-03-18, сессия 20)

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
- ✅ Челленджи: личные + AI-генерируемые против ликов, 6 типов трекеров, лимит 3 активных
- ✅ ChallengeDetailScreen: tracker 7-day история (цветные точки), кнопка «Завершить досрочно»
- ✅ CHALLENGE_FIRST бейдж — при первом завершённом челлендже (inline в calculateChallengeProgress)
- ✅ HomeScreen: виджет «Активные челленджи» (до 2 карточек, hiddenWidgets['challenges'])
- ✅ ProfileScreen → Виджеты: переключатель «Активные челленджи»

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

**Геймификация — достижения (сессии 12–13)**
- ✅ `POST /api/achievements/check` — calcDayScore() + проверка GREAT_DAY_FIRST / QUALITY_WEEK, создание Achievement
- ✅ `GET /api/achievements/check` — список всех достижений пользователя
- ✅ DailySummaryScreen: popup «🌟 Новое достижение!» при получении нового бейджа
- ✅ ProfileScreen: карточка «Достижения» — 6 плиток (2 реальных + 4 мотивирующих заблокированных), серые/заблюренные если не получены
- ✅ `GET /api/ai/patterns` — список всех UserAiPattern пользователя
- ✅ ProfileScreen: секция «История AI-анализов» — тип лика, кол-во анализов, сколько сработало, дата

**Telegram bot (сессии 6–9, 12–13, 16–17)**
- ✅ `POST /api/telegram/webhook` — 15 текстовых команд: вода/вес/настроение/энергия/еда/зал/задача/ритуалы/сон/сводка/доход/расход/ачивменты/тренер/помощь
- ✅ Верификация через `TELEGRAM_WEBHOOK_SECRET`, GET → healthcheck
- ✅ Inline keyboard: главное меню с **14 кнопками** (💪🍽️💧✅😴⚖️😊⚡💰📊📋🔍🏅🏋️)
- ✅ Callback handlers для каждого модуля — сводки прямо в боте
- ✅ GYM сводка: упражнения в формате `Жим — 4х12х50кг(55) 🏆`, кнопка «Отметить выполненной»
- ✅ GYM: кнопки `➕ Сет → Название` под каждым упражнением → ForceReply → `75x8` / `75 8` / `75` → `gymExerciseSet.create`
- ✅ **GYM: кнопка `➕ Упражнение`** → ForceReply «Жим 4x12 75кг» → `parseNewExercise()` → `gymExercise.create` + первый сет
- ✅ Вода: live-обновление без нового сообщения, кнопки +200/+350/+500 мл
- ✅ Ритуалы: список с ✅/⬜, кнопка «Отметить все выполненными»
- ✅ ⚙️ Настройки кнопок: каждую кнопку можно вкл/выкл прямо в боте, хранится в `hidden_widgets` (префикс `tg_`)
- ✅ Webhook зарегистрирован, токен перевыпущен через @BotFather
- ✅ ForceReply для Сон/Вес/Настроение/Энергия/GymSet/GymExercise/Тренер: кнопка → бот спрашивает → записывается
- ✅ 🔍 Лики в боте: кнопка показывает список UserAiPattern с причинами и топ-решениями
- ✅ AI-адаптация неизвестных сообщений: Groq классифицирует тип → подтверждение ✅/❌ → сохранение + обучение regex-паттерна
- ✅ Кнопка 🏅 Достижения + команда `ачивменты` — список с датами или подсказка как получить
- ✅ Расширенный парсер еды: `ел {name} {вес} {ккал/100г} [Б Ж У]` → автопересчёт на порцию
- ✅ Дедупликация по update_id (zone=`__tg_dedup`) — защита от Telegram retry loop при медленном AI
- ✅ `тренер [вопрос]` — AI Coach: 30 дней данных → Groq → конкретный ответ по числам, логируется в `ai_logs (callType='tg_coach')`
- ✅ **Кнопка 🏋️ Тренер в меню**: `btn_trainer` → ForceReply → `runCoach()` (shared функция, DRY)
- ✅ AI-резюме недели: `GET /api/ai/weekly-digest?userId=` + batch-рассылка `GET /api/telegram/send-weekly-digest`
- ✅ Cron `0 7 * * 1` в `vercel.json` — понедельник 07:00 UTC = 10:00 МСК
- ✅ Telegram: кнопки быстрого старта челленджей (💪/💧/🔥) после `вызовы`
- ✅ Telegram: callback `challenge_start_{metric}_{target}_{duration}` → `db.challenge.create` + подтверждение
- ✅ Telegram: TG-поздравление при завершении челленджа (из `calculateChallengeProgress`)

**AI трансформация (сессия 17)**
- ✅ `GET /api/ai/transformation?userId=` — первые 30 дней vs последние 30 дней: mood/energy/gym/rituals/calories/weight → AI-нарратив «Как я изменился», кеш 7 дней
- ✅ ProfileScreen: карточка «✨ Как я изменился» при `day >= 30`, ленивая загрузка, fallback при ошибке

**Аналитика StatsScreen (сессии 16–17)**
- ✅ Стрелки трендов ↑↓ в карточке «Настроение и энергия» — сравнение первой vs второй половины периода, порог ≥ 0.3, зелёные/красные

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
| `prisma/migrations/20260317_supplement_reminders.sql` | `user_settings.supplement_reminders` | ✅ применена |
| `prisma/migrations/20260318_training_data_view.sql` | `training_data` (VIEW) | ✅ применена |

---

## Следующие задачи (приоритет, сессия 22)

### 1. 🔴 ProfileScreen: CHALLENGE_FIRST + все 7 ачивментов в карточке
`ALL_ACHIEVEMENT_DEFS` содержит только 6 плиток (GREAT_DAY_FIRST, QUALITY_WEEK, STREAK_7, STREAK_30, WATER_WEEK, GYM_10) — CHALLENGE_FIRST отсутствует. Нужно добавить в массив и обновить счётчик «X/7».
- В `ALL_ACHIEVEMENT_DEFS` добавить `{ code: 'CHALLENGE_FIRST', label: 'Первый вызов', emoji: '🏆', desc: 'Завершить первый челлендж' }`
- Файл: `src/components/screens/ProfileScreen.tsx`

### 2. 🟡 HomeScreen: клик на карточку активного челленджа → ChallengeDetailScreen
Сейчас клик ведёт на `setScreen('goals')`.
- Изменить на: `setSelectedContentId(c.id); setScreen('challenge-detail')`
- Файл: `src/components/screens/HomeScreen.tsx`

### 3. 🟡 Telegram: getChallengesSummary — реальный прогресс через calculateChallengeProgress
Сейчас показывает `c.progress` (сырое из БД), не пересчитывает tracker-метрики.
- Вызвать `calculateChallengeProgress(c, userId)` для каждого активного челленджа перед рендером
- Файл: `src/app/api/telegram/webhook/route.ts`

### 4. 🟢 ChallengeDetailScreen: кнопка «Отметить день» показывает сообщение если уже отмечен
Сейчас API возвращает `{ alreadyMarked: true }` (добавлено в сессии 21), но фронт не обрабатывает это поле.
- В `handleMarkDay` показывать showSuccessToast('✅ Сегодня уже отмечен!') при `alreadyMarked: true`
- Файл: `src/components/screens/ChallengeDetailScreen.tsx`

### 5. 🟢 Проверить кнопки tracker-прогресса в ChallengesScreen getProgressLabel()
Функция `getProgressLabel()` в ChallengesScreen может показывать "8.2 / 8 дней" для avg-метрик. Проверить и привести к единому виду с исправлением в ChallengeDetailScreen из сессии 21.

---

## Что делали в сессии 2026-03-18 (сессия 21)

### Полный аудит багов + 5 реальных исправлений

**Формат:** аудит всей кодовой базы по ключевым файлам (challenges, achievements, rituals, ProfileScreen, HomeScreen, ChallengeDetailScreen, store).

**Найдено 5 реальных багов:**

| # | Баг | Severity | Файл |
|---|-----|----------|------|
| 1 | `PATCH /api/challenges` игнорировал поле `startDate` — активация planned-челленджа не сбрасывала дату старта | 🔴 HIGH | `challenges/route.ts` |
| 2 | `markDay` без дедупликации по дате — можно было нажать 30 раз в день, мгновенно завершая челлендж | 🔴 HIGH | `challenges/route.ts` |
| 3 | `incrementLinkedChallenges` инкрементила `daysCompleted` за каждый ритуал, а не за каждый день — 5 ритуалов в день = +5 к счётчику | 🟡 MEDIUM | `rituals/complete/route.ts` |
| 4 | Tracker-тип в ChallengeDetailScreen показывал «7/10 дней» вместо «7/10 тренировок» — не было ветки для `type === 'tracker'` | 🟡 MEDIUM | `ChallengeDetailScreen.tsx` |
| 5 | `markDay` при завершении не выдавал CHALLENGE_FIRST achievement и не отправлял TG-уведомление (в отличие от `calculateChallengeProgress`) | 🟢 LOW | `challenges/route.ts` |

**Изменённые файлы:**
- `src/app/api/challenges/route.ts`:
  - Добавлен `startDate` в деструктуризацию body и в `updateData` PATCH-обработчика
  - `markDay`: дедупликация — `lastCheckedAt.toISOString().split('T')[0] === todayStr`, при совпадении возвращает `{ alreadyMarked: true }` без инкремента
  - `markDay` при `newStatus === 'completed'`: inline создание `CHALLENGE_FIRST` + TG-уведомление (зеркалит `calculateChallengeProgress`)
- `src/app/api/rituals/complete/route.ts`:
  - `incrementLinkedChallenges`: проверка `lastCheckedAt` — если уже помечен сегодня, `continue` без инкремента
- `src/components/screens/ChallengeDetailScreen.tsx`:
  - Прогресс-лейбл: добавлена ветка `challenge.type === 'tracker'` с IIFE, парсящим `config.metric` и выбирающим unit из словаря (`gym_count → тренировок`, `sleep_avg → ч сна`, `mood_avg → /10`, etc.)

**Принятые решения:**
- **`alreadyMarked` vs ошибка**: API возвращает `200 { alreadyMarked: true }` (не 400) — фронт покажет тост «уже отмечен», без прерывания UX.
- **`daysCompleted` читается до обновления**: В `markDay` читаем `existing.daysCompleted` до `db.challengeProgress.update()`, чтобы вычислить правильное значение без дополнительного запроса.
- **Tracker unit словарь в двух местах**: в ChallengeDetailScreen (для detail view) и в ChallengesScreen `getProgressLabel()` (для списка). Намеренно не выносим в shared — разные контексты отображения.
- **`incrementLinkedChallenges` dedup через `lastCheckedAt`**: поле уже существует в `ChallengeProgress`, дополнительных миграций не нужно.

### Ничего не осталось незакончено
Все 5 багов исправлены. Миграций нет (схема не менялась). Коммит запушен в `claude/add-challenge-first-badge-c2W4D`.

---

## Что делали в сессии 2026-03-18 (сессия 20)

### Аудит + 1 реальный фикс

**Аудит:** проверили все 5 задач из плана сессии 20:

| Задача | Статус | Комментарий |
|--------|--------|-------------|
| Telegram еда: БЖУ и кнопки качества | ✅ Уже было | `parseFoodEntry()` + `food_q_` callback реализованы в сессии 13 |
| Telegram Вызовы в настройках | ✅ Уже было | `buildSettingsKeyboard` итерирует `TG_BUTTONS` автоматически |
| ChallengesScreen: failed в «Завершённых» | ✅ Исправлено | Реальный баг: API не загружал failed-челленджи |
| Telegram «неделя»/«итоги» | ✅ Уже было | `WEEK_RE` → `__WEEKLY_DIGEST__` → AI weekly digest |
| Миграция `training_data_view` | ✅ Подтверждена | VIEW присутствует в Supabase |

**Изменённые файлы:**
- `src/components/screens/ChallengesScreen.tsx`:
  - `loadChallenges()`: вкладка 'completed' теперь загружает **без** `&status=completed` → API возвращает все статусы
  - `finished = challenges.filter(c => c.status === 'completed' || c.status === 'failed')` — явная фильтрация
  - Добавлен `displayList = filter === 'active' ? active : finished`
  - Рендер и empty-state переключены на `displayList` вместо `challenges`

**Принятые решения:**
- **Фикс без изменения API**: самый минимальный рефакторинг — убираем `status` param из запроса для вкладки 'completed', фильтруем на фронте через `finished`. Не добавляем `status=finished` в API (лишние изменения, где не сломано).
- **`displayList` вместо inline ternary**: выделили в константу для читаемости — используется в трёх местах (рендер, empty-state, счётчик кнопки).

### Ничего не осталось незакончено
Один коммит: `fix: ChallengesScreen — показывать failed-челленджи во вкладке «Завершённые»`, линтер чистый (0 ошибок).

---

## Что делали в сессии 2026-03-18 (сессия 19)

### 5 задач — полная реализация

**Изменённые файлы:**
- `src/app/api/challenges/route.ts`:
  - `GET ?id=XXX` возвращает `trackerDays[]` — последние 7 дней метрики (water, gym, rituals, food, sleep, mood) с полями `{date, value, met}`
  - `calculateChallengeProgress()`: при переходе `active → completed` создаёт `CHALLENGE_FIRST` achievement inline (db.achievement.create, ошибку дупликата игнорирует) + отправляет TG-поздравление через Bot API
- `src/app/api/achievements/check/route.ts`:
  - Добавлен `CHALLENGE_FIRST` в массив `ACHIEVEMENTS` — проверяет `db.challenge.count({ where: { userId, status: 'completed' } }) >= 1`
- `src/app/api/telegram/webhook/route.ts`:
  - `getChallengesSummary()`: добавлены кнопки быстрого старта — `[💪 10 тренировок] [💧 7 дней воды]` + `[🔥 21 день ритуалов]`. Показываются при 0 активных (вместо "нет челленджей") и при < 3 (под списком)
  - Новый callback handler: `challenge_start_{metric}_{target}_{duration}` → парсит metric/target/duration → `db.challenge.create` → подтверждение в чате
- `src/components/screens/ChallengeDetailScreen.tsx`:
  - Интерфейс `TrackerDay` + поле `trackerDays?` в `Challenge`
  - Секция «Последние 7 дней»: горизонтальная строка кружков (зелёный/красный/серый), подпись дня недели, значение метрики, число месяца
  - Кнопка «Завершить досрочно ✓» для статуса `active` (зелёная, с confirm-диалогом)
- `src/components/screens/HomeScreen.tsx`:
  - State `activeChallenges[]` + useEffect: загружает `GET /api/challenges?userId=X&status=active` при монтировании
  - Виджет «Активные челленджи» (до 2 карточек): название + Progress bar + % + серия. Клик → `goals`. Скрывается через `hiddenWidgets['challenges']`
- `src/components/screens/ProfileScreen.tsx`:
  - Добавлен `{ id: 'challenges', label: 'Активные челленджи' }` в список виджетов

### Принятые решения (важно для следующих сессий)

- **TG-уведомление из calculateChallengeProgress**: функция имеет доступ к `process.env.TELEGRAM_BOT_TOKEN` (module-level), не нужен отдельный endpoint. Fetch к Telegram API в try/catch (non-critical).
- **CHALLENGE_FIRST inline vs через POST /api/achievements/check**: выбрали inline db.achievement.create в calculateChallengeProgress — дешевле, без self-referential HTTP. Бейдж через `/check` тоже работает при следующем вызове DailySummaryScreen.
- **trackerDays 7 запросов на деталь**: приемлемо — endpoint вызывается только при открытии экрана, не в списке. Запросы простые (findFirst/count).
- **Кнопки быстрого старта**: формат `challenge_start_{metric}_{target}_{duration}` — парсим по последним двум `_`-разделителям, остаток = metric (у метрик есть underscore: `gym_count`).
- **ALL_ACHIEVEMENT_DEFS в ProfileScreen**: пока не обновлён (задача #1 следующей сессии) — показывает 6/6, CHALLENGE_FIRST не отображается в UI-плитках достижений.

### Ничего не осталось незакончено
Все 5 задач завершены. Линтер чистый (0 ошибок). Коммит запушен в `claude/challenge-detail-screen-2312J`.

---

## Что делали в сессии 2026-03-18 (сессия 18)

### 10 задач — полная реализация

**Часть A — 5 задач из плана сессии 17→18:**

**Изменённые файлы:**
- `src/app/api/telegram/webhook/route.ts`:
  - **✏️ Редактирование упражнения**: кнопка рядом с `➕ Сет` в gym summary, callback `gym_editex_{id}` → ForceReply → `parseNewExercise()` → `gymExercise.update(targetSets, targetReps, weight)`
  - **«неделя» / «итоги»**: `WEEK_RE` + `__WEEKLY_DIGEST__` sentinel → `generateWeeklyDigest()` из shared lib
  - `generateWeeklyDigest` вынесен в `src/lib/ai-weekly-digest.ts` (DRY между webhook и send-weekly-digest)
- `src/components/screens/ProfileScreen.tsx`:
  - Переключатель `transformation` в `WIDGET_CONFIG` — карточка «Как я изменился» управляется через `hiddenWidgets`
  - Загрузка трансформации только если `!hiddenWidgets.includes('transformation')`
- `src/components/screens/StatsScreen.tsx`:
  - Строка «😊 X.X ↑/↓» / «⚡ X.X ↑/↓» в карточке «Итого за N дней» (moodTrend / energyTrend)
- `src/app/api/achievements/check/route.ts`:
  - Фикс GYM_10: `where: { userId }` → `where: { period: { userId } }` (GymWorkout не имеет прямого userId!)

**Новые файлы:**
- `src/lib/ai-weekly-digest.ts` — `generateWeeklyDigest(userId, firstName)`: кеш по ISO-неделе в `ai_logs`, 7 дней данных, Groq промпт, фикс gym query через `period: { userId }`

**Часть Б — Челленджи (фича 2.9):**

**Изменённые файлы:**
- `src/app/api/challenges/route.ts`:
  - Тип `tracker` в `calculateChallengeProgress()` — 6 метрик: `water_streak`, `gym_count`, `ritual_rate`, `no_food_bad`, `sleep_avg`, `mood_avg`
  - Лимит 3 активных в POST: `db.challenge.count` → 400 + `code: 'LIMIT_REACHED'`
- `src/app/api/challenges/ai-generate/route.ts`:
  - Лимит 3 в POST
  - Обновлены `LEAK_TEMPLATES`: 8 типов ликов → tracker (gym_count, sleep_avg, no_food_bad, mood_avg, water_streak), 2 → ritual, 2 → custom
- `src/components/screens/ChallengesScreen.tsx`:
  - `BarChart2` иконка для tracker
  - 9 шаблонов (5 tracker + 2 ritual + 2 custom)
  - `getProgressLabel()` — умные подписи прогресса по метрике
  - `trackerConfig` в форме + `applyTemplate` + `handleCreate` для tracker
  - Нотис «⚠️ лимит 3» + кнопка «Новый» disabled при >= 3
  - Обработка `LIMIT_REACHED` из API (showErrorToast без throw)
- `src/app/api/telegram/webhook/route.ts`:
  - `CHALLENGES_RE` + `getChallengesSummary()` → команды «вызовы»/«челленджи» — список с прогресс-баром

### Принятые решения (важно для следующих сессий)

- **`ai-weekly-digest.ts` shared lib**: оба потребителя (`send-weekly-digest` и `webhook`) импортируют из одного файла. Кеш по ISO-неделе через `ai_logs (callType='weekly_digest')`.
- **GymWorkout.userId не существует**: всегда запрашивать через `period: { userId }`. Это затронуло GYM_10, gymWorkout в weekly-digest и aiCoach — все исправлены.
- **tracker тип без UI-ввода**: tracker-метрика задаётся только через шаблоны/`ai-generate`, не через кастомную форму. Форма поддерживает тип через `trackerConfig`, но не показывает поля ввода метрики.
- **daysCompleted семантика для tracker**: для count-метрик = кол-во (тренировок/дней), для avg-метрик = текущее среднее (с плавающей точкой). `getProgressLabel()` знает это и отображает корректно.
- **LIMIT_REACHED**: API возвращает `{ error, code: 'LIMIT_REACHED' }` при 3+ активных. Фронт показывает error-тост без пробрасывания исключения.

### Ничего не осталось незакончено
Все 10 задач завершены, линтер чистый (0 ошибок), оба коммита запушены в `claude/review-and-plan-nYKwH`.

---

## Что делали в сессии 2026-03-18 (сессия 17)

### 5 задач — полная реализация

**Изменённые файлы:**
- `src/app/api/telegram/webhook/route.ts` — расширения (+350 строк чистого добавления):
  - **+ Упражнение**: кнопка `[➕ Упражнение]` в конце gym summary
  - `gym_addex_{workoutId}` callback → `sendForceReply` с форматами ввода
  - `PendingGymExercise { __type: 'gymExercise', workoutId }` добавлен в `PendingPayload` union
  - ForceReply-обработчик: `parseNewExercise()` → `gymExercise.create(order, targetSets, targetReps, weight)` + `gymExerciseSet.create` если вес указан
  - **Кнопка 🏋️ Тренер**: добавлена в `TG_BUTTONS` (14-я кнопка), `btn_trainer` callback → `sendForceReply`
  - `PendingTrainer { __type: 'trainerQuestion' }` добавлен в `PendingPayload` union
  - ForceReply-обработчик: `runCoach(userId, question)` → ответ
  - **DRY-рефакторинг**: `COACH_SYSTEM` и data-gathering вынесены в shared `runCoach()` — убрано дублирование с `TRAINER_RE` handler
- `src/components/screens/ProfileScreen.tsx`:
  - State `transformation` + `transformationLoading`
  - `useEffect`: при `day >= 30` загружает `/api/ai/transformation`
  - Карточка «✨ Как я изменился» с нарративом, анимированным плейсхолдером, пометкой кеша
- `src/components/screens/StatsScreen.tsx`:
  - Вычисление `moodTrend` и `energyTrend` — первая vs вторая половина `allDays`
  - Стрелки `😊↑0.8` / `⚡↓0.4` в заголовке карточки, порог ≥ 0.3, зелёные/красные

**Новые файлы:**
- `src/app/api/ai/transformation/route.ts` — `GET /api/ai/transformation?userId=`
  - Проверяет `user.day >= 30`, иначе 422 `insufficient_data`
  - Сравнивает первые 30 дней (с `user.createdAt`) vs последние 30 дней
  - Метрики: mood avg, energy avg, gym count, rituals %, calories avg, weight delta
  - `TRANSFORMATION_SYSTEM` промпт — «нарратив 3-5 предложений, конкретные цифры»
  - Кеш 7 дней в `ai_logs (callType='transformation')`
  - Возвращает `{ narrative, cached, createdAt, metrics }` (metrics для будущих графиков)

**Smoke test Weekly Digest (задача 5):**
- `vercel.json`: `"schedule": "0 7 * * 1"` для `/api/telegram/send-weekly-digest` ✅
- `CRON_SECRET` проверяется через `Authorization: Bearer` ✅
- GET + POST оба поддерживаются ✅
- Пользователи без `telegramId` автоматически пропускаются ✅

### Принятые решения (важно для следующих сессий)

- **`runCoach()` как shared функция**: и `TRAINER_RE` в `handleCommand`, и `btn_trainer` ForceReply, и `trainerQuestion` в `reply_to_message` — все вызывают один `runCoach(userId, question)`. Никакого дублирования.
- **`parseNewExercise()` — только имя + NxM + вес**: не пытаемся парсить мышечные группы или заметки. Формат «Жим» / «Жим 4x12» / «Жим 75кг» / «Жим 4x12 75кг». Разделители x/х/X/Х/×/*.
- **`gymExercise.create` без `templateId`**: новые упражнения из TG создаются как свободные (без привязки к шаблону), `order = existingCount + 1`.
- **Первый сет только при наличии веса**: если пользователь ввёл только имя или NxM — упражнение создаётся без сета. Пользователь может добавить сет кнопкой `➕ Сет`.
- **Трансформация 422 без паники**: API возвращает 422 (не 500) при `day < 30` — фронт просто не показывает карточку, без ошибок в консоли.
- **Тренд порог 0.3**: меньше 0.3 пункта разницы между половинами — стрелка не показывается (шум данных).

### Ничего не осталось незакончено
Все 5 задач завершены, линтер чистый (0 ошибок), коммит запушен в `claude/telegram-add-exercise-RCu1y`.

---

## Что делали в сессии 2026-03-18 (сессия 16)

### 5 задач — полная реализация

**Изменённые файлы:**
- `src/app/api/telegram/webhook/route.ts` — крупные расширения (+200 строк):
  - **+ Сет**: кнопки `➕ Сет → {exercise.name}` под каждым упражнением в `getGymSummary()`
  - `gym_addset_{exerciseId}` callback → `sendForceReply` с подсказкой по target reps упражнения
  - `PendingGymSet` тип добавлен в `PendingPayload` union
  - ForceReply-обработчик расширен: проверяет `gymSet` до `forceReply`, парсит `75x8`/`75 8`/`75`, создаёт `GymExerciseSet` с правильным `setNum`
  - **AI Тренер**: `TRAINER_RE = /^(?:\/тренер|тренер)(?:\s+(.+))?$/i`
  - `COACH_SYSTEM` промпт — «отвечай конкретно по числам, не общими фразами»
  - Контекст: 30 дней mood/energy/sleep/gym/rituals/calories + главный лик из `UserAiPattern`
  - Логируется в `ai_logs (callType='tg_coach')`, без кеширования
  - Добавлен в текст помощи: `🏋️ тренер вопрос`
- `src/app/api/stats/history/route.ts`:
  - `totals.avgDayScore` — среднее `overallScore` по активным дням (> 0)
  - `getWeeklySummary` возвращает `isBest: boolean` — неделя с макс. avgScore
- `src/components/screens/StatsScreen.tsx`:
  - `WeeklySummary` и `StatsData` типы расширены (`isBest`, `avgDayScore`)
  - Плитка «Ср. балл» (жёлтая) в карточке «Итого за N дней» — появляется если есть данные
  - Бар лучшей недели жёлтый (`#f59e0b`), остальные зелёные — через `<Cell>`
  - Надпись «🏆 Лучшая неделя — {дата} ({балл} баллов)» под графиком
- `src/components/screens/WeeklyReportScreen.tsx`:
  - `CorrelationPattern` interface добавлен
  - State `aiCorrelations` + `correlationsLoading`, отдельный `useEffect` при mount
  - Карточка «🧬 AI-паттерны (30 дней)» — strength dots (●●●/●●○/●○○) + рекомендации
  - Независима от weekly report loading, не блокирует рендер

**Новые файлы:**
- `src/app/api/ai/correlations/route.ts` — `GET /api/ai/correlations?userId=`
  - Строит per-date snapshot: mood, energy, sleep, gym (да/нет), rituals%, calories, water
  - Контекст ≥ 5 дней, иначе `{ patterns: [] }`
  - Кеш 24 часа в `ai_logs (callType='correlations')`
  - Парсит JSON-массив из ответа Groq, устойчив к markdown-фенсам
  - `CorrelationPattern { pattern, strength: 'strong'|'moderate'|'weak', recommendation }`

**AI Weekly Digest (сессия 16, задача 1):**
- `GET /api/ai/weekly-digest?userId=` — 7 дней контекста → Groq → 3-4 предложения
- Кеш по текущей неделе (ISO week) в `ai_logs (callType='weekly_digest')`
- `GET /api/telegram/send-weekly-digest` — batch-рассылка всем активным юзерам с TG
- Защищён `CRON_SECRET`, пауза 100мс между юзерами
- `vercel.json` дополнен cron `0 7 * * 1`

### Принятые решения (важно для следующих сессий)

- **ForceReply gymSet**: проверяется ДО `forceReply` в handler — приоритет явного типа. `return NextResponse.json({ ok: true })` после сохранения (не `return` без аргумента).
- **Сет-парсинг**: regex `(\d+)\s*[xхXХ×*]\s*(\d+)` — разделитель x/х/X/Х/×/*. Если только вес — reps берём из `targetReps` упражнения или пишем null (не падаем).
- **AI Correlations кеш**: ищем последний успешный `ai_logs` с callType='correlations' за 24ч. При ошибке парсинга кеш игнорируем и регенерируем.
- **`isBest` в weeklySummary**: только если maxScore > 0. Если все недели с нулевым счётом — никакая не помечается.
- **WeeklyReport correlations**: загружаются независимо через отдельный useEffect, не связаны с weekOffset — всегда 30 дней.
- **TRAINER_RE без `почему я` / `что делать с`**: решено не перехватывать эти фразы без явного контекста — слишком много ложных срабатываний в обычной речи.

### Ничего не осталось незакончено
Все 5 задач завершены, линтер чистый (0 ошибок), коммит запушен.

---

## Что делали в сессии 2026-03-18 (сессия 15)

### Стратегический обзор всех фич — пересмотр приоритетов через AI-линзу

**Формат:** аналитическая сессия без кода. Прошли через все фазы FEATURE_MAP.md.

**Ключевые решения, принятые с пользователем:**

1. **3.3 / 3.4 / 3.5 / 3.8 НЕ делать rule-based** — вместо отдельных корреляций «сон→энергия», «зал→настроение», «тайминг еды→потребление» — один AI-запрос с 30 днями данных. AI сам найдёт все значимые паттерны.

2. **4.4–4.6 Тренеры/маркетплейс** — отдельный продукт, не делаем. Вместо живых тренеров — **AI Coach в Telegram**: `/тренер [вопрос]` → AI отвечает на основе реальных данных пользователя.

3. **7.6 Journey** — остаётся скрытым. БД не трогаем. К идее «AI-онбординг через Telegram-диалог» вернуться позже.

4. **5.33–5.35 Метод Харады, McKinsey** — не делать как UI. Если вернуться — только как TG-диалог с AI-ведущим.

5. **5.1 ГИ еды / 5.4 Расчёт жира** — нишевые, дорогие в поддержке. AI в TG отвечает на эти вопросы без отдельной базы.

6. **Telegram-first** — основной вектор развития. Пользователь взаимодействует преимущественно через бота. Web-приложение = аналитика и настройки.

7. **AI-резюме недели** — главная новая фича: каждый понедельник AI синтезирует неделю и шлёт в Telegram. Заменяет «ручной» еженедельный отчёт для большинства пользователей.

8. **2.4 «Как я изменился»** — трансформация: вместо набора графиков → один AI-нарратив: *«За 90 дней: ритуалы выросли с 40% до 73%, срывов в 2 раза меньше»*. Отложено.

**Обновлённый взгляд на статусы:**
- 2.6 Ежедневная полезность → ✅ (это AI Daily Tip)
- 3.1 Еженедельный отчёт → ✅ (WeeklyReport + LeakAiAnalysisCard)
- 6.1 TG AI classifier → ✅ (AI_CLASSIFY_SYSTEM)
- 7.2/7.3 Настройки HomeScreen → ✅
- 7.8 Экспорт + AI промпт → ✅

**Что точно НЕ делаем:**
- Маркетплейс тренеров (4.5–4.6)
- Локальная LLM (6.3) — Groq бесплатен и работает
- Видеокурс (7.7)
- Детальный расчёт жира по БЖУ (5.4)

---

## Что делали в сессии 2026-03-18 (сессия 14)

### Обсуждение фич + реализация трёх пунктов

**Обсуждено (архитектура для следующих сессий):**
- **5.8 Калораж-цель**: вариант А — цель «сбросить X кг к дате», адаптивный дефицит, предупреждения
- **2.9 Челленджи**: личные + шаблоны + Buddy + AI-челленджи против ликов. Отдельный чат.
- **2.6 AI-совет**: генерировать раз в день, кешировать в `ai_logs`, виджет на HomeScreen + Telegram утро
- **7.6 Journey**: скрыть пока криво, база данных не трогать
- **LLM Training**: view `training_data` = `ai_logs` + `user_ai_patterns` с фидбеком (RLHF-ready)

**Реализовано:**

**✅ Ачивменты — 4 недостающих бэкенда**
- `STREAK_7` (streak >= 7), `STREAK_30` (streak >= 30)
- `GYM_10` (10+ completed gym_workouts)
- `WATER_WEEK` (7 дней подряд water >= waterTarget)
- Файл: `src/app/api/achievements/check/route.ts`

**✅ Journey — скрыт из UI**
- Убраны: прогресс-бар курса, карточка урока, следующие уроки из HomeScreen
- Убраны: состояния lesson/upcomingLessons/lessonCompleted, loadLesson useEffect, handleCompleteLesson
- Удалены: `BookOpen`, `Play` иконки (не используются)
- Убран импорт JourneyScreen из page.tsx, из MAIN_SCREENS
- БД (journey_lessons, journey_progress) не тронута — вернём позже

**✅ 5.8 CalorieGoalScreen — адаптивный калораж**
- `GET /api/calorie-goal?userId` — возвращает цель + адаптивный дневной таргет + 7-дневный прогресс + прогноз
- `PATCH /api/calorie-goal` — устанавливает/очищает цель (targetWeight + deadline → weightDeadline, weightStart)
- Использует существующие поля: `UserProfile.targetWeight`, `weightDeadline`, `weightStart`, `weightStartAt`
- TDEE: Harris-Benedict × multiplier по workProfile
- Адаптация: каждый день пересчитывает дефицит по (currentWeight - targetWeight) / daysLeft
- Предупреждения: > 1000 ккал/день дефицит = агрессивно, > 1100 = нереалистично
- `CalorieGoalScreen.tsx` — полный экран: прогресс к цели, дневной таргет, 7-дневные бары, прогноз
- Вход: ProfileScreen → кнопка «🎯 Цель по калоражу»
- 'calorie-goal' добавлен в Screen type

**✅ 2.6 AI Daily Tip — персональный совет дня**
- `GET /api/ai/daily-tip?userId` — кеш в `ai_logs` (callType='daily_tip'), если нет — генерирует через Groq
- `POST /api/ai/daily-tip` — batch-генерация для всех активных юзеров (cron-ready)
- Контекст: стрик, настроение/энергия, калории, вода, ритуалы, тренировки, leak-профиль, цель по весу
- HomeScreen: виджет «🧠 Совет дня» (фиолетовый, скрывается через `hiddenWidgets['daily_tip']`)
- ProfileScreen: переключатель «Совет дня (AI)» в виджетах
- Telegram: утреннее уведомление включает совет как `<i>...</i>` (кешируется, не регенерирует)
- Все вызовы автоматически попадают в `ai_logs` → `training_data` view

**✅ LLM Training Data**
- `prisma/migrations/20260318_training_data_view.sql` — CREATE VIEW training_data
- Джойнит `ai_logs` + `user_ai_patterns`: input_context → model_output + positive_feedback
- `training_quality`: 'positive' (есть whatWorked), 'neutral' (нет фидбека), 'daily_tip'
- Исключает: системные вызовы без userId, tg_classify, telegram-classify
- ⚠️ Применить вручную в Supabase SQL Editor

### Принятые решения (важно для следующих сессий)
- **Daily tip кеширование**: в `ai_logs` (callType='daily_tip'). Утренний Telegram notify проверяет кеш — не перегенерирует
- **CalorieGoalScreen**: адаптация через (currentWeight - targetWeight) / daysLeft — пересчёт каждый день автоматически
- **Journey**: `'journey'` остаётся в Screen type (не удаляем), просто нет UI-входа
- **training_data view**: RLHF-ready. При экспорте фильтровать `training_quality = 'positive'` для fine-tuning

### Ручные шаги (нужно выполнить)
- ⚠️ Применить `prisma/migrations/20260318_training_data_view.sql` в Supabase SQL Editor

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
| `0 7 * * 1` | 07:00 пн | 10:00 пн | **AI Weekly Digest** — рассылка в Telegram |
| `0 8 * * *` | 08:00 | 11:00 | Supplement reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |

## Что делали в сессии 2026-03-18 (сессия 12)

### 7 задач за одну сессию — полная реализация

**Изменённые файлы:**
- `prisma/schema.prisma` — добавлен `supplementReminders Boolean @default(true) @map("supplement_reminders")`
- `prisma/migrations/20260317_supplement_reminders.sql` — миграция применена пользователем вручную
- `src/app/api/notifications/send-supplement-reminder/route.ts` — фильтр `supplementReminders: true` (вместо `ritualReminders`)
- `src/components/screens/SettingsScreen.tsx` — новый Switch «Напоминание о БАДах» в разделе уведомлений
- `src/components/screens/StatsScreen.tsx` — период 7/14/30/90д: тип `7|14|30|90`, кнопки `Xд`, `chartDays` (max 30 точек), динамические заголовки графиков
- `src/components/screens/DailySummaryScreen.tsx`:
  - Кнопка Share2 рядом со скором: формирует `📊 Мой день: 83/100 — Отличный! 💧95% 🍽️1800ккал ✅4/5 ритуалов` → clipboard
  - Вызов `POST /api/achievements/check` после загрузки сводки за сегодня
  - Popup «🌟 Новое достижение!» при получении нового бейджа, кнопка «Отлично!»
- `src/app/api/telegram/webhook/route.ts` — крупный рефактор (+300 строк):
  - ForceReply для btn_sleep/weight/mood/energy: pending хранится в `Note (zone=__tg_pending)`
  - `message.reply_to_message` → lookup pending → парсим число → сохраняем в БД
  - Кнопка `🔍 Лики` → `getLeaksSummary()`: список UserAiPattern с urgency, причиной (80 символов), топ-решением
  - AI-классификация неизвестных сообщений: `callAI(AI_CLASSIFY_SYSTEM, text)` → JSON {type, data, display, confidence ≥ 0.6}
  - Confirmation keyboard `✅/❌` → при подтверждении `executeClassifiedAction()` + `saveLearnedPattern()`
  - Паттерны per-user: regex в `UserAiPattern[leakType='tg_input_patterns'].lastAnalysis[]`, max 50 записей

**Новые файлы:**
- `src/app/api/achievements/check/route.ts` — POST: calcDayScore(), проверка GREAT_DAY_FIRST + QUALITY_WEEK, создание Achievement. GET: список всех ачивментов пользователя

**Баги исправлены:**
- `Note.create` в handleCommand (зал): было `title`/`content` → исправлено на `text` (поле в схеме)

### Принятые решения (важно для следующих сессий)

- **Pending ForceReply**: хранится в `Note` с `zone='__tg_pending'` (один на пользователя, deleteMany перед записью). FleetingThought создаётся параллельно для автоочистки по TTL. Выбор Note вместо FleetingThought — у Note нет required поля TTL при создании.
- **AI-классификация**: confidence ≥ 0.6 → показываем подтверждение. Ниже — стандартный «не понял» с подсказками.
- **Паттерны**: regex строится из оригинального текста заменой чисел на `\d+(?:[.,]\d+)?`. Хранятся в `UserAiPattern` с `leakType='tg_input_patterns'` — не нужна новая таблица.
- **StatsScreen charts**: при 90 днях `chartDays = allDays.slice(-30)` (последние 30) — иначе графики нечитаемы на мобиле. `last7Days` и `last14Days` оставлены как константы но не используются в чартах.
- **calcDayScore на сервере**: скопирована формула из DailySummaryScreen (rituals 25%, water 20%, mood 20%, energy 15%, morning 10%, evening 10%). Нет смысла выносить в shared lib — используется только в одном endpoint.

### Ручные шаги (выполнены пользователем)
- ✅ Миграция `supplement_reminders` применена в Supabase SQL Editor

---

## Что делали в сессии 2026-03-18 (сессия 13)

### Достижения в ProfileScreen + баги Telegram + расширенный парсер еды

**Новые файлы:**
- `src/app/api/ai/patterns/route.ts` — `GET /api/ai/patterns?userId=...` возвращает все `UserAiPattern` пользователя (leakType, analysisCount, whatWorked, updatedAt). Используется секцией «История AI-анализов» в ProfileScreen.

**Изменённые файлы:**
- `src/components/screens/ProfileScreen.tsx`:
  - Карточка «Достижения»: 6 плиток (2 реальных + 4 мотивирующих locked), серые+grayscale если не получены, дата получения если получены. Счётчик X/6.
  - Секция «История AI-анализов»: загружает `/api/ai/patterns`, показывает тип лика → имя, кол-во анализов, кол-во сработавших решений, дату. Скрывает `tg_input_patterns`.
  - Новые state: `achievements`, `aiPatterns`
  - Новые константы: `ALL_ACHIEVEMENT_DEFS[]`, `LEAK_TYPE_LABELS_PROFILE`
- `src/app/api/telegram/webhook/route.ts` — 4 крупных изменения:
  1. **Дедупликация update_id**: Note(zone=`__tg_dedup`) — при повторном webhook (Telegram retry) возвращаем 200 без обработки
  2. **Исправлен storePending**: удалено создание FleetingThought (было видно в приложении как JSON-строка)
  3. **Команда `ачивменты`** + кнопка 🏅 в TG_BUTTONS + `getAchievementsSummary()`: список с датами или подсказка как получить первые
  4. **parseFoodEntry()** — полный парсер еды с поддержкой вес+ккал/100г+БЖУ (см. ниже)
  5. **AI_CLASSIFY_SYSTEM расширен**: примеры для разговорных форм (скушал, выпил кофе, побегал, поплавал, заплатил)

**Баги исправлены:**
- **Бесконечный цикл в боте** («похоже хочешь записать» × ∞): Telegram повторяет webhook при таймауте. Фикс: дедупликация по `update_id` через Note.
- **JSON в мимолётных мыслях**: `storePending()` создавал FleetingThought с `JSON.stringify(payload)`, который был виден в приложении. Убрали.

### parseFoodEntry() — детали реализации

Функция пошагово снимает данные с конца строки:
1. **БЖУ**: 3 числа ≤ 100 в конце → per-100g значения; пересчитываются на порцию через `divisor = weight / 100`
2. **Ккал**: последнее число (опц. суффикс `ккал/кал/cal`)
3. **Вес**: число + единица измерения
   - Метрические (г/гр/кг/мл/л) → ккал трактуются как `/100г` → `actual = weight * kcal / 100`
   - Счётные (кусок/порция/шт/ложка/стакан) → ккал итоговые
   - Без единицы (Variant B) → два числа = граммы + ккал/100г
4. **Название**: всё оставшееся

Форматы:
```
ел пицца 800              → Пицца, 800 ккал (старый формат ✅)
ел доширак 70 440         → Доширак (70г), 308 ккал
ел доширак 70 440 17 8 54 → + Б11.9 · Ж5.6 · У37.8г
ел молоко 300мл 64        → Молоко (300мл), 192 ккал
ел курица 2 куска 440     → Курица (2куска), 440 ккал (итого)
еда гречка 200 320 12 3 65→ Гречка (200г), 640 ккал + БЖУ
```

### Принятые решения (важно для следующих сессий)

- **update_id dedup**: `Note(zone='__tg_dedup')` с текстом `tg_upd_{update_id}`. При каждом новом update удаляем все старые dedup-ноты (чтобы не накапливались). Проверка до обработки, после нахождения userId.
- **storePending без FleetingThought**: `zone='__tg_pending'` в Note достаточно. FleetingThought создавался «для автоочистки», но загрязнял приложение JSON.
- **Вариант B для еды**: 1 число = общие ккал (обратная совместимость), 2 числа = вес+ккал/100г. Метрические единицы с явным суффиксом тоже работают.
- **БЖУ-проверка ≤ 100**: валидируем что все 3 числа ≤ 100 прежде чем трактовать как per-100g. Защита от ошибочного парсинга.
- **ALL_ACHIEVEMENT_DEFS в ProfileScreen**: 6 плиток хардкодом. Locked-плитки (STREAK_7, STREAK_30, WATER_WEEK, GYM_10) пока не выдаются бэкендом — это задача #1 следующей сессии.
- **`/api/ai/patterns` отдельный endpoint**: в отличие от `/api/ai/recommendations` (который возвращает только свежий за 7 дней для виджета), этот отдаёт всю историю для ProfileScreen.

### Ничего не осталось незакончено
Все 4 коммита сессии запушены. Миграций не требуется (схема не менялась).

---

## Telegram webhook — активация (разовая)

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d url=https://<vercel-domain>/api/telegram/webhook \
  -d secret_token=<TELEGRAM_WEBHOOK_SECRET>
```
ENV Vercel: добавить `TELEGRAM_WEBHOOK_SECRET` (любая строка ≥ 16 символов).
