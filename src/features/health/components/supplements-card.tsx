"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Plus, CheckCircle2, Circle, Pill, Clock, Trash2 } from "lucide-react";
import {
  TIME_WINDOW_LABELS,
  UNIT_OPTIONS,
  DAY_LABELS,
  DEFAULT_NEW_SUPPLEMENT,
} from "@/features/health/constants";
import type { Supplement, SupplementsData } from "@/features/health/types";

interface SupplementsCardProps {
  supplementsData: SupplementsData | null;
  onToggle: (supplement: Supplement) => Promise<void>;
  onAdd: (params: {
    name: string;
    dosage: string;
    unit: string;
    timeWindow: string;
    days: number[];
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SupplementsCard({
  supplementsData,
  onToggle,
  onAdd,
  onDelete,
}: SupplementsCardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_NEW_SUPPLEMENT });

  const toggleDay = (day: number) => {
    const days = form.days.includes(day) ? form.days.filter((d) => d !== day) : [...form.days, day];
    setForm({ ...form, days });
  };

  const handleAdd = async () => {
    await onAdd(form);
    setShowAdd(false);
    setForm({ ...DEFAULT_NEW_SUPPLEMENT });
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-5 w-5" />
              БАДы
            </CardTitle>
            <div className="flex items-center gap-2">
              {supplementsData && (
                <Badge variant="outline" className="text-xs">
                  {supplementsData.stats.checked}/{supplementsData.stats.total}
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
        </CardHeader>
        <CardContent>
          {supplementsData?.supplements.length ? (
            <>
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Прогресс</span>
                  <span className="text-xs font-medium">{supplementsData.stats.progress}%</span>
                </div>
                <Progress value={supplementsData.stats.progress} className="h-2" />
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {supplementsData.supplements.map((supplement) => {
                  const timeWindow =
                    TIME_WINDOW_LABELS[supplement.timeWindow] ?? TIME_WINDOW_LABELS.any;

                  return (
                    <div
                      key={supplement.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                        supplement.checked
                          ? "border border-emerald-500/20 bg-emerald-500/10"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                      onClick={() => void onToggle(supplement)}
                    >
                      {supplement.checked ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-medium ${supplement.checked ? "text-emerald-400" : ""}`}
                          >
                            {supplement.name}
                          </p>
                          {supplement.dosage && (
                            <Badge variant="secondary" className="text-xs">
                              {supplement.dosage}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>
                            {timeWindow.emoji} {timeWindow.label}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-8 w-8 p-0 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDelete(supplement.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <Pill className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Нет добавок</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAdd(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Добавить БАД
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый БАД</DialogTitle>
            <DialogDescription className="sr-only">Добавить новый БАД</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Витамин D, Креатин..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Дозировка</Label>
                <Input
                  placeholder="2000"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Единица</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Время приёма</Label>
              <Select
                value={form.timeWindow}
                onValueChange={(v) => setForm({ ...form, timeWindow: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_WINDOW_LABELS).map(([key, { label, emoji }]) => (
                    <SelectItem key={key} value={key}>
                      {emoji} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Дни приёма</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, index) => {
                  const day = index + 1;
                  const isActive = form.days.includes(day);
                  return (
                    <Button
                      key={day}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 px-0 ${isActive ? "bg-primary" : ""}`}
                      onClick={() => toggleDay(day)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
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
    </>
  );
}
