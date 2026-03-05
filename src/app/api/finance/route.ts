import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/summary?userId=xxx - Get finance summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get all accounts with their transactions
    const accounts = await db.account.findMany({
      where: { userId, isActive: true },
      include: {
        transactions: true
      }
    })

    // Calculate balance for each account
    const accountsWithBalance = accounts.map(account => {
      const transactionSum = account.transactions.reduce((sum, t) => sum + t.amount, 0)
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        icon: account.icon,
        color: account.color,
        initialBalance: account.initialBalance,
        currentBalance: account.initialBalance + transactionSum
      }
    })

    // Total balance across all accounts
    const totalBalance = accountsWithBalance.reduce((sum, a) => sum + a.currentBalance, 0)

    // Get all categories with their transactions
    const categories = await db.category.findMany({
      where: { userId },
      include: {
        transactions: true
      }
    })

    // Calculate spent for each category
    const categoriesWithSpent = categories.map(category => {
      const spent = category.transactions.reduce((sum, t) => sum + t.amount, 0)
      return {
        id: category.id,
        name: category.name,
        zone: category.zone,
        icon: category.icon,
        color: category.color,
        monthlyTarget: category.monthlyTarget,
        spent
      }
    })

    // Get recent transactions (last 10)
    const recentTransactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        account: { select: { id: true, name: true, icon: true } },
        category: { select: { id: true, name: true, icon: true, zone: true } }
      }
    })

    // Calculate totals by zone
    const transactions = await db.transaction.findMany({
      where: { userId },
      include: { category: true }
    })

    const byZone: Record<string, number> = {}
    transactions.forEach(t => {
      const zone = t.zone || t.category?.zone || 'general'
      byZone[zone] = (byZone[zone] || 0) + t.amount
    })

    // Calculate income vs expenses
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const expenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))

    // This month stats
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const thisMonthTransactions = await db.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth }
      }
    })

    const thisMonthIncome = thisMonthTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const thisMonthExpenses = Math.abs(thisMonthTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))

    return NextResponse.json({
      success: true,
      summary: {
        totalBalance,
        accounts: accountsWithBalance,
        categories: categoriesWithSpent,
        recentTransactions,
        byZone,
        income,
        expenses,
        thisMonthIncome,
        thisMonthExpenses
      }
    })
  } catch (error) {
    console.error('Error fetching finance summary:', error)
    return NextResponse.json({ error: 'Failed to fetch finance summary' }, { status: 500 })
  }
}
