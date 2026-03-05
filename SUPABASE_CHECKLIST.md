# Supabase Database Checklist

Этот документ содержит полный список таблиц и полей, которые нужно создать в Supabase через веб-интерфейс.

> **Важно**: Создавайте таблицы в указанном порядке, так как есть зависимости (foreign keys).

---

## Порядок создания таблиц

1. **app_users** — основная таблица пользователей (создать первой!)
2. **user_profiles** — профиль пользователя
3. **lessons** — уроки для 30-дневного цикла
4. **habits** — привычки пользователя
5. **habit_logs** — лог выполнения привычек
6. **fitness_daily** — ежедневные данные фитнеса
7. **daily_state** — ежедневное состояние (настроение, энергия)
8. **measurements** — измерения тела
9. **gym_periods** — тренировочные периоды
10. **gym_cycles** — циклы тренировок
11. **gym_workouts** — тренировки
12. **gym_exercises** — упражнения в тренировке
13. **gym_exercise_sets** — подходы в упражнении
14. **buddies** — партнёры по accountability
15. **content_items** — контент (книги, курсы, видео)
16. **content_links** — связи контента с сущностями
17. **rituals** — ритуалы пользователя
18. **ritual_completions** — лог выполнения ритуалов
19. **user_attributes** — атрибуты пользователя (health, mind, will)
20. **achievements** — достижения пользователя
21. **notes** — заметки
22. **note_links** — связи заметок с сущностями
23. **chains** — цепочки задач
24. **tasks** — задачи
25. **user_settings** — настройки пользователя
26. **feedbacks** — обратная связь
27. **accounts** — финансовые счета
28. **categories** — категории финансов
29. **transactions** — финансовые транзакции
30. **challenges** — челленджи
31. **challenge_progress** — прогресс челленджей
32. **supplements** — добавки/витамины
33. **supplement_intakes** — приём добавок
34. **food_entries** — записи о еде

---

## Детальное описание таблиц

### 1. app_users

**Primary Key**: `id` (UUID, auto-generated)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | Primary key |
| telegram_id | bigint | YES | YES | - | Telegram User ID |
| telegram_username | text | YES | NO | - | @username без @ |
| telegram_first_name | text | YES | NO | - | Имя из Telegram |
| telegram_last_name | text | YES | NO | - | Фамилия из Telegram |
| telegram_language_code | text | YES | NO | 'ru' | Код языка |
| telegram_photo_url | text | YES | NO | - | URL аватара |
| username | text | YES | NO | - | Legacy field |
| first_name | text | YES | NO | - | Legacy field |
| last_name | text | YES | NO | - | Legacy field |
| photo_url | text | YES | NO | - | Legacy field |
| language | text | NO | NO | 'ru' | Язык интерфейса |
| email | text | YES | YES | - | Для будущей авторизации |
| phone | text | YES | YES | - | Для будущей авторизации |
| email_verified | timestamptz | YES | NO | - | Дата верификации email |
| phone_verified | timestamptz | YES | NO | - | Дата верификации телефона |
| day | integer | NO | NO | 1 | Текущий день программы |
| streak | integer | NO | NO | 0 | Серия дней |
| points | integer | NO | NO | 0 | Очки геймификации |
| created_at | timestamptz | NO | NO | now() | Дата создания |
| updated_at | timestamptz | NO | NO | now() | Дата обновления |
| auth_provider | text | YES | NO | 'telegram' | telegram/email/phone |
| last_login_at | timestamptz | YES | NO | - | Последний вход |

**Индексы**:
- `idx_app_users_telegram_id` on `telegram_id`
- `idx_app_users_email` on `email`
- `idx_app_users_phone` on `phone`

---

### 2. user_profiles

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | Primary key |
| user_id | uuid | NO | YES | - | FK → app_users.id, ON DELETE CASCADE |
| weight | double precision | YES | NO | - | Вес в кг |
| height | double precision | YES | NO | - | Рост в см |
| age | integer | YES | NO | - | Возраст |
| sex | text | YES | NO | - | male/female |
| target_weight | double precision | YES | NO | - | Целевой вес |
| target_calories | integer | YES | NO | - | Целевые калории |
| work_profile | text | YES | NO | - | sedentary/mixed/physical/variable |
| water_baseline | integer | NO | NO | 2000 | Базовая норма воды (мл) |
| waist | double precision | YES | NO | - | Обхват талии |
| hips | double precision | YES | NO | - | Обхват бёдер |
| chest | double precision | YES | NO | - | Обхват груди |
| bicep | double precision | YES | NO | - | Обхват бицепса |
| thigh | double precision | YES | NO | - | Обхват бедра |
| bio | text | YES | NO | - | О себе |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 3. lessons

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| day | integer | NO | YES | - | День (1-30) |
| title | text | NO | NO | - | Заголовок урока |
| description | text | YES | NO | - | Описание |
| video_url | text | YES | NO | - | Ссылка на видео |
| content | text | YES | NO | - | Текст урока |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 4. habits

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название привычки |
| icon | text | YES | NO | - | Эмодзи или имя иконки |
| color | text | YES | NO | - | Hex цвет |
| frequency | text | YES | NO | - | Частота |
| target | integer | YES | NO | - | Целевое значение |
| active | boolean | NO | NO | true | Активна ли привычка |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 5. habit_logs

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| habit_id | uuid | NO | NO | - | FK → habits.id, ON DELETE CASCADE |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | Дата записи |
| completed | boolean | NO | NO | false | Выполнено ли |
| count | integer | NO | NO | 1 | Количество |
| note | text | YES | NO | - | Заметка |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(habit_id, date)` — одна запись на привычку в день

---

### 6. fitness_daily

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | Дата |
| activities | text | YES | NO | - | JSON с активностями |
| foods | text | YES | NO | - | JSON с едой |
| water | integer | NO | NO | 0 | Выпито воды (мл) |
| water_target | integer | NO | NO | 2000 | Цель воды (мл) |
| supplements | text | YES | NO | - | JSON с добавками |
| mood | integer | YES | NO | - | Настроение (1-10) |
| energy | integer | YES | NO | - | Энергия (1-10) |
| gym_state | text | YES | NO | - | Состояние тренировки |
| notes | text | YES | NO | - | Заметки |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, date)` — одна запись на пользователя в день

---

### 7. daily_state

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default |
|------|-----|----------|--------|---------|
| id | uuid | NO | YES | gen_random_uuid() |
| user_id | uuid | NO | NO | FK → app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() |
| mood | integer | YES | NO | - |
| energy | integer | YES | NO | - |
| notes | text | YES | NO | - |
| created_at | timestamptz | NO | NO | now() |
| updated_at | timestamptz | NO | NO | now() |

**Unique Constraint**: `(user_id, date)`

---

### 8. measurements

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| type | text | NO | NO | - | waist/hips/chest/bicep/thigh/weight |
| value | double precision | NO | NO | - | Значение |
| unit | text | YES | NO | - | Единица измерения |
| date | timestamptz | NO | NO | now() | Дата измерения |
| note | text | YES | NO | - | Заметка |
| photo_url | text | YES | NO | - | Ссылка на фото |
| created_at | timestamptz | NO | NO | now() | |

---

### 9. gym_periods

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название периода |
| type | text | NO | NO | - | split/fullbody/ppl/upper_lower/custom |
| cycle_length | integer | NO | NO | 7 | Дней в цикле |
| workouts_per_cycle | integer | NO | NO | 4 | Тренировок в цикле |
| total_cycles | integer | NO | NO | 8 | Всего циклов |
| current_cycle | integer | NO | NO | 1 | Текущий цикл |
| current_day | integer | NO | NO | 1 | Текущий день |
| start_date | timestamptz | NO | NO | now() | Дата начала |
| end_date | timestamptz | YES | NO | - | Дата окончания |
| is_active | boolean | NO | NO | true | Активен ли |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 10. gym_cycles

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| period_id | uuid | NO | NO | - | FK → gym_periods.id, ON DELETE CASCADE |
| cycle_num | integer | NO | NO | - | Номер цикла |
| start_date | timestamptz | NO | NO | now() | |
| end_date | timestamptz | YES | NO | - | |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 11. gym_workouts

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| period_id | uuid | NO | NO | - | FK → gym_periods.id, ON DELETE CASCADE |
| cycle_id | uuid | YES | NO | - | FK → gym_cycles.id, ON DELETE SET NULL |
| date | timestamptz | NO | NO | now() | |
| day_of_week | integer | NO | NO | - | 1-7 |
| workout_num | integer | NO | NO | - | Номер тренировки |
| name | text | YES | NO | - | Название |
| muscle_groups | text | YES | NO | - | JSON массив |
| duration | integer | YES | NO | - | Длительность (мин) |
| completed | boolean | NO | NO | false | |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 12. gym_exercises

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| workout_id | uuid | NO | NO | - | FK → gym_workouts.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название упражнения |
| muscle_group | text | YES | NO | - | Группа мышц |
| order | integer | NO | NO | 0 | Порядок |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 13. gym_exercise_sets

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| exercise_id | uuid | NO | NO | - | FK → gym_exercises.id, ON DELETE CASCADE |
| set_num | integer | NO | NO | - | Номер подхода |
| weight | double precision | YES | NO | - | Вес (кг) |
| reps | integer | YES | NO | - | Повторения |
| duration | integer | YES | NO | - | Длительность (сек) |
| completed | boolean | NO | NO | false | |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 14. buddies

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| partner_id | text | NO | NO | - | ID партнёра |
| partner_name | text | NO | NO | - | Имя партнёра |
| partner_photo | text | YES | NO | - | Фото партнёра |
| status | text | NO | NO | 'pending' | pending/accepted/rejected |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, partner_id)`

---

### 15. content_items

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| type | text | NO | NO | - | book/movie/course/podcast/video |
| title | text | NO | NO | - | Название |
| status | text | NO | NO | 'planned' | planned/in_progress/completed |
| source | text | YES | NO | - | Платформа |
| url | text | YES | NO | - | Ссылка |
| zone | text | NO | NO | 'general' | Зона |
| total_units | integer | YES | NO | - | Всего единиц |
| current_units | integer | YES | NO | - | Текущий прогресс |
| unit_type | text | YES | NO | - | pages/lessons/minutes/percent |
| author | text | YES | NO | - | Автор |
| image_url | text | YES | NO | - | Обложка |
| description | text | YES | NO | - | Описание |
| notes | text | YES | NO | - | Заметки |
| started_at | timestamptz | YES | NO | - | Дата начала |
| completed_at | timestamptz | YES | NO | - | Дата завершения |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 16. content_links

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| content_id | uuid | NO | NO | - | FK → content_items.id, ON DELETE CASCADE |
| entity | text | NO | NO | - | note/ritual |
| entity_id | text | NO | NO | - | ID связанной сущности |
| fragment | text | YES | NO | - | Фрагмент/цитата |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(content_id, entity, entity_id)`

---

### 17. rituals

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| title | text | NO | NO | - | Название |
| type | text | NO | NO | 'regular' | regular/bad/one_time |
| category | text | NO | NO | - | health/money/learning/relationships/mind/productivity |
| days | text | NO | NO | '[]' | JSON массив [1,2,3,4,5,6,7] |
| time_window | text | NO | NO | 'any' | morning/day/evening/any |
| reminder | boolean | NO | NO | false | |
| reminder_time | text | YES | NO | - | HH:mm |
| goal_short | text | YES | NO | - | Краткая цель |
| description | text | YES | NO | - | Описание |
| is_from_preset | boolean | NO | NO | false | |
| preset_id | text | YES | NO | - | ID пресета |
| status | text | NO | NO | 'active' | active/archived |
| attributes | text | NO | NO | '[]' | JSON массив ["health", "will"] |
| sort_order | integer | NO | NO | 0 | |
| content_id | uuid | YES | NO | - | FK → content_items.id, ON DELETE SET NULL |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 18. ritual_completions

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| ritual_id | uuid | NO | NO | - | FK → rituals.id, ON DELETE CASCADE |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | |
| completed | boolean | NO | NO | true | |
| note | text | YES | NO | - | |
| mood | text | YES | NO | - | good/neutral/bad |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(ritual_id, date)`

---

### 19. user_attributes

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| key | text | NO | NO | - | health/mind/will |
| points | integer | NO | NO | 0 | |
| level | integer | NO | NO | 1 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, key)`

---

### 20. achievements

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| code | text | NO | NO | - | RITUAL_STREAK_3, etc. |
| metadata | text | YES | NO | - | JSON |
| obtained_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, code)`

---

### 21. notes

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| text | text | NO | NO | - | Текст заметки |
| type | text | NO | NO | 'thought' | thought/diary/content |
| zone | text | NO | NO | 'general' | |
| date | timestamptz | NO | NO | now() | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 22. note_links

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| note_id | uuid | NO | NO | - | FK → notes.id, ON DELETE CASCADE |
| entity | text | NO | NO | - | task/ritual/chain/content |
| entity_id | text | NO | NO | - | ID связанной сущности |
| fragment | text | YES | NO | - | Фрагмент текста |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(note_id, entity, entity_id)`

---

### 23. chains

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| title | text | NO | NO | - | Название цели/проекта |
| status | text | NO | NO | 'active' | active/completed |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 24. tasks

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| chain_id | uuid | YES | NO | - | FK → chains.id, ON DELETE SET NULL |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| text | text | NO | NO | - | Текст задачи |
| status | text | NO | NO | 'todo' | todo/done |
| order | integer | NO | NO | 0 | Позиция в цепочке |
| date | timestamptz | YES | NO | - | Запланированная дата |
| time | text | YES | NO | - | Время (HH:mm) |
| zone | text | YES | NO | - | Зона |
| ritual_id | uuid | YES | NO | - | FK → rituals.id |
| note_id | uuid | YES | NO | - | FK → notes.id |
| content_id | uuid | YES | NO | - | FK → content_items.id, ON DELETE SET NULL |
| notes | text | YES | NO | - | Заметки |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 25. user_settings

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default |
|------|-----|----------|--------|---------|
| id | uuid | NO | YES | gen_random_uuid() |
| user_id | uuid | NO | YES | FK → app_users.id, ON DELETE CASCADE |
| ritual_reminders | boolean | NO | NO | true |
| task_reminders | boolean | NO | NO | true |
| zone_steam_enabled | boolean | NO | NO | true |
| zone_leakfixer_enabled | boolean | NO | NO | true |
| zone_ai_enabled | boolean | NO | NO | true |
| zone_poker_enabled | boolean | NO | NO | true |
| zone_health_enabled | boolean | NO | NO | true |
| theme | text | NO | NO | 'system' |
| created_at | timestamptz | NO | NO | now() |
| updated_at | timestamptz | NO | NO | now() |

---

### 26. feedbacks

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| type | text | NO | NO | - | bug/idea/question/review |
| message | text | NO | NO | - | |
| status | text | NO | NO | 'new' | new/read/resolved |
| created_at | timestamptz | NO | NO | now() | |

---

### 27. accounts

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название счёта |
| type | text | NO | NO | 'cash' | cash/card/poker/steam/other |
| initial_balance | double precision | NO | NO | 0 | Начальный баланс |
| icon | text | YES | NO | - | Эмодзи |
| color | text | YES | NO | - | Hex цвет |
| is_active | boolean | NO | NO | true | |
| sort_order | integer | NO | NO | 0 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 28. categories

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название категории |
| zone | text | NO | NO | 'general' | |
| monthly_target | double precision | YES | NO | - | Бюджет на месяц |
| icon | text | YES | NO | - | |
| color | text | YES | NO | - | |
| sort_order | integer | NO | NO | 0 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 29. transactions

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| account_id | uuid | NO | NO | - | FK → accounts.id, ON DELETE CASCADE |
| category_id | uuid | YES | NO | - | FK → categories.id, ON DELETE SET NULL |
| date | timestamptz | NO | NO | now() | |
| amount | double precision | NO | NO | - | Сумма (+ доход, - расход) |
| description | text | YES | NO | - | Описание |
| zone | text | YES | NO | - | Зона |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 30. challenges

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название челленджа |
| type | text | NO | NO | - | ritual/chain/custom |
| zone | text | NO | NO | 'general' | |
| chain_id | uuid | YES | NO | - | FK → chains.id |
| config | text | NO | NO | '{}' | JSON конфигурация |
| duration | integer | NO | NO | 30 | Длительность (дни) |
| progress | integer | NO | NO | 0 | Прогресс (%) |
| start_date | timestamptz | NO | NO | now() | |
| end_date | timestamptz | YES | NO | - | |
| status | text | NO | NO | 'active' | active/completed/failed |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 31. challenge_progress

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default |
|------|-----|----------|--------|---------|
| id | uuid | NO | YES | gen_random_uuid() |
| challenge_id | uuid | NO | NO | FK → challenges.id, ON DELETE CASCADE |
| days_completed | integer | NO | NO | 0 |
| current_streak | integer | NO | NO | 0 |
| last_checked_at | timestamptz | NO | NO | now() |
| created_at | timestamptz | NO | NO | now() |
| updated_at | timestamptz | NO | NO | now() |

---

### 32. supplements

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | Название (Витамин D, etc.) |
| dosage | text | YES | NO | - | Дозировка |
| unit | text | NO | NO | 'мг' | мг/г/табл/капс/мл |
| standard_dose | double precision | NO | NO | 1 | Стандартная доза |
| time_window | text | NO | NO | 'any' | morning/day/evening/any |
| days | text | NO | NO | '[1,2,3,4,5,6,7]' | JSON дни недели |
| is_active | boolean | NO | NO | true | |
| sort_order | integer | NO | NO | 0 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 33. supplement_intakes

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| supplement_id | uuid | NO | NO | - | FK → supplements.id, ON DELETE CASCADE |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | |
| time | text | YES | NO | - | HH:mm |
| dose | double precision | NO | NO | 1 | Принятая доза |
| checked | boolean | NO | NO | false | |
| note | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(supplement_id, date)`

---

### 34. food_entries

**Primary Key**: `id` (UUID)

| Поле | Тип | Nullable | Unique | Default | Примечание |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK → app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | |
| meal_type | text | NO | NO | 'snack' | breakfast/lunch/dinner/snack |
| name | text | NO | NO | - | Название блюда |
| calories | integer | YES | NO | - | Калории |
| protein | double precision | YES | NO | - | Белки (г) |
| fat | double precision | YES | NO | - | Жиры (г) |
| carbs | double precision | YES | NO | - | Углеводы (г) |
| amount | text | YES | NO | - | Количество |
| quality | text | YES | NO | - | good/neutral/bad |
| note | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

## SQL для создания таблиц через Supabase SQL Editor

Если хотите создать таблицы через SQL, используйте Supabase SQL Editor. Вот базовый шаблон для первой таблицы:

```sql
-- Создание таблицы app_users
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  telegram_language_code TEXT DEFAULT 'ru',
  telegram_photo_url TEXT,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  language TEXT NOT NULL DEFAULT 'ru',
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  phone_verified TIMESTAMPTZ,
  day INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auth_provider TEXT DEFAULT 'telegram',
  last_login_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_app_users_telegram_id ON app_users(telegram_id);
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_phone ON app_users(phone);

-- Комментарии к полям
COMMENT ON TABLE app_users IS 'App users - Telegram Mini App primary identity';
COMMENT ON COLUMN app_users.telegram_id IS 'Telegram User ID';
COMMENT ON COLUMN app_users.auth_provider IS 'telegram, email, or phone';
```

---

## Проверка после создания

После создания всех таблиц проверьте:

1. **Все Foreign Keys** правильно настроены с `ON DELETE CASCADE` или `ON DELETE SET NULL`
2. **Все Unique Constraints** созданы
3. **Все Индексы** созданы для часто запрашиваемых полей
4. **Row Level Security (RLS)** включена на всех таблицах (рекомендуется для Supabase)

### Пример включения RLS

```sql
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь может видеть только свою запись
CREATE POLICY "Users can view own data" ON app_users
  FOR SELECT USING (auth.uid()::text = id::text);
```

---

## Изменения в схеме

При изменении `schema.supabase.prisma`:

1. Обновите этот файл (SUPABASE_CHECKLIST.md)
2. Добавьте секцию "Изменения" с датой и списком изменений
3. Внесите соответствующие изменения в Supabase через SQL Editor

### История изменений

| Дата | Изменение |
|------|-----------|
| 2024-XX-XX | Начальная версия чек-листа |
