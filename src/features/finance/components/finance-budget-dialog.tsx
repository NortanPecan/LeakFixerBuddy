"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/features/finance/lib/finance-formatters";
import type { Category } from "@/features/finance/types";

interface FinanceBudgetDialogProps {
  category: Category | null;
  setCategory: Dispatch<SetStateAction<Category | null>>;
  budgetInput: string;
  setBudgetInput: Dispatch<SetStateAction<string>>;
  isSavingBudget: boolean;
  onSaveBudget: () => void;
}

export function FinanceBudgetDialog({
  category,
  setCategory,
  budgetInput,
  setBudgetInput,
  isSavingBudget,
  onSaveBudget,
}: FinanceBudgetDialogProps) {
  return (
    <Dialog
      open={!!category}
      onOpenChange={(open) => {
        if (!open) {
          setCategory(null);
          setBudgetInput("");
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{category?.icon || "📦"}</span>
            Бюджет: {category?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Лимит расходов на месяц</Label>
            <Input
              type="number"
              min="0"
              placeholder="Например: 5000"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onSaveBudget()}
              autoFocus
            />
            <p className="text-muted-foreground text-xs">Оставь пустым — лимит будет снят</p>
          </div>
          {category?.monthlyTarget && (
            <p className="text-muted-foreground text-xs">
              Текущий: {formatMoney(category.monthlyTarget)} / мес
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setCategory(null);
                setBudgetInput("");
              }}
              disabled={isSavingBudget}
            >
              Отмена
            </Button>
            <Button className="bg-primary flex-1" onClick={onSaveBudget} disabled={isSavingBudget}>
              {isSavingBudget ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
