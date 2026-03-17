-- Add stretching_done field to gym_workouts (5.22)
ALTER TABLE gym_workouts
  ADD COLUMN IF NOT EXISTS "stretching_done" boolean NOT NULL DEFAULT false;
