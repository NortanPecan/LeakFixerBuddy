import type { InlineButton, InlineKeyboard } from "./tg-types";

export const TG_BUTTONS = [
  { id: "gym", emoji: "💪", label: "Зал" },
  { id: "food", emoji: "🍽️", label: "Питание" },
  { id: "water", emoji: "💧", label: "Вода" },
  { id: "rituals", emoji: "✅", label: "Ритуалы" },
  { id: "sleep", emoji: "😴", label: "Сон" },
  { id: "weight", emoji: "⚖️", label: "Вес" },
  { id: "mood", emoji: "😊", label: "Настроение" },
  { id: "energy", emoji: "⚡", label: "Энергия" },
  { id: "finance", emoji: "💰", label: "Финансы" },
  { id: "summary", emoji: "📊", label: "Сводка" },
  { id: "tasks", emoji: "📋", label: "Задачи" },
  { id: "leaks", emoji: "🔍", label: "Лики" },
  { id: "achievements", emoji: "🏅", label: "Достижения" },
  { id: "trainer", emoji: "🏋️", label: "Тренер" },
  { id: "challenges", emoji: "🏆", label: "Вызовы" },
] as const;

export function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}.${mm}.${yy}`;
}

export function backBtn(): InlineButton[][] {
  return [[{ text: "← Меню", callback_data: "btn_menu" }]];
}

export function buildMainMenuKeyboard(hiddenBtns: string[]): InlineKeyboard {
  const visible = TG_BUTTONS.filter((b) => !hiddenBtns.includes(`tg_${b.id}`));
  const rows: InlineButton[][] = [];
  for (let i = 0; i < visible.length; i += 3) {
    rows.push(
      visible.slice(i, i + 3).map((b) => ({
        text: `${b.emoji} ${b.label}`,
        callback_data: `btn_${b.id}`,
      }))
    );
  }
  rows.push([{ text: "⚙️ Настройки кнопок", callback_data: "btn_settings" }]);
  return rows;
}

export function buildSettingsKeyboard(hiddenBtns: string[]): InlineKeyboard {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < TG_BUTTONS.length; i += 2) {
    rows.push(
      TG_BUTTONS.slice(i, i + 2).map((b) => {
        const on = !hiddenBtns.includes(`tg_${b.id}`);
        return {
          text: `${b.emoji} ${b.label} ${on ? "✅" : "❌"}`,
          callback_data: `toggle_tg_${b.id}`,
        };
      })
    );
  }
  rows.push([{ text: "← Главное меню", callback_data: "btn_menu" }]);
  return rows;
}
