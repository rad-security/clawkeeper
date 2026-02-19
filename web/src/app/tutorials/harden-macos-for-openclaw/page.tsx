import { tutorialMetadata } from "@/lib/tutorials/metadata";
import { StepBlock } from "@/components/tutorials/StepBlock";
import { CommandBlock } from "@/components/tutorials/CommandBlock";
import { CheckReference } from "@/components/tutorials/CheckReference";
import { TipCallout } from "@/components/tutorials/TipCallout";
import { TerminalMockup } from "@/components/tutorials/TerminalMockup";
import { TutorialFooter } from "@/components/tutorials/TutorialFooter";

export const metadata = tutorialMetadata({
  title: "Harden macOS for OpenClaw",
  description:
    "Complete macOS hardening guide for OpenClaw: firewall, FileVault, network services, privacy settings, and all 15 Clawkeeper host hardening checks.",
  slug: "harden-macos-for-openclaw",
});

export default function HardenMacOSPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Harden macOS for OpenClaw
      </h1>
      <p className="mb-8 text-lg text-zinc-400">
        Lock down your Mac before running AI agents. Covers all 15 Clawkeeper host hardening checks.
      </p>

      {/* Critical: Firewall + FileVault + Admin User */}
      <h2 className="mb-4 mt-10 text-xl font-semibold text-white">
        Critical Settings
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        These three checks carry the highest weight in Clawkeeper&apos;s scoring. Fix them first.
      </p>

      <StepBlock step={1} title="Enable the macOS Firewall">
        <CommandBlock command="sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on" />
        <p>
          The firewall blocks unsolicited inbound connections. Without it, any service OpenClaw starts
          (like a local MCP server) could be reachable from the network.
        </p>
        <CheckReference
          name="firewall"
          phase="host_hardening"
          description="Verifies the macOS application firewall is enabled"
        />
      </StepBlock>

      <StepBlock step={2} title="Enable FileVault">
        <CommandBlock command="sudo fdesetup enable" />
        <p>
          FileVault encrypts your startup disk. If your laptop is stolen, your OpenClaw config,
          API keys, and conversation history stay protected.
        </p>
        <CheckReference
          name="filevault"
          phase="host_hardening"
          description="Checks that FileVault full-disk encryption is active"
        />
        <TipCallout variant="warning" title="Save your recovery key">
          When you enable FileVault, you&apos;ll get a recovery key. Store it in a password manager — not on the same Mac.
        </TipCallout>
      </StepBlock>

      <StepBlock step={3} title="Use a standard (non-admin) account">
        <p>
          Create a standard user for daily work and only switch to admin for installations.
          This limits what a compromised OpenClaw skill can do.
        </p>
        <CommandBlock command="System Preferences → Users & Groups → Add non-admin account" />
        <CheckReference
          name="admin_user"
          phase="host_hardening"
          description="Warns if the current user has admin privileges"
        />
      </StepBlock>

      {/* Privacy & Telemetry */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Privacy &amp; Telemetry
      </h2>
      <p className="mb-6 text-sm text-zinc-300">
        Disable features that leak data. Each is a separate Clawkeeper check.
      </p>

      <div className="space-y-4">
        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            Siri &amp; Dictation
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">Disable Siri to prevent voice data from being sent to Apple servers.</p>
            <p><strong>System Preferences → Siri &amp; Spotlight → Disable &quot;Ask Siri&quot;</strong></p>
            <CheckReference name="siri" phase="host_hardening" description="Checks that Siri is disabled" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            Location Services
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">Unless you need location-aware skills, disable system-wide location services.</p>
            <p><strong>System Preferences → Privacy &amp; Security → Location Services → Off</strong></p>
            <CheckReference name="location_services" phase="host_hardening" description="Checks that location services are disabled" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            Bluetooth
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">Disable Bluetooth when not in active use to reduce the wireless attack surface.</p>
            <CommandBlock command="sudo defaults write /Library/Preferences/com.apple.Bluetooth ControllerPowerState -int 0" />
            <CheckReference name="bluetooth" phase="host_hardening" description="Checks Bluetooth is disabled when not needed" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            AirDrop
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">AirDrop enables file receiving from nearby devices. Set to &quot;No One&quot; or &quot;Contacts Only&quot;.</p>
            <CommandBlock command='defaults write com.apple.sharingd DiscoverableMode -string "Off"' />
            <CheckReference name="airdrop" phase="host_hardening" description="Checks that AirDrop is restricted or disabled" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            Analytics &amp; Diagnostics
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">Opt out of sharing analytics data with Apple and third-party developers.</p>
            <p><strong>System Preferences → Privacy &amp; Security → Analytics &amp; Improvements → Disable all</strong></p>
            <CheckReference name="analytics" phase="host_hardening" description="Verifies analytics sharing is disabled" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            Spotlight Suggestions
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">Spotlight sends search queries to Apple. Disable Spotlight Suggestions to keep searches local.</p>
            <p><strong>System Preferences → Siri &amp; Spotlight → Uncheck &quot;Spotlight Suggestions&quot;</strong></p>
            <CheckReference name="spotlight" phase="host_hardening" description="Checks that Spotlight Suggestions are disabled" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            iCloud Sync
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">
              If your OpenClaw workspace is in an iCloud-synced folder, config files and secrets
              get uploaded to Apple servers. Move your workspace outside of iCloud.
            </p>
            <CheckReference name="icloud" phase="host_hardening" description="Warns if workspace is inside an iCloud-synced directory" />
          </div>
        </details>

        <details className="group rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            Automatic Login
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            <p className="mb-2">Disable automatic login so a password is required at boot. Especially important for laptops.</p>
            <CommandBlock command="sudo defaults delete /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null" />
            <CheckReference name="automatic_login" phase="host_hardening" description="Checks that automatic login is disabled" />
          </div>
        </details>
      </div>

      {/* Network Services */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Network Services
      </h2>
      <p className="mb-6 text-sm text-zinc-300">
        Disable sharing services that expose your machine to the local network.
      </p>

      <StepBlock step={1} title="Disable Screen Sharing">
        <CommandBlock command="sudo launchctl disable system/com.apple.screensharing" />
        <CheckReference name="screen_sharing" phase="network" description="Verifies Screen Sharing (VNC) is disabled" />
      </StepBlock>

      <StepBlock step={2} title="Disable Remote Login (SSH)">
        <CommandBlock command="sudo systemsetup -setremotelogin off" />
        <p>If you need SSH, restrict it to specific users with <code className="text-cyan-400">AllowUsers</code> in sshd_config.</p>
        <CheckReference name="remote_login" phase="network" description="Checks that Remote Login (sshd) is disabled or restricted" />
      </StepBlock>

      <StepBlock step={3} title="Disable Bonjour / mDNS">
        <CommandBlock command="sudo defaults write /Library/Preferences/com.apple.mDNSResponder.plist NoMulticastAdvertisements -bool true" />
        <CheckReference name="mdns_bonjour" phase="network" description="Checks that mDNS/Bonjour advertising is suppressed" />
      </StepBlock>

      <StepBlock step={4} title="Enable Network Isolation">
        <p>
          If you run OpenClaw in Docker, ensure the container can&apos;t reach your LAN.
          Use Docker&apos;s <code className="text-cyan-400">internal</code> network mode.
        </p>
        <CheckReference name="network_isolation" phase="network" description="Verifies network isolation between OpenClaw and the LAN" />
      </StepBlock>

      {/* Checklist */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Complete 15-Check Checklist
      </h2>

      <TerminalMockup title="clawkeeper — host hardening + network">
        <div>
          <p className="text-cyan-400">$ npx clawkeeper scan --phase host_hardening,network</p>
          <p className="mt-2">
            {[
              { s: "PASS", c: "text-emerald-400", n: "firewall" },
              { s: "PASS", c: "text-emerald-400", n: "filevault" },
              { s: "PASS", c: "text-emerald-400", n: "admin_user" },
              { s: "PASS", c: "text-emerald-400", n: "siri" },
              { s: "PASS", c: "text-emerald-400", n: "location_services" },
              { s: "PASS", c: "text-emerald-400", n: "bluetooth" },
              { s: "PASS", c: "text-emerald-400", n: "airdrop" },
              { s: "PASS", c: "text-emerald-400", n: "analytics" },
              { s: "PASS", c: "text-emerald-400", n: "spotlight" },
              { s: "PASS", c: "text-emerald-400", n: "icloud" },
              { s: "PASS", c: "text-emerald-400", n: "automatic_login" },
              { s: "PASS", c: "text-emerald-400", n: "screen_sharing" },
              { s: "PASS", c: "text-emerald-400", n: "remote_login" },
              { s: "PASS", c: "text-emerald-400", n: "mdns_bonjour" },
              { s: "PASS", c: "text-emerald-400", n: "network_isolation" },
            ].map((check) => (
              <span key={check.n} className="block">
                <span className={check.c}>{check.s}</span>{" "}
                <span className="text-zinc-300">{check.n}</span>
              </span>
            ))}
          </p>
          <p className="mt-2 text-zinc-500">─────────────────────────────────</p>
          <p className="mt-1">
            <span className="text-zinc-300">15/15 checks passed.</span>{" "}
            <span className="text-emerald-400 font-bold">Grade: A</span>
          </p>
        </div>
      </TerminalMockup>

      <TipCallout variant="tip" title="Automate it">
        Run <code className="text-cyan-400">clawkeeper scan</code> after every macOS update — system
        preferences can reset during upgrades.
      </TipCallout>

      <TutorialFooter
        nextHref="/tutorials/harden-linux-for-openclaw"
        nextLabel="Harden Linux for OpenClaw"
      />
    </div>
  );
}
