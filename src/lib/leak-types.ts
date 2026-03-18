/** Shared leak type labels — single source of truth for ProfileScreen + Telegram webhook */
export const LEAK_TYPE_LABELS: Record<string, string> = {
  low_energy: 'Низкая энергия',
  chronic_low_energy: 'Хроническая усталость',
  no_gym: 'Мало тренировок',
  gym_dropout: 'Бросил зал',
  ritual_consistency: 'Непостоянство ритуалов',
  ritual_erosion: 'Эрозия ритуалов',
  missed_checkins: 'Пропуск чек-инов',
  calorie_spikes: 'Скачки калорий',
  no_habits: 'Нет привычек',
  weekend_ritual_drop: 'Срыв в выходные',
  high_stress: 'Высокий стресс',
  sleep_deficit: 'Дефицит сна',
  expense_spike: 'Скачок расходов',
  tracking_dropout: 'Не ввожу данные',
  low_tracking: 'Мало трекинга',
}
