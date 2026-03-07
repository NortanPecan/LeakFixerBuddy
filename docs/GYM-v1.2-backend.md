# GYM v1.2 — Backend Tasks

## Цель
Расширить существующие модели и API для поддержки:
- Карточек упражнений (шаблоны)
- Формата `вес × схема × (nextWeight)`
- Статусов тренировок и доп. активностей
- Блока "Сегодня" и аналитики

---

## B1. Модель GymExerciseTemplate (карточка упражнения)

**Статус:** ✅ Done

**Задача:** Создать новую модель для хранения шаблонов упражнений.

**Поля:**
```prisma
model GymExerciseTemplate {
  id              String   @id @default(cuid())
  userId          String
  
  // Основное
  name            String              // "Жим гантелей"
  muscleGroup     String?             // chest, back, legs, shoulders, biceps, triceps, core
  goal            String?             // strength, volume, accessory
  
  // Схема и прогрессия
  defaultScheme   String?             // "12х4" — предпочитаемая схема
  progressionType String?             // "fixed", "percentage", "manual"
  progressionStep Float?              // шаг прогрессии (кг или %)
  
  // Текущий вес
  currentWeight   Float?              // последний использованный вес
  nextWeight      Float?              // рекомендованный следующий вес
  
  // Техника
  techniqueNotes  String?             // JSON: ["контроль спины", "полная амплитуда"]
  
  // Метаданные
  isArchived      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Связи
  user        AppUser       @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercises   GymExercise[] // все выполнения этого упражнения
  
  @@map("gym_exercise_templates")
}
```

**Изменения:**
- Добавить связь `AppUser → gymExerciseTemplates GymExerciseTemplate[]`
- Добавить связь `GymExercise → template GymExerciseTemplate?`

---

## B2. Расширить GymExercise

**Статус:** ✅ Done

**Задача:** Добавить поля для формата `вес × схема × (nextWeight)`.

**Новые поля:**
```prisma
model GymExercise {
  // ... существующие поля ...
  
  templateId      String?             // ссылка на шаблон
  repsScheme      String?             // "12х4", "10х12х3х15х1"
  nextWeight      Float?              // вес для следующего раза
  
  // Связи
  template        GymExerciseTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
}
```

**Логика:**
- При создании упражнения из шаблона — копировать `currentWeight` → `weight`, `defaultScheme` → `repsScheme`
- После выполнения — обновлять `template.currentWeight` и `template.nextWeight`

---

## B3. Расширить GymWorkout

**Статус:** ✅ Done

**Задача:** Добавить статус, самочувствие и доп. активности.

**Новые поля:**
```prisma
model GymWorkout {
  // ... существующие поля ...
  
  // Статус
  status          String   @default("planned")  // planned, completed, skipped, rescheduled
  
  // Самочувствие
  wellbeing       Int?              // 1-5
  wellbeingNote   String?           // короткая заметка
  
  // Доп. активности
  additionalActivities String?     // JSON: [{ type: "walking", value: 10, unit: "km" }]
}

// Типы доп. активностей:
// - walking (ходьба) — км
// - abs (пресс) — повторы × подходы
// - legsRaise (подъём ног) — повторы × подходы
// - bike (велосипед) — км или мин
// - plank (планка) — сек или мин
```

---

## B4. API карточек упражнений (GymExerciseTemplate)

**Статус:** ✅ Done

**Файлы созданы:**
- `/api/gym/templates/route.ts` — GET/POST/PATCH/DELETE
- `/api/gym/templates/[id]/history/route.ts` — GET history

**Эндпоинт:** `/api/gym/templates`

| Метод | Действие | Параметры |
|-------|----------|-----------|
| GET | Получить все шаблоны пользователя | userId |
| GET | Получить один шаблон | id |
| POST | Создать шаблон | name, muscleGroup, goal, defaultScheme, progressionType, progressionStep, currentWeight, nextWeight, techniqueNotes |
| PATCH | Обновить шаблон | id + любые поля |
| DELETE | Архивировать шаблон | id (soft delete: isArchived=true) |

**Доп. эндпоинт:** `/api/gym/templates/[id]/history`
- GET — история выполнений этого упражнения (последние N GymExercise с sets)

---

## B5. API для блока "Сегодня"

**Статус:** ✅ Done

**Файлы созданы:**
- `/api/gym/today/route.ts` — GET/POST/PATCH

**Эндпоинт:** `/api/gym/today`

| Метод | Действие | Параметры |
|-------|----------|-----------|
| GET | Получить план на сегодня | userId |
| POST | Сохранить факт тренировки | workoutId, exercises[], additionalActivities[], wellbeing |

**Ответ GET:**
```json
{
  "period": { "id", "name", "currentCycle", "totalCycles" },
  "workout": { 
    "id", "date", "status", "name", "muscleGroups",
    "exercises": [
      { "id", "name", "weight", "repsScheme", "nextWeight", "templateId", "sets": [] }
    ]
  },
  "additionalActivities": []
}
```

---

## B6. API аналитики

**Статус:** 🔲 Pending (низкий приоритет, будет реализовано позже)

**Эндпоинт:** `/api/gym/stats`

| Метод | Действие | Параметры |
|-------|----------|-----------|
| GET | Статистика за период | userId, period (week/month) |
| GET | Streak | userId |
| GET | Прогресс по упражнению | templateId, periodId |

**Ответ:**
```json
{
  "workoutsCount": 12,
  "streak": 4,
  "progressByExercise": [
    { "name": "Жим гантелей", "dates": [...], "weights": [...] }
  ]
}
```

---

## Порядок выполнения

1. **B1** — Создать GymExerciseTemplate в schema.prisma
2. **B2** — Добавить поля в GymExercise (templateId, repsScheme, nextWeight)
3. **B3** — Добавить поля в GymWorkout (status, wellbeing, additionalActivities)
4. **B4** — Создать `/api/gym/templates` CRUD
5. **B5** — Создать `/api/gym/today`
6. **B6** — (позже) Создать `/api/gym/stats`

---

## Миграция

```bash
bun run db:push
```

**Важно:** Не удалять существующие данные. Новые поля — nullable или с default.
