import { tutorialMetadata } from "@/lib/tutorials/metadata";
import { StepBlock } from "@/components/tutorials/StepBlock";
import { CommandBlock } from "@/components/tutorials/CommandBlock";
import { PlatformTabs } from "@/components/tutorials/PlatformTabs";
import { CheckReference } from "@/components/tutorials/CheckReference";
import { TipCallout } from "@/components/tutorials/TipCallout";
import { TerminalMockup } from "@/components/tutorials/TerminalMockup";
import { TutorialFooter } from "@/components/tutorials/TutorialFooter";

export const metadata = tutorialMetadata({
  title: "How to Install OpenClaw Securely",
  description:
    "Three secure installation methods for OpenClaw: npm native, Docker, and VPS/cloud. Includes verification steps, common mistakes, and Clawkeeper scan walkthrough.",
  slug: "install-openclaw",
});

export default function InstallOpenClawPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        How to Install OpenClaw Securely
      </h1>
      <p className="mb-8 text-lg text-zinc-400">
        Three installation methods with security verification for each approach.
      </p>

      {/* Prerequisites */}
      <h2 className="mb-4 mt-10 text-xl font-semibold text-white">Prerequisites</h2>

      <PlatformTabs
        macOS={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              You need <strong>Homebrew</strong> and <strong>Node.js 18+</strong> installed.
            </p>
            <CommandBlock
              title="Install Homebrew"
              command='/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
            />
            <CommandBlock
              title="Install Node.js"
              command="brew install node"
            />
            <CheckReference
              name="homebrew"
              phase="prerequisites"
              description="Verifies Homebrew is installed and up to date"
            />
            <CheckReference
              name="node"
              phase="prerequisites"
              description="Checks Node.js version meets minimum requirements"
            />
          </div>
        }
        linux={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              You need <strong>Node.js 18+</strong> and essential build tools.
            </p>
            <CommandBlock
              title="Ubuntu / Debian"
              command="sudo apt update && sudo apt install -y nodejs npm build-essential"
            />
            <CommandBlock
              title="Fedora / RHEL"
              command="sudo dnf install -y nodejs npm gcc-c++ make"
            />
            <CheckReference
              name="linux_essentials"
              phase="prerequisites"
              description="Ensures essential packages are present"
            />
            <CheckReference
              name="linux_node"
              phase="prerequisites"
              description="Checks Node.js version on Linux"
            />
          </div>
        }
      />

      {/* Method 1: npm */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Method 1: npm Native Install
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        The simplest approach — installs OpenClaw directly on your host machine.
      </p>

      <StepBlock step={1} title="Install OpenClaw globally">
        <CommandBlock command="npm install -g @anthropic-ai/openclaw" />
      </StepBlock>

      <StepBlock step={2} title="Verify the installation">
        <CommandBlock command="openclaw --version" />
        <p>Confirm you see a version number like <code className="text-cyan-400">0.2.x</code> or later.</p>
      </StepBlock>

      <StepBlock step={3} title="Run your first scan">
        <CommandBlock command="npx clawkeeper scan" />
        <CheckReference
          name="native_openclaw"
          phase="prerequisites"
          description="Detects native OpenClaw installation path and version"
        />
      </StepBlock>

      <TipCallout variant="tip" title="Recommended">
        Use a version manager like <code className="text-cyan-400">nvm</code> or{" "}
        <code className="text-cyan-400">fnm</code> to avoid global npm permission issues.
      </TipCallout>

      {/* Method 2: Docker */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Method 2: Docker (Recommended)
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        Docker isolates OpenClaw from your host, reducing the attack surface.
      </p>

      <StepBlock step={1} title="Install Docker">
        <PlatformTabs
          macOS={
            <CommandBlock command="brew install --cask docker" annotation="Then launch Docker Desktop from Applications." />
          }
          linux={
            <CommandBlock command="curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER" annotation="Log out and back in for group changes to take effect." />
          }
        />
        <CheckReference
          name="docker_installed"
          phase="prerequisites"
          description="Checks Docker is installed and the daemon is running"
        />
      </StepBlock>

      <StepBlock step={2} title="Pull and run OpenClaw">
        <CommandBlock command="docker run -it --rm -v $(pwd):/workspace anthropic/openclaw" />
      </StepBlock>

      <StepBlock step={3} title="Verify with Clawkeeper">
        <CommandBlock command="npx clawkeeper scan" />
        <CheckReference
          name="linux_docker"
          phase="prerequisites"
          description="Validates Docker group membership and daemon status on Linux"
        />
      </StepBlock>

      <TipCallout variant="info" title="Why Docker?">
        Docker adds a layer of isolation — if a skill is compromised, it can&apos;t reach your host filesystem directly.
        See the <a href="/tutorials/deploy-openclaw-docker" className="text-cyan-400 underline">Docker Deployment tutorial</a> for a full production setup.
      </TipCallout>

      {/* Method 3: VPS */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Method 3: VPS / Cloud Server
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        Running OpenClaw on a remote server requires additional hardening.
      </p>

      <StepBlock step={1} title="Secure SSH access">
        <CommandBlock command="ssh-keygen -t ed25519 -C openclaw-server" />
        <p>Copy the public key to your server and disable password authentication.</p>
        <CheckReference
          name="linux_ssh_hardening"
          phase="host_hardening"
          description="Audits SSH config: key auth, root login, port settings"
        />
      </StepBlock>

      <StepBlock step={2} title="Configure the firewall">
        <CommandBlock command="sudo ufw allow 22/tcp && sudo ufw allow 443/tcp && sudo ufw enable" />
        <CheckReference
          name="linux_firewall"
          phase="host_hardening"
          description="Ensures UFW/firewalld is active with sensible rules"
        />
      </StepBlock>

      <StepBlock step={3} title="Create a dedicated user">
        <CommandBlock command="sudo adduser openclaw --disabled-password && sudo usermod -aG docker openclaw" />
        <p>Never run OpenClaw as root.</p>
        <CheckReference
          name="linux_user_account"
          phase="host_hardening"
          description="Verifies a non-root user account is in use"
        />
      </StepBlock>

      <StepBlock step={4} title="Install and scan">
        <CommandBlock command="su - openclaw -c 'npm install -g @anthropic-ai/openclaw && npx clawkeeper scan'" />
      </StepBlock>

      {/* Terminal mockup */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        What a First Scan Looks Like
      </h2>
      <TerminalMockup title="clawkeeper scan">
        <div>
          <p className="text-cyan-400">$ npx clawkeeper scan</p>
          <p className="mt-2 text-zinc-500">Running 44 security checks...</p>
          <p className="mt-1">
            <span className="text-emerald-400">PASS</span>{" "}
            <span className="text-zinc-300">homebrew — Homebrew is installed</span>
          </p>
          <p>
            <span className="text-emerald-400">PASS</span>{" "}
            <span className="text-zinc-300">node — Node.js v20.11.0</span>
          </p>
          <p>
            <span className="text-emerald-400">PASS</span>{" "}
            <span className="text-zinc-300">docker_installed — Docker 24.0.7</span>
          </p>
          <p>
            <span className="text-red-400">FAIL</span>{" "}
            <span className="text-zinc-300">firewall — macOS firewall is disabled</span>
          </p>
          <p>
            <span className="text-red-400">FAIL</span>{" "}
            <span className="text-zinc-300">filevault — FileVault is not enabled</span>
          </p>
          <p className="mt-2 text-zinc-500">─────────────────────────────────</p>
          <p className="mt-1">
            <span className="text-zinc-300">Security Grade:</span>{" "}
            <span className="text-amber-400 font-bold">C (72/100)</span>
          </p>
          <p className="text-zinc-500">2 critical issues found. Run with --fix for remediation steps.</p>
        </div>
      </TerminalMockup>

      {/* Common mistakes */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Common Mistakes
      </h2>
      <TipCallout variant="warning" title="Don't run as root">
        Installing OpenClaw with <code className="text-amber-400">sudo npm install -g</code> can lead to
        permission issues and weakens the security boundary between OpenClaw and your system.
      </TipCallout>
      <TipCallout variant="danger" title="Don't skip verification">
        Always run <code className="text-red-400">openclaw --version</code> after installation.
        A failed install can leave a partial binary that silently breaks skills.
      </TipCallout>

      <TutorialFooter
        nextHref="/tutorials/harden-macos-for-openclaw"
        nextLabel="Harden macOS for OpenClaw"
      />
    </div>
  );
}
