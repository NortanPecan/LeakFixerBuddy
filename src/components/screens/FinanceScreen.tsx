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
  CreditCard,
  Banknote,
  Gamepad2,
  Sparkles,
  Filter,
  Calendar,
  PiggyBank,
  RefreshCw
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

// Account types
const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Наличные', icon: Banknote },
  { value: 'card', label: 'Карта', icon: CreditCard },
  { value: 'poker', label: 'Банкролл', icon: Sparkles },
  { value: 'steam', label: 'Steam', icon: Gamepad2 },
  { value: 'other', label: 'Другое', icon: Wallet },
]

// Zone config
const ZONE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  steam: { label: 'Steam', emoji: '🎮', color: '#1b2838' },
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
  account: { id: string; name: string; icon: string | null }
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
}

export function FinanceScreen() {
  const { user } = useAppStore()
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialogs
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  
  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  
  // New account form
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'cash',
    initialBalance: '',
    icon: '💳'
  })

  // Load finance data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/finance?userId=${user.id}`)
        const data = await res.json()
        if (data.success) {
          setSummary(data.summary)
        }
      } catch (error) {
        console.error('Failed to load finance data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user?.id])

  // Create account
  const handleCreateAccount = async () => {
    if (!user?.id || !newAccount.name) return
    
    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newAccount.name,
          type: newAccount.type,
          initialBalance: parseFloat(newAccount.initialBalance) || 0,
          icon: newAccount.icon
        })
      })
      
      // Reload data
      const res = await fetch(`/api/finance?userId=${user.id}`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      setShowAddAccount(false)
      setNewAccount({ name: '', type: 'cash', initialBalance: '', icon: '💳' })
    } catch (error) {
      console.error('Failed to create account:', error)
    }
  }

  // Create transaction
  const handleCreateTransaction = async () => {
    if (!user?.id || !newTransaction.accountId || !newTransaction.amount) return
    
    try {
      await fetch('/api/transactions', {
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
      
      // Reload data
      const res = await fetch(`/api/finance?userId=${user.id}`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
      }
      
      setShowAddTransaction(false)
      setNewTransaction({
        accountId: '',
        categoryId: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Failed to create transaction:', error)
    }
  }

  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Финансы</h1>
        <div className="text-center py-8 text-muted-foreground">
          Загрузка...
        </div>
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
          <Button size="sm" className="bg-primary" onClick={() => setShowAddTransaction(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Транзакция
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
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{account.icon || '💳'}</span>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${account.currentBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatMoney(account.currentBalance)}
                  </p>
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
                const progress = category.monthlyTarget 
                  ? Math.min((Math.abs(category.spent) / category.monthlyTarget) * 100, 100)
                  : null
                
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
                      <div className="text-right">
                        <p className={`font-bold ${category.spent <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatMoney(Math.abs(category.spent))}
                        </p>
                        {category.monthlyTarget && (
                          <p className="text-xs text-muted-foreground">
                            из {formatMoney(category.monthlyTarget)}
                          </p>
                        )}
                      </div>
                    </div>
                    {progress !== null && (
                      <Progress 
                        value={progress} 
                        className="h-2"
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
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
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
                  <p className={`font-bold ${transaction.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {transaction.amount >= 0 ? '+' : ''}{formatMoney(transaction.amount)}
                  </p>
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
              <Button className="flex-1 bg-primary" onClick={handleCreateAccount} disabled={!newAccount.name}>
                Создать
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
    </div>
  )
}
