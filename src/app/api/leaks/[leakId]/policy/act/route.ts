import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";
import {
  appendRunJournal,
  compactSnapshot,
  normalizeSnapshot,
  type LeakPlanMode,
} from "@/lib/leak-policy";

const PolicyActSchema = z.object({
  userId: z.string().min(1),
  actionType: z.enum(["switch_mode", "retry", "regenerate_context", "focus_action"]),
  decision: z.enum(["accepted", "rejected"]).default("accepted"),
  reason: z.string().max(500).optional().nullable(),
  correlationId: z.string().min(1).optional(),
  targetMode: z.enum(["minimum", "base", "maximum"]).optional(),
  actionId: z.string().min(1).optional(),
  actionTitle: z.string().min(1).optional(),
  actionKind: z.string().min(1).optional(),
  factors: z
    .array(
      z.object({
        key: z.string().min(1),
        weight: z.number(),
        detail: z.string().optional(),
      })
    )
    .max(10)
    .optional(),
});

function getPolicyAttempt(
  snapshot: Record<string, unknown>,
  correlationId: string | null | undefined,
  decision: "accepted" | "rejected"
) {
  if (!correlationId) return 1;
  const journal = Array.isArray(snapshot.runJournal) ? snapshot.runJournal : [];
  const eventType = decision === "accepted" ? "policy_accepted" : "policy_rejected";
  const count = journal.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const event = item as Record<string, unknown>;
    return event.type === eventType && event.policyCorrelationId === correlationId;
  }).length;
  return count + 1;
}

export async function POST(request: NextRequest, context: { params: Promise<{ leakId: string }> }) {
  try {
    const body = await request.json();
    const parsed = PolicyActSchema.safeParse(body);
    const { leakId } = await context.params;
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid policy action payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      userId,
      actionType,
      decision,
      reason,
      correlationId,
      targetMode,
      actionId,
      actionTitle,
      actionKind,
      factors,
    } = parsed.data;
    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    const leak = await db.leak.findUnique({
      where: { id: leakId },
      select: {
        id: true,
        userId: true,
        status: true,
        contextSnapshot: true,
      },
    });
    if (!leak) return NextResponse.json({ error: "Leak not found" }, { status: 404 });
    if (leak.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let snapshot = normalizeSnapshot(leak.contextSnapshot);
    const now = new Date().toISOString();
    const eventType = decision === "accepted" ? "policy_accepted" : "policy_rejected";
    const attempt = getPolicyAttempt(snapshot, correlationId || null, decision);
    snapshot = appendRunJournal(snapshot, {
      type: eventType,
      at: now,
      policyCorrelationId: correlationId || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policyActionType: actionType as any,
      actionId: actionId || null,
      actionTitle: actionTitle || null,
      actionKind: actionKind || null,
      actor: "user",
      decision,
      attempt,
      factors: factors || [],
      note: reason || null,
    });

    let executed = false;
    let requiresRegenerate = false;

    if (decision === "accepted") {
      snapshot.activePolicyCorrelationId = correlationId || null;
      snapshot.activePolicyActionType = actionType;
      snapshot.activePolicyAcceptedAt = now;
      snapshot.activePolicyDecision = decision;
      snapshot.activePolicyAttempt = attempt;
      if (actionType === "switch_mode") {
        if (!targetMode) {
          return NextResponse.json(
            { error: "targetMode is required for switch_mode" },
            { status: 400 }
          );
        }
        await db.$transaction(async (tx) => {
          await tx.leakSolutionPlan.updateMany({
            where: { leakId },
            data: { isSelected: false },
          });
          await tx.leakSolutionPlan.updateMany({
            where: { leakId, mode: targetMode },
            data: { isSelected: true },
          });
          const txSnapshot = compactSnapshot(
            appendRunJournal(
              {
                ...snapshot,
                selectedPlanMode: targetMode,
                contextUpdatedAt: now,
              },
              {
                type: "mode_selected",
                at: now,
                mode: targetMode as LeakPlanMode,
                policyCorrelationId: correlationId || null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                policyActionType: actionType as any,
                actionId: actionId || null,
                actionTitle: actionTitle || null,
                actionKind: actionKind || null,
                actor: "user",
                attempt,
                factors: factors || [],
              }
            )
          );
          await tx.leak.update({
            where: { id: leakId },
            data: {
              contextSnapshot: txSnapshot as unknown as Prisma.InputJsonValue,
            },
          });
        });
        snapshot.selectedPlanMode = targetMode;
        executed = true;
      } else if (actionType === "retry") {
        snapshot.retry = {
          actionId: actionId || null,
          actionTitle: actionTitle || null,
          actionKind: actionKind || null,
          failureReason: reason || null,
          requestedAt: now,
        };
        if (leak.status === "resolved" || leak.status === "archived") {
          await db.leak.update({
            where: { id: leakId },
            data: {
              status: "in_progress",
              resolvedAt: null,
            },
          });
        }
        snapshot = appendRunJournal(snapshot, {
          type: "retry_started",
          at: now,
          actionId: actionId || null,
          actionTitle: actionTitle || null,
          actionKind: actionKind || null,
          policyCorrelationId: correlationId || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          policyActionType: actionType as any,
          actor: "user",
          attempt,
          factors: factors || [],
          note: reason || null,
        });
        executed = true;
      } else if (actionType === "regenerate_context") {
        snapshot.policyRegenerateRequestedAt = now;
        requiresRegenerate = true;
        executed = true;
      } else if (actionType === "focus_action") {
        snapshot.focusActionId = actionId || null;
        snapshot.focusActionTitle = actionTitle || null;
        snapshot.focusActionKind = actionKind || null;
        executed = true;
      }
    } else {
      snapshot.lastPolicyRejectedAt = now;
      snapshot.lastPolicyRejectedReason = reason || null;
    }

    snapshot.contextUpdatedAt = now;
    snapshot = compactSnapshot(snapshot);
    await db.leak.update({
      where: { id: leakId },
      data: {
        contextSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      executed,
      requiresRegenerate,
      attempt,
      snapshot,
    });
  } catch (error) {
    console.error("Error running policy action:", error);
    return NextResponse.json({ error: "Failed to execute policy action" }, { status: 500 });
  }
}
