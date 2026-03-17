# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-17 (сессия 4)
> Ветка: `claude/buddy-matching-v2-jyJbK`

---

## Последняя сессия (2026-03-17, сессия 4)

### ✅ Сделано

| # | Задача | Детали |
|---|--------|--------|
| 5.22 | **Растяжка после тренировки** | Кнопка 🧘 в `GymPostWorkoutDialog`, `stretchingDone` в Prisma, migration `20260317_gym_stretching.sql` |
| 5.6 | **Рефрейминг при срыве в еде** | Карточка 🔄 в `DailySummaryScreen` при `qualityBreakdown.bad > 2` |
| 2.5 | **Личные рекорды PR** | `/api/gym/records` (MAX weight per template), 🏆 PR badge в `GymWorkoutDetailDialog` |
| 5.7 | **Быстрое добавление воды** | +200/+350/+500 мл кнопки в Daily Summary на HomeScreen, optimistic update |
| 5.9 | **Качественный бар еды** | 3-сегментный мини-бар (зелёный/жёлтый/красный) под калориями |
| 7.4 | **Быстрый ввод** | Строка на HomeScreen: "вода 300", "вес 74.5", "настроение 7", "энергия 8" |

### Миграции этой сессии

| Файл | Таблица | Статус |
|------|---------|--------|
| `prisma/migrations/20260317_gym_stretching.sql` | `gym_workouts.stretching_done` | ⚠️ **Применить в Supabase!** |

### Новые API endpoints

```
GET /api/gym/records?userId=xxx  — MAX weight per exercise template
```

---

## Задачи — следующая сессия (по приоритету)

### 1. Telegram-бот: быстрый ввод через ИИ (6.1) 🔴 ВЫСОКИЙ
**Что нужно**: пишешь боту "зал 45 минут" или "съел пиццу 800 ккал" → ИИ парсит и записывает.
**Шаги:**
- Webhook `/api/telegram/bot` — получает сообщения от бота
- Claude API / simple NLP — определяет тип (еда / тренировка / вес / настроение)
- Сохраняет через существующие API
- Ответ: "✅ Записал: пицца 800 ккал в обед"

### 2. Шкала прогресса от первого дня (2.4) 🟡 СРЕДНИЙ
**Что нужно**: сравнение текущих показателей с показателями на старте (день 1).
**Шаги:**
- Сохранять снапшот метрик при регистрации или в первую неделю
- На ProfileScreen или HomeScreen — блок "за N дней: вес −3 кг, стрик +45 дней"

### 3. Шаблон замены плохой еды (5.2) 🟡 СРЕДНИЙ
**Что нужно**: при добавлении "плохого" продукта → подсказать замену.
**Шаги:**
- Словарь замен: pizza → гречка, Cola → вода + лимон, etc.
- Всплывающая подсказка в форме добавления еды

### 4. Рекорды тела (подтягивания, планка) (2.5 расширение) 🟢 НИЗКИЙ
**Текущее**: PR только по весу в зале.
**Добавить**: bodyweight records — подтягивания, планка (секунды).

---

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | `claude/buddy-matching-v2-jyJbK` |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor |
| **API** | ~85 endpoints в `src/app/api/` |

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка истёкших fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |

## Новые API endpoints (сессия 3+4)

```
GET/POST /api/telegram/notify?type=morning|evening  — checkin напоминания
GET      /api/streak/shield?userId=xxx              — статус щита
POST     /api/streak/shield { userId }              — активировать щит
GET/POST /api/emotions                              — трекер эмоций
GET/POST/DELETE /api/thoughts                       — мимолётные мысли
GET      /api/cron/cleanup-thoughts                 — очистка просроченных мыслей
GET      /api/gym/records?userId=xxx                — личные рекорды PR
GET      /api/daily-summary                         — IF window + avgCalories7d
GET      /api/buddies/suggest                       — v2: Jaccard по leak_profile
```
