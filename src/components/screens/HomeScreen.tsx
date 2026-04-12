"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore, Screen } from "@/lib/store";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Trophy,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Droplets,
  Apple,
  Pill,
  Heart,
  Zap,
  ChevronLeft,
  Scale,
  Target,
  BarChart3,
  List,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { DatePicker, DateBadge } from "@/components/DatePicker";
import { WellbeingWidget } from "@/components/wellbeing";
import { EmotionWidget } from "@/components/EmotionWidget";
import { FleetingThoughtsWidget } from "@/components/FleetingThoughtsWidget";
import { WeightHistoryModal } from "@/components/weight/WeightHistoryModal";
import { WeightRecordsModal } from "@/components/weight/WeightRecordsModal";
import { WeightGoalModal } from "@/components/weight/WeightGoalModal";

// ─── Progressive onboarding config (7.1) ────────────────────────────────────
// Each widget unlocks when user.day >= unlockDay
const ONBOARDING_UNLOCKS: Array<{ id: string; unlockDay: number }> = [
  { id: "emotion", unlockDay: 8 },
  { id: "fleeting", unlockDay: 8 },
  { id: "weekly_leak_focus", unlockDay: 8 },
  { id: "weekly_report", unlockDay: 8 },
  { id: "monthly_report", unlockDay: 8 },
  { id: "finances_shortcut", unlockDay: 15 },
  { id: "buddy_shortcut", unlockDay: 15 },
];

function isUnlocked(id: string, userDay: number): boolean {
  const config = ONBOARDING_UNLOCKS.find((u) => u.id === id);
  return config ? userDay >= config.unlockDay : true;
}

interface DailySummary {
  water: { current: number; target: number; percentage: number };
  food: {
    calories: number;
    entriesCount: number;
    qualityBreakdown: { good: number; neutral: number; bad: number };
    firstMeal: string | null;
    lastMeal: string | null;
    eatingWindowHours: number | null;
    avgCalories7d: number | null;
  };
  rituals: { completed: number; total: number; percentage: number };
  state: { mood: number | null; energy: number | null };
  supplements: { checked: number; total: number; percentage: number };
  flags: {
    isOvereating: boolean;
    isLowEnergy: boolean;
    isBadMood: boolean;
    isRitualsFailed: boolean;
    isDehydrated: boolean;
    hasNoData: boolean;
  };
}

export function HomeScreen() {
  const {
    user,
    globalState,
    updateGlobalState,
    updateProgress,
    isDemoMode,
    selectedDate,
    setScreen,
    setSelectedContentId,
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [moodValue, setMoodValue] = useState(globalState?.mood || 5);
  const [energyValue, setEnergyValue] = useState(globalState?.energy || 5);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Check-in status for today
  const [checkinStatus, setCheckinStatus] = useState<{
    morningDone: boolean;
    eveningDone: boolean;
    morningEnergy?: number;
    morningFocus?: string;
    eveningRating?: number;
    eveningWin?: string;
    earlyBird?: boolean;
  }>({ morningDone: false, eveningDone: false });

  // Weight tracking state
  const [weightValue, setWeightValue] = useState("");
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightData, setWeightData] = useState<{
    todayAvg: number | null;
    changeWeek: number | null;
    currentWeight: number | null;
    targetWeight: number | null;
    toGoal: number | null;
  } | null>(null);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showWeightRecords, setShowWeightRecords] = useState(false);
  const [showWeightGoal, setShowWeightGoal] = useState(false);
  const [weeklyLeaksCount, setWeeklyLeaksCount] = useState<number | null>(null);
  const [topWeeklyLeak, setTopWeeklyLeak] = useState<{
    message: string;
    emoji: string;
    severity: string;
  } | null>(null);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<{
    leakType: string;
    analysis: {
      cause: string;
      solutions: { text: string; deadline: string; priority: string }[];
      urgency: string;
    };
    provider: string | null;
    updatedAt: string;
  } | null>(null);
  const [dailyTip, setDailyTip] = useState<{
    tip: string;
    provider: string;
    cached: boolean;
  } | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<
    Array<{
      id: string;
      name: string;
      progressPercentage: number;
      currentStreak: number;
      type: string;
    }>
  >([]);

  // Days with app (since account creation — approximated by streak + day)
  const daysWithApp = user?.day || 1;

  // Load today's check-in status
  useEffect(() => {
    const loadCheckin = async () => {
      if (!user?.id) return;
      try {
        const today = selectedDate;
        const res = await fetch(`/api/checkin?userId=${user.id}&date=${today}`);
        const data = await res.json();
        if (data.success) {
          const morningHour = data.morning?.createdAt
            ? new Date(data.morning.createdAt).getHours()
            : null;
          setCheckinStatus({
            morningDone: !!data.morning,
            eveningDone: !!data.evening,
            morningEnergy: data.morning?.energy,
            morningFocus: data.morning?.focusWord,
            eveningRating: data.evening?.dayRating,
            eveningWin: data.evening?.win,
            earlyBird: morningHour !== null && morningHour < 9,
          });
        }
      } catch {
        // Silent fail
      }
    };
    loadCheckin();
  }, [user?.id, selectedDate]);

  // Load daily summary
  useEffect(() => {
    const loadSummary = async () => {
      if (!user?.id) return;
      setSummaryLoading(true);
      try {
        const response = await fetch(`/api/daily-summary?userId=${user.id}&date=${selectedDate}`);
        const data = await response.json();
        if (data.success) {
          setDailySummary(data.summary);
        }
      } catch (error) {
        console.error("Failed to load daily summary:", error);
      } finally {
        setSummaryLoading(false);
      }
    };
    loadSummary();
  }, [user?.id, selectedDate]);

  // Load settings (hiddenWidgets)
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/settings?userId=${user.id}`);
        const data = await res.json();
        if (data.success && data.settings?.hiddenWidgets) {
          setHiddenWidgets(data.settings.hiddenWidgets as string[]);
        }
      } catch {
        // non-critical
      }
    };
    loadSettings();
  }, [user?.id]);

  // Load weekly leaks count (background fetch)
  useEffect(() => {
    const loadLeaksCount = async () => {
      if (!user?.id) return;
      try {
        // Get Monday of current week
        const d = new Date();
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        const weekStart = d.toISOString().split("T")[0];
        const res = await fetch(`/api/weekly-report?userId=${user.id}&weekStart=${weekStart}`);
        const data = await res.json();
        if (data.success && data.leakHints) {
          setWeeklyLeaksCount(data.leakHints.length);
          // Store top leak for focus widget (critical first, then warning)
          const sorted = [...data.leakHints].sort(
            (a: { severity: string }, b: { severity: string }) => {
              const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
              return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
            }
          );
          if (sorted.length > 0) setTopWeeklyLeak(sorted[0]);
        }
      } catch {
        // silent — not critical
      }
    };
    loadLeaksCount();
  }, [user?.id]);

  // Load AI recommendation (background, non-critical)
  useEffect(() => {
    const loadAiRec = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/ai/recommendations?userId=${user.id}`);
        const data = (await res.json()) as {
          success: boolean;
          recommendation?: {
            leakType: string;
            analysis: {
              cause: string;
              solutions: { text: string; deadline: string; priority: string }[];
              urgency: string;
            };
            provider: string | null;
            updatedAt: string;
          };
        };
        if (data.success && data.recommendation) {
          setAiRecommendation(data.recommendation);
        }
      } catch {
        // silent — not critical
      }
    };
    loadAiRec();
  }, [user?.id]);

  // Load AI daily tip (background, cached per day)
  useEffect(() => {
    const loadDailyTip = async () => {
      if (!user?.id) return;
      if (hiddenWidgets.includes("daily_tip")) return;
      try {
        const res = await fetch(`/api/ai/daily-tip?userId=${user.id}`);
        if (res.ok) {
          const data = (await res.json()) as { tip: string; provider: string; cached: boolean };
          setDailyTip(data);
        }
      } catch {
        // silent
      }
    };
    loadDailyTip();
  }, [user?.id, hiddenWidgets]);

  // Load active challenges (background, non-critical)
  useEffect(() => {
    if (!user?.id || hiddenWidgets.includes("challenges")) return;
    fetch(`/api/challenges?userId=${user.id}&status=active`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.challenges) setActiveChallenges(d.challenges.slice(0, 2));
      })
      .catch(() => {});
  }, [user?.id, hiddenWidgets]);

  // Load weight data
  useEffect(() => {
    const loadWeight = async () => {
      if (!user?.id) return;
      setWeightLoading(true);
      try {
        const response = await fetch(`/api/weight?userId=${user.id}`);
        const data = await response.json();
        setWeightData({
          todayAvg: data.todayAvg,
          changeWeek: data.changeWeek,
          currentWeight: data.currentWeight,
          targetWeight: data.targetWeight,
          toGoal: data.toGoal,
        });
        if (data.todayAvg) {
          setWeightValue(data.todayAvg.toFixed(1));
        }
      } catch (error) {
        console.error("Failed to load weight:", error);
      } finally {
        setWeightLoading(false);
      }
    };
    loadWeight();
  }, [user?.id]);

  // Save weight
  const handleSaveWeight = async () => {
    if (!user?.id || !weightValue) return;
    setWeightSaving(true);
    try {
      await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          value: parseFloat(weightValue),
        }),
      });
      showSuccessToast("Вес записан");
      // Reload weight data
      const response = await fetch(`/api/weight?userId=${user.id}`);
      const data = await response.json();
      setWeightData({
        todayAvg: data.todayAvg,
        changeWeek: data.changeWeek,
        currentWeight: data.currentWeight,
        targetWeight: data.targetWeight,
        toGoal: data.toGoal,
      });
    } catch (error) {
      showErrorToast(error, "save weight");
    } finally {
      setWeightSaving(false);
    }
  };

  const handleSaveMood = async () => {
    await updateGlobalState(moodValue, energyValue);
    setShowMoodDialog(false);
  };

  // Quick water add (5.7)
  const handleQuickWater = async (addMl: number) => {
    if (!user?.id || !dailySummary) return;
    const newAmount = dailySummary.water.current + addMl;
    // Optimistic update
    setDailySummary((prev) =>
      prev
        ? {
            ...prev,
            water: {
              ...prev.water,
              current: newAmount,
              percentage: Math.round((newAmount / prev.water.target) * 100),
            },
          }
        : prev
    );
    try {
      await fetch("/api/water", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount: newAmount }),
      });
    } catch {
      /* silent */
    }
  };

  // Quick input bar state (7.4)
  const [quickInput, setQuickInput] = useState("");
  const [quickResult, setQuickResult] = useState<string | null>(null);

  const handleQuickInput = async () => {
    const raw = quickInput.trim().toLowerCase();
    if (!raw || !user?.id) return;

    let result: string | null = null;

    // Water: "вода 300", "вода 300мл", "воды 500"
    const waterMatch = raw.match(/^вод[аы]\s*(\d+)/);
    if (waterMatch) {
      const ml = parseInt(waterMatch[1]);
      const current = dailySummary?.water.current ?? 0;
      const newAmount = current + ml;
      try {
        await fetch("/api/water", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, amount: newAmount }),
        });
        setDailySummary((prev) =>
          prev
            ? {
                ...prev,
                water: {
                  ...prev.water,
                  current: newAmount,
                  percentage: Math.round((newAmount / prev.water.target) * 100),
                },
              }
            : prev
        );
        result = `💧 Вода +${ml} мл (${newAmount} мл)`;
      } catch {
        result = "❌ Ошибка";
      }
    }

    // Weight: "вес 74.5", "вес 75кг"
    const weightMatch = raw.match(/^вес\s*([\d.]+)/);
    if (weightMatch) {
      const kg = parseFloat(weightMatch[1]);
      try {
        await fetch("/api/weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, weight: kg }),
        });
        result = `⚖️ Вес: ${kg} кг сохранён`;
      } catch {
        result = "❌ Ошибка";
      }
    }

    // Mood: "настроение 8", "настр 7"
    const moodMatch = raw.match(/^настр\w*\s*(\d+)/);
    if (moodMatch) {
      const val = Math.min(10, Math.max(1, parseInt(moodMatch[1])));
      try {
        await updateGlobalState(val, globalState?.energy ?? 5);
        result = `😊 Настроение: ${val}/10`;
      } catch {
        result = "❌ Ошибка";
      }
    }

    // Energy: "энергия 7", "энерг 8"
    const energyMatch = raw.match(/^энерг\w*\s*(\d+)/);
    if (energyMatch) {
      const val = Math.min(10, Math.max(1, parseInt(energyMatch[1])));
      try {
        await updateGlobalState(globalState?.mood ?? 5, val);
        result = `⚡ Энергия: ${val}/10`;
      } catch {
        result = "❌ Ошибка";
      }
    }

    // Ate: "ел", "поел", "покушал" — simple meal record (5.10)
    if (
      !result &&
      (raw === "ел" || raw === "поел" || raw === "покушал" || raw === "поела" || raw === "ела")
    ) {
      try {
        await fetch("/api/food", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            name: "Приём пищи",
            calories: 0,
            quality: "neutral",
          }),
        });
        result = "🍽️ Приём пищи отмечен";
      } catch {
        result = "❌ Ошибка";
      }
    }

    // Supplements: "бад", "бады", "добавки"
    if (!result && (raw === "бад" || raw === "бады" || raw === "добавки" || raw === "витамины")) {
      setScreen("health" as Screen);
      result = "💊 Открываю раздел БАДов...";
    }

    // Gym: "зал", "тренировка", "gym"
    if (
      !result &&
      (raw === "зал" ||
        raw === "тренировка" ||
        raw === "gym" ||
        raw.startsWith("зал ") ||
        raw.startsWith("трен"))
    ) {
      setScreen("gym" as Screen);
      result = "🏋️ Открываю тренировки...";
    }

    // Rituals: "ритуалы", "привычки"
    if (!result && (raw === "ритуалы" || raw === "привычки" || raw === "ритуал")) {
      setScreen("rituals" as Screen);
      result = "🎯 Открываю ритуалы...";
    }

    // Finance: "расходы", "трата", "финансы"
    if (
      !result &&
      (raw === "расходы" ||
        raw === "финансы" ||
        raw === "деньги" ||
        raw.startsWith("расход") ||
        raw.startsWith("трат"))
    ) {
      setScreen("finance" as Screen);
      result = "💰 Открываю финансы...";
    }

    if (!result)
      result = '🤔 Не понял. Попробуй: "вода 300", "вес 74.5", "настроение 7", "зал", "ел"';

    setQuickResult(result);
    setQuickInput("");
    setTimeout(() => setQuickResult(null), 3000);
  };

  // Get mood color for scale
  const getMoodColor = useCallback((level: number) => {
    const colors = [
      "bg-red-500", // 1
      "bg-red-400", // 2
      "bg-orange-500", // 3
      "bg-orange-400", // 4
      "bg-yellow-400", // 5
      "bg-lime-400", // 6
      "bg-lime-500", // 7
      "bg-green-400", // 8
      "bg-green-500", // 9
      "bg-emerald-400", // 10
    ];
    return colors[level - 1] || "bg-gray-500";
  }, []);

  const hour = new Date().getHours();
  const isMorningTime = hour >= 5 && hour < 13;
  const isEveningTime = hour >= 18;

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header with streak */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            {isMorningTime ? "Доброе утро 🌅" : isEveningTime ? "Добрый вечер 🌙" : "Привет 👋"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {user?.firstName || "Друг"} · {daysWithApp} {pluralDays(daysWithApp)} с приложением
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            {user?.streak || 0}
          </Badge>
          {(() => {
            const usedAt = user?.streakShieldUsedAt ? new Date(user.streakShieldUsedAt) : null;
            const shieldReady = !usedAt || Date.now() - usedAt.getTime() > 7 * 86400000;
            return (user?.streak ?? 0) > 0 ? (
              <Badge
                variant="outline"
                className={`flex items-center gap-1 text-xs ${shieldReady ? "border-emerald-500/40 text-emerald-400" : "text-muted-foreground border-white/10"}`}
                title={
                  shieldReady
                    ? "Щит готов — защитит стрик при пропуске дня"
                    : `Щит перезаряжается до ${new Date(usedAt!.getTime() + 7 * 86400000).toLocaleDateString("ru")}`
                }
              >
                {shieldReady ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldOff className="h-3.5 w-3.5" />
                )}
              </Badge>
            ) : null;
          })()}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {user?.points || 0}
          </Badge>
        </div>
      </div>

      {/* Morning / Evening Check-in block */}
      <CheckinStatusBlock
        morningDone={checkinStatus.morningDone}
        eveningDone={checkinStatus.eveningDone}
        morningEnergy={checkinStatus.morningEnergy}
        morningFocus={checkinStatus.morningFocus}
        eveningRating={checkinStatus.eveningRating}
        eveningWin={checkinStatus.eveningWin}
        earlyBird={checkinStatus.earlyBird}
        isMorningTime={isMorningTime}
        isEveningTime={isEveningTime}
        onOpenDailySummary={() => setScreen("daily-summary")}
      />

      {/* Global State Widget (Mood/Energy Scale) */}
      {!hiddenWidgets.includes("mood") && (
        <Card className="border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Left: Dual vertical scales (mood + energy) */}
              <div className="flex items-center gap-2">
                {/* Mood bar */}
                <div className="flex flex-col items-center">
                  <div className="mb-1 text-[9px] font-medium text-orange-400">ПИК 🔥</div>
                  <div className="relative flex h-36 w-8 flex-col justify-between overflow-hidden rounded-xl border border-white/20 bg-slate-900/60 p-1">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((level) => (
                      <div
                        key={level}
                        className={`mx-0.5 h-2.5 rounded transition-colors ${
                          globalState && level <= globalState.mood
                            ? getMoodColor(globalState.mood)
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[9px]">😊</div>
                </div>

                {/* Energy bar */}
                <div className="flex flex-col items-center">
                  <div className="mb-1 text-[9px] font-medium text-yellow-400">⚡</div>
                  <div className="relative flex h-36 w-8 flex-col justify-between overflow-hidden rounded-xl border border-white/20 bg-slate-900/60 p-1">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((level) => {
                      const energy = globalState?.energy ?? checkinStatus.morningEnergy ?? 0;
                      const filled = energy > 0 && level <= energy;
                      const color =
                        energy >= 7
                          ? "bg-yellow-400"
                          : energy >= 5
                            ? "bg-amber-500"
                            : "bg-orange-700";
                      return (
                        <div
                          key={level}
                          className={`mx-0.5 h-2.5 rounded transition-colors ${filled ? color : "bg-slate-800"}`}
                        />
                      );
                    })}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[9px]">🔋</div>
                </div>
              </div>

              {/* Right: Text and controls */}
              <div className="flex h-36 flex-1 flex-col justify-between">
                <div>
                  <div className="text-muted-foreground mb-1 text-[10px] tracking-wider uppercase">
                    Глобальное состояние
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-3xl font-black text-transparent">
                      {globalState?.mood?.toFixed(1) || "—"}
                    </span>
                    <span className="text-muted-foreground text-sm">/ 10</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-emerald-400">
                    {globalState?.status || "Нажмите обновить"}
                  </div>
                </div>

                <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
                  <span>Вчера: {(globalState?.mood || 5) - (globalState?.trend || 0)}</span>
                  {globalState?.trend !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 ${
                        globalState.trend > 0
                          ? "text-emerald-400"
                          : globalState.trend < 0
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {globalState.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : globalState.trend < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {globalState.trend > 0 ? "+" : ""}
                      {globalState.trend.toFixed(1)}
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="self-start border-0 bg-sky-500/90 text-xs text-white hover:bg-sky-400"
                  onClick={() => {
                    setMoodValue(globalState?.mood || 5);
                    setEnergyValue(globalState?.energy || 5);
                    setShowMoodDialog(true);
                  }}
                >
                  ✏️ Обновить настроение
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wellbeing Widget */}
      {!hiddenWidgets.includes("wellbeing") && (
        <WellbeingWidget mood={globalState?.mood} energy={globalState?.energy} />
      )}

      {/* Emotion Tracker — advanced, unlocks day 8 */}
      {user?.id && isUnlocked("emotion", user.day ?? 1) && <EmotionWidget userId={user.id} />}

      {/* Fleeting Thoughts — advanced, unlocks day 8 */}
      {user?.id && isUnlocked("fleeting", user.day ?? 1) && (
        <FleetingThoughtsWidget userId={user.id} />
      )}

      {/* Onboarding teasers */}
      {user && (user.day ?? 1) < 8 && (
        <Card className="border-primary/20 bg-primary/5 border">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔓</span>
                <div>
                  <div className="text-sm font-medium">Аналитика откроется на 8-й день</div>
                  <div className="text-muted-foreground text-xs">
                    Ещё {8 - (user.day ?? 1)} дн. — следи за привычками каждый день
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-primary text-sm font-bold">{user.day ?? 1}/7</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {user && (user.day ?? 1) >= 8 && (user.day ?? 1) < 15 && (
        <Card className="border border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <div className="text-sm font-medium">Финансы и Buddy откроются на 15-й день</div>
                  <div className="text-muted-foreground text-xs">
                    Ещё {15 - (user.day ?? 1)} дн. — продолжай трекить
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-amber-500">{user.day ?? 1}/14</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight Tracking Card */}
      {!hiddenWidgets.includes("weight") && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-5 w-5" />
                Вес сегодня
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {weightLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Input */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="72.5"
                      value={weightValue}
                      onChange={(e) => setWeightValue(e.target.value)}
                      className="h-12 text-center text-2xl font-bold"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                      кг
                    </span>
                  </div>
                  <Button
                    className="bg-primary h-12 px-4"
                    onClick={handleSaveWeight}
                    disabled={!weightValue || weightSaving}
                  >
                    {weightSaving ? "..." : "Записать"}
                  </Button>
                </div>

                {/* Stats */}
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {weightData?.changeWeek !== null && weightData?.changeWeek !== undefined ? (
                      <>
                        {weightData.changeWeek < 0 ? (
                          <TrendingDown className="h-3 w-3 text-emerald-400" />
                        ) : weightData.changeWeek > 0 ? (
                          <TrendingUp className="h-3 w-3 text-red-400" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span
                          className={
                            weightData.changeWeek < 0
                              ? "text-emerald-400"
                              : weightData.changeWeek > 0
                                ? "text-red-400"
                                : ""
                          }
                        >
                          За неделю: {weightData.changeWeek > 0 ? "+" : ""}
                          {weightData.changeWeek.toFixed(1)} кг
                        </span>
                      </>
                    ) : (
                      <span>За неделю: —</span>
                    )}
                  </div>

                  {weightData?.targetWeight && weightData?.toGoal !== null && (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>
                        До цели ({weightData.targetWeight.toFixed(0)} кг):{" "}
                        {weightData.toGoal > 0 ? "-" : "+"}
                        {Math.abs(weightData.toGoal).toFixed(1)} кг
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowWeightHistory(true)}
                  >
                    <BarChart3 className="mr-1 h-3 w-3" />
                    График
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowWeightRecords(true)}
                  >
                    <List className="mr-1 h-3 w-3" />
                    История
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick input bar (7.4) */}
      {!hiddenWidgets.includes("quickinput") && (
        <div className="relative">
          <div className="flex gap-2">
            <Input
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickInput()}
              placeholder='Быстрый ввод: "вода 300", "вес 74.5", "настроение 7"'
              className="bg-card/40 border-border/30 placeholder:text-muted-foreground/40 text-sm"
            />
            <button
              onClick={handleQuickInput}
              disabled={!quickInput.trim()}
              className="bg-primary/70 hover:bg-primary text-primary-foreground rounded-lg px-3 text-sm font-bold transition-all disabled:opacity-30"
            >
              ↵
            </button>
          </div>
          {quickResult && (
            <div className="bg-card border-border/50 absolute top-full right-0 left-0 z-10 mt-1 rounded-lg border px-3 py-2 text-sm shadow-lg">
              {quickResult}
            </div>
          )}
        </div>
      )}

      {/* Daily Summary Block */}
      {!summaryLoading && dailySummary && !dailySummary.flags.hasNoData && (
        <Card
          className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
          onClick={() => setScreen("daily-summary")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Сводка за день</CardTitle>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const showWater = !hiddenWidgets.includes("water");
              const showFood = !hiddenWidgets.includes("food");
              const showRituals = !hiddenWidgets.includes("rituals");
              const showSupplements = !hiddenWidgets.includes("supplements");
              const colCount = [showWater, showFood, showRituals, showSupplements].filter(
                Boolean
              ).length;
              return (
                <>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
                  >
                    {/* Water */}
                    {showWater && (
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <Droplets className="mx-auto mb-1 h-4 w-4 text-cyan-400" />
                        <div className="text-muted-foreground text-xs">Вода</div>
                        <div className="text-sm font-bold">{dailySummary.water.percentage}%</div>
                      </div>
                    )}

                    {/* Food */}
                    {showFood && (
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <Apple className="mx-auto mb-1 h-4 w-4 text-green-400" />
                        <div className="text-muted-foreground text-xs">Еда</div>
                        <div className="text-sm font-bold">{dailySummary.food.calories}</div>
                        {/* Quality bar (5.9) */}
                        {dailySummary.food.entriesCount > 0 && (
                          <div className="mt-1 flex h-1 gap-px overflow-hidden rounded-full">
                            {dailySummary.food.qualityBreakdown.good > 0 && (
                              <div
                                className="bg-emerald-500"
                                style={{ flex: dailySummary.food.qualityBreakdown.good }}
                              />
                            )}
                            {dailySummary.food.qualityBreakdown.neutral > 0 && (
                              <div
                                className="bg-yellow-500"
                                style={{ flex: dailySummary.food.qualityBreakdown.neutral }}
                              />
                            )}
                            {dailySummary.food.qualityBreakdown.bad > 0 && (
                              <div
                                className="bg-red-500"
                                style={{ flex: dailySummary.food.qualityBreakdown.bad }}
                              />
                            )}
                          </div>
                        )}
                        {dailySummary.food.eatingWindowHours !== null && (
                          <div className="text-muted-foreground/70 mt-0.5 text-[9px]">
                            ⏱ {dailySummary.food.eatingWindowHours}ч
                          </div>
                        )}
                        {dailySummary.food.avgCalories7d !== null && (
                          <div className="text-muted-foreground/50 mt-0.5 text-[9px]">
                            ∅{dailySummary.food.avgCalories7d}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rituals */}
                    {showRituals && (
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                        <div className="text-muted-foreground text-xs">Ритуалы</div>
                        <div className="text-sm font-bold">
                          {dailySummary.rituals.completed}/{dailySummary.rituals.total}
                        </div>
                      </div>
                    )}

                    {/* Supplements */}
                    {showSupplements && (
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <Pill className="mx-auto mb-1 h-4 w-4 text-blue-400" />
                        <div className="text-muted-foreground text-xs">БАДы</div>
                        <div className="text-sm font-bold">
                          {dailySummary.supplements.checked}/{dailySummary.supplements.total}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick water add (5.7) */}
                  {showWater && (
                    <div
                      className="border-border/20 mt-3 flex items-center gap-2 border-t pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Droplets className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
                      <span className="text-muted-foreground flex-shrink-0 text-[10px]">
                        {dailySummary.water.current} / {dailySummary.water.target} мл
                      </span>
                      <div className="ml-auto flex gap-1">
                        {[200, 350, 500].map((ml) => (
                          <button
                            key={ml}
                            onClick={() => handleQuickWater(ml)}
                            className="rounded-md bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
                          >
                            +{ml}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Warning flags */}
            {(dailySummary.flags.isOvereating ||
              dailySummary.flags.isLowEnergy ||
              dailySummary.flags.isBadMood ||
              dailySummary.flags.isRitualsFailed ||
              dailySummary.flags.isDehydrated) && (
              <div className="mt-3 flex flex-wrap gap-1">
                {dailySummary.flags.isDehydrated && (
                  <Badge
                    variant="outline"
                    className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400"
                  >
                    💧 Обезвоживание
                  </Badge>
                )}
                {dailySummary.flags.isOvereating && (
                  <Badge
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-[10px] text-red-400"
                  >
                    🍔 Переедание
                  </Badge>
                )}
                {dailySummary.flags.isLowEnergy && (
                  <Badge
                    variant="outline"
                    className="border-orange-500/30 bg-orange-500/10 text-[10px] text-orange-400"
                  >
                    🪫 Низкая энергия
                  </Badge>
                )}
                {dailySummary.flags.isRitualsFailed && (
                  <Badge
                    variant="outline"
                    className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-400"
                  >
                    ⚠️ Ритуалы
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Streak milestone banner (2.8) */}
      {(() => {
        const streak = user?.streak ?? 0;
        const milestones: Record<number, { emoji: string; text: string }> = {
          7: { emoji: "🎯", text: "7 дней подряд! Первая неделя — самая сложная. Ты справился." },
          14: { emoji: "💪", text: "2 недели без пропусков! Привычка начинает формироваться." },
          21: {
            emoji: "🔥",
            text: "21 день — говорят, именно столько нужно для привычки. Ты у цели!",
          },
          30: { emoji: "🏆", text: "Целый месяц! Это уже не случайность — это характер." },
          60: { emoji: "🚀", text: "60 дней подряд — ты в 1% тех, кто не сдаётся." },
          90: {
            emoji: "💎",
            text: "90 дней! 3 месяца трансформации. Кто ты сейчас — лучше, чем 3 месяца назад.",
          },
        };
        const milestone = milestones[streak];
        if (!milestone) return null;
        return (
          <Card className="border border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{milestone.emoji}</span>
                <p className="text-sm leading-snug text-yellow-200/90">{milestone.text}</p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Today's Focus — top weekly leak as actionable hint (unlocks day 8) */}
      {topWeeklyLeak && isUnlocked("weekly_leak_focus", user?.day ?? 1) && (
        <Card
          className="cursor-pointer"
          style={{
            background:
              topWeeklyLeak.severity === "critical"
                ? "rgba(239,68,68,0.08)"
                : topWeeklyLeak.severity === "warning"
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(99,102,241,0.08)",
            border: `1px solid ${
              topWeeklyLeak.severity === "critical"
                ? "rgba(239,68,68,0.2)"
                : topWeeklyLeak.severity === "warning"
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(99,102,241,0.2)"
            }`,
          }}
          onClick={() => setScreen("weekly-report" as Screen)}
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-xl">{topWeeklyLeak.emoji}</span>
              <div className="min-w-0 flex-1">
                <div
                  className="mb-0.5 text-[10px] font-medium tracking-wider uppercase"
                  style={{
                    color:
                      topWeeklyLeak.severity === "critical"
                        ? "#ef4444"
                        : topWeeklyLeak.severity === "warning"
                          ? "#f59e0b"
                          : "#818cf8",
                  }}
                >
                  Фокус недели
                </div>
                <p className="text-sm leading-snug text-white/80">{topWeeklyLeak.message}</p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-white/30" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations widget — unlocks day 8, скрывается через hiddenWidgets */}
      {aiRecommendation &&
        isUnlocked("weekly_report", user?.day ?? 1) &&
        !hiddenWidgets.includes("ai_recommendations") &&
        (() => {
          const rec = aiRecommendation;
          const topSolution = rec.analysis.solutions?.[0];
          const urgencyColor: Record<string, string> = {
            now: "rgba(239,68,68,0.08)",
            thisWeek: "rgba(99,102,241,0.08)",
            thisMonth: "rgba(99,102,241,0.06)",
          };
          const urgencyBorder: Record<string, string> = {
            now: "rgba(239,68,68,0.2)",
            thisWeek: "rgba(99,102,241,0.2)",
            thisMonth: "rgba(99,102,241,0.15)",
          };
          const leakLabels: Record<string, string> = {
            low_energy: "низкая энергия",
            chronic_low_energy: "хронически низкая энергия",
            no_gym: "нет тренировок",
            gym_dropout: "прекратил ходить в зал",
            ritual_consistency: "непоследовательность в ритуалах",
            ritual_erosion: "угасание ритуалов",
            sleep_deficit: "недосып",
            high_stress: "высокий стресс",
            calorie_spikes: "скачки калорий",
            expense_spike: "всплески расходов",
          };
          const leakLabel = leakLabels[rec.leakType] ?? rec.leakType.replace(/_/g, " ");
          return (
            <Card
              style={{
                background: urgencyColor[rec.analysis.urgency] ?? urgencyColor.thisWeek,
                border: `1px solid ${urgencyBorder[rec.analysis.urgency] ?? urgencyBorder.thisWeek}`,
              }}
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-xl">💡</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 text-[10px] font-medium tracking-wider text-indigo-400 uppercase">
                      AI Рекомендации · {leakLabel}
                    </div>
                    {topSolution && (
                      <p className="text-sm leading-snug text-white/80">{topSolution.text}</p>
                    )}
                    {!topSolution && (
                      <p className="text-sm leading-snug text-white/60">{rec.analysis.cause}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setScreen("weekly-report" as Screen)}
                    className="flex flex-shrink-0 items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Все
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* AI Daily Tip widget */}
      {dailyTip && !hiddenWidgets.includes("daily_tip") && (
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-indigo-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-xl">🧠</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs font-medium tracking-wider text-violet-400 uppercase">
                  Совет дня
                </div>
                <p className="text-sm leading-snug text-white/90">{dailyTip.tip}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active challenges widget */}
      {activeChallenges.length > 0 && !hiddenWidgets.includes("challenges") && (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-3 pb-3">
            <div
              className="mb-2 flex cursor-pointer items-center justify-between"
              onClick={() => setScreen("goals" as Screen)}
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium">Активные челленджи</span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
            <div className="space-y-2">
              {activeChallenges.map((c) => (
                <div
                  key={c.id}
                  className="-mx-1 cursor-pointer rounded-md px-1 transition-colors hover:bg-white/5"
                  onClick={() => {
                    setSelectedContentId(c.id);
                    setScreen("challenge-detail" as Screen);
                  }}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="max-w-[70%] truncate text-white/80">{c.name}</span>
                    <span className="font-medium text-white/60">{c.progressPercentage}%</span>
                  </div>
                  <Progress value={c.progressPercentage} className="h-1.5" />
                  {c.currentStreak > 0 && (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-orange-400">
                      <Flame className="h-2.5 w-2.5" />
                      {c.currentStreak} дней подряд
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly report shortcut — unlocks day 8 */}
      {isUnlocked("weekly_report", user?.day ?? 1) && (
        <Card
          className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
          onClick={() => setScreen("weekly-report" as Screen)}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    Лики недели
                    {weeklyLeaksCount !== null && weeklyLeaksCount > 0 && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background:
                            weeklyLeaksCount >= 3 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                          color: weeklyLeaksCount >= 3 ? "#ef4444" : "#f59e0b",
                        }}
                      >
                        {weeklyLeaksCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">Паттерны и корреляции</div>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly report shortcut — unlocks day 8 */}
      {isUnlocked("monthly_report", user?.day ?? 1) && (
        <Card
          className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
          onClick={() => setScreen("monthly-report")}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <div>
                  <div className="text-sm font-medium text-white">Месячный анализ</div>
                  <div className="text-xs text-white/40">Тренды, глубокие лики, советы</div>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance shortcut — unlocks day 15 */}
      {isUnlocked("finances_shortcut", user?.day ?? 1) && (
        <Card
          className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
          onClick={() => setScreen("finance" as Screen)}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <div className="text-sm font-medium text-white">Финансы</div>
                  <div className="text-xs text-white/40">Доходы, расходы, бюджет</div>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buddy shortcut — unlocks day 15 */}
      {isUnlocked("buddy_shortcut", user?.day ?? 1) && (
        <Card
          className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
          onClick={() => setScreen("buddy" as Screen)}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <div>
                  <div className="text-sm font-medium text-white">Buddy Matching</div>
                  <div className="text-xs text-white/40">Найди напарника по профилю</div>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-muted-foreground h-5 w-5" />
              <span className="text-muted-foreground text-sm">Дней подряд</span>
            </div>
            <p className="text-primary mt-1 text-2xl font-bold">{user?.streak || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-muted-foreground h-5 w-5" />
              <span className="text-muted-foreground text-sm">Очки</span>
            </div>
            <p className="text-primary mt-1 text-2xl font-bold">{user?.points || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Demo mode notice */}
      {isDemoMode && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-400">🎮 Демо-режим: данные сохраняются локально.</p>
          </CardContent>
        </Card>
      )}

      {/* Mood Dialog */}
      <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Как ты себя чувствуешь?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Настроение</span>
                <span className="text-2xl font-bold">{moodValue}</span>
              </div>
              <Slider
                value={[moodValue]}
                onValueChange={([v]) => setMoodValue(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>💀 Кризис</span>
                <span>🔥 Пик</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Энергия</span>
                <span className="text-2xl font-bold">{energyValue}</span>
              </div>
              <Slider
                value={[energyValue]}
                onValueChange={([v]) => setEnergyValue(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>🪫 Ноль</span>
                <span>⚡ Полный</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowMoodDialog(false)}>
                Отмена
              </Button>
              <Button className="bg-primary flex-1" onClick={handleSaveMood}>
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight History Modal */}
      <WeightHistoryModal
        open={showWeightHistory}
        onOpenChange={setShowWeightHistory}
        onOpenRecords={() => {
          setShowWeightHistory(false);
          setShowWeightRecords(true);
        }}
        onOpenGoal={() => {
          setShowWeightHistory(false);
          setShowWeightGoal(true);
        }}
      />

      {/* Weight Records Modal */}
      <WeightRecordsModal open={showWeightRecords} onOpenChange={setShowWeightRecords} />

      {/* Weight Goal Modal */}
      <WeightGoalModal
        open={showWeightGoal}
        onOpenChange={setShowWeightGoal}
        currentWeight={weightData?.currentWeight}
        onUpdate={() => {
          // Reload weight data
          if (user?.id) {
            fetch(`/api/weight?userId=${user.id}`)
              .then((res) => res.json())
              .then((data) => {
                setWeightData({
                  todayAvg: data.todayAvg,
                  changeWeek: data.changeWeek,
                  currentWeight: data.currentWeight,
                  targetWeight: data.targetWeight,
                  toGoal: data.toGoal,
                });
              });
          }
        }}
      />
    </div>
  );
}

// ─── Helper: plural days ─────────────────────────────────────────────────────

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

// ─── Energy bar helper ───────────────────────────────────────────────────────

function EnergyBar({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  const pct = (value / 10) * 100;
  const color =
    value >= 8 ? "#22c55e" : value >= 6 ? "#f59e0b" : value >= 4 ? "#f97316" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">
          {emoji} {label}
        </span>
        <span className="font-bold" style={{ color }}>
          {value}/10
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Check-in status block ───────────────────────────────────────────────────

function CheckinStatusBlock({
  morningDone,
  eveningDone,
  morningEnergy,
  morningFocus,
  eveningRating,
  eveningWin,
  isMorningTime,
  isEveningTime,
  onOpenDailySummary,
  earlyBird,
}: {
  morningDone: boolean;
  eveningDone: boolean;
  morningEnergy?: number;
  morningFocus?: string;
  eveningRating?: number;
  eveningWin?: string;
  isMorningTime: boolean;
  isEveningTime: boolean;
  onOpenDailySummary?: () => void;
  earlyBird?: boolean;
}) {
  // Always-visible two-badge status row
  const badgeRow = (
    <div className="mb-3 flex flex-wrap gap-2">
      <button
        onClick={onOpenDailySummary}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          morningDone
            ? "border border-green-500/30 bg-green-500/20 text-green-400"
            : "border border-white/10 bg-white/5 text-white/40"
        }`}
      >
        <span>☀️</span>
        <span>Утро</span>
        <span>{morningDone ? "✅" : "⏳"}</span>
      </button>
      {earlyBird && (
        <span className="flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/15 px-2 py-1.5 text-xs font-medium text-yellow-400">
          ⚡ Ранняя пташка
        </span>
      )}
      <button
        onClick={onOpenDailySummary}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          eveningDone
            ? "border border-amber-500/30 bg-amber-500/20 text-amber-400"
            : "border border-white/10 bg-white/5 text-white/40"
        }`}
      >
        <span>🌙</span>
        <span>Вечер</span>
        <span>{eveningDone ? "✅" : "⏳"}</span>
      </button>
    </div>
  );

  // If both done — show combined summary with bars
  if (morningDone && eveningDone) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        {badgeRow}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-green-400">✓ Оба чекапа выполнены</span>
          {morningFocus && (
            <span className="ml-auto text-xs text-white/40">слово: {morningFocus}</span>
          )}
        </div>
        <div className="space-y-2">
          {morningEnergy && <EnergyBar value={morningEnergy} label="Утренняя энергия" emoji="⚡" />}
          {eveningRating && <EnergyBar value={eveningRating} label="Оценка дня" emoji="🌙" />}
        </div>
        {eveningWin && (
          <div className="mt-2 border-t border-white/10 pt-2 text-xs text-white/60 italic">
            🏆 {eveningWin}
          </div>
        )}
      </div>
    );
  }

  // Morning pending in morning time
  if (!morningDone && isMorningTime) {
    return (
      <div
        className="cursor-default rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        {badgeRow}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Утренний чекап</div>
            <div className="mt-0.5 text-xs text-white/40">
              Появится автоматически · займёт 1 мин
            </div>
          </div>
          <div className="text-2xl">🌅</div>
        </div>
      </div>
    );
  }

  // Evening pending in evening time, morning done
  if (!eveningDone && isEveningTime && morningDone) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.10) 100%)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        {badgeRow}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Вечерний чекап</div>
            <div className="mt-0.5 text-xs text-white/40">Появится автоматически · закрой день</div>
          </div>
          <div className="text-2xl">🌙</div>
        </div>
        {morningEnergy && (
          <div className="mt-2 text-xs text-white/40">
            Утро: ⚡{morningEnergy}/10{morningFocus ? ` · ${morningFocus}` : ""}
          </div>
        )}
      </div>
    );
  }

  // Morning done, not evening time yet
  if (morningDone && !isEveningTime) {
    return (
      <div
        className="rounded-2xl p-3"
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        {badgeRow}
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400">✓ Утро выполнено</span>
          {morningFocus && <span className="text-xs text-white/30">· {morningFocus}</span>}
          <span className="ml-auto text-[10px] text-white/25">вечер после 18:00</span>
        </div>
        {morningEnergy && <EnergyBar value={morningEnergy} label="Утренняя энергия" emoji="⚡" />}
      </div>
    );
  }

  // Default: show just the badge row (e.g. middle of the day, no checkins yet)
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {badgeRow}
    </div>
  );
}
