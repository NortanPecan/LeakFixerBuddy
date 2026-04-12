# LeakFixerBuddy — Agent Context

## Проект
Telegram Mini App для саморазвития — привычки, фитнес, здоровье, финансы, AI-анализ ликов.
Живёт на https://leak-fixer-buddy.vercel.app/

## Владелец
Женя (NortanPecan). Продуктовое видение + идеи. Код не пишет сам — всё через AI.
Предпочитает: агент делает сам, показывает результат. Минимум вопросов.

## Стек
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Prisma ORM + Supabase PostgreSQL
- Zustand (state), shadcn/ui (components)
- AI: Groq (primary) + Gemini (fallback)
- Telegram Bot API (webhook)
- Деплой: Vercel

## Правила
- Язык UI: русский
- lint: `bun run lint` перед коммитом (0 ошибок)
- БД: только Supabase PostgreSQL через Prisma
- Миграции: вручную в Supabase SQL Editor, файл в prisma/migrations/
- Ветка: main (feature branches для больших изменений)
- Не пушить в main без разрешения

## Текущий фокус
- Leaks модуль — основное продуктовое ядро
- Telegram-first подход для новых AI фич
- AI Coach, AI-резюме недели — следующие задачи

## Ключевые директории
- src/app/api/ — ~90 API endpoints
- src/components/screens/ — экраны приложения
- src/components/screens/LeaksScreen.tsx — leaks модуль (7300+ строк)
- src/lib/ — утилиты, AI, store
- src/features/gym/ — gym feature module
- docs/ — документация и роадмапы

## Команды
```bash
bun install
bun run lint
bun run build
bun run db:generate
npm run check:encoding
npm run check:prepush
```

## ENV
DATABASE_URL, DIRECT_DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, CRON_SECRET, GROQ_API_KEY, GEMINI_API_KEY
