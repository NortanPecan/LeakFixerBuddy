-- Migration: Add streak_shield_used_at to app_users
-- Apply via Supabase SQL Editor

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS streak_shield_used_at TIMESTAMPTZ;
