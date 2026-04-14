"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "@/features/finance/lib/finance-formatters";
import type { FinanceSummary } from "@/features/finance/types";

interface FinanceBalanceLabels {
  totalBalance: string;
  income: string;
  expenses: string;
  currentPeriod: string;
  dailyRate: string;
  projection: string;
  remainingDays: string;
}

interface FinanceBalanceCardProps {
  summary: FinanceSummary | null;
  labels: FinanceBalanceLabels;
}

export function FinanceBalanceCard({ summary, labels }: FinanceBalanceCardProps) {
  return (
    <Card className="from-primary/20 to-primary/5 border-primary/20 bg-gradient-to-br">
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-1 text-sm">{labels.totalBalance}</p>
          <p className="text-primary text-4xl font-bold">
            {formatMoney(summary?.totalBalance || 0)}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">{labels.income}</span>
            </div>
            <p className="font-bold text-emerald-400">
              {formatMoney(summary?.thisMonthIncome || 0)}
            </p>
            <p className="text-muted-foreground text-xs">{labels.currentPeriod}</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-red-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs">{labels.expenses}</span>
            </div>
            <p className="font-bold text-red-400">{formatMoney(summary?.thisMonthExpenses || 0)}</p>
            <p className="text-muted-foreground text-xs">{labels.currentPeriod}</p>
          </div>
        </div>

        {summary && summary.dailyAvgExpenses > 0 && (
          <div className="text-muted-foreground mt-3 flex justify-between rounded-lg bg-white/5 p-3 text-xs">
            <span>
              {labels.dailyRate} {formatMoney(summary.dailyAvgExpenses)}
            </span>
            <span>
              {labels.projection} {formatMoney(summary.projectedMonthExpenses)}
            </span>
            <span>
              {labels.remainingDays} {summary.daysRemaining} РґРЅ.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
