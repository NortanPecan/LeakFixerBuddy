-- Fleeting Thoughts (5.31): мысли которые исчезают через 48 часов
CREATE TABLE IF NOT EXISTS fleeting_thoughts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  text        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fleeting_thoughts_user_expires ON fleeting_thoughts(user_id, expires_at);
