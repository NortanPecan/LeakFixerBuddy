"use client";

import type { LucideIcon } from "lucide-react";

export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  icon: string | null;
  color: string | null;
  initialBalance: number;
  currentBalance: number;
}

export interface Category {
  id: string;
  name: string;
  zone: string;
  icon: string | null;
  color: string | null;
  monthlyTarget: number | null;
  spent: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  zone: string | null;
  account: { id: string; name: string; icon: string | null; currency?: string };
  category: { id: string; name: string; icon: string | null; zone: string } | null;
}

export interface FinanceSummary {
  totalBalance: number;
  accounts: Account[];
  categories: Category[];
  recentTransactions: Transaction[];
  byZone: Record<string, number>;
  income: number;
  expenses: number;
  thisMonthIncome: number;
  thisMonthExpenses: number;
  dailyAvgExpenses: number;
  projectedMonthExpenses: number;
  daysElapsed: number;
  daysRemaining: number;
}

export interface AccountTypeOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

export interface ZoneConfigValue {
  label: string;
  emoji: string;
  color: string;
}

export type PeriodFilter = "today" | "week" | "month" | "all" | "custom";

export interface NewTransactionForm {
  accountId: string;
  categoryId: string;
  amount: string;
  description: string;
  date: string;
}

export interface NewAccountForm {
  name: string;
  type: string;
  customType: string;
  currency: string;
  initialBalance: string;
  icon: string;
}

export interface TransferForm {
  fromAccountId: string;
  toAccountId: string;
  fromAmount: string;
  toAmount: string;
  isCurrencyExchange: boolean;
  date: string;
  description: string;
}

export interface FinanceResponse {
  success: boolean;
  summary: FinanceSummary;
}
