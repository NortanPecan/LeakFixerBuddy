export function getPayloadObject(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload as Record<string, unknown>;
}

export function toDateFromHint(hint: unknown): Date | null {
  if (typeof hint !== "string" || !hint.trim()) return null;

  const key = hint.trim().toLowerCase();
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (key === "today") return date;
  if (key === "tomorrow") {
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (key === "this_week") {
    date.setDate(date.getDate() + 3);
    return date;
  }
  if (key === "next_week") {
    date.setDate(date.getDate() + 7);
    return date;
  }

  const parsed = new Date(hint);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}
