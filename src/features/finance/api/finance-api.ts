"use client";

import type { Account, FinanceResponse, Transaction } from "@/features/finance/types";

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload as T;
}

export async function loadFinanceSummary(userId: string) {
  const response = await fetch(`/api/finance?userId=${userId}`);
  return parseResponse<FinanceResponse>(response, "Failed to load finance data");
}

export async function createAccount(payload: {
  userId: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: number;
  icon: string;
}) {
  const response = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ success?: boolean; error?: string }>(response, "Failed to create account");
}

export async function deleteAccount(accountId: string) {
  const response = await fetch(`/api/accounts?id=${accountId}`, {
    method: "DELETE",
  });

  return parseResponse<{ success?: boolean; error?: string }>(response, "Failed to delete account");
}

export async function updateAccount(payload: {
  id: string;
  name: string;
  type: string;
  currency: string;
  icon: string | null;
  initialBalance: number;
}) {
  const response = await fetch("/api/accounts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ success?: boolean; account?: Account }>(
    response,
    "Failed to update account"
  );
}

export async function createTransaction(payload: {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  amount: number;
  description?: string;
  date: string;
  zone?: string;
}) {
  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ success?: boolean; transaction?: Transaction }>(
    response,
    "Failed to create transaction"
  );
}

export async function updateTransaction(payload: {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: number;
  description: string | null;
  date: string;
}) {
  const response = await fetch("/api/transactions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ success?: boolean; transaction?: Transaction }>(
    response,
    "Failed to update transaction"
  );
}

export async function loadAccountTransactions(params: {
  userId: string;
  accountId: string;
  from?: string;
  to?: string;
}) {
  const searchParams = new URLSearchParams({
    userId: params.userId,
    accountId: params.accountId,
  });

  if (params.from) {
    searchParams.set("from", params.from);
  }

  if (params.to) {
    searchParams.set("to", params.to);
  }

  const response = await fetch(`/api/transactions?${searchParams.toString()}`);
  const payload = await parseResponse<{ success?: boolean; transactions?: Transaction[] }>(
    response,
    "Failed to load transactions"
  );

  return payload.transactions || [];
}

export async function saveCategoryBudget(payload: { id: string; monthlyTarget: number | null }) {
  const response = await fetch("/api/categories", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ success?: boolean }>(response, "Failed to update budget");
}
