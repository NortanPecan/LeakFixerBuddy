import { Prisma } from "@prisma/client";

export type LeakActionLinkHealthCheckSummary = {
  removedLinks: number;
  patchedLinks: number;
};

interface LeakActionLinkHealthPlan {
  id: string;
  mode: string;
  actions: Array<{ id: string; kind: string; title: string }>;
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return { ...(metadata as Record<string, unknown>) };
}

async function entityExists(tx: Prisma.TransactionClient, entityType: string, entityId: string) {
  if (entityType === "task") {
    return Boolean(await tx.task.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
  if (entityType === "ritual") {
    return Boolean(await tx.ritual.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
  if (entityType === "challenge") {
    return Boolean(
      await tx.challenge.findUnique({ where: { id: entityId }, select: { id: true } })
    );
  }
  if (entityType === "content") {
    return Boolean(
      await tx.contentItem.findUnique({ where: { id: entityId }, select: { id: true } })
    );
  }
  if (entityType === "skill") {
    return Boolean(await tx.skill.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
  if (entityType === "trait") {
    return Boolean(await tx.trait.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
  return false;
}

export async function runLeakActionLinkHealthCheck(
  tx: Prisma.TransactionClient,
  leakId: string,
  plans: LeakActionLinkHealthPlan[]
): Promise<LeakActionLinkHealthCheckSummary> {
  const links = await tx.leakActionLink.findMany({
    where: { leakId },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      label: true,
      metadata: true,
      status: true,
    },
  });

  const actions = plans.flatMap((plan) =>
    plan.actions.map((action) => ({
      ...action,
      planId: plan.id,
      planMode: plan.mode,
      titleKey: action.title.trim().toLowerCase(),
    }))
  );
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  const actionsByKindTitle = new Map(
    actions.map((action) => [`${action.kind}|${action.titleKey}`, action])
  );

  let removedLinks = 0;
  let patchedLinks = 0;

  for (const link of links) {
    const exists = await entityExists(tx, link.entityType, link.entityId);
    if (!exists) {
      await tx.leakActionLink.delete({ where: { id: link.id } });
      removedLinks += 1;
      continue;
    }

    const metadata = normalizeMetadata(link.metadata);
    const sourceActionId =
      typeof metadata.sourceActionId === "string" && metadata.sourceActionId
        ? metadata.sourceActionId
        : null;
    const sourceActionKind =
      typeof metadata.sourceActionKind === "string" ? metadata.sourceActionKind : null;
    const sourceActionTitle =
      typeof metadata.sourceActionTitle === "string" ? metadata.sourceActionTitle : null;
    const byId = sourceActionId ? actionsById.get(sourceActionId) || null : null;
    const fallbackByKey =
      sourceActionKind && sourceActionTitle
        ? actionsByKindTitle.get(`${sourceActionKind}|${sourceActionTitle.trim().toLowerCase()}`) ||
          null
        : null;
    const fallbackByLabel =
      actionsByKindTitle.get(`${link.entityType}|${link.label.trim().toLowerCase()}`) || null;
    const resolvedAction = byId || fallbackByKey || fallbackByLabel;

    let changed = false;
    if (resolvedAction) {
      if (metadata.sourceActionId !== resolvedAction.id) {
        metadata.sourceActionId = resolvedAction.id;
        changed = true;
      }
      if (metadata.sourceActionTitle !== resolvedAction.title) {
        metadata.sourceActionTitle = resolvedAction.title;
        changed = true;
      }
      if (metadata.sourceActionKind !== resolvedAction.kind) {
        metadata.sourceActionKind = resolvedAction.kind;
        changed = true;
      }
      if (metadata.sourcePlanId !== resolvedAction.planId) {
        metadata.sourcePlanId = resolvedAction.planId;
        changed = true;
      }
      if (metadata.sourcePlanMode !== resolvedAction.planMode) {
        metadata.sourcePlanMode = resolvedAction.planMode;
        changed = true;
      }
      if (link.status !== "active") {
        changed = true;
      }
    } else if (sourceActionId || sourceActionKind || sourceActionTitle) {
      delete metadata.sourceActionId;
      delete metadata.sourceActionTitle;
      delete metadata.sourceActionKind;
      delete metadata.sourcePlanId;
      delete metadata.sourcePlanMode;
      changed = true;
    }

    if (changed) {
      await tx.leakActionLink.update({
        where: { id: link.id },
        data: {
          metadata: metadata as unknown as Prisma.InputJsonValue,
          status: "active",
        },
      });
      patchedLinks += 1;
    }
  }

  return { removedLinks, patchedLinks };
}
