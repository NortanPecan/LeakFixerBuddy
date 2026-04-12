"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Target,
  Star,
  Calendar,
  CheckCircle,
  XCircle,
  Timer,
  Trash2,
  Zap,
  Compass,
  RefreshCw,
  Heart,
  TrendingUp,
  Play,
  Users,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { showSuccessToast, showErrorToast } from "@/lib/network-utils";

// 8 categories with emojis
const CATEGORY_OPTIONS = [
  { value: "health", label: "Здоровье", emoji: "💪" },
  { value: "money", label: "Деньги", emoji: "💰" },
  { value: "projects", label: "Проекты", emoji: "🚀" },
  { value: "relationships", label: "Отношения", emoji: "❤️" },
  { value: "learning", label: "Обучение", emoji: "📚" },
  { value: "lifestyle", label: "Образ жизни", emoji: "🏠" },
  { value: "career", label: "Карьера", emoji: "👔" },
  { value: "general", label: "Общее", emoji: "📦" },
];

// Challenge type config
const TYPE_CONFIG: Record<string, { label: string; icon: typeof Trophy; description: string }> = {
  ritual: {
    label: "На ритуалы",
    icon: Flame,
    description: "Выполняй ритуалы каждый день без пропусков",
  },
  chain: {
    label: "На цепочку",
    icon: Target,
    description: "Завершай шаги в цепочке задач",
  },
  custom: {
    label: "Свободный",
    icon: Star,
    description: "Выполняй действия в выбранной зоне",
  },
};

const STATUS_OPTIONS = [
  {
    value: "planned",
    label: "Запланирован",
    icon: Calendar,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    value: "active",
    label: "Активен",
    icon: Timer,
    color: "bg-primary/20 text-primary border-primary/30",
  },
  {
    value: "completed",
    label: "Выполнен",
    icon: CheckCircle,
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    value: "failed",
    label: "Провален",
    icon: XCircle,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
];

interface TrackerDay {
  date: string;
  value: number | null;
  met: boolean;
}

interface Challenge {
  id: string;
  name: string;
  title?: string;
  description?: string;
  type: string;
  category: string;
  zone: string;
  directionId?: string;
  config: string;
  duration: number;
  progress: number;
  progressPercentage: number;
  daysCompleted: number;
  currentStreak: number;
  startDate: string;
  endDate?: string;
  status: string;
  direction?: { id: string; title: string; color: string };
  linkedRituals?: Array<{ id: string; title: string; category: string }>;
  linkedSkills?: Array<{ id: string; name: string; level: number }>;
  linkedTraits?: Array<{ id: string; name: string; score: number }>;
  trackerDays?: TrackerDay[];
}

interface Buddy {
  id: string; // buddy record id
  partnerId: string; // userId of the partner
  partnerName: string;
  status: string;
}

interface BuddyChallengeInfo {
  id: string;
  status: string;
  inviteeChallengeId: string | null;
  invitee?: { id: string; firstName: string | null; username: string | null };
  inviter?: { id: string; firstName: string | null; username: string | null };
  challenge?: { progressPercentage: number; daysCompleted: number };
}

export function ChallengeDetailScreen() {
  const { selectedContentId, setScreen, user } = useAppStore();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Buddy challenge state
  const [showInvite, setShowInvite] = useState(false);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [buddyChallenge, setBuddyChallenge] = useState<BuddyChallengeInfo | null>(null);
  const [inviting, setInviting] = useState(false);

  const loadChallenge = async () => {
    if (!selectedContentId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/challenges?id=${selectedContentId}`);
      const data = await res.json();
      if (data.success && data.challenge) {
        setChallenge(data.challenge);
      } else {
        setError("Челендж не найден");
      }
    } catch (err) {
      console.error("Failed to load challenge:", err);
      setError("Не удалось загрузить челендж");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenge();
  }, [selectedContentId]);

  // Load buddies + existing buddy challenge when challenge is loaded
  useEffect(() => {
    if (!challenge || !user?.id) return;

    // Load existing buddy challenge for this challenge
    fetch(`/api/buddy-challenges?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.sent) {
          const found = d.sent.find(
            (bc: BuddyChallengeInfo & { challenge: { id: string } }) =>
              bc.challenge?.id === challenge.id
          );
          if (found) setBuddyChallenge(found);
        }
      })
      .catch(() => {});

    // Load accepted buddies for invite dialog
    fetch(`/api/buddies?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        // Combine outgoing + incoming, filter accepted
        const all: Buddy[] = [
          ...(d.outgoing ?? []).filter((b: Buddy) => b.status === "accepted"),
          ...(d.incoming ?? []).filter((b: Buddy) => b.status === "accepted"),
        ];
        setBuddies(all);
      })
      .catch(() => {});
  }, [challenge?.id, user?.id]);

  const handleInviteBuddy = async (partnerId: string) => {
    if (!challenge || !user?.id || inviting) return;
    const buddyUserId = partnerId;
    setInviting(true);
    try {
      const res = await fetch("/api/buddy-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          initiatorId: user.id,
          partnerId: buddyUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "error");
      setBuddyChallenge(data.buddyChallenge);
      setShowInvite(false);
      showSuccessToast("Приглашение отправлено!");
    } catch (err) {
      showErrorToast(err, "отправка приглашения");
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!challenge || !confirm("Отменить челендж?")) return;

    try {
      await fetch(`/api/challenges?id=${challenge.id}`, { method: "DELETE" });
      setScreen("goals");
    } catch (error) {
      console.error("Failed to delete challenge:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!challenge || isUpdating) return;
    setIsUpdating(true);

    try {
      const updateData: Record<string, unknown> = { id: challenge.id, status: newStatus };

      // If starting a planned challenge, reset start date
      if (challenge.status === "planned" && newStatus === "active") {
        updateData.startDate = new Date().toISOString();
      }

      const res = await fetch("/api/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartChallenge = async () => {
    await handleStatusChange("active");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const getDaysRemaining = () => {
    if (!challenge) return 0;
    const start = new Date(challenge.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + challenge.duration);
    const now = new Date();
    const remaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  const getCategoryInfo = (category: string) =>
    CATEGORY_OPTIONS.find((c) => c.value === category) || CATEGORY_OPTIONS[7];

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen("goals")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-40" />
        </div>
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !challenge) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScreen("goals")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Ошибка</h1>
        </div>
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400">{error || "Челендж не найден"}</p>
              <Button size="sm" variant="outline" onClick={loadChallenge}>
                <RefreshCw className="mr-1 h-4 w-4" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.custom;
  const catInfo = getCategoryInfo(challenge.category);
  const TypeIcon = typeConfig.icon;
  const daysRemaining = getDaysRemaining();
  const statusOption =
    STATUS_OPTIONS.find((s) => s.value === challenge.status) || STATUS_OPTIONS[1];

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen("goals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-xl font-bold">{challenge.name}</h1>
      </div>

      {/* Direction link */}
      {challenge.direction && (
        <Card
          className="hover:bg-card/80 cursor-pointer transition-colors"
          style={{ borderLeftWidth: 3, borderLeftColor: challenge.direction.color }}
          onClick={() => setScreen("goals")}
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <Compass className="text-muted-foreground h-4 w-4" />
              <div className="flex-1">
                <div className="text-muted-foreground text-sm">Направление</div>
                <div className="font-medium">{challenge.direction.title}</div>
              </div>
              <ArrowLeft className="text-muted-foreground h-4 w-4 rotate-180" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Challenge Button for Planned */}
      {challenge.status === "planned" && (
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Готов начать?</div>
                <div className="text-muted-foreground text-sm">
                  Челендж стартует с сегодняшнего дня
                </div>
              </div>
              <Button onClick={handleStartChallenge} disabled={isUpdating}>
                <Play className="mr-1 h-4 w-4" /> Начать
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: challenge.direction?.color
                    ? `${challenge.direction.color}20`
                    : "hsl(var(--primary) / 0.2)",
                }}
              >
                <TypeIcon
                  className="h-6 w-6"
                  style={{ color: challenge.direction?.color || "hsl(var(--primary))" }}
                />
              </div>
              <div>
                <div className="font-medium">{typeConfig.label}</div>
                <div className="text-muted-foreground text-sm">
                  {catInfo.emoji} {catInfo.label}
                </div>
              </div>
            </div>

            {/* Status Selector */}
            <Select
              value={challenge.status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        {s.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{challenge.progressPercentage}%</span>
            </div>
            <Progress value={challenge.progressPercentage} className="h-3" />
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {challenge.type === "chain"
                  ? `${challenge.daysCompleted} шагов`
                  : challenge.type === "tracker"
                    ? (() => {
                        try {
                          const cfg = JSON.parse(challenge.config || "{}") as { metric?: string };
                          const units: Record<string, string> = {
                            water_streak: "мл воды",
                            gym_count: "тренировок",
                            ritual_rate: "ритуалов",
                            no_food_bad: "нарушений",
                            sleep_avg: "ч сна",
                            mood_avg: "/10",
                          };
                          const unit = cfg.metric ? (units[cfg.metric] ?? "дней") : "дней";
                          return `${challenge.daysCompleted}/${challenge.duration} ${unit}`;
                        } catch {
                          return `${challenge.daysCompleted}/${challenge.duration} дней`;
                        }
                      })()
                    : `${challenge.daysCompleted}/${challenge.duration} дней`}
              </span>
              {challenge.status === "active" && <span>Осталось {daysRemaining} дней</span>}
            </div>
          </div>

          {/* Streak */}
          {challenge.currentStreak > 0 && challenge.status === "active" && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
              <Flame className="h-5 w-5 text-orange-400" />
              <div>
                <div className="font-medium text-orange-400">
                  {challenge.currentStreak} дней подряд
                </div>
                <div className="text-muted-foreground text-xs">Продолжай в том же духе!</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description / Context */}
      {challenge.description && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Зачем я это делаю</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{challenge.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <div>
              <div className="text-muted-foreground text-sm">Период</div>
              <div className="font-medium">
                {formatDate(challenge.startDate)} —{" "}
                {challenge.endDate ? formatDate(challenge.endDate) : `${challenge.duration} дней`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Zap className="text-muted-foreground h-5 w-5" />
            <div>
              <div className="text-muted-foreground text-sm">Тип</div>
              <div className="font-medium">{typeConfig.description}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Trophy className="text-muted-foreground h-5 w-5" />
            <div>
              <div className="text-muted-foreground text-sm">Длительность</div>
              <div className="font-medium">{challenge.duration} дней</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked entities - what supports this challenge */}
      {challenge.linkedRituals?.length ||
      challenge.linkedSkills?.length ||
      challenge.linkedTraits?.length ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Что помогает достижению
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Linked Rituals */}
            {challenge.linkedRituals && challenge.linkedRituals.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-2 text-xs">Ритуалы</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.linkedRituals.map((r) => (
                    <Badge key={r.id} variant="outline" className="text-xs">
                      <Flame className="mr-1 h-3 w-3" />
                      {r.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Skills */}
            {challenge.linkedSkills && challenge.linkedSkills.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-2 text-xs">Навыки</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.linkedSkills.map((s) => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      {s.name} (Lvl {s.level})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Traits */}
            {challenge.linkedTraits && challenge.linkedTraits.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-2 text-xs">Качества</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.linkedTraits.map((t) => (
                    <Badge key={t.id} variant="outline" className="text-xs">
                      <Heart className="mr-1 h-3 w-3" />
                      {t.name} ({t.score}/10)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* How it works */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <h3 className="mb-2 font-medium">Как это работает</h3>
          {challenge.type === "ritual" && (
            <p className="text-muted-foreground text-sm">
              Выполняй свои ритуалы каждый день. Прогресс считается автоматически на основе
              выполненных ритуалов. Старайся не пропускать дни, чтобы сохранить серию!
            </p>
          )}
          {challenge.type === "chain" && (
            <p className="text-muted-foreground text-sm">
              Завершай задачи в цепочке. Прогресс считается автоматически на основе выполненных
              задач из цепочек. Каждая завершённая задача приближает тебя к цели!
            </p>
          )}
          {challenge.type === "custom" && (
            <p className="text-muted-foreground text-sm">
              Выполняй действия в зоне «{catInfo.label}». Прогресс считается на основе созданных и
              выполненных задач в этой зоне. Установи свою цель и достигай её!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tracker 7-day history */}
      {challenge.type === "tracker" &&
        challenge.trackerDays &&
        challenge.trackerDays.length > 0 && (
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Последние 7 дней
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                let cfg: Record<string, unknown> = {};
                try {
                  cfg = JSON.parse(challenge.config || "{}");
                } catch {
                  /* */
                }
                const metric = cfg.metric as string;
                const metricLabel: Record<string, string> = {
                  water_streak: "мл воды",
                  gym_count: "трен.",
                  ritual_rate: "ритуалов",
                  no_food_bad: "нарушений",
                  sleep_avg: "ч сна",
                  mood_avg: "/10 настр.",
                };
                const unit = metricLabel[metric] ?? "";
                return (
                  <div className="flex items-end justify-between gap-1.5">
                    {challenge.trackerDays!.map((day) => {
                      const weekday = new Date(day.date).toLocaleDateString("ru-RU", {
                        weekday: "short",
                      });
                      const dayNum = new Date(day.date).getDate();
                      const dotColor =
                        day.value === null
                          ? "bg-muted-foreground/20"
                          : day.met
                            ? "bg-emerald-500"
                            : "bg-red-500/70";
                      return (
                        <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                          <div className="text-muted-foreground/60 text-[10px]">{weekday}</div>
                          <div
                            className={`h-6 w-6 rounded-full ${dotColor} flex items-center justify-center`}
                          >
                            {day.value !== null && day.met && (
                              <CheckCircle className="h-3 w-3 text-white/90" />
                            )}
                          </div>
                          {day.value !== null && (
                            <div className="text-muted-foreground text-center text-[9px] leading-tight">
                              {metric === "water_streak" && day.value !== null
                                ? `${Math.round(day.value / 100) / 10}л`
                                : day.value}
                              {metric === "sleep_avg" || metric === "mood_avg" ? ` ${unit}` : ""}
                            </div>
                          )}
                          <div className="text-muted-foreground/50 text-[9px]">{dayNum}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

      {/* Complete early button — for active challenges */}
      {challenge.status === "active" && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={async () => {
            if (!confirm("Завершить челлендж досрочно?")) return;
            await handleStatusChange("completed");
            showSuccessToast("🏆 Челлендж завершён!");
          }}
          disabled={isUpdating}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Завершить досрочно ✓
        </Button>
      )}

      {/* Manual day mark — for custom/ai challenges without ritual linking */}
      {challenge.status === "active" &&
        (challenge.type === "custom" || challenge.type === "ai") && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={async () => {
              setIsUpdating(true);
              try {
                const res = await fetch("/api/challenges", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: challenge.id, markDay: true }),
                });
                const data = await res.json();
                if (data.challenge)
                  setChallenge((prev) =>
                    prev
                      ? { ...prev, ...data.challenge, progressPercentage: data.challenge.progress }
                      : prev
                  );
                if (data.alreadyMarked) {
                  showSuccessToast("✅ Сегодня уже отмечен!");
                } else {
                  showSuccessToast("✅ День отмечен!");
                }
              } catch (err) {
                showErrorToast(err, "отметка дня");
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Отметить сегодняшний день ✓
          </Button>
        )}

      {/* Buddy Challenge section */}
      {challenge.status === "active" && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-400" />
              Buddy-челлендж
            </CardTitle>
          </CardHeader>
          <CardContent>
            {buddyChallenge ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Приглашён:</span>
                  <span className="font-medium">
                    {buddyChallenge.invitee?.firstName ??
                      buddyChallenge.invitee?.username ??
                      "Бадди"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Статус:</span>
                  <Badge
                    className={
                      buddyChallenge.status === "accepted"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : buddyChallenge.status === "declined"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    }
                  >
                    {buddyChallenge.status === "accepted"
                      ? "✅ Принял"
                      : buddyChallenge.status === "declined"
                        ? "❌ Отказал"
                        : "⏳ Ожидает"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Пригласи бадди — соревнуйтесь вместе и видите прогресс друг друга.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowInvite(true)}
                >
                  <Users className="mr-1 h-4 w-4" />
                  Пригласить бадди
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Пригласить бадди</DialogTitle>
          </DialogHeader>
          {buddies.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              У тебя пока нет бадди. Найди их в разделе «Бадди».
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {buddies.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleInviteBuddy(b.partnerId)}
                  disabled={inviting}
                  className="border-border hover:border-primary/50 hover:bg-primary/5 w-full rounded-lg border p-3 text-left transition-colors"
                >
                  <p className="text-sm font-medium">{b.partnerName}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete button */}
      {challenge.status === "active" && (
        <Button
          variant="outline"
          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Отменить челендж
        </Button>
      )}
    </div>
  );
}
