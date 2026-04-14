"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import {
  formatFinanceDate,
  formatMoney,
  getPeriodTotals,
} from "@/features/finance/lib/finance-formatters";
import type { Account, PeriodFilter, Transaction } from "@/features/finance/types";

interface FinanceAccountHistoryDialogProps {
  account: Account | null;
  setAccount: Dispatch<SetStateAction<Account | null>>;
  accountTransactions: Transaction[];
  periodFilter: PeriodFilter;
  setPeriodFilter: Dispatch<SetStateAction<PeriodFilter>>;
  customDateFrom: string;
  setCustomDateFrom: Dispatch<SetStateAction<string>>;
  customDateTo: string;
  setCustomDateTo: Dispatch<SetStateAction<string>>;
  loadingAccountHistory: boolean;
  loadAccountHistory: (account: Account, period: PeriodFilter) => void | Promise<void>;
  onEditTransaction: (transaction: Transaction) => void;
}

const PERIOD_FILTER_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "all", label: "Всё" },
  { value: "custom", label: "Период" },
];

export function FinanceAccountHistoryDialog({
  account,
  setAccount,
  accountTransactions,
  periodFilter,
  setPeriodFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  loadingAccountHistory,
  loadAccountHistory,
  onEditTransaction,
}: FinanceAccountHistoryDialogProps) {
  const totals = getPeriodTotals(accountTransactions);

  return (
    <Dialog open={!!account} onOpenChange={() => setAccount(null)}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{account?.icon || "💳"}</span>
            {account?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pt-2">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-muted-foreground text-xs">Текущий баланс</p>
            <p
              className={`text-2xl font-bold ${account && account.currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {formatMoney(account?.currentBalance || 0, account?.currency || "RUB")}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {PERIOD_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={periodFilter === option.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setPeriodFilter(option.value);
                  if (option.value !== "custom" && account) {
                    void loadAccountHistory(account, option.value);
                  }
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {periodFilter === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">От</Label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(event) => setCustomDateFrom(event.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">До</Label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(event) => setCustomDateTo(event.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="col-span-2 h-8"
                onClick={() => account && loadAccountHistory(account, "custom")}
                disabled={!customDateFrom || !customDateTo}
              >
                Применить
              </Button>
            </div>
          )}

          {accountTransactions.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <p className="text-muted-foreground text-xs">Доход</p>
                <p className="text-sm font-bold text-emerald-400">
                  +{formatMoney(totals.income, account?.currency || "RUB")}
                </p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <p className="text-muted-foreground text-xs">Расход</p>
                <p className="text-sm font-bold text-red-400">
                  -{formatMoney(totals.expenses, account?.currency || "RUB")}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">Итого</p>
                <p
                  className={`text-sm font-bold ${totals.change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {totals.change >= 0 ? "+" : ""}
                  {formatMoney(totals.change, account?.currency || "RUB")}
                </p>
              </div>
            </div>
          )}

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
                      setAccount(null);
                      onEditTransaction(transaction);
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
                          {transaction.description || transaction.category?.name || "Без категории"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatFinanceDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-bold ${transaction.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {formatMoney(transaction.amount, account?.currency || "RUB")}
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
  );
}
