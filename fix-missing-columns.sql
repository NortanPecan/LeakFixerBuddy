-- LeakFixerBuddy: Fix Missing Columns (COMPLETE v2)
-- Run this in Supabase SQL Editor
-- This adds missing columns that were not in the initial migration

-- ============================================
-- USER_WELLBEING_SETTINGS: Add preset column (CRITICAL!)
-- ============================================
ALTER TABLE user_wellbeing_settings ADD COLUMN IF NOT EXISTS preset TEXT DEFAULT 'core';

-- ============================================
-- DAILY_WELLBEING: Add missing columns
-- ============================================
ALTER TABLE daily_wellbeing ADD COLUMN IF NOT EXISTS preset TEXT DEFAULT 'core';
ALTER TABLE daily_wellbeing ADD COLUMN IF NOT EXISTS answers TEXT;
ALTER TABLE daily_wellbeing ADD COLUMN IF NOT EXISTS scores TEXT;
ALTER TABLE daily_wellbeing ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================
-- TRAITS: Add missing columns (CRITICAL!)
-- ============================================
ALTER TABLE traits ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'positive';
ALTER TABLE traits ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 5;
ALTER TABLE traits ADD COLUMN IF NOT EXISTS target_score INTEGER;
ALTER TABLE traits ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE traits ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE traits ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- ============================================
-- TRAIT_HISTORY: Add missing columns
-- ============================================
ALTER TABLE trait_history ADD COLUMN IF NOT EXISTS old_score INTEGER;
ALTER TABLE trait_history ADD COLUMN IF NOT EXISTS new_score INTEGER;
ALTER TABLE trait_history ADD COLUMN IF NOT EXISTS delta INTEGER;

-- ============================================
-- SKILLS: Add missing columns
-- ============================================
ALTER TABLE skills ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 2;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS xp_to_next INTEGER DEFAULT 100;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS max_level INTEGER DEFAULT 10;

-- ============================================
-- SKILL_HISTORY: Add missing columns
-- ============================================
ALTER TABLE skill_history ADD COLUMN IF NOT EXISTS old_level INTEGER;
ALTER TABLE skill_history ADD COLUMN IF NOT EXISTS new_level INTEGER;
ALTER TABLE skill_history ADD COLUMN IF NOT EXISTS xp_gained INTEGER;

-- ============================================
-- CHALLENGES: Add missing columns
-- ============================================
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS direction_id UUID;

-- ============================================
-- DIRECTIONS: Ensure sort_order column
-- ============================================
ALTER TABLE directions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================
-- CHALLENGE_PROGRESS: Create if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL,
    days_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Add foreign key to challenge_progress
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_challenge_progress_challenge'
    ) THEN
        ALTER TABLE challenge_progress 
        ADD CONSTRAINT fk_challenge_progress_challenge 
        FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_traits_user_id ON traits(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_daily_wellbeing_user_date ON daily_wellbeing(user_id, date);

-- ============================================
-- VERIFICATION: Check tables exist
-- ============================================
SELECT 'directions' as table_name, COUNT(*) as count FROM directions
UNION ALL
SELECT 'skills', COUNT(*) FROM skills
UNION ALL
SELECT 'traits', COUNT(*) FROM traits
UNION ALL
SELECT 'challenges', COUNT(*) FROM challenges
UNION ALL
SELECT 'challenge_progress', COUNT(*) FROM challenge_progress
UNION ALL
SELECT 'daily_wellbeing', COUNT(*) FROM daily_wellbeing
UNION ALL
SELECT 'user_wellbeing_settings', COUNT(*) FROM user_wellbeing_settings;
