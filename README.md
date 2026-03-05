# LeakFixer Buddy 🚀

Telegram Mini App для саморазвития - привычки, фитнес, уроки.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-green)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## 📱 Возможности

- 📚 **30-дневный курс** - уроки с прогрессом и streak
- 💪 **Фитнес-трекер** - вода, калории, активности
- ✅ **Привычки** - отслеживание с сериями выполнения
- 👤 **Профиль** - персональные настройки и статистика
- 🌙 **Тёмная тема** - emerald accent

---

## 🚀 Деплой на Vercel + Supabase

### 1. Получить переменные из Supabase

Зайдите на [supabase.com](https://supabase.com) → ваш проект:

#### Шаг 1: Settings → Database
1. Нажмите ⚙️ **Settings** (слева внизу)
2. Нажмите **Database** в меню

#### Шаг 2: Скопируйте URL

Найдите блок **Connection string** и скопируйте **ДВА** URL:

**A. Connection pooling (для Vercel):**
```
Нажмите "Connection pooling"
Выберите "Transaction" mode
Скопируйте URL вида:
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**B. Direct connection (для миграций):**
```
Нажмите "Direct connection"
Скопируйте URL вида:
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

⚠️ **Замените `[YOUR-PASSWORD]` на пароль от БД!**

---

### 2. Деплой на Vercel

1. Зайдите на [vercel.com](https://vercel.com)
2. **Add New → Project**
3. Импортируйте `NortanPecan/LeakFixerBuddy`
4. **Environment Variables:**

| Name | Value |
|------|-------|
| `DATABASE_URL` | Connection pooling URL (с `pooler.supabase.com:6543`) |
| `DIRECT_DATABASE_URL` | Direct connection URL (с `db.[PROJECT-REF].supabase.co:5432`) |

5. **Deploy**

---

### 3. Перед первым деплоем

Нужно переключить схему на PostgreSQL:

```bash
# В репозитории
cd prisma
mv schema.prisma schema.sqlite.prisma
mv schema.supabase.prisma schema.prisma
cd ..
git add . && git commit -m "chore: Switch to PostgreSQL schema" && git push
```

---

### 4. Telegram Mini App

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/newbot` — создать бота
3. `/newapp` — создать Mini App
4. Укажите URL: `https://your-app.vercel.app`

---

## 🔧 Локальная разработка

```bash
# Клонировать
git clone https://github.com/NortanPecan/LeakFixerBuddy.git
cd LeakFixerBuddy

# Установить зависимости
bun install

# Настроить БД (SQLite для локальной разработки)
echo 'DATABASE_URL="file:./dev.db"' > .env

# Создать таблицы
bun run db:push

# Запустить
bun run dev
```

---

## 📁 Структура

```
src/
├── app/api/          # API routes
├── components/       # UI компоненты
│   └── screens/      # 4 экрана
└── lib/
    ├── fitness/      # Утилиты
    └── store.ts      # Zustand
prisma/
├── schema.prisma          # SQLite (локально)
└── schema.supabase.prisma # PostgreSQL (production)
```

## 📄 License

MIT
