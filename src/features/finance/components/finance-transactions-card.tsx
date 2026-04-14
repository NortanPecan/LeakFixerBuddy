"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Edit2, RefreshCw } from "lucide-react";
import { formatFinanceDate, formatMoney } from "@/features/finance/lib/finance-formatters";
import type { Transaction } from "@/features/finance/types";

interface FinanceTransactionsLabels {
  title: string;
  empty: string;
  uncategorized: string;
}

interface FinanceTransactionsCardProps {
  transactions: Transaction[];
  labels: FinanceTransactionsLabels;
  onEditTransaction: (transaction: Transaction) => void;
}

export function FinanceTransactionsCard({
  transactions,
  labels,
  onEditTransaction,
}: FinanceTransactionsCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-5 w-5" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length ? (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-muted/30 group hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors"
                onClick={() => onEditTransaction(transaction)}
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
                      {transaction.description ||
                        transaction.category?.name ||
                        labels.uncategorized}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{transaction.account.name}</span>
                      <span>вЂў</span>
                      <span>{formatFinanceDate(transaction.date)}</span>
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
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
