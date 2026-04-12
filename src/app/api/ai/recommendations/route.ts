import { db } from "@/lib/db";
import { apiHandler, ValidationError } from "@/lib/api-handler";
import { RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/ai/recommendations?userId=...
 * Возвращает самый свежий UserAiPattern за последние 7 дней.
 * Используется виджетом «💡 AI Рекомендации» на HomeScreen.
 */
export const GET = apiHandler(
  async ({ request }) => {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) throw new ValidationError("userId required");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pattern = await db.userAiPattern.findFirst({
      where: {
        userId,
        updatedAt: { gte: sevenDaysAgo },
        lastAnalysis: { not: undefined },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        leakType: true,
        lastAnalysis: true,
        lastProvider: true,
        updatedAt: true,
      },
    });

    if (!pattern?.lastAnalysis) {
      return { success: false, recommendation: null };
    }

    return {
      success: true,
      recommendation: {
        leakType: pattern.leakType,
        analysis: pattern.lastAnalysis,
        provider: pattern.lastProvider,
        updatedAt: pattern.updatedAt,
      },
    };
  },
  { auth: "self", rateLimit: RATE_LIMITS.AI, rateLimitKey: "ai:recommendations" }
);
