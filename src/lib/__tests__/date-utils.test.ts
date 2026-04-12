import { describe, it, expect, vi, afterEach } from "vitest";
import {
  normalizeToDate,
  getStartOfDay,
  getEndOfDay,
  formatDateKey,
  parseDateKey,
  isSameDay,
  getDaysAgo,
  getDayOfWeek,
  getTodayKey,
  getTomorrowKey,
} from "../date-utils";

afterEach(() => {
  vi.useRealTimers();
});

// ── normalizeToDate ────────────────────────────────────────────────────────

describe("normalizeToDate", () => {
  it("normalizes a Date object to midnight", () => {
    const d = new Date(2026, 2, 18, 14, 30, 0); // March 18 2026, 14:30
    const result = normalizeToDate(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getDate()).toBe(18);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getFullYear()).toBe(2026);
  });

  it("parses YYYY-MM-DD string as local midnight", () => {
    const result = normalizeToDate("2026-03-18");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(18);
    expect(result.getHours()).toBe(0);
  });

  it("handles ISO datetime strings", () => {
    const result = normalizeToDate("2026-03-18T14:30:00.000Z");
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("does not mutate the original date", () => {
    const original = new Date(2026, 2, 18, 15, 0, 0);
    const originalTime = original.getTime();
    normalizeToDate(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

// ── getStartOfDay ──────────────────────────────────────────────────────────

describe("getStartOfDay", () => {
  it("sets time to 00:00:00.000", () => {
    const d = new Date(2026, 5, 10, 23, 59, 59, 999);
    const result = getStartOfDay(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getDate()).toBe(10);
  });

  it("does not mutate the input", () => {
    const d = new Date(2026, 0, 1, 12, 0, 0);
    const originalTime = d.getTime();
    getStartOfDay(d);
    expect(d.getTime()).toBe(originalTime);
  });
});

// ── getEndOfDay ────────────────────────────────────────────────────────────

describe("getEndOfDay", () => {
  it("returns the final millisecond of the same day", () => {
    const d = new Date(2026, 2, 18);
    const result = getEndOfDay(d);
    expect(result.getDate()).toBe(18);
    expect(result.getMonth()).toBe(2);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it("handles month boundary", () => {
    const d = new Date(2026, 2, 31); // March 31
    const result = getEndOfDay(d);
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getHours()).toBe(23);
  });
});

// ── formatDateKey ──────────────────────────────────────────────────────────

describe("formatDateKey", () => {
  it("formats as YYYY-MM-DD with zero-padded month and day", () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("pads single-digit months and days", () => {
    expect(formatDateKey(new Date(2026, 2, 1))).toBe("2026-03-01"); // March 1
  });

  it("returns 10-character YYYY-MM-DD string", () => {
    const key = formatDateKey(new Date());
    expect(key).toHaveLength(10);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── parseDateKey ───────────────────────────────────────────────────────────

describe("parseDateKey", () => {
  it("parses YYYY-MM-DD to local midnight Date", () => {
    const d = parseDateKey("2026-03-18");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("roundtrips: parseDateKey(formatDateKey(d)) === start of day", () => {
    const original = new Date(2026, 5, 15, 14, 30);
    const key = formatDateKey(original);
    const parsed = parseDateKey(key);
    expect(parsed.getFullYear()).toBe(original.getFullYear());
    expect(parsed.getMonth()).toBe(original.getMonth());
    expect(parsed.getDate()).toBe(original.getDate());
    expect(parsed.getHours()).toBe(0);
  });
});

// ── isSameDay ──────────────────────────────────────────────────────────────

describe("isSameDay", () => {
  it("returns true for same calendar day at different times", () => {
    const morning = new Date(2026, 2, 18, 8, 0);
    const evening = new Date(2026, 2, 18, 22, 45);
    expect(isSameDay(morning, evening)).toBe(true);
  });

  it("returns false for different days", () => {
    const d1 = new Date(2026, 2, 18);
    const d2 = new Date(2026, 2, 19);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  it("returns false for same day different months", () => {
    const d1 = new Date(2026, 2, 1); // March 1
    const d2 = new Date(2026, 3, 1); // April 1
    expect(isSameDay(d1, d2)).toBe(false);
  });

  it("returns true when same Date object", () => {
    const d = new Date(2026, 0, 1);
    expect(isSameDay(d, d)).toBe(true);
  });
});

// ── getDaysAgo ─────────────────────────────────────────────────────────────

describe("getDaysAgo", () => {
  it("returns midnight 0 days ago (today)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0));
    const result = getDaysAgo(0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(18);
    expect(result.getHours()).toBe(0);
  });

  it("returns correct date 7 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 18, 10, 0, 0));
    const result = getDaysAgo(7);
    expect(result.getDate()).toBe(11);
    expect(result.getMonth()).toBe(2);
  });

  it("handles month boundaries correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 3, 12, 0)); // April 3
    const result = getDaysAgo(5);
    expect(result.getDate()).toBe(29);
    expect(result.getMonth()).toBe(2); // March
  });
});

// ── getDayOfWeek ───────────────────────────────────────────────────────────

describe("getDayOfWeek", () => {
  it("returns 1 for Monday", () => {
    // 2026-03-16 is a Monday
    const monday = new Date(2026, 2, 16);
    expect(getDayOfWeek(monday)).toBe(1);
  });

  it("returns 7 for Sunday", () => {
    // 2026-03-22 is a Sunday
    const sunday = new Date(2026, 2, 22);
    expect(getDayOfWeek(sunday)).toBe(7);
  });

  it("returns values between 1 and 7 inclusive", () => {
    for (let d = 16; d <= 22; d++) {
      const day = getDayOfWeek(new Date(2026, 2, d));
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(7);
    }
  });
});

// ── getTodayKey / getTomorrowKey ───────────────────────────────────────────

describe("getTodayKey", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(getTodayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches current local date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 18, 14, 0));
    expect(getTodayKey()).toBe("2026-03-18");
  });
});

describe("getTomorrowKey", () => {
  it("returns the day after today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 18, 10, 0));
    expect(getTomorrowKey()).toBe("2026-03-19");
  });

  it("handles month rollover", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 31, 10, 0)); // March 31
    expect(getTomorrowKey()).toBe("2026-04-01");
  });
});
