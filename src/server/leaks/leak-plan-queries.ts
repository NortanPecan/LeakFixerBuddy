import { db } from "@/lib/db";

export function loadLeakPlansWithFeedback(leakId: string) {
  return db.leakSolutionPlan.findMany({
    where: { leakId },
    include: {
      actions: {
        include: {
          feedbacks: {
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ isSelected: "desc" }, { createdAt: "asc" }],
  });
}
