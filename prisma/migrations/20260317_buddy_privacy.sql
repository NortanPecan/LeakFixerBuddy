-- Migration: Add buddy_privacy to user_settings
-- Date: 2026-03-17
-- Apply manually in Supabase SQL Editor

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS "buddy_privacy" varchar NOT NULL DEFAULT 'full';

COMMENT ON COLUMN user_settings.buddy_privacy IS 'What buddy can see: full | partial | streak';
