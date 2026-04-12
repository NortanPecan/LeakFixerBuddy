import { describe, it, expect } from "vitest";
import { getMoodStatus, getMoodStatusText, MOOD_THRESHOLDS } from "../mood-utils";

// ── getMoodStatus ──────────────────────────────────────────────────────────

describe("getMoodStatus", () => {
  it("returns peak state for mood >= 9", () => {
    const result = getMoodStatus(9);
    expect(result.status).toContain("Пиковое");
    expect(result.color).toBe("#fcd34d");
  });

  it("returns peak for mood = 10", () => {
    const result = getMoodStatus(10);
    expect(result.status).toContain("Пиковое");
  });

  it("returns good for mood 7–8", () => {
    expect(getMoodStatus(7).color).toBe("#34d399");
    expect(getMoodStatus(8).color).toBe("#34d399");
  });

  it("returns stable for mood 5–6", () => {
    expect(getMoodStatus(5).color).toBe("#60a5fa");
    expect(getMoodStatus(6).color).toBe("#60a5fa");
  });

  it("returns low for mood 3–4", () => {
    expect(getMoodStatus(3).color).toBe("#fb923c");
    expect(getMoodStatus(4).color).toBe("#fb923c");
  });

  it("returns crisis for mood < 3", () => {
    expect(getMoodStatus(2).color).toBe("#f87171");
    expect(getMoodStatus(1).color).toBe("#f87171");
    expect(getMoodStatus(0).color).toBe("#f87171");
  });

  it("returns an object with status and color keys", () => {
    const result = getMoodStatus(5);
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("color");
    expect(typeof result.status).toBe("string");
    expect(typeof result.color).toBe("string");
  });

  // Boundary conditions — exact threshold values
  it("boundary: mood 9 is peak (not good)", () => {
    expect(getMoodStatus(9).color).toBe("#fcd34d"); // peak, not good (#34d399)
  });

  it("boundary: mood 7 is good (not stable)", () => {
    expect(getMoodStatus(7).color).toBe("#34d399"); // good, not stable (#60a5fa)
  });

  it("boundary: mood 5 is stable (not low)", () => {
    expect(getMoodStatus(5).color).toBe("#60a5fa"); // stable, not low (#fb923c)
  });

  it("boundary: mood 3 is low (not crisis)", () => {
    expect(getMoodStatus(3).color).toBe("#fb923c"); // low, not crisis (#f87171)
  });
});

// ── getMoodStatusText ──────────────────────────────────────────────────────

describe("getMoodStatusText", () => {
  it("returns only the status string (no color)", () => {
    const result = getMoodStatusText(8);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("matches getMoodStatus.status", () => {
    for (const mood of [1, 3, 5, 7, 9]) {
      expect(getMoodStatusText(mood)).toBe(getMoodStatus(mood).status);
    }
  });
});

// ── MOOD_THRESHOLDS ────────────────────────────────────────────────────────

describe("MOOD_THRESHOLDS", () => {
  it("has expected keys", () => {
    expect(MOOD_THRESHOLDS.PEAK).toBe(9);
    expect(MOOD_THRESHOLDS.GOOD).toBe(7);
    expect(MOOD_THRESHOLDS.STABLE).toBe(5);
    expect(MOOD_THRESHOLDS.LOW).toBe(3);
    expect(MOOD_THRESHOLDS.CRISIS).toBe(0);
  });

  it("thresholds are in descending order", () => {
    expect(MOOD_THRESHOLDS.PEAK).toBeGreaterThan(MOOD_THRESHOLDS.GOOD);
    expect(MOOD_THRESHOLDS.GOOD).toBeGreaterThan(MOOD_THRESHOLDS.STABLE);
    expect(MOOD_THRESHOLDS.STABLE).toBeGreaterThan(MOOD_THRESHOLDS.LOW);
    expect(MOOD_THRESHOLDS.LOW).toBeGreaterThan(MOOD_THRESHOLDS.CRISIS);
  });
});
