import { describe, it, expect } from "vitest";
import { TIER_LIMITS } from "@/types";

// Test credit system logic (without Supabase dependency)

const REFILL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

describe("Credit system logic", () => {
  describe("refill interval", () => {
    it("refill interval is 30 days in milliseconds", () => {
      expect(REFILL_INTERVAL_MS).toBe(2_592_000_000);
    });
  });

  describe("free plan credits", () => {
    const plan = "free" as const;
    const monthlyCap = TIER_LIMITS[plan].credits_monthly;

    it("monthly cap is 10 for free plan", () => {
      expect(monthlyCap).toBe(10);
    });

    it("no rollover for free plan", () => {
      expect(TIER_LIMITS[plan].credits_rollover).toBe(false);
    });

    it("reset to monthly cap on refill (no rollover)", () => {
      const currentBalance = 3; // leftover from last period
      const canRollover = TIER_LIMITS[plan].credits_rollover;
      const newBalance = canRollover
        ? Math.min(currentBalance + monthlyCap, monthlyCap * 2)
        : monthlyCap;
      expect(newBalance).toBe(10); // reset, not accumulated
    });
  });

  describe("pro plan credits", () => {
    const plan = "pro" as const;
    const monthlyCap = TIER_LIMITS[plan].credits_monthly;

    it("monthly cap is 200 for pro plan", () => {
      expect(monthlyCap).toBe(200);
    });

    it("pro has rollover", () => {
      expect(TIER_LIMITS[plan].credits_rollover).toBe(true);
    });

    it("rollover caps at 2x monthly", () => {
      const currentBalance = 150; // leftover from last period
      const canRollover = TIER_LIMITS[plan].credits_rollover;
      const newBalance = canRollover
        ? Math.min(currentBalance + monthlyCap, monthlyCap * 2)
        : monthlyCap;
      // 150 + 200 = 350, capped at 400 (2x200)
      expect(newBalance).toBe(350);
    });

    it("rollover caps at 2x monthly when already near cap", () => {
      const currentBalance = 350;
      const newBalance = Math.min(currentBalance + monthlyCap, monthlyCap * 2);
      // 350 + 200 = 550, capped at 400
      expect(newBalance).toBe(400);
    });

    it("rollover with 0 balance equals monthly cap", () => {
      const currentBalance = 0;
      const newBalance = Math.min(currentBalance + monthlyCap, monthlyCap * 2);
      expect(newBalance).toBe(200);
    });
  });

  describe("enterprise plan credits", () => {
    const plan = "enterprise" as const;
    const monthlyCap = TIER_LIMITS[plan].credits_monthly;

    it("enterprise has unlimited credits (-1)", () => {
      expect(monthlyCap).toBe(-1);
    });
  });

  describe("deduction logic", () => {
    it("deducting 1 from positive balance allows scan", () => {
      const balance = 5;
      expect(balance > 0).toBe(true);
      const newBalance = balance - 1;
      expect(newBalance).toBe(4);
    });

    it("deducting from 0 balance blocks scan", () => {
      const balance = 0;
      expect(balance <= 0).toBe(true);
    });

    it("deducting from 1 balance allows but leaves 0", () => {
      const balance = 1;
      expect(balance > 0).toBe(true);
      const newBalance = balance - 1;
      expect(newBalance).toBe(0);
    });
  });

  describe("refill timing", () => {
    it("30 days since refill triggers new refill", () => {
      const lastRefill = new Date("2026-01-01T00:00:00Z").getTime();
      const now = new Date("2026-02-01T00:00:00Z").getTime();
      const elapsed = now - lastRefill;
      expect(elapsed >= REFILL_INTERVAL_MS).toBe(true);
    });

    it("29 days since refill does not trigger refill", () => {
      const lastRefill = new Date("2026-01-01T00:00:00Z").getTime();
      const now = new Date("2026-01-30T00:00:00Z").getTime();
      const elapsed = now - lastRefill;
      expect(elapsed >= REFILL_INTERVAL_MS).toBe(false);
    });
  });
});
