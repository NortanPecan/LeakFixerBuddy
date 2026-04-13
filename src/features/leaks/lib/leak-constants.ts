import type {
  LeakConfidenceLabel,
  LeakGroupOption,
  LeakPlanActionKind,
  LeakPlanMode,
  LeakSeverity,
  LeakSourceFilter,
  LeakStatus,
  LeakStatusFilter,
  LeakSortOption,
} from "@/features/leaks/types";

export const SEVERITY_OPTIONS: Array<{
  id: LeakSeverity;
  label: string;
  description: string;
}> = [
  { id: "info", label: "Сигнал", description: "Наблюдение, которое стоит проверить" },
  { id: "warning", label: "Проблема", description: "Повторяется и уже мешает" },
  { id: "critical", label: "Срочно", description: "Сильно влияет и требует реакции" },
];

export const STATUS_OPTIONS: Array<{ id: LeakStatusFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "new", label: "Новые" },
  { id: "in_progress", label: "В работе" },
  { id: "resolved", label: "Решённые" },
  { id: "archived", label: "Архив" },
];

export const SOURCE_OPTIONS: Array<{ id: LeakSourceFilter; label: string }> = [
  { id: "all", label: "Все источники" },
  { id: "manual", label: "Ручные" },
  { id: "signal", label: "Сигналы" },
  { id: "ai_suggested", label: "AI" },
  { id: "imported", label: "Импорт" },
];

export const SORT_OPTIONS: Array<{ id: LeakSortOption; label: string }> = [
  { id: "updated_desc", label: "Сначала обновлённые" },
  { id: "created_desc", label: "Сначала новые" },
  { id: "severity_desc", label: "Сначала критичные" },
];

export const GROUP_OPTIONS: Array<{ id: LeakGroupOption; label: string }> = [
  { id: "none", label: "Без групп" },
  { id: "sphere", label: "По сфере" },
  { id: "source", label: "По источнику" },
];

export const STATUS_LABELS: Record<LeakStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  resolved: "Решён",
  archived: "Архив",
};

export const STATUS_STYLES: Record<LeakStatus, string> = {
  new: "bg-white/10 text-white/80 border-white/10",
  in_progress: "bg-indigo-500/10 text-indigo-200 border-indigo-500/20",
  resolved: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
  archived: "bg-white/5 text-white/45 border-white/10",
};

export const SEVERITY_STYLES: Record<LeakSeverity, string> = {
  info: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  critical: "bg-rose-500/10 text-rose-300 border-rose-500/20",
};

export const PLAN_MODE_LABELS: Record<LeakPlanMode, string> = {
  minimum: "Минимум",
  base: "База",
  maximum: "Максимум",
};

export const PLAN_MODE_STYLES: Record<LeakPlanMode, string> = {
  minimum: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  base: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
  maximum: "bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/20",
};

export const PLAN_CONFIDENCE_STYLES: Record<LeakConfidenceLabel, string> = {
  low: "bg-rose-500/10 text-rose-200 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-200 border-amber-500/20",
  high: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
};

export const PLAN_KIND_LABELS: Record<LeakPlanActionKind, string> = {
  task: "Задача",
  ritual: "Ритуал",
  skill: "Навык",
  trait: "Качество",
  challenge: "Челлендж",
  content: "Материал",
};

export const SPHERE_OPTIONS = [
  { id: "work", label: "Работа" },
  { id: "body", label: "Тело" },
  { id: "relationships", label: "Отношения" },
  { id: "mindset", label: "Мышление" },
  { id: "finance", label: "Финансы" },
  { id: "learning", label: "Развитие" },
  { id: "poker", label: "Покер" },
] as const;

export const LEAK_GUIDANCE_STYLES = {
  indigo: "border-indigo-500/20 bg-indigo-500/10",
  emerald: "border-emerald-500/20 bg-emerald-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
} as const;

export const SHOW_POLICY_INSPECTOR = false;
export const SHOW_FUNNELS = false;
export const SHOW_PRIORITY_PENDING_QUEUE = false;
export const SHOW_PATTERN_ANALYTICS = false;
