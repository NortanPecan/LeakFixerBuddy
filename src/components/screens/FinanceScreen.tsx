"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  AddAccountDialog,
  AddTransactionDialog,
  EditAccountDialog,
  EditTransactionDialog,
  FinanceAccountsCard,
  FinanceAccountHistoryDialog,
  FinanceBalanceCard,
  FinanceBudgetDialog,
  FinanceCategoriesCard,
  FinanceHeader,
  FinanceTransferDialog,
  FinanceTransactionsCard,
  FinanceZonesCard,
  useFinanceScreen,
} from "@/features/finance";

const FINANCE_HEADER_LABELS = {
  title: "Финансы",
  addAccount: "Счёт",
  transfer: "Перевод",
  addTransaction: "Доход/Расход",
} as const;

const FINANCE_BALANCE_LABELS = {
  totalBalance: "Общий баланс",
  income: "Доход",
  expenses: "Расход",
  currentPeriod: "этот месяц",
  dailyRate: "📊 В день:",
  projection: "📅 Прогноз:",
  remainingDays: "⏳ Ост.:",
} as const;

const FINANCE_ACCOUNTS_LABELS = {
  title: "Счета",
  empty: "Нет счетов",
  add: "Добавить счёт",
  historyTitle: "История счёта",
  fallbackIcon: "💳",
} as const;

const FINANCE_CATEGORIES_LABELS = {
  title: "Категории / Конверты",
  empty: "Категории создадутся автоматически",
  noLimit: "нет лимита",
  remainder: "ост.",
  fromBudget: "из",
  overBudgetPrefix: "⚠️ ",
  editBudgetTitle: "Установить бюджет",
} as const;

const FINANCE_TRANSACTIONS_LABELS = {
  title: "Последние транзакции",
  empty: "Нет транзакций",
  uncategorized: "Без категории",
} as const;

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
      <FinanceHeader
        title={FINANCE_HEADER_LABELS.title}
        addAccountLabel={FINANCE_HEADER_LABELS.addAccount}
        transferLabel={FINANCE_HEADER_LABELS.transfer}
        addTransactionLabel={FINANCE_HEADER_LABELS.addTransaction}
        onAddAccount={() => setShowAddAccount(true)}
        onShowTransfer={() => setShowTransfer(true)}
        onAddTransaction={() => setShowAddTransaction(true)}
      />

      <FinanceBalanceCard summary={summary} labels={FINANCE_BALANCE_LABELS} />

      <FinanceAccountsCard
        accounts={summary?.accounts || []}
        deletingAccountId={deletingAccountId}
        labels={FINANCE_ACCOUNTS_LABELS}
        onAddAccount={() => setShowAddAccount(true)}
        onViewAccountHistory={handleViewAccountHistory}
        onEditAccount={setEditingAccount}
        onDeleteAccount={handleDeleteAccount}
      />

      <FinanceCategoriesCard
        categories={summary?.categories || []}
        labels={FINANCE_CATEGORIES_LABELS}
        onEditBudget={(category) => {
          setEditingBudget(category);
          setBudgetInput(category.monthlyTarget?.toString() ?? "");
        }}
      />

      {summary?.byZone && Object.keys(summary.byZone).length > 0 && (
        <FinanceZonesCard byZone={summary.byZone} title="По зонам" />
      )}

      <FinanceTransactionsCard
        transactions={summary?.recentTransactions || []}
        labels={FINANCE_TRANSACTIONS_LABELS}
        onEditTransaction={setEditingTransaction}
      />
      <AddAccountDialog
        open={showAddAccount}
        onOpenChange={setShowAddAccount}
        newAccount={newAccount}
        setNewAccount={setNewAccount}
        isCreatingAccount={isCreatingAccount}
        onCreateAccount={handleCreateAccount}
      />

      <AddTransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        accounts={summary?.accounts || []}
        categories={summary?.categories || []}
        newTransaction={newTransaction}
        setNewTransaction={setNewTransaction}
        onCreateTransaction={handleCreateTransaction}
      />

      <EditAccountDialog
        account={editingAccount}
        setAccount={setEditingAccount}
        isUpdatingAccount={isUpdatingAccount}
        onUpdateAccount={handleUpdateAccount}
      />

      <EditTransactionDialog
        transaction={editingTransaction}
        setTransaction={setEditingTransaction}
        accounts={summary?.accounts || []}
        categories={summary?.categories || []}
        isUpdatingTransaction={isUpdatingTransaction}
        onUpdateTransaction={handleUpdateTransaction}
      />

      <FinanceAccountHistoryDialog
        account={viewingAccountHistory}
        setAccount={setViewingAccountHistory}
        accountTransactions={accountTransactions}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        customDateFrom={customDateFrom}
        setCustomDateFrom={setCustomDateFrom}
        customDateTo={customDateTo}
        setCustomDateTo={setCustomDateTo}
        loadingAccountHistory={loadingAccountHistory}
        loadAccountHistory={loadAccountHistory}
        onEditTransaction={setEditingTransaction}
      />

      <FinanceTransferDialog
        open={showTransfer}
        onOpenChange={setShowTransfer}
        accounts={summary?.accounts || []}
        transferForm={transferForm}
        setTransferForm={setTransferForm}
        isCreatingTransfer={isCreatingTransfer}
        onCreateTransfer={handleCreateTransfer}
      />

      <FinanceBudgetDialog
        category={editingBudget}
        setCategory={setEditingBudget}
        budgetInput={budgetInput}
        setBudgetInput={setBudgetInput}
        isSavingBudget={isSavingBudget}
        onSaveBudget={handleSaveBudget}
      />
    </div>
  );
}
