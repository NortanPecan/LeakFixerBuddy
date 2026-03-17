-- Buddy Matching v2: добавляем leak_profile в user_profiles
-- Хранит топ-паттерны Leak Engine пользователя (JSON-массив строк)
-- Пример: ["low_energy", "ritual_consistency", "high_spend_days"]
-- Обновляется автоматически при генерации weekly-report

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS "leak_profile" jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_profiles.leak_profile IS
  'Top leak patterns from Leak Engine (array of type strings, e.g. ["low_energy","ritual_consistency"])';
