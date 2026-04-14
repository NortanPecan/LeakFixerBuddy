"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  RefreshCw,
  Trash2,
  Edit2,
  Calendar,
  PiggyBank,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  ZONE_CONFIG,
  formatFinanceDate as formatDate,
  formatMoney,
  getPeriodTotals,
  useFinanceScreen,
} from "@/features/finance";

export function FinanceScreen() {
  const { user } = useAppStore();
  const {
    summary,
    loading,
    error,
    showAddTransaction,
    setShowAddTransaction,
    showAddAccount,
    setShowAddAccount,
    isCreatingAccount,
    deletingAccountId,
    editingAccount,
    setEditingAccount,
    editingTransaction,
    setEditingTransaction,
    isUpdatingAccount,
    isUpdatingTransaction,
    viewingAccountHistory,
    setViewingAccountHistory,
    accountTransactions,
    periodFilter,
    setPeriodFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    loadingAccountHistory,
    newTransaction,
    setNewTransaction,
    editingBudget,
    setEditingBudget,
    budgetInput,
    setBudgetInput,
    isSavingBudget,
    showTransfer,
    setShowTransfer,
    isCreatingTransfer,
    transferForm,
    setTransferForm,
    newAccount,
    setNewAccount,
    handleRetryLoad,
    handleCreateAccount,
    handleDeleteAccount,
    handleUpdateAccount,
    handleUpdateTransaction,
    handleCreateTransaction,
    handleCreateTransfer,
    loadAccountHistory,
    handleViewAccountHistory,
    handleSaveBudget,
  } = useFinanceScreen({ userId: user?.id });

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-foreground text-2xl font-bold">Финансы</h1>
        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-red-400">{error}</p>
                <Button size="sm" variant="outline" onClick={handleRetryLoad}>
                  Повторить
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Финансы</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddAccount(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Счёт
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            Перевод
          </Button>
          <Button size="sm" className="bg-primary" onClick={() => setShowAddTransaction(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Доход/Расход
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <Card className="from-primary/20 to-primary/5 border-primary/20 bg-gradient-to-br">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-1 text-sm">Общий баланс</p>
            <p className="text-primary text-4xl font-bold">
              {formatMoney(summary?.totalBalance || 0)}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
              <div className="mb-1 flex items-center justify-center gap-1 text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Доход</span>
              </div>
              <p className="font-bold text-emerald-400">
                {formatMoney(summary?.thisMonthIncome || 0)}
              </p>
              <p className="text-muted-foreground text-xs">этот месяц</p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3 text-center">
              <div className="mb-1 flex items-center justify-center gap-1 text-red-400">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Расход</span>
              </div>
              <p className="font-bold text-red-400">
                {formatMoney(summary?.thisMonthExpenses || 0)}
              </p>
              <p className="text-muted-foreground text-xs">этот месяц</p>
            </div>
          </div>
          {/* Daily rate and projection */}
          {summary && summary.dailyAvgExpenses > 0 && (
            <div className="text-muted-foreground mt-3 flex justify-between rounded-lg bg-white/5 p-3 text-xs">
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5" />
              Счета
            </CardTitle>
            <Badge variant="outline">{summary?.accounts.length || 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {summary?.accounts.length ? (
            <div className="space-y-2">
              {summary.accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-muted/30 group flex items-center justify-between rounded-lg p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-2xl">{account.icon || "💳"}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{account.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {account.type.startsWith("custom:")
                          ? account.type.substring(7)
                          : account.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-bold ${account.currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {formatMoney(account.currentBalance, account.currency || "RUB")}
                    </p>
                    {/* Action buttons - visible on hover/tap */}
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAccountHistory(account);
                        }}
                        title="История счёта"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccount(account);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 w-7 p-0 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(account.id, account.name);
                        }}
                        disabled={deletingAccountId === account.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Wallet className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Нет счетов</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddAccount(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Добавить счёт
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories / Envelopes */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-5 w-5" />
            Категории / Конверты
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.categories.length ? (
            <div className="space-y-3">
              {summary.categories.map((category) => {
                const zoneConfig = ZONE_CONFIG[category.zone] || ZONE_CONFIG.general;
                const spentAbs = Math.abs(category.spent);
                const progress = category.monthlyTarget
                  ? Math.min((spentAbs / category.monthlyTarget) * 100, 100)
                  : null;
                const overBudget = category.monthlyTarget
                  ? spentAbs > category.monthlyTarget
                  : false;
                const progressColor = !category.monthlyTarget
                  ? ""
                  : overBudget
                    ? "[&>div]:bg-red-500"
                    : progress !== null && progress >= 70
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-emerald-500";

                return (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon || zoneConfig.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-muted-foreground text-xs">{zoneConfig.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p
                            className={`font-bold ${category.spent <= 0 ? "text-red-400" : "text-emerald-400"}`}
                          >
                            {formatMoney(spentAbs)}
                          </p>
                          {category.monthlyTarget ? (
                            <div>
                              <p
                                className={`text-xs ${overBudget ? "font-medium text-red-400" : "text-muted-foreground"}`}
                              >
                                {overBudget ? "⚠️ " : ""}из {formatMoney(category.monthlyTarget)}
                              </p>
                              {!overBudget && (
                                <p className="text-[10px] text-emerald-400/70">
                                  ост. {formatMoney(category.monthlyTarget - spentAbs)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground/50 text-xs">нет лимита</p>
                          )}
                        </div>
                        <button
                          className="hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1.5 transition-colors"
                          onClick={() => {
                            setEditingBudget(category);
                            setBudgetInput(category.monthlyTarget?.toString() ?? "");
                          }}
                          title="Установить бюджет"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {progress !== null && (
                      <Progress value={progress} className={`h-2 ${progressColor}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center">
              <PiggyBank className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Категории создадутся автоматически</p>
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
                const zoneConfig = ZONE_CONFIG[zone] || ZONE_CONFIG.general;
                return (
                  <div key={zone} className="bg-muted/30 flex items-center gap-2 rounded-lg p-2">
                    <span className="text-lg">{zoneConfig.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground truncate text-xs">{zoneConfig.label}</p>
                      <p
                        className={`text-sm font-bold ${amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {formatMoney(amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-5 w-5" />
            Последние транзакции
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentTransactions.length ? (
            <div className="space-y-2">
              {summary.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-muted/30 group hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors"
                  onClick={() => setEditingTransaction(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        transaction.amount >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                      }`}
                    >
                      {transaction.amount >= 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {transaction.description || transaction.category?.name || "Без категории"}
                      </p>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <span>{transaction.account.name}</span>
                        <span>•</span>
                        <span>{formatDate(transaction.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-bold ${transaction.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {formatMoney(transaction.amount, transaction.account.currency || "RUB")}
                    </p>
                    <Edit2 className="text-muted-foreground h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <RefreshCw className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Нет транзакций</p>
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
                onChange={(e) => setNewAccount((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={newAccount.type}
                onValueChange={(v) => setNewAccount((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newAccount.type === "custom" && (
              <div className="space-y-2">
                <Label>Название типа</Label>
                <Input
                  placeholder="Например: Крипта"
                  value={newAccount.customType}
                  onChange={(e) =>
                    setNewAccount((prev) => ({ ...prev, customType: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select
                value={newAccount.currency}
                onValueChange={(v) => setNewAccount((prev) => ({ ...prev, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
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
                onChange={(e) =>
                  setNewAccount((prev) => ({ ...prev, initialBalance: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddAccount(false)}>
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleCreateAccount}
                disabled={!newAccount.name || isCreatingAccount}
              >
                {isCreatingAccount ? "Создание..." : "Создать"}
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
              <Select
                value={newTransaction.accountId}
                onValueChange={(v) => setNewTransaction((prev) => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.map((account) => (
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
                value={newTransaction.categoryId}
                onValueChange={(v) => setNewTransaction((prev) => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без категории" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.categories.map((category) => (
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
                onChange={(e) => setNewTransaction((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={newTransaction.date}
                onChange={(e) =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    date: e.target.value as `${number}-${number}-${number}`,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опц.)</Label>
              <Input
                placeholder="Описание..."
                value={newTransaction.description}
                onChange={(e) =>
                  setNewTransaction((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddTransaction(false)}
              >
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
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
                value={editingAccount?.name || ""}
                onChange={(e) =>
                  setEditingAccount((prev) => (prev ? { ...prev, name: e.target.value } : null))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={editingAccount?.type || "cash"}
                onValueChange={(v) =>
                  setEditingAccount((prev) => (prev ? { ...prev, type: v } : null))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select
                value={editingAccount?.currency || "RUB"}
                onValueChange={(v) =>
                  setEditingAccount((prev) => (prev ? { ...prev, currency: v } : null))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
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
                onChange={(e) =>
                  setEditingAccount((prev) =>
                    prev ? { ...prev, initialBalance: parseFloat(e.target.value) || 0 } : null
                  )
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingAccount(null)}>
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleUpdateAccount}
                disabled={isUpdatingAccount}
              >
                {isUpdatingAccount ? "Сохранение..." : "Сохранить"}
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
                value={editingTransaction?.account?.id || ""}
                onValueChange={(v) => {
                  const acc = summary?.accounts.find((a) => a.id === v);
                  setEditingTransaction((prev) =>
                    prev && acc
                      ? {
                          ...prev,
                          account: {
                            id: acc.id,
                            name: acc.name,
                            icon: acc.icon,
                            currency: acc.currency,
                          },
                        }
                      : null
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счёт" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.map((account) => (
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
                value={editingTransaction?.category?.id || ""}
                onValueChange={(v) => {
                  const cat = summary?.categories.find((c) => c.id === v);
                  setEditingTransaction((prev) =>
                    prev
                      ? {
                          ...prev,
                          category: cat
                            ? { id: cat.id, name: cat.name, icon: cat.icon, zone: cat.zone }
                            : null,
                        }
                      : null
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без категории" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.categories.map((category) => (
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
                onChange={(e) =>
                  setEditingTransaction((prev) =>
                    prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={editingTransaction?.date ? editingTransaction.date.split("T")[0] : ""}
                onChange={(e) =>
                  setEditingTransaction((prev) => (prev ? { ...prev, date: e.target.value } : null))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опц.)</Label>
              <Input
                value={editingTransaction?.description || ""}
                onChange={(e) =>
                  setEditingTransaction((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingTransaction(null)}
              >
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleUpdateTransaction}
                disabled={isUpdatingTransaction}
              >
                {isUpdatingTransaction ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account History Dialog */}
      <Dialog open={!!viewingAccountHistory} onOpenChange={() => setViewingAccountHistory(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-md flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{viewingAccountHistory?.icon || "💳"}</span>
              {viewingAccountHistory?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto pt-2">
            {/* Current Balance */}
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Текущий баланс</p>
              <p
                className={`text-2xl font-bold ${viewingAccountHistory && viewingAccountHistory.currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {formatMoney(
                  viewingAccountHistory?.currentBalance || 0,
                  viewingAccountHistory?.currency || "RUB"
                )}
              </p>
            </div>

            {/* Period Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {[
                { value: "today", label: "Сегодня" },
                { value: "week", label: "Неделя" },
                { value: "month", label: "Месяц" },
                { value: "all", label: "Всё" },
                { value: "custom", label: "Период" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={periodFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setPeriodFilter(opt.value as typeof periodFilter);
                    if (opt.value !== "custom" && viewingAccountHistory) {
                      loadAccountHistory(viewingAccountHistory, opt.value as typeof periodFilter);
                    }
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            {periodFilter === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">От</Label>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">До</Label>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="col-span-2 h-8"
                  onClick={() =>
                    viewingAccountHistory && loadAccountHistory(viewingAccountHistory, "custom")
                  }
                  disabled={!customDateFrom || !customDateTo}
                >
                  Применить
                </Button>
              </div>
            )}

            {/* Period Totals */}
            {accountTransactions.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <p className="text-muted-foreground text-xs">Доход</p>
                  <p className="text-sm font-bold text-emerald-400">
                    +
                    {formatMoney(
                      getPeriodTotals(accountTransactions).income,
                      viewingAccountHistory?.currency || "RUB"
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2">
                  <p className="text-muted-foreground text-xs">Расход</p>
                  <p className="text-sm font-bold text-red-400">
                    -
                    {formatMoney(
                      getPeriodTotals(accountTransactions).expenses,
                      viewingAccountHistory?.currency || "RUB"
                    )}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-muted-foreground text-xs">Итого</p>
                  <p
                    className={`text-sm font-bold ${getPeriodTotals(accountTransactions).change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {getPeriodTotals(accountTransactions).change >= 0 ? "+" : ""}
                    {formatMoney(
                      getPeriodTotals(accountTransactions).change,
                      viewingAccountHistory?.currency || "RUB"
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Transactions List */}
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Транзакции ({accountTransactions.length})
              </p>

              {loadingAccountHistory ? (
                <div className="py-4 text-center">
                  <RefreshCw className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                </div>
              ) : accountTransactions.length > 0 ? (
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {accountTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-muted/20 hover:bg-muted/30 flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors"
                      onClick={() => {
                        setViewingAccountHistory(null);
                        setEditingTransaction(transaction);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            transaction.amount >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                          }`}
                        >
                          {transaction.amount >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="max-w-[150px] truncate text-sm font-medium">
                            {transaction.description ||
                              transaction.category?.name ||
                              "Без категории"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-bold ${transaction.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {transaction.amount >= 0 ? "+" : ""}
                        {formatMoney(transaction.amount, viewingAccountHistory?.currency || "RUB")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-muted-foreground text-sm">Нет транзакций за период</p>
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
              <ArrowLeftRight className="h-4 w-4" />
              Перевод между счетами
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Откуда</Label>
              <Select
                value={transferForm.fromAccountId}
                onValueChange={(v) => setTransferForm((prev) => ({ ...prev, fromAccountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Счёт списания" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon}</span>
                        {account.name} ({account.currency || "RUB"})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Куда</Label>
              <Select
                value={transferForm.toAccountId}
                onValueChange={(v) => setTransferForm((prev) => ({ ...prev, toAccountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Счёт зачисления" />
                </SelectTrigger>
                <SelectContent>
                  {summary?.accounts
                    .filter((a) => a.id !== transferForm.fromAccountId)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.icon}</span>
                          {account.name} ({account.currency || "RUB"})
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
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, fromAmount: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="currencyExchange"
                checked={transferForm.isCurrencyExchange}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, isCurrencyExchange: e.target.checked }))
                }
                className="rounded"
              />
              <Label htmlFor="currencyExchange" className="cursor-pointer">
                Обмен валюты (разные суммы)
              </Label>
            </div>
            {transferForm.isCurrencyExchange && (
              <div className="space-y-2">
                <Label>Сумма зачисления</Label>
                <Input
                  type="number"
                  placeholder="12.5"
                  value={transferForm.toAmount}
                  onChange={(e) =>
                    setTransferForm((prev) => ({ ...prev, toAmount: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    date: e.target.value as `${number}-${number}-${number}`,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опц.)</Label>
              <Input
                placeholder="Пополнение карты..."
                value={transferForm.description}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowTransfer(false)}>
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleCreateTransfer}
                disabled={
                  !transferForm.fromAccountId ||
                  !transferForm.toAccountId ||
                  !transferForm.fromAmount ||
                  transferForm.fromAccountId === transferForm.toAccountId ||
                  isCreatingTransfer
                }
              >
                {isCreatingTransfer ? "Переводим..." : "Перевести"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Goal Edit Dialog */}
      <Dialog
        open={!!editingBudget}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBudget(null);
            setBudgetInput("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{editingBudget?.icon || "📦"}</span>
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
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveBudget()}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">Оставь пустым — лимит будет снят</p>
            </div>
            {editingBudget?.monthlyTarget && (
              <p className="text-muted-foreground text-xs">
                Текущий: {formatMoney(editingBudget.monthlyTarget)} / мес
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditingBudget(null);
                  setBudgetInput("");
                }}
                disabled={isSavingBudget}
              >
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleSaveBudget}
                disabled={isSavingBudget}
              >
                {isSavingBudget ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
