import type { LeakPolicyFunnel } from "@/features/leaks/types";

export function getFunnelStageLabel(stage: LeakPolicyFunnel["stage"]): string {
  switch (stage) {
    case "suggested":
      return "?????";
    case "accepted":
      return "??????";
    case "awaiting_feedback":
      return "???? feedback";
    case "learning":
      return "learning";
    case "completed":
      return "????????";
    case "rejected":
      return "????????";
    default:
      return "??? ?????";
  }
}
