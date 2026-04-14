"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Apple, ChevronRight, Trash2 } from "lucide-react";
import { MEAL_TYPE_LABELS, QUALITY_LABELS, DEFAULT_NEW_FOOD } from "@/features/health/constants";
import type { FoodData, FoodEntry } from "@/features/health/types";

interface FoodCardProps {
  foodData: FoodData | null;
  onAdd: (params: {
    name: string;
    mealType: string;
    time: string;
    calories: string;
    quality: string;
    amount: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (entry: FoodEntry) => Promise<void>;
}

export function FoodCard({ foodData, onAdd, onDelete, onUpdate }: FoodCardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_NEW_FOOD });
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [foodSearch, setFoodSearch] = useState("");

  const handleAdd = async () => {
    const mealType =
      form.mealType === "custom" ? `custom:${form.customMealType || "Другое"}` : form.mealType;
    await onAdd({ ...form, mealType });
    setShowAdd(false);
    setForm({ ...DEFAULT_NEW_FOOD });
  };

  const handleUpdate = async () => {
    if (!editingFood) return;
    await onUpdate(editingFood);
    setEditingFood(null);
  };

  const renderEntryRow = (entry: FoodEntry) => {
    const quality = entry.quality ? QUALITY_LABELS[entry.quality] : null;
    return (
      <div
        key={entry.id}
        className="bg-muted/30 group flex items-center justify-between rounded-lg p-3"
      >
        <div
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
          onClick={() => setEditingFood(entry)}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              {entry.time && <span>{entry.time}</span>}
              {entry.time && entry.calories && <span>•</span>}
              {entry.calories && <span>{entry.calories} ккал</span>}
              {entry.amount && <span>• {entry.amount}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quality && (
            <Badge variant="outline" className={`text-xs ${quality.color}`}>
              {quality.label}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => setEditingFood(entry)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 w-8 p-0 hover:text-red-400"
            onClick={() => void onDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="h-5 w-5" />
              Еда
            </CardTitle>
            <div className="flex items-center gap-2">
              {foodData && (
                <Badge variant="outline" className="text-xs">
                  {foodData.totals.calories} ккал
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {(foodData?.entries.length ?? 0) > 3 && (
            <Input
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              placeholder="Поиск по еде..."
              className="mt-2 h-8 text-sm"
            />
          )}
        </CardHeader>
        <CardContent>
          {foodData?.entries.length ? (
            <div className="max-h-80 space-y-4 overflow-y-auto">
              {["breakfast", "lunch", "dinner", "snack"].map((mealType) => {
                const allEntries = foodData.byMealType[mealType] ?? [];
                const entries = foodSearch
                  ? allEntries.filter((e) =>
                      e.name.toLowerCase().includes(foodSearch.toLowerCase())
                    )
                  : allEntries;
                if (entries.length === 0) return null;
                const mealLabel = MEAL_TYPE_LABELS[mealType];
                return (
                  <div key={mealType}>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1 text-xs tracking-wide uppercase">
                      <span>{mealLabel?.emoji}</span>
                      {mealLabel?.label}
                    </p>
                    <div className="space-y-2">{entries.map(renderEntryRow)}</div>
                  </div>
                );
              })}

              {foodData &&
                Object.keys(foodData.byMealType)
                  .filter((type) => type.startsWith("custom:"))
                  .map((customType) => {
                    const allEntries = foodData.byMealType[customType] ?? [];
                    const entries = foodSearch
                      ? allEntries.filter((e) =>
                          e.name.toLowerCase().includes(foodSearch.toLowerCase())
                        )
                      : allEntries;
                    if (entries.length === 0) return null;
                    const customName = customType.substring(7);
                    return (
                      <div key={customType}>
                        <p className="text-muted-foreground mb-2 flex items-center gap-1 text-xs tracking-wide uppercase">
                          <span>🍴</span>
                          {customName}
                        </p>
                        <div className="space-y-2">{entries.map(renderEntryRow)}</div>
                      </div>
                    );
                  })}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Apple className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Нет записей о еде</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAdd(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Добавить еду
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD FOOD DIALOG */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить еду</DialogTitle>
            <DialogDescription className="sr-only">Добавить запись о приёме пищи</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Овсянка с ягодами..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Приём пищи</Label>
                <Select
                  value={form.mealType}
                  onValueChange={(v) => setForm({ ...form, mealType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPE_LABELS).map(([key, { label, emoji }]) => (
                      <SelectItem key={key} value={key}>
                        {emoji} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Время</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            {form.mealType === "custom" && (
              <div className="space-y-2">
                <Label>Название приёма пищи</Label>
                <Input
                  placeholder="Например: Полдник"
                  value={form.customMealType}
                  onChange={(e) => setForm({ ...form, customMealType: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Калории</Label>
                <Input
                  type="number"
                  placeholder="300"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input
                  placeholder="200г"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Качество</Label>
              <Select value={form.quality} onValueChange={(v) => setForm({ ...form, quality: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUALITY_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={() => void handleAdd()}
                disabled={!form.name}
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT FOOD DIALOG */}
      <Dialog open={!!editingFood} onOpenChange={() => setEditingFood(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать еду</DialogTitle>
            <DialogDescription className="sr-only">
              Редактировать запись о приёме пищи
            </DialogDescription>
          </DialogHeader>
          {editingFood && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={editingFood.name}
                  onChange={(e) => setEditingFood({ ...editingFood, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Приём пищи</Label>
                  <Select
                    value={editingFood.mealType}
                    onValueChange={(v) => setEditingFood({ ...editingFood, mealType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEAL_TYPE_LABELS).map(([key, { label, emoji }]) => (
                        <SelectItem key={key} value={key}>
                          {emoji} {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Время</Label>
                  <Input
                    type="time"
                    value={editingFood.time ?? ""}
                    onChange={(e) => setEditingFood({ ...editingFood, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Калории</Label>
                  <Input
                    type="number"
                    value={editingFood.calories ?? ""}
                    onChange={(e) =>
                      setEditingFood({
                        ...editingFood,
                        calories: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input
                    value={editingFood.amount ?? ""}
                    onChange={(e) => setEditingFood({ ...editingFood, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Качество</Label>
                <Select
                  value={editingFood.quality ?? "neutral"}
                  onValueChange={(v) => setEditingFood({ ...editingFood, quality: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUALITY_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingFood(null)}>
                  Отмена
                </Button>
                <Button className="bg-primary flex-1" onClick={() => void handleUpdate()}>
                  Сохранить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
