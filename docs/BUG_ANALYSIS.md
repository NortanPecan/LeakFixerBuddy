# Bug Analysis — LeakFixerBuddy

**Дата:** 2025-01-XX
**Статус:** ✅ СОГЛАСОВАНО (23 пункта)

---

## 📊 Сводка

| Модуль | Багов | Критичность |
|--------|-------|-------------|
| Finance | 8 | 🔴 Высокая |
| Tasks | 3 | 🔴 Высокая |
| Challenges | 2 | 🟡 Средняя |
| Rituals | 3 | 🟡 Средняя |
| Zones | 2 | 🟡 Средняя |
| Food | 2 | 🟡 Средняя |
| Steam | 1 | 🟢 Низкая |
| **ИТОГО** | **23** | |

---

## 🔴 FINANCE (8 багов)

### F-1: Duplicate accounts created ✅
**Проблема:** При создании счёта можно кликнуть дважды, создаётся дубликат.

**Решение:**
1. Frontend: Добавить `isCreating` state, блокировать кнопку
2. API: Проверять дубликат по `userId + name` перед созданием

**Файлы:** `src/components/screens/FinanceScreen.tsx`, `src/app/api/accounts/route.ts`

---

### F-2: Can't delete account ✅
**Проблема:** Нет UI для удаления счёта.

**Решение:**
1. Добавить контекстное меню или долгий тап → меню с "Удалить"
2. Показать подтверждение: "Удалить счёт X? Все транзакции сохранятся."
3. Вызвать `DELETE /api/accounts?id=xxx`

**Файлы:** `src/components/screens/FinanceScreen.tsx`

---

### F-3: No currency selection ✅
**Проблема:** Валюта захардкожена как RUB.

**Согласовано:** RUB, USD, EUR + своя (custom input)

**Решение:**
1. Добавить поле `currency` в модель Account
2. Добавить выбор валюты в диалог создания/редактирования
3. Форматировать сумму по валюте

**Schema:**
```prisma
model Account {
  currency String @default("RUB")
}
```

**Файлы:** `prisma/schema.prisma`, `src/components/screens/FinanceScreen.tsx`, `src/app/api/accounts/route.ts`

---

### F-4: No categories visible ✅
**Проблема:** Категории не отображаются, хотя должны.

**Решение:**
1. Проверить API `/api/finance` — возвращает ли категории
2. Проверить создание категорий при создании зон

**Файлы:** `src/app/api/finance/route.ts`, `src/app/api/categories/route.ts`

---

### F-5: Can't edit transactions ✅
**Проблема:** Нет UI для редактирования транзакции.

**Решение:**
1. Добавить клик по транзакции → диалог редактирования
2. Поля: счёт, категория, сумма, дата, описание
3. `PATCH /api/transactions`

**Файлы:** `src/components/screens/FinanceScreen.tsx`, `src/app/api/transactions/route.ts`

---

### F-6: Can't edit accounts ✅
**Проблема:** Нет UI для редактирования счёта.

**Решение:**
1. Добавить клик по счёту → диалог редактирования
2. Поля: название, тип, валюта, иконка, начальный баланс
3. `PATCH /api/accounts`

**Файлы:** `src/components/screens/FinanceScreen.tsx`

---

### F-7: Initial balance not editable ✅
**Проблема:** Начальный баланс можно ввести только при создании.

**Решение:** Добавить в диалог редактирования счёта (F-6)

---

### F-8: Account transaction history ✅ NEW
**Проблема:** Нет просмотра транзакций по конкретному счёту.

**Требования:**
1. Клик по счёту → детальный просмотр (выписка)
2. Фильтр по периоду: сегодня, неделя, месяц, свой период
3. Список всех транзакций по счёту
4. Итоги: доход/расход за период

**Решение:**
1. Создать `AccountDetailScreen` или модальный диалог
2. API endpoint `/api/accounts/[id]/transactions?from=...&to=...`
3. Добавить дейтпикер для периода

**Файлы:** Новый `src/components/screens/AccountDetailScreen.tsx`, API route

---

## 🔴 TASKS (3 бага)

### T-1: Can't select Today/Tomorrow on first open ✅
**Проблема:** При открытии экрана Tasks дата не инициализирована.

**Решение:**
Инициализировать `selectedDate` в store при старте приложения

**Файлы:** `src/lib/store.ts`, `src/components/screens/TasksScreen.tsx`

---

### T-2: Creates on previous date ✅
**Проблема:** Новая задача создаётся на предыдущую дату вместо текущей.

**Решение:**
Проверить `CreateTaskScreen` — использовать `selectedDate || today`

**Файлы:** `src/components/screens/CreateTaskScreen.tsx`

---

### T-3: Checkbox doesn't work ✅
**Проблема:** Чекбокс не отмечает задачу выполненной.

**Решение:**
Исправить `SortableTaskCard` — показывать `CheckCircle2` для `task.status === 'done'`

**Файлы:** `src/components/screens/TasksScreen.tsx`

---

## 🟡 CHALLENGES (2 бага)

### C-1: Can't clear number field ✅
**Проблема:** Number input не очищается (остаётся 0).

**Решение:**
Использовать string для value, парсить при отправке

**Файлы:** `src/components/screens/ChallengesScreen.tsx`

---

### C-2: Unclear connection to rituals ✅
**Проблема:** Не понятно, как челендж связан с ритуалами.

**Решение:**
Добавить подсказку при выборе типа "На ритуалы":
> "Отслеживает выполнение выбранных ритуалов в течение N дней"

**Файлы:** `src/components/screens/ChallengesScreen.tsx`

---

## 🟡 RITUALS (3 бага)

### R-1: Duplicate from note ✅
**Проблема:** При создании ритуала из заметки создаётся дубликат.

**Решение:**
Проверить логику создания из NotesScreen — возможно, вызывается дважды или теги парсятся неправильно

**Файлы:** `src/components/screens/NotesScreen.tsx`

---

### R-2: Can't delete ✅
**Проблема:** Нет кнопки удаления, только архивация.

**Согласовано:** Возможность выбрать + уведомление что удаляется

**Решение:**
1. Добавить "Удалить" в меню действий ритуала
2. Показать диалог подтверждения: "Удалить ритуал X? История сохранится."
3. DELETE /api/rituals

**Файлы:** `src/components/screens/RitualsScreen.tsx`

---

### R-3: Tags cause duplicates ✅
**Проблема:** Теги в заметках создают дубликаты ритуалов/задач.

**Решение:**
Проверить парсинг тегов — добавить проверку на существование

**Файлы:** `src/components/screens/NotesScreen.tsx`

---

## 🟡 ZONES (2 бага)

### Z-1: CRUD needed for Active Zones ✅
**Проблема:** Нет управления зонами.

**Решение:**
Создать полноценный `ZonesScreen` с:
- Списком всех зон (активные/неактивные)
- Возможность создать/редактировать/удалить зону
- Включить/выключить зону (toggle isActive)

**Файлы:** Новый `src/components/screens/ZonesScreen.tsx`, `src/app/api/zones/route.ts`

---

### Z-2: Inactive zones should hide ✅
**Проблема:** Неактивные зоны показываются в селектах.

**Решение:**
Фильтровать зоны по `isActive: true` во всех API и селектах

**Файлы:** Все экраны, использующие зоны

---

## 🟡 FOOD (2 бага)

### FD-1: Can't edit entries ✅
**Решение:** Добавить диалог редактирования в FoodScreen

**Файлы:** `src/components/screens/FoodScreen.tsx` или `HealthScreen.tsx`

---

### FD-2: Add time tracking ✅
**Решение:** Добавить поле `time` в модель FoodEntry и UI

**Файлы:** `prisma/schema.prisma`, `src/app/api/food/route.ts`, UI

---

## 🟢 STEAM (1 баг)

### ST-1: Remove all Steam references ✅
**Файлы для очистки:**
- `src/components/screens/FinanceScreen.tsx` — убрать из ACCOUNT_TYPES, ZONE_CONFIG
- `src/components/screens/ChallengesScreen.tsx` — убрать из ZONE_CONFIG
- `src/components/screens/TasksScreen.tsx` — убрать из ZONE_COLORS
- `src/features/profile/constants.ts` — убрать
- `src/lib/notes-config.ts` — убрать
- `src/app/api/categories/route.ts` — убрать фильтр

---

## ✅ Порядок исправления

1. **Finance (F-1..F-8)** — 8 багов
2. **Tasks (T-1..T-3)** — 3 бага
3. **Challenges (C-1..C-2)** — 2 бага
4. **Rituals (R-1..R-3)** — 3 бага
5. **Zones (Z-1..Z-2)** — 2 бага
6. **Food (FD-1..FD-2)** — 2 бага
7. **Steam (ST-1)** — 1 баг

**Итого: 23 пункта**

---

## 📋 Чеклист для трекинга

```
[ ] F-1: Finance duplicate accounts
[ ] F-2: Finance can't delete account
[ ] F-3: Finance currency selection
[ ] F-4: Finance categories not visible
[ ] F-5: Finance can't edit transactions
[ ] F-6: Finance can't edit accounts
[ ] F-7: Finance initial balance in edit
[ ] F-8: Finance account history + period filter
[ ] T-1: Tasks date initialization
[ ] T-2: Tasks creates on previous date
[ ] T-3: Tasks checkbox not working
[ ] C-1: Challenges clear number field
[ ] C-2: Challenges ritual connection hint
[ ] R-1: Rituals duplicate from note
[ ] R-2: Rituals can't delete
[ ] R-3: Rituals tags duplicates
[ ] Z-1: Zones CRUD screen
[ ] Z-2: Zones hide inactive
[ ] FD-1: Food can't edit
[ ] FD-2: Food time tracking
[ ] ST-1: Remove Steam references
```
