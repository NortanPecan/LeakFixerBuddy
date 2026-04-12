# LeakFixer Buddy 🚀

**Telegram Mini App для саморазвития** — привычки, фитнес, здоровье, финансы, развитие.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-green)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)
![CI](https://github.com/NortanPecan/LeakFixerBuddy/actions/workflows/ci.yml/badge.svg)

> 📱 **Продакшен**: [leak-fixer-buddy.vercel.app](https://leak-fixer-buddy.vercel.app/)
> 📖 **Настройка Telegram**: [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

---

## 📋 Содержание

- [Быстрый старт](#-быстрый-старт)
- [Переменные окружения](#-переменные-окружения)
- [Скрипты](#-скрипты)
- [Архитектура](#-архитектура)
- [Тестирование](#-тестирование)
- [Docker](#-docker)
- [CI/CD](#-cicd)
- [База данных](#-база-данных)
- [Архитектура авторизации](#-архитектура-авторизации)
- [Telegram Mini App](#-telegram-mini-app)
- [Модули приложения](#-модули-приложения)
- [Структура проекта](#-структура-проекта)

---

## 🚀 Быстрый старт

```bash
git clone https://github.com/NortanPecan/LeakFixerBuddy.git
cd LeakFixerBuddy
cp .env.example .env.local   # заполнить переменные
bun install
bun run db:generate
bun run dev
```

Откройте http://localhost:3000 — автоматически создастся demo-пользователь.

---

## 🔑 Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните значения.

### Обязательные

| Переменная | Описание |
|-----------|----------|
| `DATABASE_URL` | Supabase pooler (port 6543) |
| `DIRECT_DATABASE_URL` | Supabase direct (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon-ключ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role ключ Supabase |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `AUTH_SESSION_SECRET` | Секрет сессии (≥ 32 символа) |

### AI-провайдеры

| Переменная | Описание |
|-----------|----------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — первичный провайдер |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) — fallback |

### Безопасность и мониторинг

| Переменная | Описание |
|-----------|----------|
| `CRON_SECRET` | Bearer-токен для защиты cron endpoints |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет для Telegram webhook (≥ 16 символов) |
| `UPSTASH_REDIS_REST_URL` | Redis URL для rate limiting ([upstash.com](https://upstash.com)) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token |
| `SENTRY_DSN` | DSN проекта Sentry для error tracking |
| `SENTRY_ORG` | Slug организации в Sentry (для source maps) |
| `SENTRY_PROJECT` | Slug проекта в Sentry |
| `SENTRY_AUTH_TOKEN` | Auth token для загрузки source maps |

---

## 🔧 Скрипты

```bash
# Разработка
bun run dev               # Dev-сервер (http://localhost:3000)
bun run build             # Production build
bun run lint              # ESLint (0 ошибок!)
bun run format            # Prettier форматирование
bun run format:check      # Проверка форматирования (CI)

# База данных
bun run db:generate       # Генерация Prisma клиента
bun run db:push           # Применить схему к БД
bun run db:studio         # Prisma Studio

# Тесты
bun run test              # Vitest (watch mode)
bun run test:coverage     # Покрытие (lcov + html)
bun run test:ui           # Vitest UI

# Проверки
npm run check:encoding    # Кодировка файлов
npm run check:prepush     # Полная проверка перед push
```

---

## 🏗️ Архитектура

### API Handler Factory

Все API-роуты используют единый `apiHandler` из `src/lib/api-handler.ts`:

```typescript
import { apiHandler, RATE_LIMITS, NotFoundError } from "@/lib/api-handler";

export const GET = apiHandler(
  async ({ session }) => {
    const user = await db.appUser.findUnique({ where: { id: session.userId } });
    if (!user) throw new NotFoundError("Пользователь не найден");
    return user;
  },
  { auth: "self", rateLimit: RATE_LIMITS.API }
);
```

Фабрика автоматически:
- Проверяет rate limit (Upstash Redis / in-memory fallback)
- Валидирует авторизацию (`false` | `'any'` | `'self'`)
- Маппит ошибки Prisma (P2002 → 409, P2025 → 404)
- Отправляет исключения в Sentry
- Возвращает стандартный `ApiSuccess<T>` ответ

### Типизированные ошибки

```typescript
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";

throw new ValidationError("Некорректный email");    // 400
throw new NotFoundError("Запись не найдена");        // 404
throw new ConflictError("Уже существует");           // 409
```

### Rate Limiting

`src/lib/rate-limit.ts` — централизованный rate limiting с пресетами:

| Пресет | Лимит | Окно |
|--------|-------|------|
| `RATE_LIMITS.AI` | 10 запросов | 60 сек |
| `RATE_LIMITS.API` | 60 запросов | 60 сек |
| `RATE_LIMITS.AUTH` | 5 запросов | 60 сек |
| `RATE_LIMITS.TELEGRAM` | 30 запросов | 60 сек |
| `RATE_LIMITS.CRON` | 10 запросов | 10 сек |

При недоступности Upstash Redis автоматически переключается на in-memory fallback (без перезапуска).

### Мониторинг (Sentry)

Sentry подключается только при наличии `SENTRY_DSN`. Конфиги:
- `sentry.client.config.ts` — браузер, 10% трейсов в prod, Session Replay
- `sentry.server.config.ts` — Node.js, strip чувствительных полей (password/token/key)
- `sentry.edge.config.ts` — Edge runtime

---

## 🧪 Тестирование

```bash
bun run test:coverage
```

### Структура тестов

```
src/lib/__tests__/
├── errors.test.ts        # 34 теста — все классы ошибок
├── rate-limit.test.ts    # 23 теста — пресеты, getIdentifier, in-memory
├── api-handler.test.ts   # 25 тестов — auth, error mapping, rate limit
├── mood-utils.test.ts    # 15 тестов — все уровни настроения
└── date-utils.test.ts    # 33 теста — все date-утилиты
src/test/
└── setup.ts              # jest-dom matchers
```

### Покрытие (пороги)

| Модуль | Lines | Functions |
|--------|-------|-----------|
| `src/lib/errors.ts` | ≥ 90% | ≥ 90% |
| `src/lib/rate-limit.ts` | ≥ 70% | ≥ 70% |
| `src/lib/api-handler.ts` | ≥ 70% | ≥ 70% |

Отчёт покрытия: `coverage/index.html`

---

## 🐳 Docker

```bash
cp .env.example .env.local   # заполнить секреты
docker compose up --build
```

Приложение будет доступно на http://localhost:3000.

### Детали образа

- 3-stage multi-stage build (deps → builder → runner)
- Финальный образ: `node:22-alpine` + standalone Next.js output
- Нет `node_modules` в runtime — только `.next/standalone`
- Non-root пользователь `nextjs:nodejs` (uid 1001)
- HEALTHCHECK через `/api/health`
- Лимиты: 1 CPU, 512 MB RAM

```bash
# Только собрать образ
docker build -t leakfixer-buddy:local .

# Проверить healthcheck
docker inspect leakfixer-buddy | jq '.[0].State.Health'
```

---

## ⚙️ CI/CD

GitHub Actions запускается на каждый push и pull request.

### Пайплайн

```
lint ──────────────────────────────────┐
                                       ├──► build
test (Vitest + coverage + Codecov) ───┘
```

**lint job:** ESLint (0 предупреждений) + Prettier check + encoding check

**test job:** Vitest с покрытием, загрузка в [Codecov](https://codecov.io)

**build job** (после lint+test): `tsc --noEmit` + `next build`

Деплой в Vercel обрабатывается Vercel GitHub-интеграцией — не через CI.

### Ветки

CI запускается для: `main`, `claude/**`, `feat/**`, `fix/**`

---

## 🗄️ База данных

**Проект использует ТОЛЬКО Supabase PostgreSQL.** Локальной БД нет.

### Миграции

Миграции применяются вручную через Supabase SQL Editor:

```bash
# Файлы миграций
prisma/migrations/
├── 20260317_gym_period_schedule.sql
├── 20260317_hidden_widgets.sql
├── 20260317_user_ai_patterns.sql
├── 20260317_ai_logs.sql
└── ...
```

После изменения `prisma/schema.prisma`:
```bash
bun run db:generate   # регенерировать Prisma клиент
```

---

## 🔐 Архитектура авторизации

### Telegram Mini App

```
Telegram Client → initData → /api/auth → Валидация HMAC → AppUser
```

1. Пользователь открывает Mini App в Telegram
2. Telegram передаёт `initData` с HMAC-SHA256 подписью
3. Backend валидирует подпись через `TELEGRAM_BOT_TOKEN`
4. Пользователь создаётся/находится по `telegramId`

### Demo Auth (localhost)

`GET /api/auth?demo=true` — авторизация без Telegram для локальной разработки.

---

## 📱 Telegram Mini App

### Настройка бота

1. Откройте [@BotFather](https://t.me/BotFather) → `/newbot`
2. Скопируйте токен → `TELEGRAM_BOT_TOKEN`
3. `/newapp` → укажите URL `https://your-app.vercel.app`
4. Зарегистрируйте webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d url=https://<your-domain>/api/telegram/webhook \
  -d secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

---

## 📦 Модули приложения

| Экран | Описание |
|-------|----------|
| 🏠 **Главная** | Сводка дня, streak, AI-рекомендации |
| ✅ **Дела** | Задачи, цепочки целей |
| 🔥 **Ритуалы** | Ежедневные привычки с 7-day dots |
| 🏆 **Цели** | Челленджи + достижения |
| 👤 **Профиль** | Настройки, статистика, AI-трансформация |
| 📊 **Отчёты** | Недельный + месячный анализ ликов |
| 🏋️ **GYM** | Периодизация, упражнения, 1RM, PR |
| 💰 **Финансы** | Доходы/расходы, бюджет по категориям |
| ❤️ **Здоровье** | Еда, вода, БАДы, замеры тела |

---

## 📁 Структура проекта

```
src/
├── app/
│   ├── api/                  # ~106 API endpoints
│   │   ├── ai/               # AI-анализ, советы, корреляции
│   │   ├── achievements/     # Геймификация
│   │   ├── challenges/       # Челленджи
│   │   ├── telegram/         # Telegram webhook + cron
│   │   └── ...
│   ├── error.tsx             # Segment error boundary
│   └── global-error.tsx      # Root error boundary
├── components/
│   ├── screens/              # Основные экраны
│   └── ui/                   # shadcn/ui компоненты
├── features/
│   ├── gym/                  # GymContext + диалоги
│   └── profile/              # Профиль компоненты
├── lib/
│   ├── api-handler.ts        # API factory + auth + rate limit
│   ├── errors.ts             # Типизированные ошибки (ApiError → subclasses)
│   ├── rate-limit.ts         # Upstash rate limiting + in-memory fallback
│   ├── db.ts                 # Prisma client
│   ├── ai-provider.ts        # Groq + Gemini fallback
│   └── ...
├── types/
│   └── api.ts                # ApiSuccess<T>, ApiList<T>, общие типы
└── test/
    └── setup.ts              # Vitest + jest-dom setup
```

---

## 🔗 Ссылки

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Upstash Redis](https://upstash.com)
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## 📄 License

MIT
