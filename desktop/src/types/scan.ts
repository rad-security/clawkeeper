/** Mirrors Rust CheckMeta from types.rs */
export interface CheckMeta {
  id: string;
  name: string;
  phase: string;
  platform: string;
  description: string;
  requires_sudo: boolean;
  order: number;
}

/** Mirrors Rust PhaseInfo from types.rs */
export interface PhaseInfo {
  id: string;
  label: string;
  order: number;
}

/** Discriminated union matching Rust ScanEvent (serde tag = "event") */
export type ScanEvent =
  | { event: "ScanStarted"; checks: CheckMeta[]; phases: PhaseInfo[] }
  | { event: "PhaseStarted"; phase_id: string; phase_label: string }
  | { event: "CheckStarted"; check_id: string }
  | { event: "Info"; check_id: string; message: string }
  | { event: "Warn"; check_id: string; message: string }
  | {
      event: "CheckCompleted";
      check_id: string;
      check_name: string;
      status: string;
      detail: string;
    }
  | {
      event: "Prompt";
      check_id: string;
      message: string;
      remediation_id: string;
      fail_detail: string;
      skip_detail: string;
    }
  | {
      event: "ScanCompleted";
      passed: number;
      failed: number;
      skipped: number;
      total: number;
      score: number;
      grade: string;
    }
  | { event: "Error"; check_id: string; message: string };

/** Frontend state for a single check */
export type CheckStatus = "pending" | "running" | "PASS" | "FAIL" | "SKIPPED";

export interface CheckState {
  meta: CheckMeta;
  status: CheckStatus;
  detail: string;
  messages: { type: "info" | "warn" | "error"; message: string }[];
}

export interface ScanSummaryData {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  score: number;
  grade: string;
}

export interface ScanState {
  running: boolean;
  checks: Map<string, CheckState>;
  phases: PhaseInfo[];
  summary: ScanSummaryData | null;
}

/** Deploy types matching Rust deploy.rs */
export interface OpenClawStatus {
  installed: boolean;
  install_type: string | null;
  running: boolean;
  docker_available: boolean;
  node_available: boolean;
  homebrew_available: boolean;
}

export type DeployEvent =
  | { event: "StepStarted"; step_id: string; label: string }
  | {
      event: "StepLog";
      step_id: string;
      level: string;
      message: string;
    }
  | { event: "StepCompleted"; step_id: string; success: boolean }
  | { event: "DeployCompleted"; success: boolean; message: string };

export interface DeployStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  logs: { level: string; message: string }[];
}

/** App navigation */
export type AppView = "home" | "scan" | "deploy";
