"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Plus } from "lucide-react";

interface FinanceHeaderProps {
  title: string;
  addAccountLabel: string;
  transferLabel: string;
  addTransactionLabel: string;
  onAddAccount: () => void;
  onShowTransfer: () => void;
  onAddTransaction: () => void;
}

export function FinanceHeader({
  title,
  addAccountLabel,
  transferLabel,
  addTransactionLabel,
  onAddAccount,
  onShowTransfer,
  onAddTransaction,
}: FinanceHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-foreground text-2xl font-bold">{title}</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onAddAccount}>
          <Plus className="mr-1 h-4 w-4" />
          {addAccountLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onShowTransfer}>
          <ArrowLeftRight className="mr-1 h-4 w-4" />
          {transferLabel}
        </Button>
        <Button size="sm" className="bg-primary" onClick={onAddTransaction}>
          <Plus className="mr-1 h-4 w-4" />
          {addTransactionLabel}
        </Button>
      </div>
    </div>
  );
}
