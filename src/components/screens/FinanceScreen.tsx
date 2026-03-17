'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  Banknote,
  Sparkles,
  Filter,
  Calendar,
  PiggyBank,
  RefreshCw,
  Trash2,
  Edit2
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast, isOnline, getOfflineMessage } from '@/lib/network-utils'
import { getTodayKey } from '@/lib/date-utils'

// Account types
const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Наличные', icon: Banknote },
  { value: 'card', label: 'Карта', icon: CreditCard },
  { value: 'poker', label: 'Банкролл', icon: Sparkles },
  { value: 'savings', label: 'Накопления', icon: PiggyBank },
  { value: 'custom', label: 'Другое...', icon: Wallet },
]

// Currencies
const CURRENCIES = [
  { value: 'RUB', label: 'Рубль (₽)', symbol: '₽' },
  { value: 'USD', label: 'Доллар ($)', symbol: '$' },
  { value: 'EUR', label: 'Евро (€)', symbol: '€' },
  { value: 'KZT', label: 'Тенге (₸)', symbol: '₸' },
  { value: 'UZS', label: 'Сум (сўм)', symbol: 'сўм' },
  { value: 'custom', label: 'Другая валюта', symbol: '' },
]

// Currency formatters cache
const currencyFormatters: Record<string, Intl.NumberFormat> = {}

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  if (!currencyFormatters[currency]) {
    try {
      currencyFormatters[currency] = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    } catch {
      // Fallback for unknown currencies
      currencyFormatters[currency] = new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    }
  }
  return currencyFormatters[currency]
}

// Zone config
const ZONE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  leakfixer: { label: 'LeakFixer', emoji: '🔧', color: '#4a5568' },
  ai: { label: 'ИИ', emoji: '🤖', color: '#6366f1' },
  poker: { label: 'Покер', emoji: '♠️', color: '#059669' },
  health: { label: 'Здоровье', emoji: '💪', color: '#dc2626' },
  life: { label: 'Жизнь', emoji: '🏠', color: '#f59e0b' },
  savings: { label: 'Резерв', emoji: '💰', color: '#10b981' },
  general: { label: 'Общее', emoji: '📦', color: '#6b7280' },
}

interface Account {
  id: string
  name: string
  type: string
  currency: string
  icon: string | null
  color: string | null
  initialBalance: number
  currentBalance: number
}

interface Category {
  id: string
  name: string
  zone: string
  icon: string | null
  color: string | null
  monthlyTarget: number | null
  spent: number
}

interface Transaction {
  id: string
  date: string
  amount: number
  description: string | null
  zone: string | null
  account: { id: string; name: string; icon: string | null; currency?: string }
  category: { id: string; name: string; icon: string | null; zone: string } | null
}

interface FinanceSummary {
  totalBalance: number
  accounts: Account[]
  categories: Category[]
  recentTransactions: Transaction[]
  byZone: Record<string, number>
  income: number
  expenses: number
  thisMonthIncome: number
  thisMonthExpenses: number
  dailyAvgExpenses: number
  projectedMonthExpenses: number
  daysElapsed: number
  daysRemaining: number
}

export function FinanceScreen() {
  const { user } = useAppStore()
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialogs
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  
  // Loading states
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  
  // Edit states
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false)
  const [isUpdatingTransaction, setIsUpdatingTransaction] = useState(false)
  
  // Account history states
  const [viewingAccountHistory, setViewingAccountHistory] = useState<Account | null>(null)
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([])
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [loadingAccountHistory, setLoadingAccountHistory] = useState(false)
  
  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: getTodayKey()
  })

  // Budget goals
  const [editingBudget, setEditingBudget] = useState<Category | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [isSavingBudget, setIsSavingBudget] = useState(false)

  // Transfer form
  const [showTransfer, setShowTransfer] = useState(false)
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false)
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    fromAmount: '',
    toAmount: '', // only for currency exchange
    isCurrencyExchange: false,
    date: getTodayKey(),
    description: ''
  })
  
  // New account form
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'cash',
    customType: '',
    currency: 'RUB',
    initialBalance: '',
    icon: '💳'
  })

  // Load finance data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      // Check online status
      if (!isOnline()) {
        setError(getOfflineMessage())
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/finance?userId=${user.id}`)
        if (!res.ok) throw new Error('Failed to load data')
        const data = await res.json()
        if (data.success) {
          setSummary(data.summary)
        }
      } catch (err) {
        showErrorToast(err, 'загрузка финансов')
        setError('Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user?.id])

  // Create account
  const handleCreateAccount = async () => {
    if (!user?.id || !newAccount.name || isCreatingAccount) return
    
    if (!isOnline()) {
      showErrorToast(new Error('Network error'), 'создание счёта')
      return
    }
    
    setIsCreatingAccount(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newAccount.name,
          type: newAccount.type === 'custom' ? `custom:${newAccount.customType || 'Другое'}` : newAccount.type,
          currency: newAccount.currency,
          initialBalance: parseFloat(newAccount.initialBalance) || 0,
          icon: newAccount.icon
        })
      })
      
      const responseData = await res.json()
      
      if (!res.ok) {
        // Check for duplicate error
        if (responseData.error?.includes('уже существует')) {
          showErrorToast(new Error(responseData.error), 'создание счёта')
          return
        }
        throw new Error(responseData.error || 'Failed to create account')
      }
      
      // Reload data
      const financeRes = await fetch(`/api/finance?userId=${user.id}`)
      const data = await financeRes.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      setShowAddAccount(false)
      setNewAccount({ name: '', type: 'cash', customType: '', currency: 'RUB', initialBalance: '', icon: '💳' })
      showSuccessToast('Счёт создан')
    } catch (err) {
      showErrorToast(err, 'создание счёта')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!user?.id || deletingAccountId) return
    
    // Confirm deletion
    if (!confirm(`Удалить счёт "${accountName}"?\n\nТранзакции сохранятся в истории.`)) {
      return
    }
    
    setDeletingAccountId(accountId)
    try {
      const res = await fetch(`/api/accounts?id=${accountId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }
      
      // Reload data
      const financeRes = await fetch(`/api/finance?userId=${user.id}`)
      const data = await financeRes.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      showSuccessToast('Счёт удалён')
    } catch (err) {
      showErrorToast(err, 'удаление счёта')
    } finally {
      setDeletingAccountId(null)
    }
  }

  // Update account
  const handleUpdateAccount = async () => {
    if (!editingAccount || !user?.id || isUpdatingAccount) return
    
    setIsUpdatingAccount(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccount.id,
          name: editingAccount.name,
          type: editingAccount.type,
          currency: editingAccount.currency,
          icon: editingAccount.icon,
          initialBalance: editingAccount.initialBalance
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update account')
      }
      
      // Reload data
      const financeRes = await fetch(`/api/finance?userId=${user.id}`)
      const data = await financeRes.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      setEditingAccount(null)
      showSuccessToast('Счёт обновлён')
    } catch (err) {
      showErrorToast(err, 'обновление счёта')
    } finally {
      setIsUpdatingAccount(false)
    }
  }

  // Update transaction
  const handleUpdateTransaction = async () => {
    if (!editingTransaction || !user?.id || isUpdatingTransaction) return
    
    setIsUpdatingTransaction(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransaction.id,
          accountId: editingTransaction.account.id,
          categoryId: editingTransaction.category?.id || null,
          amount: editingTransaction.amount,
          description: editingTransaction.description,
          date: editingTransaction.date
        })
      })
      
      if (!res.ok) throw new Error('Failed to update transaction')
      
      // Reload data
      const financeRes = await fetch(`/api/finance?userId=${user.id}`)
      const data = await financeRes.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      setEditingTransaction(null)
      showSuccessToast('Транзакция обновлена')
    } catch (err) {
      showErrorToast(err, 'обновление транзакции')
    } finally {
      setIsUpdatingTransaction(false)
    }
  }

  // Create transaction
  const handleCreateTransaction = async () => {
    if (!user?.id || !newTransaction.accountId || !newTransaction.amount) return
    
    if (!isOnline()) {
      showErrorToast(new Error('Network error'), 'создание транзакции')
      return
    }
    
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          accountId: newTransaction.accountId,
          categoryId: newTransaction.categoryId || null,
          amount: parseFloat(newTransaction.amount),
          description: newTransaction.description,
          date: newTransaction.date
        })
      })
      
      if (!res.ok) throw new Error('Failed to create transaction')
      
      // Reload data
      const financeRes = await fetch(`/api/finance?userId=${user.id}`)
      const data = await financeRes.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      setShowAddTransaction(false)
      setNewTransaction({
        accountId: '',
        categoryId: '',
        amount: '',
        description: '',
        date: getTodayKey()
      })
      showSuccessToast('Транзакция добавлена')
    } catch (err) {
      showErrorToast(err, 'создание транзакции')
    }
  }

  // Transfer between accounts
  const handleCreateTransfer = async () => {
    if (!user?.id || !transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.fromAmount) return
    if (transferForm.fromAccountId === transferForm.toAccountId) return

    if (!isOnline()) {
      showErrorToast(new Error('Network error'), 'перевод')
      return
    }

    setIsCreatingTransfer(true)
    try {
      const fromAmt = parseFloat(transferForm.fromAmount)
      const toAmt = transferForm.isCurrencyExchange && transferForm.toAmount
        ? parseFloat(transferForm.toAmount)
        : fromAmt

      const fromAccount = summary?.accounts.find(a => a.id === transferForm.fromAccountId)
      const toAccount = summary?.accounts.find(a => a.id === transferForm.toAccountId)
      const desc = transferForm.description || `Перевод: ${fromAccount?.name} → ${toAccount?.name}`

      // Create debit on source account
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          accountId: transferForm.fromAccountId,
          amount: -fromAmt,
          description: desc,
          date: transferForm.date,
          zone: 'transfer'
        })
      })

      // Create credit on destination account
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          accountId: transferForm.toAccountId,
          amount: toAmt,
          description: desc,
          date: transferForm.date,
          zone: 'transfer'
        })
      })

      // Reload finance data
      const financeRes = await fetch(`/api/finance?userId=${user.id}`)
      const data = await financeRes.json()
      if (data.success) setSummary(data.summary)

      setShowTransfer(false)
      setTransferForm({
        fromAccountId: '',
        toAccountId: '',
        fromAmount: '',
        toAmount: '',
        isCurrencyExchange: false,
        date: getTodayKey(),
        description: ''
      })
      showSuccessToast('Перевод выполнен')
    } catch (err) {
      showErrorToast(err, 'перевод')
    } finally {
      setIsCreatingTransfer(false)
    }
  }

  // Format money with currency
  const formatMoney = (amount: number, currency: string = 'RUB') => {
    const formatter = getCurrencyFormatter(currency)
    return formatter.format(amount)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    })
  }
  
  // Get date range based on period filter
  const getDateRange = (period: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (period) {
      case 'today':
        return { from: today.toISOString(), to: now.toISOString() }
      case 'week': {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return { from: weekAgo.toISOString(), to: now.toISOString() }
      }
      case 'month': {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return { from: monthAgo.toISOString(), to: now.toISOString() }
      }
      case 'all':
        return { from: undefined, to: undefined }
      case 'custom':
        return { 
          from: customDateFrom ? new Date(customDateFrom).toISOString() : undefined,
          to: customDateTo ? new Date(customDateTo + 'T23:59:59').toISOString() : undefined
        }
      default:
        return { from: undefined, to: undefined }
    }
  }
  
  // Load account history
  const loadAccountHistory = async (account: Account, period: string) => {
    if (!user?.id) return
    
    setLoadingAccountHistory(true)
    try {
      const { from, to } = getDateRange(period)
      let url = `/api/transactions?userId=${user.id}&accountId=${account.id}`
      if (from) url += `&from=${from}`
      if (to) url += `&to=${to}`
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (data.success) {
        setAccountTransactions(data.transactions)
      }
    } catch (err) {
      showErrorToast(err, 'загрузка истории')
    } finally {
      setLoadingAccountHistory(false)
    }
  }
  
  // Open account history
  const handleViewAccountHistory = (account: Account) => {
    setViewingAccountHistory(account)
    setPeriodFilter('month')
    setCustomDateFrom('')
    setCustomDateTo('')
    loadAccountHistory(account, 'month')
  }
  
  // Calculate period totals
  const getPeriodTotals = (transactions: Transaction[]) => {
    const income = transactions.filter(t => t.amount >= 0).reduce((sum, t) => sum + t.amount, 0)
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, expenses, change: income - expenses }
  }

  // Save monthly budget for a category
  const handleSaveBudget = async () => {
    if (!editingBudget || isSavingBudget) return
    setIsSavingBudget(true)
    try {
      const parsed = parseFloat(budgetInput)
      const monthlyTarget = budgetInput.trim() === '' || isNaN(parsed) ? null : Math.abs(parsed)
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingBudget.id, monthlyTarget }),
      })
      if (!res.ok) throw new Error('Failed to update budget')
      setSummary(prev =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map(c =>
                c.id === editingBudget.id ? { ...c, monthlyTarget } : c
              ),
            }
          : prev
      )
      setEditingBudget(null)
      setBudgetInput('')
      showSuccessToast(monthlyTarget ? `Бюджет сохранён: ${formatMoney(monthlyTarget)}` : 'Бюджет снят')
    } catch (err) {
      showErrorToast(err, 'сохранение бюджета')
    } finally {
      setIsSavingBudget(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Финансы</h1>
        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-red-400">{error}</p>
                <Button size="sm" variant="outline" onClick={() => {
                  setError(null)
                  setLoading(true)
                  // Retry load
                  const loadData = async () => {
                    if (!user?.id) return
                    try {
                      const res = await fetch(`/api/finance?userId=${user.id}`)
                      const data = await res.json()
                      if (data.success) {
                        setSummary(data.summary)
                      }
                    } catch (err) {
                      showErrorToast(err, 'загрузка финансов')
                    } finally {
                      setLoading(false)
                    }
                  }
                  loadData()
                }}>
                  Повторить
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Финансы</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddAccount(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Счёт
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
            <ArrowLeftRight className="w-4 h-4 mr-1" />
            Перевод
          </Button>
          <Button size="sm" className="bg-primary" onClick={() => setShowAddTransaction(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Доход/Расход
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Общий баланс</p>
            <p className="text-4xl font-bold text-primary">
              {formatMoney(summary?.totalBalance || 0)}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-emerald-500/10">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Доход</span>
              </div>
              <p className="font-bold text-emerald-400">
                {formatMoney(summary?.thisMonthIncome || 0)}
              </p>
              <p className="text-xs text-muted-foreground">этот месяц</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/10">
              <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs">Расход</span>
              </div>
              <p className="font-bold text-red-400">
                {formatMoney(summary?.thisMonthExpenses || 0)}
              </p>
              <p className="text-xs text-muted-foreground">этот месяц</p>
            </div>
          </div>
          {/* Daily rate and projection */}
          {summary && summary.dailyAvgExpenses > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-white/5 text-xs text-muted-foreground flex justify-between">
              <span>📊 В день: {formatMoney(summary.dailyAvgExpenses)}</span>
              <span>📅 Прогноз: {formatMoney(summary.projectedMonthExpenses)}</span>
              <span>⏳ Ост.: {summary.daysRemaining} дн.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accounts */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Счета
            </CardTitle>
            <Badge variant="outline">{summary?.accounts.length || 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {summary?.accounts.length ? (
            <div className="space-y-2">
              {summary.accounts.map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{account.icon || '💳'}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.type.startsWith('custom:') ? account.type.substring(7) : account.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold ${account.currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatMoney(account.currentBalance, account.currency || 'RUB')}
                    </p>
                    {/* Action buttons - visible on hover/tap */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); handleViewAccountHistory(account); }}
                        title="История счёта"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setEditingAccount(account); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id, account.name); }}
                        disabled={deletingAccountId === account.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Нет счетов</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddAccount(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить счёт
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories / Envelopes */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Категории / Конверты
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.categories.length ? (
            <div className="space-y-3">
              {summary.categories.map(category => {
                const zoneConfig = ZONE_CONFIG[category.zone] || ZONE_CONFIG.general
                const spentAbs = Math.abs(category.spent)
                const progress = category.monthlyTarget
                  ? Math.min((spentAbs / category.monthlyTarget) * 100, 100)
                  : null
                const overBudget = category.monthlyTarget ? spentAbs > category.monthlyTarget : false
                const progressColor = !category.monthlyTarget
                  ? ''
                  : overBudget
                    ? '[&>div]:bg-red-500'
                    : progress !== null && progress >= 70
                      ? '[&>div]:bg-yellow-500'
                      : '[&>div]:bg-emerald-500'

                return (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon || zoneConfig.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{zoneConfig.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-bold ${category.spent <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatMoney(spentAbs)}
                          </p>
                          {category.monthlyTarget ? (
                            <div>
                              <p className={`text-xs ${overBudget ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                                {overBudget ? '⚠️ ' : ''}из {formatMoney(category.monthlyTarget)}
                              </p>
                              {!overBudget && (
                                <p className="text-[10px] text-emerald-400/70">
                                  ост. {formatMoney(category.monthlyTarget - spentAbs)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/50">нет лимита</p>
                          )}
                        </div>
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          onClick={() => {
                            setEditingBudget(category)
                            setBudgetInput(category.monthlyTarget?.toString() ?? '')
                          }}
                          title="Установить бюджет"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {progress !== null && (
                      <Progress
                        value={progress}
                        className={`h-2 ${progressColor}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <PiggyBank className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Категории создадутся автоматически</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Zone Summary */}
      {summary?.byZone && Object.keys(summary.byZone).length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">По зонам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(summary.byZone).map(([zone, amount]) => {
                const zoneConfig = ZONE_CONFIG[zone] || ZONE_CONFIG.general
                return (
                  <div
                    key={zone}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                  >
                    <span className="text-lg">{zoneConfig.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{zoneConfig.label}</p>
                      <p className={`font-bold text-sm ${amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatMoney(amount)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Последние транзакции
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentTransactions.length ? (
            <div className="space-y-2">
              {summary.recentTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setEditingTransaction(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.amount >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}>
                      {transaction.amount >= 0 ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {transaction.description || transaction.category?.name || 'Без категории'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{transaction.account.name}</span>
                        <span>•</span>
                        <span>{formatDate(transaction.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold ${transaction.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatMoney(transaction.amount, transaction.account.currency || 'RUB')}
                    </p>
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Нет транзакций</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый счёт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Карта Тинькофф"
                value={newAccount.name}
                onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={newAccount.type} onValueChange={v => setNewAccount(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newAccount.type === 'custom' && (
              <div className="space-y-2">
                <Label>Название типа</Label>
                <Input
                  placeholder="Например: Крипта"
                  value={newAccount.customType}
                  onChange={e => setNewAccount(prev => ({ ...prev, customType: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select value={newAccount.currency} onValueChange={v => setNewAccount(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Начальный баланс</Label>
              <Input
                type="number"
                placeholder="0"
                value={newAccount.initialBalance}
                onChange={e => setNewAccount(prev => ({ ...prev, initialBalance: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddAccount(false)}>
                Отмена
              </Button>
              <Button className="flex-1 bg-primary" onClick={handleCreateAccount} disabled={!newAccount.name || isCreatingAccount}>
                {isCreatingAccount ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая транзакция</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Счёт</Label>
              <Select value={newTransaction.accountId} onValueChange={v => setNewTransaction(prev => ({ ...prev, accountId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon}</span>
                        {account.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Категория (опц.)</Label>
              <Select value={newTransaction.categoryId} onValueChange={v => setNewTransaction(prev => ({ ...prev, categoryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Без категории" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма (+ доход / - расход)</Label>
              <Input
                type="number"
                placeholder="-5000"
                value={newTransaction.amount}
                onChange={e => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={newTransaction.date}
                onChange={e => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опц.)</Label>
              <Input
                placeholder="Описание..."
                value={newTransaction.description}
                onChange={e => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddTransaction(false)}>
                Отмена
              </Button>
              <Button 
                className="flex-1 bg-primary" 
                onClick={handleCreateTransaction} 
                disabled={!newTransaction.accountId || !newTransaction.amount}
              >
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать счёт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={editingAccount?.name || ''}
                onChange={e => setEditingAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={editingAccount?.type || 'cash'} onValueChange={v => setEditingAccount(prev => prev ? { ...prev, type: v } : null)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select value={editingAccount?.currency || 'RUB'} onValueChange={v => setEditingAccount(prev => prev ? { ...prev, currency: v } : null)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Начальный баланс</Label>
              <Input
                type="number"
                value={editingAccount?.initialBalance || 0}
                onChange={e => setEditingAccount(prev => prev ? { ...prev, initialBalance: parseFloat(e.target.value) || 0 } : null)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingAccount(null)}>
                Отмена
              </Button>
              <Button className="flex-1 bg-primary" onClick={handleUpdateAccount} disabled={isUpdatingAccount}>
                {isUpdatingAccount ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать транзакцию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Счёт</Label>
              <Select 
                value={editingTransaction?.account?.id || ''} 
                onValueChange={v => {
                  const acc = summary?.accounts.find(a => a.id === v)
                  setEditingTransaction(prev => prev && acc ? { 
                    ...prev, 
                    account: { id: acc.id, name: acc.name, icon: acc.icon, currency: acc.currency }
                  } : null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon}</span>
                        {account.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Категория (опц.)</Label>
              <Select 
                value={editingTransaction?.category?.id || ''} 
                onValueChange={v => {
                  const cat = summary?.categories.find(c => c.id === v)
                  setEditingTransaction(prev => prev ? { 
                    ...prev, 
                    category: cat ? { id: cat.id, name: cat.name, icon: cat.icon, zone: cat.zone } : null
                  } : null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без категории" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма (+ доход / - расход)</Label>
              <Input
                type="number"
                value={editingTransaction?.amount || 0}
                onChange={e => setEditingTransaction(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={editingTransaction?.date ? editingTransaction.date.split('T')[0] : ''}
                onChange={e => setEditingTransaction(prev => prev ? { ...prev, date: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опц.)</Label>
              <Input
                value={editingTransaction?.description || ''}
                onChange={e => setEditingTransaction(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingTransaction(null)}>
                Отмена
              </Button>
              <Button 
                className="flex-1 bg-primary" 
                onClick={handleUpdateTransaction} 
                disabled={isUpdatingTransaction}
              >
                {isUpdatingTransaction ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account History Dialog */}
      <Dialog open={!!viewingAccountHistory} onOpenChange={() => setViewingAccountHistory(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{viewingAccountHistory?.icon || '💳'}</span>
              {viewingAccountHistory?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2 overflow-y-auto flex-1">
            {/* Current Balance */}
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Текущий баланс</p>
              <p className={`text-2xl font-bold ${viewingAccountHistory && viewingAccountHistory.currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMoney(viewingAccountHistory?.currentBalance || 0, viewingAccountHistory?.currency || 'RUB')}
              </p>
            </div>
            
            {/* Period Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'today', label: 'Сегодня' },
                { value: 'week', label: 'Неделя' },
                { value: 'month', label: 'Месяц' },
                { value: 'all', label: 'Всё' },
                { value: 'custom', label: 'Период' },
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={periodFilter === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setPeriodFilter(opt.value as typeof periodFilter)
                    if (opt.value !== 'custom' && viewingAccountHistory) {
                      loadAccountHistory(viewingAccountHistory, opt.value)
                    }
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            
            {/* Custom Date Range */}
            {periodFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">От</Label>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={e => setCustomDateFrom(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">До</Label>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={e => setCustomDateTo(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="col-span-2 h-8"
                  onClick={() => viewingAccountHistory && loadAccountHistory(viewingAccountHistory, 'custom')}
                  disabled={!customDateFrom || !customDateTo}
                >
                  Применить
                </Button>
              </div>
            )}
            
            {/* Period Totals */}
            {accountTransactions.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <p className="text-xs text-muted-foreground">Доход</p>
                  <p className="font-bold text-emerald-400 text-sm">
                    +{formatMoney(getPeriodTotals(accountTransactions).income, viewingAccountHistory?.currency || 'RUB')}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <p className="text-xs text-muted-foreground">Расход</p>
                  <p className="font-bold text-red-400 text-sm">
                    -{formatMoney(getPeriodTotals(accountTransactions).expenses, viewingAccountHistory?.currency || 'RUB')}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Итого</p>
                  <p className={`font-bold text-sm ${getPeriodTotals(accountTransactions).change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {getPeriodTotals(accountTransactions).change >= 0 ? '+' : ''}{formatMoney(getPeriodTotals(accountTransactions).change, viewingAccountHistory?.currency || 'RUB')}
                  </p>
                </div>
              </div>
            )}
            
            {/* Transactions List */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Транзакции ({accountTransactions.length})
              </p>
              
              {loadingAccountHistory ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                </div>
              ) : accountTransactions.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {accountTransactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setViewingAccountHistory(null)
                        setEditingTransaction(transaction)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.amount >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                          {transaction.amount >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {transaction.description || transaction.category?.name || 'Без категории'}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm ${transaction.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatMoney(transaction.amount, viewingAccountHistory?.currency || 'RUB')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Нет транзакций за период</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Перевод между счетами
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Откуда</Label>
              <Select value={transferForm.fromAccountId} onValueChange={v => setTransferForm(prev => ({ ...prev, fromAccountId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Счёт списания" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon}</span>
                        {account.name} ({account.currency || 'RUB'})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Куда</Label>
              <Select value={transferForm.toAccountId} onValueChange={v => setTransferForm(prev => ({ ...prev, toAccountId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Счёт зачисления" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.filter(a => a.id !== transferForm.fromAccountId).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon}</span>
                        {account.name} ({account.currency || 'RUB'})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма списания</Label>
              <Input
                type="number"
                placeholder="1000"
                value={transferForm.fromAmount}
                onChange={e => setTransferForm(prev => ({ ...prev, fromAmount: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="currencyExchange"
                checked={transferForm.isCurrencyExchange}
                onChange={e => setTransferForm(prev => ({ ...prev, isCurrencyExchange: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="currencyExchange" className="cursor-pointer">Обмен валюты (разные суммы)</Label>
            </div>
            {transferForm.isCurrencyExchange && (
              <div className="space-y-2">
                <Label>Сумма зачисления</Label>
                <Input
                  type="number"
                  placeholder="12.5"
                  value={transferForm.toAmount}
                  onChange={e => setTransferForm(prev => ({ ...prev, toAmount: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={e => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опц.)</Label>
              <Input
                placeholder="Пополнение карты..."
                value={transferForm.description}
                onChange={e => setTransferForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowTransfer(false)}>
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleCreateTransfer}
                disabled={
                  !transferForm.fromAccountId ||
                  !transferForm.toAccountId ||
                  !transferForm.fromAmount ||
                  transferForm.fromAccountId === transferForm.toAccountId ||
                  isCreatingTransfer
                }
              >
                {isCreatingTransfer ? 'Переводим...' : 'Перевести'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Goal Edit Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={open => { if (!open) { setEditingBudget(null); setBudgetInput('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{editingBudget?.icon || '📦'}</span>
              Бюджет: {editingBudget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Лимит расходов на месяц</Label>
              <Input
                type="number"
                min="0"
                placeholder="Например: 5000"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Оставь пустым — лимит будет снят
              </p>
            </div>
            {editingBudget?.monthlyTarget && (
              <p className="text-xs text-muted-foreground">
                Текущий: {formatMoney(editingBudget.monthlyTarget)} / мес
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setEditingBudget(null); setBudgetInput('') }}
                disabled={isSavingBudget}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleSaveBudget}
                disabled={isSavingBudget}
              >
                {isSavingBudget ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
