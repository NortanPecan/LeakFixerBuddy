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

# Текущее состояние (2026-03-16 — мажорный релиз)

## Последняя выполненная задача — БАГФИКСЫ + НОВЫЕ ФИЧИ (2026-03-16)

### ✅ Выполнено за сессию:

| # | Задача | Файлы |
|---|--------|-------|
| 1 | **КРИТИЧЕСКИЙ**: Исправлен timezone баг `parseDateKey` (UTC vs local) — еда/задачи на неверной дате | `src/lib/date-utils.ts` |
| 2 | Ритуалы — постоянное удаление (permanent delete) в UI | `src/components/screens/RitualsScreen.tsx`, `src/app/api/rituals/route.ts` |
| 3 | Notes — фикс двойного сабмита при создании ритуала | `src/components/screens/NotesScreen.tsx` |
| 4 | Finance — перевод между счетами + обмен валюты | `src/components/screens/FinanceScreen.tsx` |
| 5 | Кастомная нижняя навигация (1–6 модулей, 14 вариантов) | `src/components/BottomNav.tsx`, `src/lib/store.ts` |
| 6 | Settings экран (Profile → Навигация) | `src/components/screens/SettingsScreen.tsx` |
| 7 | QuickEntryFAB — плавающая кнопка быстрого ввода (вес, еда, заметка) | `src/components/QuickEntryFAB.tsx` |
| 8 | Buddy — полный дашборд партнёра + рекомендации | `src/components/screens/BuddyScreen.tsx`, `src/app/api/buddies/dashboard/route.ts` |
| 9 | Удалены мёртвые SQL-файлы (migration-supabase.sql, fix-missing-columns.sql, supabase/migrations/*.sql) | - |
| 10 | 0 TypeScript ошибок, 0 lint ошибок | - |

### Ветка: `claude/code-review-cV4rg` (все изменения запушены, commit `f514be2`)

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

**Приоритет 1:** Leak Engine — анализ слабых мест
- Алгоритм анализа всех метрик за неделю/месяц
- Выявление "ликов" из данных: ритуалы, привычки, здоровье, финансы, тренировки
- Weekly/Monthly Report экран с ликами и советами

**Приоритет 2:** Дополнительные баги из исходного списка (не сделаны):
- Challenges: баг ввода числа (поле не очищается) — проверить
- Zones: полноценный add/edit/delete UI

**Приоритет 3:** Buddy Matching алгоритм по похожим ликам

**Технический долг (оставшийся):**
- GymScreen (4000+ строк) — монолит, требует Context/Hook для безопасного сплита
- Добавить Privacy Settings в Buddy — настроить что именно видит бадди
- Finance: добавить категории в форму транзакции (частично — select уже есть)

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
