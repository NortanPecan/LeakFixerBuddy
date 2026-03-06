# LeakFixer Buddy 🚀

**Telegram Mini App для саморазвития** — привычки, фитнес, здоровье, финансы, развитие.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-green)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

> 📱 **Продакшен**: [leak-fixer-buddy.vercel.app](https://leak-fixer-buddy.vercel.app/)  
> 📖 **Настройка Telegram**: [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

---

## 🚀 Быстрый старт

### Sandbox (локальная разработка)
```bash
git clone https://github.com/NortanPecan/LeakFixerBuddy.git
cd LeakFixerBuddy
bun install
bun run db:push
bun run dev
```

Откройте http://localhost:3000 — автоматически создастся demo-пользователь.

### Production (Telegram Mini App)

**Обязательные переменные окружения:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase pooling (port 6543) | `postgresql://...pooler.supabase.com:6543/postgres` |
| `DIRECT_DATABASE_URL` | Supabase direct (port 5432) | `postgresql://...supabase.co:5432/postgres` |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `7123456789:AAHxxxx...` |

**Полная инструкция:** [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

---

## 📋 Содержание

- [Ветки и окружения](#-ветки-и-окружения)
- [Архитектура авторизации](#-архитектура-авторизации)
- [Быстрый старт (Sandbox)](#-быстрый-старт-sandbox)
- [Продакшен (Vercel + Supabase)](#-продакшен-vercel--supabase)
- [Telegram Mini App](#-telegram-mini-app)
- [Модули приложения](#-модули-приложения)
- [Структура проекта](#-структура-проекта)

---

## 🌿 Ветки и окружения

Проект использует **двухветочную стратегию** для разделения разработки и продакшена:

| Ветка | Назначение | База данных | Telegram |
|-------|------------|-------------|----------|
| `master` | 🧪 **Sandbox** (разработка) | SQLite (локально) | Мок/демо режим |
| `main` | 🚀 **Production** (прод) | Supabase PostgreSQL | Реальный Telegram Mini App |

### `master` — Sandbox (песочница)

```bash
# Клонировать ветку sandbox
git clone -b master https://github.com/NortanPecan/LeakFixerBuddy.git
cd LeakFixerBuddy

# Установить зависимости
bun install

# Создать .env для sandbox
echo 'DATABASE_URL="file:./db/custom.db"' > .env
echo 'DEMO_MODE="true"' >> .env

# Создать таблицы
bun run db:push

# Запустить
bun run dev
```

**Особенности sandbox:**
- ✅ Работает оффлайн, без внешних сервисов
- ✅ SQLite база в папке проекта
- ✅ Демо-пользователь для тестирования UI
- ✅ Все фичи доступны локально

### `main` — Production (продакшен)

```bash
# Переключиться на production ветку
git checkout main

# Установить зависимости
bun install

# Настроить .env для Supabase
# (см. раздел "Продакшен" ниже)

# Применить миграции
bunx prisma migrate deploy

# Запустить
bun run dev
```

**Особенности production:**
- 🔒 Telegram Mini App авторизация
- ☁️ Supabase PostgreSQL (масштабируемая)
- 🌐 Деплой на Vercel
- 📱 Работает внутри Telegram

---

## 🔐 Архитектура авторизации

### Текущий метод: Telegram Mini App

Приложение использует **Telegram WebApp API** для авторизации:

```
Telegram Client → initData → Backend → Валидация → Создание/поиск пользователя
```

1. Пользователь открывает Mini App в Telegram
2. Telegram передаёт `initData` с подписью
3. Backend валидирует подпись с помощью `TELEGRAM_BOT_TOKEN`
4. Пользователь создаётся/находится по `telegram_id`

### Модель пользователя

```prisma
model AppUser {
  id              String   @id
  
  // Telegram identity (основной способ)
  telegramId      String   @unique
  telegramUsername String?
  telegramFirstName String?
  telegramLastName String?
  
  // Зарезервировано для будущего
  email           String?  @unique  // Phone/email login (coming soon)
  phone           String?  @unique
  emailVerified   DateTime?
  phoneVerified   DateTime?
  
  authProvider    String   @default("telegram") // telegram | email | phone
}
```

### Будущее: Phone/Email Login

Поля `email` и `phone` уже добавлены в схему, но **не используются** в текущей версии. В будущем:

1. Пользователь сможет привязать email/phone к существующему аккаунту
2. Интеграция с Supabase Auth для верификации
3. Альтернативный вход без Telegram

---

## 🚀 Быстрый старт (Sandbox)

Для локальной разработки без внешних сервисов:

```bash
# 1. Клонировать
git clone https://github.com/NortanPecan/LeakFixerBuddy.git
cd LeakFixerBuddy

# 2. Установить зависимости
bun install

# 3. Настроить окружение
cp .env.example .env
# Оставьте DATABASE_URL="file:./db/custom.db" для SQLite

# 4. Создать таблицы
bun run db:push

# 5. Запустить
bun run dev
```

Откройте http://localhost:3000 в браузере.

---

## 🌐 Продакшен (Vercel + Supabase)

### Шаг 1: Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в **Project Settings → Database**
3. Скопируйте два URL:

**Connection Pooling** (для Vercel, port 6543):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct Connection** (для миграций, port 5432):
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Шаг 2: Деплой на Vercel

1. Import проект с GitHub: `NortanPecan/LeakFixerBuddy`
2. Выберите ветку: **main**
3. Настройте переменные окружения:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Connection Pooling URL (port 6543) |
| `DIRECT_DATABASE_URL` | Direct Connection URL (port 5432) |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |

### Шаг 3: Первичный деплой

```bash
# Переключиться на main
git checkout main

# Обновить схему под PostgreSQL
cd prisma
mv schema.prisma schema.sqlite.prisma
mv schema.supabase.prisma schema.prisma
cd ..

# Закоммитить и запушить
git add . && git commit -m "chore: switch to PostgreSQL schema" && git push
```

---

## 📱 Telegram Mini App

### Создание бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен бота
4. Отправьте `/newapp` для создания Mini App
5. Укажите URL: `https://your-app.vercel.app`

### Валидация initData

Backend валидирует Telegram `initData` по алгоритму:

```typescript
// 1. Парсим параметры из initData
const params = new URLSearchParams(initData)

// 2. Получаем hash
const hash = params.get('hash')
params.delete('hash')

// 3. Создаём data-check-string
const dataCheckString = [...params.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join('\n')

// 4. Вычисляем secret key
const secretKey = hmacSha256(botToken, 'WebAppData')

// 5. Вычисляем signature
const signature = hmacSha256(secretKey, dataCheckString)

// 6. Сравниваем с hash
return signature === hash
```

---

## 📦 Модули приложения

### Основные экраны

| Экран | Описание |
|-------|----------|
| 🏠 **Главная** | Сводка дня, прогресс, streak |
| ✅ **Дела** | Задачи, цепочки целей |
| 🔥 **Ритуалы** | Ежедневные привычки |
| 🏆 **Цели** | Челенджи и достижения |
| 👤 **Профиль** | Настройки, статистика |

### Быстрый доступ (из Профиля)

| Модуль | Описание |
|--------|----------|
| 🔥 **Фитнес** | Энергия тела, вода, шаги |
| ❤️ **Здоровье** | БАДы, еда, вода |
| 💰 **Финансы** | Счета, категории, транзакции |
| 📝 **Заметки** | Мысли, дневник, контент |
| 📚 **Развитие** | Книги, курсы, подкасты |
| 🏋️ **GYM** | Тренировочные циклы |

### Энергия тела (BMR/TDEE)

Автоматический расчёт калорий:

```
BMR = 10×вес + 6.25×рост − 5×возраст + sexOffset
     sexOffset: +5 (муж) / -161 (жен)

TDEE = BMR × workMultiplier
     sedentary=1.2, mixed=1.4, physical=1.6, variable=1.3

Баланс = Съедено − TDEE
```

---

## 📁 Структура проекта

```
src/
├── app/
│   ├── api/              # API routes (Next.js)
│   │   ├── auth/         # Telegram авторизация
│   │   ├── energy/       # BMR/TDEE расчёты
│   │   ├── food/         # Питание
│   │   ├── supplements/  # БАДы
│   │   ├── water/        # Вода
│   │   └── ...           # Другие endpoints
│   └── page.tsx          # Главная страница
├── components/
│   ├── screens/          # Экраны приложения
│   ├── ui/               # shadcn/ui компоненты
│   └── BodyEnergyBlock.tsx
├── lib/
│   ├── db.ts             # Prisma client
│   ├── store.ts          # Zustand store
│   ├── fitness.ts        # Фитнес-утилиты
│   └── date-utils.ts     # Дата-хелперы
└── prisma/
    ├── schema.prisma           # SQLite (sandbox)
    └── schema.supabase.prisma  # PostgreSQL (production)
```

---

## 🔧 Скрипты

```bash
bun run dev       # Запуск dev-сервера
bun run build     # Production build
bun run lint      # ESLint проверка
bun run db:push   # Применить схему к БД
bun run db:migrate # Создать миграцию
bun run seed:demo # Заполнить демо-данными (sandbox only)
```

---

## 🌱 Демо-данные (Sandbox)

Для удобной разработки в sandbox доступен скрипт заполнения демо-данными:

```bash
bun run seed:demo
```

### Что создаётся:

- **Демо-пользователь**: `Demo User` (@demo_user)
- **5 дней истории**: сегодня + 4 предыдущих дня
- **8 ритуалов**: вода утром, зарядка, контрастный душ, чтение, медитация, планирование, прогулка, сон
- **3 БАДа**: Витамин D3, Омега-3, Магний
- **Еда**: 2-4 приёма пищи в день с калориями и оценкой качества
- **Вода**: 1500-3000 мл в день
- **Настроение/энергия**: 5-8 баллов
- **1 челлендж**: "30 дней без сахара"
- **1 цепочка задач**: "Настроить окружение" (4 задачи)

### Логин демо-режима:

При запуске `bun run dev` приложение автоматически логинится за демо-пользователя:

```
GET /api/auth?demo=true
```

Это тот же пользователь, которого создаёт `seed:demo`, поэтому:
- После сида данные сохраняются между запусками
- Можно смотреть историю за предыдущие дни через DatePicker
- LeakFix-аналитика будет работать на реальных паттернах

### Owner-режим (чистый профиль для тестирования):

Для тестирования с пустыми данными, как у нового пользователя:

```
GET /api/auth?owner=true
```

Или на экране ошибки авторизации: кнопка "Войти как Owner (чистый профиль)".

**Особенности Owner-режима:**
- ✅ Пустые данные (нет ритуалов, задач, истории)
- ✅ Можно заполнять данными вручную
- ✅ Данные сохраняются в локальной базе
- ⏳ В будущем: экспорт данных и привязка к реальному Telegram-аккаунту

**Отличия Demo vs Owner:**

| Параметр | Demo | Owner |
|----------|------|-------|
| Telegram ID | 9000000001 | 9000000002 |
| Email | demo@leakfixer.local | owner@leakfixer.local |
| Username | demo_user | liveleak_owner |
| Данные при старте | 5 дней истории | Пусто |
| Ритуалы | 8 созданы | 0 |
| Задачи | 1 цепочка | 0 |
| Челенджи | 1 активный | 0 |

### Очистка и пересоздание:

```bash
# Полный сброс базы
bun run db:reset:sandbox

# Или пересоздать только демо-данные
bun run seed:demo
```

---

## 📄 License

MIT

---

## 🔗 Ссылки

- [Старая версия Mini App](https://leakfixer-miniapp.vercel.app/)
- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## Branch-aware DB Commands (2026-03-06)

Use these scripts explicitly by environment:

### Sandbox (SQLite, `prisma/schema.prisma`)

```bash
bun run db:generate:sandbox
bun run db:push:sandbox
bun run db:migrate:sandbox
bun run db:studio:sandbox
bun run db:validate:sandbox
```

### Production (Supabase, `prisma/schema.supabase.prisma`)

```bash
bun run db:generate:prod
bun run db:push:prod
bun run db:migrate:prod
bun run db:studio:prod
bun run db:validate:prod
```

### Manual Supabase Sync Policy

Production Supabase is synchronized manually by the project owner.

1. Update `prisma/schema.supabase.prisma`.
2. Update `SUPABASE_CHECKLIST.md`.
3. Apply SQL manually in Supabase SQL Editor.
4. Re-run validation and compare table/column lists.

## Demo Auth in Production

`GET /api/auth?demo=true` is supported in production as an explicit fallback login path.

How it works:

- It does not require Telegram `initData`.
- It does not require `TELEGRAM_BOT_TOKEN`.
- It requires working DB connectivity (`DATABASE_URL`; for Supabase also `DIRECT_DATABASE_URL` recommended).
- It creates or reuses a dedicated demo user (`demo@leakfixer.local`).

Required env for stable demo auth in prod:

- `DATABASE_URL` (required)
- `DIRECT_DATABASE_URL` (recommended for Supabase)
- `DEMO_MODE` (optional flag for product logic; endpoint itself does not hard-block by this flag)
- `TELEGRAM_BOT_TOKEN` (not required for `?demo=true`, required for Telegram POST auth)

Error behavior:

- If DB env is missing: HTTP 500 with explicit config error text.
- If DB is unreachable: HTTP 503 with connectivity hint.
- If Prisma schema/runtime mismatch: HTTP 500 with schema mismatch hint.
- Response contains `error`, `reason`, `hint`, `details`, and safe config booleans.
