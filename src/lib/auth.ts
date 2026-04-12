import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/server-auth";

export function getUserId(request: NextRequest): string | null {
  return getAuthSession(request)?.userId ?? null;
}

export async function getAuthUser(request: NextRequest): Promise<{
  id: string;
} | null> {
  const userId = getUserId(request);
  if (!userId) {
    return null;
  }

  return { id: userId };
}
