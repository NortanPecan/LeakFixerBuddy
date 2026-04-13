import { formatDate } from "@/features/leaks/lib/leak-formatters";
import type { LeakPlanMode, LeakRetryFocus } from "@/features/leaks/types";

export function getCurrentMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

export function getMinutesSince(date: string | null | undefined) {
  if (!date) return null;

  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return null;

  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

export function getContextSnapshotItems(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot) return [];

  const labels: Record<string, string> = {
    days: "Дни",
    analysisCount: "AI-анализов",
    whatWorked: "Что помогало",
    contextUpdatedAt: "Контекст обновлён",
    moodAvg: "Среднее настроение",
    energyAvg: "Средняя энергия",
    stressAvg: "Средний стресс",
    sleepHoursAvg: "Сон (часы)",
    sleepQualityAvg: "Качество сна",
    mealsLogged: "Записей еды",
    mealsWithBadQuality: "Плохих приёмов еды",
    caloriesAvg: "Средние калории",
    workoutsCompleted: "Тренировок",
    ritualsCompleted: "Выполнено ритуалов",
    waterAvg: "Средняя вода (мл)",
    waterTargetAvg: "Средняя цель воды (мл)",
    waterGoalHitRate: "Попадание в цель воды (%)",
    expenseSum7d: "Расход за 7 дней",
    incomeSum7d: "Доход за 7 дней",
    netCashflow7d: "Net cashflow за 7 дней",
    expenseDays7d: "Дней с расходами (7д)",
    openTasks: "Открытых задач",
    activeSupplements: "Активных добавок",
    supplementIntakeChecked7d: "Приёмов добавок (7д)",
    supplementAdherenceRate: "Дисциплина добавок (%)",
    emotionLogsCount7d: "Эмоций отмечено (7д)",
    emotionIntensityAvg: "Средняя интенсивность эмоций",
    negativeEmotionShare: "Негативные эмоции (%)",
    morningCheckins: "Утренних check-in",
    eveningCheckins: "Вечерних check-in",
    dayRatingAvg: "Средняя оценка дня",
    plannedEnergyAvg: "Планируемая энергия",
    doneTasks: "Выполнено задач",
    lookbackDays: "Глубина контекста (дней)",
    planActionsTotal: "Шагов в плане",
    linkedEntitiesTotal: "Создано сущностей",
    feedbackGivenTotal: "Feedback получено",
    feedbackCoverageRate: "Покрытие feedback (%)",
    feedbackWorkedCount: "Сработало (count)",
    feedbackPartiallyCount: "Частично (count)",
    feedbackFailedCount: "Не помогло (count)",
    latestFeedbackResult: "Последний feedback",
    latestFeedbackAt: "Последний feedback (дата)",
    latestFeedbackActionTitle: "Последний feedback (шаг)",
    recentFeedbackWindowSize: "Свежих feedback",
    recentFeedbackNegativeShare: "Негативный feedback (%)",
    recentFeedbackWorkedShare: "Рабочий feedback (%)",
    retryResolvedAt: "Retry закрыт",
    selectedPlanMode: "Выбранный режим",
    lastStableMode: "Последний стабильный режим",
    lastStableAt: "Режим стабилизировался",
  };

  const lines: string[] = [];

  const pushValue = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return;

    const label = labels[key] || key;

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : null))
        .filter((item): item is string => Boolean(item));

      if (normalized.length > 0) {
        lines.push(`${label}: ${normalized.join(", ")}`);
      }

      return;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      lines.push(`${label}: ${String(value)}`);
    }
  };

  Object.entries(contextSnapshot).forEach(([key, value]) => {
    if (key === "live" && value && typeof value === "object" && !Array.isArray(value)) {
      const live = value as Record<string, unknown>;
      if (typeof live.generatedAt === "string") {
        lines.push(`Контекст собран: ${formatDate(live.generatedAt)}`);
      }

      if (live.metrics && typeof live.metrics === "object" && !Array.isArray(live.metrics)) {
        const metrics = live.metrics as Record<string, unknown>;
        Object.entries(metrics).forEach(([metricKey, metricValue]) => {
          if (
            metricKey === "latestFeedbackResult" ||
            metricKey === "latestFeedbackAt" ||
            metricKey === "latestFeedbackActionTitle"
          ) {
            return;
          }

          pushValue(metricKey, metricValue);
        });

        const latestFeedbackResult =
          typeof metrics.latestFeedbackResult === "string" ? metrics.latestFeedbackResult : null;
        const latestFeedbackAt =
          typeof metrics.latestFeedbackAt === "string" ? metrics.latestFeedbackAt : null;
        const latestFeedbackActionTitle =
          typeof metrics.latestFeedbackActionTitle === "string"
            ? metrics.latestFeedbackActionTitle
            : null;

        if (latestFeedbackResult || latestFeedbackActionTitle || latestFeedbackAt) {
          const resultLabel =
            latestFeedbackResult === "worked"
              ? "Сработало"
              : latestFeedbackResult === "partially"
                ? "Частично"
                : latestFeedbackResult === "not_worked"
                  ? "Не помогло"
                  : latestFeedbackResult;
          const parts = [
            latestFeedbackActionTitle ? `шаг: ${latestFeedbackActionTitle}` : null,
            resultLabel ? `результат: ${resultLabel}` : null,
            latestFeedbackAt ? `дата: ${formatDate(latestFeedbackAt)}` : null,
          ].filter(Boolean);

          if (parts.length > 0) {
            lines.push(`Последний feedback: ${parts.join(" • ")}`);
          }
        }
      }

      if (typeof live.lookbackDays === "number") {
        pushValue("lookbackDays", live.lookbackDays);
      }

      return;
    }

    if (key === "history") {
      return;
    }

    if (key === "retry" && value && typeof value === "object" && !Array.isArray(value)) {
      const retry = value as Record<string, unknown>;
      if (typeof retry.actionTitle === "string") {
        lines.push(`Retry-фокус: ${retry.actionTitle}`);
      }
      if (typeof retry.failureReason === "string" && retry.failureReason.trim()) {
        lines.push(`Почему не сработало: ${retry.failureReason}`);
      }
      if (typeof retry.requestedAt === "string") {
        lines.push(`Retry запрошен: ${formatDate(retry.requestedAt)}`);
      }
      return;
    }

    if (key === "retryResolvedAt") {
      if (typeof value === "string") {
        lines.push(`Retry закрыт: ${formatDate(value)}`);
      }
      return;
    }

    pushValue(key, value);
  });

  return lines;
}

export function getRetryFocus(
  contextSnapshot?: Record<string, unknown> | null
): LeakRetryFocus | null {
  if (!contextSnapshot) return null;

  const retry =
    contextSnapshot.retry &&
    typeof contextSnapshot.retry === "object" &&
    !Array.isArray(contextSnapshot.retry)
      ? (contextSnapshot.retry as Record<string, unknown>)
      : null;
  if (!retry) return null;

  return {
    actionTitle: typeof retry.actionTitle === "string" ? retry.actionTitle : null,
    actionKind: typeof retry.actionKind === "string" ? retry.actionKind : null,
    failureReason: typeof retry.failureReason === "string" ? retry.failureReason : null,
    requestedAt: typeof retry.requestedAt === "string" ? retry.requestedAt : null,
  };
}

export function getLiveContextMetrics(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot || typeof contextSnapshot !== "object" || Array.isArray(contextSnapshot)) {
    return null;
  }

  const live =
    contextSnapshot.live &&
    typeof contextSnapshot.live === "object" &&
    !Array.isArray(contextSnapshot.live)
      ? (contextSnapshot.live as Record<string, unknown>)
      : null;

  return live?.metrics && typeof live.metrics === "object" && !Array.isArray(live.metrics)
    ? (live.metrics as Record<string, unknown>)
    : null;
}

export function getContextMetricNumber(
  contextSnapshot: Record<string, unknown> | null | undefined,
  key: string
) {
  const metrics = getLiveContextMetrics(contextSnapshot);
  if (!metrics) return null;

  return typeof metrics[key] === "number" ? metrics[key] : null;
}

export function getSnapshotHistory(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot || typeof contextSnapshot !== "object" || Array.isArray(contextSnapshot)) {
    return { linkedEntities: [], actionFeedback: [] } as const;
  }

  const history =
    contextSnapshot.history &&
    typeof contextSnapshot.history === "object" &&
    !Array.isArray(contextSnapshot.history)
      ? (contextSnapshot.history as Record<string, unknown>)
      : null;
  if (!history) {
    return { linkedEntities: [], actionFeedback: [] } as const;
  }

  const linkedEntities = Array.isArray(history.linkedEntities)
    ? history.linkedEntities
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          if (
            typeof row.entityType !== "string" ||
            typeof row.label !== "string" ||
            typeof row.createdAt !== "string"
          ) {
            return null;
          }

          return {
            entityType: row.entityType,
            label: row.label,
            sourceActionId: typeof row.sourceActionId === "string" ? row.sourceActionId : null,
            sourceActionTitle:
              typeof row.sourceActionTitle === "string" ? row.sourceActionTitle : null,
            sourceActionKind:
              typeof row.sourceActionKind === "string" ? row.sourceActionKind : null,
            sourcePlanMode: typeof row.sourcePlanMode === "string" ? row.sourcePlanMode : null,
            policyCorrelationId:
              typeof row.policyCorrelationId === "string" ? row.policyCorrelationId : null,
            reused: row.reused === true,
            createdAt: row.createdAt,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  const actionFeedback = Array.isArray(history.actionFeedback)
    ? history.actionFeedback
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          if (
            typeof row.actionTitle !== "string" ||
            typeof row.actionKind !== "string" ||
            typeof row.result !== "string" ||
            typeof row.updatedAt !== "string"
          ) {
            return null;
          }

          return {
            actionId: typeof row.actionId === "string" ? row.actionId : null,
            actionTitle: row.actionTitle,
            actionKind: row.actionKind,
            result: row.result,
            comment: typeof row.comment === "string" ? row.comment : null,
            policyCorrelationId:
              typeof row.policyCorrelationId === "string" ? row.policyCorrelationId : null,
            feedbackSource:
              row.feedbackSource === "manual" || row.feedbackSource === "policy"
                ? row.feedbackSource
                : null,
            attempt: typeof row.attempt === "number" ? Math.round(row.attempt) : null,
            updatedAt: row.updatedAt,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return { linkedEntities, actionFeedback } as const;
}

export function getRecentFeedbackTrend(contextSnapshot?: Record<string, unknown> | null) {
  const metrics = getLiveContextMetrics(contextSnapshot);
  if (!metrics) return null;

  const windowSize =
    typeof metrics.recentFeedbackWindowSize === "number" ? metrics.recentFeedbackWindowSize : null;
  const negativeShare =
    typeof metrics.recentFeedbackNegativeShare === "number"
      ? metrics.recentFeedbackNegativeShare
      : null;
  const workedShare =
    typeof metrics.recentFeedbackWorkedShare === "number"
      ? metrics.recentFeedbackWorkedShare
      : null;

  if (windowSize === null || windowSize <= 0 || negativeShare === null) return null;

  return {
    windowSize,
    negativeShare,
    workedShare,
    isRisky: windowSize >= 3 && negativeShare >= 67,
    isStable: windowSize >= 3 && workedShare !== null && workedShare >= 67 && negativeShare <= 33,
  };
}

export function buildContextHypotheses(contextSnapshot?: Record<string, unknown> | null) {
  const metrics = getLiveContextMetrics(contextSnapshot);
  if (!metrics) return [];

  const toNum = (key: string) =>
    typeof metrics[key] === "number" ? (metrics[key] as number) : null;
  const hypotheses: string[] = [];

  const energyAvg = toNum("energyAvg");
  const moodAvg = toNum("moodAvg");
  const sleepHoursAvg = toNum("sleepHoursAvg");
  const stressAvg = toNum("stressAvg");
  const workoutsCompleted = toNum("workoutsCompleted");
  const ritualsCompleted = toNum("ritualsCompleted");
  const mealsWithBadQuality = toNum("mealsWithBadQuality");
  const waterGoalHitRate = toNum("waterGoalHitRate");
  const netCashflow7d = toNum("netCashflow7d");
  const expenseDays7d = toNum("expenseDays7d");
  const openTasks = toNum("openTasks");
  const activeSupplements = toNum("activeSupplements");
  const supplementAdherenceRate = toNum("supplementAdherenceRate");
  const negativeEmotionShare = toNum("negativeEmotionShare");
  const planActionsTotal = toNum("planActionsTotal");
  const feedbackCoverageRate = toNum("feedbackCoverageRate");
  const feedbackWorkedCount = toNum("feedbackWorkedCount");
  const feedbackFailedCount = toNum("feedbackFailedCount");
  const latestFeedbackResult =
    typeof metrics.latestFeedbackResult === "string" ? metrics.latestFeedbackResult : null;
  const recentFeedbackWindowSize = toNum("recentFeedbackWindowSize");
  const recentFeedbackNegativeShare = toNum("recentFeedbackNegativeShare");
  const recentFeedbackWorkedShare = toNum("recentFeedbackWorkedShare");

  if (sleepHoursAvg !== null && sleepHoursAvg < 6.5) {
    hypotheses.push(
      "Наблюдение: недосып может усиливать leak. Стоит проверить связь сна и срывов."
    );
  }
  if (stressAvg !== null && stressAvg >= 7) {
    hypotheses.push(
      "Наблюдение: высокий стресс совпадает с leak. Проверь, нужен ли anti-stress шаг в режиме."
    );
  }
  if (energyAvg !== null && energyAvg <= 5) {
    hypotheses.push(
      "Наблюдение: низкая энергия — вероятный триггер leak. Имеет смысл добавить более лёгкий режим."
    );
  }
  if (moodAvg !== null && moodAvg <= 5) {
    hypotheses.push(
      "Наблюдение: просадка настроения совпадает с leak. Полезно добавить быстрый стабилизирующий ритуал."
    );
  }
  if (workoutsCompleted !== null && workoutsCompleted === 0) {
    hypotheses.push(
      "Наблюдение: в окне контекста нет тренировок. Проверь влияние движения на устойчивость к leak."
    );
  }
  if (ritualsCompleted !== null && ritualsCompleted <= 2) {
    hypotheses.push(
      "Наблюдение: ритуалы выполнялись редко. Возможно, leak связан с потерей структуры дня."
    );
  }
  if (mealsWithBadQuality !== null && mealsWithBadQuality >= 3) {
    hypotheses.push(
      "Наблюдение: качество питания часто проседает. Стоит проверить, не усиливает ли это leak."
    );
  }
  if (waterGoalHitRate !== null && waterGoalHitRate < 50) {
    hypotheses.push(
      "Наблюдение: вода часто ниже цели. Проверь, влияет ли гидратация на устойчивость к leak."
    );
  }
  if (expenseDays7d !== null && expenseDays7d >= 5) {
    hypotheses.push(
      "Наблюдение: почти каждый день есть расходы. Проверь импульсные траты как триггер leak."
    );
  }
  if (netCashflow7d !== null && netCashflow7d < 0) {
    hypotheses.push(
      "Наблюдение: cashflow за неделю отрицательный. Для leak в финансах нужен более жёсткий minimum-режим."
    );
  }
  if (openTasks !== null && openTasks >= 18) {
    hypotheses.push(
      "Наблюдение: накопилось много открытых задач. Leak может усиливаться из-за перегруза и распыления."
    );
  }
  if (
    activeSupplements !== null &&
    activeSupplements > 0 &&
    supplementAdherenceRate !== null &&
    supplementAdherenceRate < 50
  ) {
    hypotheses.push(
      "Наблюдение: низкая дисциплина по добавкам. Это может усиливать просадки в энергии и устойчивости."
    );
  }
  if (negativeEmotionShare !== null && negativeEmotionShare >= 60) {
    hypotheses.push(
      "Наблюдение: преобладают негативные эмоции. Для leak полезно добавить шаг на стабилизацию состояния."
    );
  }
  if (
    planActionsTotal !== null &&
    planActionsTotal > 0 &&
    feedbackCoverageRate !== null &&
    feedbackCoverageRate < 50
  ) {
    hypotheses.push(
      "Наблюдение: по части шагов нет feedback. Закрой цикл обратной связи, чтобы learning работал точнее."
    );
  }
  if (
    feedbackWorkedCount !== null &&
    feedbackFailedCount !== null &&
    feedbackFailedCount > feedbackWorkedCount &&
    feedbackFailedCount >= 2
  ) {
    hypotheses.push(
      "Наблюдение: нерабочих шагов больше, чем сработавших. Имеет смысл перейти на другой режим и пересобрать план."
    );
  }
  if (latestFeedbackResult === "not_worked") {
    hypotheses.push(
      "Наблюдение: последний feedback отрицательный. Лучше быстро сделать retry с фокусом на этот шаг, пока контекст свежий."
    );
  }
  if (
    recentFeedbackWindowSize !== null &&
    recentFeedbackWindowSize >= 3 &&
    recentFeedbackNegativeShare !== null &&
    recentFeedbackNegativeShare >= 67
  ) {
    hypotheses.push(
      "Наблюдение: последние шаги часто не срабатывают. Стоит временно упростить режим до minimum и проверить базовые триггеры."
    );
  }
  if (
    recentFeedbackWindowSize !== null &&
    recentFeedbackWindowSize >= 3 &&
    recentFeedbackWorkedShare !== null &&
    recentFeedbackWorkedShare >= 67
  ) {
    hypotheses.push(
      "Наблюдение: большинство последних шагов сработали. Можно закреплять режим и постепенно масштабировать его."
    );
  }

  return hypotheses.slice(0, 3);
}

export function getSnapshotMode(
  contextSnapshot: Record<string, unknown> | null | undefined,
  key: "selectedPlanMode" | "lastStableMode"
): LeakPlanMode | null {
  if (!contextSnapshot || typeof contextSnapshot !== "object" || Array.isArray(contextSnapshot)) {
    return null;
  }

  const value = contextSnapshot[key];
  if (value !== "minimum" && value !== "base" && value !== "maximum") {
    return null;
  }

  return value;
}
