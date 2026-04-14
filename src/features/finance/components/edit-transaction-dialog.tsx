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
import type { Account, Category, Transaction } from "@/features/finance/types";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  setTransaction: Dispatch<SetStateAction<Transaction | null>>;
  accounts: Account[];
  categories: Category[];
  isUpdatingTransaction: boolean;
  onUpdateTransaction: () => void;
}

export function EditTransactionDialog({
  transaction,
  setTransaction,
  accounts,
  categories,
  isUpdatingTransaction,
  onUpdateTransaction,
}: EditTransactionDialogProps) {
  return (
    <Dialog open={!!transaction} onOpenChange={() => setTransaction(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Редактировать транзакцию</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Счёт</Label>
            <Select
              value={transaction?.account?.id || ""}
              onValueChange={(value) => {
                const account = accounts.find((item) => item.id === value);
                setTransaction((prev) =>
                  prev && account
                    ? {
                        ...prev,
                        account: {
                          id: account.id,
                          name: account.name,
                          icon: account.icon,
                          currency: account.currency,
                        },
                      }
                    : null
                );
              }}
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
              value={transaction?.category?.id || ""}
              onValueChange={(value) => {
                const category = categories.find((item) => item.id === value);
                setTransaction((prev) =>
                  prev
                    ? {
                        ...prev,
                        category: category
                          ? {
                              id: category.id,
                              name: category.name,
                              icon: category.icon,
                              zone: category.zone,
                            }
                          : null,
                      }
                    : null
                );
              }}
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
              value={transaction?.amount || 0}
              onChange={(event) =>
                setTransaction((prev) =>
                  prev ? { ...prev, amount: parseFloat(event.target.value) || 0 } : null
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Дата</Label>
            <Input
              type="date"
              value={transaction?.date ? transaction.date.split("T")[0] : ""}
              onChange={(event) =>
                setTransaction((prev) => (prev ? { ...prev, date: event.target.value } : null))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Комментарий (опц.)</Label>
            <Input
              value={transaction?.description || ""}
              onChange={(event) =>
                setTransaction((prev) =>
                  prev ? { ...prev, description: event.target.value } : null
                )
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTransaction(null)}>
              Отмена
            </Button>
            <Button
              className="bg-primary flex-1"
              onClick={onUpdateTransaction}
              disabled={isUpdatingTransaction}
            >
              {isUpdatingTransaction ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
