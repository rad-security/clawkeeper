import { tutorialMetadata } from "@/lib/tutorials/metadata";
import { StepBlock } from "@/components/tutorials/StepBlock";
import { CommandBlock } from "@/components/tutorials/CommandBlock";
import { PlatformTabs } from "@/components/tutorials/PlatformTabs";
import { TipCallout } from "@/components/tutorials/TipCallout";
import { TerminalMockup } from "@/components/tutorials/TerminalMockup";
import { TutorialFooter } from "@/components/tutorials/TutorialFooter";
import Link from "next/link";

export const metadata = tutorialMetadata({
  title: "Continuous Security Monitoring for OpenClaw",
  description:
    "Set up automated Clawkeeper scanning with launchd and systemd, understand grading thresholds, configure alerts, and scale to multi-host deployments.",
  slug: "continuous-monitoring",
});

export default function ContinuousMonitoringPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Continuous Security Monitoring
      </h1>
      <p className="mb-8 text-lg text-zinc-400">
        Automate Clawkeeper scans, track grades over time, and get alerted when your security posture drops.
      </p>

      {/* Agent setup */}
      <h2 className="mb-4 mt-10 text-xl font-semibold text-white">
        Agent Installation
      </h2>

      <StepBlock step={1} title="Install the Clawkeeper agent">
        <CommandBlock command="clawkeeper agent --install" />
        <p>
          The agent registers your host with the Clawkeeper dashboard and configures
          automated scanning. It runs as your user (not root).
        </p>
        <TipCallout variant="info" title="API key required">
          You need a Clawkeeper API key. Generate one at{" "}
          <Link href="/dashboard" className="text-cyan-400 underline">Settings &rarr; API Keys</Link>.
        </TipCallout>
      </StepBlock>

      {/* Scheduler */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Automated Scheduling
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        The agent installs a scheduler that runs Clawkeeper at regular intervals.
      </p>

      <PlatformTabs
        macOS={
          <div className="space-y-4">
            <StepBlock step={2} title="launchd configuration">
              <p>The agent creates a launch agent at:</p>
              <code className="block rounded bg-white/5 px-3 py-1.5 text-sm text-cyan-400">
                ~/Library/LaunchAgents/dev.clawkeeper.agent.plist
              </code>
              <TerminalMockup title="dev.clawkeeper.agent.plist">
                <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>dev.clawkeeper.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/clawkeeper</string>
    <string>scan</string>
    <string>--upload</string>
  </array>
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>StandardOutPath</key>
  <string>/tmp/clawkeeper.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/clawkeeper.err</string>
</dict>
</plist>`}</pre>
              </TerminalMockup>
              <CommandBlock command="launchctl load ~/Library/LaunchAgents/dev.clawkeeper.agent.plist" />
            </StepBlock>
          </div>
        }
        linux={
          <div className="space-y-4">
            <StepBlock step={2} title="systemd timer configuration">
              <p>The agent creates a service and timer at:</p>
              <code className="block rounded bg-white/5 px-3 py-1.5 text-sm text-cyan-400">
                ~/.config/systemd/user/clawkeeper.service
              </code>
              <TerminalMockup title="clawkeeper.service">
                <pre>{`[Unit]
Description=Clawkeeper Security Scan

[Service]
Type=oneshot
ExecStart=/usr/local/bin/clawkeeper scan --upload`}</pre>
              </TerminalMockup>
              <TerminalMockup title="clawkeeper.timer">
                <pre>{`[Unit]
Description=Run Clawkeeper every hour

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target`}</pre>
              </TerminalMockup>
              <CommandBlock command="systemctl --user enable --now clawkeeper.timer" />
            </StepBlock>
          </div>
        }
      />

      <StepBlock step={3} title="Verify the scheduler">
        <PlatformTabs
          macOS={
            <CommandBlock command="launchctl list | grep clawkeeper" />
          }
          linux={
            <CommandBlock command="systemctl --user status clawkeeper.timer" />
          }
        />
      </StepBlock>

      {/* Grading */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Grading System
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        Clawkeeper assigns a letter grade (A-F) based on the percentage of passed checks.
      </p>

      <div className="my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-2 pr-6 font-medium text-zinc-400">Grade</th>
              <th className="pb-2 pr-6 font-medium text-zinc-400">Score</th>
              <th className="pb-2 font-medium text-zinc-400">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-6 font-bold text-emerald-400">A</td>
              <td className="py-2 pr-6">90 &ndash; 100</td>
              <td className="py-2">Excellent — all critical checks pass</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-6 font-bold text-emerald-300">B</td>
              <td className="py-2 pr-6">80 &ndash; 89</td>
              <td className="py-2">Good — minor issues only</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-6 font-bold text-amber-400">C</td>
              <td className="py-2 pr-6">70 &ndash; 79</td>
              <td className="py-2">Fair — some important checks failing</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-6 font-bold text-orange-400">D</td>
              <td className="py-2 pr-6">60 &ndash; 69</td>
              <td className="py-2">Poor — significant security gaps</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-6 font-bold text-red-400">F</td>
              <td className="py-2 pr-6">&lt; 60</td>
              <td className="py-2">Critical — immediate action required</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-zinc-400">
        Not all checks are weighted equally. Critical checks (firewall, FileVault, SSH hardening)
        carry more weight than informational ones (Spotlight, analytics).
      </p>

      {/* Dashboard & Alerts */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Dashboard &amp; Alerts
      </h2>

      <StepBlock step={4} title="View scan history on the dashboard">
        <p>
          The Pro plan dashboard shows grade history over time, per-check trends,
          and drift detection (when a previously-passing check starts failing).
        </p>
        <TipCallout variant="tip" title="Pro feature">
          Grade history and trend charts require a{" "}
          <Link href="/#pricing" className="text-cyan-400 underline">Pro plan</Link>.
          Free users see their latest scan only.
        </TipCallout>
      </StepBlock>

      <StepBlock step={5} title="Configure alerts">
        <p>
          Set up email alerts for grade drops. You&apos;ll be notified when:
        </p>
        <ul className="list-disc space-y-1 pl-6 text-zinc-400">
          <li>Your grade drops by one or more letters</li>
          <li>A critical check starts failing</li>
          <li>A new CVE affects your OpenClaw version</li>
        </ul>
        <p className="mt-2">
          Configure alerts at{" "}
          <Link href="/dashboard" className="text-cyan-400 underline">Dashboard &rarr; Settings &rarr; Alerts</Link>.
        </p>
      </StepBlock>

      {/* Triage */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Grade Drop Triage
      </h2>

      <StepBlock step={6} title="Investigate a grade drop">
        <CommandBlock command={'clawkeeper scan --json | jq \'.checks[] | select(.status == "FAIL")\''} />
        <p>This shows only failing checks. Common causes of grade drops:</p>
        <ul className="list-disc space-y-1 pl-6 text-zinc-400">
          <li><strong>OS update</strong> — system preferences can reset (firewall, FileVault)</li>
          <li><strong>New OpenClaw version</strong> — config format changes, new check requirements</li>
          <li><strong>Skill install</strong> — new skill triggers a skills_security finding</li>
          <li><strong>Config change</strong> — someone modified config.json or .env</li>
        </ul>
      </StepBlock>

      <TerminalMockup title="Grade drop investigation">
        <div>
          <p className="text-cyan-400">$ clawkeeper scan --json | jq &apos;.checks[] | select(.status == &quot;FAIL&quot;)&apos;</p>
          <p className="mt-2 text-zinc-300">
            {`{`}
          </p>
          <p className="text-zinc-300 pl-4">
            {`"check_name": "firewall",`}
          </p>
          <p className="text-zinc-300 pl-4">
            {`"status": "FAIL",`}
          </p>
          <p className="text-zinc-300 pl-4">
            {`"detail": "macOS firewall is disabled"`}
          </p>
          <p className="text-zinc-300">
            {`}`}
          </p>
          <p className="mt-1 text-zinc-500">→ macOS update reset firewall setting</p>
        </div>
      </TerminalMockup>

      {/* Multi-host */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Multi-Host Scaling
      </h2>

      <StepBlock step={7} title="Scale to multiple hosts">
        <p>
          For teams running OpenClaw across multiple machines, install the agent on each host.
          The dashboard aggregates results per-host with a fleet-wide security overview.
        </p>
        <CommandBlock
          command="for host in web1 web2 web3; do ssh $host 'curl -fsSL https://clawkeeper.dev/install.sh | bash -s -- agent --install'; done"
          annotation="Deploys the agent to three hosts via SSH."
        />
        <TipCallout variant="info" title="Enterprise feature">
          Fleet-wide dashboards, role-based access, and SSO are available on the{" "}
          <Link href="/#pricing" className="text-cyan-400 underline">Enterprise plan</Link>.
        </TipCallout>
      </StepBlock>

      <TutorialFooter
        nextHref="/tutorials/runtime-shield-setup"
        nextLabel="Runtime Shield Setup"
      />
    </div>
  );
}
