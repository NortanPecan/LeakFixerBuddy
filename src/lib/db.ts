// Import directly from generated client to bypass cache issues
import { PrismaClient } from '../../node_modules/.prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always create new client in development to pick up schema changes
// In production, use cached client
const shouldUseCache = process.env.NODE_ENV === 'production'

export const db =
  shouldUseCache && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
