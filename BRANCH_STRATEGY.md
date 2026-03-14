# Branch Strategy

## Overview

LeakFixer uses the **main** branch for production deployment with Supabase PostgreSQL.

**Note:** The `master` branch is historical and not used. All development happens in `main`.

## Database

- **Provider:** Supabase PostgreSQL
- **Schema:** `prisma/schema.prisma` (PostgreSQL only)
- **Connection:** `DATABASE_URL` (pooling) + `DIRECT_DATABASE_URL` (migrations)

## Production (`main`)

- DB: Supabase PostgreSQL
- Real Telegram Mini App auth
- Deploy target: Vercel

Commands:

```bash
bun run db:generate    # Generate Prisma client
bun run db:push        # Push schema changes
bun run db:migrate     # Create and apply migrations
bun run db:studio      # Open Prisma Studio
bun run db:validate    # Validate schema
```

## Important rule for this project

Codex/agent does not apply SQL directly to production Supabase.

Production synchronization flow is manual:

1. Update `prisma/schema.prisma`.
2. Update `SUPABASE_CHECKLIST.md`.
3. Project owner applies SQL manually in Supabase SQL Editor.
4. Re-run `bun run db:validate` and compare against checklist.

## Demo Auth

Endpoint: `GET /api/auth?demo=true`

Purpose:

- Fallback login path when Telegram `initData` is unavailable.
- Works with Supabase, independent from Telegram signature validation.

Environment expectations:

- Required: `DATABASE_URL`
- Recommended for Supabase: `DIRECT_DATABASE_URL`
- Optional: `DEMO_MODE`
- Not required for demo GET: `TELEGRAM_BOT_TOKEN` (required only for Telegram POST login)

Failure policy:

- Missing DB env -> clear HTTP 500 config error.
- DB connection issue -> clear HTTP 503 error.
- Schema mismatch -> clear HTTP 500 error with regeneration/sync hint.
