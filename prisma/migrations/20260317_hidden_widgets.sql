-- Migration: add hidden_widgets to user_settings (7.2/7.3)
-- Apply manually in Supabase SQL Editor

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS hidden_widgets jsonb NOT NULL DEFAULT '[]'::jsonb;
