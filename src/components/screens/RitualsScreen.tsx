"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { showErrorToast, showSuccessToast, isOnline } from "@/lib/network-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  ChevronRight,
  Calendar,
  Zap,
  BookOpen,
  Heart,
  Brain,
  Dumbbell,
  Target,
  TrendingUp,
  Flame,
  Clock,
  X,
  Trash2,
  Pencil,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker, DateBadge } from "@/components/DatePicker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_LABELS,
  TIME_WINDOW_LABELS,
  type Ritual,
  type RitualCategory,
  type AttributeKey,
} from "@/lib/rituals/data";

const CATEGORY_ICONS: Record<RitualCategory, React.ElementType> = {
  health: Heart,
  money: Target,
  learning: BookOpen,
  relationships: Heart,
  mind: Brain,
  productivity: Zap,
};

export function RitualsScreen() {
  const { user, setScreen, selectedDate, selectedDateObj } = useAppStore();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetChecked, setPresetChecked] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingRitual, setDeletingRitual] = useState<Ritual | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [editingRitual, setEditingRitual] = useState<Ritual | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    timeWindow: "any" as Ritual["timeWindow"],
    days: [] as number[],
    goalShort: "",
  });

  // Stats from API
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  });

  // Streak shield
  const [isActivatingShield, setIsActivatingShield] = useState(false);
  const SHIELD_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const shieldUsedAt = user?.streakShieldUsedAt ? new Date(user.streakShieldUsedAt) : null;
  const shieldAvailable = !shieldUsedAt || Date.now() - shieldUsedAt.getTime() > SHIELD_COOLDOWN_MS;
  const shieldRechargesAt = shieldUsedAt
    ? new Date(shieldUsedAt.getTime() + SHIELD_COOLDOWN_MS)
    : null;

  // Load rituals
  useEffect(() => {
    const loadRituals = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/rituals?userId=${user.id}&date=${selectedDate}`);
        if (!response.ok) throw new Error("Failed to load rituals");
        const data = await response.json();

        // Use data from API directly
        setRituals(data.todayRituals || []);
        setStats(data.stats || { total: 0, completed: 0, percentage: 0 });

        // Check if preset was offered before
        const presetOffered = localStorage.getItem("ritual_preset_offered");
        if (!presetOffered && (data.rituals || []).length === 0) {
          setShowPresetModal(true);
        }
        setPresetChecked(true);
      } catch (err) {
        showErrorToast(err, "load rituals");
        setError("Не удалось загрузить ритуалы");
      } finally {
        setIsLoading(false);
      }
    };
    loadRituals();
  }, [user?.id, selectedDate]);

  // Toggle ritual completion
  const handleToggleComplete = async (ritual: Ritual, completed: boolean) => {
    if (!isOnline()) {
      showErrorToast(new Error("Нет подключения к интернету"), "toggle ritual");
      return;
    }
    setTogglingId(ritual.id);
    try {
      const response = await fetch("/api/rituals/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ritualId: ritual.id,
          userId: user?.id,
          date: selectedDate,
          completed,
        }),
      });
      if (!response.ok) throw new Error("Failed to toggle");

      // Update local state
      setRituals((prev) =>
        prev.map((r) => (r.id === ritual.id ? { ...r, completedToday: completed } : r))
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        completed: completed ? prev.completed + 1 : Math.max(0, prev.completed - 1),
        percentage:
          prev.total > 0
            ? Math.round(((completed ? prev.completed + 1 : prev.completed - 1) / prev.total) * 100)
            : 0,
      }));

      showSuccessToast(completed ? "Ритуал выполнен!" : "Ритуал отменен");
    } catch (err) {
      showErrorToast(err, "toggle ritual");
    } finally {
      setTogglingId(null);
    }
  };

  // Apply preset
  const handleApplyPreset = async () => {
    if (!user?.id) return;
    if (!isOnline()) {
      showErrorToast(new Error("Нет подключения к интернету"), "apply preset");
      return;
    }
    setIsApplying(true);
    try {
      const response = await fetch("/api/rituals/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, presetId: "swamp_escape" }),
      });
      const data = await response.json();

      if (data.success) {
        // Reload rituals
        const ritualsResponse = await fetch(`/api/rituals?userId=${user.id}&date=${selectedDate}`);
        const ritualsData = await ritualsResponse.json();
        setRituals(ritualsData.todayRituals || []);
        setStats(ritualsData.stats || { total: 0, completed: 0, percentage: 0 });
        showSuccessToast("Пакет ритуалов подключен!");
      }
    } catch (error) {
      showErrorToast(error, "apply preset");
    } finally {
      setIsApplying(false);
      setShowPresetModal(false);
      localStorage.setItem("ritual_preset_offered", "true");
    }
  };

  // Skip preset
  const handleSkipPreset = () => {
    setShowPresetModal(false);
    localStorage.setItem("ritual_preset_offered", "true");
  };

  // Activate streak shield
  const handleActivateShield = async () => {
    if (!user?.id || !shieldAvailable) return;
    setIsActivatingShield(true);
    try {
      const res = await fetch("/api/streak/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Щит активирован — стрик защищён!");
        // Update user in store so badge updates immediately
        useAppStore.getState().setUser({
          ...user,
          streakShieldUsedAt: data.streakShieldUsedAt,
        });
      } else {
        showErrorToast(new Error(data.error || "Ошибка"), "активация щита");
      }
    } catch (err) {
      showErrorToast(err, "активация щита");
    } finally {
      setIsActivatingShield(false);
    }
  };

  // Open edit dialog for ritual
  const openEditRitual = (ritual: Ritual) => {
    setEditForm({
      title: ritual.title,
      timeWindow: ritual.timeWindow,
      days: ritual.days,
      goalShort: ritual.goalShort || "",
    });
    setEditingRitual(ritual);
    setShowDetail(false);
  };

  // Save ritual edits
  const handleSaveEditRitual = async () => {
    if (!editingRitual || !editForm.title.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/rituals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ritualId: editingRitual.id,
          title: editForm.title.trim(),
          timeWindow: editForm.timeWindow,
          days: editForm.days,
          goalShort: editForm.goalShort,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRituals((prev) =>
          prev.map((r) =>
            r.id === editingRitual.id
              ? {
                  ...r,
                  title: editForm.title.trim(),
                  timeWindow: editForm.timeWindow,
                  days: editForm.days,
                  goalShort: editForm.goalShort,
                }
              : r
          )
        );
        setEditingRitual(null);
        showSuccessToast("Ритуал обновлён");
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      showErrorToast(error, "update ritual");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete/archive ritual
  const handleDeleteRitual = async () => {
    if (!deletingRitual) return;
    if (!isOnline()) {
      showErrorToast(new Error("Нет подключения к интернету"), "delete ritual");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rituals?ritualId=${deletingRitual.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRituals((prev) => prev.filter((r) => r.id !== deletingRitual.id));
        setDeletingRitual(null);
        setShowDetail(false);
        showSuccessToast("Ритуал архивирован");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      showErrorToast(error, "delete ritual");
    } finally {
      setIsDeleting(false);
    }
  };

  // Permanently delete ritual
  const handlePermanentDeleteRitual = async () => {
    if (!deletingRitual) return;
    if (!isOnline()) {
      showErrorToast(new Error("Нет подключения к интернету"), "delete ritual");
      return;
    }

    setIsPermanentDeleting(true);
    try {
      const response = await fetch(`/api/rituals?ritualId=${deletingRitual.id}&permanent=true`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRituals((prev) => prev.filter((r) => r.id !== deletingRitual.id));
        setDeletingRitual(null);
        setShowDetail(false);
        showSuccessToast("Ритуал удалён навсегда");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      showErrorToast(error, "delete ritual permanently");
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  // Group by time window
  const groupedRituals = {
    morning: rituals.filter((r) => r.timeWindow === "morning"),
    day: rituals.filter((r) => r.timeWindow === "day"),
    evening: rituals.filter((r) => r.timeWindow === "evening"),
    any: rituals.filter((r) => r.timeWindow === "any"),
  };

  // Calculate progress from stats
  const progressPercent = stats.percentage;

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Ритуалы</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Загрузка..." : `${rituals.length} активных`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateBadge />
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => setScreen("create-ritual")}
          >
            <Plus className="mr-1 h-4 w-4" />
            Создать
          </Button>
        </div>
      </div>

      {/* Date Picker */}
      <DatePicker variant="compact" />

      {/* Error state */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400">{error}</p>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress for selected day */}
      {!isLoading && stats.total > 0 && (
        <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-r">
          <CardContent className="pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Прогресс</p>
                <p className="text-2xl font-bold">
                  {stats.completed} / {stats.total}
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary text-3xl font-black">{progressPercent}%</p>
                {stats.completed === stats.total && stats.total > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-300">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Все выполнено!
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && rituals.length === 0 && presetChecked && (
        <Card className="bg-card/50 border-dashed backdrop-blur">
          <CardContent className="pt-6 text-center">
            <Sparkles className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground mb-4">Нет активных ритуалов</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowPresetModal(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Подключить базовый пакет
              </Button>
              <Button variant="outline" onClick={() => setScreen("create-ritual")}>
                <Plus className="mr-2 h-4 w-4" />
                Создать свой ритуал
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak Shield banner */}
      {!isLoading && (user?.streak ?? 0) > 0 && (
        <Card
          className={`border ${shieldAvailable ? "border-emerald-500/30 bg-emerald-500/5" : "border-muted/30 bg-muted/5"}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              {shieldAvailable ? (
                <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-400" />
              ) : (
                <ShieldOff className="text-muted-foreground h-8 w-8 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {shieldAvailable ? "Щит стрика готов" : "Щит перезаряжается"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {shieldAvailable
                    ? "Активируй, если пропустишь день — стрик не сгорит"
                    : shieldRechargesAt
                      ? `Готов ${shieldRechargesAt.toLocaleDateString("ru")}`
                      : "Недоступен"}
                </p>
              </div>
              {shieldAvailable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleActivateShield}
                  disabled={isActivatingShield}
                >
                  {isActivatingShield ? "Активация..." : "Активировать"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rituals by time window */}
      {!isLoading && rituals.length > 0 && (
        <>
          {(["morning", "day", "evening", "any"] as const).map((timeWindow) => {
            const ritualsInWindow = groupedRituals[timeWindow];
            if (ritualsInWindow.length === 0) return null;

            return (
              <div key={timeWindow} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-sm font-medium">
                    {TIME_WINDOW_LABELS[timeWindow as keyof typeof TIME_WINDOW_LABELS]}
                  </span>
                </div>
                <div className="space-y-2">
                  {ritualsInWindow.map((ritual) => {
                    const category = CATEGORY_LABELS[ritual.category as RitualCategory];
                    const Icon = category
                      ? CATEGORY_ICONS[ritual.category as RitualCategory]
                      : Target;

                    return (
                      <Card
                        key={ritual.id}
                        className={`bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-all ${
                          (ritual as Ritual & { completedToday?: boolean }).completedToday
                            ? "border-emerald-500/30"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedRitual(ritual);
                          setShowDetail(true);
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            {/* Complete button */}
                            <button
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                                (ritual as Ritual & { completedToday?: boolean }).completedToday
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted hover:bg-muted/70"
                              } ${togglingId === ritual.id ? "opacity-50" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (togglingId !== ritual.id) {
                                  handleToggleComplete(
                                    ritual,
                                    !(ritual as Ritual & { completedToday?: boolean })
                                      .completedToday
                                  );
                                }
                              }}
                              disabled={togglingId === ritual.id}
                            >
                              {togglingId === ritual.id ? (
                                <div className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                              ) : (ritual as Ritual & { completedToday?: boolean })
                                  .completedToday ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="text-muted-foreground h-5 w-5" />
                              )}
                            </button>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`truncate font-medium ${
                                    (ritual as Ritual & { completedToday?: boolean }).completedToday
                                      ? "text-emerald-400"
                                      : ""
                                  }`}
                                >
                                  {ritual.title}
                                </p>
                                {category && <span className="text-sm">{category.icon}</span>}
                              </div>
                              {ritual.goalShort && (
                                <p className="text-muted-foreground truncate text-xs">
                                  {ritual.goalShort}
                                </p>
                              )}
                              {/* Attributes */}
                              {ritual.attributes && (
                                <div className="mt-1 flex gap-1">
                                  {(() => {
                                    try {
                                      const rawAttrs = ritual.attributes;
                                      const attrs: AttributeKey[] = Array.isArray(rawAttrs)
                                        ? rawAttrs
                                        : JSON.parse(rawAttrs as unknown as string);
                                      return attrs.map((attr) => (
                                        <Badge
                                          key={attr}
                                          variant="outline"
                                          className="px-1.5 py-0 text-[10px]"
                                        >
                                          {attr === "health" ? "❤️" : attr === "mind" ? "🧠" : "💪"}
                                        </Badge>
                                      ));
                                    } catch {
                                      return null;
                                    }
                                  })()}
                                </div>
                              )}
                            </div>

                            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* All rituals button */}
      {!isLoading && rituals.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => setScreen("all-rituals")}>
          <Calendar className="mr-2 h-4 w-4" />
          Все ритуалы ({rituals.length})
        </Button>
      )}

      {/* Catalog button */}
      {!isLoading && (
        <Button
          variant="ghost"
          className="text-muted-foreground w-full"
          onClick={() => setScreen("catalog")}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Каталог ритуалов
        </Button>
      )}

      {/* Preset Modal */}
      <Dialog open={showPresetModal} onOpenChange={setShowPresetModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              Базовый пакет
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">
              Хочешь начать с готового пакета &quot;Базовый пакет для выхода из болота&quot;? В него
              входят 12 проверенных ритуалов для старта.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded-lg p-2">💧 Вода утром</div>
              <div className="bg-muted/30 rounded-lg p-2">🏋️ Зарядка</div>
              <div className="bg-muted/30 rounded-lg p-2">🚿 Контрастный душ</div>
              <div className="bg-muted/30 rounded-lg p-2">🌬️ Дыхание</div>
              <div className="bg-muted/30 rounded-lg p-2">🎯 Цели</div>
              <div className="bg-muted/30 rounded-lg p-2">📅 План дня</div>
              <div className="bg-muted/30 rounded-lg p-2">🚶 Прогулка</div>
              <div className="bg-muted/30 rounded-lg p-2">💪 Тренировка</div>
              <div className="bg-muted/30 rounded-lg p-2">🧘 Медитация</div>
              <div className="bg-muted/30 rounded-lg p-2">📖 Обучение</div>
              <div className="bg-muted/30 rounded-lg p-2">📚 Чтение</div>
              <div className="bg-muted/30 rounded-lg p-2">📝 Итоги дня</div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleSkipPreset}>
                Пропустить
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleApplyPreset}
                disabled={isApplying}
              >
                {isApplying ? "Подключение..." : "Подключить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ritual Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRitual?.title}</DialogTitle>
          </DialogHeader>
          {selectedRitual && (
            <RitualDetailContent
              ritual={selectedRitual}
              onComplete={(completed) => {
                handleToggleComplete(selectedRitual, completed);
                setSelectedRitual((prev) => (prev ? { ...prev, completedToday: completed } : null));
              }}
              onDelete={() => {
                setDeletingRitual(selectedRitual);
              }}
              onEdit={() => openEditRitual(selectedRitual)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit ritual dialog */}
      <Dialog open={!!editingRitual} onOpenChange={() => setEditingRitual(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать ритуал</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Название ритуала"
              />
            </div>
            <div className="space-y-2">
              <Label>Время дня</Label>
              <Select
                value={editForm.timeWindow}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, timeWindow: v as Ritual["timeWindow"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">🌅 Утро</SelectItem>
                  <SelectItem value="day">☀️ День</SelectItem>
                  <SelectItem value="evening">🌙 Вечер</SelectItem>
                  <SelectItem value="any">⏰ Любое время</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Дни недели</Label>
              <div className="flex flex-wrap gap-1">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, idx) => {
                  const dayNum = idx + 1;
                  const active = editForm.days.includes(dayNum);
                  return (
                    <Button
                      key={dayNum}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() =>
                        setEditForm((p) => ({
                          ...p,
                          days: active
                            ? p.days.filter((d) => d !== dayNum)
                            : [...p.days, dayNum].sort(),
                        }))
                      }
                    >
                      {day}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цель (коротко)</Label>
              <Input
                value={editForm.goalShort}
                onChange={(e) => setEditForm((p) => ({ ...p, goalShort: e.target.value }))}
                placeholder="Зачем этот ритуал?"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingRitual(null)}
                disabled={isSavingEdit}
              >
                Отмена
              </Button>
              <Button
                className="bg-primary flex-1"
                onClick={handleSaveEditRitual}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingRitual} onOpenChange={() => setDeletingRitual(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить ритуал?</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <p className="text-muted-foreground mb-4">Ритуал "{deletingRitual?.title}"</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDeleteRitual}
                disabled={isDeleting || isPermanentDeleting}
              >
                {isDeleting ? "Архивирование..." : "📦 Архивировать (восстановить можно)"}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handlePermanentDeleteRitual}
                disabled={isDeleting || isPermanentDeleting}
              >
                {isPermanentDeleting ? "Удаление..." : "🗑️ Удалить навсегда"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setDeletingRitual(null)}
                disabled={isDeleting || isPermanentDeleting}
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ritual Detail Content Component
function RitualDetailContent({
  ritual,
  onComplete,
  onDelete,
  onEdit,
}: {
  ritual: Ritual;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [completions, setCompletions] = useState<
    Array<{ date: Date; completed: boolean; note?: string }>
  >([]);
  const [stats, setStats] = useState({ streak: 0, completionRate: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    const loadCompletions = async () => {
      if (!isOnline()) {
        showErrorToast(new Error("Нет подключения к интернету"), "load completions");
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/rituals/complete?ritualId=${ritual.id}`);
        const data = await response.json();
        setCompletions(data.completions || []);
        setStats(data.stats || { streak: 0, completionRate: 0 });
      } catch (error) {
        showErrorToast(error, "load completions");
      } finally {
        setIsLoading(false);
      }
    };
    loadCompletions();
  }, [ritual.id]);

  // Generate heatmap for last 30 days
  const generateHeatmap = useCallback(() => {
    const days: { date: Date; completed: boolean; note: string | undefined | null }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const completion = completions.find((c) => {
        const cDate = new Date(c.date);
        cDate.setHours(0, 0, 0, 0);
        return cDate.getTime() === date.getTime();
      });

      days.push({
        date,
        completed: completion?.completed || false,
        note: completion?.note,
      });
    }
    return days;
  }, [completions]);

  const heatmap = generateHeatmap();
  const category = CATEGORY_LABELS[ritual.category as RitualCategory];

  return (
    <div className="space-y-4 pt-4">
      {/* Category and time */}
      <div className="flex flex-wrap gap-2">
        {category && (
          <Badge className={category.color}>
            {category.icon} {category.label}
          </Badge>
        )}
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          {TIME_WINDOW_LABELS[ritual.timeWindow as keyof typeof TIME_WINDOW_LABELS]}
        </Badge>
      </div>

      {/* Goal */}
      {ritual.goalShort && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-muted-foreground mb-1 text-xs">Цель</p>
          <p className="text-sm font-medium">{ritual.goalShort}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <Flame className="mx-auto mb-1 h-5 w-5 text-orange-400" />
          <p className="text-xl font-bold">{stats.streak}</p>
          <p className="text-muted-foreground text-xs">дней подряд</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-emerald-400" />
          <p className="text-xl font-bold">{stats.completionRate}%</p>
          <p className="text-muted-foreground text-xs">за 30 дней</p>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <p className="text-muted-foreground mb-2 text-xs">Последние 30 дней</p>
        <div className="grid grid-cols-10 gap-1">
          {heatmap.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm ${
                day.completed ? "bg-emerald-500" : "bg-muted"
              }`}
              title={`${day.date.toLocaleDateString("ru-RU")} - ${day.completed ? "Выполнено" : "Не выполнено"}`}
            />
          ))}
        </div>
        <div className="text-muted-foreground mt-2 flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span>Выполнено</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-muted h-3 w-3 rounded-sm" />
            <span>Не выполнено</span>
          </div>
        </div>
      </div>

      {/* Complete button */}
      <Button
        className={`w-full ${(ritual as Ritual & { completedToday?: boolean }).completedToday ? "bg-muted text-muted-foreground" : "bg-primary"}`}
        onClick={() =>
          onComplete(!(ritual as Ritual & { completedToday?: boolean }).completedToday)
        }
      >
        {(ritual as Ritual & { completedToday?: boolean }).completedToday ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Выполнено сегодня
          </>
        ) : (
          <>
            <Circle className="mr-2 h-4 w-4" />
            Отметить выполненным
          </>
        )}
      </Button>

      {/* Edit button */}
      <Button variant="outline" className="w-full" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        Редактировать ритуал
      </Button>

      {/* Delete button */}
      <Button
        variant="ghost"
        className="text-muted-foreground w-full hover:text-red-400"
        onClick={onDelete}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Архивировать ритуал
      </Button>
    </div>
  );
}
