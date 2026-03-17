-- Migration: Add daily_checkins table and email auth fields
-- Run this against your Supabase database via SQL editor or psql
-- Date: 2026-03

-- 1. Add email auth fields to app_users
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_salt TEXT;

-- 2. Create daily_checkins table
CREATE TABLE IF NOT EXISTS daily_checkins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('morning', 'evening')),

  -- Morning fields
  energy       INTEGER CHECK (energy BETWEEN 1 AND 10),
  focus_word   TEXT,
  task1        TEXT,
  task2        TEXT,
  task3        TEXT,
  intention    TEXT,

  -- Evening fields
  day_rating   INTEGER CHECK (day_rating BETWEEN 1 AND 10),
  task1_done   BOOLEAN NOT NULL DEFAULT FALSE,
  task2_done   BOOLEAN NOT NULL DEFAULT FALSE,
  task3_done   BOOLEAN NOT NULL DEFAULT FALSE,
  win          TEXT,
  reframe      TEXT,
  evening_note TEXT,

  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One check-in per user per day per type
  CONSTRAINT daily_checkins_user_date_type_key UNIQUE (user_id, date, type)
);

-- Index for fast queries by user + date
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON daily_checkins (user_id, date);

-- Auto-update updated_at on row change (if you have the trigger function)
-- CREATE TRIGGER update_daily_checkins_updated_at
--   BEFORE UPDATE ON daily_checkins
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) — users can only see their own check-ins
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Policy: users can read/write only their own rows
-- (Adjust based on your Supabase auth setup)
-- If you use Prisma with service role key, RLS policies won't block server-side queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'daily_checkins' AND policyname = 'users_own_checkins'
  ) THEN
    CREATE POLICY "users_own_checkins"
      ON daily_checkins
      FOR ALL
      USING (user_id = auth.uid()::uuid);
  END IF;
END $$;
