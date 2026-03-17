-- Migration: UserAiPattern table
-- Применить вручную в Supabase SQL Editor
-- Создан: 2026-03-17

CREATE TABLE IF NOT EXISTS user_ai_patterns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  leak_type        TEXT NOT NULL,
  last_analysis    JSONB,
  tried_solutions  JSONB NOT NULL DEFAULT '[]',
  what_worked      JSONB NOT NULL DEFAULT '[]',
  analysis_count   INTEGER NOT NULL DEFAULT 1,
  last_provider    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_ai_patterns_user_leak_unique UNIQUE (user_id, leak_type)
);

CREATE INDEX IF NOT EXISTS user_ai_patterns_user_id_idx ON user_ai_patterns (user_id);

-- Trigger: обновление updated_at
CREATE OR REPLACE FUNCTION update_user_ai_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_ai_patterns_updated_at_trigger ON user_ai_patterns;
CREATE TRIGGER user_ai_patterns_updated_at_trigger
  BEFORE UPDATE ON user_ai_patterns
  FOR EACH ROW EXECUTE FUNCTION update_user_ai_patterns_updated_at();

COMMENT ON TABLE user_ai_patterns IS 'Персонализированные AI-паттерны пользователя для контекста анализа ликов';
COMMENT ON COLUMN user_ai_patterns.leak_type IS 'Тип лика: gym_dropout, low_energy, ritual_erosion, ...';
COMMENT ON COLUMN user_ai_patterns.last_analysis IS 'Последний LeakAnalysis JSON от AI (cause, solutions, personalizedInsight, urgency)';
COMMENT ON COLUMN user_ai_patterns.tried_solutions IS 'Массив [{text, triedAt, worked}] — история попыток';
COMMENT ON COLUMN user_ai_patterns.what_worked IS 'Массив строк — что реально помогло';
COMMENT ON COLUMN user_ai_patterns.last_provider IS 'Провайдер последнего анализа: groq | gemini';
