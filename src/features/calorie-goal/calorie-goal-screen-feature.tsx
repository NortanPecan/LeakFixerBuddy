"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Target,
  Flame,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/network-utils";

interface WeekDay {
  date: string;
  calories: number | null;
  target: number | null;
}

interface GoalData {
  startWeight: number;
  targetWeight: number;
  currentWeight: number;
  startDate: string;
  deadline: string;
  totalDays: number;
  daysLeft: number;
  daysElapsed: number;
  progressPct: number;
  dailyTarget: number | null;
  adaptiveDailyDeficit: number;
  isTooAggressive: boolean;
  isUnrealistic: boolean;
  weekData: WeekDay[];
  weekCalories: number;
  weekTarget: number;
  weekSurplus: number;
  projectedWeight: number;
  tdee: number | null;
}

interface ProfileData {
  weight: number | null;
  height: number | null;
  age: number | null;
  sex: string | null;
  targetWeight: number | null;
  weightDeadline: string | null;
  weightStart: number | null;
  tdee: number | null;
}

export function CalorieGoalScreen() {
  const { user, setScreen } = useAppStore();
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTargetWeight, setFormTargetWeight] = useState("");
  const [formDeadline, setFormDeadline] = useState("");

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/calorie-goal?userId=${user.id}`);
      const data = await res.json();
      setGoal(data.goal);
      setProfile(data.profile);
      if (!data.goal) setShowForm(true);
      if (data.profile?.targetWeight) setFormTargetWeight(String(data.profile.targetWeight));
      if (data.profile?.weightDeadline) {
        setFormDeadline(new Date(data.profile.weightDeadline).toISOString().split("T")[0]);
      }
    } catch {
      showErrorToast("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id || !formTargetWeight || !formDeadline) {
      showErrorToast("Заполни все поля");
      return;
    }
    const tw = parseFloat(formTargetWeight);
    if (isNaN(tw) || tw <= 0) {
      showErrorToast("Некорректный вес");
      return;
    }
    if (new Date(formDeadline) <= new Date()) {
      showErrorToast("Дедлайн должен быть в будущем");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/calorie-goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, targetWeight: tw, deadline: formDeadline }),
      });
      if (!res.ok) {
        const err = await res.json();
        showErrorToast(err.error || "Ошибка");
        return;
      }
      showSuccessToast("Цель сохранена!");
      setShowForm(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await fetch("/api/calorie-goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, clearGoal: true }),
      });
      showSuccessToast("Цель удалена");
      setGoal(null);
      setShowForm(true);
    } finally {
      setSaving(false);
    }
  };

  const weekDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const getTodayCalories = () => {
    if (!goal) return null;
    const today = new Date().toISOString().split("T")[0];
    return goal.weekData.find((d) => d.date === today)?.calories ?? null;
  };

  const todayCalories = getTodayCalories();
  const todayTarget = goal?.dailyTarget ?? null;
  const todayRemaining = todayTarget && todayCalories !== null ? todayTarget - todayCalories : null;

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => setScreen("profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Цель по калоражу</h1>
          <p className="text-muted-foreground text-sm">Адаптивный план питания</p>
        </div>
        {goal && (
          <Button variant="ghost" size="icon" onClick={() => setShowForm(!showForm)}>
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {/* Setup form */}
      {!loading && (showForm || !goal) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="text-primary h-5 w-5" />
              {goal ? "Изменить цель" : "Поставить цель"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile && !profile.height && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
                ⚠️ Для точного расчёта TDEE заполни рост, возраст и пол в профиле
              </div>
            )}
            <div className="space-y-2">
              <Label>Целевой вес (кг)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder={profile?.weight ? `Сейчас ${profile.weight} кг` : "Например 72"}
                value={formTargetWeight}
                onChange={(e) => setFormTargetWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата достижения</Label>
              <Input
                type="date"
                value={formDeadline}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                onChange={(e) => setFormDeadline(e.target.value)}
              />
            </div>

            {/* Preview calculation */}
            {formTargetWeight &&
              formDeadline &&
              profile?.weight &&
              profile?.tdee &&
              (() => {
                const tw = parseFloat(formTargetWeight);
                const days = Math.round((new Date(formDeadline).getTime() - Date.now()) / 86400000);
                const deficit = ((profile.weight - tw) * 7700) / Math.max(1, days);
                const daily = Math.round(profile.tdee - deficit);
                const isAgg = deficit > 1000;
                return (
                  <div
                    className={`space-y-1 rounded-lg border p-3 text-sm ${isAgg ? "border-red-500/20 bg-red-500/10" : "border-emerald-500/20 bg-emerald-500/10"}`}
                  >
                    <div className="font-medium">
                      {isAgg ? "⚠️ Слишком агрессивно" : "✅ Реалистичный план"}
                    </div>
                    <div className="text-muted-foreground">
                      TDEE: {profile.tdee} ккал · Дефицит: {Math.round(deficit)} ккал/день
                    </div>
                    <div className="text-lg font-semibold">{daily > 0 ? daily : "—"} ккал/день</div>
                    {isAgg && (
                      <div className="text-xs text-red-400">
                        Максимальный безопасный дефицит — 1000 ккал/день. Попробуй сдвинуть дедлайн.
                      </div>
                    )}
                  </div>
                );
              })()}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Сохраняю..." : "Сохранить цель"}
              </Button>
              {goal && (
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Отмена
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal overview */}
      {!loading && goal && !showForm && (
        <>
          {/* Warnings */}
          {goal.isUnrealistic && (
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div className="text-sm">
                  <div className="font-medium text-red-400">Слишком быстрый темп</div>
                  <div className="text-muted-foreground">
                    Требуемый дефицит {goal.adaptiveDailyDeficit} ккал/день — более 1 кг в неделю.
                    Рекомендуем скорректировать цель.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {goal.isTooAggressive && !goal.isUnrealistic && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                <div className="text-sm">
                  <div className="font-medium text-amber-400">Агрессивный план</div>
                  <div className="text-muted-foreground">
                    Дефицит {goal.adaptiveDailyDeficit} ккал/день. Следи за самочувствием.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weight progress */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Прогресс к цели</span>
                <Badge variant="outline">{goal.daysLeft} дн. осталось</Badge>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{goal.startWeight} кг</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary">{goal.targetWeight} кг</span>
              </div>
              <Progress value={goal.progressPct} className="h-3" />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>
                  Сейчас: <strong className="text-foreground">{goal.currentWeight} кг</strong>
                </span>
                <span>{goal.progressPct}% выполнено</span>
              </div>
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>{goal.startDate}</span>
                <span>{goal.deadline}</span>
              </div>
            </CardContent>
          </Card>

          {/* Today's target */}
          <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-br">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Flame className="text-primary h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-muted-foreground text-sm">Дневная цель (адаптивная)</div>
                  <div className="text-3xl font-bold">
                    {goal.dailyTarget ?? "—"}{" "}
                    <span className="text-muted-foreground text-base font-normal">ккал</span>
                  </div>
                  {goal.tdee && (
                    <div className="text-muted-foreground text-xs">
                      TDEE {goal.tdee} − дефицит {goal.adaptiveDailyDeficit}
                    </div>
                  )}
                </div>
              </div>

              {todayCalories !== null && todayTarget && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Съедено сегодня</span>
                    <span
                      className={todayCalories > todayTarget ? "text-red-400" : "text-emerald-400"}
                    >
                      {todayCalories} / {todayTarget} ккал
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, (todayCalories / todayTarget) * 100)}
                    className="h-2"
                  />
                  {todayRemaining !== null && (
                    <div className="text-center text-xs">
                      {todayRemaining > 0 ? (
                        <span className="text-emerald-400">✓ Ещё можно {todayRemaining} ккал</span>
                      ) : (
                        <span className="text-red-400">
                          ⚠ Превышение на {Math.abs(todayRemaining)} ккал
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* This week */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Эта неделя</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    goal.weekSurplus > 0
                      ? "border-red-500/40 text-red-400"
                      : "border-emerald-500/40 text-emerald-400"
                  }
                >
                  {goal.weekSurplus > 0 ? (
                    <>
                      <TrendingUp className="mr-1 h-3 w-3" />+{goal.weekSurplus} ккал
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-1 h-3 w-3" />
                      {goal.weekSurplus} ккал
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 7-day bars */}
              <div className="grid grid-cols-7 gap-1">
                {goal.weekData.map((day, i) => {
                  const pct =
                    day.calories !== null && day.target
                      ? Math.min(120, (day.calories / day.target) * 100)
                      : 0;
                  const isOver =
                    day.calories !== null && day.target ? day.calories > day.target : false;
                  const isToday = day.date === new Date().toISOString().split("T")[0];
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1">
                      <div className="text-muted-foreground text-[10px]">
                        {
                          weekDayLabels[
                            new Date(day.date).getDay() === 0 ? 6 : new Date(day.date).getDay() - 1
                          ]
                        }
                      </div>
                      <div className="bg-muted/30 relative flex h-16 w-full items-end overflow-hidden rounded-md">
                        {day.calories !== null && (
                          <div
                            className={`w-full rounded-b-md transition-all ${isOver ? "bg-red-500/70" : "bg-primary/60"}`}
                            style={{ height: `${Math.min(100, pct)}%` }}
                          />
                        )}
                        {/* Target line */}
                        <div className="absolute bottom-[83%] h-px w-full bg-white/30" />
                      </div>
                      <div
                        className={`text-[9px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}
                      >
                        {day.calories !== null ? `${Math.round(day.calories / 100) / 10}k` : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-muted-foreground flex justify-between text-xs">
                <span>
                  Съедено: <strong className="text-foreground">{goal.weekCalories}</strong> ккал
                </span>
                <span>
                  Цель: <strong className="text-foreground">{goal.weekTarget}</strong> ккал
                </span>
              </div>

              {/* Recovery hint */}
              {goal.weekSurplus > 500 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                  <div className="font-medium text-amber-400">Можно поджаться</div>
                  <div className="text-muted-foreground">
                    За неделю перебор {goal.weekSurplus} ккал. Завтра цель автоматически
                    скорректирована. Новый дневной таргет: <strong>{goal.dailyTarget}</strong> ккал.
                  </div>
                </div>
              )}
              {goal.weekSurplus < -500 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
                  <div className="font-medium text-emerald-400">Отличная неделя!</div>
                  <div className="text-muted-foreground">
                    Дефицит {Math.abs(goal.weekSurplus)} ккал за неделю. Ты на верном пути!
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projection */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-muted-foreground text-sm">Прогноз к {goal.deadline}</div>
                  <div className="mt-1 text-2xl font-bold">
                    {goal.projectedWeight} кг
                    <span
                      className={`ml-2 text-sm font-normal ${goal.projectedWeight <= goal.targetWeight ? "text-emerald-400" : "text-amber-400"}`}
                    >
                      {goal.projectedWeight <= goal.targetWeight ? (
                        <>
                          <CheckCircle2 className="mr-1 inline h-4 w-4" />
                          Цель достижима
                        </>
                      ) : (
                        <>
                          +{Math.round((goal.projectedWeight - goal.targetWeight) * 10) / 10} кг от
                          цели
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    На основе среднего потребления за неделю
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clear goal */}
          <Button
            variant="ghost"
            className="text-muted-foreground text-sm"
            onClick={handleClear}
            disabled={saving}
          >
            Удалить цель
          </Button>
        </>
      )}
    </div>
  );
}
