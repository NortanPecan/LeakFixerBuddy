const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// Always use the main schema - it's already configured for PostgreSQL/Supabase
const schema = 'prisma/schema.prisma'

console.log(`[prisma] generate using schema: ${schema}`)
execSync(`prisma generate --schema ${schema}`, { stdio: 'inherit' })
