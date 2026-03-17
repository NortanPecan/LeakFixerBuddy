-- Migration: Add streak_shield_used_at to app_users
-- Date: 2026-03-17
-- Apply manually in Supabase SQL Editor
--
-- NOTE: streakShieldUsedAt is already in schema.prisma (AppUser model).
-- This migration ensures the column exists in the actual database.

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS "streak_shield_used_at" timestamptz;

COMMENT ON COLUMN app_users.streak_shield_used_at IS 'Timestamp when streak shield was last used. Shield recharges after 7 days.';
