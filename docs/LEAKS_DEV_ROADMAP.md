# Leaks Dev Roadmap

Обновлено: 2026-03-19

## Что уже сделано

Первый вертикальный срез `Leaks` уже добавлен в приложение:
- отдельный экран;
- отдельная навигационная точка;
- быстрый capture;
- `Inbox` через `notes(zone=leaks)`;
- `Signals` через `weekly-report`;
- `Patterns` через `user_ai_patterns`;
- AI-разбор через существующий `LeakAiAnalysisCard`.

Это хороший `v0/v1 foundation`, но ещё не полноценная leak-система.

## Текущий статус фазы

`Phase 2 foundation` уже начат в коде:
- в Prisma добавлена сущность `Leak`;
- добавлен API-контур `/api/leaks`;
- экран `Leaks` переведён с `notes(zone=leaks)` на новую leak-сущность;
- из карточки лика уже можно создать задачу, ритуал и AI-челлендж;
- сигнал из weekly data уже можно сохранить как отдельный leak;
- подготовлена SQL-миграция и backfill из старых leak-notes.

Чтобы это заработало полностью в реальной БД, нужно вручную применить:
- `prisma/migrations/20260319_leaks_module.sql`

Локально Prisma client не был перегенерирован в этой сессии из-за сетевого ограничения на скачивание Prisma engine.

## Цель модуля

Сделать отдельный модуль, который:
1. принимает ручные лики и наблюдения;
2. подтягивает автоматические сигналы из данных;
3. превращает их в структурированную проблему;
4. предлагает реалистичные варианты решения;
5. конвертирует решение в сущности приложения;
6. учится на реальном фидбеке.

## Границы v1, v2, v3

### V1

Отдельный модуль внутри текущего приложения без радикальной перестройки всей архитектуры.

### V2

Нормальная сущность `Leak`, статусы, история, решения, связь с контекстом и исполнением.

### V3

Персональное обучение, AI control layer, контент-адаптация, прогнозы, голос.

---

## Phase 1 — Stabilize Module

Цель: довести уже добавленный модуль до хорошего рабочего состояния без миграции ядра продукта.

### Deliverables

- Улучшить экран `Leaks`.
- Доделать UX вокруг `Inbox / Signals / Patterns`.
- Добавить быстрые продуктовые связи с существующими экранами.
- Подготовить почву под отдельную сущность `Leak`.

### UI backlog

- Показать пустые состояния понятнее:
  - что такое leaks;
  - как ими пользоваться;
  - что появится после первых данных.
- Добавить кнопки:
  - `создать задачу`;
  - `создать ритуал`;
  - `добавить в челлендж`;
  - `сохранить как важное`.
- Добавить быстрые фильтры:
  - все;
  - новые;
  - уже разобранные;
  - сработало;
  - не сработало.
- Добавить небольшой onboarding внутри модуля.
- Добавить shortcut на home позже, но не перегружать home сразу.

### API backlog

Пока без новой миграции:
- использовать `GET /api/notes?zone=leaks`;
- использовать `POST /api/notes`;
- использовать `GET /api/weekly-report`;
- использовать `GET /api/ai/patterns`;
- использовать `POST/PATCH/GET /api/ai/analyze-leak`.

### Tech debt backlog

- Вынести shared типы leak-модуля в отдельный файл.
- Убрать дубли логики между weekly-report и leaks screen.
- Добавить единый helper для `currentMonday`.
- Привести названия:
  - `leak hint`
  - `pattern`
  - `manual leak`
  чтобы в коде не путались уровни.

### Exit criteria

- Пользователь понимает, куда писать лик.
- Пользователь может сохранить лик и разобрать его.
- Пользователь видит автоматические сигналы отдельно от ручных ликов.
- Пользователь видит историю того, что уже анализировалось.

---

## Phase 2 — Real Leak Entity

Цель: перестать использовать `notes(zone=leaks)` как временный inbox и сделать нормальную доменную модель.

### Нужна миграция БД

Да. На этом этапе уже нужна новая таблица.

### Предлагаемая модель

`Leak`
- `id`
- `userId`
- `title`
- `description`
- `source`
  - `manual`
  - `signal`
  - `imported`
  - `ai_suggested`
- `status`
  - `new`
  - `in_progress`
  - `resolved`
  - `archived`
- `severity`
  - `info`
  - `warning`
  - `critical`
- `sphere`
  - work
  - body
  - relationships
  - mindset
  - finance
  - poker
  - custom
- `contextSnapshot` JSON
- `signalIds` JSON или relation позже
- `createdAt`
- `updatedAt`
- `resolvedAt`

`LeakSolutionPlan`
- `id`
- `leakId`
- `mode`
  - `minimum`
  - `base`
  - `maximum`
- `summary`
- `confidenceLabel`
  - `low`
  - `medium`
  - `high`
- `confidenceReason`
- `createdAt`

`LeakSolutionAction`
- `id`
- `planId`
- `kind`
  - `task`
  - `ritual`
  - `skill`
  - `trait`
  - `challenge`
  - `content`
- `title`
- `description`
- `payload` JSON
- `order`

`LeakFeedback`
- `id`
- `leakId`
- `solutionActionId`
- `result`
  - `worked`
  - `partially`
  - `not_worked`
- `comment`
- `createdAt`

### Миграция

Нужны файлы:
- `prisma/schema.prisma`
- `prisma/migrations/YYYYMMDD_leaks_module.sql`

### API backlog

- `GET /api/leaks`
- `POST /api/leaks`
- `PATCH /api/leaks/:id`
- `GET /api/leaks/:id`
- `POST /api/leaks/:id/analyze`
- `POST /api/leaks/:id/plan`
- `POST /api/leaks/:id/feedback`
- `POST /api/leaks/:id/convert`

### UI backlog

- Список ликов.
- Карточка лика.
- Статусы.
- История изменений.
- Разбор сигнала в отдельный leak.
- Ручной leak как first-class entity.

### Exit criteria

- `Leak` больше не живёт как обычная note.
- Есть нормальный lifecycle.
- Есть связь между проблемой, планом и исполнением.

---

## Phase 3 — Minimum / Base / Maximum

Цель: перейти от “одного AI-совета” к адаптивным сценариям решения.

### Что появляется

Для каждого лика AI генерирует 3 режима:
- `minimum`
- `base`
- `maximum`

Каждый режим содержит:
- краткую логику;
- список действий;
- примерный шанс срабатывания;
- почему этот режим подходит или не подходит.

### Conversion layer

План должен раскладываться в сущности продукта:
- задачи;
- ритуалы;
- навыки;
- качества;
- челленджи;
- материалы.

### UX backlog

- сравнение трёх режимов на одном экране;
- выбор плана под реальную жизнь пользователя;
- объяснение trade-offs;
- возможность смешать план вручную.

### Exit criteria

- Пользователь не получает абстрактный совет.
- Пользователь получает понятный набор действий.
- Пользователь может выбрать реалистичный режим, а не “идеальный”.

---

## Phase 4 — Context Engine

Цель: связать leak-модуль с остальным приложением по-настоящему.

### Контекст, который надо подтягивать

- настроение;
- энергия;
- wellbeing;
- checkins;
- сон;
- еда;
- вода;
- тренировки;
- ритуалы;
- задачи;
- заметки;
- finance при необходимости;
- сферы вроде покера или работы через manual tagging.

### Что должен делать engine

- объяснять, почему AI так думает;
- показывать подозреваемые факторы;
- не утверждать ложную причинность;
- различать:
  - наблюдение;
  - гипотезу;
  - подтверждённый пользовательский паттерн.

### Exit criteria

- Leak больше не висит “в вакууме”.
- Пользователь видит связанный контекст.

---

## Phase 5 — Learning Loop

Цель: чтобы система становилась персональной.

### Что нужно

- фидбек `worked / partially / not_worked`;
- сохранение пользовательских ручных решений;
- переиспользование удачных решений;
- ранжирование того, что чаще работает именно у этого человека.

### Дополнительно

- различать:
  - общие AI-рекомендации;
  - пользовательские решения;
  - решения, подтверждённые данными;
  - решения, популярные у похожих людей.

### Exit criteria

- Повторные рекомендации реально улучшаются.
- Система учитывает прошлый опыт человека.

---

## Phase 6 — AI Control Layer

Цель: дать управлять приложением через чат и естественный язык.

### Примеры

- `создай leak`
- `разбери этот лик`
- `сделай минимальный план`
- `создай ритуал`
- `добавь задачу`
- `сегодня вес 74.5`
- `сегодня была ходьба`
- `переставь модули`

### Требования

- сначала confirm на важные действия;
- логировать, что AI понял;
- иметь fallback, если понял неуверенно.

### Exit criteria

- Пользователь может управлять leak-модулем без ощущения, что заполняет CRM.

---

## Phase 7 — Content Adaptation

Цель: адаптация книги, курса, видео или системы под leak-подход.

### Что импортируется

- книга;
- видео;
- курс;
- методика;
- личная система пользователя.

### Что получается

- набор ликов/целей;
- план минимум/база/максимум;
- связанные ритуалы/задачи/навыки;
- недельный маршрут внедрения.

### Важно

Это не P0. Делать только после сильного leak engine.

---

## Phase 8 — Prediction Layer

Цель: прогнозы без фальшивой магии.

### Что прогнозируем

- энергию;
- настроение;
- риск срыва;
- вероятность хорошей недели;
- вероятность повторения конкретного лика.

### Как показывать

- не “обещание”;
- а вероятность + факторы.

### Exit criteria

- Прогнозы выглядят полезными, а не выдуманными.

---

## Что делать следующим коммитом

Если идти строго по приоритету, следующий хороший инженерный шаг такой:

1. Добавить доменную модель `Leak` в Prisma.
2. Сделать `GET/POST /api/leaks`.
3. Перевести `Inbox` с `notes(zone=leaks)` на новую сущность.
4. Добавить статусы `new / in_progress / resolved / archived`.
5. Дать пользователю менять статус прямо в UI.

Это будет первый настоящий шаг от `v1 foundation` к реальному продукту.

## Update 2026-03-20

- Added `LeakActionLink` as a separate relation for task / ritual / challenge conversions.
- `/api/leaks` now returns action links and can append a new link during leak updates.
- `LeaksScreen` now shows leak details, context snapshot, and created actions.
- Conversion buttons are protected from duplicate creation for the same leak/action type.
- Added SQL migration:
  - `prisma/migrations/20260320_leak_action_links.sql`
- Phase 3 foundation started:
  - added `LeakSolutionPlan` and `LeakSolutionAction`
  - added `/api/leaks/[leakId]/plans`
  - `LeaksScreen` can now build and select `minimum / base / maximum` plans
  - selected plan can now be converted into real product entities through `/api/leaks/[leakId]/convert`
  - added `LeakFeedback` and `/api/leaks/[leakId]/feedback`
  - applied plan actions can now collect `worked / partially / not_worked` feedback
  - added SQL migration:
    - `prisma/migrations/20260320_leak_solution_plans.sql`
    - `prisma/migrations/20260320_leak_feedback.sql`
  - QuickSearch can now create a manual leak directly through `POST /api/leaks`
  - leak action link validation now supports `content`, `skill`, and `trait`
  - feedback now updates `whatWorked` in both directions, so old successes do not stay stuck after a downgrade
  - `LeaksScreen` updates the Patterns tab immediately after saving action feedback
  - patterns are no longer a dead end: a learned pattern can now be turned into an `ai_suggested` leak
  - selected plans can now be applied action-by-action, not only as a whole bundle
  - leaks now support fast sphere classification during capture and quick sphere reassignment in details
