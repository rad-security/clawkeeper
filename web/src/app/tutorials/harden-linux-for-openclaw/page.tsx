import { tutorialMetadata } from "@/lib/tutorials/metadata";
import { StepBlock } from "@/components/tutorials/StepBlock";
import { CommandBlock } from "@/components/tutorials/CommandBlock";
import { CheckReference } from "@/components/tutorials/CheckReference";
import { TipCallout } from "@/components/tutorials/TipCallout";
import { TerminalMockup } from "@/components/tutorials/TerminalMockup";
import { TutorialFooter } from "@/components/tutorials/TutorialFooter";

export const metadata = tutorialMetadata({
  title: "Harden Linux for OpenClaw: VPS & Server Guide",
  description:
    "Complete Linux server hardening guide for OpenClaw: SSH, firewall, fail2ban, auto-updates, disk encryption, and all 9 Clawkeeper Linux checks.",
  slug: "harden-linux-for-openclaw",
});

export default function HardenLinuxPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Harden Linux for OpenClaw
      </h1>
      <p className="mb-8 text-lg text-zinc-400">
        VPS &amp; server hardening guide covering all 9 Clawkeeper Linux checks.
      </p>

      {/* User Account */}
      <h2 className="mb-4 mt-10 text-xl font-semibold text-white">
        User Account Security
      </h2>

      <StepBlock step={1} title="Create a dedicated non-root user">
        <CommandBlock command="adduser openclaw && usermod -aG sudo openclaw" />
        <p>
          Never run OpenClaw as root. A dedicated user limits blast radius if a skill is compromised.
        </p>
        <CheckReference
          name="linux_user_account"
          phase="host_hardening"
          description="Verifies a non-root user account is in use"
        />
      </StepBlock>

      {/* SSH */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        SSH Hardening
      </h2>

      <StepBlock step={2} title="Disable password authentication">
        <p>Edit <code className="text-cyan-400">/etc/ssh/sshd_config</code>:</p>
        <TerminalMockup title="/etc/ssh/sshd_config">
          <pre>{`PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2`}</pre>
        </TerminalMockup>
        <CommandBlock command="sudo systemctl restart sshd" />
        <CheckReference
          name="linux_ssh_hardening"
          phase="host_hardening"
          description="Audits SSH config: key auth, root login, port settings"
        />
        <TipCallout variant="warning" title="Don't lock yourself out">
          Before restarting sshd, open a second SSH session as a backup. Verify your key works before closing the original.
        </TipCallout>
      </StepBlock>

      {/* Firewall */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Firewall Configuration
      </h2>

      <StepBlock step={3} title="Enable UFW with minimal rules">
        <CommandBlock command="sudo ufw default deny incoming && sudo ufw default allow outgoing" />
        <CommandBlock command="sudo ufw allow 22/tcp comment 'SSH'" />
        <CommandBlock command="sudo ufw allow 443/tcp comment 'HTTPS'" />
        <CommandBlock command="sudo ufw enable" />
        <CheckReference
          name="linux_firewall"
          phase="host_hardening"
          description="Ensures UFW/firewalld is active with sensible rules"
        />
        <TipCallout variant="tip" title="Alternative: firewalld">
          On RHEL/Fedora, use <code className="text-cyan-400">firewall-cmd</code> instead. Clawkeeper detects both UFW and firewalld.
        </TipCallout>
      </StepBlock>

      {/* Auto-updates */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Automatic Security Updates
      </h2>

      <StepBlock step={4} title="Enable unattended upgrades">
        <CommandBlock
          title="Ubuntu / Debian"
          command="sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades"
        />
        <CommandBlock
          title="Fedora / RHEL"
          command="sudo dnf install -y dnf-automatic && sudo systemctl enable --now dnf-automatic-install.timer"
        />
        <CheckReference
          name="linux_auto_updates"
          phase="host_hardening"
          description="Checks that automatic security updates are enabled"
        />
      </StepBlock>

      {/* Fail2ban */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Intrusion Prevention
      </h2>

      <StepBlock step={5} title="Install and configure fail2ban">
        <CommandBlock command="sudo apt install -y fail2ban" />
        <TerminalMockup title="/etc/fail2ban/jail.local">
          <pre>{`[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
findtime = 600`}</pre>
        </TerminalMockup>
        <CommandBlock command="sudo systemctl enable --now fail2ban" />
        <CheckReference
          name="linux_fail2ban"
          phase="host_hardening"
          description="Verifies fail2ban is installed and protecting SSH"
        />
      </StepBlock>

      {/* Services */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Unnecessary Services
      </h2>

      <StepBlock step={6} title="Audit and disable unused services">
        <CommandBlock command="sudo systemctl list-unit-files --type=service --state=enabled" />
        <p>
          Review the list and disable anything you don&apos;t need. Common candidates:
          <code className="text-cyan-400"> cups</code>,
          <code className="text-cyan-400"> avahi-daemon</code>,
          <code className="text-cyan-400"> bluetooth</code>.
        </p>
        <CommandBlock command="sudo systemctl disable --now cups avahi-daemon bluetooth" />
        <CheckReference
          name="linux_unnecessary_services"
          phase="host_hardening"
          description="Flags unnecessary services that increase attack surface"
        />
      </StepBlock>

      {/* Disk Encryption */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Disk Encryption
      </h2>

      <StepBlock step={7} title="Verify LUKS encryption">
        <CommandBlock command="sudo lsblk -f | grep -i luks" />
        <p>
          Full disk encryption should be enabled during OS installation.
          If you see LUKS partitions, you&apos;re covered.
        </p>
        <CheckReference
          name="linux_disk_encryption"
          phase="host_hardening"
          description="Checks for LUKS full-disk encryption"
        />
        <TipCallout variant="info" title="VPS providers">
          Most VPS providers don&apos;t support LUKS out of the box. If your provider offers encrypted volumes, enable them.
          Otherwise, this check will be skipped.
        </TipCallout>
      </StepBlock>

      {/* Network */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Network Security
      </h2>

      <StepBlock step={8} title="Harden network settings">
        <TerminalMockup title="/etc/sysctl.d/99-hardening.conf">
          <pre>{`net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0`}</pre>
        </TerminalMockup>
        <CommandBlock command="sudo sysctl --system" />
        <CheckReference
          name="linux_network"
          phase="host_hardening"
          description="Audits kernel network parameters for hardening"
        />
      </StepBlock>

      <StepBlock step={9} title="Audit open ports">
        <CommandBlock command="sudo ss -tlnp" />
        <p>
          Every listening port is a potential entry point. Close ports you don&apos;t recognize, and
          bind services to <code className="text-cyan-400">127.0.0.1</code> when they only need local access.
        </p>
        <CheckReference
          name="linux_open_ports"
          phase="host_hardening"
          description="Lists open ports and flags unexpected listeners"
        />
      </StepBlock>

      {/* Checklist */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Complete 9-Check Checklist
      </h2>

      <TerminalMockup title="clawkeeper — Linux checks">
        <div>
          <p className="text-cyan-400">$ npx clawkeeper scan --phase linux</p>
          <p className="mt-2">
            {[
              "linux_user_account",
              "linux_ssh_hardening",
              "linux_firewall",
              "linux_auto_updates",
              "linux_fail2ban",
              "linux_unnecessary_services",
              "linux_disk_encryption",
              "linux_network",
              "linux_open_ports",
            ].map((name) => (
              <span key={name} className="block">
                <span className="text-emerald-400">PASS</span>{" "}
                <span className="text-zinc-300">{name}</span>
              </span>
            ))}
          </p>
          <p className="mt-2 text-zinc-500">─────────────────────────────────</p>
          <p className="mt-1">
            <span className="text-zinc-300">9/9 checks passed.</span>{" "}
            <span className="text-emerald-400 font-bold">Grade: A</span>
          </p>
        </div>
      </TerminalMockup>

      <TutorialFooter
        nextHref="/tutorials/deploy-openclaw-docker"
        nextLabel="Deploy OpenClaw in Docker"
      />
    </div>
  );
}
