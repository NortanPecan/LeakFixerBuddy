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
import type { Account } from "@/features/finance/types";

interface EditAccountDialogProps {
  account: Account | null;
  setAccount: Dispatch<SetStateAction<Account | null>>;
  isUpdatingAccount: boolean;
  onUpdateAccount: () => void;
}

export function EditAccountDialog({
  account,
  setAccount,
  isUpdatingAccount,
  onUpdateAccount,
}: EditAccountDialogProps) {
  return (
    <Dialog open={!!account} onOpenChange={() => setAccount(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Редактировать счёт</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={account?.name || ""}
              onChange={(event) =>
                setAccount((prev) => (prev ? { ...prev, name: event.target.value } : null))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select
              value={account?.type || "cash"}
              onValueChange={(value) =>
                setAccount((prev) => (prev ? { ...prev, type: value } : null))
              }
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
          <div className="space-y-2">
            <Label>Валюта</Label>
            <Select
              value={account?.currency || "RUB"}
              onValueChange={(value) =>
                setAccount((prev) => (prev ? { ...prev, currency: value } : null))
              }
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
              value={account?.initialBalance || 0}
              onChange={(event) =>
                setAccount((prev) =>
                  prev ? { ...prev, initialBalance: parseFloat(event.target.value) || 0 } : null
                )
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAccount(null)}>
              Отмена
            </Button>
            <Button
              className="bg-primary flex-1"
              onClick={onUpdateAccount}
              disabled={isUpdatingAccount}
            >
              {isUpdatingAccount ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
