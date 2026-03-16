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

# Текущее состояние (2026-03-16 — рефакторинг)

## Последняя выполненная задача — ПОЛНЫЙ РЕФАКТОРИНГ (2026-03-16)

### ✅ Выполнено за сессию:

| # | Задача | Файлы |
|---|--------|-------|
| 1 | Lessons API — контент для дней 11–30 | `src/app/api/lessons/route.ts` |
| 2 | AllRitualsScreen — полная реализация вместо заглушки | `src/components/screens/AllRitualsScreen.tsx` |
| 3 | Habits — Edit UI + PATCH API | `src/components/screens/HabitsScreen.tsx`, `src/app/api/habits/route.ts` |
| 4 | Rituals — Edit UI (PATCH API уже был) | `src/components/screens/RitualsScreen.tsx` |
| 5 | GymScreen — вынести типы в features/gym | `src/features/gym/types.ts`, `src/features/gym/index.ts` |
| 6 | Удалены неиспользуемые Supabase клиенты | `supabase-browser.ts`, `supabase-server.ts` удалены |
| 7 | TopNav — добавлены отсутствующие Screen titles | `src/components/TopNav.tsx` |
| 8 | Zod валидация — habits + tasks API | `src/app/api/habits/route.ts`, `src/app/api/tasks/route.ts` |
| 9 | Обновлена документация | `docs/CURRENT_STATE.md`, `docs/NEXT_SESSION.md` |

### Ветка: `claude/code-review-cV4rg` (все изменения запушены)

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

**Приоритет 1:** Проработать алгоритм Leak Engine
- Какие метрики анализируем (привычки, ритуалы, здоровье, финансы, тренировки)
- Как определяем "лик" (порог, частота, тренд)
- Формат отчёта

**Приоритет 2:** Weekly/Monthly Report экран
- Новый экран с ликами и советами

**Приоритет 3:** Buddy Matching алгоритм и обновление BuddyScreen

**Технический долг (оставшийся):**
- GymScreen (4054 строк) — всё ещё монолит, безопасный сплит требует Context/Hook
- Pre-existing TypeScript ошибки в journey/route.ts и gym/exercises routes (не критично)
- Skeleton loading в ProfileScreen (данные загружаются с дефолтами, работает)

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
