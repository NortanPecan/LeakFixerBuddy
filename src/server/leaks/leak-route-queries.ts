import { db } from "@/lib/db";
import { ensureLeakBelongsToUser } from "@/server/leaks/leak-route-guards";

export async function loadConvertLeakForUser(leakId: string, userId: string) {
  const leak = await db.leak.findUnique({
    where: { id: leakId },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      severity: true,
      sphere: true,
      status: true,
      contextSnapshot: true,
    },
  });

  return ensureLeakBelongsToUser(leak, userId);
}

export async function loadPlanLeakForUser(leakId: string, userId: string) {
  const leak = await db.leak.findUnique({
    where: { id: leakId },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      severity: true,
      sphere: true,
      contextSnapshot: true,
    },
  });

  return ensureLeakBelongsToUser(leak, userId);
}

export async function loadPolicyLeakForUser(leakId: string, userId: string) {
  const leak = await db.leak.findUnique({
    where: { id: leakId },
    select: {
      id: true,
      userId: true,
      contextSnapshot: true,
    },
  });

  return ensureLeakBelongsToUser(leak, userId);
}

export async function loadFeedbackLeakForUser(leakId: string, userId: string) {
  const leak = await db.leak.findUnique({
    where: { id: leakId },
    select: { id: true, userId: true, title: true },
  });

  return ensureLeakBelongsToUser(leak, userId);
}
