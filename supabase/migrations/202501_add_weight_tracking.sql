-- Migration: Add weight tracking fields to user_profiles
-- Date: 2025-01-XX
-- Description: Add fields for weight goal tracking

-- Add weight tracking columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS weight_start FLOAT,
ADD COLUMN IF NOT EXISTS weight_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS weight_deadline TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.weight_start IS 'Start weight for progress tracking';
COMMENT ON COLUMN user_profiles.weight_start_at IS 'Date when weight tracking started';
COMMENT ON COLUMN user_profiles.weight_deadline IS 'Target deadline for reaching goal weight';
