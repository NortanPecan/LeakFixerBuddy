# Branch Strategy

## Overview

LeakFixer Buddy uses a **two-branch strategy** to separate development and production environments.

## Branches

### `master` — Sandbox (Development)

**Purpose**: Local development, UI/UX iteration, feature testing

**Configuration**:
- Database: SQLite (local file)
- Telegram: Mocked/demo mode
- External services: Optional or mocked

**Setup**:
```bash
git checkout master
bun install
echo 'DATABASE_URL="file:./db/custom.db"' > .env
echo 'DEMO_MODE="true"' >> .env
bun run db:push
bun run dev
```

**Workflow**:
1. All new features start in `master`
2. Test locally with SQLite
3. UI/UX changes without network dependencies
4. Merge to `main` when ready for production

---

### `main` — Production

**Purpose**: Live Telegram Mini App

**Configuration**:
- Database: Supabase PostgreSQL
- Telegram: Real Mini App auth
- Deployment: Vercel

**Setup**:
```bash
git checkout main
bun install
# Configure .env with Supabase URLs
bunx prisma migrate deploy
bun run dev
```

**Deployment**:
1. Push to `main` → auto-deploys to Vercel
2. Environment variables configured in Vercel Dashboard
3. Telegram Mini App URL: `https://your-app.vercel.app`

---

## Database Schema Management

### SQLite Schema (`prisma/schema.prisma`)
- Used for `master` branch
- Provider: `sqlite`
- Features: All current models

### PostgreSQL Schema (`prisma/schema.supabase.prisma`)
- Used for `main` branch
- Provider: `postgresql`
- Compatible with Supabase
- Uses `@db.Uuid`, `@db.Timestamptz`, etc.

### Switching Schemas

When deploying to production:

```bash
# On main branch
cd prisma
mv schema.prisma schema.sqlite.prisma
mv schema.supabase.prisma schema.prisma
cd ..
git add . && git commit -m "chore: switch to PostgreSQL schema"
git push
```

---

## Environment Variables

### Master (.env for sandbox)
```env
DATABASE_URL="file:./db/custom.db"
DEMO_MODE="true"
```

### Main (.env for production)
```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://...supabase.co:5432/postgres"
TELEGRAM_BOT_TOKEN="your-bot-token"
```

---

## Migration Strategy

### Development (master)
```bash
bun run db:push  # Push schema changes directly to SQLite
```

### Production (main)
```bash
bunx prisma migrate dev --name description  # Create migration
bunx prisma migrate deploy  # Apply to production
```

---

## CI/CD Flow

```
master (local dev)
    ↓
  [testing]
    ↓
  PR to main
    ↓
  [review]
    ↓
  merge to main
    ↓
  Vercel auto-deploy
    ↓
  Production (leakfixer-miniapp.vercel.app)
```

---

## Future Auth Integration

The schema supports future authentication methods:

1. **Current**: Telegram Mini App only
2. **Phase 2**: Add phone verification (Supabase Auth)
3. **Phase 3**: Add email verification (Supabase Auth)

Fields already in schema:
- `email`, `phone` (unique, nullable)
- `emailVerified`, `phoneVerified` (timestamps)
- `authProvider` (telegram | email | phone)
