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
import { ArrowLeftRight } from "lucide-react";
import type { Account, TransferForm } from "@/features/finance/types";

interface FinanceTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  transferForm: TransferForm;
  setTransferForm: Dispatch<SetStateAction<TransferForm>>;
  isCreatingTransfer: boolean;
  onCreateTransfer: () => void;
}

export function FinanceTransferDialog({
  open,
  onOpenChange,
  accounts,
  transferForm,
  setTransferForm,
  isCreatingTransfer,
  onCreateTransfer,
}: FinanceTransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Перевод между счетами
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Откуда</Label>
            <Select
              value={transferForm.fromAccountId}
              onValueChange={(value) =>
                setTransferForm((prev) => ({ ...prev, fromAccountId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Счёт списания" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.icon}</span>
                      {account.name} ({account.currency || "RUB"})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Куда</Label>
            <Select
              value={transferForm.toAccountId}
              onValueChange={(value) =>
                setTransferForm((prev) => ({ ...prev, toAccountId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Счёт зачисления" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((account) => account.id !== transferForm.fromAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.icon}</span>
                        {account.name} ({account.currency || "RUB"})
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Сумма списания</Label>
            <Input
              type="number"
              placeholder="1000"
              value={transferForm.fromAmount}
              onChange={(event) =>
                setTransferForm((prev) => ({ ...prev, fromAmount: event.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="currencyExchange"
              checked={transferForm.isCurrencyExchange}
              onChange={(event) =>
                setTransferForm((prev) => ({
                  ...prev,
                  isCurrencyExchange: event.target.checked,
                }))
              }
              className="rounded"
            />
            <Label htmlFor="currencyExchange" className="cursor-pointer">
              Обмен валюты (разные суммы)
            </Label>
          </div>
          {transferForm.isCurrencyExchange && (
            <div className="space-y-2">
              <Label>Сумма зачисления</Label>
              <Input
                type="number"
                placeholder="12.5"
                value={transferForm.toAmount}
                onChange={(event) =>
                  setTransferForm((prev) => ({ ...prev, toAmount: event.target.value }))
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Дата</Label>
            <Input
              type="date"
              value={transferForm.date}
              onChange={(event) =>
                setTransferForm((prev) => ({
                  ...prev,
                  date: event.target.value as `${number}-${number}-${number}`,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Комментарий (опц.)</Label>
            <Input
              placeholder="Пополнение карты..."
              value={transferForm.description}
              onChange={(event) =>
                setTransferForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              className="bg-primary flex-1"
              onClick={onCreateTransfer}
              disabled={
                !transferForm.fromAccountId ||
                !transferForm.toAccountId ||
                !transferForm.fromAmount ||
                transferForm.fromAccountId === transferForm.toAccountId ||
                isCreatingTransfer
              }
            >
              {isCreatingTransfer ? "Переводим..." : "Перевести"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
