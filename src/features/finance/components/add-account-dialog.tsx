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
import { ACCOUNT_TYPES, CURRENCIES } from "@/features/finance/lib/finance-constants";
import type { NewAccountForm } from "@/features/finance/types";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newAccount: NewAccountForm;
  setNewAccount: Dispatch<SetStateAction<NewAccountForm>>;
  isCreatingAccount: boolean;
  onCreateAccount: () => void;
}

export function AddAccountDialog({
  open,
  onOpenChange,
  newAccount,
  setNewAccount,
  isCreatingAccount,
  onCreateAccount,
}: AddAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый счёт</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              placeholder="Карта Тинькофф"
              value={newAccount.name}
              onChange={(event) => setNewAccount((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select
              value={newAccount.type}
              onValueChange={(value) => setNewAccount((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {newAccount.type === "custom" && (
            <div className="space-y-2">
              <Label>Название типа</Label>
              <Input
                placeholder="Например: Крипта"
                value={newAccount.customType}
                onChange={(event) =>
                  setNewAccount((prev) => ({ ...prev, customType: event.target.value }))
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Валюта</Label>
            <Select
              value={newAccount.currency}
              onValueChange={(value) => setNewAccount((prev) => ({ ...prev, currency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Начальный баланс</Label>
            <Input
              type="number"
              placeholder="0"
              value={newAccount.initialBalance}
              onChange={(event) =>
                setNewAccount((prev) => ({ ...prev, initialBalance: event.target.value }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              className="bg-primary flex-1"
              onClick={onCreateAccount}
              disabled={!newAccount.name || isCreatingAccount}
            >
              {isCreatingAccount ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
