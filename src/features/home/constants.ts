export const ONBOARDING_UNLOCKS: Array<{ id: string; unlockDay: number }> = [
  { id: "emotion", unlockDay: 8 },
  { id: "fleeting", unlockDay: 8 },
  { id: "weekly_leak_focus", unlockDay: 8 },
  { id: "weekly_report", unlockDay: 8 },
  { id: "monthly_report", unlockDay: 8 },
  { id: "finances_shortcut", unlockDay: 15 },
  { id: "buddy_shortcut", unlockDay: 15 },
];

export function isUnlocked(id: string, userDay: number): boolean {
  const config = ONBOARDING_UNLOCKS.find((u) => u.id === id);
  return config ? userDay >= config.unlockDay : true;
}

export const STREAK_MILESTONES: Record<number, { emoji: string; text: string }> = {
  7: { emoji: "🎯", text: "7 дней подряд! Первая неделя — самая сложная. Ты справился." },
  14: { emoji: "💪", text: "2 недели без пропусков! Привычка начинает формироваться." },
  21: { emoji: "🔥", text: "21 день — говорят, именно столько нужно для привычки. Ты у цели!" },
  30: { emoji: "🏆", text: "Целый месяц! Это уже не случайность — это характер." },
  60: { emoji: "🚀", text: "60 дней подряд — ты в 1% тех, кто не сдаётся." },
  90: {
    emoji: "💎",
    text: "90 дней! 3 месяца трансформации. Кто ты сейчас — лучше, чем 3 месяца назад.",
  },
};

export const LEAK_TYPE_LABELS: Record<string, string> = {
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

export function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}
