import { Bug, Lightbulb, HelpCircle, Star, Sun, Moon, Monitor, Scale, Ruler } from "lucide-react";

// Work profile labels
export const WORK_PROFILE_LABELS: Record<string, string> = {
  sedentary: "Сидячий",
  moderate: "Умеренный",
  active: "Активный",
  very_active: "Очень активный",
};

// Measurement types
export const MEASUREMENT_TYPES = [
  { key: "weight", label: "Вес", unit: "кг", icon: Scale },
  { key: "waist", label: "Талия", unit: "см", icon: Ruler },
  { key: "hips", label: "Бёдра", unit: "см", icon: Ruler },
  { key: "chest", label: "Грудь", unit: "см", icon: Ruler },
  { key: "bicep", label: "Бицепс", unit: "см", icon: Ruler },
  { key: "thigh", label: "Бедро", unit: "см", icon: Ruler },
];

// Feedback types
export const FEEDBACK_TYPES = [
  { key: "bug", label: "Баг / Ошибка", icon: Bug },
  { key: "idea", label: "Идея", icon: Lightbulb },
  { key: "question", label: "Вопрос", icon: HelpCircle },
  { key: "review", label: "Отзыв", icon: Star },
];

// Zones config
export const ZONES_CONFIG = [
  { key: "zoneLeakfixerEnabled", label: "LeakFixer", emoji: "🔧" },
  { key: "zoneAiEnabled", label: "ИИ", emoji: "🤖" },
  { key: "zonePokerEnabled", label: "Покер", emoji: "♠️" },
  { key: "zoneHealthEnabled", label: "Здоровье", emoji: "💪" },
];

// Theme options
export const THEME_OPTIONS = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
];

// Donate URL (hardcoded for MVP)
export const DONATE_URL = "https://boosty.to/leakfixer";

// Quick access navigation items
export const QUICK_ACCESS_ITEMS = [
  { screen: "stats", label: "Статистика", icon: "BarChart3", color: "text-emerald-400" },
  { screen: "weekly-report", label: "Лики недели", icon: "Search", color: "text-violet-400" },
  {
    screen: "monthly-report",
    label: "Месячный анализ",
    icon: "TrendingUp",
    color: "text-blue-400",
  },
  { screen: "tasks", label: "Дела", icon: "Target", color: "text-cyan-400" },
  { screen: "fitness", label: "Фитнес", icon: "Flame", color: "text-orange-400" },
  { screen: "health", label: "Здоровье", icon: "Heart", color: "text-red-400" },
  { screen: "finance", label: "Финансы", icon: "Wallet", color: "text-emerald-400" },
  { screen: "notes", label: "Заметки", icon: "StickyNote", color: "text-yellow-400" },
  {
    screen: "development",
    label: "Развитие / Контент",
    icon: "BookOpen",
    color: "text-purple-400",
  },
  { screen: "gym", label: "GYM / Тренировки", icon: "Calendar", color: "text-primary" },
  { screen: "skills", label: "Навыки", icon: "Star", color: "text-yellow-400" },
  { screen: "traits", label: "Черты характера", icon: "Heart", color: "text-pink-400" },
  { screen: "zones", label: "Зоны", icon: "MapPin", color: "text-indigo-400" },
  { screen: "export", label: "Экспорт в AI", icon: "Download", color: "text-cyan-400" },
  { screen: "buddies", label: "Бадди", icon: "Users", color: "text-teal-400" },
  { screen: "challenges", label: "Челенджи", icon: "Trophy", color: "text-orange-400" },
  { screen: "settings", label: "Настройки", icon: "Settings", color: "text-gray-400" },
] as const;

// Interfaces
export interface Measurement {
  type: string;
  value: number;
  date: string;
  trend: number;
}

export interface Buddy {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string;
  status: string;
}

export interface UserAttribute {
  key: string;
  points: number;
  level: number;
}

export interface UserSettings {
  ritualReminders: boolean;
  taskReminders: boolean;
  weightReminder?: boolean;
  weightReminderTime?: string;
  zoneLeakfixerEnabled: boolean;
  zoneAiEnabled: boolean;
  zonePokerEnabled: boolean;
  zoneHealthEnabled: boolean;
  theme: string;
  hiddenWidgets?: string[];
}

export interface ActivityStats {
  activeRituals: number;
  completedTasks7Days: number;
  activeChains: number;
  completedChains: number;
  inProgressContent: number;
}

export const ALL_ACHIEVEMENT_DEFS = [
  {
    code: "GREAT_DAY_FIRST",
    emoji: "🌟",
    label: "Отличный день!",
    desc: "Набрать 80+ баллов за день",
  },
  { code: "QUALITY_WEEK", emoji: "🏆", label: "Неделя качества", desc: "7 дней подряд 70+ баллов" },
  { code: "STREAK_7", emoji: "🔥", label: "7 дней подряд", desc: "Серия из 7 дней" },
  { code: "STREAK_30", emoji: "💎", label: "Месяц силы", desc: "Серия из 30 дней" },
  { code: "WATER_WEEK", emoji: "💧", label: "Водный марафон", desc: "7 дней норма воды" },
  { code: "GYM_10", emoji: "💪", label: "Железный", desc: "10 тренировок выполнено" },
  {
    code: "CHALLENGE_FIRST",
    emoji: "🏆",
    label: "Первый вызов",
    desc: "Завершить первый челлендж",
  },
] as const;

export const LEAK_TYPE_LABELS_PROFILE: Record<string, string> = {
  low_energy: "Низкая энергия",
  chronic_low_energy: "Хроническая усталость",
  no_gym: "Мало тренировок",
  gym_dropout: "Бросил зал",
  ritual_consistency: "Непостоянство ритуалов",
  ritual_erosion: "Эрозия ритуалов",
  missed_checkins: "Пропуск чек-инов",
  calorie_spikes: "Скачки калорий",
  no_habits: "Нет привычек",
  weekend_ritual_drop: "Срыв в выходные",
  high_stress: "Высокий стресс",
  sleep_deficit: "Дефицит сна",
  expense_spike: "Скачок расходов",
  tracking_dropout: "Не ввожу данные",
  low_tracking: "Мало трекинга",
};
