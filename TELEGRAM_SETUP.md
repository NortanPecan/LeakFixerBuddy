# Telegram Mini App Setup Guide

Это руководство поможет настроить LeakFixer Buddy как Telegram Mini App.

---

## 📋 Чек-лист перед началом

- [ ] Аккаунт Telegram
- [ ] Доступ к [@BotFather](https://t.me/BotFather)
- [ ] Проект на [Supabase](https://supabase.com)
- [ ] Аккаунт на [Vercel](https://vercel.com)

---

## 🤖 Шаг 1: Создание Telegram Bot

### 1.1 Создайте бота через @BotFather

```
1. Откройте @BotFather в Telegram
2. Отправьте /newbot
3. Введите название: LeakFixer Buddy
4. Введите username: leakfixer_buddy_bot (или другой)
5. Сохраните полученный токен:
   7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 1.2 Создайте Mini App

```
1. В @BotFather отправьте /newapp
2. Выберите вашего бота
3. Введите название: LeakFixer
4. Введите описание: Трекер привычек и фитнеса
5. Введите short name: leakfixer
6. Введите URL: https://ваш-проект.vercel.app
7. Загрузите иконку (опционально)
```

**Важно:** URL должен быть HTTPS и доступен публично!

---

## 🗄️ Шаг 2: Настройка Supabase

### 2.1 Получите строки подключения

```
1. Откройте проект на supabase.com
2. Settings → Database
3. Скопируйте два URL:
```

**Connection Pooling (port 6543):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct Connection (port 5432):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2.2 URL-encode пароль если есть спецсимволы

| Символ | Код |
|--------|-----|
| ! | %21 |
| @ | %40 |
| # | %23 |
| $ | %24 |
| & | %26 |

Пример: `Pass!!word` → `Pass%21%21word`

---

## ▲ Шаг 3: Деплой на Vercel

### 3.1 Подключите репозиторий

```
1. Vercel → Add New → Project
2. Import: NortanPecan/LeakFixerBuddy
3. Branch: main
```

### 3.2 Настройте переменные окружения

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Connection Pooling URL (port 6543) | ✅ Yes |
| `DIRECT_DATABASE_URL` | Direct Connection URL (port 5432) | ✅ Yes |
| `TELEGRAM_BOT_TOKEN` | Token от @BotFather | ✅ Yes |

### 3.3 Deploy

```
1. Нажмите Deploy
2. Дождитесь завершения
3. Скопируйте URL: https://ваш-проект.vercel.app
```

---

## ✅ Шаг 4: Проверка

### 4.1 Проверьте health endpoint

Откройте в браузере:
```
https://ваш-проект.vercel.app/api/health
```

Вы должны увидеть:
```json
{
  "status": "ok",
  "database": {
    "type": "PostgreSQL (Supabase)",
    "connected": true,
    "stats": { "users": 0, "profiles": 0 }
  },
  "auth": {
    "telegramBotToken": true
  }
}
```

### 4.2 Откройте Mini App в Telegram

1. Найдите вашего бота в Telegram
2. Нажмите кнопку с названием Mini App (обычно "Open" или "Открыть")
3. Приложение должно загрузиться

### 4.3 Проверьте авторизацию

После первого открытия:
1. В Mini App должен показаться ваш Telegram профиль
2. В Supabase должна появиться запись в таблице `app_users`

---

## 🔧 Текущий продакшен URL

**Mini App URL:** `https://leakfixer-miniapp.vercel.app`

> ⚠️ Если вы используете другой проект на Vercel, обновите URL в @BotFather:
> ```
> @BotFather → /myapps → выберите приложение → Edit → URL
> ```

---

## 🐛 Устранение проблем

### Ошибка: "Invalid Telegram signature"

**Причина:** Неправильный `TELEGRAM_BOT_TOKEN`

**Решение:**
1. Проверьте токен в Vercel Environment Variables
2. Убедитесь, что токен соответствует боту из @BotFather
3. Redeploy проект после изменения переменных

### Ошибка: "Database connection failed"

**Причина:** Неправильные `DATABASE_URL` или `DIRECT_DATABASE_URL`

**Решение:**
1. Проверьте URL в Supabase Dashboard
2. Убедитесь, что пароль URL-encoded
3. Проверьте, что проект Supabase активен (не paused)

### Приложение не открывается в Telegram

**Причины:**
1. URL не HTTPS
2. URL недоступен
3. Mini App не создан в @BotFather

**Решение:**
1. Убедитесь, что Vercel deploy успешен
2. Проверьте URL через браузер
3. Пересоздайте Mini App в @BotFather

---

## 🔐 Переменные окружения (итого)

### Обязательно для продакшена:

```env
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://postgres:[PASS]@db.[REF].supabase.co:5432/postgres"
TELEGRAM_BOT_TOKEN="7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Опционально:

```env
NODE_ENV="production"
```

---

## 📱 Как это работает

```
┌─────────────────┐    HTTPS    ┌─────────────────┐
│   Telegram      │ ──────────► │   Vercel        │
│   Mini App      │             │   Next.js       │
└─────────────────┘             └────────┬────────┘
                                         │
                                         │ Prisma
                                         ▼
                                ┌─────────────────┐
                                │   Supabase      │
                                │   PostgreSQL    │
                                └─────────────────┘
```

### Поток авторизации:

```
1. Пользователь открывает Mini App в Telegram
2. Telegram WebApp SDK предоставляет initData (с подписью)
3. Frontend отправляет initData на POST /api/auth
4. Backend валидирует подпись с помощью BOT_TOKEN
5. Backend находит/создаёт пользователя в Supabase
6. Frontend получает user + profile + globalState
```

---

## 🧪 Тестирование локально

```bash
# Sandbox режим (без Telegram)
git checkout master
bun install
bun run db:push
bun run dev

# Откройте http://localhost:3000
# Автоматически создастся demo-пользователь
```

---

## 📞 Поддержка

При проблемах:
1. Проверьте `/api/health` endpoint
2. Проверьте логи в Vercel Dashboard
3. Проверьте логи в Supabase Dashboard

---

## ✅ Чек-лист проверки

- [ ] `/api/health` возвращает `status: "ok"`
- [ ] `database.connected: true`
- [ ] `auth.telegramBotToken: true`
- [ ] Mini App открывается в Telegram
- [ ] Профиль пользователя создаётся в БД после первого открытия
