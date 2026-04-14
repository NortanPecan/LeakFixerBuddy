// Types
export type {
  DailySummary,
  CheckinStatus,
  WeightData,
  TopWeeklyLeak,
  AiRecommendation,
  DailyTip,
  ActiveChallenge,
} from "./types";

// Constants & helpers
export {
  ONBOARDING_UNLOCKS,
  isUnlocked,
  STREAK_MILESTONES,
  LEAK_TYPE_LABELS,
  pluralDays,
} from "./constants";

// Hooks
export { useCheckinStatus } from "./hooks/use-checkin";
export { useDailySummary } from "./hooks/use-daily-summary";
export { useHiddenWidgets } from "./hooks/use-hidden-widgets";
export { useWeeklyLeaks } from "./hooks/use-weekly-leaks";
export { useAiWidgets } from "./hooks/use-ai-widgets";
export { useActiveChallenges } from "./hooks/use-active-challenges";
export { useWeightData } from "./hooks/use-weight-data";
export { useQuickInput } from "./hooks/use-quick-input";

// Components
export { HomeHeader } from "./components/home-header";
export { CheckinStatusBlock } from "./components/checkin-status-block";
export { EnergyBar } from "./components/energy-bar";
export { GlobalStateWidget } from "./components/global-state-widget";
export { OnboardingBanners } from "./components/onboarding-banners";
export { WeightCard } from "./components/weight-card";
export { QuickInputBar } from "./components/quick-input-bar";
export { DailySummaryCard } from "./components/daily-summary-card";
export { StreakMilestoneBanner } from "./components/streak-milestone-banner";
export { WeeklyFocusCard } from "./components/weekly-focus-card";
export { AiRecommendationsWidget } from "./components/ai-recommendations-widget";
export { AiDailyTipWidget } from "./components/ai-daily-tip-widget";
export { ActiveChallengesWidget } from "./components/active-challenges-widget";
export { NavShortcutCard } from "./components/nav-shortcut-card";
export { WeeklyLeaksCard } from "./components/weekly-leaks-card";
export { QuickStatsRow } from "./components/quick-stats-row";
