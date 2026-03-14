# LeakFixerBuddy — Текущее состояние проекта

## Обзор

**LeakFixerBuddy** — Telegram Mini App для саморазвития (привычки, фитнес, GYM, wellbeing).

- **Фреймворк**: Next.js 16 + React 19
- **База данных**: Supabase PostgreSQL (только облачная, локальной БД нет)
- **ORM**: Prisma (схема в `prisma/schema.prisma`)
- **Рабочая ветка**: `main`

## База данных

**ВАЖНО: Проект использует ТОЛЬКО Supabase PostgreSQL. Локальной БД не существует.**

Все данные хранятся в Supabase:
- Prisma подключается через `DATABASE_URL` (pooling) и `DIRECT_DATABASE_URL` (direct)
- REST API через `src/lib/supabase-rest.ts`
- JS клиент через `@supabase/supabase-js`

### Переменные окружения

```env
# Supabase (обязательно)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (для Prisma)
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true..."
DIRECT_DATABASE_URL="postgresql://...supabase.co:5432/postgres?sslmode=require"
```

## Структура feature-модулей

### src/features/gym/
Модуль GYM (тренировки):
```
src/features/gym/
├── index.ts                    # Экспорты
├── constants.ts                # Константы (TRAINING_TYPES, MUSCLE_GROUPS, etc.)
└── components/
    ├── AddWorkoutDialog.tsx    # Диалог добавления тренировки
    └── CompletionPreviewDialog.tsx # Превью завершения
```

### src/features/profile/
Модуль профиля:
```
src/features/profile/
├── index.ts                    # Экспорты
├── constants.ts                # MEASUREMENT_TYPES, FEEDBACK_TYPES, ZONES_CONFIG, etc.
└── components/
    ├── QuickAccess.tsx         # Блок быстрой навигации
    └── DonateCard.tsx          # Карточка доната
```

## Общие утилиты

### src/lib/mood-utils.ts
Единая функция для статуса настроения:
```typescript
import { getMoodStatus, getMoodStatusText } from '@/lib/mood-utils'

// Для UI (с цветом)
const { status, color } = getMoodStatus(7)

// Для API (только текст)
const text = getMoodStatusText(7)
```

## Статистика рефакторинга

| Файл | До | После | Изменение |
|------|-----|-------|-----------|
| GymScreen.tsx | 4216 строк | ~4000 строк | -5% |
| ProfileScreen.tsx | 1096 строк | 895 строк | **-18%** |
| Дубликаты схем Prisma | 3 файла | 1 файл | -2 файла |
| getMoodStatus дубли | 3 копии | 1 копия | -2 копии |

---

## Supabase Client

Единый модуль для работы с Supabase: `src/lib/supabaseClient.ts`

### Файлы:

| Файл | Назначение |
|------|------------|
| `supabaseClient.ts` | Центральные функции для получения env (URL, ключи) |
| `supabase.ts` | Основной клиент (anon + admin), ленивая инициализация |
| `supabase-server.ts` | SSR клиент для Server Components |
| `supabase-browser.ts` | Клиент для Client Components |
| `auth-telegram.ts` | Auth клиент для Telegram аутентификации |
| `supabase-rest.ts` | PostgREST query builder |
| `db.ts` | Prisma client для Supabase PostgreSQL |

### Использование:

```typescript
// Получить env-переменные
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabaseClient'

// Основной клиент (anon key)
import { getSupabase, supabase } from '@/lib/supabase'

// Admin клиент (service role key) - только для server-side
import { getSupabaseAdmin, supabaseAdmin } from '@/lib/supabase'

// SSR для Server Components
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Клиент для браузера
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// Prisma client
import { db } from '@/lib/db'
```

### Проверка конфигурации:

```typescript
import { isSupabaseConfigured, getEnvironmentInfo } from '@/lib/supabaseClient'

if (isSupabaseConfigured()) {
  console.log(getEnvironmentInfo())
  // { hasSupabaseUrl: true, hasAnonKey: true, ... }
}
```

## Ветка master vs main

- **main** — рабочая основная ветка (использовать для пуша)
- **master** — историческая, не используется

## Команды

```bash
bun run lint        # Проверка линтера
bun run db:push     # Применить схему Prisma к Supabase
bun run db:generate # Генерация Prisma клиента
bun run db:studio   # Открыть Prisma Studio
```

---

## Module Audit Summary

**Дата:** 2025-03-11
**Статус:** ✅ Завершён (9/9 модулей)

### Итоговая таблица

| Модуль | Сохранение | Таблиц | Багов | UX проблем |
|--------|------------|--------|-------|------------|
| GYM | ✅ Корректно | 8 | 3 | 4 |
| Wellbeing | ✅ Корректно | 3 | 2 | 3 |
| Rituals | ✅ Корректно | 4 | 4 | 4 |
| Habits | ✅ Корректно | 2 | 4 | 4 |
| Tasks/Chains | ✅ Корректно | 2 | 4 | 5 |
| Notes/Content | ✅ Корректно | 4 | 5 | 4 |
| Finance | ✅ Корректно | 3 | 4 | 5 |
| Challenges | ✅ Корректно | 2 | 4 | 4 |
| Profile/Settings | ✅ Корректно | 6 | 4 | 4 |
| **ИТОГО** | — | **35** | **34** | **37** |

**Общий вердикт:** Все 9 модулей корректно сохраняют данные в Supabase через Prisma.

### Приоритетные исправления (ТОП-5)

| # | ID | Модуль | Проблема | Критичность |
|---|-----|--------|----------|-------------|
| 1 | H-1 | Habits | Weekly stats используют `Math.random()` | ✅ ИСПРАВЛЕНО |
| 2 | P-2 | Profile | `stats.totalWorkouts` — моковые данные | ✅ ИСПРАВЛЕНО |
| 3 | C-2 | Content | `contentIdProp` не передаётся в ContentDetailScreen | ✅ ИСПРАВЛЕНО |
| 4 | R-4 | Rituals | Streak calculation для не-ежедневных ритуалов | ✅ ИСПРАВЛЕНО |
| 5 | F-1 | Finance | Нет обработки network errors | ✅ ИСПРАВЛЕНО |

**Полный аудит:** `docs/MODULE_AUDIT.md`

---

## Streak Calculation Utils

**Файл:** `src/lib/streak-utils.ts`

Единая утилита для расчёта streak с учётом расписания.

### Функции

```typescript
import { calculateStreak, calculateHabitStreak } from '@/lib/streak-utils'

// Для ритуалов с расписанием по дням недели
const result = calculateStreak(completions, [1,2,3,4,5], 30) // будни
// => { streak: 5, maxStreak: 10, scheduledDays: 22, completionRate: 85 }

// Для привычек с frequency
const habitResult = calculateHabitStreak(completions, 'weekly', 3, 30) // 3 раза в неделю
```

### StreakResult

| Поле | Описание |
|------|----------|
| `streak` | Текущий последовательный streak |
| `maxStreak` | Максимальный streak за период |
| `scheduledDays` | Количество запланированных дней |
| `completedScheduledDays` | Выполненных запланированных дней |
| `completionRate` | % выполнения запланированных |

### Логика

1. **Streak** считается только по запланированным дням
2. Пропуск незапланированного дня НЕ рвёт streak
3. `completionRate` = выполнено / запланировано (не все дни)
