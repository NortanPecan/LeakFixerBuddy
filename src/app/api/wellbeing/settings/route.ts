import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PRESET_INFO, PresetLevel } from "@/lib/wellbeing-config";
import { requireSelf } from "@/lib/server-auth";

/**
 * GET /api/wellbeing/settings?userId=xxx
 * Get user's wellbeing preset settings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    let settings = await db.userWellbeingSettings.findUnique({
      where: { userId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await db.userWellbeingSettings.create({
        data: {
          userId,
          preset: "core",
        },
      });
    }

    const presetInfo = PRESET_INFO[settings.preset as PresetLevel];

    return NextResponse.json({
      success: true,
      settings: {
        preset: settings.preset,
        presetInfo,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get wellbeing settings error:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

/**
 * PATCH /api/wellbeing/settings
 * Update user's wellbeing preset
 * Body: { userId, preset: "core" | "expanded" | "full" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preset } = body;

    if (!userId || !preset) {
      return NextResponse.json({ error: "userId and preset required" }, { status: 400 });
    }

    const auth = requireSelf(request, userId);
    if ("error" in auth) return auth.error;

    const validPresets = ["core", "expanded", "full"];
    if (!validPresets.includes(preset)) {
      return NextResponse.json(
        { error: "Invalid preset. Use: core, expanded, or full" },
        { status: 400 }
      );
    }

    const settings = await db.userWellbeingSettings.upsert({
      where: { userId },
      update: { preset },
      create: { userId, preset },
    });

    const presetInfo = PRESET_INFO[preset as PresetLevel];

    return NextResponse.json({
      success: true,
      settings: {
        preset: settings.preset,
        presetInfo,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update wellbeing settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
