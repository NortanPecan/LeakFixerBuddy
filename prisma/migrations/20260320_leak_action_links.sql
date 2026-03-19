CREATE TABLE IF NOT EXISTS "leak_action_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "leak_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "leak_action_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leak_action_links_leak_id_fkey"
    FOREIGN KEY ("leak_id")
    REFERENCES "leaks"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "leak_action_links_leak_id_entity_type_entity_id_key"
  ON "leak_action_links"("leak_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "leak_action_links_leak_id_created_at_idx"
  ON "leak_action_links"("leak_id", "created_at");
