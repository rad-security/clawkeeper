# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Clawkeeper is a security scanner for AI agent hosts. The repo contains:

| Component | Path | Stack | Dev command |
|---|---|---|---|
| CLI Scanner | `clawkeeper.sh`, `lib/`, `checks/` | Pure Bash | `bash clawkeeper.sh scan --non-interactive` |
| Web Dashboard | `web/` | Next.js 16, React 19, TypeScript | `npm run dev` (port 3000) |
| Desktop App | `desktop/` | Tauri 2 + React + Vite | `npm run dev` (frontend only; Tauri needs Rust) |
| Runtime Shield | `runtime-shield/` | TypeScript library | `npm run build` |

### Web dashboard

- **Package manager**: npm (lockfile: `web/package-lock.json`).
- **Dev server**: `cd web && npm run dev` starts on port 3000.
- **Lint**: `cd web && npm run lint` (ESLint, flat config at `web/eslint.config.mjs`).
- **Unit tests**: `cd web && npm run test` (Vitest). There are pre-existing test failures in `tier.test.ts`, `credits-logic.test.ts`, and `add-host-button.test.tsx` where tests expect values that differ from the current implementation.
- **Environment**: Requires `web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Without a real Supabase instance, the app starts but auth/data features will not work. Placeholder values are sufficient for the dev server to compile and serve pages.
- **Prebuild scripts** (`npm run prebuild`): Generates `cli-reference.json` and `cve-feed.json`. These run automatically before `npm run build` but not before `npm run dev`.

### CLI scanner

- **Bundle**: `bash scripts/bundle.sh` produces `dist/clawkeeper.sh` from `lib/` + `checks/`.
- **Verify parity**: `bash scripts/verify-parity.sh` checks that all 44 checks are in the bundle.
- **E2E tests**: `bash scripts/e2e-cli-test.sh`. Note: Test 4 (agent config permissions) may report a false failure in Docker/overlayfs environments due to `stat` output format differences. This is cosmetic.
- **Run scanner**: `bash clawkeeper.sh scan --non-interactive` for CI-safe execution.

### Runtime Shield

- Missing `@types/node` in `devDependencies` (pre-existing). TypeScript compilation (`npx tsc`) will fail without it. The build script in `package.json` is just `tsc`.

### Desktop App

- Frontend dependencies install fine with `npm install`.
- Full Tauri build requires Rust toolchain (`rustup`) which is not installed in the cloud VM. Frontend-only dev (`npm run dev` in `desktop/`) works for UI iteration.

### Gotchas

- No root-level `package.json` — each subproject manages its own dependencies independently.
- No `.env.example` files — see the env vars listed above for `web/`.
- The `clawkeeper.sh` in the repo root is the pre-built bundle. Source of truth is in `lib/` and `checks/`. After editing source, re-run `bash scripts/bundle.sh`.
