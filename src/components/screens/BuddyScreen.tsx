"use client";

import { useAppStore } from "@/lib/store";
import { showErrorToast, showSuccessToast, isOnline } from "@/lib/network-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Search,
  ArrowLeft,
  UserPlus,
  Check,
  X,
  Clock,
  UserCheck,
  Flame,
  Target,
  Loader2,
  Dumbbell,
  Scale,
  Trophy,
  BarChart2,
  RefreshCw,
  Trash2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string;
  username?: string;
  streak: number;
  day: number;
}

interface BuddyRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface BuddyStats {
  buddy: {
    id: string;
    name: string;
    photoUrl?: string;
    day: number;
    streak: number;
    points: number;
  };
  me?: {
    name: string;
    photoUrl?: string;
    day?: number;
    streak?: number;
    points?: number;
    todayCompletions: number;
    last7Days: { date: string; completions: number }[];
  };
  stats: {
    activeRituals: number;
    todayCompletions: number;
    weekWorkouts: number;
    activeChallenges: number;
    gymPeriod: string | null;
    latestWeight: { weight: number; date: string } | null;
    last7Days: { date: string; completions: number }[];
  };
}

export function BuddyScreen() {
  const { user, setScreen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<BuddyRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<BuddyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "find" | "incoming">("dashboard");
  const [buddyStats, setBuddyStats] = useState<BuddyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      name: string;
      username?: string;
      photoUrl?: string;
      day: number;
      streak: number;
      score: number;
      reasons: string[];
      categories?: string[];
    }>
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const acceptedBuddies = outgoingRequests.filter((b) => b.status === "accepted");
  const activeBuddy = acceptedBuddies[0];

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [usersRes, buddiesRes] = await Promise.all([
        fetch(`/api/users?userId=${user.id}`),
        fetch(`/api/buddies?userId=${user.id}`),
      ]);
      const usersData = await usersRes.json();
      const buddiesData = await buddiesRes.json();
      setUsers(usersData.users || []);
      setOutgoingRequests(buddiesData.buddies || []);
      setIncomingRequests(buddiesData.incoming || []);
    } catch (error) {
      showErrorToast(error, "load buddy data");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadSuggestions = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/buddies/suggest?userId=${user.id}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // silent — suggestions are optional
    } finally {
      setLoadingSuggestions(false);
    }
  }, [user?.id]);

  const loadBuddyStats = useCallback(
    async (buddyId: string) => {
      if (!user?.id) return;
      setLoadingStats(true);
      try {
        const res = await fetch(`/api/buddies/dashboard?userId=${user.id}&buddyId=${buddyId}`);
        const data = await res.json();
        if (data.success) setBuddyStats(data);
      } catch (error) {
        showErrorToast(error, "load buddy stats");
      } finally {
        setLoadingStats(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    loadSuggestions();
  }, [loadData, loadSuggestions]);

  useEffect(() => {
    if (activeBuddy) {
      setActiveTab("dashboard");
      loadBuddyStats(activeBuddy.partnerId);
    } else {
      setActiveTab("find");
    }
  }, [activeBuddy?.partnerId, loadBuddyStats]);

  const CATEGORY_FILTER_OPTIONS = [
    { id: "health", label: "🧘 Здоровье" },
    { id: "money", label: "💰 Финансы" },
    { id: "learning", label: "📚 Обучение" },
    { id: "mind", label: "🧠 Психология" },
    { id: "productivity", label: "⚡ Продуктивность" },
    { id: "relationships", label: "🤝 Отношения" },
  ];

  // Max possible score in suggest algorithm ≈ 15 pts
  const MAX_BUDDY_SCORE = 15;

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        (u.username && u.username.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const filteredSuggestions = useMemo(() => {
    if (!categoryFilter) return suggestions;
    return suggestions.filter((s) => s.categories?.includes(categoryFilter));
  }, [suggestions, categoryFilter]);

  const handleSendRequest = async (partner: UserProfile) => {
    if (!user?.id || !isOnline()) return;
    setSendingTo(partner.id);
    try {
      const res = await fetch("/api/buddies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          partnerId: partner.id,
          partnerName: partner.name,
          partnerPhoto: partner.photoUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes("already exists")) {
          showSuccessToast("Запрос уже отправлен");
        } else {
          throw new Error(data.error || "Failed to send request");
        }
      } else {
        showSuccessToast(`Запрос отправлен ${partner.name}`);
        await loadData();
      }
    } catch (error) {
      showErrorToast(error, "send request");
    } finally {
      setSendingTo(null);
    }
  };

  const handleAcceptRequest = async (request: BuddyRequest) => {
    if (!user?.id || !isOnline()) return;
    try {
      await fetch("/api/buddies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buddyId: request.id, status: "accepted", currentUserId: user.id }),
      });
      showSuccessToast(`${request.partnerName} теперь ваш бадди!`);
      await loadData();
    } catch (error) {
      showErrorToast(error, "accept request");
    }
  };

  const handleRejectRequest = async (request: BuddyRequest) => {
    if (!user?.id || !isOnline()) return;
    try {
      await fetch("/api/buddies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buddyId: request.id, status: "rejected", currentUserId: user.id }),
      });
      showSuccessToast("Запрос отклонён");
      await loadData();
    } catch (error) {
      showErrorToast(error, "reject request");
    }
  };

  const handleRemoveBuddy = async (buddyId: string) => {
    if (!confirm("Удалить бадди?")) return;
    try {
      await fetch(`/api/buddies?buddyId=${buddyId}`, { method: "DELETE" });
      showSuccessToast("Бадди удалён");
      setBuddyStats(null);
      await loadData();
    } catch (error) {
      showErrorToast(error, "remove buddy");
    }
  };

  const getRequestStatus = (partnerId: string) => {
    const outgoing = outgoingRequests.find((b) => b.partnerId === partnerId);
    if (outgoing) return outgoing.status;
    const incoming = incomingRequests.find((b) => b.partnerId === partnerId);
    if (incoming) return `incoming_${incoming.id}` as const;
    return null;
  };

  const pendingIncomingCount = incomingRequests.filter((b) => b.status === "pending").length;

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setScreen("profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-foreground text-2xl font-bold">Бадди</h1>
        {activeBuddy && (
          <Badge className="ml-auto border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
            <Check className="mr-1 h-3 w-3" />
            Подключён
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {activeBuddy && (
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            size="sm"
            className={activeTab === "dashboard" ? "bg-primary" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart2 className="mr-1 h-4 w-4" />
            Дашборд
          </Button>
        )}
        <Button
          variant={activeTab === "find" ? "default" : "outline"}
          size="sm"
          className={activeTab === "find" ? "bg-primary" : ""}
          onClick={() => setActiveTab("find")}
        >
          <Search className="mr-1 h-4 w-4" />
          Найти
        </Button>
        <Button
          variant={activeTab === "incoming" ? "default" : "outline"}
          size="sm"
          className={activeTab === "incoming" ? "bg-primary" : ""}
          onClick={() => setActiveTab("incoming")}
        >
          Входящие
          {pendingIncomingCount > 0 && (
            <Badge className="ml-1 rounded-full bg-red-500 px-1 py-0 text-xs text-white">
              {pendingIncomingCount}
            </Badge>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : activeTab === "dashboard" ? (
        // Buddy Dashboard
        <div className="space-y-4">
          {activeBuddy && (
            <>
              {/* Buddy card */}
              <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-emerald-500/50">
                      <AvatarImage src={activeBuddy.partnerPhoto} />
                      <AvatarFallback className="bg-emerald-500/20 text-xl text-emerald-400">
                        {activeBuddy.partnerName[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-lg font-bold">{activeBuddy.partnerName}</p>
                      {buddyStats && (
                        <div className="mt-1 flex gap-3">
                          <span className="text-muted-foreground text-sm">
                            🔥 {buddyStats.buddy.streak} дней
                          </span>
                          <span className="text-muted-foreground text-sm">
                            📅 День {buddyStats.buddy.day}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            ⭐ {buddyStats.buddy.points} очков
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => activeBuddy && loadBuddyStats(activeBuddy.partnerId)}
                        disabled={loadingStats}
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => handleRemoveBuddy(activeBuddy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats comparison */}
              {loadingStats ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : buddyStats ? (
                <>
                  {/* Side-by-side comparison */}
                  {buddyStats.me && (
                    <Card className="bg-card/50 backdrop-blur">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <BarChart2 className="h-4 w-4 text-indigo-400" />
                          Сравнение
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="text-white/40">Метрика</div>
                          <div className="truncate font-medium text-white/80">
                            {buddyStats.me.name}
                          </div>
                          <div className="truncate font-medium text-emerald-400">
                            {buddyStats.buddy.name}
                          </div>
                        </div>
                        {[
                          {
                            label: "🔥 Стрик",
                            my: buddyStats.me.streak ?? 0,
                            their: buddyStats.buddy.streak,
                          },
                          {
                            label: "📅 День",
                            my: buddyStats.me.day ?? 0,
                            their: buddyStats.buddy.day,
                          },
                          {
                            label: "⭐ Очки",
                            my: buddyStats.me.points ?? 0,
                            their: buddyStats.buddy.points,
                          },
                          {
                            label: "✓ Сегодня",
                            my: buddyStats.me.todayCompletions,
                            their: buddyStats.stats.todayCompletions,
                          },
                        ].map(({ label, my, their }) => (
                          <div
                            key={label}
                            className="grid grid-cols-3 gap-2 border-b border-white/5 py-1 text-center last:border-0"
                          >
                            <div className="text-left text-xs text-white/40">{label}</div>
                            <div
                              className={`text-sm font-bold ${my > their ? "text-emerald-400" : my < their ? "text-white/60" : "text-white/80"}`}
                            >
                              {my}
                            </div>
                            <div
                              className={`text-sm font-bold ${their > my ? "text-emerald-400" : their < my ? "text-white/60" : "text-white/80"}`}
                            >
                              {their}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Today's activity */}
                  <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Flame className="h-4 w-4 text-orange-400" />
                        Сегодня
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-primary text-2xl font-bold">
                            {buddyStats.stats.todayCompletions}
                          </p>
                          <p className="text-muted-foreground text-xs">ритуалов выполнено</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-2xl font-bold text-orange-400">
                            {buddyStats.buddy.streak}
                          </p>
                          <p className="text-muted-foreground text-xs">дней подряд</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Activity streak 7 days */}
                  <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        Активность за 7 дней
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between gap-1">
                        {buddyStats.stats.last7Days.map(({ date, completions }) => {
                          const d = new Date(date);
                          const dayLabel = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][d.getDay()];
                          return (
                            <div key={date} className="flex flex-1 flex-col items-center gap-1">
                              <div
                                className={`w-full rounded-sm transition-all ${
                                  completions > 0 ? "bg-emerald-500" : "bg-muted"
                                }`}
                                style={{
                                  height: `${Math.max(8, Math.min(40, completions * 8))}px`,
                                }}
                              />
                              <span className="text-muted-foreground text-[9px]">{dayLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Module stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-card/50 backdrop-blur">
                      <CardContent className="pt-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-400" />
                          <span className="text-sm font-medium">Ритуалы</span>
                        </div>
                        <p className="text-2xl font-bold">{buddyStats.stats.activeRituals}</p>
                        <p className="text-muted-foreground text-xs">активных</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur">
                      <CardContent className="pt-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium">Тренировки</span>
                        </div>
                        <p className="text-2xl font-bold">{buddyStats.stats.weekWorkouts}</p>
                        <p className="text-muted-foreground text-xs">на этой неделе</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur">
                      <CardContent className="pt-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium">Вызовы</span>
                        </div>
                        <p className="text-2xl font-bold">{buddyStats.stats.activeChallenges}</p>
                        <p className="text-muted-foreground text-xs">активных</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur">
                      <CardContent className="pt-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Scale className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-medium">Вес</span>
                        </div>
                        {buddyStats.stats.latestWeight ? (
                          <>
                            <p className="text-2xl font-bold">
                              {buddyStats.stats.latestWeight.weight}
                            </p>
                            <p className="text-muted-foreground text-xs">кг</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">Нет данных</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gym program */}
                  {buddyStats.stats.gymPeriod && (
                    <Card className="bg-card/50 backdrop-blur">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="text-sm font-medium">Программа GYM</p>
                            <p className="text-muted-foreground text-sm">
                              {buddyStats.stats.gymPeriod}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Target className="text-primary h-4 w-4" />
                        Рекомендации
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-muted-foreground space-y-2 text-sm">
                        {buddyStats.stats.todayCompletions === 0 && (
                          <p>
                            • {buddyStats.buddy.name} ещё не выполнил ритуалы сегодня — напомните
                            ему!
                          </p>
                        )}
                        {buddyStats.buddy.streak < 3 && (
                          <p>
                            • Стрик бадди низкий ({buddyStats.buddy.streak} дн.) — поддержите его
                            сегодня
                          </p>
                        )}
                        {buddyStats.stats.weekWorkouts === 0 && (
                          <p>• На этой неделе бадди ещё не тренировался — мотивируйте вместе!</p>
                        )}
                        {buddyStats.stats.todayCompletions > 0 && buddyStats.buddy.streak > 7 && (
                          <p>
                            • {buddyStats.buddy.name} на подъёме! Стрик {buddyStats.buddy.streak}{" "}
                            дней 🔥 Держите темп вместе
                          </p>
                        )}
                        {buddyStats.stats.activeRituals === 0 && (
                          <p>• У бадди нет активных ритуалов — предложите создать первый</p>
                        )}
                        {buddyStats.stats.todayCompletions > 0 &&
                          buddyStats.stats.weekWorkouts > 2 &&
                          buddyStats.buddy.streak > 5 && (
                            <p>• Отличная неделя у обоих! Поставьте совместную цель на следующую</p>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="text-muted-foreground py-6 text-center">
                    Не удалось загрузить данные бадди
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      ) : activeTab === "find" ? (
        // Find users
        <div className="space-y-3">
          {!activeBuddy && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3">
                <p className="text-muted-foreground text-sm">
                  Найдите бадди — партнёра по отчётности. Вы будете видеть прогресс друг друга и
                  поддерживать в достижении целей.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Smart suggestions */}
          {!activeBuddy && suggestions.length > 0 && !searchQuery && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  Похожий путь — рекомендуем
                </p>
                <span className="text-muted-foreground text-[10px]">
                  {filteredSuggestions.length} из {suggestions.length}
                </span>
              </div>

              {/* Category filter chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${
                    !categoryFilter
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-muted/30 text-muted-foreground border-white/10 hover:border-white/20"
                  }`}
                >
                  Все
                </button>
                {CATEGORY_FILTER_OPTIONS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                    className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${
                      categoryFilter === cat.id
                        ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                        : "bg-muted/30 text-muted-foreground border-white/10 hover:border-white/20"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {filteredSuggestions.length === 0 ? (
                <p className="text-muted-foreground py-3 text-center text-xs">
                  Нет совпадений по фильтру. Попробуй другую категорию.
                </p>
              ) : (
                filteredSuggestions.map((s) => {
                  const status = getRequestStatus(s.id);
                  const matchPct = Math.min(100, Math.round((s.score / MAX_BUDDY_SCORE) * 100));
                  return (
                    <Card key={s.id} className="bg-card/50 border-indigo-500/20 backdrop-blur">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={s.photoUrl} />
                            <AvatarFallback className="bg-indigo-500/20 text-sm text-indigo-300">
                              {s.name[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{s.name}</p>
                              <span className="shrink-0 text-[10px] font-bold text-indigo-300">
                                {matchPct}%
                              </span>
                            </div>
                            {/* Match bar */}
                            <div className="bg-muted/40 mt-0.5 mb-1 h-1 w-full rounded-full">
                              <div
                                className="h-1 rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${matchPct}%` }}
                              />
                            </div>
                            <div className="text-muted-foreground flex gap-2 text-xs">
                              <span>🔥 {s.streak} дней</span>
                              <span>📅 День {s.day}</span>
                            </div>
                            {s.reasons.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {s.reasons.map((r, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-300"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {status === "accepted" ? (
                            <Badge className="shrink-0 bg-emerald-500/20 text-emerald-400">
                              Бадди
                            </Badge>
                          ) : status === "pending" ? (
                            <Badge variant="outline" className="text-muted-foreground shrink-0">
                              <Clock className="mr-1 h-3 w-3" />
                              Ожидание
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 border-indigo-500/30"
                              onClick={() =>
                                handleSendRequest({
                                  id: s.id,
                                  name: s.name,
                                  photoUrl: s.photoUrl,
                                  username: s.username,
                                  streak: s.streak,
                                  day: s.day,
                                })
                              }
                              disabled={sendingTo === s.id || !!activeBuddy}
                            >
                              {sendingTo === s.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
              <div className="my-1 h-px bg-white/5" />
            </div>
          )}

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Поиск по имени или @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="py-8 text-center">
                <Users className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
                <p className="text-muted-foreground">Пользователи не найдены</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((u) => {
              const status = getRequestStatus(u.id);
              return (
                <Card key={u.id} className="bg-card/50 backdrop-blur">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={u.photoUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {u.name[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{u.name}</p>
                        <div className="text-muted-foreground flex gap-3 text-xs">
                          {u.username && <span>@{u.username}</span>}
                          <span>🔥 {u.streak} дней</span>
                          <span>📅 День {u.day}</span>
                        </div>
                      </div>
                      {status === "accepted" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">Бадди</Badge>
                      ) : status === "pending" ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Ожидание
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendRequest(u)}
                          disabled={sendingTo === u.id || !!activeBuddy}
                        >
                          {sendingTo === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-4 w-4" />
                              Добавить
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        // Incoming requests
        <div className="space-y-3">
          {incomingRequests.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="py-8 text-center">
                <UserCheck className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
                <p className="text-muted-foreground">Нет входящих запросов</p>
              </CardContent>
            </Card>
          ) : (
            incomingRequests.map((request) => (
              <Card
                key={request.id}
                className={`bg-card/50 backdrop-blur ${request.status === "pending" ? "border-primary/30" : ""}`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.partnerPhoto} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {request.partnerName[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{request.partnerName}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(request.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRejectRequest(request)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAcceptRequest(request)}
                          disabled={!!activeBuddy}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground capitalize">
                        {request.status === "accepted" ? "Принят" : "Отклонён"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
