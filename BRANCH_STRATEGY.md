# Branch Strategy

## Overview

LeakFixer Buddy использует **двухветочную стратегию** с полным разделением окружений.

---

## ⚠️ DEV_RULES — Правила для AI-агентов

> **ВАЖНО**: Эти правила действуют постоянно для всех сессий работы с репозиторием.

### Правило 1. Ветка `master` = sandbox

- ✅ Коммиты, рефакторинг, новые фичи, изменения схемы (`schema.prisma`) — **только здесь**
- ✅ Можно запускать: `db:push:sandbox`, `db:migrate:sandbox`, `db:generate:sandbox`
- ✅ Активная разработка и эксперименты

### Правило 2. Ветка `main` = production

- ❌ **Никаких изменений файлов**
- ❌ **Никаких миграций**
- ❌ **Никаких коммитов**
- ✅ Можно только **читать код** и использовать как пример (Telegram auth, Supabase)

### Правило 3. Supabase и `schema.supabase.prisma`

- ❌ **Не менять** `schema.supabase.prisma`
- ❌ **Не запускать** `db:push:prod` / `db:migrate:prod`
- ✅ Идеи по прод-схеме описывать текстом в `SUPABASE_CHECKLIST.md` или `worklog.md` как **TODO для владельца**

### Правило 3. Supabase и `schema.supabase.prisma`

- ❌ **Не менять** `schema.supabase.prisma`
- ❌ **Не запускать** `db:push:prod` / `db:migrate:prod`
- ✅ Идеи по прод-схеме описывать текстом в `SUPABASE_CHECKLIST.md` или `worklog.md` как **TODO для владельца**

### Правило 4. Рекомендации и улучшения от AI

После выполнения любой задачи AI-агент обязан в отчёте добавить раздел **Рекомендации и улучшения**, даже если задача формально выполнена.

В этот раздел нужно включать:
- **явные улучшения кода** (упрощение логики, повышение надёжности, удаление дублирования);
- **неявные идеи по UX, архитектуре, схеме БД**, которые агент заметил по ходу работы, но не реализовал;
- **потенциальные риски и краевые случаи**, на которые стоит обратить внимание в следующих задачах.

Самостоя реализовывать эти рекомендации в рамках текущей задачи нельзя, если этого прямо не попросил владелец.

---

## Ветки

### `master` — Sandbox (Разработка)

**Назначение**: Локальная разработка, UI/UX итерации, тестирование фич

**Конфигурация**:
- База данных: **SQLite** (локальный файл `prisma/db/custom.db`)
- Telegram: Мок/demo режим (без реального подключения)
- Внешние сервисы: Опционально или замоканы
- Схема: `prisma/schema.prisma` (SQLite)

**Команды для sandbox**:

```bash
# Установка
git checkout master
bun install

# Настройка .env
echo 'DATABASE_URL="file:./db/custom.db"' > .env
echo 'DEMO_MODE="true"' >> .env

# Работа с БД
bun run db:push:sandbox      # Создать/обновить таблицы в SQLite
bun run db:generate:sandbox  # Сгенерировать Prisma Client
bun run db:studio:sandbox    # Открыть Prisma Studio для SQLite
bun run db:validate:sandbox  # Проверить валидность схемы

# Запуск
bun run dev
```

**Workflow**:
1. Все новые фичи начинаются в `master`
2. Тестируются локально с SQLite
3. UI/UX изменения без сетевых зависимостей
4. После готовности — merge в `main` для продакшена

---

### `main` — Production

**Назначение**: Рабочий Telegram Mini App

**Конфигурация**:
- База данных: **Supabase PostgreSQL**
- Telegram: Реальная авторизация Mini App
- Деплой: Vercel (автоматический при push)
- Схема: `prisma/schema.supabase.prisma` (PostgreSQL)

**Команды для prod (только для проверки схемы!)**:

```bash
# ВАЖНО: Эти команды НЕ подключаются к реальной БД из песочницы!
# Они используются только для валидации схемы

bun run db:validate:prod     # Проверить валидность PostgreSQL схемы
bun run db:generate:prod     # Сгенерировать Prisma Client для PostgreSQL
```

**Реальное управление БД в Supabase**:
- Таблицы создаются **вручную** через веб-интерфейс Supabase
- Используйте `SUPABASE_CHECKLIST.md` как инструкцию
- SQL можно запускать через Supabase SQL Editor

---

## Schema files

- `prisma/schema.prisma`: sandbox schema (SQLite)
- `prisma/schema.supabase.prisma`: production schema (Supabase/PostgreSQL)

Both schemas must describe the same domain models. Differences are only DB-specific types/constraints.

---

## Переменные окружения

### Master (.env для sandbox)

```env
DATABASE_URL="file:./db/custom.db"
DEMO_MODE="true"
```

### Main (Vercel Environment Variables)

```env
# Supabase Database URLs
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-bot-token-here"
```

**Как получить URL от Supabase**:
1. Зайдите в Supabase Dashboard → Project Settings → Database
2. `DATABASE_URL` = Connection pooling (port 6543) — для приложения
3. `DIRECT_DATABASE_URL` = Direct connection (port 5432) — для миграций

---

## Управление схемами БД

### Структура файлов

```
prisma/
├── schema.prisma           # SQLite для master (sandbox)
├── schema.supabase.prisma  # PostgreSQL для main (production)
└── db/
    └── custom.db           # Локальная SQLite база
```

### Различия схем

| Характеристика | SQLite (sandbox) | PostgreSQL (prod) |
|----------------|------------------|-------------------|
| Provider | `sqlite` | `postgresql` |
| ID тип | `@id @default(cuid())` | `@id @default(uuid()) @db.Uuid` |
| DateTime | `DateTime` | `DateTime @db.Timestamptz` |
| BigInt | `String` (как строка) | `BigInt @db.BigInt` |
| directUrl | Нет | `directUrl = env("DIRECT_DATABASE_URL")` |

### Когда нужно менять схему

1. **Добавить новое поле**:
   - Отредактируйте `schema.prisma` (sandbox)
   - Отредактируйте `schema.supabase.prisma` (prod)
   - Обновите `SUPABASE_CHECKLIST.md`
   - Запустите `bun run db:push:sandbox`
   - В проде добавьте поле вручную через Supabase

2. **Добавить новую таблицу**:
   - Аналогично: обе схемы + чек-лист
   - В проде создайте таблицу по чек-листу

---

## NPM Scripts Reference

### Sandbox (SQLite)

| Команда | Описание |
|---------|----------|
| `bun run db:push:sandbox` | Создать/обновить таблицы в SQLite |
| `bun run db:generate:sandbox` | Сгенерировать Prisma Client |
| `bun run db:migrate:sandbox` | Создать и применить миграцию |
| `bun run db:reset:sandbox` | Сбросить БД и применить все миграции |
| `bun run db:studio:sandbox` | Открыть Prisma Studio |
| `bun run db:validate:sandbox` | Проверить схему на ошибки |

### Production (PostgreSQL)

| Команда | Описание |
|---------|----------|
| `bun run db:push:prod` | Только для справки — НЕ использовать в песочнице |
| `bun run db:generate:prod` | Сгенерировать клиент для PostgreSQL схемы |
| `bun run db:migrate:prod` | Применить миграции к прод БД (снаружи песочницы) |
| `bun run db:studio:prod` | Открыть Prisma Studio для прод БД |
| `bun run db:validate:prod` | Проверить PostgreSQL схему на ошибки |

---

## Деплой на Vercel

### Первый деплой

1. Подключите GitHub репозиторий к Vercel
2. Укажите branch `main` для production
3. Добавьте environment variables в Vercel Dashboard:
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN`

### Проверка деплоя

После деплоя проверьте health endpoint:

```
GET https://your-app.vercel.app/api/health
```

Ожидаемый ответ:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-..."
}
```

---

## Demo Auth (Production)

Endpoint: `GET /api/auth?demo=true`

Purpose:
- Fallback login path when Telegram `initData` is unavailable.
- Works in production with Supabase, independent from Telegram signature validation.

Environment expectations:
- Required: `DATABASE_URL`
- Recommended for Supabase: `DIRECT_DATABASE_URL`
- Optional: `DEMO_MODE`
- Not required for demo GET: `TELEGRAM_BOT_TOKEN` (required only for Telegram POST login)

Failure policy:
- Missing DB env -> clear HTTP 500 config error.
- DB connection issue -> clear HTTP 503 error.
- Schema mismatch -> clear HTTP 500 error with regeneration/sync hint.

---

## CI/CD Flow

```
master (локальная разработка)
    ↓
  [тестирование в SQLite]
    ↓
  PR to main
    ↓
  [code review]
    ↓
  merge to main
    ↓
  Vercel auto-deploy
    ↓
  Production (leak-fixer-buddy.vercel.app)
```

---

## Важные ограничения

### Из песочницы НЕЛЬЗЯ:

1. ❌ Подключиться к Supabase PostgreSQL
2. ❌ Запустить миграции на прод базу
3. ❌ Использовать реальный Telegram Bot API

### Что можно делать в песочнице:

1. ✅ Разрабатывать UI/UX
2. ✅ Тестировать с SQLite
3. ✅ Мокать внешние API
4. ✅ Валидировать PostgreSQL схему

---

## История изменений

| Дата | Изменение |
|------|-----------|
| 2024-XX-XX | Добавлены отдельные npm scripts для sandbox/prod |
| 2024-XX-XX | Создан SUPABASE_CHECKLIST.md |
| 2024-XX-XX | Sync master with main (prod code into sandbox) |
