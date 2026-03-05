import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats?userId=xxx - Get user statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get current date and date 7 days ago
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel for efficiency
    const [
      activeRituals,
      completedTasks7Days,
      activeChains,
      completedChains,
      inProgressContent,
      userAttributes
    ] = await Promise.all([
      // Active rituals count
      db.ritual.count({
        where: { userId, status: 'active' }
      }),
      
      // Tasks completed in last 7 days
      db.task.count({
        where: { 
          userId, 
          status: 'done',
          updatedAt: { gte: sevenDaysAgo }
        }
      }),
      
      // Active chains count
      db.chain.count({
        where: { userId, status: 'active' }
      }),
      
      // Completed chains count
      db.chain.count({
        where: { userId, status: 'completed' }
      }),
      
      // Content in progress
      db.contentItem.count({
        where: { userId, status: 'in_progress' }
      }),
      
      // User attributes
      db.userAttribute.findMany({
        where: { userId }
      })
    ])

    // Calculate progress for each attribute (points to next level)
    const attributes = userAttributes.map(attr => {
      const pointsPerLevel = 100
      const currentLevelPoints = attr.points % pointsPerLevel
      const progress = (currentLevelPoints / pointsPerLevel) * 100
      return {
        key: attr.key,
        level: attr.level,
        points: attr.points,
        progress: Math.round(progress)
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        activeRituals,
        completedTasks7Days,
        activeChains,
        completedChains,
        inProgressContent,
        attributes
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
