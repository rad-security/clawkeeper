export type PlanType = "free" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  plan: PlanType;
  stripe_customer_id: string | null;
  credits_balance: number;
  credits_monthly_cap: number;
  credits_last_refill_at: string;
  referred_by_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralCode {
  id: string;
  code: string;
  org_id: string;
  user_id: string;
  max_uses: number;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ReferralEvent {
  id: string;
  referral_code: string;
  referrer_org_id: string;
  referee_org_id: string;
  referrer_credits: number;
  referee_credits: number;
  created_at: string;
}

export interface SharedScan {
  id: string;
  scan_id: string;
  org_id: string;
  share_code: string;
  is_public: boolean;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Host {
  id: string;
  org_id: string;
  hostname: string;
  platform: string | null;
  os_version: string | null;
  last_grade: string | null;
  last_score: number | null;
  last_scan_at: string | null;
  agent_version: string | null;
  shield_active: boolean;
  shield_last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  host_id: string;
  org_id: string;
  score: number;
  grade: string;
  passed: number;
  failed: number;
  fixed: number;
  skipped: number;
  raw_report: string | null;
  scanned_at: string;
  created_at: string;
}

export interface ScanCheck {
  id: string;
  scan_id: string;
  status: "PASS" | "FAIL" | "FIXED" | "SKIPPED";
  check_name: string;
  detail: string | null;
  created_at: string;
}

export interface AlertRule {
  id: string;
  org_id: string;
  name: string;
  rule_type: "grade_drop" | "check_fail" | "score_below";
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertEvent {
  id: string;
  org_id: string;
  alert_rule_id: string | null;
  host_id: string | null;
  scan_id: string | null;
  message: string;
  notified_at: string;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  org_id: string;
  email_enabled: boolean;
  email_address: string | null;
  webhook_enabled: boolean;
  webhook_url: string | null;
  webhook_secret: string | null;
  notify_on_cve: boolean;
  notify_on_critical: boolean;
  notify_on_grade_drop: boolean;
  notify_on_new_host: boolean;
  notify_on_shield_block: boolean;
  created_at: string;
  updated_at: string;
}

// Scan upload payload from agent
export interface ScanUploadPayload {
  hostname: string;
  platform: string;
  os_version: string;
  score: number;
  grade: string;
  passed: number;
  failed: number;
  fixed: number;
  skipped: number;
  checks: { status: string; check_name: string; detail: string }[];
  raw_report: string;
  scanned_at: string;
  agent_version: string;
}

// Event types
export type EventType =
  | "scan.completed"
  | "grade.changed"
  | "check.flipped"
  | "host.registered"
  | "agent.installed"
  | "agent.started"
  | "agent.stopped"
  | "agent.uninstalled"
  | "shield.blocked"
  | "shield.warned";

export interface Event {
  id: string;
  org_id: string;
  host_id: string | null;
  event_type: EventType;
  title: string;
  detail: Record<string, unknown>;
  actor: string | null;
  created_at: string;
  hosts?: { hostname: string } | null;
}

// Insight types
export type InsightType =
  | "critical_failure"
  | "credential_exposure"
  | "cve_vulnerability"
  | "prompt_injection"
  | "new_regression"
  | "grade_degradation"
  | "fleet_inconsistency"
  | "stale_host"
  | "quick_win"
  | "shield_attack_surge"
  | "shield_targeted_host"
  | "shield_new_pattern";

export type InsightSeverity = "critical" | "high" | "medium" | "low" | "info";

export type InsightCategory = "security" | "compliance" | "drift" | "performance";

export interface Insight {
  id: string;
  org_id: string;
  insight_type: InsightType;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  description: string;
  remediation: string;
  affected_hosts: { host_id: string; hostname: string; detail: string }[];
  metadata: Record<string, unknown>;
  is_resolved: boolean;
  resolved_at: string | null;
  scan_id: string | null;
  created_at: string;
  updated_at: string;
}

// Tier limits
export const TIER_LIMITS = {
  free: { hosts: 1, scan_history_days: 7, insights: 0, api_keys: 1, events_visible: 5, cve_audit: false, score_trends: false, credits_monthly: 10, credits_signup_bonus: 5, credits_rollover: false, runtime_shield: false },
  pro: { hosts: 15, scan_history_days: 365, insights: -1, api_keys: 10, events_visible: -1, cve_audit: true, score_trends: true, credits_monthly: 200, credits_signup_bonus: 0, credits_rollover: true, runtime_shield: true },
  enterprise: { hosts: -1, scan_history_days: -1, insights: -1, api_keys: -1, events_visible: -1, cve_audit: true, score_trends: true, credits_monthly: -1, credits_signup_bonus: 0, credits_rollover: true, runtime_shield: true },
} as const;

// Pricing (cents) for Stripe integration
export const PLAN_PRICING = {
  pro: { monthly: 2000, annual: 19200 }, // $20/mo or $16/mo billed annually ($192/yr)
} as const;

// Shared feature lists for pricing cards (used by landing + upgrade pages)
export const PRO_FEATURES = [
  "Everything in Free",
  "200 scans/month (unused roll over)",
  "Up to 15 hosts",
  "365 days scan history",
  "10 API keys",
  "Live CVE vulnerability audit",
  "AI-powered security insights",
  "Score history & trend charts",
  "Activity stream & fleet monitoring",
  "Email & webhook alerts",
  "Runtime Shield: real-time prompt injection defense",
  "Priority support",
] as const;

export const ENTERPRISE_FEATURES = [
  "Everything in Pro",
  "Unlimited hosts & clusters",
  "Hardened Helm charts",
  "eBPF runtime detection",
  "Real-time KSPM",
  "KBOM inventory",
  "Cloud-native ITDR",
  "AWS / GCP / Azure deploy",
  "SSO / SAML integration",
  "Dedicated support & SLA",
] as const;

export const FREE_FEATURES = [
  "Full CLI scanner & deployment wizard",
  "10 scans/month + referral bonuses",
  "Auto-remediation & secure defaults",
  "1 host on dashboard",
  "7 days scan history",
  "1 API key",
  "Letter grade & score",
] as const;

// Shield types
export type ShieldDetectionLayer = "regex" | "semantic" | "context_integrity" | "blacklist" | "entropy_heuristic";
export type ShieldVerdict = "blocked" | "warned" | "passed";
export type ShieldSecurityLevel = "paranoid" | "strict" | "moderate" | "minimal";

export interface ShieldEvent {
  id: string;
  org_id: string;
  host_id: string | null;
  hostname: string;
  detection_layer: ShieldDetectionLayer;
  verdict: ShieldVerdict;
  severity: "critical" | "high" | "medium" | "low";
  security_level: string;
  pattern_name: string | null;
  input_hash: string;
  input_length: number | null;
  confidence: number | null;
  context: Record<string, unknown>;
  created_at: string;
}

export interface ShieldPolicy {
  id: string;
  org_id: string;
  security_level: ShieldSecurityLevel;
  custom_blacklist: string[];
  trusted_sources: string[];
  entropy_threshold: number;
  max_input_length: number;
  auto_block: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShieldEventPayload {
  hostname: string;
  detection_layer: ShieldDetectionLayer;
  verdict: ShieldVerdict;
  severity: "critical" | "high" | "medium" | "low";
  security_level: string;
  pattern_name?: string;
  input_hash: string;
  input_length?: number;
  confidence?: number;
  context?: Record<string, unknown>;
}
