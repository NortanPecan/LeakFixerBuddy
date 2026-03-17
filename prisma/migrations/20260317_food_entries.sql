-- Food entries (meal tracking)
CREATE TABLE IF NOT EXISTS food_entries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  date       timestamptz NOT NULL DEFAULT now(),
  meal_type  text        NOT NULL DEFAULT 'snack', -- breakfast, lunch, dinner, snack, custom:*
  name       text        NOT NULL,
  time       text,       -- "08:30", "12:00" (optional)
  calories   int,
  protein    float8,
  fat        float8,
  carbs      float8,
  amount     text,        -- "200г", "1 порция"
  quality    text,        -- good, neutral, bad
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_entries_user_date ON food_entries(user_id, date DESC);
