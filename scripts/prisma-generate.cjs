const { execSync } = require('node:child_process')

const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
const dbUrl = process.env.DATABASE_URL || ''
const isPostgresUrl = /^postgres(ql)?:\/\//i.test(dbUrl)
const defaultSchema = isProd || isPostgresUrl ? 'prisma/schema.supabase.prisma' : 'prisma/schema.prisma'
const schema = process.env.PRISMA_SCHEMA || defaultSchema

console.log(`[prisma] generate using schema: ${schema}`)
execSync(`prisma generate --schema ${schema}`, { stdio: 'inherit' })
