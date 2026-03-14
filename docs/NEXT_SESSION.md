# Next Session Prompt

Скопируй этот промпт в начало каждого нового чата:

---

## 🚀 START PROMPT (copy this)

```
Работаем над проектом LeakFixerBuddy.

ОБЯЗАТЕЛЬНО прочитай перед работой (в порядке приоритета):
1. docs/NEXT_SESSION.md — текущее состояние и незавершённые задачи
2. docs/AGENT_INSTRUCTIONS.md — правила работы (git, БД, ветки)
3. worklog.md — последние выполненные задачи (читай конец)

КРИТИЧЕСКИ ВАЖНО:
- ВЕТКА: только main (master не существует)
- БД: ТОЛЬКО Supabase PostgreSQL (локальной БД НЕТ!)
- Prisma schema: prisma/schema.prisma (PostgreSQL)
- Git: НЕ делаю git команды сам, только предлагаю
- Push: разрешён без force после согласования

После чтения файлов подтверди, что понял контекст, и жду задачу.
```

---

# Текущее состояние (2025-01-XX)

## Последняя выполненная задача
- ✅ Удалены все упоминания sandbox/local DB из проекта
- ✅ Проект работает ТОЛЬКО с Supabase PostgreSQL
- ✅ Упрощены supabaseClient.ts, supabase.ts, db.ts
- ✅ Закоммичено и запушено в main (commit 652e0fa)

## Незавершённые задачи

### Баги Finance (из списка пользователя):
1. **Finance: Duplicate accounts created** — нужно добавить:
   - Проверку дубликата в API перед созданием
   - Состояние isCreating на фронте (блокировка кнопки)
2. **Finance: Can't delete account** — проверить DELETE endpoint
3. **Finance: No currency selection** — добавить RUB/USD/EUR + custom
4. **Finance: No categories visible** — проверить отображение
5. **Finance: Can't edit transactions** — добавить редактирование

### Другие баги (из списка ~20 пунктов):
- Challenges: Can't clear number field
- Tasks: Date issues, checkbox not working
- Zones: CRUD needed, inactive zones should hide
- Rituals: Duplicates from notes, can't delete
- Food: Can't edit entries
- Удалить все Steam references

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
├── components/       # UI компоненты + экраны
├── lib/
│   ├── db.ts         # Prisma client
│   ├── supabase*.ts  # Supabase clients
│   └── store.ts      # Zustand
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
2. **Незавершённые задачи** — убрать завершённые, добавить новые
3. **Дата** — обновить дату в заголовке
