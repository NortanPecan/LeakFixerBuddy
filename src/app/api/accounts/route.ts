import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/accounts?userId=xxx - Get user accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const accounts = await db.account.findMany({
      where: { userId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { transactions: true } }
      }
    })

    // Calculate current balance for each account
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await db.transaction.findMany({
          where: { accountId: account.id }
        })
        const transactionSum = transactions.reduce((sum, t) => sum + t.amount, 0)
        return {
          ...account,
          currentBalance: account.initialBalance + transactionSum
        }
      })
    )

    return NextResponse.json({ success: true, accounts: accountsWithBalance })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST /api/accounts - Create account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, type, initialBalance, icon, color, sortOrder } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    const account = await db.account.create({
      data: {
        userId,
        name,
        type: type || 'cash',
        initialBalance: initialBalance || 0,
        icon,
        color,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

// PATCH /api/accounts - Update account
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const account = await db.account.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

// DELETE /api/accounts?id=xxx - Delete account (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    const account = await db.account.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
