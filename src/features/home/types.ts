export interface DailySummary {
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

export interface CheckinStatus {
  morningDone: boolean;
  eveningDone: boolean;
  morningEnergy?: number;
  morningFocus?: string;
  eveningRating?: number;
  eveningWin?: string;
  earlyBird?: boolean;
}

export interface WeightData {
  todayAvg: number | null;
  changeWeek: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  toGoal: number | null;
}

export interface TopWeeklyLeak {
  message: string;
  emoji: string;
  severity: string;
}

export interface AiRecommendation {
  leakType: string;
  analysis: {
    cause: string;
    solutions: { text: string; deadline: string; priority: string }[];
    urgency: string;
  };
  provider: string | null;
  updatedAt: string;
}

export interface DailyTip {
  tip: string;
  provider: string;
  cached: boolean;
}

export interface ActiveChallenge {
  id: string;
  name: string;
  progressPercentage: number;
  currentStreak: number;
  type: string;
}
