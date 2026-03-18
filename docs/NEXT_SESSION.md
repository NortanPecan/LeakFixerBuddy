# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-18 (сессия 15 — стратегический обзор)
> Ветка: `claude/add-profile-achievements-px0DE`

---

## Последняя сессия (2026-03-18, сессия 15)

Аналитическая сессия — код не писали. Прошли через все фазы FEATURE_MAP.md, переосмыслили приоритеты с учётом AI-возможностей.

### Ключевые решения

| Решение | Детали |
|---------|--------|
| Telegram-first | Основной вектор: пользователь живёт в боте, web = аналитика + настройки |
| AI вместо rule-based корреляций | 3.3/3.4/3.5/3.8 не делать отдельно — один AI-запрос по 30 дням заменяет все |
| Тренеры → AI Coach | Вместо маркетплейса живых тренеров — `/тренер` в Telegram: AI отвечает по реальным данным |
| Trainer marketplace — скип | 4.4–4.6 — отдельный продукт, не входит в план |
| Journey остаётся скрытым | БД не трогаем, к идее AI-онбординга вернуться позже |
| Метод Харады/McKinsey — скип UI | Если делать — только как TG-диалог с AI-ведущим |
| ГИ еды / расчёт жира — AI в чате | Не нужна база данных, AI отвечает на конкретный вопрос |

---

## ⚠️ Остаётся из предыдущих сессий

| Проблема | Статус |
|----------|--------|
| Telegram `getFoodSummary()` не показывает `amount`/БЖУ из новых полей | ❌ нужно обновить |
| Кнопки качества еды (🟢🟡🔴) в Telegram после записи блюда | ❌ не реализовано |
| Применить `prisma/migrations/20260318_training_data_view.sql` в Supabase | ❌ ручной шаг |

---

## Задачи — следующая сессия (по приоритету)

### 1. 🔴 AI-резюме недели в Telegram (2–3 ч)

Каждый понедельник — краткий персональный AI-текст в Telegram.

**Что нужно:**
- `GET /api/ai/weekly-digest?userId=` — собирает 7 дней DayData + UserAiPattern → Groq → 3-4 предложения
- Кешируется в `ai_logs (callType='weekly_digest')` на 7 дней (один запрос в неделю)
- `POST /api/ai/weekly-digest` — batch-рассылка через Telegram sendMessage
- Новый cron в `vercel.json`: `0 7 * * 1` (понедельник 10:00 MSK)
- Формат: без markdown, эмодзи ок, конкретика из данных

**Пример ответа AI:**
```
📊 Неделя 10-16 марта: стрик вырос до 12 дней 🔥
Лучший день — среда (91/100), зал + все ритуалы.
Главный лик: срывы в еде по пятницам (3 из 4 недель).
На этой неделе попробуй: запланировать пятничный ужин заранее.
```

---

### 2. 🔴 Telegram — кнопка «+ Сет» в сводке зала (45 мин)

**Файл:** `src/app/api/telegram/webhook/route.ts`

- В `getGymSummary()` под каждым упражнением добавить кнопку `[+ Сет → {exercise.name}]`
- callback `gym_addset_{exerciseId}` → ForceReply: «Введи вес × повторения (напр. 75x8)»
- `pending {__type: 'gymSet', exerciseId}` → парсер `75x8` / `75 8` / `75` → `db.gymExerciseSet.create`
- Расширить `PendingPayload` типом `{ __type: 'gymSet', exerciseId: string }`

---

### 3. 🟡 AI Coach в Telegram — команда `/тренер` (1.5 ч)

**Файл:** `src/app/api/telegram/webhook/route.ts`

- Ключевые слова-триггеры: `/тренер`, `тренер `, `почему я`, `что делать с`
- Контекст: `buildLeakAnalysisMessage()` с расширенным промптом коуча
- Системный промпт: «Ты персональный коуч. Отвечай конкретно по данным пользователя. Не давай общих советов. Используй цифры из его статистики.»
- Логировать в `ai_logs (callType='tg_coach')`
- Ответ отправлять через `sendMessage` (не ForceReply, это не ввод данных)

---

### 4. 🟡 StatsScreen — лучшая неделя + средний балл (30 мин)

**Файлы:** `src/components/screens/StatsScreen.tsx`, `src/app/api/stats/history/route.ts`

- В `/api/stats/history`: добавить `dayScore: number` в каждый DayData (упрощённый calcDayScore)
- В cards «Итого за N дней»: плитка «Средний балл» (avg dayScore, цвет ≥75 зелёный / ≥50 жёлтый)
- В weeklySummary: найти неделю с наивысшим суммарным баллом → `ring-2 ring-green-500`

---

### 5. 🟢 AI-корреляции (30-дневные, одним запросом) (1 ч)

**Новый файл:** `src/app/api/ai/correlations/route.ts`

- `GET /api/ai/correlations?userId=` — 30 дней DayData[] → Groq → топ-5 паттернов
- Кешировать в `ai_logs (callType='correlations')` на 24 часа
- Ответ: `[{pattern: string, strength: 'strong'|'moderate', recommendation: string}]`
- Показывать в WeeklyReportScreen рядом с rule-based CorrelationInsights
- Постепенно заменяет ручные корреляции 3.3/3.4/3.5/3.8

---

## Откладываем (осознанно)

| Что | Почему |
|-----|--------|
| Telegram getFoodSummary + кнопки качества | Мелкое, можно в любой сессии. Приоритет ниже AI фич. |
| 2.4 «Как я изменился» страница | Хорошая идея, но сначала AI-резюме — оно важнее |
| Маркетплейс тренеров (4.4–4.6) | Отдельный продукт |
| ГИ еды, расчёт жира | AI в TG отвечает на вопрос без базы данных |
| Journey / 30-дневный курс | Скрыт, вернёмся когда будет пользователи |

---

## Архитектурные правила (актуальные)

| Тема | Правило |
|------|---------|
| **update_id dedup** | Note(zone='__tg_dedup'), deleteMany при каждом новом update |
| **storePending** | Только Note(zone='__tg_pending'). НЕ создавать FleetingThought |
| **parseFoodEntry** | Поэтапный снос с конца: БЖУ → ккал → вес → имя |
| **ALL_ACHIEVEMENT_DEFS** | Хардкод в ProfileScreen. Backend выдаёт только известные коды |
| **Transaction.amount** | + = доход, − = расход (нет поля type!) |
| **hidden_widgets** | Web-виджеты (без префикса) + tg-кнопки (`tg_gym`, `tg_food` ...) |
| **ai_logs callType** | `'analyze_leak'` / `'daily_tip'` / `'weekly_digest'` / `'tg_coach'` / `'correlations'` / `'tg_classify'` |
| **Telegram-first** | Новые AI фичи строить TG-first, web-UI добавлять потом |
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor, файл в `prisma/migrations/` |

---

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 7 * * 1` | 07:00 пн | 10:00 пн | **AI-резюме недели** (добавить!) |
| `0 8 * * *` | 08:00 | 11:00 | Supplement reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |
