"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createAccount,
  createTransaction,
  deleteAccount,
  loadAccountTransactions,
  loadFinanceSummary,
  saveCategoryBudget,
  updateAccount,
  updateTransaction,
} from "@/features/finance/api/finance-api";
import {
  DEFAULT_NEW_ACCOUNT,
  DEFAULT_NEW_TRANSACTION,
  DEFAULT_TRANSFER_FORM,
} from "@/features/finance/lib/finance-constants";
import { formatMoney, getDateRange } from "@/features/finance/lib/finance-formatters";
import type {
  Account,
  Category,
  FinanceSummary,
  NewAccountForm,
  NewTransactionForm,
  PeriodFilter,
  Transaction,
  TransferForm,
} from "@/features/finance/types";
import { getTodayKey } from "@/lib/date-utils";
import { getOfflineMessage, isOnline, showErrorToast, showSuccessToast } from "@/lib/network-utils";

interface UseFinanceScreenOptions {
  userId?: string;
}

export function useFinanceScreen({ userId }: UseFinanceScreenOptions) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [isUpdatingTransaction, setIsUpdatingTransaction] = useState(false);

  const [viewingAccountHistory, setViewingAccountHistory] = useState<Account | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [loadingAccountHistory, setLoadingAccountHistory] = useState(false);

  const [newTransaction, setNewTransaction] = useState<NewTransactionForm>(DEFAULT_NEW_TRANSACTION);

  const [editingBudget, setEditingBudget] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferForm>(DEFAULT_TRANSFER_FORM);

  const [newAccount, setNewAccount] = useState<NewAccountForm>(DEFAULT_NEW_ACCOUNT);

  const refreshSummary = useCallback(async () => {
    if (!userId) return;

    const data = await loadFinanceSummary(userId);
    if (data.success) {
      setSummary(data.summary);
    }
  }, [userId]);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;

      if (!isOnline()) {
        setError(getOfflineMessage());
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await refreshSummary();
      } catch (err) {
        showErrorToast(err, "загрузка финансов");
        setError("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [refreshSummary, userId]);

  const handleRetryLoad = async () => {
    if (!userId) return;

    setError(null);
    setLoading(true);
    try {
      await refreshSummary();
    } catch (err) {
      showErrorToast(err, "загрузка финансов");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!userId || !newAccount.name || isCreatingAccount) return;

    if (!isOnline()) {
      showErrorToast(new Error("Network error"), "создание счёта");
      return;
    }

    setIsCreatingAccount(true);
    try {
      const accountType =
        newAccount.type === "custom"
          ? `custom:${newAccount.customType || "Другое"}`
          : newAccount.type;

      await createAccount({
        userId,
        name: newAccount.name,
        type: accountType,
        currency: newAccount.currency,
        initialBalance: parseFloat(newAccount.initialBalance) || 0,
        icon: newAccount.icon,
      });

      await refreshSummary();
      setShowAddAccount(false);
      setNewAccount(DEFAULT_NEW_ACCOUNT);
      showSuccessToast("Счёт создан");
    } catch (err) {
      showErrorToast(err, "создание счёта");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!userId || deletingAccountId) return;

    if (!window.confirm(`Удалить счёт "${accountName}"?\n\nТранзакции сохранятся в истории.`)) {
      return;
    }

    setDeletingAccountId(accountId);
    try {
      await deleteAccount(accountId);
      await refreshSummary();
      showSuccessToast("Счёт удалён");
    } catch (err) {
      showErrorToast(err, "удаление счёта");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !userId || isUpdatingAccount) return;

    setIsUpdatingAccount(true);
    try {
      await updateAccount({
        id: editingAccount.id,
        name: editingAccount.name,
        type: editingAccount.type,
        currency: editingAccount.currency,
        icon: editingAccount.icon,
        initialBalance: editingAccount.initialBalance,
      });

      await refreshSummary();
      setEditingAccount(null);
      showSuccessToast("Счёт обновлён");
    } catch (err) {
      showErrorToast(err, "обновление счёта");
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction || !userId || isUpdatingTransaction) return;

    setIsUpdatingTransaction(true);
    try {
      await updateTransaction({
        id: editingTransaction.id,
        accountId: editingTransaction.account.id,
        categoryId: editingTransaction.category?.id || null,
        amount: editingTransaction.amount,
        description: editingTransaction.description,
        date: editingTransaction.date,
      });

      await refreshSummary();
      setEditingTransaction(null);
      showSuccessToast("Транзакция обновлена");
    } catch (err) {
      showErrorToast(err, "обновление транзакции");
    } finally {
      setIsUpdatingTransaction(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!userId || !newTransaction.accountId || !newTransaction.amount || isCreatingTransaction) {
      return;
    }

    if (!isOnline()) {
      showErrorToast(new Error("Network error"), "создание транзакции");
      return;
    }

    setIsCreatingTransaction(true);
    try {
      await createTransaction({
        userId,
        accountId: newTransaction.accountId,
        categoryId: newTransaction.categoryId || null,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        date: newTransaction.date,
      });

      await refreshSummary();
      setShowAddTransaction(false);
      setNewTransaction({ ...DEFAULT_NEW_TRANSACTION, date: getTodayKey() });
      showSuccessToast("Транзакция добавлена");
    } catch (err) {
      showErrorToast(err, "создание транзакции");
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (
      !userId ||
      !transferForm.fromAccountId ||
      !transferForm.toAccountId ||
      !transferForm.fromAmount ||
      transferForm.fromAccountId === transferForm.toAccountId
    ) {
      return;
    }

    if (!isOnline()) {
      showErrorToast(new Error("Network error"), "перевод");
      return;
    }

    setIsCreatingTransfer(true);
    try {
      const fromAmount = parseFloat(transferForm.fromAmount);
      const toAmount =
        transferForm.isCurrencyExchange && transferForm.toAmount
          ? parseFloat(transferForm.toAmount)
          : fromAmount;

      const fromAccount = summary?.accounts.find((item) => item.id === transferForm.fromAccountId);
      const toAccount = summary?.accounts.find((item) => item.id === transferForm.toAccountId);
      const description =
        transferForm.description || `Перевод: ${fromAccount?.name} → ${toAccount?.name}`;

      await createTransaction({
        userId,
        accountId: transferForm.fromAccountId,
        amount: -fromAmount,
        description,
        date: transferForm.date,
        zone: "transfer",
      });

      await createTransaction({
        userId,
        accountId: transferForm.toAccountId,
        amount: toAmount,
        description,
        date: transferForm.date,
        zone: "transfer",
      });

      await refreshSummary();
      setShowTransfer(false);
      setTransferForm({ ...DEFAULT_TRANSFER_FORM, date: getTodayKey() });
      showSuccessToast("Перевод выполнен");
    } catch (err) {
      showErrorToast(err, "перевод");
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const loadAccountHistory = async (account: Account, period: PeriodFilter) => {
    if (!userId) return;

    setLoadingAccountHistory(true);
    try {
      const { from, to } = getDateRange(period, customDateFrom, customDateTo);
      const transactions = await loadAccountTransactions({
        userId,
        accountId: account.id,
        from,
        to,
      });

      setAccountTransactions(transactions);
    } catch (err) {
      showErrorToast(err, "загрузка истории");
    } finally {
      setLoadingAccountHistory(false);
    }
  };

  const handleViewAccountHistory = (account: Account) => {
    setViewingAccountHistory(account);
    setPeriodFilter("month");
    setCustomDateFrom("");
    setCustomDateTo("");
    void loadAccountHistory(account, "month");
  };

  const handleSaveBudget = async () => {
    if (!editingBudget || isSavingBudget) return;

    setIsSavingBudget(true);
    try {
      const parsed = parseFloat(budgetInput);
      const monthlyTarget =
        budgetInput.trim() === "" || Number.isNaN(parsed) ? null : Math.abs(parsed);

      await saveCategoryBudget({
        id: editingBudget.id,
        monthlyTarget,
      });

      setSummary((previous) =>
        previous
          ? {
              ...previous,
              categories: previous.categories.map((category) =>
                category.id === editingBudget.id ? { ...category, monthlyTarget } : category
              ),
            }
          : previous
      );
      setEditingBudget(null);
      setBudgetInput("");
      showSuccessToast(
        monthlyTarget ? `Бюджет сохранён: ${formatMoney(monthlyTarget)}` : "Бюджет снят"
      );
    } catch (err) {
      showErrorToast(err, "сохранение бюджета");
    } finally {
      setIsSavingBudget(false);
    }
  };

  return {
    summary,
    loading,
    error,
    showAddTransaction,
    setShowAddTransaction,
    showAddAccount,
    setShowAddAccount,
    isCreatingAccount,
    isCreatingTransaction,
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
  };
}
