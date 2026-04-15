"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/DatePicker";
import {
  Droplets,
  Apple,
  CheckCircle2,
  Circle,
  Pill,
  Heart,
  Zap,
  AlertTriangle,
  Calendar,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  Share2,
  X,
} from "lucide-react";

interface CheckinData {
  morning: {
    done: boolean;
    energy: number | null;
    focusWord: string | null;
    tasks: (string | null)[];
    intention: string | null;
  };
  evening: {
    done: boolean;
    dayRating: number | null;
    win: string | null;
    tasksDone: boolean[];
  };
}

interface DailySummaryData {
  date: string;
  checkin?: CheckinData;
  water: {
    current: number;
    target: number;
    percentage: number;
  };
  food: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    qualityBreakdown: {
      good: number;
      neutral: number;
      bad: number;
    };
    entriesCount: number;
    firstMeal: string | null;
    lastMeal: string | null;
    eatingWindowHours: number | null;
    avgCalories7d: number | null;
  };
  rituals: {
    completed: number;
    total: number;
    percentage: number;
  };
  state: {
    mood: number | null;
    energy: number | null;
    sleepHours: number | null;
  };
  supplements: {
    checked: number;
    total: number;
    percentage: number;
  };
  flags: {
    isOvereating: boolean;
    isLowEnergy: boolean;
    isBadMood: boolean;
    isRitualsFailed: boolean;
    isDehydrated: boolean;
    hasNoData: boolean;
  };
}

interface NewAchievement {
  code: string;
  label: string;
  emoji: string;
  desc: string;
}

export function DailySummaryScreen() {
  const { user, profile, selectedDate, setScreen } = useAppStore();
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAte, setMarkingAte] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([]);
  const [shareClicked, setShareClicked] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/daily-summary?userId=${user.id}&date=${selectedDate}`);
        if (!response.ok) throw new Error("Failed to load summary");
        const data = await response.json();
        if (data.success) {
          setSummary(data.summary);
          // Check achievements for today only (not historical dates)
          const todayStr = new Date().toISOString().split("T")[0];
          if (selectedDate === todayStr) {
            fetch("/api/achievements/check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id }),
            })
              .then((r) => r.json())
              .then((result) => {
                if (result.newAchievements?.length > 0) {
                  setNewAchievements(result.newAchievements);
                }
              })
              .catch(() => {
                /* non-critical */
              });
          }
        }
      } catch (err) {
        console.error("Failed to load daily summary:", err);
        setError("Не удалось загрузить сводку");
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [user?.id, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen("home")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Дневная сводка</h1>
        </div>
        <DatePicker />
        {/* Loading skeleton */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/50 animate-pulse backdrop-blur">
              <CardContent className="pt-4">
                <div className="bg-muted mb-2 h-4 w-1/2 rounded" />
                <div className="bg-muted h-6 w-2/3 rounded" />
              </CardContent>
            </Card>
            <Card className="bg-card/50 animate-pulse backdrop-blur">
              <CardContent className="pt-4">
                <div className="bg-muted mb-2 h-4 w-1/2 rounded" />
                <div className="bg-muted h-6 w-2/3 rounded" />
              </CardContent>
            </Card>
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 animate-pulse backdrop-blur">
              <CardContent className="pt-4">
                <div className="bg-muted mb-3 h-4 w-1/3 rounded" />
                <div className="bg-muted h-8 w-full rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summary || error) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen("home")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Дневная сводка</h1>
        </div>
        <DatePicker />
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6 text-center">
            {error ? (
              <>
                <p className="mb-4 text-red-400">{error}</p>
                <Button onClick={() => window.location.reload()}>Повторить</Button>
              </>
            ) : (
              <>
                <Calendar className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
                <p className="text-muted-foreground">Нет данных за этот день</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFlags = Object.entries(summary.flags).some(
    ([key, value]) => key !== "hasNoData" && value
  );

  // Day score (0–100)
  const dayScore = (() => {
    let score = 0;
    let weight = 0;

    // Rituals (25 pts)
    if (summary.rituals.total > 0) {
      score += (summary.rituals.completed / summary.rituals.total) * 25;
      weight += 25;
    }

    // Water (20 pts)
    if (summary.water.target > 0) {
      score += Math.min(summary.water.percentage / 100, 1) * 20;
      weight += 20;
    }

    // Mood (20 pts)
    const mood = summary.state.mood ?? summary.checkin?.evening?.dayRating ?? null;
    if (mood !== null) {
      score += (mood / 10) * 20;
      weight += 20;
    }

    // Energy (15 pts)
    const energy = summary.state.energy ?? summary.checkin?.morning?.energy ?? null;
    if (energy !== null) {
      score += (energy / 10) * 15;
      weight += 15;
    }

    // Checkins (10 pts each)
    if (summary.checkin?.morning?.done) {
      score += 10;
      weight += 10;
    }
    if (summary.checkin?.evening?.done) {
      score += 10;
      weight += 10;
    }

    return weight > 0 ? Math.round((score / weight) * 100) : null;
  })();

  const scoreColor =
    dayScore === null
      ? "text-muted-foreground"
      : dayScore >= 75
        ? "text-emerald-400"
        : dayScore >= 50
          ? "text-yellow-400"
          : "text-red-400";

  const scoreLabel =
    dayScore === null
      ? "Нет данных"
      : dayScore >= 80
        ? "Отличный день!"
        : dayScore >= 60
          ? "Хороший день"
          : dayScore >= 40
            ? "Средний день"
            : "Сложный день";

  const handleShare = async () => {
    if (!summary || dayScore === null) return;
    const waterPct = summary.water.percentage;
    const cals = summary.food.calories;
    const ritDone = summary.rituals.completed;
    const ritTotal = summary.rituals.total;
    const parts: string[] = [];
    if (waterPct > 0) parts.push(`💧${waterPct}%`);
    if (cals > 0) parts.push(`🍽️${cals}ккал`);
    if (ritTotal > 0) parts.push(`✅${ritDone}/${ritTotal} ритуалов`);
    const shareText = `📊 Мой день: ${dayScore}/100 — ${scoreLabel} ${parts.join(" ")}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setShareClicked(true);
      setTimeout(() => setShareClicked(false), 2000);
    } catch {
      window.open(`tg://msg?text=${encodeURIComponent(shareText)}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Achievement popup */}
      {newAchievements.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border-border animate-in fade-in zoom-in w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
            <button
              className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
              onClick={() => setNewAchievements([])}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 text-center">
              <p className="mb-2 text-4xl">{newAchievements[0].emoji}</p>
              <p className="text-lg font-bold">Новое достижение!</p>
            </div>
            <div className="space-y-3">
              {newAchievements.map((a) => (
                <div
                  key={a.code}
                  className="bg-primary/10 border-primary/30 rounded-xl border p-3 text-center"
                >
                  <p className="text-primary font-semibold">
                    {a.emoji} {a.label}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">{a.desc}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" onClick={() => setNewAchievements([])}>
              Отлично!
            </Button>
          </div>
        </div>
      )}

      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setScreen("home")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Дневная сводка</h1>
        {dayScore !== null && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleShare}
              title="Поделиться результатом"
            >
              {shareClicked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${scoreColor}`}>{dayScore}</span>
              <span className="text-muted-foreground text-xs">/100</span>
            </div>
          </div>
        )}
      </div>

      {/* Day score label */}
      {dayScore !== null && (
        <div className={`text-center text-sm font-medium ${scoreColor}`}>
          {shareClicked ? "✅ Скопировано!" : scoreLabel}
        </div>
      )}

      {/* Date Picker */}
      <DatePicker />

      {/* Warning flags */}
      {hasFlags && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Обрати внимание</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.flags.isOvereating && (
                <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400">
                  🍔 Переедание
                </Badge>
              )}
              {summary.flags.isLowEnergy && (
                <Badge
                  variant="outline"
                  className="border-orange-500/30 bg-orange-500/10 text-orange-400"
                >
                  🪫 Низкая энергия
                </Badge>
              )}
              {summary.flags.isBadMood && (
                <Badge
                  variant="outline"
                  className="border-purple-500/30 bg-purple-500/10 text-purple-400"
                >
                  😔 Плохое настроение
                </Badge>
              )}
              {summary.flags.isRitualsFailed && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                >
                  ⚠️ Ритуалы не выполнены
                </Badge>
              )}
              {summary.flags.isDehydrated && (
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                >
                  💧 Обезвоживание
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {summary.flags.hasNoData && (
        <Card className="bg-card/50 border-dashed backdrop-blur">
          <CardContent className="pt-6 text-center">
            <Calendar className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground">Нет данных за этот день</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Начни записывать еду, воду и ритуалы
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${summary.state.sleepHours !== null ? 3 : 2}, 1fr)` }}
      >
        {/* Mood/Energy/Sleep */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-400" />
              <span className="text-muted-foreground text-xs">Настроение</span>
            </div>
            {summary.state.mood !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{summary.state.mood}</span>
                <span className="text-muted-foreground text-xs">/10</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-muted-foreground text-xs">Энергия</span>
            </div>
            {summary.state.energy !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{summary.state.energy}</span>
                <span className="text-muted-foreground text-xs">/10</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </CardContent>
        </Card>

        {summary.state.sleepHours !== null && (
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span className="text-muted-foreground text-xs">Сон</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{summary.state.sleepHours}</span>
                <span className="text-muted-foreground text-xs">ч</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checkin block */}
      {summary.checkin && (summary.checkin.morning.done || summary.checkin.evening.done) && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">📋 Чекапы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Morning */}
            {summary.checkin.morning.done && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/60">🌅 Утро</span>
                  {summary.checkin.morning.energy !== null && (
                    <Badge variant="outline" className="text-[10px]">
                      ⚡ {summary.checkin.morning.energy}/10
                    </Badge>
                  )}
                  {summary.checkin.morning.focusWord && (
                    <Badge variant="outline" className="text-[10px]">
                      {summary.checkin.morning.focusWord}
                    </Badge>
                  )}
                </div>
                {summary.checkin.morning.tasks.some((t) => t) && (
                  <div className="space-y-0.5 pl-1">
                    {summary.checkin.morning.tasks.map((task, i) =>
                      task ? (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                          {summary.checkin?.evening.done ? (
                            summary.checkin.evening.tasksDone[i] ? (
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                            ) : (
                              <Circle className="h-3 w-3 flex-shrink-0 text-white/20" />
                            )
                          ) : (
                            <span className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span
                            className={
                              summary.checkin?.evening.done && summary.checkin.evening.tasksDone[i]
                                ? "text-white/30 line-through"
                                : ""
                            }
                          >
                            {task}
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Evening */}
            {summary.checkin.evening.done && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/60">🌙 Вечер</span>
                  {summary.checkin.evening.dayRating !== null && (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        color:
                          summary.checkin.evening.dayRating >= 7
                            ? "#22c55e"
                            : summary.checkin.evening.dayRating >= 5
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    >
                      {summary.checkin.evening.dayRating}/10
                    </Badge>
                  )}
                </div>
                {summary.checkin.evening.win && (
                  <p className="pl-1 text-xs text-white/50">🏆 {summary.checkin.evening.win}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Water */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-5 w-5 text-cyan-400" />
            Вода
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xl font-bold">{summary.water.current}</span>
            <span className="text-muted-foreground text-sm">/ {summary.water.target} мл</span>
          </div>
          <Progress value={Math.min(summary.water.percentage, 100)} className="mb-1 h-2" />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{summary.water.percentage}%</span>
            {summary.water.percentage >= 100 && (
              <Badge className="bg-emerald-500/20 text-[10px] text-emerald-400">Цель!</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Food */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="h-5 w-5 text-green-400" />
              Еда
            </CardTitle>
            {summary.food.entriesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.food.entriesCount} записей
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {summary.food.entriesCount > 0 ? (
            <>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{summary.food.calories}</span>
                <span className="text-muted-foreground text-sm">ккал</span>
              </div>

              {/* Macros */}
              <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">Белки</div>
                  <div className="font-medium">{summary.food.protein.toFixed(0)}г</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">Жиры</div>
                  <div className="font-medium">{summary.food.fat.toFixed(0)}г</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">Углеводы</div>
                  <div className="font-medium">{summary.food.carbs.toFixed(0)}г</div>
                </div>
              </div>

              {/* Quality breakdown */}
              {(summary.food.qualityBreakdown.good > 0 ||
                summary.food.qualityBreakdown.neutral > 0 ||
                summary.food.qualityBreakdown.bad > 0) && (
                <div className="flex gap-2 text-xs">
                  {summary.food.qualityBreakdown.good > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      ✓ {summary.food.qualityBreakdown.good} полезно
                    </Badge>
                  )}
                  {summary.food.qualityBreakdown.neutral > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      ~ {summary.food.qualityBreakdown.neutral} норм
                    </Badge>
                  )}
                  {summary.food.qualityBreakdown.bad > 0 && (
                    <Badge className="bg-red-500/20 text-red-400">
                      ✗ {summary.food.qualityBreakdown.bad} вредно
                    </Badge>
                  )}
                </div>
              )}

              {/* Intermittent fasting window */}
              {summary.food.firstMeal &&
                summary.food.lastMeal &&
                summary.food.eatingWindowHours !== null && (
                  <div className="border-border/30 text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
                    <span>⏱ Окно питания</span>
                    <span className="text-foreground font-medium">
                      {summary.food.firstMeal} — {summary.food.lastMeal}
                      <span className="text-muted-foreground ml-1">
                        ({summary.food.eatingWindowHours} ч)
                      </span>
                    </span>
                  </div>
                )}
              {/* 7-day rolling calorie average */}
              {summary.food.avgCalories7d !== null && (
                <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs">
                  <span>∅ Среднее за 7 дней</span>
                  <span
                    className={`font-medium ${
                      summary.food.calories > summary.food.avgCalories7d * 1.2
                        ? "text-red-400"
                        : summary.food.calories < summary.food.avgCalories7d * 0.8
                          ? "text-yellow-400"
                          : "text-foreground"
                    }`}
                  >
                    {summary.food.avgCalories7d} ккал
                  </span>
                </div>
              )}
              {/* TDEE recommendation (5.8) */}
              {(() => {
                const w = profile?.weight;
                const h = profile?.height;
                const age = profile?.age;
                if (!w || !h || !age) return null;
                // Harris-Benedict BMR (male, default) * moderate activity (1.55)
                const bmr = 10 * w + 6.25 * h - 5 * age + 5;
                const tdee = Math.round(bmr * 1.55);
                const targetW = profile?.targetWeight;
                const goal = targetW && targetW < w ? tdee - 300 : tdee;
                const diff = summary.food.calories - goal;
                return (
                  <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs">
                    <span>🎯 Рекомендовано</span>
                    <span
                      className={`font-medium ${
                        diff > 200
                          ? "text-red-400"
                          : diff < -300
                            ? "text-yellow-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {goal} ккал ({diff > 0 ? "+" : ""}
                      {diff})
                    </span>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-muted-foreground text-sm">Нет записей о еде</p>
              <button
                disabled={markingAte}
                onClick={async () => {
                  if (!user?.id) return;
                  setMarkingAte(true);
                  try {
                    await fetch("/api/food", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user.id,
                        name: "Ел сегодня",
                        mealType: "snack",
                        quality: "neutral",
                        date: selectedDate,
                      }),
                    });
                    setSummary((prev) =>
                      prev
                        ? {
                            ...prev,
                            food: { ...prev.food, entriesCount: 1 },
                          }
                        : prev
                    );
                  } finally {
                    setMarkingAte(false);
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/15 disabled:opacity-50"
              >
                🍽️ {markingAte ? "Записываю..." : "Я ел сегодня"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Food slip reframe + smart swaps (5.6 + 5.2) */}
      {summary.food.qualityBreakdown.bad > 2 && (
        <Card className="border border-orange-500/20 bg-orange-500/5">
          <CardContent className="space-y-3 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="mb-1 text-sm font-medium text-orange-300">Срыв — не катастрофа</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Один плохой день не ломает прогресс. Следующий приём пищи — чистый лист. Пей воду,
                  подвигайся 10 минут — это перезапустит метаболизм.
                </p>
              </div>
            </div>
            <div className="border-t border-orange-500/10 pt-3">
              <p className="mb-2 text-xs font-medium text-orange-300/80">
                💡 Умные замены на следующий раз:
              </p>
              <div className="space-y-1.5">
                {[
                  { bad: "Чипсы / сухарики", good: "Орехи или морковь с хумусом" },
                  { bad: "Сладкая газировка", good: "Вода с лимоном или зелёный чай" },
                  { bad: "Майонез", good: "Авокадо или греческий йогурт" },
                  { bad: "Белый хлеб", good: "Цельнозерновой или бездрожжевой" },
                  { bad: "Фаст-фуд", good: "Куриная грудка + овощи за 15 минут" },
                  { bad: "Молочный шоколад", good: "Горький 70%+ или финики" },
                ]
                  .slice(0, 3)
                  .map((swap, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-red-400/70 line-through">{swap.bad}</span>
                      <span className="text-white/30">→</span>
                      <span className="text-emerald-400/80">{swap.good}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rituals */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            Ритуалы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.rituals.total > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {summary.rituals.completed} / {summary.rituals.total}
                </span>
                <span className="text-muted-foreground text-sm">{summary.rituals.percentage}%</span>
              </div>
              <Progress value={summary.rituals.percentage} className="h-2" />
              {summary.rituals.percentage === 100 && (
                <div className="mt-2 text-center">
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    Все ритуалы выполнены! 🎉
                  </Badge>
                </div>
              )}
              {summary.flags.isRitualsFailed && summary.rituals.total > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/15 bg-yellow-500/5 p-2">
                  <span className="text-base">🔄</span>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Сегодня не лучший день для ритуалов. Выбери 1 самый важный и сделай только его —
                    это лучше нуля.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-2 text-center">
              <p className="text-muted-foreground text-sm">Нет активных ритуалов на этот день</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplements */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-5 w-5 text-blue-400" />
            БАДы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.supplements.total > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {summary.supplements.checked} / {summary.supplements.total}
                </span>
                <span className="text-muted-foreground text-sm">
                  {summary.supplements.percentage}%
                </span>
              </div>
              <Progress value={summary.supplements.percentage} className="h-2" />
            </>
          ) : (
            <div className="py-2 text-center">
              <p className="text-muted-foreground text-sm">Нет активных БАДов на этот день</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="w-full" onClick={() => setScreen("health")}>
          <Apple className="mr-2 h-4 w-4" />
          Здоровье
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setScreen("rituals")}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Ритуалы
        </Button>
      </div>
    </div>
  );
}
