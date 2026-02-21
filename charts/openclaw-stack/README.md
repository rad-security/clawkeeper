# OpenClaw Stack Helm Chart

Hardened OpenClaw deployment with optional RAD Security runtime protection.

## Quick Start

```bash
helm repo add clawkeeper https://charts.clawkeeper.dev
helm repo update
helm install openclaw clawkeeper/openclaw-stack \
  --set openclaw.env.ANTHROPIC_API_KEY=sk-ant-...
```

## Security Defaults

Security is **ON by default**. You opt OUT of protections, never opt IN.

| Control | Default | Source |
|---|---|---|
| Non-root (uid 1000) | Enabled | `security.podSecurityContext` |
| Read-only root FS | Enabled | `security.containerSecurityContext` |
| Drop ALL capabilities | Enabled | `security.containerSecurityContext` |
| NetworkPolicy (DNS+HTTPS egress) | Enabled | `security.networkPolicy` |
| Seccomp RuntimeDefault | Enabled | `security.podSecurityContext` |
| PodDisruptionBudget | Enabled | `security.pdb` |
| No automounted SA token | Enabled | `serviceaccount.yaml` |

## RAD Security Integration

Enable eBPF behavioral fingerprinting for runtime threat detection:

```bash
helm install openclaw clawkeeper/openclaw-stack \
  --set rad.enabled=true \
  --set rad.base64AccessKeyId=YOUR_KEY \
  --set rad.base64SecretKey=YOUR_SECRET
```

Get RAD Security credentials at [radsecurity.ai/trial](https://www.radsecurity.ai/trial?ref=clawkeeper).

### RAD Components

| Component | Default | Description |
|---|---|---|
| `rad.runtime` | Enabled (when rad.enabled) | eBPF behavioral fingerprinting |
| `rad.guard` | Disabled | Admission controller |
| `rad.sbom` | Disabled | Image SBOM generation |
| `rad.sync` | Disabled | Policy sync from RAD API |
| `rad.watch` | Disabled | Cluster state tracking |

## Clawkeeper Dashboard Agent

Connect to [clawkeeper.dev](https://clawkeeper.dev) for centralized scan visibility:

```bash
helm upgrade openclaw clawkeeper/openclaw-stack \
  --set clawkeeper.agent.enabled=true \
  --set clawkeeper.agent.apiKey=ck_live_...
```

The agent runs as a CronJob (hourly by default) and uploads scan results to your dashboard.

## Values

### Environment Profiles

| Profile | File | Use Case |
|---|---|---|
| Default | `values.yaml` | Production-ready with all security controls |
| Production | `values-production.yaml` | HA, autoscaling, stricter limits |
| Development | `values-development.yaml` | Relaxed for minikube/kind |

```bash
# Production HA deployment
helm install openclaw clawkeeper/openclaw-stack -f values-production.yaml

# Local development
helm install openclaw clawkeeper/openclaw-stack -f values-development.yaml
```

### Key Values

| Parameter | Default | Description |
|---|---|---|
| `openclaw.image.repository` | `ghcr.io/openclaw/openclaw` | Container image |
| `openclaw.image.tag` | `latest` | Image tag |
| `openclaw.replicas` | `1` | Replica count |
| `openclaw.gateway.port` | `18789` | Gateway listen port |
| `openclaw.persistence.enabled` | `true` | Enable workspace PVC |
| `openclaw.persistence.size` | `10Gi` | PVC size |
| `openclaw.env` | `{}` | Extra environment variables (API keys) |
| `security.networkPolicy.enabled` | `true` | Deploy NetworkPolicy |
| `security.pdb.enabled` | `true` | Deploy PodDisruptionBudget |
| `resources.limits.cpu` | `2` | CPU limit |
| `resources.limits.memory` | `4Gi` | Memory limit |
| `autoscaling.enabled` | `false` | Enable HPA |
| `ingress.enabled` | `false` | Deploy Ingress |
| `rad.enabled` | `false` | Deploy RAD Security stack |
| `clawkeeper.agent.enabled` | `false` | Deploy dashboard agent CronJob |
| `clawkeeper.agent.schedule` | `0 * * * *` | Scan schedule (cron) |

## Architecture

```
┌─────────────────────────────────────────┐
│ Namespace: openclaw                      │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  OpenClaw     │  │ Clawkeeper      │  │
│  │  Deployment   │  │ Agent CronJob   │  │
│  │  (gateway)    │  │ (hourly scans)  │  │
│  └──────┬───────┘  └────────┬────────┘  │
│         │                    │           │
│  ┌──────┴───────┐           │           │
│  │  ClusterIP   │           │           │
│  │  Service     │           ▼           │
│  └──────────────┘   clawkeeper.dev API  │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  NetworkPolicy                    │   │
│  │  Egress: DNS (53) + HTTPS (443)  │   │
│  │  Ingress: same-namespace only    │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  RAD Security (optional)          │   │
│  │  eBPF Runtime DaemonSet           │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Minimus Hardened Image

For maximum security, use the Minimus-based image (97% fewer CVEs):

```bash
helm install openclaw clawkeeper/openclaw-stack \
  --set openclaw.image.repository=ghcr.io/rad-security/openclaw-hardened
```

> **Note:** Minimus images have no shell. Use `values-development.yaml` with the standard image for debugging.

## Uninstall

```bash
helm uninstall openclaw
```
