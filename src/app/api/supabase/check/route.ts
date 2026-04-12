import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUrl, getSupabaseServiceKey } from "@/lib/supabaseClient";

// GET /api/supabase/test - Test Supabase REST API connection
export async function GET(request: NextRequest) {
  try {
    const url = getSupabaseUrl();
    const serviceKey = getSupabaseServiceKey();

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase credentials not configured",
          hasUrl: !!url,
          hasKey: !!serviceKey,
        },
        { status: 500 }
      );
    }

    // Test connection by fetching journey_lessons table
    const response = await fetch(`${url}/rest/v1/journey_lessons?select=count&limit=1`, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "count=exact",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: "Supabase REST API error",
          status: response.status,
          details: errorText,
          url: url.substring(0, 30) + "...",
        },
        { status: 500 }
      );
    }

    // Try to fetch first lesson
    const lessonsResponse = await fetch(`${url}/rest/v1/journey_lessons?select=*&limit=1`, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    let firstLesson: { day: number; title: string } | null = null;
    if (lessonsResponse.ok) {
      const lessons = await lessonsResponse.json();
      firstLesson = lessons[0] || null;
    }

    return NextResponse.json({
      success: true,
      message: "Supabase REST API connection successful",
      supabaseUrl: url.substring(0, 30) + "...",
      firstLesson: firstLesson
        ? {
            day: firstLesson.day,
            title: firstLesson.title,
          }
        : null,
    });
  } catch (error) {
    console.error("Supabase test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Connection failed",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
