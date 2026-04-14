"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, Category, NewTransactionForm } from "@/features/finance/types";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  newTransaction: NewTransactionForm;
  setNewTransaction: Dispatch<SetStateAction<NewTransactionForm>>;
  onCreateTransaction: () => void;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  newTransaction,
  setNewTransaction,
  onCreateTransaction,
}: AddTransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Новая транзакция</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Счёт</Label>
            <Select
              value={newTransaction.accountId}
              onValueChange={(value) =>
                setNewTransaction((prev) => ({ ...prev, accountId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите счёт" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.icon}</span>
                      {account.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Категория (опц.)</Label>
            <Select
              value={newTransaction.categoryId}
              onValueChange={(value) =>
                setNewTransaction((prev) => ({ ...prev, categoryId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Сумма (+ доход / - расход)</Label>
            <Input
              type="number"
              placeholder="-5000"
              value={newTransaction.amount}
              onChange={(event) =>
                setNewTransaction((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Дата</Label>
            <Input
              type="date"
              value={newTransaction.date}
              onChange={(event) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  date: event.target.value as `${number}-${number}-${number}`,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Комментарий (опц.)</Label>
            <Input
              placeholder="Описание..."
              value={newTransaction.description}
              onChange={(event) =>
                setNewTransaction((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              className="bg-primary flex-1"
              onClick={onCreateTransaction}
              disabled={!newTransaction.accountId || !newTransaction.amount}
            >
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
