import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Health check endpoint
 * GET /api/health - Check database connection and app status
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`
    
    // Get database stats
    const userCount = await db.appUser.count()
    const profileCount = await db.userProfile.count()
    
    const responseTime = Date.now() - startTime
    
    // Determine database type from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || ''
    const dbType = dbUrl.includes('supabase') || dbUrl.includes('postgresql') 
      ? 'PostgreSQL (Supabase)' 
      : dbUrl.includes('file:') 
        ? 'SQLite (Local)' 
        : 'Unknown'
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        type: dbType,
        connected: true,
        stats: {
          users: userCount,
          profiles: profileCount,
        }
      },
      auth: {
        telegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
        signatureValidation: !!process.env.TELEGRAM_BOT_TOKEN,
      },
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    console.error('[Health Check] Database error:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      auth: {
        telegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
      },
      environment: process.env.NODE_ENV
    }, { status: 503 })
  }
}
