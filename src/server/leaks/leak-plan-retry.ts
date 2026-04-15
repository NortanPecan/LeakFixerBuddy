import { db } from "@/lib/db";

export interface LeakPlanRetryFocusInput {
  retryActionId?: string;
  retryActionTitle?: string;
  retryActionKind?: string;
  retryFailureReason?: string;
}

export async function resolveLeakPlanRetryFocus(leakId: string, input: LeakPlanRetryFocusInput) {
  const fallback =
    input.retryActionTitle && input.retryActionTitle.trim().length > 0
      ? {
          actionId: input.retryActionId || null,
          actionTitle: input.retryActionTitle.trim(),
          actionKind: input.retryActionKind || null,
          failureReason: input.retryFailureReason || null,
        }
      : null;

  if (!input.retryActionId) return fallback;

  const action = await db.leakSolutionAction.findUnique({
    where: { id: input.retryActionId },
    include: {
      plan: {
        select: {
          leakId: true,
          mode: true,
        },
      },
      feedbacks: {
        where: { leakId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          comment: true,
        },
      },
    },
  });

  if (!action || action.plan.leakId !== leakId) return fallback;

  return {
    actionId: action.id,
    actionTitle: action.title,
    actionKind: action.kind,
    failureReason: input.retryFailureReason || action.feedbacks[0]?.comment || null,
  };
}
