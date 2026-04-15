import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-body";

function makeRequest(body: string) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("parseJsonBody", () => {
  const schema = z.object({ name: z.string() });

  it("returns parsed data for valid JSON matching the schema", async () => {
    const result = await parseJsonBody(makeRequest(JSON.stringify({ name: "LeakFixer" })), schema);

    expect(result).toMatchObject({
      success: true,
      data: { name: "LeakFixer" },
    });
  });

  it("returns the configured invalid JSON response", async () => {
    const result = await parseJsonBody(makeRequest("{bad json"), schema, {
      invalidJsonMessage: "Bad JSON",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.body).toBeUndefined();
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({ error: "Bad JSON" });
    }
  });

  it("returns the configured schema validation response with raw body", async () => {
    const result = await parseJsonBody(makeRequest(JSON.stringify({ name: 123 })), schema, {
      invalidBodyMessage: "Bad body",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.body).toEqual({ name: 123 });
      expect(result.error).toBeInstanceOf(z.ZodError);
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({ error: "Bad body" });
    }
  });
});
