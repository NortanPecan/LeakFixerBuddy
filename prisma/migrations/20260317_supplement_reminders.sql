-- Add supplement_reminders flag to user_settings
-- Отдельный флаг для напоминаний о БАДах (отдельно от ritual_reminders)

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS supplement_reminders BOOLEAN NOT NULL DEFAULT TRUE;
