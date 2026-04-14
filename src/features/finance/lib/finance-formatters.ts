"use client";

import type { PeriodFilter, Transaction } from "@/features/finance/types";

const currencyFormatters: Record<string, Intl.NumberFormat> = {};

export function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  if (!currencyFormatters[currency]) {
    try {
      currencyFormatters[currency] = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch {
      currencyFormatters[currency] = new Intl.NumberFormat("ru-RU", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }

  return currencyFormatters[currency];
}

export function formatMoney(amount: number, currency = "RUB"): string {
  return getCurrencyFormatter(currency).format(amount);
}

export function formatFinanceDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function getDateRange(
  period: PeriodFilter,
  customDateFrom: string,
  customDateTo: string,
  now = new Date()
): { from?: string; to?: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return { from: today.toISOString(), to: now.toISOString() };
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo.toISOString(), to: now.toISOString() };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: monthAgo.toISOString(), to: now.toISOString() };
    }
    case "all":
      return { from: undefined, to: undefined };
    case "custom":
      return {
        from: customDateFrom ? new Date(customDateFrom).toISOString() : undefined,
        to: customDateTo ? new Date(`${customDateTo}T23:59:59`).toISOString() : undefined,
      };
    default:
      return { from: undefined, to: undefined };
  }
}

export function getPeriodTotals(transactions: Transaction[]) {
  const income = transactions
    .filter((item) => item.amount >= 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions
    .filter((item) => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  return {
    income,
    expenses,
    change: income - expenses,
  };
}
