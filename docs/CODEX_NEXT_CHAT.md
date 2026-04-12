# Codex Next Chat - рабочий handoff

> Обновлено: 2026-04-12 (Hermes Agent аудит)
> Назначение: быстрый вход в следующий чат без повторного аудита

---

## Что читать в новом чате

1. `AGENTS.md` — краткий контекст проекта
2. `docs/NEXT_SESSION.md` — текущие задачи и приоритеты
3. `docs/FEATURE_MAP.md` — полная карта фич со статусами
4. `CLAUDE.md` — подробные правила и паттерны

---

## Главное правило на сейчас

- Продуктовый фокус: модуль `Leaks` как ядро продукта
- Telegram-first для новых AI фич
- Агент работает автономно, Женя смотрит результаты

---

## Текущий статус модуля Leaks

Полный рабочий контур:
- Capture (manual + signals + patterns)
- Lifecycle (new / in_progress / resolved / archived)
- Planning (minimum / base / maximum)
- Conversion (task / ritual / challenge / content / skill / trait)
- Feedback loop (worked / partially / not_worked + comments)
- Inbox management (search + source filters + anti-duplicate)
- Policy engine (funnels, context drift, cluster learning)

**Что осталось UX-wise:**
- Доделать Phase 1: свернуть фильтры, снизить приоритет Signals/Patterns
- Phase 2: execution loop — понятнее показывать leak -> plan -> action -> feedback

---

## Ключевые файлы

### UI
- `src/components/screens/LeaksScreen.tsx` — 10 000+ строк (стоит рефакторить)

### API
- `src/app/api/leaks/` — все leaks endpoints
- `src/app/api/ai/` — все AI endpoints (patterns, correlations, weekly-digest, daily-tip)
- `src/app/api/telegram/webhook/route.ts` — 2600+ строк, весь Telegram бот

### AI / helpers
- `src/lib/ai-provider.ts` — Groq + Gemini fallback
- `src/lib/ai-leak-plan.ts` — генерация планов
- `src/lib/ai-leak-prompts.ts` — промпт-билдер
- `src/lib/leak-policy.ts` — policy engine
- `src/lib/store.ts` — Zustand store

### Prisma
- `prisma/schema.prisma`
- `prisma/migrations/` — 4 миграции для leaks

---

## Миграции

Применённые:
- `20260319_leaks_module.sql`
- `20260320_leak_action_links.sql`
- `20260320_leak_solution_plans.sql`
- `20260320_leak_feedback.sql`

⚠️ Не применена: `20260318_training_data_view.sql` — проверить нужна ли

---

## Что не нужно делать заново

- Не возвращаться к security-rollout
- Не пересобирать доменную модель Leak
- Не делать новую миграцию без необходимости
- Не пушить в main без разрешения

---

## Стартовый prompt для следующего чата

`Прочитай AGENTS.md и docs/NEXT_SESSION.md. Продолжай с текущего состояния. Сначала проверь git log --oneline -5, потом бери первую приоритетную задачу из NEXT_SESSION.md.`
