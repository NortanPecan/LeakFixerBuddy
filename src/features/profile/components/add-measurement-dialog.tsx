"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MEASUREMENT_TYPES } from "@/features/profile/constants";

interface AddMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newMeasurement: { type: string; value: string };
  setNewMeasurement: React.Dispatch<React.SetStateAction<{ type: string; value: string }>>;
  handleAddMeasurement: () => Promise<void>;
}

export function AddMeasurementDialog({
  open,
  onOpenChange,
  newMeasurement,
  setNewMeasurement,
  handleAddMeasurement,
}: AddMeasurementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Добавить замер</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Тип замера</Label>
            <div className="grid grid-cols-3 gap-2">
              {MEASUREMENT_TYPES.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={newMeasurement.type === key ? "default" : "outline"}
                  size="sm"
                  className={`text-xs ${newMeasurement.type === key ? "bg-primary" : ""}`}
                  onClick={() => setNewMeasurement((prev) => ({ ...prev, type: key }))}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="measurement-value">Значение</Label>
            <Input
              id="measurement-value"
              type="number"
              step="0.1"
              placeholder={`Введите значение в ${MEASUREMENT_TYPES.find((t) => t.key === newMeasurement.type)?.unit ?? ""}`}
              value={newMeasurement.value}
              onChange={(e) => setNewMeasurement((prev) => ({ ...prev, value: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              className="bg-primary flex-1"
              onClick={() => void handleAddMeasurement()}
              disabled={!newMeasurement.value}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
