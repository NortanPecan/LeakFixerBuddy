const { execSync } = require('node:child_process')

const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
const schema = process.env.PRISMA_SCHEMA || (isProd ? 'prisma/schema.supabase.prisma' : 'prisma/schema.prisma')

console.log(`[prisma] generate using schema: ${schema}`)
execSync(`prisma generate --schema ${schema}`, { stdio: 'inherit' })
