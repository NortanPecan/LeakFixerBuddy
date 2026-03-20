# Codex Next Chat - рабочий handoff

> Обновлено: 2026-03-20
> Назначение: быстрый вход в следующий чат Codex без повторного аудита всего проекта

---

## Что читать в новом чате

1. `CLAUDE.md`
2. `docs/CODEX_NEXT_CHAT.md`
3. `docs/LEAKS_MODULE_CONTEXT.md`
4. `docs/LEAKS_DEV_ROADMAP.md`
5. `docs/LEAKS_RAW_NOTES.md`

Если нужен широкий продуктовый контекст, потом уже смотреть `docs/FEATURE_MAP.md`.

---

## Главное правило на сейчас

- Не продолжать старый `security-rollout`
- Текущий активный продуктовый фокус: отдельный модуль `Leaks`
- Работать вокруг `Leaks` как вокруг нового ядра продукта внутри приложения

---

## Что такое Leaks

`Leaks` - это отдельный модуль внутри LeakFixerBuddy, который должен:

1. принимать ручные лики и наблюдения;
2. подтягивать сигналы из данных;
3. превращать их в структурированную проблему;
4. предлагать `minimum / base / maximum`;
5. конвертировать решение в реальные сущности приложения;
6. учиться на фидбеке пользователя.

Связка по продукту:

- `Wellbeing` замечает фон и скрытые паттерны
- `Leaks` формулирует проблему и ведёт к исправлению
- `AI` помогает разобрать и предложить варианты
- задачи / ритуалы / челленджи / навыки / качества дают execution layer

---

## Текущий статус модуля

У `Leaks` уже есть:

- отдельный экран;
- навигационная точка;
- quick capture;
- сущность `Leak` в Prisma;
- `Signals`;
- `Patterns`;
- `minimum / base / maximum` plans;
- whole-plan apply;
- per-action apply;
- feedback loop;
- feedback comments;
- conversion history;
- editing title / description;
- sphere classification;
- anti-duplicate flow для `Signals` и `Patterns`;
- search + source filters в inbox.

То есть модуль уже не прототип, а плотный рабочий контур.

---

## Что уже дополнительно поправлено

- `Leaks` теперь должен быть виден не только через top menu и quick search, но и через основной bottom nav;
- дефолтный набор навигации обновлён, чтобы новый модуль не терялся;
- для пользователей со старым дефолтным набором nav добавлена мягкая миграция persisted navigation;
- `docs/CODEX_NEXT_CHAT.md` переведён на актуальный handoff по `Leaks`, а не по security.
- В `LeaksScreen` улучшены пустые состояния inbox: отдельно для настоящего empty state и отдельно для ситуации, когда всё спрятали фильтры.
- У карточки leak появился блок `Следующий шаг`: он показывает выбранный режим, прогресс по действиям и подсказывает лучший следующий ход.
- Быстрые конвертации `в задачу / в ритуал / в AI-челлендж` убраны из верхнего ряда кнопок внутрь деталей leak, чтобы уменьшить визуальный шум.
- Добавлен явный retry/reopen flow: по неудачному feedback можно пересобрать режим, а закрытый leak проще вернуть в работу.
- Исправлена битая кодировка в user-facing навигации (`BottomNav`) и нескольких API-сообщениях.
- Добавлен `npm run check:encoding`, и теперь `npm run lint` сначала валит сборку на типичных mojibake-последовательностях битой кириллицы и сломанных emoji.
- Добавлен git hook `.githooks/pre-commit`, который гоняет `scripts/check-encoding-staged.ps1` перед коммитом.
- Добавлен git hook `.githooks/pre-push`, который гоняет `scripts/check-prepush.ps1`: encoding + `eslint` только по файлам, которые реально уходят в push.

---

## Ключевые файлы

### Документация

- `docs/LEAKS_MODULE_CONTEXT.md`
- `docs/LEAKS_DEV_ROADMAP.md`
- `docs/LEAKS_RAW_NOTES.md`
- `docs/CODEX_NEXT_CHAT.md`

### UI

- `src/components/screens/LeaksScreen.tsx`
- `src/components/QuickSearch.tsx`
- `src/components/BottomNav.tsx`
- `src/components/TopNav.tsx`
- `src/components/screens/SettingsScreen.tsx`

### API

- `src/app/api/leaks/route.ts`
- `src/app/api/leaks/[leakId]/plans/route.ts`
- `src/app/api/leaks/[leakId]/convert/route.ts`
- `src/app/api/leaks/[leakId]/feedback/route.ts`

### AI / helpers

- `src/lib/ai-leak-plan.ts`
- `src/lib/server-auth.ts`
- `src/lib/store.ts`

### Prisma

- `prisma/schema.prisma`
- `prisma/migrations/20260319_leaks_module.sql`
- `prisma/migrations/20260320_leak_action_links.sql`
- `prisma/migrations/20260320_leak_solution_plans.sql`
- `prisma/migrations/20260320_leak_feedback.sql`

---

## Последние коммиты по Leaks

- `ad723a0` Add inbox search and source filters to leaks
- `85d90a2` Add feedback comments to leak actions
- `f7089ef` Avoid duplicate leaks from signals and patterns
- `936b686` Allow editing leaks in place
- `d017147` Add sphere classification to leaks
- `47a8a87` Allow applying leak plan actions individually
- `5f025e5` Turn learned patterns into leaks
- `96ea035` Tighten leak feedback learning loop
- `e8d3079` Add quick leak capture
- `4e05320` Add leak plan feedback
- `de05813` Convert selected leak plans
- `06b0867` Add leak solution plans
- `868a1e9` Track leak action links
- `165dc43` Add leak conversion actions
- `71242c2` Add leaks phase 2 foundation
- `3a591f0` Add initial leaks module

---

## Что уже подтверждено по коду

### 1. Capture

- leak можно создать из самого экрана;
- leak можно создать из `QuickSearch`;
- signal можно сохранить как leak;
- pattern можно превратить в `ai_suggested` leak.

### 2. Lifecycle

- у leak есть `new / in_progress / resolved / archived`;
- статус меняется из UI;
- title и description можно редактировать прямо в карточке;
- sphere можно задать при создании и поменять позже.

### 3. Planning

- для leak можно собрать `minimum / base / maximum`;
- можно выбрать режим;
- можно применить весь режим;
- можно применить одно действие из режима отдельно.

### 4. Conversion layer

План умеет создавать:

- `task`
- `ritual`
- `challenge`
- `content`
- `skill`
- `trait`

И эти связи сохраняются через `LeakActionLink`.

### 5. Learning loop

- по применённому действию можно дать feedback;
- feedback поддерживает:
  - `worked`
  - `partially`
  - `not_worked`
- есть короткий comment;
- `whatWorked` обновляется в обе стороны;
- `Patterns` обновляются после feedback.

### 6. Inbox management

- есть status filter;
- есть source filter;
- есть text search;
- есть защита от части дублей из signals / patterns.

---

## Что не нужно делать заново

- не возвращаться к старому большому security-аудиту;
- не пересобирать заново доменную модель `Leak`;
- не откатывать последние продуктовые правки;
- не делать новую миграцию без реальной необходимости;
- не трогать массово unrelated dirty files в репо.

В рабочем дереве могут быть чужие незакоммиченные изменения. Работать точечно и коммитить только свои файлы.

---

## Что проверять перед новой работой

1. Прочитать `CLAUDE.md`
2. Прочитать этот handoff
3. Открыть:
   - `docs/LEAKS_DEV_ROADMAP.md`
   - `src/components/screens/LeaksScreen.tsx`
4. Посмотреть последние leaks-коммиты через `git log --oneline`

Этого достаточно, чтобы быстро продолжать.

---

## Следующие приоритеты

Если продолжать `Leaks`, лучший следующий порядок такой:

1. Добивать UX-цельность модуля
   - лучшее empty state
   - clearer CTA
   - меньше визуального шума в карточке

2. Улучшать execution loop
   - понятнее показывать, что уже создано
   - лучше связывать feedback с созданными сущностями
   - добавить reopen / retry flow по action level

3. Усиливать learning layer
   - лучше показывать, что именно уже помогало
   - связывать patterns и active leaks ещё очевиднее
   - улучшать explanation вокруг confidence / why this plan

4. Потом уже идти в более глубокие продуктовые шаги
  - richer leak details
  - better AI explanations
  - deeper context from other modules

### Точка остановки на сейчас

- discoverability и кодировка user-facing навигации уже поправлены;
- `LeaksScreen` стал понятнее в моменте:
  - есть directed empty states;
  - есть блок `Следующий шаг`;
  - есть retry / reopen flow;
  - быстрые конвертации перенесены внутрь деталей leak;
- следующий лучший продуктовый шаг:
  - добить execution loop до совсем ясного состояния;
  - показать связь `leak -> выбранный режим -> созданные сущности -> feedback` ещё нагляднее;
  - добавить более явный reopen / retry UX именно на уровне action history и created entities;
  - потом углублять learning layer и context snapshot.

---

## Длинный backlog для следующего чата

Если нужен длинный автономный проход по `Leaks`, вот нормальный backlog без возврата к старому security-фокусу.

### P0: discoverability и целостность модуля

- проверить, что `Leaks` видно в `BottomNav`, `TopNav`, `QuickSearch` и настройке навигации;
- убедиться, что старые сохранённые nav-настройки не скрывают модуль у пользователей после обновления;
- проверить все переходы `screen='leaks'`, чтобы не было тупиков назад;
- проверить mobile UX: длинные карточки, fixed bottom nav, safe-area, скролл в деталях;
- проверить, нет ли дублей CTA между `Signals`, `Patterns`, `Inbox`.

### P0: execution loop

- сделать понятнее путь `leak -> plan -> action -> feedback`;
- визуально показать, какой plan сейчас выбран;
- после apply action яснее показывать, что именно уже создано;
- добавить явный reopen flow для `resolved` leak;
- добавить retry flow для неудачных действий;
- сделать ясный пустой state для пользователя без leaks;
- сделать ясный пустой state для пользователя без signals / patterns.

### P1: quality of plans

- улучшить генерацию `minimum / base / maximum`, чтобы планы сильнее отличались по нагрузке;
- добавить короткое summary у каждого плана;
- добавить explanation, почему этот план подходит под leak;
- лучше показывать разницу между plan-level apply и per-action apply;
- подумать над soft guard, чтобы один и тот же action не создавался повторно слишком легко.

### P1: learning layer

- показывать, какие действия уже реально срабатывали по похожим leaks;
- сделать заметнее feedback history по leak;
- улучшить связь между `Patterns` и реальными успешно закрытыми leaks;
- добавить “что помогло раньше” в details leak;
- добавить explanation, откуда взялся pattern и почему он surfaced.

### P1: data and context

- подтягивать больше контекста в leak details:
  - настроение
  - энергия
  - еда
  - вода
  - тренировки
  - check-ins
- проверить, какие из этих данных уже доступны без новых миграций;
- аккуратно добавить context snapshot, не перегрузив карточку.

### P1: inbox management

- добавить сортировки для inbox;
- подумать над pin / focus для самых важных leaks;
- добавить более явные статусы `new / in_progress / resolved / archived` в UI;
- улучшить поиск по сфере и описанию;
- подумать, нужен ли grouped view по сфере или по источнику.

### P2: productization

- связать `Wellbeing` и `Leaks` более явно в UI;
- показывать suggestion “создать leak” из wellbeing / pattern-сигнала;
- подготовить путь для будущего `passive detection + active capture`;
- подумать над импортом заметок / мыслей в leak inbox;
- подготовить место под будущие user-contributed solutions.

### P2: polish и trust

- улучшить микрокопирайтинг вокруг leaks, чтобы модуль звучал понятно и не слишком абстрактно;
- проверить, где wording сейчас слишком технический;
- проверить, где user-facing тексты не объясняют следующий шаг;
- сделать аккуратнее success / error states после apply и feedback;
- посмотреть, где модуль всё ещё ощущается “инженерным”, а не продуктовым.

---

## Миграции

На последнем участке новые миграции не добавлялись.

Текущий модуль уже опирается на существующие миграции:

- `20260319_leaks_module.sql`
- `20260320_leak_action_links.sql`
- `20260320_leak_solution_plans.sql`
- `20260320_leak_feedback.sql`

Если в следующем чате снова пойдут изменения только по UI / UX и локальной логике модуля, новая миграция, скорее всего, не нужна.

---

## Проверка

Обычная локальная проверка на текущем этапе:

- точечный `eslint` по изменённым файлам
- перед завершением UI-правок не пропускать `npm run check:encoding`
- если hook перестал срабатывать, проверить `git config core.hooksPath .githooks`
- перед пушем можно вручную повторить то же поведение через `npm run check:prepush`

Не надо без причины гонять весь проектный lint, если задача локальная.

---

## Рекомендуемый стартовый prompt для следующего чата

`Прочитай CLAUDE.md и docs/CODEX_NEXT_CHAT.md. Продолжай leaks-модуль с текущего состояния без возврата к security-rollout. Сначала быстро проверь docs/LEAKS_DEV_ROADMAP.md и src/components/screens/LeaksScreen.tsx, потом вноси следующие продуктовые правки.`
