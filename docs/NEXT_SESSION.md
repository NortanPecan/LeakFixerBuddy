# Next Session Prompt

Скопируй этот промпт в начало каждого нового чата:

---

## 🚀 START PROMPT (copy this)

```
Работаем над проектом LeakFixerBuddy.

ПУТЬ К ПРОЕКТУ: /home/user/LeakFixerBuddy

ОБЯЗАТЕЛЬНО прочитай перед работой:
1. docs/NEXT_SESSION.md — текущее состояние
2. docs/AGENT_INSTRUCTIONS.md — правила
3. worklog.md — последние шаги

КРИТИЧЕСКИ:
- ВЕТКА: только main (не master!)
- БД: ТОЛЬКО Supabase PostgreSQL (локальной БД нет!)
- Git: Не делаю команды сам
- Push: разрешён без force

ВСЕ 24 БАГА ИСПРАВЛЕНЫ ✅ — новых багов нет.

ТЕКУЩИЙ ФОКУС: Новая концепция — социальная сеть для саморазвития.
Читай раздел "Следующие задачи" ниже.

Подтверди, что прочитал файлы.
```

---

# Текущее состояние (2026-03-17 — Leak Engine + аналитика)

## Последняя выполненная задача — LEAK ENGINE + АНАЛИТИКА (2026-03-17)

### ✅ Выполнено за сессию (автономная работа 2 часа):

| # | Задача | Файлы |
|---|--------|-------|
| 1 | Checkin data (morning energy, evening rating) в stats/history API и графики | `src/app/api/stats/history/route.ts`, `StatsScreen.tsx` |
| 2 | **Monthly Report** — API + экран + HomeScreen shortcut + QuickSearch | `src/app/api/monthly-report/route.ts`, `MonthlyReportScreen.tsx` |
| 3 | Monthly/weekly отчёты в ProfileScreen QuickAccess | `src/features/profile/constants.ts`, `QuickAccess.tsx` |
| 4 | Buddy comparison — side-by-side метрики в dashboard | `BuddyScreen.tsx`, `src/app/api/buddies/dashboard/route.ts` |
| 5 | Badge на HomeScreen weekly report card (кол-во ликов) | `HomeScreen.tsx` |
| 6 | Level-up toast в SkillsScreen при получении XP | `SkillsScreen.tsx` |
| 7 | Leak Engine section в Export для AI-анализа | `src/app/api/export/route.ts`, `ExportScreen.tsx` |
| 8 | `monthly-report` добавлен в Screen type, убраны `as Screen` касты | `src/lib/store.ts` |
| 9 | 7-day heatmap на каждой карточке привычки | `HabitsScreen.tsx`, `src/app/api/habits/route.ts` |
| 10 | Прогноз трат (daily avg + projection) в Finance | `FinanceScreen.tsx`, `src/app/api/finance/route.ts` |
| 11 | Оптимизация Buddy Dashboard: 14 запросов → 4 параллельных | `src/app/api/buddies/dashboard/route.ts` |
| 12 | **Buddy Matching** — категориальное пересечение ритуалов (+1/+2 pts) | `src/app/api/buddies/suggest/route.ts` |
| 13 | **Today's Focus** widget — топовый лик как карточка на HomeScreen | `HomeScreen.tsx` |
| 14 | **Week-over-week** comparison в WeeklyReportScreen | `WeeklyReportScreen.tsx` |
| 15 | **Settings** — toggles для notification/zone settings из API | `SettingsScreen.tsx` |
| 16 | QuickSearch — добавлены 8 отсутствующих экранов | `QuickSearch.tsx` |
| 17 | ProfileScreen QuickAccess — buddies, challenges, settings | `constants.ts`, `QuickAccess.tsx` |
| 18 | 2 новых паттерна в Leak Engine: weekend drop + high spend days | `src/app/api/weekly-report/route.ts` |

### Ветка: `claude/code-review-cV4rg` (commit `cd9ebd7`)

## Новая концепция (обсуждено в сессии 2026-03-16)

Пользователь хочет развить приложение в **социальную сеть для саморазвития** с фокусом на:

### 1. Leak Engine (система ликов)
- Алгоритм анализа всех метрик за неделю/месяц
- Выявление слабых мест ("ликов") из данных пользователя
- Рекомендации "как исправить" каждый лик
- Еженедельный и ежемесячный отчёт с ликами

### 2. Smart Buddy Matching
- Сейчас: базовая модель `Buddy` в БД есть, экран `BuddyScreen` есть
- Нужно: матчинг по похожим ликам (алгоритм сходства)
- Закрепление за ОДНИМ бадди (не несколько)
- Совместный прогресс в исправлении ликов

### 3. Социальная часть
- Сравнение метрик с бадди
- Совместный дашборд двух пользователей
- Простой интерфейс (не перегружать)

## Следующие задачи

**Приоритет 1:** ✅ DONE — Leak Engine (weekly + monthly reports с 11 паттернами)

**Приоритет 2:** ✅ DONE — Challenges bug (форма сбрасывается через `onOpenChange`), Zones (ZonesScreen)

**Приоритет 3:** ✅ DONE — Buddy Matching с категориями ритуалов (частичная реализация)

**Следующие задачи (новые):**

1. **Push-notifications** через Telegram Bot API — отправлять напоминания о ритуалах/привычках когда пользователь не открывает приложение
2. **Streak protection** — защита стрика 1 раз в неделю (требует `streakShield` поле в БД + миграция)
3. **GymScreen split** — разбить на 8 компонентов (Context/Hook паттерн)
4. **Privacy Settings для Buddy** — настроить что видит бадди (требует миграция: новые поля в UserSettings)
5. **Buddy Matching v2** — найти пользователей с похожими ЛИКАМИ (не только категориями), требует вычисление leak-profile per user

**Технический долг (оставшийся):**
- GymScreen (4000+ строк) — монолит, требует Context/Hook для безопасного сплита
- Finance: monthly budget goals (цели по каждой категории на месяц)

---

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | main (master — историческая, не трогать) |
| **Git** | Не делаю команды сам, только предлагаю |
| **Env** | NEXT_PUBLIC_SUPABASE_URL, DATABASE_URL, DIRECT_DATABASE_URL |
| **API** | 66 endpoints в src/app/api/ |
| **Push** | Разрешён без force после согласования |

## Структура проекта

```
src/
├── app/api/          # 66 API endpoints (Prisma → Supabase)
├── components/
│   ├── screens/      # Основные экраны
│   └── ui/           # shadcn/ui компоненты
├── lib/
│   ├── db.ts         # Prisma client
│   ├── store.ts      # Zustand store
│   └── supabase*.ts  # supabase.ts, supabaseClient.ts, supabase-rest.ts, auth-telegram.ts, db.ts
└── prisma/
    └── schema.prisma # PostgreSQL only
```

## Переменные окружения (обязательные)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres"
DIRECT_DATABASE_URL="postgresql://...supabase.co:5432/postgres"
```

---

## Как обновлять этот файл

После каждой задачи обновляй:
1. **Последняя выполненная задача** — что сделано
2. **Незавершённые задачи** — отметить [x] выполненные
3. **Дата** — обновить дату в заголовке
