"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import type { ActiveChain } from "@/features/notes/types";

interface ChainStepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeChains: ActiveChain[];
  isLoadingChains: boolean;
  selectedChainId: string;
  setSelectedChainId: React.Dispatch<React.SetStateAction<string>>;
  chainStepText: string;
  setChainStepText: React.Dispatch<React.SetStateAction<string>>;
  handleCreateChainStep: () => Promise<void>;
}

export function ChainStepModal({
  open,
  onOpenChange,
  activeChains,
  isLoadingChains,
  selectedChainId,
  setSelectedChainId,
  chainStepText,
  setChainStepText,
  handleCreateChainStep,
}: ChainStepModalProps) {
  const { setScreen } = useAppStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить шаг в цепочку</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {isLoadingChains ? (
            <p className="text-muted-foreground py-4 text-center">Загрузка цепочек...</p>
          ) : activeChains.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-muted-foreground">Нет активных цепочек</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  onOpenChange(false);
                  setScreen("create-chain");
                }}
              >
                Создать цепочку
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Выбрать цепочку</Label>
                <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите цепочку" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeChains.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id}>
                        {chain.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Текст шага</Label>
                <Textarea
                  value={chainStepText}
                  onChange={(e) => setChainStepText(e.target.value)}
                  placeholder="Текст нового шага..."
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Отмена
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void handleCreateChainStep()}
                  disabled={!selectedChainId || !chainStepText.trim()}
                >
                  Создать
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
