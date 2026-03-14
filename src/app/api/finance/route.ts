import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default categories for new users
const DEFAULT_CATEGORIES = [
  { name: 'LeakFixer / разработка', zone: 'leakfixer', icon: '🔧', color: '#4a5568' },
  { name: 'ИИ / подписки', zone: 'ai', icon: '🤖', color: '#6366f1' },
  { name: 'Покер / банкролл', zone: 'poker', icon: '♠️', color: '#059669' },
  { name: 'Здоровье / зал', zone: 'health', icon: '💪', color: '#dc2626' },
  { name: 'Быт / жизнь', zone: 'life', icon: '🏠', color: '#f59e0b' },
  { name: 'Подушка / резерв', zone: 'savings', icon: '💰', color: '#10b981' },
  { name: 'Общее', zone: 'general', icon: '📦', color: '#6b7280' },
]

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
        currency: account.currency || 'RUB',
        icon: account.icon,
        color: account.color,
        initialBalance: account.initialBalance,
        currentBalance: account.initialBalance + transactionSum
      }
    })

    // Total balance across all accounts
    const totalBalance = accountsWithBalance.reduce((sum, a) => sum + a.currentBalance, 0)

    // Get or create categories
    let categories = await db.category.findMany({
      where: { userId }
    })

    // Create default categories if none exist
    if (categories.length === 0) {
      categories = await Promise.all(
        DEFAULT_CATEGORIES.map((cat, index) =>
          db.category.create({
            data: {
              userId,
              name: cat.name,
              zone: cat.zone,
              icon: cat.icon,
              color: cat.color,
              sortOrder: index
            }
          })
        )
      )
    }

    // Get transactions for each category
    const categoriesWithTransactions = await Promise.all(
      categories.map(async (category) => {
        const transactions = await db.transaction.findMany({
          where: { categoryId: category.id }
        })
        const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
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
    )

    // Get recent transactions (last 10)
    const recentTransactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        account: { select: { id: true, name: true, icon: true, currency: true } },
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
        categories: categoriesWithTransactions,
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
