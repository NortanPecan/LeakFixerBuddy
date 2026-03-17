-- Migration: AiLog table
-- Применить вручную в Supabase SQL Editor
-- Создан: 2026-03-17

CREATE TABLE IF NOT EXISTS ai_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES app_users(id) ON DELETE SET NULL,
  call_type      TEXT NOT NULL,
  leak_type      TEXT,
  provider       TEXT NOT NULL,
  model          TEXT NOT NULL,
  system_prompt  TEXT NOT NULL,
  user_message   TEXT NOT NULL,
  response       TEXT NOT NULL,
  success        BOOLEAN NOT NULL DEFAULT TRUE,
  error_msg      TEXT,
  latency_ms     INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_logs_user_created_idx  ON ai_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_logs_type_created_idx  ON ai_logs (call_type, created_at DESC);

COMMENT ON TABLE ai_logs IS 'Аудит всех AI-запросов — промпт, ответ, провайдер, модель, латентность';
COMMENT ON COLUMN ai_logs.call_type   IS 'Тип вызова: analyze-leak, telegram-leak';
COMMENT ON COLUMN ai_logs.provider    IS 'Провайдер: groq | gemini';
COMMENT ON COLUMN ai_logs.latency_ms  IS 'Время ответа в миллисекундах';
COMMENT ON COLUMN ai_logs.success     IS 'false если AI вернул ошибку';
