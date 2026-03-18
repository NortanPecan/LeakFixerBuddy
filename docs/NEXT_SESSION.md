# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-18 (сессия 13)
> Ветка: `claude/add-profile-achievements-px0DE`

---

## Последняя сессия (2026-03-18, сессия 13)

### ✅ Сделано

| # | Задача | Детали |
|---|--------|--------|
| 1 | **Достижения в ProfileScreen** | Карточка с 6 плитками (2 реальных + 4 locked). Earned: цветные с датой. Locked: серые+grayscale. Счётчик X/6. |
| 2 | **История AI-паттернов в ProfileScreen** | Секция с UserAiPattern[]: тип лика, кол-во анализов, сколько сработало, дата. Скрывает `tg_input_patterns`. |
| 3 | **GET /api/ai/patterns** | Новый endpoint. Вся история UserAiPattern пользователя для ProfileScreen. |
| 4 | **Telegram: кнопка 🏅 + команда ачивменты** | `getAchievementsSummary()`, ACHIEVEMENTS_RE, btn_achievements в moduleHandlers. |
| 5 | **AI_CLASSIFY_SYSTEM расширен** | +10 примеров разговорных форм: скушал, выпил кофе, побегал, поплавал, заплатил за такси и т.д. |
| 6 | **Баг: бесконечный цикл в боте** | Дедупликация по update_id через Note(zone='__tg_dedup'). Telegram retry → возвращаем 200 сразу. |
| 7 | **Баг: JSON в мимолётных мыслях** | storePending() больше не создаёт FleetingThought с JSON-payload. |
| 8 | **parseFoodEntry() — расширенный парсер еды** | Вариант B: 2 числа = вес+ккал/100г. Метрические единицы → пересчёт. БЖУ на 100г → пересчёт на порцию. Keywords: ел/ела/еда/съел/съела. |

---

## ⚠️ Требует внимания

| Проблема | Статус |
|----------|--------|
| 4 из 6 achievement-плиток (STREAK_7/30, GYM_10, WATER_WEEK) не выдаются бэкендом — видны только как locked | ❌ нужен backend |
| Telegram getFoodSummary() не показывает amount/БЖУ из новых полей FoodEntry | ❌ нужно обновить |
| Кнопки качества еды (🟢🟡🔴) в Telegram после записи блюда | ❌ не реализовано |

---

## Задачи — следующая сессия (по приоритету)

### 1. 🔴 Backend для недостающих ачивментов (30 мин)
Файл: `src/app/api/achievements/check/route.ts`

Добавить в массив `ACHIEVEMENTS` 4 новые проверки:
```typescript
{ code: 'STREAK_7',    label: '7 дней подряд',  emoji: '🔥', desc: 'Серия из 7 дней',          check: async (userId) => user.streak >= 7 && !existing }
{ code: 'STREAK_30',   label: 'Месяц силы',      emoji: '💎', desc: 'Серия из 30 дней',         check: async (userId) => user.streak >= 30 && !existing }
{ code: 'GYM_10',      label: 'Железный',        emoji: '💪', desc: '10 тренировок выполнено',  check: async (userId) => gymCount >= 10 && !existing }
{ code: 'WATER_WEEK',  label: 'Водный марафон',  emoji: '💧', desc: '7 дней норма воды',        check: async (userId) => 7 consecutive days water >= waterTarget && !existing }
```
- `check()` нужен доступ к userId и todayScore, добавить параметр `user: { streak: number }` в сигнатуру
- `WATER_WEEK`: проверить `fitnessDaily.water >= waterTarget` за последние 7 дней подряд

### 2. 🟡 Telegram: getFoodSummary + качество еды (30 мин)
Файл: `src/app/api/telegram/webhook/route.ts`

**getFoodSummary()** — обновить вывод:
```
🟢 Доширак (70г) — 308 ккал · Б11.9 Ж5.6 У37.8
```
- Если `entry.amount` → добавлять `(amount)`
- Если `entry.protein/fat/carbs` → добавлять `· Б X Ж X У X`

**Кнопки качества** после записи еды через текстовую команду:
- После `db.foodEntry.create()` отправлять keyboard:
  `[🟢 Отлично, 🟡 Нормально, 🔴 Срыв]` → callback `food_q_{id}_{good|neutral|bad}`
- callback handler: `db.foodEntry.update({ quality })`

### 3. 🟡 StatsScreen — лучшая неделя + средний балл (30 мин)
Файлы: `src/components/screens/StatsScreen.tsx`, `src/app/api/stats/history/route.ts`

- В API `/api/stats/history`: добавить `dayScore` в DayData (вызов `calcDayScore` для каждого дня, или упрощённая версия)
- В cards «Итого за N дней»: добавить плитку «Средний балл дня» (avg dayScore)
- В weeklySummary: найти неделю с наивысшим суммарным баллом → подсветить border/bg

### 4. 🟢 Telegram: кнопка «+ Сет» в сводке зала (45 мин)
Файл: `src/app/api/telegram/webhook/route.ts`

После списка упражнений добавить кнопку `[+ Добавить сет → {exercise.name}]`.
- callback `gym_addset_{exerciseId}` → ForceReply «Введи: вес × повторения (напр. 75x8)»
- pending `__type: 'gymSet'`, парсер `75x8` / `75 8` / `75` → db.gymExerciseSet.create
- Расширить `PendingPayload` типом `PendingGymSet`

### 5. 🟢 Telegram: «доширак» без ключевого слова (AI улучшение)
Сейчас при вводе `доширак 70 440` без `ел` — идёт в AI classify, который должен его поймать как food.
Убедиться что AI_CLASSIFY_SYSTEM имеет пример для числового формата без ключевого слова.
Добавить пример: `"доширак 70 440"` → food с weight_g=70, calories_per_100=440.

---

## Важные архитектурные детали

| Тема | Правило |
|------|---------|
| **update_id dedup** | Note(zone='__tg_dedup'), deleteMany старых при каждом новом → чистый KV |
| **storePending** | Только Note(zone='__tg_pending'). НЕ создавать FleetingThought — виден в приложении |
| **parseFoodEntry** | Поэтапный снос с конца: BJU → kcal → weight → name. Metric units → /100г. Count units → total |
| **ALL_ACHIEVEMENT_DEFS** | Хардкод в ProfileScreen. Backend выдаёт только коды которые знает. Новые плитки = sync |
| **Transaction.amount** | Положительный = доход, отрицательный = расход (нет поля type!) |
| **hidden_widgets** | Web-виджеты (без префикса) + tg-кнопки (`tg_gym`, `tg_food` и т.д.) |
| **БД** | Только Supabase PostgreSQL, Prisma ORM, без локальной БД |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor, файл в prisma/migrations/ |

---

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 8 * * *` | 08:00 | 11:00 | Supplement reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |
