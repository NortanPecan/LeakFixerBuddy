# Next Session Prompt

Скопируй этот промпт в начало каждого нового чата:

---

## 🚀 START PROMPT (copy this)

```
Работаем над проектом LeakFixerBuddy.

ПУТЬ К ПРОЕКТУ: /home/z/my-project

ОБЯЗАТЕЛЬНО прочитай перед работой (в порядке приоритета):
1. docs/NEXT_SESSION.md — текущее состояние и незавершённые задачи
2. docs/BUG_ANALYSIS.md — детальный анализ 23 багов с решениями
3. docs/AGENT_INSTRUCTIONS.md — правила работы (git, БД, ветки)
4. worklog.md — последние выполненные задачи (читай конец)

КРИТИЧЕСКИ ВАЖНО:
- ВЕТКА: только main (master не существует)
- БД: ТОЛЬКО Supabase PostgreSQL (локальной БД НЕТ!)
- Prisma schema: prisma/schema.prisma (PostgreSQL)
- Git: НЕ делаю git команды сам, только предлагаю
- Push: разрешён без force после согласования

После чтения файлов подтверди, что понял контекст, и начинай исправлять баги по порядку.
```

---

# Текущее состояние (2025-01-XX)

## Последняя выполненная задача
- ✅ Удалены все упоминания sandbox/local DB из проекта
- ✅ Проект работает ТОЛЬКО с Supabase PostgreSQL
- ✅ Создан BUG_ANALYSIS.md с 23 багами (согласовано)

## Незавершённые задачи (23 пункта)

### 🔴 Finance (8)
- [ ] **F-1:** Duplicate accounts — добавить isCreating state + API check
- [ ] **F-2:** Can't delete account — добавить кнопку удаления с подтверждением
- [ ] **F-3:** Currency selection — RUB/USD/EUR + custom (добавить поле в schema)
- [ ] **F-4:** Categories not visible — проверить API
- [ ] **F-5:** Can't edit transactions — добавить диалог редактирования
- [ ] **F-6:** Can't edit accounts — добавить диалог редактирования
- [ ] **F-7:** Initial balance in edit — добавить в диалог
- [ ] **F-8:** Account history + period filter — создать детальный просмотр счёта с фильтром по периоду

### 🔴 Tasks (3)
- [ ] **T-1:** Date not initialized — инициализировать selectedDate в store
- [ ] **T-2:** Creates on previous date — проверить CreateTaskScreen
- [ ] **T-3:** Checkbox not working — исправить SortableTaskCard

### 🟡 Challenges (2)
- [ ] **C-1:** Can't clear number field — использовать string value
- [ ] **C-2:** Unclear ritual connection — добавить подсказку в UI

### 🟡 Rituals (3)
- [ ] **R-1:** Duplicate from note — проверить создание
- [ ] **R-2:** Can't delete — добавить DELETE с подтверждением
- [ ] **R-3:** Tags cause duplicates — проверить парсинг

### 🟡 Zones (2)
- [ ] **Z-1:** CRUD for zones — создать ZonesScreen
- [ ] **Z-2:** Hide inactive zones — фильтровать по isActive

### 🟡 Food (2)
- [ ] **FD-1:** Can't edit entries — добавить диалог
- [ ] **FD-2:** Time tracking — добавить поле time

### 🟢 Steam (1)
- [ ] **ST-1:** Remove Steam references — очистить 6 файлов

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
