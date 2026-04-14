import type { Screen } from "@/lib/store";
import { SPHERE_OPTIONS } from "@/features/leaks/lib/leak-constants";
import type {
  LeakActionEntityType,
  LeakEntity,
  LeakPlanFeedbackResult,
  LeakPolicyFunnel,
  LeakSource,
} from "@/features/leaks/types";

export function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

export function buildLeakMessage(leak: LeakEntity) {
  return leak.description?.trim() || leak.title;
}

export function getActionScreen(entityType: LeakActionEntityType): Screen {
  switch (entityType) {
    case "task":
      return "tasks";
    case "ritual":
      return "rituals";
    case "content":
      return "development";
    case "skill":
      return "skills";
    case "trait":
      return "traits";
    case "challenge":
    default:
      return "challenges";
  }
}

export function getActionLabel(entityType: LeakActionEntityType) {
  switch (entityType) {
    case "task":
      return "Задача";
    case "ritual":
      return "Ритуал";
    case "content":
      return "Материал";
    case "skill":
      return "Навык";
    case "trait":
      return "Качество";
    case "challenge":
    default:
      return "Челлендж";
  }
}

export function getSourceLabel(source: LeakSource) {
  switch (source) {
    case "manual":
      return "Ручной ввод";
    case "signal":
      return "Автосигнал";
    case "imported":
      return "Импорт";
    case "ai_suggested":
    default:
      return "AI";
  }
}

export function getFeedbackResultLabel(result: LeakPlanFeedbackResult) {
  if (result === "worked") return "Сработало";
  if (result === "partially") return "Частично";
  return "Не помогло";
}

export function getConfidenceLabelText(label: "low" | "medium" | "high") {
  if (label === "high") return "Высокий";
  if (label === "medium") return "Средний";
  return "Низкий";
}

export function getSphereLabel(sphere: string | null | undefined) {
  if (!sphere) return "Без сферы";

  const option = SPHERE_OPTIONS.find((item) => item.id === sphere);
  return option?.label || sphere;
}

export function getPolicyEventLabel(type: string) {
  switch (type) {
    case "policy_suggested":
      return "Совет предложен";
    case "policy_accepted":
      return "Совет принят";
    case "policy_rejected":
      return "Совет отклонён";
    case "policy_outcome":
      return "Результат совета";
    default:
      return type;
  }
}

export function getPolicyActionLabel(type: string | null | undefined) {
  if (!type) return "n/a";

  switch (type) {
    case "switch_mode":
      return "Смена режима";
    case "retry":
      return "Retry";
    case "regenerate_context":
      return "Пересбор контекста";
    case "focus_action":
      return "Фокус на шаг";
    case "generate":
      return "Генерация";
    case "create_entity":
      return "Создать сущность";
    case "give_feedback":
      return "Дать feedback";
    default:
      return type;
  }
}

export function getPolicyResultLabel(result: string | null | undefined) {
  if (!result) return null;
  if (result === "worked") return "Сработало";
  if (result === "partially") return "Частично";
  if (result === "not_worked") return "Не помогло";
  return result;
}

export function getPolicyUrgencyLabel(value: LeakPolicyFunnel["urgency"]) {
  if (value === "high") return "Высокая";
  if (value === "medium") return "Средняя";
  return "Низкая";
}

export function getPolicyNudgeLabel(value: LeakPolicyFunnel["recommendedNudge"]) {
  if (value === "accept_or_reject") return "Принять/отклонить совет";
  if (value === "create_entity") return "Создать сущность";
  if (value === "collect_feedback") return "Собрать outcome";
  return "Без срочного nudge";
}

export function getPolicyStuckSignalLabel(value: LeakPolicyFunnel["primaryStuckSignal"]) {
  if (value === "pending_feedback") return "Долго нет feedback";
  if (value === "no_entity_after_accept") return "Принято, но не запущено";
  if (value === "no_decision") return "Нет решения по совету";
  return "Нет блокировок";
}
