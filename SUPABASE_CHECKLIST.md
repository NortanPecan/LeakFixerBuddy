# Supabase Sync Runbook (Updated 2026-03-06)

Source of truth for production schema:

- `prisma/schema.supabase.prisma`

This file now includes a manual sync plan based on the real Supabase snapshot you provided on **2026-03-06**.

## 1) Current state vs target

Current production has legacy/partial tables:

- `app_users`, `buddies`, `daily_logs`, `daily_state`, `fitness_daily`, `fitness_profiles`, `habit_logs`, `habits`, `lessons`, `measurements`, `user_access`, `user_profile`, `users`

Target schema (`schema.supabase.prisma`) requires 34 tables:

- `app_users`, `user_profiles`, `lessons`, `habits`, `habit_logs`, `fitness_daily`, `daily_state`, `measurements`, `gym_periods`, `gym_cycles`, `gym_workouts`, `gym_exercises`, `gym_exercise_sets`, `buddies`, `rituals`, `ritual_completions`, `user_attributes`, `achievements`, `notes`, `note_links`, `chains`, `tasks`, `content_items`, `content_links`, `user_settings`, `feedbacks`, `accounts`, `categories`, `transactions`, `challenges`, `challenge_progress`, `supplements`, `supplement_intakes`, `food_entries`

## 2) New changes you need to apply in Supabase

### 2.1 Add missing columns and constraints in `app_users`

`app_users` currently has only: `id`, `telegram_id`, `username`, `created_at`.

Add missing columns:

- `telegram_username`, `telegram_first_name`, `telegram_last_name`, `telegram_language_code`, `telegram_photo_url`
- `first_name`, `last_name`, `photo_url`, `language`
- `email`, `phone`, `email_verified`, `phone_verified`
- `day`, `streak`, `points`
- `updated_at`, `auth_provider`, `last_login_at`

Add unique/indexes:

- unique: `email`, `phone`
- indexes: `telegram_id`, `email`, `phone`

### 2.2 Replace legacy tables that are structurally incompatible

These tables use incompatible PK/FK/types and should be replaced to match Prisma exactly:

- `buddies` (legacy bigint structure)
- `daily_state` (uses `app_user_id` + `date` as `date` + old extra fields)
- `fitness_daily` (legacy `app_user_id`, `date_key`, JSON payload shape)
- `habit_logs` (legacy bigint/int ids)
- `habits` (legacy int id/code/title)
- `lessons` (legacy int id)
- `measurements` (legacy column names and numeric/jsonb structure)

Recommended action: back up data, then recreate these tables using target definitions from this checklist.

### 2.3 Create missing target tables

Missing and must be created:

- `user_profiles`, `gym_periods`, `gym_cycles`, `gym_workouts`, `gym_exercises`, `gym_exercise_sets`
- `rituals`, `ritual_completions`, `user_attributes`, `achievements`
- `notes`, `note_links`, `chains`, `tasks`
- `content_items`, `content_links`, `user_settings`, `feedbacks`
- `accounts`, `categories`, `transactions`
- `challenges`, `challenge_progress`
- `supplements`, `supplement_intakes`, `food_entries`

### 2.4 Legacy tables not used by target Prisma schema

After data migration/verification, archive or drop:

- `daily_logs`, `fitness_profiles`, `user_access`, `user_profile`, `users`

## 3) SQL execution order (manual)

Run in Supabase SQL Editor in this order:

1. Backup legacy tables (`CREATE TABLE ... AS SELECT ...`).
2. Apply `ALTER TABLE app_users ...` for missing columns/indexes.
3. Create all missing target tables (respect FK dependency order from this checklist).
4. Recreate incompatible legacy tables with target DDL (or create new temp target tables and migrate data).
5. Add/verify FK constraints with `ON DELETE` and `ON UPDATE` actions.
6. Add/verify unique constraints and indexes.
7. Validate with verification queries (section 4 below).

## 4) Verification queries

```sql
-- Tables present in public schema
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Columns present in public schema
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

Expected result: table/column list matches `prisma/schema.supabase.prisma` and this checklist.

## 5) Explicit note about tasks FKs

In `schema.supabase.prisma`, `tasks.ritual_id` and `tasks.note_id` are currently plain UUID fields without Prisma relation constraints.

- Do **not** create FK constraints for `tasks.ritual_id` and `tasks.note_id` unless schema is updated first.
- `tasks.content_id` and `tasks.chain_id` do have FK relations and should be constrained.

---
# Supabase Database Checklist

Р­С‚РѕС‚ РґРѕРєСѓРјРµРЅС‚ СЃРѕРґРµСЂР¶РёС‚ РїРѕР»РЅС‹Р№ СЃРїРёСЃРѕРє С‚Р°Р±Р»РёС† Рё РїРѕР»РµР№, РєРѕС‚РѕСЂС‹Рµ РЅСѓР¶РЅРѕ СЃРѕР·РґР°С‚СЊ РІ Supabase С‡РµСЂРµР· РІРµР±-РёРЅС‚РµСЂС„РµР№СЃ.

> **Р’Р°Р¶РЅРѕ**: РЎРѕР·РґР°РІР°Р№С‚Рµ С‚Р°Р±Р»РёС†С‹ РІ СѓРєР°Р·Р°РЅРЅРѕРј РїРѕСЂСЏРґРєРµ, С‚Р°Рє РєР°Рє РµСЃС‚СЊ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё (foreign keys).

---

## РџРѕСЂСЏРґРѕРє СЃРѕР·РґР°РЅРёСЏ С‚Р°Р±Р»РёС†

1. **app_users** вЂ” РѕСЃРЅРѕРІРЅР°СЏ С‚Р°Р±Р»РёС†Р° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ (СЃРѕР·РґР°С‚СЊ РїРµСЂРІРѕР№!)
2. **user_profiles** вЂ” РїСЂРѕС„РёР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
3. **lessons** вЂ” СѓСЂРѕРєРё РґР»СЏ 30-РґРЅРµРІРЅРѕРіРѕ С†РёРєР»Р°
4. **habits** вЂ” РїСЂРёРІС‹С‡РєРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
5. **habit_logs** вЂ” Р»РѕРі РІС‹РїРѕР»РЅРµРЅРёСЏ РїСЂРёРІС‹С‡РµРє
6. **fitness_daily** вЂ” РµР¶РµРґРЅРµРІРЅС‹Рµ РґР°РЅРЅС‹Рµ С„РёС‚РЅРµСЃР°
7. **daily_state** вЂ” РµР¶РµРґРЅРµРІРЅРѕРµ СЃРѕСЃС‚РѕСЏРЅРёРµ (РЅР°СЃС‚СЂРѕРµРЅРёРµ, СЌРЅРµСЂРіРёСЏ)
8. **measurements** вЂ” РёР·РјРµСЂРµРЅРёСЏ С‚РµР»Р°
9. **gym_periods** вЂ” С‚СЂРµРЅРёСЂРѕРІРѕС‡РЅС‹Рµ РїРµСЂРёРѕРґС‹
10. **gym_cycles** вЂ” С†РёРєР»С‹ С‚СЂРµРЅРёСЂРѕРІРѕРє
11. **gym_workouts** вЂ” С‚СЂРµРЅРёСЂРѕРІРєРё
12. **gym_exercises** вЂ” СѓРїСЂР°Р¶РЅРµРЅРёСЏ РІ С‚СЂРµРЅРёСЂРѕРІРєРµ
13. **gym_exercise_sets** вЂ” РїРѕРґС…РѕРґС‹ РІ СѓРїСЂР°Р¶РЅРµРЅРёРё
14. **buddies** вЂ” РїР°СЂС‚РЅС‘СЂС‹ РїРѕ accountability
15. **content_items** вЂ” РєРѕРЅС‚РµРЅС‚ (РєРЅРёРіРё, РєСѓСЂСЃС‹, РІРёРґРµРѕ)
16. **content_links** вЂ” СЃРІСЏР·Рё РєРѕРЅС‚РµРЅС‚Р° СЃ СЃСѓС‰РЅРѕСЃС‚СЏРјРё
17. **rituals** вЂ” СЂРёС‚СѓР°Р»С‹ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
18. **ritual_completions** вЂ” Р»РѕРі РІС‹РїРѕР»РЅРµРЅРёСЏ СЂРёС‚СѓР°Р»РѕРІ
19. **user_attributes** вЂ” Р°С‚СЂРёР±СѓС‚С‹ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ (health, mind, will)
20. **achievements** вЂ” РґРѕСЃС‚РёР¶РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
21. **notes** вЂ” Р·Р°РјРµС‚РєРё
22. **note_links** вЂ” СЃРІСЏР·Рё Р·Р°РјРµС‚РѕРє СЃ СЃСѓС‰РЅРѕСЃС‚СЏРјРё
23. **chains** вЂ” С†РµРїРѕС‡РєРё Р·Р°РґР°С‡
24. **tasks** вЂ” Р·Р°РґР°С‡Рё
25. **user_settings** вЂ” РЅР°СЃС‚СЂРѕР№РєРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
26. **feedbacks** вЂ” РѕР±СЂР°С‚РЅР°СЏ СЃРІСЏР·СЊ
27. **accounts** вЂ” С„РёРЅР°РЅСЃРѕРІС‹Рµ СЃС‡РµС‚Р°
28. **categories** вЂ” РєР°С‚РµРіРѕСЂРёРё С„РёРЅР°РЅСЃРѕРІ
29. **transactions** вЂ” С„РёРЅР°РЅСЃРѕРІС‹Рµ С‚СЂР°РЅР·Р°РєС†РёРё
30. **challenges** вЂ” С‡РµР»Р»РµРЅРґР¶Рё
31. **challenge_progress** вЂ” РїСЂРѕРіСЂРµСЃСЃ С‡РµР»Р»РµРЅРґР¶РµР№
32. **supplements** вЂ” РґРѕР±Р°РІРєРё/РІРёС‚Р°РјРёРЅС‹
33. **supplement_intakes** вЂ” РїСЂРёС‘Рј РґРѕР±Р°РІРѕРє
34. **food_entries** вЂ” Р·Р°РїРёСЃРё Рѕ РµРґРµ

---

## Р”РµС‚Р°Р»СЊРЅРѕРµ РѕРїРёСЃР°РЅРёРµ С‚Р°Р±Р»РёС†

### 1. app_users

**Primary Key**: `id` (UUID, auto-generated)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | Primary key |
| telegram_id | bigint | YES | YES | - | Telegram User ID |
| telegram_username | text | YES | NO | - | @username Р±РµР· @ |
| telegram_first_name | text | YES | NO | - | РРјСЏ РёР· Telegram |
| telegram_last_name | text | YES | NO | - | Р¤Р°РјРёР»РёСЏ РёР· Telegram |
| telegram_language_code | text | YES | NO | 'ru' | РљРѕРґ СЏР·С‹РєР° |
| telegram_photo_url | text | YES | NO | - | URL Р°РІР°С‚Р°СЂР° |
| username | text | YES | NO | - | Legacy field |
| first_name | text | YES | NO | - | Legacy field |
| last_name | text | YES | NO | - | Legacy field |
| photo_url | text | YES | NO | - | Legacy field |
| language | text | NO | NO | 'ru' | РЇР·С‹Рє РёРЅС‚РµСЂС„РµР№СЃР° |
| email | text | YES | YES | - | Р”Р»СЏ Р±СѓРґСѓС‰РµР№ Р°РІС‚РѕСЂРёР·Р°С†РёРё |
| phone | text | YES | YES | - | Р”Р»СЏ Р±СѓРґСѓС‰РµР№ Р°РІС‚РѕСЂРёР·Р°С†РёРё |
| email_verified | timestamptz | YES | NO | - | Р”Р°С‚Р° РІРµСЂРёС„РёРєР°С†РёРё email |
| phone_verified | timestamptz | YES | NO | - | Р”Р°С‚Р° РІРµСЂРёС„РёРєР°С†РёРё С‚РµР»РµС„РѕРЅР° |
| day | integer | NO | NO | 1 | РўРµРєСѓС‰РёР№ РґРµРЅСЊ РїСЂРѕРіСЂР°РјРјС‹ |
| streak | integer | NO | NO | 0 | РЎРµСЂРёСЏ РґРЅРµР№ |
| points | integer | NO | NO | 0 | РћС‡РєРё РіРµР№РјРёС„РёРєР°С†РёРё |
| created_at | timestamptz | NO | NO | now() | Р”Р°С‚Р° СЃРѕР·РґР°РЅРёСЏ |
| updated_at | timestamptz | NO | NO | now() | Р”Р°С‚Р° РѕР±РЅРѕРІР»РµРЅРёСЏ |
| auth_provider | text | YES | NO | 'telegram' | telegram/email/phone |
| last_login_at | timestamptz | YES | NO | - | РџРѕСЃР»РµРґРЅРёР№ РІС…РѕРґ |

**РРЅРґРµРєСЃС‹**:
- `idx_app_users_telegram_id` on `telegram_id`
- `idx_app_users_email` on `email`
- `idx_app_users_phone` on `phone`

---

### 2. user_profiles

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | Primary key |
| user_id | uuid | NO | YES | - | FK в†’ app_users.id, ON DELETE CASCADE |
| weight | double precision | YES | NO | - | Р’РµСЃ РІ РєРі |
| height | double precision | YES | NO | - | Р РѕСЃС‚ РІ СЃРј |
| age | integer | YES | NO | - | Р’РѕР·СЂР°СЃС‚ |
| sex | text | YES | NO | - | male/female |
| target_weight | double precision | YES | NO | - | Р¦РµР»РµРІРѕР№ РІРµСЃ |
| target_calories | integer | YES | NO | - | Р¦РµР»РµРІС‹Рµ РєР°Р»РѕСЂРёРё |
| work_profile | text | YES | NO | - | sedentary/mixed/physical/variable |
| water_baseline | integer | NO | NO | 2000 | Р‘Р°Р·РѕРІР°СЏ РЅРѕСЂРјР° РІРѕРґС‹ (РјР») |
| waist | double precision | YES | NO | - | РћР±С…РІР°С‚ С‚Р°Р»РёРё |
| hips | double precision | YES | NO | - | РћР±С…РІР°С‚ Р±С‘РґРµСЂ |
| chest | double precision | YES | NO | - | РћР±С…РІР°С‚ РіСЂСѓРґРё |
| bicep | double precision | YES | NO | - | РћР±С…РІР°С‚ Р±РёС†РµРїСЃР° |
| thigh | double precision | YES | NO | - | РћР±С…РІР°С‚ Р±РµРґСЂР° |
| bio | text | YES | NO | - | Рћ СЃРµР±Рµ |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 3. lessons

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| day | integer | NO | YES | - | Р”РµРЅСЊ (1-30) |
| title | text | NO | NO | - | Р—Р°РіРѕР»РѕРІРѕРє СѓСЂРѕРєР° |
| description | text | YES | NO | - | РћРїРёСЃР°РЅРёРµ |
| video_url | text | YES | NO | - | РЎСЃС‹Р»РєР° РЅР° РІРёРґРµРѕ |
| content | text | YES | NO | - | РўРµРєСЃС‚ СѓСЂРѕРєР° |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 4. habits

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ РїСЂРёРІС‹С‡РєРё |
| icon | text | YES | NO | - | Р­РјРѕРґР·Рё РёР»Рё РёРјСЏ РёРєРѕРЅРєРё |
| color | text | YES | NO | - | Hex С†РІРµС‚ |
| frequency | text | YES | NO | - | Р§Р°СЃС‚РѕС‚Р° |
| target | integer | YES | NO | - | Р¦РµР»РµРІРѕРµ Р·РЅР°С‡РµРЅРёРµ |
| active | boolean | NO | NO | true | РђРєС‚РёРІРЅР° Р»Рё РїСЂРёРІС‹С‡РєР° |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 5. habit_logs

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| habit_id | uuid | NO | NO | - | FK в†’ habits.id, ON DELETE CASCADE |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | Р”Р°С‚Р° Р·Р°РїРёСЃРё |
| completed | boolean | NO | NO | false | Р’С‹РїРѕР»РЅРµРЅРѕ Р»Рё |
| count | integer | NO | NO | 1 | РљРѕР»РёС‡РµСЃС‚РІРѕ |
| note | text | YES | NO | - | Р—Р°РјРµС‚РєР° |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(habit_id, date)` вЂ” РѕРґРЅР° Р·Р°РїРёСЃСЊ РЅР° РїСЂРёРІС‹С‡РєСѓ РІ РґРµРЅСЊ

---

### 6. fitness_daily

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | Р”Р°С‚Р° |
| activities | text | YES | NO | - | JSON СЃ Р°РєС‚РёРІРЅРѕСЃС‚СЏРјРё |
| foods | text | YES | NO | - | JSON СЃ РµРґРѕР№ |
| water | integer | NO | NO | 0 | Р’С‹РїРёС‚Рѕ РІРѕРґС‹ (РјР») |
| water_target | integer | NO | NO | 2000 | Р¦РµР»СЊ РІРѕРґС‹ (РјР») |
| supplements | text | YES | NO | - | JSON СЃ РґРѕР±Р°РІРєР°РјРё |
| mood | integer | YES | NO | - | РќР°СЃС‚СЂРѕРµРЅРёРµ (1-10) |
| energy | integer | YES | NO | - | Р­РЅРµСЂРіРёСЏ (1-10) |
| gym_state | text | YES | NO | - | РЎРѕСЃС‚РѕСЏРЅРёРµ С‚СЂРµРЅРёСЂРѕРІРєРё |
| notes | text | YES | NO | - | Р—Р°РјРµС‚РєРё |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, date)` вЂ” РѕРґРЅР° Р·Р°РїРёСЃСЊ РЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РІ РґРµРЅСЊ

---

### 7. daily_state

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default |
|------|-----|----------|--------|---------|
| id | uuid | NO | YES | gen_random_uuid() |
| user_id | uuid | NO | NO | FK в†’ app_users.id, ON DELETE CASCADE |
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

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| type | text | NO | NO | - | waist/hips/chest/bicep/thigh/weight |
| value | double precision | NO | NO | - | Р—РЅР°С‡РµРЅРёРµ |
| unit | text | YES | NO | - | Р•РґРёРЅРёС†Р° РёР·РјРµСЂРµРЅРёСЏ |
| date | timestamptz | NO | NO | now() | Р”Р°С‚Р° РёР·РјРµСЂРµРЅРёСЏ |
| note | text | YES | NO | - | Р—Р°РјРµС‚РєР° |
| photo_url | text | YES | NO | - | РЎСЃС‹Р»РєР° РЅР° С„РѕС‚Рѕ |
| created_at | timestamptz | NO | NO | now() | |

---

### 9. gym_periods

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ РїРµСЂРёРѕРґР° |
| type | text | NO | NO | - | split/fullbody/ppl/upper_lower/custom |
| cycle_length | integer | NO | NO | 7 | Р”РЅРµР№ РІ С†РёРєР»Рµ |
| workouts_per_cycle | integer | NO | NO | 4 | РўСЂРµРЅРёСЂРѕРІРѕРє РІ С†РёРєР»Рµ |
| total_cycles | integer | NO | NO | 8 | Р’СЃРµРіРѕ С†РёРєР»РѕРІ |
| current_cycle | integer | NO | NO | 1 | РўРµРєСѓС‰РёР№ С†РёРєР» |
| current_day | integer | NO | NO | 1 | РўРµРєСѓС‰РёР№ РґРµРЅСЊ |
| start_date | timestamptz | NO | NO | now() | Р”Р°С‚Р° РЅР°С‡Р°Р»Р° |
| end_date | timestamptz | YES | NO | - | Р”Р°С‚Р° РѕРєРѕРЅС‡Р°РЅРёСЏ |
| is_active | boolean | NO | NO | true | РђРєС‚РёРІРµРЅ Р»Рё |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 10. gym_cycles

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| period_id | uuid | NO | NO | - | FK в†’ gym_periods.id, ON DELETE CASCADE |
| cycle_num | integer | NO | NO | - | РќРѕРјРµСЂ С†РёРєР»Р° |
| start_date | timestamptz | NO | NO | now() | |
| end_date | timestamptz | YES | NO | - | |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 11. gym_workouts

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| period_id | uuid | NO | NO | - | FK в†’ gym_periods.id, ON DELETE CASCADE |
| cycle_id | uuid | YES | NO | - | FK в†’ gym_cycles.id, ON DELETE SET NULL |
| date | timestamptz | NO | NO | now() | |
| day_of_week | integer | NO | NO | - | 1-7 |
| workout_num | integer | NO | NO | - | РќРѕРјРµСЂ С‚СЂРµРЅРёСЂРѕРІРєРё |
| name | text | YES | NO | - | РќР°Р·РІР°РЅРёРµ |
| muscle_groups | text | YES | NO | - | JSON РјР°СЃСЃРёРІ |
| duration | integer | YES | NO | - | Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ) |
| completed | boolean | NO | NO | false | |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 12. gym_exercises

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| workout_id | uuid | NO | NO | - | FK в†’ gym_workouts.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ СѓРїСЂР°Р¶РЅРµРЅРёСЏ |
| muscle_group | text | YES | NO | - | Р“СЂСѓРїРїР° РјС‹С€С† |
| order | integer | NO | NO | 0 | РџРѕСЂСЏРґРѕРє |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 13. gym_exercise_sets

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| exercise_id | uuid | NO | NO | - | FK в†’ gym_exercises.id, ON DELETE CASCADE |
| set_num | integer | NO | NO | - | РќРѕРјРµСЂ РїРѕРґС…РѕРґР° |
| weight | double precision | YES | NO | - | Р’РµСЃ (РєРі) |
| reps | integer | YES | NO | - | РџРѕРІС‚РѕСЂРµРЅРёСЏ |
| duration | integer | YES | NO | - | Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (СЃРµРє) |
| completed | boolean | NO | NO | false | |
| notes | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

### 14. buddies

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| partner_id | text | NO | NO | - | ID РїР°СЂС‚РЅС‘СЂР° |
| partner_name | text | NO | NO | - | РРјСЏ РїР°СЂС‚РЅС‘СЂР° |
| partner_photo | text | YES | NO | - | Р¤РѕС‚Рѕ РїР°СЂС‚РЅС‘СЂР° |
| status | text | NO | NO | 'pending' | pending/accepted/rejected |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, partner_id)`

---

### 15. content_items

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| type | text | NO | NO | - | book/movie/course/podcast/video |
| title | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ |
| status | text | NO | NO | 'planned' | planned/in_progress/completed |
| source | text | YES | NO | - | РџР»Р°С‚С„РѕСЂРјР° |
| url | text | YES | NO | - | РЎСЃС‹Р»РєР° |
| zone | text | NO | NO | 'general' | Р—РѕРЅР° |
| total_units | integer | YES | NO | - | Р’СЃРµРіРѕ РµРґРёРЅРёС† |
| current_units | integer | YES | NO | - | РўРµРєСѓС‰РёР№ РїСЂРѕРіСЂРµСЃСЃ |
| unit_type | text | YES | NO | - | pages/lessons/minutes/percent |
| author | text | YES | NO | - | РђРІС‚РѕСЂ |
| image_url | text | YES | NO | - | РћР±Р»РѕР¶РєР° |
| description | text | YES | NO | - | РћРїРёСЃР°РЅРёРµ |
| notes | text | YES | NO | - | Р—Р°РјРµС‚РєРё |
| started_at | timestamptz | YES | NO | - | Р”Р°С‚Р° РЅР°С‡Р°Р»Р° |
| completed_at | timestamptz | YES | NO | - | Р”Р°С‚Р° Р·Р°РІРµСЂС€РµРЅРёСЏ |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 16. content_links

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| content_id | uuid | NO | NO | - | FK в†’ content_items.id, ON DELETE CASCADE |
| entity | text | NO | NO | - | note/ritual |
| entity_id | text | NO | NO | - | ID СЃРІСЏР·Р°РЅРЅРѕР№ СЃСѓС‰РЅРѕСЃС‚Рё |
| fragment | text | YES | NO | - | Р¤СЂР°РіРјРµРЅС‚/С†РёС‚Р°С‚Р° |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(content_id, entity, entity_id)`

---

### 17. rituals

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| title | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ |
| type | text | NO | NO | 'regular' | regular/bad/one_time |
| category | text | NO | NO | - | health/money/learning/relationships/mind/productivity |
| days | text | NO | NO | '[]' | JSON РјР°СЃСЃРёРІ [1,2,3,4,5,6,7] |
| time_window | text | NO | NO | 'any' | morning/day/evening/any |
| reminder | boolean | NO | NO | false | |
| reminder_time | text | YES | NO | - | HH:mm |
| goal_short | text | YES | NO | - | РљСЂР°С‚РєР°СЏ С†РµР»СЊ |
| description | text | YES | NO | - | РћРїРёСЃР°РЅРёРµ |
| is_from_preset | boolean | NO | NO | false | |
| preset_id | text | YES | NO | - | ID РїСЂРµСЃРµС‚Р° |
| status | text | NO | NO | 'active' | active/archived |
| attributes | text | NO | NO | '[]' | JSON РјР°СЃСЃРёРІ ["health", "will"] |
| sort_order | integer | NO | NO | 0 | |
| content_id | uuid | YES | NO | - | FK в†’ content_items.id, ON DELETE SET NULL |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 18. ritual_completions

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| ritual_id | uuid | NO | NO | - | FK в†’ rituals.id, ON DELETE CASCADE |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | |
| completed | boolean | NO | NO | true | |
| note | text | YES | NO | - | |
| mood | text | YES | NO | - | good/neutral/bad |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(ritual_id, date)`

---

### 19. user_attributes

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| key | text | NO | NO | - | health/mind/will |
| points | integer | NO | NO | 0 | |
| level | integer | NO | NO | 1 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, key)`

---

### 20. achievements

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| code | text | NO | NO | - | RITUAL_STREAK_3, etc. |
| metadata | text | YES | NO | - | JSON |
| obtained_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(user_id, code)`

---

### 21. notes

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| text | text | NO | NO | - | РўРµРєСЃС‚ Р·Р°РјРµС‚РєРё |
| type | text | NO | NO | 'thought' | thought/diary/content |
| zone | text | NO | NO | 'general' | |
| date | timestamptz | NO | NO | now() | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 22. note_links

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| note_id | uuid | NO | NO | - | FK в†’ notes.id, ON DELETE CASCADE |
| entity | text | NO | NO | - | task/ritual/chain/content |
| entity_id | text | NO | NO | - | ID СЃРІСЏР·Р°РЅРЅРѕР№ СЃСѓС‰РЅРѕСЃС‚Рё |
| fragment | text | YES | NO | - | Р¤СЂР°РіРјРµРЅС‚ С‚РµРєСЃС‚Р° |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(note_id, entity, entity_id)`

---

### 23. chains

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| title | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ С†РµР»Рё/РїСЂРѕРµРєС‚Р° |
| status | text | NO | NO | 'active' | active/completed |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 24. tasks

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| chain_id | uuid | YES | NO | - | FK в†’ chains.id, ON DELETE SET NULL |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| text | text | NO | NO | - | РўРµРєСЃС‚ Р·Р°РґР°С‡Рё |
| status | text | NO | NO | 'todo' | todo/done |
| order | integer | NO | NO | 0 | РџРѕР·РёС†РёСЏ РІ С†РµРїРѕС‡РєРµ |
| date | timestamptz | YES | NO | - | Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅРЅР°СЏ РґР°С‚Р° |
| time | text | YES | NO | - | Р’СЂРµРјСЏ (HH:mm) |
| zone | text | YES | NO | - | Р—РѕРЅР° |
| ritual_id | uuid | YES | NO | - | FK в†’ rituals.id |
| note_id | uuid | YES | NO | - | FK в†’ notes.id |
| content_id | uuid | YES | NO | - | FK в†’ content_items.id, ON DELETE SET NULL |
| notes | text | YES | NO | - | Р—Р°РјРµС‚РєРё |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 25. user_settings

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default |
|------|-----|----------|--------|---------|
| id | uuid | NO | YES | gen_random_uuid() |
| user_id | uuid | NO | YES | FK в†’ app_users.id, ON DELETE CASCADE |
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

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| type | text | NO | NO | - | bug/idea/question/review |
| message | text | NO | NO | - | |
| status | text | NO | NO | 'new' | new/read/resolved |
| created_at | timestamptz | NO | NO | now() | |

---

### 27. accounts

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ СЃС‡С‘С‚Р° |
| type | text | NO | NO | 'cash' | cash/card/poker/steam/other |
| initial_balance | double precision | NO | NO | 0 | РќР°С‡Р°Р»СЊРЅС‹Р№ Р±Р°Р»Р°РЅСЃ |
| icon | text | YES | NO | - | Р­РјРѕРґР·Рё |
| color | text | YES | NO | - | Hex С†РІРµС‚ |
| is_active | boolean | NO | NO | true | |
| sort_order | integer | NO | NO | 0 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 28. categories

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ РєР°С‚РµРіРѕСЂРёРё |
| zone | text | NO | NO | 'general' | |
| monthly_target | double precision | YES | NO | - | Р‘СЋРґР¶РµС‚ РЅР° РјРµСЃСЏС† |
| icon | text | YES | NO | - | |
| color | text | YES | NO | - | |
| sort_order | integer | NO | NO | 0 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 29. transactions

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| account_id | uuid | NO | NO | - | FK в†’ accounts.id, ON DELETE CASCADE |
| category_id | uuid | YES | NO | - | FK в†’ categories.id, ON DELETE SET NULL |
| date | timestamptz | NO | NO | now() | |
| amount | double precision | NO | NO | - | РЎСѓРјРјР° (+ РґРѕС…РѕРґ, - СЂР°СЃС…РѕРґ) |
| description | text | YES | NO | - | РћРїРёСЃР°РЅРёРµ |
| zone | text | YES | NO | - | Р—РѕРЅР° |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 30. challenges

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ С‡РµР»Р»РµРЅРґР¶Р° |
| type | text | NO | NO | - | ritual/chain/custom |
| zone | text | NO | NO | 'general' | |
| chain_id | uuid | YES | NO | - | FK в†’ chains.id |
| config | text | NO | NO | '{}' | JSON РєРѕРЅС„РёРіСѓСЂР°С†РёСЏ |
| duration | integer | NO | NO | 30 | Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РґРЅРё) |
| progress | integer | NO | NO | 0 | РџСЂРѕРіСЂРµСЃСЃ (%) |
| start_date | timestamptz | NO | NO | now() | |
| end_date | timestamptz | YES | NO | - | |
| status | text | NO | NO | 'active' | active/completed/failed |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 31. challenge_progress

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default |
|------|-----|----------|--------|---------|
| id | uuid | NO | YES | gen_random_uuid() |
| challenge_id | uuid | NO | NO | FK в†’ challenges.id, ON DELETE CASCADE |
| days_completed | integer | NO | NO | 0 |
| current_streak | integer | NO | NO | 0 |
| last_checked_at | timestamptz | NO | NO | now() |
| created_at | timestamptz | NO | NO | now() |
| updated_at | timestamptz | NO | NO | now() |

---

### 32. supplements

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ (Р’РёС‚Р°РјРёРЅ D, etc.) |
| dosage | text | YES | NO | - | Р”РѕР·РёСЂРѕРІРєР° |
| unit | text | NO | NO | 'РјРі' | РјРі/Рі/С‚Р°Р±Р»/РєР°РїСЃ/РјР» |
| standard_dose | double precision | NO | NO | 1 | РЎС‚Р°РЅРґР°СЂС‚РЅР°СЏ РґРѕР·Р° |
| time_window | text | NO | NO | 'any' | morning/day/evening/any |
| days | text | NO | NO | '[1,2,3,4,5,6,7]' | JSON РґРЅРё РЅРµРґРµР»Рё |
| is_active | boolean | NO | NO | true | |
| sort_order | integer | NO | NO | 0 | |
| created_at | timestamptz | NO | NO | now() | |
| updated_at | timestamptz | NO | NO | now() | |

---

### 33. supplement_intakes

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| supplement_id | uuid | NO | NO | - | FK в†’ supplements.id, ON DELETE CASCADE |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | |
| time | text | YES | NO | - | HH:mm |
| dose | double precision | NO | NO | 1 | РџСЂРёРЅСЏС‚Р°СЏ РґРѕР·Р° |
| checked | boolean | NO | NO | false | |
| note | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

**Unique Constraint**: `(supplement_id, date)`

---

### 34. food_entries

**Primary Key**: `id` (UUID)

| РџРѕР»Рµ | РўРёРї | Nullable | Unique | Default | РџСЂРёРјРµС‡Р°РЅРёРµ |
|------|-----|----------|--------|---------|------------|
| id | uuid | NO | YES | gen_random_uuid() | |
| user_id | uuid | NO | NO | - | FK в†’ app_users.id, ON DELETE CASCADE |
| date | timestamptz | NO | NO | now() | |
| meal_type | text | NO | NO | 'snack' | breakfast/lunch/dinner/snack |
| name | text | NO | NO | - | РќР°Р·РІР°РЅРёРµ Р±Р»СЋРґР° |
| calories | integer | YES | NO | - | РљР°Р»РѕСЂРёРё |
| protein | double precision | YES | NO | - | Р‘РµР»РєРё (Рі) |
| fat | double precision | YES | NO | - | Р–РёСЂС‹ (Рі) |
| carbs | double precision | YES | NO | - | РЈРіР»РµРІРѕРґС‹ (Рі) |
| amount | text | YES | NO | - | РљРѕР»РёС‡РµСЃС‚РІРѕ |
| quality | text | YES | NO | - | good/neutral/bad |
| note | text | YES | NO | - | |
| created_at | timestamptz | NO | NO | now() | |

---

## SQL РґР»СЏ СЃРѕР·РґР°РЅРёСЏ С‚Р°Р±Р»РёС† С‡РµСЂРµР· Supabase SQL Editor

Р•СЃР»Рё С…РѕС‚РёС‚Рµ СЃРѕР·РґР°С‚СЊ С‚Р°Р±Р»РёС†С‹ С‡РµСЂРµР· SQL, РёСЃРїРѕР»СЊР·СѓР№С‚Рµ Supabase SQL Editor. Р’РѕС‚ Р±Р°Р·РѕРІС‹Р№ С€Р°Р±Р»РѕРЅ РґР»СЏ РїРµСЂРІРѕР№ С‚Р°Р±Р»РёС†С‹:

```sql
-- РЎРѕР·РґР°РЅРёРµ С‚Р°Р±Р»РёС†С‹ app_users
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

-- РРЅРґРµРєСЃС‹
CREATE INDEX idx_app_users_telegram_id ON app_users(telegram_id);
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_phone ON app_users(phone);

-- РљРѕРјРјРµРЅС‚Р°СЂРёРё Рє РїРѕР»СЏРј
COMMENT ON TABLE app_users IS 'App users - Telegram Mini App primary identity';
COMMENT ON COLUMN app_users.telegram_id IS 'Telegram User ID';
COMMENT ON COLUMN app_users.auth_provider IS 'telegram, email, or phone';
```

---

## РџСЂРѕРІРµСЂРєР° РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ

РџРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ РІСЃРµС… С‚Р°Р±Р»РёС† РїСЂРѕРІРµСЂСЊС‚Рµ:

1. **Р’СЃРµ Foreign Keys** РїСЂР°РІРёР»СЊРЅРѕ РЅР°СЃС‚СЂРѕРµРЅС‹ СЃ `ON DELETE CASCADE` РёР»Рё `ON DELETE SET NULL`
2. **Р’СЃРµ Unique Constraints** СЃРѕР·РґР°РЅС‹
3. **Р’СЃРµ РРЅРґРµРєСЃС‹** СЃРѕР·РґР°РЅС‹ РґР»СЏ С‡Р°СЃС‚Рѕ Р·Р°РїСЂР°С€РёРІР°РµРјС‹С… РїРѕР»РµР№
4. **Row Level Security (RLS)** РІРєР»СЋС‡РµРЅР° РЅР° РІСЃРµС… С‚Р°Р±Р»РёС†Р°С… (СЂРµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ РґР»СЏ Supabase)

### РџСЂРёРјРµСЂ РІРєР»СЋС‡РµРЅРёСЏ RLS

```sql
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- РџРѕР»РёС‚РёРєР°: РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РјРѕР¶РµС‚ РІРёРґРµС‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕСЋ Р·Р°РїРёСЃСЊ
CREATE POLICY "Users can view own data" ON app_users
  FOR SELECT USING (auth.uid()::text = id::text);
```

---

## РР·РјРµРЅРµРЅРёСЏ РІ СЃС…РµРјРµ

РџСЂРё РёР·РјРµРЅРµРЅРёРё `schema.supabase.prisma`:

1. РћР±РЅРѕРІРёС‚Рµ СЌС‚РѕС‚ С„Р°Р№Р» (SUPABASE_CHECKLIST.md)
2. Р”РѕР±Р°РІСЊС‚Рµ СЃРµРєС†РёСЋ "РР·РјРµРЅРµРЅРёСЏ" СЃ РґР°С‚РѕР№ Рё СЃРїРёСЃРєРѕРј РёР·РјРµРЅРµРЅРёР№
3. Р’РЅРµСЃРёС‚Рµ СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‰РёРµ РёР·РјРµРЅРµРЅРёСЏ РІ Supabase С‡РµСЂРµР· SQL Editor

### РСЃС‚РѕСЂРёСЏ РёР·РјРµРЅРµРЅРёР№

| Р”Р°С‚Р° | РР·РјРµРЅРµРЅРёРµ |
|------|-----------|
| 2024-XX-XX | РќР°С‡Р°Р»СЊРЅР°СЏ РІРµСЂСЃРёСЏ С‡РµРє-Р»РёСЃС‚Р° |

