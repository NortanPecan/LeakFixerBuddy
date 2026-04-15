import { NextResponse } from "next/server";

export type RouteGuardResult<T> = { data: T } | { error: NextResponse };

export function ensureLeakBelongsToUser<T extends { userId: string }>(
  leak: T | null,
  userId: string
): RouteGuardResult<T> {
  if (!leak) {
    return { error: NextResponse.json({ error: "Leak not found" }, { status: 404 }) };
  }

  if (leak.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { data: leak };
}
