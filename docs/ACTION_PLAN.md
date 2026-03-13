# LeakFixerBuddy — План действий

Дата: 2025-03-12
Статус: На основе MODULE_AUDIT.md

---

## Уже исправлено ✅

| ID | Модуль | Проблема | Статус |
|----|--------|----------|--------|
| H-1 | Habits | Weekly stats Math.random() | ✅ |
| P-2 | Profile | totalWorkouts мок | ✅ |
| C-2 | Content | contentIdProp не передаётся | ✅ |
| R-4 | Rituals | Streak для не-ежедневных | ✅ |
| F-1 | Finance | Network errors | ✅ |

---

## Приоритет 1: Network Errors (общая проблема)

Применить `network-utils.ts` ко всем модулям:

| ID | Модуль | Файл | Статус |
|----|--------|------|--------|
| W-2 | Wellbeing | `WellbeingScreen.tsx` | ⏳ |
| R-2 | Rituals | `RitualsScreen.tsx` | ⏳ |
| H-2 | Habits | `HabitsScreen.tsx` | ⏳ |
| T-1 | Tasks | `TasksScreen.tsx`, `ChainDetailScreen.tsx` | ⏳ |
| N-2 | Notes | `NotesScreen.tsx` | ⏳ |
| CH-1 | Challenges | `ChallengesScreen.tsx` | ⏳ |
| P-1 | Profile | `ProfileScreen.tsx` | ⏳ |
| G-2 | Gym | `GymScreen.tsx` | ⏳ |

---

## Приоритет 2: Критические баги

| ID | Модуль | Проблема | Критичность | Решение |
|----|--------|----------|-------------|---------|
| N-3 | Notes | parseReframeData падает на невалидном JSON | Средняя | try-catch + fallback |
| C-3 | Content | GET content по id не реализован | Средняя | Добавить endpoint |
| CH-3 | Challenges | currentStreak некорректен | Средняя | Использовать streak-utils |
| P-3 | Profile | theme switch не применяет тему | Средняя | next-themes integration |
| G-3 | Gym | Debounce теряет данные | Средняя | Добавить flush on unmount |

---

## Приоритет 3: Toast уведомления

Добавить `showSuccessToast` при успешных операциях:

| Модуль | Экран | Операции |
|--------|-------|----------|
| Rituals | RitualsScreen | Отметка выполнения |
| Habits | HabitsScreen | Отметка выполнения, создание |
| Tasks | TasksScreen | Создание, завершение, удаление |
| Notes | NotesScreen | Создание заметки |
| Gym | GymScreen | Сохранение сета, завершение тренировки |
| Wellbeing | WellbeingScreen | Сохранение чекина |

---

## Приоритет 4: Технический долг (низкая критичность)

### JSON.parse в рантайме
| ID | Проблема | Решение |
|----|----------|---------|
| G-1 | muscleGroups парсится каждый раз | Кэшировать или использовать computed |
| R-1 | days/attributes парсятся | Использовать Prisma Json type |
| W-3 | answers/scores JSON строка | Нормализовать или оставить как есть |
| H-3 | Streak не учитывает frequency | ✅ Частично исправлено через streak-utils |
| N-1 | Reframe в text как JSON | Создать таблицу reframes (опционально) |
| CH-2 | config JSON строка | Оставить как есть (гибкость) |

### Orphan records
| ID | Проблема | Решение |
|----|----------|---------|
| H-4 | habit_logs orphan при удалении | CASCADE delete в schema |
| T-3 | Race condition при реордере | Транзакция или optimistic lock |

### localStorage vs DB
| ID | Проблема | Решение |
|----|----------|---------|
| R-3 | preset_offered в localStorage | Синхронизировать с user_settings |
| T-2 | selectedChainId в localStorage | Перенести в zustand store |

---

## Приоритет 5: UX улучшения

### Быстрые победы (минимум кода)
1. ✅ Toast при успешных операциях (используя network-utils)
2. Показывать overdue задачи с предупреждением
3. Quick actions для задач (сегодня/завтра/отмена)
4. Фильтрация ритуалов по категории

### Средние улучшения
1. Добавить редактирование привычки/ритуала/задачи
2. Добавить удаление/архивацию привычки
3. Улучшить heatmap (тултипы)
4. Добавить скелетоны при загрузке

### Большие улучшения (рефакторинг)
1. Разбить GymScreen на вкладки
2. Добавить график истории wellbeing
3. Добавить график истории замеров
4. Реализовать drag&drop для задач

---

## Приоритет 6: API улучшения

### Недостающие endpoints
1. GET `/api/content?id=xxx` — получение контента по ID
2. DELETE `/api/habits?id=xxx` — удаление привычки
3. PATCH `/api/habits` — редактирование привычки

### Оптимизация
1. Кэшировать currentBalance в account (F-2)
2. Оптимизировать streak calculation (уже через streak-utils)
3. Добавить индексы для частых запросов

---

## План реализации

### Этап 1: Network Errors (1-2 часа)
- [ ] W-2: WellbeingScreen
- [ ] R-2: RitualsScreen
- [ ] H-2: HabitsScreen
- [ ] T-1: TasksScreen, ChainDetailScreen
- [ ] N-2: NotesScreen
- [ ] CH-1: ChallengesScreen
- [ ] P-1: ProfileScreen
- [ ] G-2: GymScreen (сохранение сета)

### Этап 2: Критические баги (1-2 часа)
- [ ] N-3: parseReframeData try-catch
- [ ] C-3: GET content by id
- [ ] CH-3: Исправить currentStreak
- [ ] P-3: Theme switch
- [ ] G-3: Debounce flush

### Этап 3: Toast уведомления (30 мин)
- [ ] RitualsScreen: showSuccessToast
- [ ] HabitsScreen: showSuccessToast
- [ ] TasksScreen: showSuccessToast
- [ ] GymScreen: showSuccessToast

### Этап 4: Технический долг (2-3 часа)
- [ ] R-3: preset_offered sync
- [ ] T-2: selectedChainId в store
- [ ] H-4: CASCADE delete для habit_logs
- [ ] N-3: parseReframeData валидация

### Этап 5: UX улучшения (опционально)
- [ ] Overdue задачи с предупреждением
- [ ] Quick actions для задач
- [ ] Фильтрация ритуалов по категории
- [ ] Редактирование привычки/ритуала

---

## Итого

| Категория | Количество |
|-----------|------------|
| Уже исправлено | 5 |
| Network errors | 8 |
| Критические баги | 5 |
| Toast уведомления | 4+ |
| Технический долг | 8 |
| UX улучшения | 15+ |
