import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

type BuddyRequester = {
  id: string;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  telegramUsername: string | null;
  telegramPhotoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  username: string | null;
};

function formatBuddyName(
  requester: Omit<BuddyRequester, "id"> | null | undefined,
  fallback: string
) {
  if (!requester) return fallback;

  if (requester.telegramFirstName) {
    return `${requester.telegramFirstName}${requester.telegramLastName ? ` ${requester.telegramLastName}` : ""}`;
  }

  if (requester.firstName) {
    return `${requester.firstName}${requester.lastName ? ` ${requester.lastName}` : ""}`;
  }

  return requester.telegramUsername || requester.username || fallback;
}

// GET - Fetch buddies for user (outgoing) and incoming requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const type = searchParams.get("type") || "all";
    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    const outgoing = await db.buddy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const allBuddiesWithMeAsPartner = await db.buddy.findMany({
      where: { partnerId: userId },
      orderBy: { createdAt: "desc" },
    });

    const incomingRequesterIds = allBuddiesWithMeAsPartner.map((b) => b.userId);
    const requesters = await db.appUser.findMany({
      where: { id: { in: incomingRequesterIds } },
      select: {
        id: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        username: true,
      },
    });

    const requestersMap = new Map<string, BuddyRequester>(requesters.map((r) => [r.id, r]));

    const incoming = allBuddiesWithMeAsPartner.map((b) => {
      const requester = requestersMap.get(b.userId);
      return {
        id: b.id,
        partnerId: b.userId,
        partnerName: formatBuddyName(requester, b.partnerName || "Пользователь"),
        partnerPhoto: requester?.telegramPhotoUrl || requester?.photoUrl || b.partnerPhoto,
        status: b.status,
        createdAt: b.createdAt,
      };
    });

    if (type === "outgoing") {
      return NextResponse.json({ buddies: outgoing, incoming: [] });
    }
    if (type === "incoming") {
      return NextResponse.json({ buddies: [], incoming });
    }

    return NextResponse.json({ buddies: outgoing, incoming });
  } catch (error) {
    console.error("Fetch buddies error:", error);
    return NextResponse.json({ error: "Failed to fetch buddies" }, { status: 500 });
  }
}

// POST - Add new buddy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, partnerId, partnerName, partnerPhoto } = body;
    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    if (!partnerId || !partnerName) {
      return NextResponse.json(
        { error: "userId, partnerId, and partnerName required" },
        { status: 400 }
      );
    }

    const existing = await db.buddy.findUnique({
      where: {
        userId_partnerId: { userId, partnerId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Buddy already exists", buddy: existing }, { status: 400 });
    }

    const buddy = await db.buddy.create({
      data: {
        userId,
        partnerId,
        partnerName,
        partnerPhoto,
        status: "pending",
      },
    });

    return NextResponse.json({ buddy });
  } catch (error) {
    console.error("Create buddy error:", error);
    return NextResponse.json({ error: "Failed to create buddy" }, { status: 500 });
  }
}

// PATCH - Update buddy status (accept/reject incoming request)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { buddyId, status, currentUserId } = body;

    if (!buddyId || !status) {
      return NextResponse.json({ error: "buddyId and status required" }, { status: 400 });
    }

    const existingBuddy = await db.buddy.findUnique({
      where: { id: buddyId },
    });

    if (!existingBuddy) {
      return NextResponse.json({ error: "Buddy request not found" }, { status: 404 });
    }

    const auth = requireSelf(request, existingBuddy.partnerId);
    if ("error" in auth) return auth.error;

    if (currentUserId && currentUserId !== existingBuddy.partnerId) {
      return NextResponse.json(
        { error: "Forbidden", hint: "currentUserId must match the authenticated user" },
        { status: 403 }
      );
    }

    const receiverUserId = existingBuddy.partnerId;
    const buddy = await db.buddy.update({
      where: { id: buddyId },
      data: { status },
    });

    if (status === "accepted") {
      const reverse = await db.buddy.findUnique({
        where: {
          userId_partnerId: {
            userId: receiverUserId,
            partnerId: existingBuddy.userId,
          },
        },
      });

      if (!reverse) {
        const requester = await db.appUser.findUnique({
          where: { id: existingBuddy.userId },
          select: {
            telegramFirstName: true,
            telegramLastName: true,
            telegramUsername: true,
            telegramPhotoUrl: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            username: true,
          },
        });

        const requesterName = formatBuddyName(
          requester,
          existingBuddy.partnerName || "Пользователь"
        );

        await db.buddy.create({
          data: {
            userId: receiverUserId,
            partnerId: existingBuddy.userId,
            partnerName: requesterName,
            partnerPhoto:
              requester?.telegramPhotoUrl || requester?.photoUrl || existingBuddy.partnerPhoto,
            status: "accepted",
          },
        });
      } else if (reverse.status !== "accepted") {
        await db.buddy.update({
          where: { id: reverse.id },
          data: { status: "accepted" },
        });
      }
    }

    return NextResponse.json({ buddy });
  } catch (error) {
    console.error("Update buddy error:", error);
    return NextResponse.json({ error: "Failed to update buddy" }, { status: 500 });
  }
}

// DELETE - Remove buddy
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buddyId = searchParams.get("buddyId");

    if (!buddyId) {
      return NextResponse.json({ error: "buddyId required" }, { status: 400 });
    }

    const buddy = await db.buddy.findUnique({
      where: { id: buddyId },
      select: { id: true, userId: true, partnerId: true },
    });

    if (!buddy) {
      return NextResponse.json({ error: "Buddy not found" }, { status: 404 });
    }

    const isOwner = requireSelf(request, buddy.userId);
    const isPartner = requireSelf(request, buddy.partnerId);
    if ("error" in isOwner && "error" in isPartner) {
      return isOwner.error;
    }

    await db.buddy.delete({ where: { id: buddyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete buddy error:", error);
    return NextResponse.json({ error: "Failed to delete buddy" }, { status: 500 });
  }
}
