"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  ChevronRight,
  Trophy,
  Flame,
  Target,
  Dumbbell,
  Edit,
  TrendingUp,
  TrendingDown,
  Users,
  Plus,
  Ruler,
  Brain,
  Zap,
  MessageSquare,
  Check,
  Sparkles,
} from "lucide-react";
import { ATTRIBUTE_LABELS, type AttributeKey } from "@/lib/rituals/data";
import {
  MEASUREMENT_TYPES,
  FEEDBACK_TYPES,
  LEAK_TYPE_LABELS_PROFILE,
} from "@/features/profile/constants";
import {
  QuickAccess,
  DonateCard,
  useProfileScreen,
  WeightSparkline,
  ProfileAchievementsCard,
  ProfileSettingsCard,
  AdminFeedbacksCard,
  AddMeasurementDialog,
} from "@/features/profile";

export function ProfileScreen() {
  const { user, isDemoMode, isOwnerMode, setScreen } = useAppStore();

  const {
    stats,
    measurements,
    firstMeasurements,
    buddies,
    attributes,
    showMeasurements,
    setShowMeasurements,
    newMeasurement,
    setNewMeasurement,
    topPRs,
    prHistory,
    communityStats,
    achievements,
    aiPatterns,
    transformation,
    transformationLoading,
    bio,
    setBio,
    isEditingBio,
    setIsEditingBio,
    settings,
    activityStats,
    feedback,
    setFeedback,
    feedbackSent,
    adminFeedbacks,
    adminFeedbackCounts,
    adminFeedbackFilter,
    setAdminFeedbackFilter,
    isLoadingAdminFeedbacks,
    handleSaveBio,
    handleToggleWidget,
    handleSettingChange,
    handleSendFeedback,
    loadAdminFeedbacks,
    handleMarkFeedback,
    handleAddMeasurement,
  } = useProfileScreen();

  const initials = user?.firstName?.[0] ?? user?.username?.[0]?.toUpperCase() ?? "U";
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : (user?.username ?? "Пользователь");

  return (
    <div className="flex flex-col gap-4 pb-20">
      <h1 className="text-foreground text-2xl font-bold">Профиль</h1>

      {/* User card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <Avatar className="border-primary/20 h-16 w-16 border-2">
              <AvatarImage src={user?.photoUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-foreground text-lg font-semibold">{displayName}</p>
              {user?.username && <p className="text-muted-foreground text-sm">@{user.username}</p>}
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  День {user?.day ?? 1}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Flame className="mr-1 h-3 w-3 text-orange-400" />
                  {user?.streak ?? 0}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-border/50 mt-4 border-t pt-4">
            {isEditingBio ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Напишите немного о себе..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">{bio.length}/200</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(false)}>
                      Отмена
                    </Button>
                    <Button size="sm" onClick={() => void handleSaveBio()}>
                      <Check className="mr-1 h-4 w-4" />
                      Сохранить
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="hover:bg-muted/30 -m-2 flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors"
                onClick={() => setIsEditingBio(true)}
              >
                {bio ? (
                  <p className="text-muted-foreground flex-1 text-sm">{bio}</p>
                ) : (
                  <p className="text-muted-foreground/60 flex-1 text-sm italic">
                    Добавьте информацию о себе...
                  </p>
                )}
                <Edit className="text-muted-foreground/50 mt-0.5 h-4 w-4 flex-shrink-0" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 text-center">
            <Trophy className="mx-auto mb-1 h-5 w-5 text-yellow-400" />
            <p className="text-primary text-xl font-bold">{user?.points ?? 0}</p>
            <p className="text-muted-foreground text-xs">Очки</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 text-center">
            <Target className="mx-auto mb-1 h-5 w-5 text-emerald-400" />
            <p className="text-primary text-xl font-bold">{user?.streak ?? 0}</p>
            <p className="text-muted-foreground text-xs">Серия</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 text-center">
            <Dumbbell className="mx-auto mb-1 h-5 w-5 text-cyan-400" />
            <p className="text-primary text-xl font-bold">{stats.totalWorkouts}</p>
            <p className="text-muted-foreground text-xs">Тренировок</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress since day 1 */}
      {user && user.day > 1 && (
        <Card className="from-primary/5 to-card/50 border-primary/20 border bg-gradient-to-r">
          <CardContent className="pt-4 pb-3">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="text-primary h-4 w-4" />
              <span className="text-sm font-semibold">За {user.day} дней в приложении</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background/50 rounded-lg p-2">
                <div className="text-lg font-bold text-yellow-400">{user.points}</div>
                <div className="text-muted-foreground text-[10px]">очков</div>
                {communityStats && communityStats.pointsPercentile >= 50 && (
                  <div className="mt-0.5 text-[9px] text-yellow-400/60">
                    топ {100 - communityStats.pointsPercentile}%
                  </div>
                )}
              </div>
              <div className="bg-background/50 rounded-lg p-2">
                <div className="text-lg font-bold text-orange-400">🔥 {user.streak}</div>
                <div className="text-muted-foreground text-[10px]">серия</div>
                {communityStats && communityStats.streakPercentile >= 50 && (
                  <div className="mt-0.5 text-[9px] text-orange-400/60">
                    топ {100 - communityStats.streakPercentile}%
                  </div>
                )}
              </div>
              <div className="bg-background/50 rounded-lg p-2">
                <div className="text-lg font-bold text-cyan-400">{stats.totalWorkouts}</div>
                <div className="text-muted-foreground text-[10px]">тренировок</div>
              </div>
            </div>
            {measurements["weight"] &&
              firstMeasurements["weight"] &&
              measurements["weight"].value !== firstMeasurements["weight"].value && (
                <div className="border-border/40 mt-2 flex items-center justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Вес с первого дня</span>
                  <span
                    className={
                      measurements["weight"].value < firstMeasurements["weight"].value
                        ? "font-semibold text-emerald-400"
                        : "font-semibold text-orange-400"
                    }
                  >
                    {firstMeasurements["weight"].value} → {measurements["weight"].value} кг (
                    {measurements["weight"].value - firstMeasurements["weight"].value > 0
                      ? "+"
                      : ""}
                    {(measurements["weight"].value - firstMeasurements["weight"].value).toFixed(1)}{" "}
                    кг)
                  </span>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* AI Transformation */}
      {(user?.day ?? 0) >= 30 &&
        !(settings.hiddenWidgets ?? []).includes("transformation") &&
        (transformationLoading || transformation) && (
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Как я изменился
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transformationLoading && !transformation ? (
                <p className="text-muted-foreground animate-pulse text-sm">
                  AI анализирует твой прогресс…
                </p>
              ) : transformation ? (
                <>
                  <p className="text-foreground text-sm leading-relaxed">
                    {transformation.narrative}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {transformation.cached ? "📦 Из кеша" : "🤖 Только что"} · обновляется раз в 7
                    дней
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

      {/* Personal Records */}
      {topPRs.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Личные рекорды
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPRs.map((pr, i) => {
                const hist = prHistory[pr.templateId] ?? [];
                return (
                  <div key={pr.templateId}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-4 text-xs">{i + 1}.</span>
                        <span className="text-sm">{pr.name}</span>
                      </div>
                      <Badge className="border-yellow-500/20 bg-yellow-500/15 text-yellow-400">
                        🏆 {pr.maxWeight} кг
                      </Badge>
                    </div>
                    {hist.length >= 2 && <WeightSparkline data={hist} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <ProfileAchievementsCard achievements={achievements} />

      {/* AI Patterns History */}
      {aiPatterns.filter((p) => p.leakType !== "tg_input_patterns").length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-purple-400" />
              История AI-анализов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiPatterns
              .filter((p) => p.leakType !== "tg_input_patterns")
              .slice(0, 5)
              .map((p) => {
                const label = LEAK_TYPE_LABELS_PROFILE[p.leakType] ?? p.leakType;
                const workedCount = Array.isArray(p.whatWorked) ? p.whatWorked.length : 0;
                const updatedDate = new Date(p.updatedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div
                    key={p.leakType}
                    className="bg-muted/20 flex items-start justify-between gap-2 rounded-lg p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {p.analysisCount}{" "}
                        {p.analysisCount === 1
                          ? "анализ"
                          : p.analysisCount < 5
                            ? "анализа"
                            : "анализов"}
                        {workedCount > 0 && ` · ${workedCount} сработало ✅`}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {updatedDate}
                    </span>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Activity Summary */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5" />
            Сводка активности
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: <Zap className="h-5 w-5 text-emerald-400" />,
                bg: "bg-emerald-500/20",
                value: activityStats.activeRituals,
                label: "Активных ритуалов",
              },
              {
                icon: <Check className="h-5 w-5 text-cyan-400" />,
                bg: "bg-cyan-500/20",
                value: activityStats.completedTasks7Days,
                label: "Дел за 7 дней",
              },
              {
                icon: <Target className="h-5 w-5 text-orange-400" />,
                bg: "bg-orange-500/20",
                value: `${activityStats.activeChains}/${activityStats.completedChains}`,
                label: "Цепочек акт/зав",
              },
              {
                icon: <Brain className="h-5 w-5 text-purple-400" />,
                bg: "bg-purple-500/20",
                value: activityStats.inProgressContent,
                label: "В процессе изучения",
              },
            ].map(({ icon, bg, value, label }) => (
              <div key={label} className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
                  {icon}
                </div>
                <div>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-muted-foreground text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attributes */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5" />
            Характеристики
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Накапливаются, когда ты выполняешь ритуалы
          </p>
          <div className="space-y-3">
            {(
              Object.entries(ATTRIBUTE_LABELS) as [
                AttributeKey,
                { label: string; icon: string; color: string },
              ][]
            ).map(([key, value]) => {
              const attr = attributes.find((a) => a.key === key);
              const points = attr?.points ?? 0;
              const level = attr?.level ?? 1;
              const progress = points % 100;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{value.icon}</span>
                      <span className="text-sm font-medium">{value.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Уровень {level}
                      </Badge>
                      <span className="text-muted-foreground text-sm">{points} очков</span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <QuickAccess onNavigate={setScreen} />

      {/* Body Measurements */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-5 w-5" />
              Замеры тела
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowMeasurements(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {MEASUREMENT_TYPES.slice(0, 6).map(({ key, label, unit }) => {
              const measurement = measurements[key];
              return (
                <div
                  key={key}
                  className="bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-lg p-3 text-center transition-colors"
                  onClick={() => {
                    setNewMeasurement({ type: key, value: "" });
                    setShowMeasurements(true);
                  }}
                >
                  <p className="text-primary text-xl font-bold">
                    {measurement?.value?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  {measurement && measurement.trend !== 0 && (
                    <p
                      className={`mt-1 flex items-center justify-center gap-0.5 text-xs ${measurement.trend > 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {measurement.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {measurement.trend > 0 ? "+" : ""}
                      {measurement.trend.toFixed(1)} {unit}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calorie Goal */}
      <Card
        className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
        onClick={() => setScreen("calorie-goal")}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">🎯 Цель по калоражу</CardTitle>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Адаптивный план питания до цели по весу</p>
        </CardContent>
      </Card>

      {/* Navigation settings */}
      <Card
        className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
        onClick={() => setScreen("settings")}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5" />
              Навигация и интерфейс
            </CardTitle>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Настройте нижнее меню и разделы</p>
        </CardContent>
      </Card>

      {/* Buddies */}
      <Card
        className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
        onClick={() => setScreen("buddies")}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Бадди
            </CardTitle>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {buddies.filter((b) => b.status === "accepted").length > 0 ? (
            <div className="space-y-2">
              {buddies
                .filter((b) => b.status === "accepted")
                .slice(0, 3)
                .map((buddy) => (
                  <div
                    key={buddy.id}
                    className="bg-muted/30 flex items-center justify-between rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={buddy.partnerPhoto} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {buddy.partnerName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{buddy.partnerName}</p>
                        <p className="text-muted-foreground text-xs">🤝 Партнёр</p>
                      </div>
                    </div>
                    <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                      Активен
                    </Badge>
                  </div>
                ))}
              {buddies.filter((b) => b.status === "accepted").length > 3 && (
                <p className="text-muted-foreground pt-2 text-center text-xs">
                  + ещё {buddies.filter((b) => b.status === "accepted").length - 3} бадди
                </p>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Users className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Добавьте партнёра для отчётности</p>
              <p className="text-primary mt-1 text-xs">Нажмите, чтобы найти бадди →</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ProfileSettingsCard
        settings={settings}
        handleSettingChange={handleSettingChange}
        handleToggleWidget={handleToggleWidget}
      />

      {/* Feedback */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Обратная связь
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackSent ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm text-emerald-400">Спасибо за обратную связь!</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Тип сообщения</Label>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TYPES.map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={feedback.type === key ? "default" : "outline"}
                      size="sm"
                      className={feedback.type === key ? "bg-primary" : ""}
                      onClick={() => setFeedback((prev) => ({ ...prev, type: key }))}
                    >
                      <Icon className="mr-1 h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Сообщение</Label>
                <Textarea
                  placeholder="Опишите вашу идею, проблему или вопрос..."
                  value={feedback.message}
                  onChange={(e) => setFeedback((prev) => ({ ...prev, message: e.target.value }))}
                  className="min-h-[100px] resize-none"
                />
              </div>
              <Button
                className="bg-primary w-full"
                onClick={() => void handleSendFeedback()}
                disabled={!feedback.message.trim()}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Отправить
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <DonateCard />

      {isDemoMode && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-400">🎮 Демо-режим активен</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (confirm("Переключиться на Owner-режим? Демо-данные будут недоступны.")) {
                    localStorage.removeItem("leakfixer-auth-mode");
                    localStorage.setItem("leakfixer-auth-mode", "owner");
                    window.location.reload();
                  }
                }}
              >
                Owner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOwnerMode && (
        <>
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-emerald-400">👤 Owner-режим (тестовый профиль)</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    if (confirm("Переключиться на Демо-режим?")) {
                      localStorage.removeItem("leakfixer-auth-mode");
                      localStorage.setItem("leakfixer-auth-mode", "demo");
                      window.location.reload();
                    }
                  }}
                >
                  Demo
                </Button>
              </div>
            </CardContent>
          </Card>

          <AdminFeedbacksCard
            adminFeedbacks={adminFeedbacks}
            adminFeedbackCounts={adminFeedbackCounts}
            adminFeedbackFilter={adminFeedbackFilter}
            setAdminFeedbackFilter={setAdminFeedbackFilter}
            isLoadingAdminFeedbacks={isLoadingAdminFeedbacks}
            loadAdminFeedbacks={loadAdminFeedbacks}
            handleMarkFeedback={handleMarkFeedback}
          />
        </>
      )}

      <p className="text-muted-foreground text-center text-xs">LeakFixer v1.0.0 • Next.js 16</p>

      <AddMeasurementDialog
        open={showMeasurements}
        onOpenChange={setShowMeasurements}
        newMeasurement={newMeasurement}
        setNewMeasurement={setNewMeasurement}
        handleAddMeasurement={handleAddMeasurement}
      />
    </div>
  );
}
