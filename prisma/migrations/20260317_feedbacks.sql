-- Migration: feedbacks table
-- Таблица для хранения обратной связи пользователей

CREATE TABLE IF NOT EXISTS feedbacks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('bug', 'idea', 'question', 'review')),
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status  ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);
