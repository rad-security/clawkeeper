import { describe, it, expect } from "vitest";
import {
  getLimits,
  canAddHost,
  canAddApiKey,
  canViewInsights,
  isPaidPlan,
  canViewCVEAudit,
  canViewScoreTrends,
  getScanRetentionDays,
  canViewFullEvents,
  getMaxEvents,
  getMonthlyCredits,
  hasUnlimitedCredits,
} from "@/lib/tier";
import { TIER_LIMITS } from "@/types";

describe("tier.ts", () => {
  describe("getLimits", () => {
    it("returns correct limits for free plan", () => {
      const limits = getLimits("free");
      expect(limits.hosts).toBe(1);
      expect(limits.api_keys).toBe(1);
      expect(limits.scan_history_days).toBe(7);
      expect(limits.cve_audit).toBe(false);
      expect(limits.score_trends).toBe(false);
      expect(limits.credits_monthly).toBe(10);
    });

    it("returns correct limits for pro plan", () => {
      const limits = getLimits("pro");
      expect(limits.hosts).toBe(15);
      expect(limits.api_keys).toBe(10);
      expect(limits.scan_history_days).toBe(365);
      expect(limits.cve_audit).toBe(true);
      expect(limits.score_trends).toBe(true);
      expect(limits.credits_monthly).toBe(200);
    });

    it("returns unlimited (-1) for enterprise plan", () => {
      const limits = getLimits("enterprise");
      expect(limits.hosts).toBe(-1);
      expect(limits.api_keys).toBe(-1);
      expect(limits.scan_history_days).toBe(-1);
      expect(limits.credits_monthly).toBe(-1);
    });
  });

  describe("canAddHost", () => {
    it("allows free user to add first host", () => {
      expect(canAddHost("free", 0)).toBe(true);
    });

    it("blocks free user at 1 host", () => {
      expect(canAddHost("free", 1)).toBe(false);
    });

    it("allows pro user up to 15 hosts", () => {
      expect(canAddHost("pro", 0)).toBe(true);
      expect(canAddHost("pro", 14)).toBe(true);
      expect(canAddHost("pro", 15)).toBe(false);
    });

    it("always allows enterprise", () => {
      expect(canAddHost("enterprise", 0)).toBe(true);
      expect(canAddHost("enterprise", 100)).toBe(true);
      expect(canAddHost("enterprise", 9999)).toBe(true);
    });
  });

  describe("canAddApiKey", () => {
    it("allows free user 1 key", () => {
      expect(canAddApiKey("free", 0)).toBe(true);
      expect(canAddApiKey("free", 1)).toBe(false);
    });

    it("allows pro user 10 keys", () => {
      expect(canAddApiKey("pro", 9)).toBe(true);
      expect(canAddApiKey("pro", 10)).toBe(false);
    });

    it("allows enterprise unlimited keys", () => {
      expect(canAddApiKey("enterprise", 999)).toBe(true);
    });
  });

  describe("canViewInsights", () => {
    it("returns false for free", () => {
      expect(canViewInsights("free")).toBe(false);
    });

    it("returns true for pro", () => {
      expect(canViewInsights("pro")).toBe(true);
    });

    it("returns true for enterprise", () => {
      expect(canViewInsights("enterprise")).toBe(true);
    });
  });

  describe("isPaidPlan", () => {
    it("returns false for free", () => {
      expect(isPaidPlan("free")).toBe(false);
    });

    it("returns true for pro", () => {
      expect(isPaidPlan("pro")).toBe(true);
    });

    it("returns true for enterprise", () => {
      expect(isPaidPlan("enterprise")).toBe(true);
    });
  });

  describe("canViewCVEAudit", () => {
    it("returns false for free, true for paid", () => {
      expect(canViewCVEAudit("free")).toBe(false);
      expect(canViewCVEAudit("pro")).toBe(true);
      expect(canViewCVEAudit("enterprise")).toBe(true);
    });
  });

  describe("canViewScoreTrends", () => {
    it("returns false for free, true for paid", () => {
      expect(canViewScoreTrends("free")).toBe(false);
      expect(canViewScoreTrends("pro")).toBe(true);
      expect(canViewScoreTrends("enterprise")).toBe(true);
    });
  });

  describe("getScanRetentionDays", () => {
    it("returns 7 for free, 365 for pro, -1 for enterprise", () => {
      expect(getScanRetentionDays("free")).toBe(7);
      expect(getScanRetentionDays("pro")).toBe(365);
      expect(getScanRetentionDays("enterprise")).toBe(-1);
    });
  });

  describe("canViewFullEvents", () => {
    it("returns false for free, true for pro/enterprise", () => {
      expect(canViewFullEvents("free")).toBe(false);
      expect(canViewFullEvents("pro")).toBe(true);
      expect(canViewFullEvents("enterprise")).toBe(true);
    });
  });

  describe("getMaxEvents", () => {
    it("returns 5 for free, -1 for pro/enterprise", () => {
      expect(getMaxEvents("free")).toBe(5);
      expect(getMaxEvents("pro")).toBe(-1);
      expect(getMaxEvents("enterprise")).toBe(-1);
    });
  });

  describe("getMonthlyCredits", () => {
    it("returns correct values per plan", () => {
      expect(getMonthlyCredits("free")).toBe(10);
      expect(getMonthlyCredits("pro")).toBe(200);
      expect(getMonthlyCredits("enterprise")).toBe(-1);
    });
  });

  describe("hasUnlimitedCredits", () => {
    it("returns false for free/pro, true for enterprise", () => {
      expect(hasUnlimitedCredits("free")).toBe(false);
      expect(hasUnlimitedCredits("pro")).toBe(false);
      expect(hasUnlimitedCredits("enterprise")).toBe(true);
    });
  });

  describe("TIER_LIMITS consistency", () => {
    it("all three tiers exist", () => {
      expect(TIER_LIMITS).toHaveProperty("free");
      expect(TIER_LIMITS).toHaveProperty("pro");
      expect(TIER_LIMITS).toHaveProperty("enterprise");
    });

    it("free limits are always <= pro limits", () => {
      expect(TIER_LIMITS.free.hosts).toBeLessThanOrEqual(TIER_LIMITS.pro.hosts);
      expect(TIER_LIMITS.free.api_keys).toBeLessThanOrEqual(TIER_LIMITS.pro.api_keys);
      expect(TIER_LIMITS.free.scan_history_days).toBeLessThanOrEqual(TIER_LIMITS.pro.scan_history_days);
    });

    it("free signup bonus is positive", () => {
      expect(TIER_LIMITS.free.credits_signup_bonus).toBeGreaterThan(0);
    });

    it("free does not have rollover", () => {
      expect(TIER_LIMITS.free.credits_rollover).toBe(false);
    });

    it("pro has rollover", () => {
      expect(TIER_LIMITS.pro.credits_rollover).toBe(true);
    });
  });
});
