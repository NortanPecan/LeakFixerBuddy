"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Map,
  BookOpen,
  Flame,
  Trophy,
  ChevronRight,
  CheckCircle2,
  Lock,
  Star,
  Gift,
  Target,
  Zap,
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
} from "lucide-react";

const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_day: "🌱 Первый день",
  week_1: "📅 Неделя пройдена",
  week_2: "💪 Две недели",
  week_3: "🔥 Три недели",
  streak_3: "⚡ 3 дня подряд",
  streak_7: "🏅 7 дней подряд",
  streak_14: "🥇 14 дней подряд",
  streak_30: "💎 30 дней подряд",
  all_tasks: "✅ Все задания дня",
  perfect_week: "⭐ Идеальная неделя",
  journey_complete: "🏆 Journey завершён",
};

interface JourneyTask {
  id: string;
  type: string;
  target: string;
  description: string;
  reward: number;
  autoVerify: boolean;
  count?: number;
  completed: boolean;
  completedAt: string | null;
}

interface JourneyLesson {
  id: string;
  day: number;
  week: number;
  week_name: string | null;
  title: string;
  story: string | null;
  description: string | null;
  tasks: JourneyTask[];
  quote: string | null;
  tip: string | null;
  reward_xp: number;
  unlocks: string[] | null;
  achievement: string | null;
}

interface JourneyProgress {
  id: string;
  currentDay: number;
  goal: string | null;
  startedAt: string;
  completedAt: string | null;
  totalXp: number;
  streak: number;
  progressPercent: number;
  streakMultiplier: number;
  achievements: { code: string }[];
}

const WEEK_NAMES: Record<number, { ru: string; en: string }> = {
  1: { ru: "Пробуждение", en: "Awakening" },
  2: { ru: "Закалка", en: "Tempering" },
  3: { ru: "Восхождение", en: "Ascension" },
  4: { ru: "Мастерство", en: "Mastery" },
};

const GOALS = [
  { id: "fitness", label: "💪 Похудеть / Набрать форму", description: "Акцент: вес, тренировки" },
  { id: "productivity", label: "📈 Стать продуктивнее", description: "Акцент: дела, привычки" },
  { id: "health", label: "🧘 Улучшить здоровье", description: "Акцент: БАДы, вода, сон" },
  { id: "finance", label: "💰 Навести порядок в финансах", description: "Акцент: финансы, цели" },
  { id: "all", label: "🔄 Всё сразу (полный курс)", description: "Все модули равнозначны" },
];

export function JourneyScreen() {
  const { user, setScreen } = useAppStore();
  const [progress, setProgress] = useState<JourneyProgress | null>(null);
  const [currentLesson, setCurrentLesson] = useState<JourneyLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoalSelection, setShowGoalSelection] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  // Load journey progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/journey?userId=${user.id}`);
        const data = await response.json();

        if (data.progress) {
          setProgress(data.progress);
          setCurrentLesson(data.currentLesson);
          if (!data.progress.goal) {
            setShowGoalSelection(true);
          }
        }
      } catch (error) {
        console.error("Failed to load journey progress:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProgress();
  }, [user?.id]);

  // Start journey with goal
  const handleStartJourney = async () => {
    if (!selectedGoal || !user?.id) return;

    try {
      const response = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: selectedGoal, userId: user.id }),
      });

      const data = await response.json();
      if (data.progress) {
        setProgress(data.progress);
        setShowGoalSelection(false);
        showSuccessToast("Путешествие начато!");
      }
    } catch (error) {
      showErrorToast(error, "start journey");
    }
  };

  // Complete a task
  const handleCompleteTask = async (taskId: string, reward: number) => {
    if (!progress || completingTask || !user?.id) return;

    setCompletingTask(taskId);
    try {
      const response = await fetch("/api/journey/task/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: progress.currentDay,
          taskId,
          xpEarned: reward,
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (data.task) {
        // Update lesson tasks
        setCurrentLesson((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, completed: true, completedAt: new Date().toISOString() }
                    : t
                ),
              }
            : null
        );

        // Update progress XP
        setProgress((prev) => (prev ? { ...prev, totalXp: prev.totalXp + reward } : null));

        showSuccessToast(`+${reward} XP`);
      }
    } catch (error) {
      showErrorToast(error, "complete task");
    } finally {
      setCompletingTask(null);
    }
  };

  // Complete day
  const handleCompleteDay = async () => {
    if (!progress || !user?.id) return;

    try {
      const response = await fetch("/api/journey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completeDay: true, userId: user.id }),
      });

      const data = await response.json();
      if (data.progress) {
        setProgress(data.progress);

        // Show achievement if earned
        if (data.achievement) {
          showSuccessToast(`🏆 Достижение: ${data.achievement}`);
        }

        // Load next lesson
        const lessonResponse = await fetch(
          `/api/journey/day/${data.progress.currentDay}?userId=${user.id}`
        );
        const lessonData = await lessonResponse.json();
        setCurrentLesson(lessonData.lesson);
      }
    } catch (error) {
      showErrorToast(error, "complete day");
    }
  };

  // Get day status for map
  const getDayStatus = useCallback(
    (day: number) => {
      if (!progress) return "locked";
      if (day < progress.currentDay) return "completed";
      if (day === progress.currentDay) return "current";
      return "locked";
    },
    [progress]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Goal selection screen
  if (showGoalSelection || !progress) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setScreen("home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">LeakFixer Journey</h1>
        </div>
        <Card className="from-primary/20 to-primary/5 border-primary/30 bg-gradient-to-br">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 text-4xl">🗺️</div>
            <h1 className="mb-2 text-2xl font-bold">LeakFixer Journey</h1>
            <p className="text-muted-foreground">30-дневный курс к лучшей версии себя</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Выбери свою главную цель
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                  selectedGoal === goal.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedGoal(goal.id)}
              >
                <div className="font-medium">{goal.label}</div>
                <div className="text-muted-foreground text-xs">{goal.description}</div>
              </button>
            ))}

            <Button
              className="bg-primary mt-4 w-full"
              disabled={!selectedGoal}
              onClick={handleStartJourney}
            >
              Начать путешествие
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate tasks completion
  const completedTasks = currentLesson?.tasks.filter((t) => t.completed).length || 0;
  const totalTasks = currentLesson?.tasks.length || 0;
  const allTasksCompleted = completedTasks >= totalTasks && totalTasks > 0;

  return (
    <ScrollArea className="h-[calc(100vh-140px)]">
      <div className="flex flex-col gap-4 px-1 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={() => setScreen("home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
              <Map className="text-primary h-5 w-5" />
              Journey
              <span className="text-muted-foreground ml-1 text-sm font-normal">
                день {progress.currentDay}/30
              </span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              {progress.streak}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              {progress.totalXp} XP
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Неделя {Math.ceil(progress.currentDay / 7)}:{" "}
              {WEEK_NAMES[Math.ceil(progress.currentDay / 7)]?.ru || "Мастерство"}
            </span>
            <span className="text-primary font-medium">{progress.progressPercent}%</span>
          </div>
          <Progress value={progress.progressPercent} className="h-3" />
          {progress.streakMultiplier > 1 && (
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <Zap className="h-3 w-3" />x{progress.streakMultiplier} бонус к XP за streak!
            </div>
          )}
        </div>

        {/* Journey Map */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Map className="h-5 w-5" />
              Карта путешествия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                const status = getDayStatus(day);
                const weekNum = Math.ceil(day / 7);
                const isWeekStart = day === 1 || (day - 1) % 7 === 0;

                return (
                  <div
                    key={day}
                    className={`flex aspect-square cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-all ${
                      status === "completed"
                        ? "bg-emerald-500 text-white"
                        : status === "current"
                          ? "bg-primary ring-primary text-white ring-2 ring-offset-2"
                          : "bg-muted text-muted-foreground"
                    } ${isWeekStart ? "col-start-1" : ""} `}
                    title={`День ${day}`}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : status === "locked" ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      day
                    )}
                  </div>
                );
              })}
            </div>

            {/* Week legends */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              {[1, 2, 3, 4].map((week) => (
                <div key={week} className="text-center">
                  <div className="font-medium">{WEEK_NAMES[week]?.ru}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Lesson */}
        {currentLesson && (
          <Card className="border-primary/20 from-card to-primary/5 bg-gradient-to-br">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <BookOpen className="text-primary h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{currentLesson.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">День {currentLesson.day}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  +{currentLesson.reward_xp} XP
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Story */}
              {currentLesson.story && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {currentLesson.story}
                </p>
              )}

              {/* Description (fallback if no story) */}
              {currentLesson.description && !currentLesson.story && (
                <p className="text-muted-foreground text-sm">{currentLesson.description}</p>
              )}

              {/* Tasks */}
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Задания ({completedTasks}/{totalTasks})
                </div>
                {currentLesson.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-3 transition-all ${
                      task.completed
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "bg-card border-border hover:border-primary/50"
                    } `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <div className="border-muted-foreground h-5 w-5 rounded-full border-2" />
                        )}
                        <span
                          className={task.completed ? "text-muted-foreground line-through" : ""}
                        >
                          {task.description}
                        </span>
                      </div>
                      {!task.completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleCompleteTask(task.id, task.reward)}
                          disabled={completingTask === task.id}
                        >
                          +{task.reward} XP
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quote */}
              {currentLesson.quote && (
                <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm italic">
                  {currentLesson.quote}
                </div>
              )}

              {/* Tip */}
              {currentLesson.tip && (
                <div className="bg-primary/10 rounded-lg p-3 text-sm">
                  💡 <span className="font-medium">Совет:</span> {currentLesson.tip}
                </div>
              )}

              {/* Complete Day Button */}
              <Button
                className="bg-primary hover:bg-primary/90 w-full"
                size="lg"
                onClick={handleCompleteDay}
                disabled={!allTasksCompleted}
              >
                {allTasksCompleted ? (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    Завершить день и получить +{currentLesson.reward_xp *
                      progress.streakMultiplier}{" "}
                    XP
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Выполните все задания
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        {progress.achievements.length > 0 && (
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Достижения ({progress.achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {progress.achievements.map((a) => (
                  <Badge
                    key={a.code}
                    variant="outline"
                    className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  >
                    {ACHIEVEMENT_LABELS[a.code] ?? `🏆 ${a.code}`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
