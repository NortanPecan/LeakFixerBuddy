import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch user attributes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Ensure all attributes exist
    const attrKeys = ['health', 'mind', 'will']
    for (const key of attrKeys) {
      await db.userAttribute.upsert({
        where: { userId_key: { userId, key } },
        update: {},
        create: { userId, key, points: 0, level: 1 }
      })
    }

    const attributes = await db.userAttribute.findMany({
      where: { userId }
    })

    return NextResponse.json({ attributes })
  } catch (error) {
    console.error('Fetch attributes error:', error)
    return NextResponse.json({ error: 'Failed to fetch attributes' }, { status: 500 })
  }
}
