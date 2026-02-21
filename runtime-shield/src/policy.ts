import { ShieldConfig, SecurityLevel } from "./types";

const SYNC_INTERVAL_MS = 5 * 60_000; // 5 minutes

/**
 * Periodically syncs policy from the Clawkeeper dashboard.
 */
export class PolicySync {
  private config: ShieldConfig;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ShieldConfig) {
    this.config = config;
  }

  start(): void {
    if (this.timer) return;
    // Initial sync
    this.sync();
    this.timer = setInterval(() => this.sync(), SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async sync(): Promise<void> {
    if (!this.config.apiKey) return;

    try {
      const res = await fetch(`${this.config.apiUrl}/shield/policy`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return;

      const policy = await res.json();
      if (policy.security_level) {
        this.config.securityLevel = policy.security_level as SecurityLevel;
      }
      if (Array.isArray(policy.custom_blacklist)) {
        this.config.customBlacklist = policy.custom_blacklist;
      }
      if (Array.isArray(policy.trusted_sources)) {
        this.config.trustedSources = policy.trusted_sources;
      }
      if (typeof policy.entropy_threshold === "number") {
        this.config.entropyThreshold = policy.entropy_threshold;
      }
      if (typeof policy.max_input_length === "number") {
        this.config.maxInputLength = policy.max_input_length;
      }
      if (typeof policy.auto_block === "boolean") {
        this.config.autoBlock = policy.auto_block;
      }
    } catch {
      // Dashboard unreachable — continue with local config
    }
  }

  /** Force a manual sync (for /shield sync command) */
  async forceSync(): Promise<boolean> {
    try {
      await this.sync();
      return true;
    } catch {
      return false;
    }
  }
}
