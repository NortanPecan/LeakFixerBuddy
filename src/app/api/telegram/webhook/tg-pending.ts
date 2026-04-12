import { db } from "@/lib/db";
import type { PendingPayload } from "./tg-types";

export const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function storePending(userId: string, payload: PendingPayload): Promise<void> {
  // Store one pending per user — upsert via delete+create since no unique key on text
  // Use a Note with special zone as lightweight KV
  await db.note.deleteMany({ where: { userId, zone: "__tg_pending" } });
  await db.note.create({
    data: {
      userId,
      text: JSON.stringify(payload),
      zone: "__tg_pending",
      type: "thought",
      date: new Date(),
    },
  });
  // NOTE: do NOT store in FleetingThought — it would show raw JSON in the app's fleeting thoughts section
}

export async function getPendingForUserId(userId: string): Promise<PendingPayload | null> {
  const note = await db.note.findFirst({
    where: { userId, zone: "__tg_pending" },
    orderBy: { date: "desc" },
  });
  if (!note) return null;
  try {
    return JSON.parse(note.text) as PendingPayload;
  } catch {
    return null;
  }
}

export async function clearPendingForUserId(userId: string): Promise<void> {
  await db.note.deleteMany({ where: { userId, zone: "__tg_pending" } });
}

export async function getHiddenTgButtons(userId: string): Promise<string[]> {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { hiddenWidgets: true },
  });
  const widgets = (settings?.hiddenWidgets as string[] | null) ?? [];
  return widgets.filter((w) => w.startsWith("tg_"));
}

export async function toggleTgButton(userId: string, btnId: string): Promise<boolean> {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { hiddenWidgets: true },
  });
  const widgets = (settings?.hiddenWidgets as string[] | null) ?? [];
  const key = `tg_${btnId}`;
  const isHidden = widgets.includes(key);
  const newWidgets = isHidden ? widgets.filter((w) => w !== key) : [...widgets, key];
  await db.userSettings.upsert({
    where: { userId },
    update: { hiddenWidgets: newWidgets },
    create: { userId, hiddenWidgets: newWidgets },
  });
  return !isHidden; // true = now visible
}
