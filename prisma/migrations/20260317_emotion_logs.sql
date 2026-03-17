-- Emotion Tracker (5.30): быстрые отметки эмоции в течение дня
CREATE TABLE IF NOT EXISTS emotion_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  emotion     text NOT NULL,       -- "joy", "anxiety", "anger", "calm", "sad", "excited"
  intensity   int  NOT NULL DEFAULT 3,  -- 1-5
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emotion_logs_user_created ON emotion_logs(user_id, created_at DESC);
