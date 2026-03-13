# Фаза 2: Синхронизация master → main (ветка main-master-sync)

## 📊 Статистика изменений

| Категория | Количество |
|-----------|------------|
| **Новые файлы (A)** | 32 |
| **Изменённые файлы (M)** | 35 |
| **Всего файлов** | 67 |

---

## 🆕 Новые API роуты

| Роут | Назначение |
|------|------------|
| `/api/auth/telegram` | Альтернативный Telegram auth |
| `/api/daily-summary` | Ежедневная сводка для LeakFix |
| `/api/directions` | Направления/цели для челенджей |
| `/api/export` | Экспорт данных в Markdown |
| `/api/skills` | CRUD навыков |
| `/api/traits` | CRUD черт характера |
| `/api/wellbeing/daily` | Ежедневные ответы wellbeing |
| `/api/wellbeing/settings` | Настройки wellbeing пресета |
| `/api/wellbeing/weekly` | Еженедельные ответы wellbeing |
| `/api/gym/migrate-v1-3` | Миграция GYM v1.3 |
| `/api/gym/templates` | Шаблоны тренировок |
| `/api/gym/templates/[id]/history` | История шаблона |
| `/api/gym/today` | Сегодняшняя тренировка |
| `/api/gym/workouts/reschedule` | Перенос тренировки |
| `/api/gym/workouts/skip` | Пропуск тренировки |
| `/api/gym/workouts/status` | Статус тренировки |
| `/api/gym/workouts/undo-complete` | Отмена завершения |

---

## 🆕 Новые компоненты

### Screens:
- `DailySummaryScreen.tsx` - Ежедневная сводка
- `ExportScreen.tsx` - Экспорт данных
- `GoalsScreen.tsx` - Цели/направления
- `SkillsScreen.tsx` - Навыки
- `TraitsScreen.tsx` - Черты характера

### Wellbeing:
- `WellbeingWidget.tsx` - Главный виджет wellbeing
- `WellbeingCheckinDialog.tsx` - Диалог ежедневного чекина
- `PresetSelectionDialog.tsx` - Выбор пресета (core/expanded/full)
- `WeeklyWellbeingDialog.tsx` - Диалог еженедельных вопросов
- `index.ts` - Экспорт модуля

### Shared:
- `DatePicker.tsx` - Компонент выбора даты

---

## 📚 Новые Lib файлы

| Файл | Размер | Назначение |
|------|--------|------------|
| `wellbeing-config.ts` | 524 строки | Конфигурация вопросов (24 + 7 weekly) |
| `wellbeing-utils.ts` | 237 строк | Расчёт scores, ISO week утилиты |
| `auth-telegram.ts` | 158 строк | Telegram WebApp auth helpers |
| `database.types.ts` | 292 строки | TypeScript типы для Supabase |
| `supabase.ts` | 34 строки | Supabase client config |
| `supabase-browser.ts` | 227 байт | Browser client |
| `supabase-server.ts` | 1.3 KB | Server client |

---

## 📝 Обновлённые файлы

### API:
- `auth/route.ts` - +owner mode, POST для Telegram initData
- `challenges/route.ts` - +directionId, title, description, category
- `energy/route.ts` - улучшения
- `fitness/route.ts` - улучшения
- `food/route.ts` - улучшения
- `gym/*.ts` - полная переработка под v1.3/v1.5/v1.7
- `rituals/*.ts` - улучшения
- `state/route.ts` - +новые поля DailyState
- `supplements/*.ts` - улучшения
- `water/route.ts` - улучшения

### Components:
- `BottomNav.tsx` - обновление навигации
- `ChallengeDetailScreen.tsx` - +direction link
- `ChallengesScreen.tsx` - улучшения
- `GymScreen.tsx` - **полная переработка** (~3600 строк)
- `HealthScreen.tsx` - улучшения
- `HomeScreen.tsx` - +wellbeing widget
- `ProfileScreen.tsx` - улучшения
- `RitualsScreen.tsx` - улучшения
- `TasksScreen.tsx` - улучшения

### Lib:
- `date-utils.ts` - +getStartOfDay, getEndOfDay, getDayOfWeek
- `rituals/data.ts` - улучшения
- `store.ts` - +новые screens, owner mode

---

## ✅ Проверено и работает

| Функция | Статус | Примечание |
|---------|--------|------------|
| Demo auth (`?demo=true`) | ✅ 200 | Работает |
| Telegram auth (POST initData) | ✅ 200 | Работает без токена (dev mode) |
| Wellbeing daily API | ✅ 200 | Сохраняет ответы |
| Prisma + Supabase | ✅ OK | Запросы выполняются |
| Build | ✅ OK | 58 страниц собрано |
| Lint | ⚠️ 1 warning | CommonJS require в скрипте |

---

## ⏳ Нужно дотестировать перед push в main

1. **Telegram WebApp в продакшене** - нужна проверка с реальным TELEGRAM_BOT_TOKEN
2. **Миграция БД** - `prisma db push` или migrate на Supabase
3. **Новые таблицы** - проверить CREATE TABLE на проде
4. **GYM v1.7** - проверить все новые поля работают корректно
5. **Wellbeing виджет** - проверить все 3 пресета (core/expanded/full)
6. **Export** - проверить генерацию markdown

---

## 📋 Новые модели в schema.prisma

| Модель | Поля | Индексы |
|--------|------|---------|
| Direction | id, userId, title, description, horizon, color, icon, status, sortOrder | - |
| Skill | id, userId, name, description, category, level, maxLevel, xp, xpToNext, importance, icon, color, isArchived | - |
| SkillHistory | id, skillId, oldLevel, newLevel, xpGained, reason, sourceId | - |
| Trait | id, userId, name, description, type, category, score, targetScore, icon, color, isArchived | - |
| TraitHistory | id, traitId, oldScore, newScore, delta, reason, sourceId | - |
| GymExerciseTemplate | id, userId, name, muscleGroup, goal, defaultReps, defaultSets, progressionType, progressionStep, currentWeight, nextWeight, techniqueNotes, isArchived | - |
| GymWorkoutTemplate | id, periodId, workoutNum, name, muscleGroups | - |
| GymWorkoutTemplateExercise | id, workoutTemplateId, exerciseTemplateId, name, muscleGroup, order, defaultScheme, defaultReps, defaultSets, defaultWeight | - |
| UserWellbeingSettings | id, userId, preset | userId unique |
| DailyWellbeing | id, userId, date, preset, answers, scores, completedAt | userId+date unique, date index |
| WeeklyWellbeing | id, userId, year, week, preset, answers, scores, completedAt | userId+year+week unique |

---

## 🔗 Связи между моделями

```
AppUser
├── Direction[] → Challenge.directionId
├── Skill[] → SkillHistory[]
├── Trait[] → TraitHistory[]
├── GymExerciseTemplate[] → GymWorkoutTemplateExercise[]
├── UserWellbeingSettings (1:1)
├── DailyWellbeing[]
└── WeeklyWellbeing[]

GymPeriod
├── GymWorkoutTemplate[] → GymWorkout.workoutTemplateId
└── GymExerciseTemplate[] (через userId)

Challenge
└── Direction? (many:1)
```

---

## 🚀 Следующие шаги (после подтверждения)

1. `prisma db push` - применить схему к Supabase
2. Тестирование в Telegram WebApp
3. `git checkout main && git merge main-master-sync`
4. `git push origin main`
5. Деплой на Vercel (автоматический)
