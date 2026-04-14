"use client";

import { Banknote, CreditCard, PiggyBank, Sparkles, Wallet } from "lucide-react";
import type {
  AccountTypeOption,
  CurrencyOption,
  NewAccountForm,
  NewTransactionForm,
  TransferForm,
  ZoneConfigValue,
} from "@/features/finance/types";
import { getTodayKey } from "@/lib/date-utils";

export const ACCOUNT_TYPES: AccountTypeOption[] = [
  { value: "cash", label: "Наличные", icon: Banknote },
  { value: "card", label: "Карта", icon: CreditCard },
  { value: "poker", label: "Банкролл", icon: Sparkles },
  { value: "savings", label: "Накопления", icon: PiggyBank },
  { value: "custom", label: "Другое...", icon: Wallet },
];

export const CURRENCIES: CurrencyOption[] = [
  { value: "RUB", label: "Рубль (₽)", symbol: "₽" },
  { value: "USD", label: "Доллар ($)", symbol: "$" },
  { value: "EUR", label: "Евро (€)", symbol: "€" },
  { value: "KZT", label: "Тенге (₸)", symbol: "₸" },
  { value: "UZS", label: "Сум (сўм)", symbol: "сўм" },
  { value: "custom", label: "Другая валюта", symbol: "" },
];

export const ZONE_CONFIG: Record<string, ZoneConfigValue> = {
  leakfixer: { label: "LeakFixer", emoji: "🔧", color: "#4a5568" },
  ai: { label: "ИИ", emoji: "🤖", color: "#6366f1" },
  poker: { label: "Покер", emoji: "♠️", color: "#059669" },
  health: { label: "Здоровье", emoji: "💪", color: "#dc2626" },
  life: { label: "Жизнь", emoji: "🏠", color: "#f59e0b" },
  savings: { label: "Резерв", emoji: "💰", color: "#10b981" },
  general: { label: "Общее", emoji: "📦", color: "#6b7280" },
};

export const DEFAULT_NEW_TRANSACTION: NewTransactionForm = {
  accountId: "",
  categoryId: "",
  amount: "",
  description: "",
  date: getTodayKey(),
};

export const DEFAULT_NEW_ACCOUNT: NewAccountForm = {
  name: "",
  type: "cash",
  customType: "",
  currency: "RUB",
  initialBalance: "",
  icon: "💳",
};

export const DEFAULT_TRANSFER_FORM: TransferForm = {
  fromAccountId: "",
  toAccountId: "",
  fromAmount: "",
  toAmount: "",
  isCurrencyExchange: false,
  date: getTodayKey(),
  description: "",
};
