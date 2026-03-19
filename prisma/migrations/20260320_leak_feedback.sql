CREATE TABLE IF NOT EXISTS "leak_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "leak_id" UUID NOT NULL,
  "solution_action_id" UUID NOT NULL,
  "result" TEXT NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "leak_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leak_feedback_leak_id_fkey"
    FOREIGN KEY ("leak_id")
    REFERENCES "leaks"("id")
    ON DELETE CASCADE,
  CONSTRAINT "leak_feedback_solution_action_id_fkey"
    FOREIGN KEY ("solution_action_id")
    REFERENCES "leak_solution_actions"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "leak_feedback_leak_id_solution_action_id_key"
  ON "leak_feedback"("leak_id", "solution_action_id");

CREATE INDEX IF NOT EXISTS "leak_feedback_leak_id_created_at_idx"
  ON "leak_feedback"("leak_id", "created_at");
