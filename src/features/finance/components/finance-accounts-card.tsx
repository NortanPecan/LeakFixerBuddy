"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Edit2, Trash2, Wallet } from "lucide-react";
import { formatMoney } from "@/features/finance/lib/finance-formatters";
import type { Account } from "@/features/finance/types";

interface FinanceAccountsLabels {
  title: string;
  empty: string;
  add: string;
  historyTitle: string;
  fallbackIcon: string;
}

interface FinanceAccountsCardProps {
  accounts: Account[];
  deletingAccountId: string | null;
  labels: FinanceAccountsLabels;
  onAddAccount: () => void;
  onViewAccountHistory: (account: Account) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string, accountName: string) => void;
}

export function FinanceAccountsCard({
  accounts,
  deletingAccountId,
  labels,
  onAddAccount,
  onViewAccountHistory,
  onEditAccount,
  onDeleteAccount,
}: FinanceAccountsCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            {labels.title}
          </CardTitle>
          <Badge variant="outline">{accounts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length ? (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-muted/30 group flex items-center justify-between rounded-lg p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="text-2xl">{account.icon || labels.fallbackIcon}</span>
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
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        onViewAccountHistory(account);
                      }}
                      title={labels.historyTitle}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditAccount(account);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 w-7 p-0 hover:text-red-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteAccount(account.id, account.name);
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
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onAddAccount}>
              <span className="mr-1 text-base leading-none">+</span>
              {labels.add}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
