import type { FoodParseResult } from "./tg-types";

// ─── Regex commands ─────────────────────────────────────────────────────────

export const WATER_RE = /^(?:вода|water)\s+(\d+(?:[.,]\d+)?)\s*(?:мл|ml)?$/i;
export const WEIGHT_RE = /^(?:вес|weight|вага)\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?$/i;
export const MOOD_RE = /^(?:настроение|mood|настр)\s+(\d+(?:[.,]\d+)?)$/i;
export const ENERGY_RE = /^(?:энергия|energy|энерг)\s+(\d+(?:[.,]\d+)?)$/i;
export const FOOD_CMD_RE = /^(?:ел|ела|еда|съел|съела|food|ate)\s+/i;
export const GYM_RE =
  /^(?:зал|gym|трен(?:ировка)?)\s*(?:(\d+(?:[.,]\d+)?)\s*(?:мин|min|минут)?)?$/i;
export const TASK_RE = /^(?:задача|задание|task)\s+(.+)$/i;
export const RITUALS_RE = /^(?:ритуалы|ритуал|rituals?)$/i;
export const SLEEP_RE = /^(?:сон|sleep)\s+(\d+(?:[.,]\d+)?)\s*(?:ч|ч\.|часов?|час|hour|h)?$/i;
export const SUMMARY_RE = /^(?:сводка|отчёт|отчет|report|summary|итог|итоги)$/i;
export const INCOME_RE =
  /^(?:доход|income|заработал|заработала|получил|получила)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i;
export const EXPENSE_RE =
  /^(?:расход|расходы|потратил|потратила|купил|купила|expense)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i;
export const MENU_RE = /^(?:меню|menu|\/start|\/menu)$/i;
export const HELP_RE = /^(?:помощь|help|старт|start|команды)$/i;
export const LEAK_RE = /^(?:лик|leak|утечка)\s+(.+)$/i;
export const ACHIEVEMENTS_RE =
  /^(?:ачивменты|ачивмент|достижения|достижение|achievement|badge|бейдж)$/i;
export const TRAINER_RE = /^(?:\/тренер|тренер)(?:\s+(.+))?$/i;
export const WEEK_RE = /^(?:неделя|итоги недели|дайджест недели|week summary)$/i;
export const CHALLENGES_RE = /^(?:вызовы|вызов|челленджи|челлендж|challenges?)$/i;

// ─── Food parser constants ────────────────────────────────────────────────────

export const METRIC_UNIT_RE = /^(г|гр|г\.|кг|мл|л)$/i;
export const FOOD_WEIGHT_UNITS =
  "г|гр|г\\.|кг|мл|л|кусо?к(?:а|ов)?|порци(?:я|ю|и|й)?|шт\\.?|ложк(?:а|и|ек)?|стакан(?:а|ов)?|банк(?:а|и)?";

// ─── Food entry parser ────────────────────────────────────────────────────────
//
// Supported formats (Variant B — 2 bare numbers = weight + kcal/100g):
//   ел пицца 800               → name=пицца, kcal=800 (total, backward compat)
//   ел доширак 70 440          → 70г, 440kcal/100g → 308 kcal
//   ел доширак 70 440 17 8 54  → + БЖУ per 100g → auto-calculated per portion
//   ел молоко 300мл 64         → 300мл, 64kcal/100ml → 192 kcal
//   ел курица 2 куска 440      → count unit → 440 kcal (total for that amount)
//   ел яйцо                    → just name, no kcal
//
// Metric units (г/гр/кг/мл/л): kcal interpreted as per 100g → calculate actual
// Count units (кусок/порция/шт…): kcal interpreted as total
// If БЖУ present without weight: treated as actual grams for the portion (divisor=1)

export function parseFoodEntry(text: string): FoodParseResult | null {
  const body = text.replace(FOOD_CMD_RE, "").trim();
  if (!body) return null;

  let remaining = body;
  let proteinPer100: number | null = null;
  let fatPer100: number | null = null;
  let carbsPer100: number | null = null;

  // Step 1: extract trailing BJU (3 numbers ≤ 100 each = per 100g values)
  const bjuRe = /^(.*)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/;
  const bjuMatch = remaining.match(bjuRe);
  if (bjuMatch) {
    const b = parseFloat(bjuMatch[2].replace(",", "."));
    const f = parseFloat(bjuMatch[3].replace(",", "."));
    const c = parseFloat(bjuMatch[4].replace(",", "."));
    if (b <= 100 && f <= 100 && c <= 100) {
      proteinPer100 = b;
      fatPer100 = f;
      carbsPer100 = c;
      remaining = bjuMatch[1].trim();
    }
  }

  // Step 2: extract kcal (last number, optional ккал suffix)
  let kcalNum: number | null = null;
  const kcalRe = /^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(?:ккал|кал|cal|kcal)?$/i;
  const kcalMatch = remaining.match(kcalRe);
  if (kcalMatch && kcalMatch[1].trim()) {
    kcalNum = parseFloat(kcalMatch[2].replace(",", "."));
    remaining = kcalMatch[1].trim();
  }

  // Step 3: extract weight/amount before kcal
  let amountNum: number | null = null;
  let amountUnit = "г";
  let amountStr: string | null = null;
  let isMetric = true;

  if (kcalNum !== null) {
    // Try explicit unit: "70г", "300 мл", "2 куска"
    const unitRe = new RegExp(`^(.*?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${FOOD_WEIGHT_UNITS})$`, "i");
    const unitMatch = remaining.match(unitRe);
    if (unitMatch && unitMatch[1].trim()) {
      amountNum = parseFloat(unitMatch[2].replace(",", "."));
      amountUnit = unitMatch[3].toLowerCase();
      amountStr = `${unitMatch[2]}${amountUnit}`;
      isMetric = METRIC_UNIT_RE.test(amountUnit);
      remaining = unitMatch[1].trim();
    } else {
      // Variant B: bare number at end = weight in grams
      const bareRe = /^(.*?)\s+(\d+(?:[.,]\d+)?)$/;
      const bareMatch = remaining.match(bareRe);
      if (bareMatch && bareMatch[1].trim()) {
        amountNum = parseFloat(bareMatch[2].replace(",", "."));
        amountUnit = "г";
        amountStr = `${bareMatch[2]}г`;
        isMetric = true;
        remaining = bareMatch[1].trim();
      }
    }
  }

  const name = remaining.trim();
  if (!name) return null;

  // Step 4: calculate actual kcal & BJU for the portion
  let actualKcal: number | null = null;
  let divisor = 1.0;
  let kcalPer100: number | null = null;

  if (amountNum !== null && kcalNum !== null && isMetric) {
    // Metric → kcal/100g → calculate actual
    const baseGrams = /^кг$|^л$/i.test(amountUnit) ? amountNum * 1000 : amountNum;
    divisor = baseGrams / 100;
    actualKcal = Math.round((baseGrams * kcalNum) / 100);
    kcalPer100 = kcalNum;
  } else if (kcalNum !== null) {
    // Count unit or no weight → kcal is total
    actualKcal = Math.round(kcalNum);
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    name,
    calories: actualKcal,
    amount: amountStr,
    protein: proteinPer100 !== null ? round1(proteinPer100 * divisor) : null,
    fat: fatPer100 !== null ? round1(fatPer100 * divisor) : null,
    carbs: carbsPer100 !== null ? round1(carbsPer100 * divisor) : null,
    kcalPer100,
  };
}

// ─── New exercise parser ───────────────────────────────────────────────────
//
// Supported formats:
//   Жим 4x12 75кг  → name=Жим, sets=4, reps=12, weight=75
//   Жим 4x12       → name=Жим, sets=4, reps=12, weight=null
//   Жим 75кг       → name=Жим, sets=null, reps=null, weight=75
//   Жим            → name=Жим, sets=null, reps=null, weight=null

export function parseNewExercise(text: string): {
  name: string;
  targetSets: number | null;
  targetReps: number | null;
  weight: number | null;
} | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Name + NxM + weight[кг]
  let m = trimmed.match(/^(.+?)\s+(\d+)\s*[xхXХ×*]\s*(\d+)\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?\s*$/i);
  if (m)
    return {
      name: m[1].trim(),
      targetSets: parseInt(m[2]),
      targetReps: parseInt(m[3]),
      weight: parseFloat(m[4].replace(",", ".")),
    };

  // Name + NxM only
  m = trimmed.match(/^(.+?)\s+(\d+)\s*[xхXХ×*]\s*(\d+)\s*$/i);
  if (m)
    return {
      name: m[1].trim(),
      targetSets: parseInt(m[2]),
      targetReps: parseInt(m[3]),
      weight: null,
    };

  // Name + weight with explicit кг unit
  m = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\s*$/i);
  if (m)
    return {
      name: m[1].trim(),
      targetSets: null,
      targetReps: null,
      weight: parseFloat(m[2].replace(",", ".")),
    };

  // Just a name
  return { name: trimmed, targetSets: null, targetReps: null, weight: null };
}

// ─── Leak classifier (keyword-based) ──────────────────────────────────────

export function classifyLeakFromText(text: string): string {
  const t = text.toLowerCase();
  if (/(?:трен|зал|gym|спорт|качал|упражн)/.test(t)) {
    if (/(?:бросил|перестал|не хожу|забил|пропускаю|dropout)/.test(t)) return "gym_dropout";
    return "no_gym";
  }
  if (/(?:усталост|нет сил|мало энерги|низкая энерги|не могу встать|вялост)/.test(t))
    return "low_energy";
  if (/(?:хронич|всегда устал|постоянно нет сил)/.test(t)) return "chronic_low_energy";
  if (/(?:ритуал|привычк|habit|не делаю)/.test(t)) return "ritual_consistency";
  if (/(?:сон|сплю|недосып|sleep|ложусь поздно)/.test(t)) return "sleep_deficit";
  if (/(?:стресс|тревог|переживаю|нервничаю|anxiety)/.test(t)) return "high_stress";
  if (/(?:расход|трачу|деньги|финанс|покупк)/.test(t)) return "expense_spike";
  if (/(?:срыв|снова|опять|чекап|не заполняю)/.test(t)) return "tracking_dropout";
  if (/(?:еда|питание|переел|food|калори)/.test(t)) return "calorie_spikes";
  return "low_energy"; // generic fallback
}

// ─── Exercise line formatter ────────────────────────────────────────────────

export function formatExerciseLine(
  ex: {
    name: string;
    targetSets: number;
    targetReps: number | null;
    weight: number | null;
    nextWeight: number | null;
    sets: { weight: number | null; reps: number | null; isWarmup: boolean; completed: boolean }[];
  },
  isPR: boolean
): string {
  const workingSets = ex.sets.filter((s) => !s.isWarmup && s.completed);
  const setsCount = workingSets.length || ex.targetSets || 4;
  const reps = ex.targetReps || (workingSets[0]?.reps ?? 12);
  const w = workingSets[0]?.weight ?? ex.weight;

  let line = `${ex.name} — ${setsCount}х${reps}`;
  if (w) {
    line += `х${w}кг`;
    if (ex.nextWeight && ex.nextWeight !== w) line += `(${ex.nextWeight})`;
  }
  if (isPR) line += " 🏆";
  return line;
}
