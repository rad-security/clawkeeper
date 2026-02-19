import { tutorialMetadata } from "@/lib/tutorials/metadata";
import { StepBlock } from "@/components/tutorials/StepBlock";
import { CommandBlock } from "@/components/tutorials/CommandBlock";
import { CheckReference } from "@/components/tutorials/CheckReference";
import { ComparisonBlock } from "@/components/tutorials/ComparisonBlock";
import { TipCallout } from "@/components/tutorials/TipCallout";
import { TerminalMockup } from "@/components/tutorials/TerminalMockup";
import { TutorialFooter } from "@/components/tutorials/TutorialFooter";

export const metadata = tutorialMetadata({
  title: "OpenClaw Security Audit: What to Check and Why",
  description:
    "Complete OpenClaw security audit guide: version and CVE detection, config review, credential exposure, skills vetting, container security, and all 11 audit checks.",
  slug: "openclaw-security-audit",
});

export default function SecurityAuditPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        OpenClaw Security Audit
      </h1>
      <p className="mb-8 text-lg text-zinc-400">
        What to check and why — covering all 11 Clawkeeper security audit checks.
      </p>

      {/* Version & CVE */}
      <h2 className="mb-4 mt-10 text-xl font-semibold text-white">
        Version &amp; CVE Detection
      </h2>

      <StepBlock step={1} title="Check your OpenClaw version">
        <CommandBlock command="openclaw --version" />
        <p>
          Clawkeeper cross-references your version against known CVEs. Outdated versions
          may have unpatched vulnerabilities.
        </p>
        <CheckReference
          name="openclaw_version"
          phase="security_audit"
          description="Detects installed version and checks against known CVEs"
        />
      </StepBlock>

      <div className="my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-2 pr-4 font-medium text-zinc-400">CVE</th>
              <th className="pb-2 pr-4 font-medium text-zinc-400">Severity</th>
              <th className="pb-2 pr-4 font-medium text-zinc-400">Affected</th>
              <th className="pb-2 font-medium text-zinc-400">Fix</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">CVE-2024-XXXXX</td>
              <td className="py-2 pr-4"><span className="text-red-400">Critical</span></td>
              <td className="py-2 pr-4">&lt; 0.2.0</td>
              <td className="py-2">Upgrade to 0.2.1+</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono text-xs">CVE-2024-YYYYY</td>
              <td className="py-2 pr-4"><span className="text-amber-400">High</span></td>
              <td className="py-2 pr-4">&lt; 0.1.8</td>
              <td className="py-2">Upgrade to 0.1.9+</td>
            </tr>
          </tbody>
        </table>
      </div>

      <TipCallout variant="danger" title="Stay updated">
        Always run the latest stable version. Clawkeeper&apos;s CVE database is updated with each release.
      </TipCallout>

      {/* Config Audit */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Configuration Audit
      </h2>

      <StepBlock step={2} title="Review your OpenClaw config">
        <CommandBlock command="cat ~/.config/openclaw/config.json" />
        <p>Clawkeeper checks for insecure defaults and dangerous settings.</p>
        <CheckReference
          name="openclaw_config"
          phase="security_audit"
          description="Audits OpenClaw configuration for insecure settings"
        />
      </StepBlock>

      <ComparisonBlock
        insecureTitle="Insecure config"
        secureTitle="Secure config"
        insecure={
          <pre>{`{
  "allowHttp": true,
  "skipTlsVerify": true,
  "verbose": true,
  "logLevel": "debug",
  "allowAllHosts": true
}`}</pre>
        }
        secure={
          <pre>{`{
  "allowHttp": false,
  "skipTlsVerify": false,
  "verbose": false,
  "logLevel": "warn",
  "allowAllHosts": false,
  "allowedHosts": [
    "api.anthropic.com"
  ]
}`}</pre>
        }
      />

      {/* Hardening */}
      <StepBlock step={3} title="Hardening audit">
        <p>
          Beyond config, Clawkeeper checks that OpenClaw&apos;s runtime behavior is locked down:
          file permissions, process isolation, and signal handling.
        </p>
        <CheckReference
          name="openclaw_hardening"
          phase="security_audit"
          description="Checks OpenClaw runtime hardening (permissions, isolation)"
        />
      </StepBlock>

      {/* Credentials */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Credential Security
      </h2>

      <StepBlock step={4} title="Check .env files">
        <CommandBlock command="find . -name '.env*' -exec echo 'Found: {}' \\;" />
        <p>
          Ensure <code className="text-cyan-400">.env</code> files aren&apos;t committed to git and have restrictive permissions (600).
        </p>
        <CheckReference
          name="env_file"
          phase="security_audit"
          description="Audits .env file permissions and git tracking status"
        />
      </StepBlock>

      <StepBlock step={5} title="Scan for exposed credentials">
        <p>
          Clawkeeper scans your workspace for hardcoded API keys, tokens, and passwords using pattern matching.
        </p>
        <CheckReference
          name="credential_exposure"
          phase="security_audit"
          description="Scans for hardcoded secrets in workspace files"
        />
      </StepBlock>

      <StepBlock step={6} title="Verify credential storage">
        <p>
          Credentials should be in your OS keychain or a secrets manager — not in plain text files.
        </p>
        <CheckReference
          name="credential_store"
          phase="security_audit"
          description="Checks that credentials use secure storage (keychain/vault)"
        />
      </StepBlock>

      <TipCallout variant="warning" title="Common mistake">
        Don&apos;t store your Anthropic API key in <code className="text-amber-400">config.json</code>.
        Use environment variables or your OS keychain instead.
      </TipCallout>

      {/* Skills & SOUL.md */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Skills &amp; SOUL.md
      </h2>

      <StepBlock step={7} title="Audit installed skills">
        <p>
          Skills have broad system access. Clawkeeper performs static analysis on installed skills
          to detect dangerous patterns.
        </p>
        <CheckReference
          name="skills_security"
          phase="security_audit"
          description="Static analysis of installed skills for dangerous patterns"
        />
      </StepBlock>

      <StepBlock step={8} title="Verify SOUL.md integrity">
        <p>
          The SOUL.md file defines your agent&apos;s behavior. Clawkeeper checks for prompt injection,
          base64-encoded payloads, and unicode obfuscation.
        </p>
        <CheckReference
          name="soul_security"
          phase="security_audit"
          description="Audits SOUL.md for prompt injection and obfuscation"
        />
      </StepBlock>

      {/* Container & Gateway */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Container &amp; Gateway
      </h2>

      <StepBlock step={9} title="Container security">
        <p>
          If running in Docker, Clawkeeper audits capabilities, read-only filesystem,
          privilege escalation, and resource limits.
        </p>
        <CheckReference
          name="container_security"
          phase="security_audit"
          description="Audits container hardening settings"
        />
      </StepBlock>

      <StepBlock step={10} title="Gateway configuration">
        <p>
          For deployments using an API gateway, Clawkeeper checks TLS settings, rate limiting,
          authentication requirements, and CORS policy.
        </p>
        <CheckReference
          name="gateway_advanced"
          phase="security_audit"
          description="Audits API gateway configuration for security best practices"
        />
      </StepBlock>

      <StepBlock step={11} title="Instance detection">
        <CommandBlock command="npx clawkeeper scan --check openclaw_running" />
        <p>
          Detects all running OpenClaw instances and their process attributes
          (user, PID, memory usage, port bindings).
        </p>
        <CheckReference
          name="openclaw_running"
          phase="security_audit"
          description="Detects running OpenClaw instances and their attributes"
        />
      </StepBlock>

      {/* Full scan */}
      <h2 className="mb-4 mt-12 text-xl font-semibold text-white">
        Full Audit Scan
      </h2>

      <TerminalMockup title="clawkeeper — security audit">
        <div>
          <p className="text-cyan-400">$ npx clawkeeper scan --phase security_audit</p>
          <p className="mt-2">
            {[
              "openclaw_version",
              "openclaw_config",
              "openclaw_hardening",
              "env_file",
              "credential_exposure",
              "credential_store",
              "skills_security",
              "soul_security",
              "container_security",
              "gateway_advanced",
              "openclaw_running",
            ].map((name) => (
              <span key={name} className="block">
                <span className="text-emerald-400">PASS</span>{" "}
                <span className="text-zinc-300">{name}</span>
              </span>
            ))}
          </p>
          <p className="mt-2 text-zinc-500">─────────────────────────────────</p>
          <p className="mt-1">
            <span className="text-zinc-300">11/11 checks passed.</span>{" "}
            <span className="text-emerald-400 font-bold">Grade: A</span>
          </p>
        </div>
      </TerminalMockup>

      <TutorialFooter
        nextHref="/tutorials/openclaw-skills-security"
        nextLabel="Skills Security"
      />
    </div>
  );
}
