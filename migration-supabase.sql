-- LeakFixerBuddy Migration: master → main (Supabase)
-- Generated: 2025-03-10
-- 
-- THIS IS AN INCREMENTAL MIGRATION - adds new tables and columns
-- Existing data will NOT be affected

-- ============================================
-- STEP 1: NEW TABLES (11 total)
-- ============================================

-- 1. Directions (vision/goals)
CREATE TABLE IF NOT EXISTS directions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    horizon TEXT DEFAULT 'year',
    color TEXT DEFAULT '#10b981',
    icon TEXT,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 2. skills
CREATE TABLE IF NOT EXISTS skills (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    target_xp INTEGER,
    parent_id UUID,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 3. skill_history
CREATE TABLE IF NOT EXISTS skill_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL,
    user_id UUID NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 4. traits
CREATE TABLE IF NOT EXISTS traits (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    target_xp INTEGER,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 5. trait_history
CREATE TABLE IF NOT EXISTS trait_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    trait_id UUID NOT NULL,
    user_id UUID NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 6. gym_exercise_templates
CREATE TABLE IF NOT EXISTS gym_exercise_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    muscle_group TEXT,
    goal TEXT,
    default_reps INTEGER,
    default_sets INTEGER DEFAULT 4,
    default_scheme TEXT,
    progression_type TEXT,
    progression_step DOUBLE PRECISION,
    current_weight DOUBLE PRECISION,
    next_weight DOUBLE PRECISION,
    technique_notes TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 7. gym_workout_templates
CREATE TABLE IF NOT EXISTS gym_workout_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL,
    workout_num INTEGER NOT NULL,
    name TEXT NOT NULL,
    muscle_groups TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 8. gym_workout_template_exercises
CREATE TABLE IF NOT EXISTS gym_workout_template_exercises (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    workout_template_id UUID NOT NULL,
    exercise_template_id UUID,
    name TEXT NOT NULL,
    muscle_group TEXT,
    "order" INTEGER DEFAULT 0,
    default_scheme TEXT,
    default_reps INTEGER,
    default_sets INTEGER DEFAULT 4,
    default_weight DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 9. user_wellbeing_settings
CREATE TABLE IF NOT EXISTS user_wellbeing_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    daily_reminder_time TEXT DEFAULT '21:00',
    weekly_reminder_day INTEGER DEFAULT 0,
    weekly_reminder_time TEXT DEFAULT '21:00',
    daily_enabled BOOLEAN DEFAULT true,
    weekly_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 10. daily_wellbeing
CREATE TABLE IF NOT EXISTS daily_wellbeing (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mood INTEGER,
    energy INTEGER,
    stress INTEGER,
    sleep_hours DOUBLE PRECISION,
    sleep_quality INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (user_id, date)
);

-- 11. weekly_wellbeing
CREATE TABLE IF NOT EXISTS weekly_wellbeing (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    week_start_date TIMESTAMPTZ NOT NULL,
    overall_mood INTEGER,
    overall_energy INTEGER,
    overall_stress INTEGER,
    avg_sleep_hours DOUBLE PRECISION,
    workout_count INTEGER DEFAULT 0,
    ritual_completion_rate DOUBLE PRECISION DEFAULT 0,
    wins TEXT,
    challenges TEXT,
    focus_areas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (user_id, week_start_date)
);

-- ============================================
-- STEP 2: NEW COLUMNS ON EXISTING TABLES
-- ============================================

-- daily_state: LeakFix analytics preparation
ALTER TABLE daily_state ADD COLUMN IF NOT EXISTS stress INTEGER;
ALTER TABLE daily_state ADD COLUMN IF NOT EXISTS sleep_hours DOUBLE PRECISION;
ALTER TABLE daily_state ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;
ALTER TABLE daily_state ADD COLUMN IF NOT EXISTS is_failure_day BOOLEAN DEFAULT false;
ALTER TABLE daily_state ADD COLUMN IF NOT EXISTS failure_reasons TEXT;

-- gym_periods: day schedule for flexible planning
ALTER TABLE gym_periods ADD COLUMN IF NOT EXISTS day_schedule TEXT;

-- gym_workouts: v1.2/v1.3 fields
ALTER TABLE gym_workouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned';
ALTER TABLE gym_workouts ADD COLUMN IF NOT EXISTS wellbeing INTEGER;
ALTER TABLE gym_workouts ADD COLUMN IF NOT EXISTS wellbeing_note TEXT;
ALTER TABLE gym_workouts ADD COLUMN IF NOT EXISTS additional_activities TEXT;
ALTER TABLE gym_workouts ADD COLUMN IF NOT EXISTS workout_template_id UUID;
ALTER TABLE gym_workouts ADD COLUMN IF NOT EXISTS cycle_number INTEGER;

-- gym_exercises: v1.2/v1.3/v1.5/v1.7 fields
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS reps_scheme TEXT;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS next_weight DOUBLE PRECISION;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS target_reps INTEGER;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS target_sets INTEGER DEFAULT 4;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS workout_template_exercise_id UUID;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS cycle_note TEXT;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS include_in_future_cycles BOOLEAN DEFAULT true;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS next_target_reps INTEGER;
ALTER TABLE gym_exercises ADD COLUMN IF NOT EXISTS next_target_sets INTEGER;

-- gym_exercise_sets: warmup flag
ALTER TABLE gym_exercise_sets ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN DEFAULT false;

-- challenges: direction link and description
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS direction_id UUID;

-- ============================================
-- STEP 3: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_directions_user_id ON directions(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_traits_user_id ON traits(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_exercise_templates_user_id ON gym_exercise_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_wellbeing_user_date ON daily_wellbeing(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_wellbeing_user_date ON weekly_wellbeing(user_id, week_start_date);

-- ============================================
-- STEP 4: FOREIGN KEYS
-- ============================================

-- Directions -> app_users
ALTER TABLE directions 
ADD CONSTRAINT fk_directions_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- Skills -> app_users
ALTER TABLE skills 
ADD CONSTRAINT fk_skills_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- Skills -> skills (parent)
ALTER TABLE skills 
ADD CONSTRAINT fk_skills_parent 
FOREIGN KEY (parent_id) REFERENCES skills(id) ON DELETE SET NULL;

-- skill_history -> skills
ALTER TABLE skill_history 
ADD CONSTRAINT fk_skill_history_skill 
FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;

-- skill_history -> app_users
ALTER TABLE skill_history 
ADD CONSTRAINT fk_skill_history_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- Traits -> app_users
ALTER TABLE traits 
ADD CONSTRAINT fk_traits_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- trait_history -> traits
ALTER TABLE trait_history 
ADD CONSTRAINT fk_trait_history_trait 
FOREIGN KEY (trait_id) REFERENCES traits(id) ON DELETE CASCADE;

-- trait_history -> app_users
ALTER TABLE trait_history 
ADD CONSTRAINT fk_trait_history_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- gym_exercise_templates -> app_users
ALTER TABLE gym_exercise_templates 
ADD CONSTRAINT fk_gym_exercise_templates_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- gym_workout_templates -> gym_periods
ALTER TABLE gym_workout_templates 
ADD CONSTRAINT fk_gym_workout_templates_period 
FOREIGN KEY (period_id) REFERENCES gym_periods(id) ON DELETE CASCADE;

-- gym_workout_template_exercises -> gym_workout_templates
ALTER TABLE gym_workout_template_exercises 
ADD CONSTRAINT fk_gym_workout_template_exercises_template 
FOREIGN KEY (workout_template_id) REFERENCES gym_workout_templates(id) ON DELETE CASCADE;

-- gym_workout_template_exercises -> gym_exercise_templates
ALTER TABLE gym_workout_template_exercises 
ADD CONSTRAINT fk_gym_workout_template_exercises_exercise_template 
FOREIGN KEY (exercise_template_id) REFERENCES gym_exercise_templates(id) ON DELETE SET NULL;

-- user_wellbeing_settings -> app_users
ALTER TABLE user_wellbeing_settings 
ADD CONSTRAINT fk_user_wellbeing_settings_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- daily_wellbeing -> app_users
ALTER TABLE daily_wellbeing 
ADD CONSTRAINT fk_daily_wellbeing_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- weekly_wellbeing -> app_users
ALTER TABLE weekly_wellbeing 
ADD CONSTRAINT fk_weekly_wellbeing_user 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- gym_workouts -> gym_workout_templates
ALTER TABLE gym_workouts 
ADD CONSTRAINT fk_gym_workouts_template 
FOREIGN KEY (workout_template_id) REFERENCES gym_workout_templates(id) ON DELETE SET NULL;

-- gym_exercises -> gym_exercise_templates
ALTER TABLE gym_exercises 
ADD CONSTRAINT fk_gym_exercises_template 
FOREIGN KEY (template_id) REFERENCES gym_exercise_templates(id) ON DELETE SET NULL;

-- gym_exercises -> gym_workout_template_exercises
ALTER TABLE gym_exercises 
ADD CONSTRAINT fk_gym_exercises_workout_template_exercise 
FOREIGN KEY (workout_template_exercise_id) REFERENCES gym_workout_template_exercises(id) ON DELETE SET NULL;

-- challenges -> directions
ALTER TABLE challenges 
ADD CONSTRAINT fk_challenges_direction 
FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE SET NULL;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
