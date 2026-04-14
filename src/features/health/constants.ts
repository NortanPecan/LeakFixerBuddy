export const TIME_WINDOW_LABELS: Record<string, { label: string; emoji: string }> = {
  morning: { label: "Утро", emoji: "🌅" },
  day: { label: "День", emoji: "☀️" },
  evening: { label: "Вечер", emoji: "🌙" },
  any: { label: "Любое", emoji: "⏰" },
};

export const MEAL_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: "Завтрак", emoji: "🍳" },
  lunch: { label: "Обед", emoji: "🍽️" },
  dinner: { label: "Ужин", emoji: "🥗" },
  snack: { label: "Перекус", emoji: "🍎" },
  custom: { label: "Другое...", emoji: "🍴" },
};

export const QUALITY_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: "Полезно", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  neutral: { label: "Норм", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  bad: { label: "Вредно", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export const UNIT_OPTIONS = [
  { value: "мг", label: "мг" },
  { value: "г", label: "г" },
  { value: "табл", label: "таблетка" },
  { value: "капс", label: "капсула" },
  { value: "мл", label: "мл" },
  { value: "кап", label: "капля" },
];

export const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const DEFAULT_NEW_SUPPLEMENT = {
  name: "",
  dosage: "",
  unit: "мг",
  timeWindow: "any",
  days: [1, 2, 3, 4, 5, 6, 7],
};

export const DEFAULT_NEW_FOOD = {
  name: "",
  mealType: "snack",
  customMealType: "",
  time: "",
  calories: "",
  quality: "neutral",
  amount: "",
};

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
