import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser, requireSelf } from "@/lib/server-auth";

// GET /api/buddy-challenges?userId=xxx
// Returns invites received (pending) + active buddy challenges
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await requireSelf(request, userId);

  try {
    const [received, sent] = await Promise.all([
      db.buddyChallenge.findMany({
        where: { partnerId: userId },
        include: {
          challenge: {
            select: {
              id: true,
              name: true,
              type: true,
              zone: true,
              duration: true,
              description: true,
            },
          },
          initiator: { select: { id: true, firstName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.buddyChallenge.findMany({
        where: { initiatorId: userId },
        include: {
          challenge: { select: { id: true, name: true, type: true, zone: true, duration: true } },
          partner: { select: { id: true, firstName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ success: true, received, sent });
  } catch (error) {
    console.error("[buddy-challenges GET]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// POST /api/buddy-challenges — propose a buddy challenge
// body: { challengeId, initiatorId, partnerId }
export async function POST(request: NextRequest) {
  try {
    const { challengeId, initiatorId, partnerId } = await request.json();
    if (!challengeId || !initiatorId || !partnerId) {
      return NextResponse.json(
        { error: "challengeId, initiatorId, partnerId required" },
        { status: 400 }
      );
    }
    await requireSelf(request, initiatorId);

    // Validate challenge belongs to initiator
    const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.userId !== initiatorId) {
      return NextResponse.json({ error: "Challenge not found or access denied" }, { status: 403 });
    }

    // Check if already proposed to this partner on this challenge
    const existing = await db.buddyChallenge.findFirst({
      where: { challengeId, partnerId },
    });
    if (existing) {
      return NextResponse.json({ error: "Already proposed" }, { status: 409 });
    }

    const bc = await db.buddyChallenge.create({
      data: { challengeId, initiatorId, partnerId },
      include: { partner: { select: { firstName: true, username: true } } },
    });

    return NextResponse.json({ success: true, buddyChallenge: bc });
  } catch (error) {
    console.error("[buddy-challenges POST]", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PATCH /api/buddy-challenges — accept/decline or update progress
// body: { id, status?: 'accepted'|'declined', userId, progressDelta?: number }
export async function PATCH(request: NextRequest) {
  try {
    const { id, status, userId, progressDelta } = await request.json();
    if (!id || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    const bc = await db.buddyChallenge.findUnique({ where: { id } });
    if (!bc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};

    // Status change (accept/decline) — only partner can do this
    if (status) {
      if (bc.partnerId !== userId) {
        return NextResponse.json({ error: "Only partner can accept/decline" }, { status: 403 });
      }
      updateData.status = status;
    }

    // Progress update
    if (typeof progressDelta === "number") {
      if (bc.initiatorId === userId) {
        updateData.initiatorProgress = bc.initiatorProgress + progressDelta;
      } else if (bc.partnerId === userId) {
        updateData.partnerProgress = bc.partnerProgress + progressDelta;
      }
    }

    const updated = await db.buddyChallenge.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, buddyChallenge: updated });
  } catch (error) {
    console.error("[buddy-challenges PATCH]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/buddy-challenges?id=xxx
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const auth = await requireAuthenticatedUser(request);
    const existing = await db.buddyChallenge.findUnique({
      where: { id },
      select: { initiatorId: true, partnerId: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (
      existing.initiatorId !== auth.session.userId &&
      existing.partnerId !== auth.session.userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db.buddyChallenge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[buddy-challenges DELETE]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
