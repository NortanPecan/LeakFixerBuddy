import { NextRequest, NextResponse } from "next/server";
import { z, type ZodType } from "zod";

export type JsonBodyParseResult<T> =
  | { success: true; data: T; body: unknown }
  | { success: false; response: NextResponse; body?: unknown; error?: z.ZodError };

interface JsonBodyParseOptions {
  invalidJsonMessage?: string;
  invalidBodyMessage?: string;
  invalidJsonStatus?: number;
  invalidBodyStatus?: number;
}

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
  options: JsonBodyParseOptions = {}
): Promise<JsonBodyParseResult<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: options.invalidJsonMessage ?? "Invalid JSON" },
        { status: options.invalidJsonStatus ?? 400 }
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      body,
      error: parsed.error,
      response: NextResponse.json(
        { error: options.invalidBodyMessage ?? "Invalid request body" },
        { status: options.invalidBodyStatus ?? 400 }
      ),
    };
  }

  return { success: true, data: parsed.data, body };
}
