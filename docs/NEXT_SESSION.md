# Next Session Prompt

Скопируй этот промпт в начало каждого нового чата:

---

## 🚀 START PROMPT (copy this)

```
Работаем над проектом LeakFixerBuddy.

ПУТЬ К ПРОЕКТУ: /home/z/my-project

ОБЯЗАТЕЛЬНО прочитай перед работой:
1. docs/NEXT_SESSION.md — текущее состояние
2. docs/BUG_ANALYSIS.md — детальный анализ 23 багов
3. docs/AGENT_INSTRUCTIONS.md — правила

КРИТИЧЕСКИ:
- ВЕТКА: только main
- БД: ТОЛЬКО Supabase PostgreSQL (локальной БД нет!)
- Git: Не делаю команды сам
- Push: разрешён без force

ИСПРАВЛЕНО 24 из 24 багов:
✅ F-1: Duplicate accounts
✅ F-2: Can't delete account
✅ F-3: Currency selection (RUB/USD/EUR + custom)
✅ F-4: Categories not visible
✅ F-5: Can't edit transactions
✅ F-6: Can't edit accounts
✅ F-7: Initial balance in edit
✅ F-8: Account history + period filter
✅ T-1: Date initialization
✅ T-2: Creates on previous date
✅ T-3: Checkbox not working
✅ C-1: Can't clear number field
✅ C-2: Add ritual connection hint
✅ ST-1: Remove Steam references
✅ R-1: Rituals duplicate from note
✅ R-2: Rituals can't delete (already had archive)
✅ R-3: Rituals tags cause duplicates
✅ FD-1: Food can't edit
✅ FD-2: Food time tracking
✅ Z-1: Zones CRUD
✅ Z-2: Hide inactive zones (Steam removed)
✅ #11: Notes edit links + shorten ritual title
✅ #16: Custom account types
✅ #19: Custom meal types

🎉 ВСЕ БАГИ ИСПРАВЛЕНЫ!

SCHEMA UP TO DATE:
- Account.currency — ✅ уже в схеме (default RUB)
- FoodEntry.time — ✅ уже в схеме (optional)
- Zone model — ✅ добавлена (Z-1)

Начинай с Z-1 (Zones CRUD). Подтверди, что прочитал файлы.
```

---

# Текущее состояние (2025-01-XX)

## Последняя выполненная задача
- ✅ Исправлено **21 из 21 бага**
- ✅ Finance: F-1..F-8 (Account CRUD + History)
- ✅ Tasks: T-1..T-3 (Date + Checkbox)
- ✅ Challenges: C-1..C-2 (Number field + Hint)
- ✅ Steam: ST-1 (References removed)
- ✅ Rituals: R-1..R-3 (Duplicate + Delete + Tags)
- ✅ Food: FD-1..FD-2 (Edit + Time)
- ✅ Zones: Z-1..Z-2 (CRUD + Hide inactive)
- ✅ Закоммичено и запушено в main

## Незавершённые задачи

**НЕТ!** Все 21 баг из BUG_ANALYSIS.md исправлены! 🎉

### ✅ SCHEMA UP TO DATE
- Account.currency — уже в схеме (default RUB)
- FoodEntry.time — уже в схеме (optional)
- Zone model — добавлена в этой сессии

---

## Важно помнить

| Тема | Правило |
|------|---------|
| **БД** | Только Supabase PostgreSQL, Prisma ORM |
| **Ветка** | main (master — историческая, не трогать) |
| **Git** | Не делаю команды сам, только предлагаю |
| **Env** | NEXT_PUBLIC_SUPABASE_URL, DATABASE_URL, DIRECT_DATABASE_URL |
| **API** | 66 endpoints в src/app/api/ |
| **Push** | Разрешён без force после согласования |

## Структура проекта

```
src/
├── app/api/          # 66 API endpoints (Prisma → Supabase)
├── components/
│   ├── screens/      # Основные экраны
│   └── ui/           # shadcn/ui компоненты
├── lib/
│   ├── db.ts         # Prisma client
│   ├── store.ts      # Zustand store
│   └── supabase*.ts  # Supabase clients
└── prisma/
    └── schema.prisma # PostgreSQL only
```

## Переменные окружения (обязательные)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres"
DIRECT_DATABASE_URL="postgresql://...supabase.co:5432/postgres"
```

---

## Как обновлять этот файл

После каждой задачи обновляй:
1. **Последняя выполненная задача** — что сделано
2. **Незавершённые задачи** — отметить [x] выполненные
3. **Дата** — обновить дату в заголовке
