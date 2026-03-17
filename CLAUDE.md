# LeakFixer Buddy — Claude Instructions

## Проект
Self-improvement social network. Next.js 14 App Router + TypeScript + Prisma + Supabase PostgreSQL.

## КРИТИЧЕСКИЕ правила
- **ВЕТКА**: только `claude/code-review-cV4rg` (никогда не пушить в main без разрешения)
- **БД**: только Supabase PostgreSQL через Prisma ORM (локальной БД нет!)
- **Язык UI**: русский
- **Lint**: перед каждым коммитом — `bun run lint`

## Путь к проекту
`/home/user/LeakFixerBuddy`

## Обязательно читать перед работой
1. `docs/NEXT_SESSION.md` — текущий статус и задачи
2. `docs/FEATURE_MAP.md` — полная карта фич
3. `worklog.md` — последние шаги (если есть)

## Структура
```
src/
├── app/api/          # ~70 API endpoints (Prisma → Supabase)
├── components/screens/ # Основные экраны
├── features/         # Фичи (gym, profile)
├── lib/
│   ├── db.ts         # Prisma client
│   ├── store.ts      # Zustand (Screen type здесь)
│   └── network-utils.ts # showSuccessToast, showErrorToast
└── prisma/schema.prisma
```

## Стек
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Zustand (state), Prisma ORM, Supabase PostgreSQL
- shadcn/ui компоненты
- React.lazy + Suspense (code splitting)

## Команды
```bash
bun run lint      # проверка линтера (0 ошибок!)
bun run build     # сборка
bun prisma generate  # после изменений schema.prisma
```

## ENV переменные
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL (pooler :6543)
DIRECT_DATABASE_URL (:5432)
TELEGRAM_BOT_TOKEN
```

## Текущий фокус (март 2026)
Социальная сеть саморазвития. Leak Engine реализован (weekly + monthly reports).
Следующие задачи — см. `docs/NEXT_SESSION.md`.

## Важно для миграций
Миграции применяются вручную через Supabase SQL Editor.
Файл миграции кладём в `prisma/migrations/`.
