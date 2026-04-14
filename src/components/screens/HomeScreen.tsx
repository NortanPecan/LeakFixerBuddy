"use client";

import { useAppStore, Screen } from "@/lib/store";
import { WellbeingWidget } from "@/components/wellbeing";
import { EmotionWidget } from "@/components/EmotionWidget";
import { FleetingThoughtsWidget } from "@/components/FleetingThoughtsWidget";
import {
  HomeHeader,
  CheckinStatusBlock,
  GlobalStateWidget,
  OnboardingBanners,
  WeightCard,
  QuickInputBar,
  DailySummaryCard,
  StreakMilestoneBanner,
  WeeklyFocusCard,
  AiRecommendationsWidget,
  AiDailyTipWidget,
  ActiveChallengesWidget,
  NavShortcutCard,
  WeeklyLeaksCard,
  QuickStatsRow,
  isUnlocked,
  useCheckinStatus,
  useDailySummary,
  useHiddenWidgets,
  useWeeklyLeaks,
  useAiWidgets,
  useActiveChallenges,
  useWeightData,
  useQuickInput,
} from "@/features/home";

export function HomeScreen() {
  const { user, globalState, isDemoMode, selectedDate, setScreen, setSelectedContentId } =
    useAppStore();

  const userId = user?.id;
  const userDay = user?.day ?? 1;

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const checkinStatus = useCheckinStatus(userId, selectedDate);
  const { dailySummary, summaryLoading, setDailySummary, handleQuickWater } = useDailySummary(
    userId,
    selectedDate
  );
  const hiddenWidgets = useHiddenWidgets(userId);
  const { weeklyLeaksCount, topWeeklyLeak } = useWeeklyLeaks(userId);
  const { aiRecommendation, dailyTip } = useAiWidgets(userId, hiddenWidgets);
  const activeChallenges = useActiveChallenges(userId, hiddenWidgets);
  const {
    weightData,
    weightValue,
    setWeightValue,
    weightLoading,
    weightSaving,
    handleSaveWeight,
    reloadWeightData,
  } = useWeightData(userId);

  const waterUpdateForQuickInput = (newAmount: number) => {
    if (!dailySummary) return;
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
  };

  const { quickInput, setQuickInput, quickResult, handleQuickInput } = useQuickInput({
    userId,
    dailySummary,
    onWaterUpdate: waterUpdateForQuickInput,
  });

  const hour = new Date().getHours();
  const isMorningTime = hour >= 5 && hour < 13;
  const isEveningTime = hour >= 18;

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <HomeHeader
        firstName={user?.firstName}
        daysWithApp={userDay}
        streak={user?.streak ?? 0}
        points={user?.points ?? 0}
        streakShieldUsedAt={user?.streakShieldUsedAt}
        isMorningTime={isMorningTime}
        isEveningTime={isEveningTime}
      />

      {/* Check-in status */}
      <CheckinStatusBlock
        {...checkinStatus}
        isMorningTime={isMorningTime}
        isEveningTime={isEveningTime}
        onOpenDailySummary={() => setScreen("daily-summary")}
      />

      {/* Mood / Energy */}
      {!hiddenWidgets.includes("mood") && (
        <GlobalStateWidget morningEnergy={checkinStatus.morningEnergy} />
      )}

      {/* Wellbeing */}
      {!hiddenWidgets.includes("wellbeing") && (
        <WellbeingWidget mood={globalState?.mood} energy={globalState?.energy} />
      )}

      {/* Emotion tracker — unlocks day 8 */}
      {userId && isUnlocked("emotion", userDay) && <EmotionWidget userId={userId} />}

      {/* Fleeting thoughts — unlocks day 8 */}
      {userId && isUnlocked("fleeting", userDay) && <FleetingThoughtsWidget userId={userId} />}

      {/* Onboarding banners */}
      <OnboardingBanners userDay={userDay} />

      {/* Weight */}
      {!hiddenWidgets.includes("weight") && (
        <WeightCard
          weightData={weightData}
          weightValue={weightValue}
          setWeightValue={setWeightValue}
          weightLoading={weightLoading}
          weightSaving={weightSaving}
          onSave={handleSaveWeight}
          onGoalUpdate={reloadWeightData}
        />
      )}

      {/* Quick input bar */}
      {!hiddenWidgets.includes("quickinput") && (
        <QuickInputBar
          value={quickInput}
          onChange={setQuickInput}
          onSubmit={handleQuickInput}
          result={quickResult}
        />
      )}

      {/* Daily summary */}
      {!summaryLoading && dailySummary && !dailySummary.flags.hasNoData && (
        <DailySummaryCard
          dailySummary={dailySummary}
          hiddenWidgets={hiddenWidgets}
          onOpenDailySummary={() => setScreen("daily-summary")}
          onQuickWater={(ml) => userId && handleQuickWater(ml, userId)}
        />
      )}

      {/* Streak milestone */}
      <StreakMilestoneBanner streak={user?.streak ?? 0} />

      {/* Today's focus (weekly leak) — unlocks day 8 */}
      {topWeeklyLeak && isUnlocked("weekly_leak_focus", userDay) && (
        <WeeklyFocusCard
          leak={topWeeklyLeak}
          onClick={() => setScreen("weekly-report" as Screen)}
        />
      )}

      {/* AI Recommendations — unlocks day 8 */}
      {aiRecommendation &&
        isUnlocked("weekly_report", userDay) &&
        !hiddenWidgets.includes("ai_recommendations") && (
          <AiRecommendationsWidget
            recommendation={aiRecommendation}
            onNavigate={() => setScreen("weekly-report" as Screen)}
          />
        )}

      {/* AI Daily Tip */}
      {dailyTip && !hiddenWidgets.includes("daily_tip") && <AiDailyTipWidget tip={dailyTip} />}

      {/* Active challenges */}
      {!hiddenWidgets.includes("challenges") && (
        <ActiveChallengesWidget
          challenges={activeChallenges}
          onNavigateList={() => setScreen("goals" as Screen)}
          onNavigateDetail={(id) => {
            setSelectedContentId(id);
            setScreen("challenge-detail" as Screen);
          }}
        />
      )}

      {/* Weekly report — unlocks day 8 */}
      {isUnlocked("weekly_report", userDay) && (
        <WeeklyLeaksCard
          leaksCount={weeklyLeaksCount}
          onClick={() => setScreen("weekly-report" as Screen)}
        />
      )}

      {/* Monthly report — unlocks day 8 */}
      {isUnlocked("monthly_report", userDay) && (
        <NavShortcutCard
          emoji="📈"
          title="Месячный анализ"
          subtitle="Тренды, глубокие лики, советы"
          onClick={() => setScreen("monthly-report")}
        />
      )}

      {/* Finance shortcut — unlocks day 15 */}
      {isUnlocked("finances_shortcut", userDay) && (
        <NavShortcutCard
          emoji="💰"
          title="Финансы"
          subtitle="Доходы, расходы, бюджет"
          onClick={() => setScreen("finance" as Screen)}
        />
      )}

      {/* Buddy shortcut — unlocks day 15 */}
      {isUnlocked("buddy_shortcut", userDay) && (
        <NavShortcutCard
          emoji="🤝"
          title="Buddy Matching"
          subtitle="Найди напарника по профилю"
          onClick={() => setScreen("buddy" as Screen)}
        />
      )}

      {/* Quick stats */}
      <QuickStatsRow streak={user?.streak ?? 0} points={user?.points ?? 0} />

      {/* Demo mode */}
      {isDemoMode && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-400">🎮 Демо-режим: данные сохраняются локально.</p>
        </div>
      )}
    </div>
  );
}
