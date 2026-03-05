import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transactions?userId=xxx&accountId=xxx&categoryId=xxx&from=xxx&to=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const accountId = searchParams.get('accountId')
    const categoryId = searchParams.get('categoryId')
    const zone = searchParams.get('zone')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { userId }

    if (accountId) where.accountId = accountId
    if (categoryId) where.categoryId = categoryId
    if (zone) where.zone = zone
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        account: { select: { id: true, name: true, icon: true } },
        category: { select: { id: true, name: true, icon: true, zone: true } }
      }
    })

    return NextResponse.json({ success: true, transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST /api/transactions - Create transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, accountId, categoryId, date, amount, description, zone } = body

    if (!userId || !accountId || amount === undefined) {
      return NextResponse.json({ error: 'userId, accountId, and amount are required' }, { status: 400 })
    }

    // Get zone from category if not provided
    let transactionZone = zone
    if (!transactionZone && categoryId) {
      const category = await db.category.findUnique({
        where: { id: categoryId },
        select: { zone: true }
      })
      transactionZone = category?.zone
    }

    const transaction = await db.transaction.create({
      data: {
        userId,
        accountId,
        categoryId: categoryId || null,
        date: date ? new Date(date) : new Date(),
        amount: parseFloat(amount),
        description,
        zone: transactionZone
      },
      include: {
        account: { select: { id: true, name: true, icon: true } },
        category: { select: { id: true, name: true, icon: true, zone: true } }
      }
    })

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

// PATCH /api/transactions - Update transaction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Update zone if categoryId changed
    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const category = await db.category.findUnique({
          where: { id: data.categoryId },
          select: { zone: true }
        })
        data.zone = category?.zone
      }
    }

    if (data.amount !== undefined) {
      data.amount = parseFloat(data.amount)
    }
    if (data.date) {
      data.date = new Date(data.date)
    }

    const transaction = await db.transaction.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, name: true, icon: true } },
        category: { select: { id: true, name: true, icon: true, zone: true } }
      }
    })

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

// DELETE /api/transactions?id=xxx - Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await db.transaction.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
