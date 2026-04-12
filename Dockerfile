# ──────────────────────────────────────────────────────────────────────────────
# LeakFixer Buddy — Production Dockerfile
# Multi-stage build using Bun + Next.js standalone output
# ──────────────────────────────────────────────────────────────────────────────

ARG BUN_VERSION=1.3.10
ARG NODE_VERSION=22-alpine

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-alpine AS deps

WORKDIR /app

# Install system deps needed for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat

# Copy lockfile and manifests first for layer caching
COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Install all deps (including devDeps — needed for build)
RUN bun install --frozen-lockfile

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before build
RUN bun run db:generate

# Build environment — inject build-time public vars here if needed
# (secrets like DATABASE_URL are injected at runtime, not bake-time)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Runs the server on port 3000 by default
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (minimal Node.js server, no full node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Own the app files as the non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# Healthcheck — uses /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
