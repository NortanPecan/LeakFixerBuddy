import { LEAK_GUIDANCE_STYLES, PLAN_MODE_LABELS } from "@/features/leaks/lib/leak-constants";
import {
  getLatestPlanFeedback,
  getSelectedPlan,
  isConvertedPlanAction,
} from "@/features/leaks/lib/leak-selectors";
import type {
  LeakEntity,
  LeakGuidance,
  LeakGuidanceTone,
  LeakSolutionPlan,
} from "@/features/leaks/types";

export type { LeakGuidanceAction, LeakGuidanceTone } from "@/features/leaks/types";

export function getPlanActionAnchorId(leakId: string, actionId: string) {
  return `leak-plan-action-${leakId}-${actionId}`;
}

export function buildLeakGuidance(leak: LeakEntity, plans?: LeakSolutionPlan[]): LeakGuidance {
  const selectedPlan = getSelectedPlan(plans);

  if (!selectedPlan) {
    return {
      tone: "indigo",
      title: "Собери три режима решения",
      description:
        "Minimum, base и maximum помогут быстро выбрать реалистичный путь, а не зависнуть на одном совете.",
      action: "generate",
      actionLabel: "Сделать 3 плана",
      selectedPlan: null,
      totalActions: 0,
      createdActions: 0,
      workedActions: 0,
      partialActions: 0,
      failedActions: 0,
      pendingActions: 0,
      feedbackActions: 0,
      bottleneckText: "Нет выбранного режима: сначала собери минимум/base/maximum.",
      bottleneckActionId: null,
    };
  }

  const totalActions = selectedPlan.actions.length;
  const createdActions = selectedPlan.actions.filter(isConvertedPlanAction).length;
  const workedActions = selectedPlan.actions.filter(
    (action) => getLatestPlanFeedback(action)?.result === "worked"
  ).length;
  const partialActions = selectedPlan.actions.filter(
    (action) => getLatestPlanFeedback(action)?.result === "partially"
  ).length;
  const failedActions = selectedPlan.actions.filter(
    (action) => getLatestPlanFeedback(action)?.result === "not_worked"
  ).length;
  const feedbackActions = workedActions + partialActions + failedActions;
  const pendingActions = Math.max(totalActions - createdActions, 0);
  const firstPendingAction =
    selectedPlan.actions.find((action) => !isConvertedPlanAction(action)) || null;
  const firstNoFeedbackAction =
    selectedPlan.actions.find(
      (action) => isConvertedPlanAction(action) && !getLatestPlanFeedback(action)
    ) || null;
  const firstFailedAction =
    selectedPlan.actions.find((action) => getLatestPlanFeedback(action)?.result === "not_worked") ||
    null;

  if (leak.status === "resolved" || leak.status === "archived") {
    return {
      tone: "indigo",
      title: "Leak сейчас закрыт",
      description:
        failedActions > 0 || partialActions > 0 || pendingActions > 0
          ? "Если проблема вернулась, верни leak в работу и продолжай уже с обновлённым режимом."
          : "Если симптом вернётся, его можно быстро вернуть в работу без создания нового leak.",
      action: "reopen",
      actionLabel: "Вернуть в работу",
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText:
        firstFailedAction?.title ||
        firstNoFeedbackAction?.title ||
        firstPendingAction?.title ||
        "Leak закрыт, но можно вернуть в работу при повторении симптома.",
      bottleneckActionId:
        firstFailedAction?.id || firstNoFeedbackAction?.id || firstPendingAction?.id || null,
    };
  }

  if (failedActions > 0) {
    return {
      tone: "amber",
      title: "Часть решений не сработала",
      description:
        "Пересобери план или выбери другой режим, чтобы не застрять на нерабочем сценарии.",
      action: "retry",
      actionLabel: "Попробовать заново",
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: firstFailedAction
        ? `Сбойный шаг: ${firstFailedAction.title}`
        : "Есть неуспешные шаги, лучше пересобрать подход.",
      bottleneckActionId: firstFailedAction?.id || null,
    };
  }

  if (pendingActions > 0) {
    return {
      tone: "indigo",
      title: `Выбран режим «${PLAN_MODE_LABELS[selectedPlan.mode]}»`,
      description: `Создано ${createdActions} из ${totalActions} действий. Остальные можно применить по одному или целиком.`,
      action: null,
      actionLabel: "",
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: firstPendingAction
        ? `Не создано: ${firstPendingAction.title}`
        : "Есть неприменённые шаги в выбранном режиме.",
      bottleneckActionId: firstPendingAction?.id || null,
    };
  }

  if (createdActions > 0 && feedbackActions < createdActions) {
    return {
      tone: "amber",
      title: "План уже применён",
      description:
        "Теперь важно отметить, что реально помогло, чтобы leak-модуль учился на живом опыте.",
      action: null,
      actionLabel: "",
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: firstNoFeedbackAction
        ? `Нет feedback: ${firstNoFeedbackAction.title}`
        : "Не по всем созданным шагам есть feedback.",
      bottleneckActionId: firstNoFeedbackAction?.id || null,
    };
  }

  if (workedActions > 0) {
    return {
      tone: "emerald",
      title: "Есть рабочие решения",
      description: `Сработало ${workedActions} действий. Если проблема больше не возвращается, можно закрывать leak.`,
      action: "resolve",
      actionLabel: "Отметить решённым",
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: "Есть рабочие шаги: зафиксируй результат и закрой leak, если симптом ушёл.",
      bottleneckActionId: null,
    };
  }

  if (partialActions > 0) {
    return {
      tone: "amber",
      title: "Можно усилить текущий подход",
      description:
        "Что-то уже помогает, но не полностью. Пересобери режим или попробуй другой сценарий.",
      action: "retry",
      actionLabel: "Усилить план",
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: "Есть частично успешные шаги: стоит усилить режим или сменить сценарий.",
      bottleneckActionId: null,
    };
  }

  return {
    tone: "indigo",
    title: "План готов к следующему шагу",
    description:
      "Можно открыть созданные сущности, собрать новый режим или уточнить leak, если контекст изменился.",
    action: "retry",
    actionLabel: "Пересобрать план",
    selectedPlan,
    totalActions,
    createdActions,
    workedActions,
    partialActions,
    failedActions,
    pendingActions,
    feedbackActions,
    bottleneckText:
      "Критичных блокеров нет: можно тестировать следующий шаг или уточнять контекст.",
    bottleneckActionId: null,
  };
}

export function isLeakGuidanceTone(value: string): value is LeakGuidanceTone {
  return value in LEAK_GUIDANCE_STYLES;
}
