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

```bash
git clone https://github.com/NortanPecan/LeakFixerBuddy.git
cd LeakFixerBuddy
bun install
bun run db:generate
bun run dev
```

Откройте http://localhost:3000 — автоматически создастся demo-пользователь.

**Важно:** Проект использует только Supabase PostgreSQL. Убедитесь, что настроены переменные окружения.

---

## 📋 Содержание

- [База данных](#-база-данных)
- [Архитектура авторизации](#-архитектура-авторизации)
- [Telegram Mini App](#-telegram-mini-app)
- [Модули приложения](#-модули-приложения)
- [Структура проекта](#-структура-проекта)

---

## 🗄️ База данных

**Проект использует ТОЛЬКО Supabase PostgreSQL.**

### Обязательные переменные окружения

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase pooling (port 6543) | `postgresql://...pooler.supabase.com:6543/postgres` |
| `DIRECT_DATABASE_URL` | Supabase direct (port 5432) | `postgresql://...supabase.co:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `7123456789:AAHxxxx...` |

**Полная инструкция:** [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

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

### Demo Auth (для тестирования)

`GET /api/auth?demo=true` — fallback авторизация без Telegram.

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
    └── schema.prisma     # PostgreSQL схема
```

---

## 🔧 Скрипты

```bash
bun run dev       # Запуск dev-сервера
bun run build     # Production build
bun run lint      # ESLint проверка
bun run db:push   # Применить схему к БД
bun run db:generate # Генерация Prisma клиента
bun run db:studio # Открыть Prisma Studio
```

---

## 📄 License

MIT

---

## 🔗 Ссылки

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
