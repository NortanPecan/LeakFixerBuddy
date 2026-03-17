# Next Session — Текущее состояние и задачи

> Обновлено: 2026-03-17 (сессия 11)
> Ветка: `claude/ai-recommendations-feedback-TlDoh`

---

## Последняя сессия (2026-03-17, сессия 11)

### ✅ Сделано

| # | Задача | Детали |
|---|--------|--------|
| 1 | **PATCH /api/ai/analyze-leak** | Фидбек по решению: `{ userId, leakType, solutionText, worked }` → пишет в `triedSolutions[].worked` и `whatWorked` |
| 2 | **GET /api/ai/recommendations** | Новый endpoint — свежайший `UserAiPattern` пользователя за 7 дней |
| 3 | **LeakAiAnalysisCard — «📋 Добавить в задачи»** | Все 3 решения → POST /api/tasks, zone 'LeakFixer', дата из дедлайна AI |
| 4 | **LeakAiAnalysisCard — фидбек ✅/❌** | Кнопки под каждым решением, оптимистичное обновление UI |
| 5 | **HomeScreen виджет «💡 AI Рекомендации»** | Тип лика + топ-решение + кнопка «Все» → WeeklyReport, скрывается через hiddenWidgets |
| 6 | **ProfileScreen** | Переключатель «AI Рекомендации» в разделе «Виджеты» |

---

## ⚠️ Требует внимания

| Проблема | Статус |
|----------|--------|
| Supplement reminder использует `ritualReminders` вместо своего флага | ❌ не починено |
| Telegram кнопки «Сон/Вес/Настроение/Энергия» только показывают, не дают ввести | ❌ нет ForceReply flow |

---

## Задачи — следующая сессия (по приоритету)

### 1. 🔴 Supplement reminder — отдельный флаг (30 мин)
Сейчас `send-supplement-reminder` проверяет `ritualReminders`. Нужен отдельный флаг:
- `prisma/schema.prisma`: `supplementReminders Boolean @default(true)`
- `prisma/migrations/20260317_supplement_reminders.sql` → применить в Supabase SQL Editor
- `SettingsScreen.tsx`: Switch «Напоминание о БАДах»
- `send-supplement-reminder/route.ts`: `where: { supplementReminders: true }`

### 2. 🟡 StatsScreen — выбор периода 7д/14д/30д/90д (1 час)
Сейчас `?days=30` и `last14Days` захардкожено.
- State `periodDays: 7 | 14 | 30 | 90` + кнопки-переключатели
- API `?days=N`, пересчёт chart и averages
- Файлы: `StatsScreen.tsx`, `/api/stats/history/route.ts`

### 3. 🟡 Ачивменты за оценку дня (2 часа)
Таблица `Achievement` уже есть в Prisma schema.
- Триггеры: первый 80+ → badge «Отличный день», 7 дней подряд 70+ → badge «Неделя качества»
- `POST /api/achievements/check` — проверка при каждом сохранении оценки
- UI: popup при выдаче + список в ProfileScreen

### 4. 🟢 Telegram ForceReply для ввода данных (1.5 часа)
Кнопки «Сон», «Вес», «Настроение», «Энергия» должны запрашивать значение:
- Нажал кнопку → бот отвечает `ForceReply` «Введи часы сна:»
- Пользователь отвечает числом → записывается как reply на то сообщение
- Хранить `pendingAction` в `fleeting_thoughts` (TTL 5 мин)
- Файл: `webhook/route.ts` — проверять `message.reply_to_message`

### 5. 🟢 DailySummaryScreen — кнопка «Поделиться» оценкой (30 мин)
Текст: `📊 Мой день: 83/100 — Отличный! 💧100% 🍽️1800ккал ✅4/5 ритуалов`
→ `navigator.clipboard.writeText()` или `window.open('tg://msg?text=...')`
Файл: `src/components/screens/DailySummaryScreen.tsx`

---

## Telegram bot — полный список команд (v4, 13 команд)

| Команда | Действие |
|---------|---------|
| `вода 500` | +500 мл к воде дня |
| `вес 74.5` | замер веса |
| `настроение 8` | mood 1–10 |
| `энергия 7` | energy 1–10 |
| `ел пицца 800` | food entry |
| `зал 60` | gym workout |
| `задача купить хлеб` | task |
| `ритуалы` | отметить все выполненными |
| `сон 8` | sleepHours |
| `сводка` | мини-итоги дня |
| `доход 5000 зарплата` | income transaction |
| `расход 500 кофе` | expense transaction |
| `лик [текст]` | AI-анализ лика (Groq/Gemini) |
| `помощь` / `/start` / `меню` | список команд + inline keyboard |

## Telegram inline keyboard — 11 кнопок

| Кнопка | callback_data | Что показывает |
|--------|--------------|----------------|
| 💪 Зал | btn_gym | Тренировка дня: упражнения Nх12хWкг(next) 🏆 |
| 🍽️ Питание | btn_food | Список приёмов 🟢🟡🔴 + ккал |
| 💧 Вода | btn_water | Прогресс + кнопки +200/+350/+500 |
| ✅ Ритуалы | btn_rituals | ✅/⬜ список + «Отметить все» |
| 😴 Сон | btn_sleep | Текущий сон + подсказка |
| ⚖️ Вес | btn_weight | Последний замер + подсказка |
| 😊 Настроение | btn_mood | Настроение + энергия + сон |
| ⚡ Энергия | btn_energy | То же что btn_mood |
| 💰 Финансы | btn_finance | Баланс месяца |
| 📊 Сводка | btn_summary | Полная сводка дня |
| 📋 Задачи | btn_tasks | Список задач ✅/⬜ |
| ⚙️ Настройки | btn_settings | Toggle вкл/выкл каждой кнопки |

**Настройки кнопок:** хранятся в `user_settings.hidden_widgets` как `["tg_gym", "tg_food", ...]`

---

## Vercel Cron (актуальное расписание)

| Cron | UTC | MSK | Что делает |
|------|-----|-----|-----------|
| `0 3 * * *` | 03:00 | 06:00 | Очистка fleeting thoughts |
| `0 6 * * *` | 06:00 | 09:00 | Утренний checkin reminder |
| `0 8 * * *` | 08:00 | 11:00 | Supplement reminder |
| `0 16 * * *` | 16:00 | 19:00 | Ritual reminder |
| `0 17 * * *` | 17:00 | 20:00 | Вечерний checkin reminder |

---

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | `claude/ai-recommendations-feedback-TlDoh` |
| **Lint** | `bun run lint` перед коммитом (0 ошибок) |
| **Миграции** | Вручную в Supabase SQL Editor |
| **Transaction.amount** | Положительный = доход, отрицательный = расход (нет поля type!) |
| **Supplement reminder** | Пока использует `ritualReminders` — нужен отдельный флаг (задача #1) |
| **hidden_widgets** | Хранит web-виджеты (`weight`, `ai_recommendations` и т.д.) и tg-кнопки (`tg_gym` и т.д.) |
| **PATCH /api/ai/analyze-leak** | Фидбек — в том же route что POST/GET, не отдельный файл |
| **Фидбек → следующий анализ** | `analyzeLeakWithAI()` уже передаёт `pastPatterns` (triedSolutions + whatWorked) в промпт — автоматически |
| **LeakAiAnalysisCard дедлайн** | `deadlineToDate()` парсит текст AI: регулярка на цифры + ключевые слова, fallback +7 дней |
