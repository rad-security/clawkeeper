import { tutorialMetadata } from "@/lib/tutorials/metadata";
import { StepBlock } from "@/components/tutorials/StepBlock";
import { CommandBlock } from "@/components/tutorials/CommandBlock";
import { PlatformTabs } from "@/components/tutorials/PlatformTabs";
import { CheckReference } from "@/components/tutorials/CheckReference";
import { ComparisonBlock } from "@/components/tutorials/ComparisonBlock";
import { TipCallout } from "@/components/tutorials/TipCallout";
import { TerminalMockup } from "@/components/tutorials/TerminalMockup";
import { TutorialFooter } from "@/components/tutorials/TutorialFooter";

export const metadata = tutorialMetadata({
  title: "Deploy OpenClaw in Docker: The Secure Way",
  description:
    "Production-ready Docker setup for OpenClaw with container hardening, Docker Compose, volume mounts, network isolation, and resource limits.",
  slug: "deploy-openclaw-docker",
});

export default function DeployDockerPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Deploy OpenClaw in Docker
      </h1>
      <p className="mb-8 text-lg text-zinc-400">
        The secure way to run OpenClaw in production with container hardening and network isolation.
      </p>

      {/* Prerequisites */}
      <h2 className="mb-4 mt-10 text-xl font-semibold text-white">Prerequisites</h2>

      <PlatformTabs
        macOS={
          <div className="space-y-3">
            <CommandBlock command="brew install --cask docker" annotation="Launch Docker Desktop after installation." />
            <CheckReference name="docker_installed" phase="prerequisites" description="Checks Docker is installed and the daemon is running" />
          </div>
        }
        linux={
          <div className="space-y-3">
            <CommandBlock command="curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER" />
            <CheckReference name="linux_docker" phase="prerequisites" description="Validates Docker group membership and daemon status on Linux" />
            <TipCallout variant="warning" title="Log out required">
              You need to log out and back in after adding your user to the docker group.
            </TipCallout>
          </div>
        }
      />

      {/* Basic docker run */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Quick Start: Docker Run
      </h2>

      <StepBlock step={1} title="Run OpenClaw in a container">
        <CommandBlock command="docker run -it --rm -v $(pwd)/workspace:/workspace anthropic/openclaw" />
        <p>This mounts your local <code className="text-cyan-400">workspace</code> directory into the container.</p>
      </StepBlock>

      <TipCallout variant="info" title="Ephemeral by default">
        The <code className="text-cyan-400">--rm</code> flag removes the container on exit.
        Your work is preserved in the mounted volume.
      </TipCallout>

      {/* Docker Compose */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Production Setup: Docker Compose
      </h2>

      <StepBlock step={2} title="Create docker-compose.yml">
        <TerminalMockup title="docker-compose.yml">
          <pre>{`version: "3.8"

services:
  openclaw:
    image: anthropic/openclaw:latest
    container_name: openclaw
    restart: unless-stopped

    # Security: drop all capabilities, add only what's needed
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    # Security: read-only root filesystem
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m

    # Security: no privilege escalation
    security_opt:
      - no-new-privileges:true

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          memory: 512M

    # Volumes
    volumes:
      - ./workspace:/workspace
      - openclaw-config:/home/openclaw/.config

    # Network: use internal network
    networks:
      - openclaw-net

    # Environment
    environment:
      - NODE_ENV=production

networks:
  openclaw-net:
    internal: true  # No external internet access

volumes:
  openclaw-config:`}</pre>
        </TerminalMockup>
      </StepBlock>

      <StepBlock step={3} title="Start the stack">
        <CommandBlock command="docker compose up -d" />
        <CommandBlock command="docker compose logs -f openclaw" annotation="Watch logs to verify startup." />
      </StepBlock>

      {/* Container Hardening */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Container Hardening
      </h2>
      <p className="mb-4 text-sm text-zinc-300">
        Clawkeeper&apos;s <code className="text-cyan-400">container_security</code> check audits these settings.
      </p>

      <ComparisonBlock
        insecureTitle="Default (insecure)"
        secureTitle="Hardened"
        insecure={
          <pre>{`docker run -it \\
  --privileged \\
  -v /:/host \\
  anthropic/openclaw`}</pre>
        }
        secure={
          <pre>{`docker run -it --rm \\
  --cap-drop ALL \\
  --cap-add NET_BIND_SERVICE \\
  --read-only \\
  --security-opt no-new-privileges \\
  --memory 2g \\
  --cpus 2 \\
  -v ./workspace:/workspace:rw \\
  anthropic/openclaw`}</pre>
        }
      />

      <CheckReference
        name="container_security"
        phase="security_audit"
        description="Audits container capabilities, read-only fs, privilege escalation, and resource limits"
      />

      <div className="my-6 space-y-3 text-sm text-zinc-300">
        <h3 className="font-semibold text-white">What each flag does:</h3>
        <ul className="list-disc space-y-2 pl-6 text-zinc-400">
          <li><code className="text-cyan-400">--cap-drop ALL</code> — removes all Linux capabilities (process, network, filesystem)</li>
          <li><code className="text-cyan-400">--cap-add NET_BIND_SERVICE</code> — allows binding to low-numbered ports if needed</li>
          <li><code className="text-cyan-400">--read-only</code> — makes the root filesystem immutable (prevents malware persistence)</li>
          <li><code className="text-cyan-400">--security-opt no-new-privileges</code> — prevents setuid/setgid escalation</li>
          <li><code className="text-cyan-400">--memory 2g</code> — caps memory to prevent DoS via resource exhaustion</li>
        </ul>
      </div>

      {/* Network Isolation */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Network Isolation
      </h2>

      <StepBlock step={4} title="Use an internal Docker network">
        <p>
          The <code className="text-cyan-400">internal: true</code> setting in Docker Compose prevents the container
          from reaching the internet directly. If OpenClaw needs external API access,
          use a reverse proxy or allowlist specific endpoints.
        </p>
        <CheckReference
          name="network_isolation"
          phase="network"
          description="Verifies network isolation between OpenClaw and the LAN"
        />
      </StepBlock>

      <StepBlock step={5} title="Verify network isolation">
        <CommandBlock command='docker compose exec openclaw sh -c "wget -q --spider https://example.com && echo OPEN || echo BLOCKED"' />
        <p>You should see <code className="text-cyan-400">BLOCKED</code> if the internal network is configured correctly.</p>
      </StepBlock>

      {/* Verify */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Verify with Clawkeeper
      </h2>

      <TerminalMockup title="clawkeeper scan">
        <div>
          <p className="text-cyan-400">$ npx clawkeeper scan</p>
          <p className="mt-2">
            <span className="block"><span className="text-emerald-400">PASS</span> <span className="text-zinc-300">docker_installed — Docker 24.0.7 running</span></span>
            <span className="block"><span className="text-emerald-400">PASS</span> <span className="text-zinc-300">container_security — All hardening flags applied</span></span>
            <span className="block"><span className="text-emerald-400">PASS</span> <span className="text-zinc-300">network_isolation — Container on internal network</span></span>
          </p>
        </div>
      </TerminalMockup>

      <TutorialFooter
        nextHref="/tutorials/openclaw-security-audit"
        nextLabel="OpenClaw Security Audit"
      />
    </div>
  );
}
