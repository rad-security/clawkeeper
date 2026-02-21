# OpenClaw Hardened — Minimus base (97% fewer CVEs, no shell, no pkg manager)
# Multi-stage build wrapping official OpenClaw with Minimus runtime

# Stage 1: Extract app from official image
FROM ghcr.io/openclaw/openclaw:latest AS source

# Stage 2: Minimus hardened runtime
FROM us-docker.pkg.dev/prod-375107/minimus-public/node:22 AS production

WORKDIR /app
COPY --from=source /app /app

USER 1000:1000
EXPOSE 18789 18790

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD ["node", "-e", "require('http').get('http://localhost:18789/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"]

ENTRYPOINT ["node", "dist/index.js", "--gateway"]
