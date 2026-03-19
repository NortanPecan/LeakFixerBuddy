CREATE TABLE IF NOT EXISTS "leak_solution_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "leak_id" UUID NOT NULL,
  "mode" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "confidence_label" TEXT NOT NULL DEFAULT 'medium',
  "confidence_reason" TEXT,
  "is_selected" BOOLEAN NOT NULL DEFAULT FALSE,
  "source" TEXT NOT NULL DEFAULT 'ai',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "leak_solution_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leak_solution_plans_leak_id_fkey"
    FOREIGN KEY ("leak_id")
    REFERENCES "leaks"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "leak_solution_plans_leak_id_mode_key"
  ON "leak_solution_plans"("leak_id", "mode");

CREATE INDEX IF NOT EXISTS "leak_solution_plans_leak_id_is_selected_idx"
  ON "leak_solution_plans"("leak_id", "is_selected");

CREATE TABLE IF NOT EXISTS "leak_solution_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "payload" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "leak_solution_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leak_solution_actions_plan_id_fkey"
    FOREIGN KEY ("plan_id")
    REFERENCES "leak_solution_plans"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "leak_solution_actions_plan_id_sort_order_idx"
  ON "leak_solution_actions"("plan_id", "sort_order");
