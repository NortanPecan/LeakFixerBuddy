import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get weight history with aggregation and forecast
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || '30' // days

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get all weight measurements in period
    const measurements = await db.measurement.findMany({
      where: {
        userId,
        type: 'weight',
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    })

    // Group by date and calculate daily averages
    const dailyData: Record<string, { date: string; values: number[]; avg: number }> = {}
    
    measurements.forEach(m => {
      const dateKey = m.date.toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, values: [], avg: 0 }
      }
      dailyData[dateKey].values.push(m.value)
    })

    // Calculate averages
    const history = Object.values(dailyData).map(day => ({
      date: day.date,
      avg: day.values.reduce((a, b) => a + b, 0) / day.values.length,
      count: day.values.length,
      min: Math.min(...day.values),
      max: Math.max(...day.values)
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Get user profile for goal
    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        weight: true,
        targetWeight: true,
        weightStart: true,
        weightStartAt: true,
        weightDeadline: true
      }
    })

    const currentWeight = history.length > 0 ? history[history.length - 1].avg : profile?.weight
    const targetWeight = profile?.targetWeight
    const weightStart = profile?.weightStart
    const weightStartAt = profile?.weightStartAt
    const weightDeadline = profile?.weightDeadline

    // Calculate statistics
    const allValues = history.map(h => h.avg)
    const stats = {
      min: allValues.length > 0 ? Math.min(...allValues) : null,
      max: allValues.length > 0 ? Math.max(...allValues) : null,
      avg: allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : null,
      count: measurements.length,
      daysTracked: history.length
    }

    // Calculate progress
    let progress = null
    let progressPercent = null
    if (weightStart && targetWeight && currentWeight) {
      progress = {
        startWeight: weightStart,
        currentWeight,
        targetWeight,
        lost: weightStart - currentWeight,
        toLose: currentWeight - targetWeight,
        totalToLose: weightStart - targetWeight
      }
      const totalToLose = weightStart - targetWeight
      const lost = weightStart - currentWeight
      progressPercent = totalToLose !== 0 ? Math.min(100, Math.max(0, (lost / totalToLose) * 100)) : 0
    }

    // Calculate rate and forecast
    let forecast = null
    if (history.length >= 2 && weightStartAt) {
      const firstDate = new Date(history[0].date)
      const lastDate = new Date(history[history.length - 1].date)
      const weeksPassed = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      
      if (weeksPassed > 0) {
        const weightLost = history[0].avg - history[history.length - 1].avg
        const ratePerWeek = weightLost / weeksPassed // positive = losing weight

        // Predicted date to reach goal
        let predictedDate = null
        let daysToGoal = null
        if (targetWeight && currentWeight && ratePerWeek !== 0) {
          const weightToLose = currentWeight - targetWeight
          const weeksToGoal = weightToLose / ratePerWeek
          daysToGoal = Math.round(weeksToGoal * 7)
          
          if (weeksToGoal > 0) {
            predictedDate = new Date()
            predictedDate.setDate(predictedDate.getDate() + daysToGoal)
          }
        }

        // Compare with deadline
        let deadlineStatus = null
        if (weightDeadline && predictedDate) {
          const deadlineDate = new Date(weightDeadline)
          const daysDiff = Math.round((deadlineDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24))
          deadlineStatus = {
            willMakeIt: predictedDate <= deadlineDate,
            daysDifference: daysDiff,
            message: predictedDate <= deadlineDate 
              ? `Цель будет достигнута на ${Math.abs(daysDiff)} дней раньше дедлайна`
              : `Цель будет достигнута на ${Math.abs(daysDiff)} дней позже дедлайна`
          }
        }

        forecast = {
          ratePerWeek: Math.round(ratePerWeek * 100) / 100,
          direction: ratePerWeek > 0 ? 'losing' : ratePerWeek < 0 ? 'gaining' : 'stable',
          predictedDate,
          daysToGoal,
          deadlineStatus
        }
      }
    }

    return NextResponse.json({
      history,
      stats,
      currentWeight,
      targetWeight,
      weightStart,
      weightStartAt,
      weightDeadline,
      progress: progress ? { ...progress, percent: progressPercent } : null,
      forecast
    })
  } catch (error) {
    console.error('Get weight history error:', error)
    return NextResponse.json({ error: 'Failed to get weight history' }, { status: 500 })
  }
}
