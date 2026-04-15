import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, RATE_LIMITS } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/api-body";
import { db } from "@/lib/db";
import { getMoodStatusText } from "@/lib/mood-utils";
import { hashPassword, PASSWORD_HASH_EMAIL_SALT_MARKER, verifyPassword } from "@/lib/password-hash";
import { setAuthSession } from "@/lib/server-auth";

const RESERVED_EMAILS = new Set(["demo@leakfixer.local", "owner@leakfixer.local"]);

const EmailAuthBodySchema = z
  .object({
    action: z.enum(["signup", "signin"]),
    email: z.string(),
    password: z.string(),
    name: z.string().optional(),
  })
  .passthrough();

type EmailAuthBody = z.infer<typeof EmailAuthBodySchema>;

/**
 * POST /api/auth/email
 * Body: { action: 'signup' | 'signin', email, password, name? }
 */
export const POST = apiHandler(
  async ({ request }) => {
    const parsedBody = await parseEmailAuthBody(request);
    if (parsedBody instanceof NextResponse) return parsedBody;

    const { action, password, name, normalizedEmail } = parsedBody;

    if (action === "signup" && RESERVED_EMAILS.has(normalizedEmail)) {
      return NextResponse.json({ error: "This email is reserved" }, { status: 403 });
    }

    if (action === "signup") {
      const existing = await db.appUser.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }

      const passwordHash = await hashPassword(password);
      const displayName = name?.trim() || normalizedEmail.split("@")[0];

      const user = await db.appUser.create({
        data: {
          email: normalizedEmail,
          emailSalt: PASSWORD_HASH_EMAIL_SALT_MARKER,
          passwordHash,
          firstName: displayName,
          username: displayName,
          language: "ru",
          authProvider: "email",
          lastLoginAt: new Date(),
          profile: {
            create: { waterBaseline: 2000 },
          },
        },
        include: { profile: true },
      });

      const response = NextResponse.json({
        success: true,
        isNew: true,
        user: serializeUser(user),
        profile: user.profile,
        globalState: null,
        isDemo: false,
        isOwner: false,
      });

      return setAuthSession(response, user.id, "email");
    }

    if (action === "signin") {
      const user = await db.appUser.findUnique({
        where: { email: normalizedEmail },
        include: { profile: true },
      });

      if (!user) {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }

      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "This account uses Telegram login. Please sign in via Telegram." },
          { status: 400 }
        );
      }

      const verification = await verifyPassword(password, user.passwordHash, user.emailSalt);
      if (!verification.valid) {
        return NextResponse.json({ error: "Wrong password" }, { status: 401 });
      }

      const loginUpdateData: {
        lastLoginAt: Date;
        passwordHash?: string;
        emailSalt?: string;
      } = { lastLoginAt: new Date() };

      if (verification.needsRehash) {
        loginUpdateData.passwordHash = await hashPassword(password);
        loginUpdateData.emailSalt = PASSWORD_HASH_EMAIL_SALT_MARKER;
      }

      await db.appUser.update({
        where: { id: user.id },
        data: loginUpdateData,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [todayState, yesterdayState] = await Promise.all([
        db.dailyState.findFirst({ where: { userId: user.id, date: today } }),
        db.dailyState.findFirst({ where: { userId: user.id, date: yesterday } }),
      ]);

      const globalState = todayState?.mood
        ? {
            mood: todayState.mood,
            energy: todayState.energy || 5,
            trend: yesterdayState?.mood ? todayState.mood - yesterdayState.mood : 0,
            status: getMoodStatusText(todayState.mood),
          }
        : null;

      const response = NextResponse.json({
        success: true,
        isNew: false,
        user: serializeUser(user),
        profile: user.profile,
        globalState,
        isDemo: false,
        isOwner: false,
      });

      return setAuthSession(response, user.id, "email");
    }

    return NextResponse.json({ error: "action must be signup or signin" }, { status: 400 });
  },
  { auth: false, rateLimit: RATE_LIMITS.AUTH, rateLimitKey: "auth:email" }
);

async function parseEmailAuthBody(
  request: NextRequest
): Promise<(EmailAuthBody & { normalizedEmail: string }) | NextResponse> {
  const parsed = await parseJsonBody(request, EmailAuthBodySchema, {
    invalidBodyMessage: "Invalid email auth request",
  });
  if (!parsed.success) {
    if (parsed.body === undefined) return parsed.response;

    const maybeBody = typeof parsed.body === "object" && parsed.body !== null ? parsed.body : {};
    const email = "email" in maybeBody ? maybeBody.email : undefined;
    const password = "password" in maybeBody ? maybeBody.password : undefined;
    const action = "action" in maybeBody ? maybeBody.action : undefined;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (action !== "signup" && action !== "signin") {
      return NextResponse.json({ error: "action must be signup or signin" }, { status: 400 });
    }

    return parsed.response;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail.includes("@") || normalizedEmail.length < 5) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  return { ...parsed.data, normalizedEmail };
}

function serializeUser(user: {
  id: string;
  telegramId?: bigint | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  language: string;
  day: number;
  streak: number;
  points: number;
  streakShieldUsedAt?: Date | null;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId ? user.telegramId.toString() : null,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    language: user.language,
    day: user.day,
    streak: user.streak,
    points: user.points,
    streakShieldUsedAt: user.streakShieldUsedAt?.toISOString() ?? null,
  };
}
