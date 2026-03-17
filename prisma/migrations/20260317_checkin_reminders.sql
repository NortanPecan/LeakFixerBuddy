-- Migration: Add checkinReminders to user_settings
-- Date: 2026-03-17
-- Apply manually in Supabase SQL Editor

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS "checkin_reminders" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN user_settings.checkin_reminders IS 'Send Telegram reminder when morning/evening checkin is not done';
