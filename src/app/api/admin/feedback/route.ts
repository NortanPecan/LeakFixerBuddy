import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

const OWNER_EMAIL = "owner@leakfixer.local";

/**
 * GET /api/admin/feedback
 * Returns all user feedbacks for the owner.
 * Only accessible from owner account.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // 'new' | 'read' | 'resolved' | null (all)

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    // Verify caller is owner
    const caller = await db.appUser.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (caller?.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedbacks = await db.feedback.findMany({
      where: status ? { status } : {},
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            telegramUsername: true,
            day: true,
            streak: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const counts = await db.feedback.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      feedbacks,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count.id])),
    });
  } catch (error) {
    console.error("Admin feedback error:", error);
    return NextResponse.json({ error: "Failed to fetch feedbacks" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/feedback
 * Update feedback status (mark as read/resolved).
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, feedbackId, status } = body;

    if (!userId || !feedbackId || !status) {
      return NextResponse.json({ error: "userId, feedbackId, status required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    const caller = await db.appUser.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (caller?.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.feedback.update({
      where: { id: feedbackId },
      data: { status },
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error("Admin feedback PATCH error:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
