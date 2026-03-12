# Branch Strategy

## Overview

LeakFixer uses two branches with different database providers:

- `master`: sandbox/local development, SQLite
- `main`: production deployment, Supabase PostgreSQL

## Schema files

- `prisma/schema.prisma`: sandbox schema (SQLite)
- `prisma/schema.supabase.prisma`: production schema (Supabase/PostgreSQL)

Both schemas must describe the same domain models. Differences are only DB-specific types/constraints.

## Sandbox (`master`)

- DB: SQLite (`DATABASE_URL="file:./db/custom.db"`)
- No required network access
- Telegram can run in demo/mock mode for local development

Commands:

```bash
bun run db:generate:sandbox
bun run db:push:sandbox
bun run db:migrate:sandbox
bun run db:studio:sandbox
bun run db:validate:sandbox
```

## Production (`main`)

- DB: Supabase PostgreSQL
- Real Telegram Mini App auth
- Deploy target: Vercel

Commands:

```bash
bun run db:generate:prod
bun run db:push:prod
bun run db:migrate:prod
bun run db:studio:prod
bun run db:validate:prod
```

## Important rule for this project

Codex/agent does not apply SQL directly to production Supabase.

Production synchronization flow is manual:

1. Update `prisma/schema.supabase.prisma`.
2. Update `SUPABASE_CHECKLIST.md`.
3. Project owner applies SQL manually in Supabase SQL Editor.
4. Re-run `bun run db:validate:prod` and compare against checklist.

## Demo Auth (Production)

Endpoint: `GET /api/auth?demo=true`

Purpose:

- Fallback login path when Telegram `initData` is unavailable.
- Works in production with Supabase, independent from Telegram signature validation.

Environment expectations:

- Required: `DATABASE_URL`
- Recommended for Supabase: `DIRECT_DATABASE_URL`
- Optional: `DEMO_MODE`
- Not required for demo GET: `TELEGRAM_BOT_TOKEN` (required only for Telegram POST login)

Failure policy:

- Missing DB env -> clear HTTP 500 config error.
- DB connection issue -> clear HTTP 503 error.
- Schema mismatch -> clear HTTP 500 error with regeneration/sync hint.
