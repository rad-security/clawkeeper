# Clawkeeper Full Test Plan

**Date:** 2026-02-21
**Devices:** MacBook Pro #1, MacBook Pro #2, DigitalOcean VPS (Linux)
**URL:** https://clawkeeper.dev

---

## How to Use This Document

Work through each section in order. Each test has a checkbox, expected result, and space for notes. Mark bugs inline with `[BUG]` and usability issues with `[UX]`. Focus on: does this feel like it provides value? Would you pay for it?

---

## PART 1 — WEBSITE & PUBLIC PAGES (Any Browser)

### 1.1 Landing Page (`/`)

- [ ] Page loads without errors, no layout shifts
- [ ] Logo renders (shield icon + "Claw" white / "keeper" cyan)
- [ ] Nav links work: Why, Features, Deploy, Pricing, Docs, Security Feed, Tutorials
- [ ] "Sign in" goes to `/login`, "Get started" goes to `/signup`
- [ ] `curl` install command — click to copy works, clipboard has correct command
- [ ] macOS app download link — where does it go? (Known: GitHub link may 404)
- [ ] Kubernetes/Helm link — where does it go? (Known: charts.clawkeeper.dev may not resolve)
- [ ] Terminal mockup scan output — does it look real and compelling?
- [ ] Stats bar: "44 security checks" — is this still accurate? (actual count is 39+)
- [ ] Pricing section: Free / Pro / Enterprise cards render, prices correct
- [ ] "Schedule a demo" link goes to `/demo`
- [ ] Footer links all work (Docs, Tutorials, GitHub, etc.)
- [ ] Mobile responsive: resize to phone width — does layout collapse cleanly?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 1.2 Docs (`/docs`, `/docs/cli`, `/docs/checks`, etc.)

- [ ] Docs sidebar renders, all links navigate correctly
- [ ] `/docs/checks` — phase pages load (host_hardening, network, prerequisites, security_audit)
- [ ] Check descriptions match actual CLI behavior
- [ ] Code blocks are copy-able
- [ ] Mobile: docs sidebar collapses or scrolls properly

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 1.3 Tutorials (`/tutorials`)

- [ ] Tutorial index page loads, all 7 tutorials listed
- [ ] Click into each — content renders, no broken images or links
- [ ] Do the tutorials feel helpful? Would a new user follow them?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 1.4 Security Feed (`/security-feed`)

- [ ] Page loads with CVE/security news
- [ ] Is the content fresh or stale?

**Notes:**
```
_____________________________________________________________
```

### 1.5 Demo Page (`/demo`)

- [ ] Form renders: name, email, company, K8s clusters
- [ ] Submit with valid data — shows success confirmation
- [ ] Submit with missing required fields — shows validation errors
- [ ] Does the enterprise value prop on the left panel feel compelling?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

---

## PART 2 — AUTHENTICATION

### 2.1 Email Signup (MacBook #1 — fresh account)

- [ ] Go to `/signup`
- [ ] Social buttons visible: "Continue with GitHub" + "Continue with Google"
- [ ] "or continue with email" divider renders between buttons and form
- [ ] Left panel value prop visible on desktop
- [ ] Enter name, email, password (min 6 chars) — click "Create free account"
- [ ] Success: "Check your email" card appears
- [ ] Confirmation email arrives (check spam)
- [ ] Click confirmation link → lands on `/dashboard`
- [ ] Org auto-created (no errors)

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 2.2 GitHub OAuth Signup (MacBook #2 — fresh account)

- [ ] Go to `/signup`
- [ ] Enter a referral code in the invite code field (use your code from MacBook #1 account)
- [ ] Referral validation shows green "Valid!" message
- [ ] Click "Continue with GitHub"
- [ ] Redirects to GitHub authorization page
- [ ] Authorize → redirects back to `/auth/callback` → lands on `/dashboard`
- [ ] Org auto-created, dashboard loads without errors
- [ ] Check: did the referral code get applied? (Check credits on both accounts)
  - Open browser DevTools → Application → Local Storage → look for `pending_referral` (should be cleared)
  - On MacBook #1 account: check Settings → Referral section for +5 credits

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 2.3 Google OAuth Signup (DigitalOcean VPS or incognito)

- [ ] Go to `/signup` in a browser
- [ ] Click "Continue with Google"
- [ ] Redirects to Google account chooser
- [ ] Select account → redirects back → lands on `/dashboard`
- [ ] Org auto-created

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 2.4 Login Flows

- [ ] `/login` — social buttons + divider + email form all render
- [ ] Email/password login works (use MacBook #1 account)
- [ ] Wrong password → shows error message
- [ ] Magic link: enter email, click "Send magic link" → toast "Check your email"
- [ ] Magic link email arrives, clicking it logs you in
- [ ] GitHub OAuth login: click "Continue with GitHub" → if already authorized, goes straight to dashboard
- [ ] Google OAuth login: same test
- [ ] Sign out (sidebar → "Sign out") → returns to `/login`

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 2.5 Edge Cases

- [ ] Visit `/dashboard` while logged out → redirects to `/login`
- [ ] Visit `/login` while logged in → what happens? (should it redirect to dashboard?)
- [ ] Sign up with an email that already exists → error message is clear
- [ ] OAuth with an email that matches an existing email/password account → does Supabase link them?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

---

## PART 3 — CLI INSTALLATION & SCANNING

### 3.1 Install via curl | bash (MacBook #1)

- [ ] Run: `curl -fsSL https://clawkeeper.dev/install.sh | bash`
- [ ] Script downloads `clawkeeper.sh` to `~/.local/bin/`
- [ ] `chmod +x` applied
- [ ] PATH updated in `~/.zshrc`
- [ ] Interactive menu appears (Scan / Deploy / Uninstall)
- [ ] Can you exit cleanly with Ctrl+C?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 3.2 Install via curl | bash (MacBook #2)

- [ ] Same install flow on fresh machine
- [ ] Any differences from MacBook #1?

**Notes:**
```
_____________________________________________________________
```

### 3.3 Install via curl | bash (DigitalOcean VPS — Linux)

- [ ] SSH into VPS
- [ ] Run: `curl -fsSL https://clawkeeper.dev/install.sh | bash`
- [ ] Installs correctly on Linux
- [ ] Interactive menu works (note: `gum` probably not installed — falls back to numbered menu)
- [ ] `/dev/tty` redirect works over SSH

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 3.4 CLI Scan — macOS (MacBook #1)

Run: `clawkeeper.sh scan`

**Phase 1 — Host Hardening (11 checks):**
- [ ] Siri check — PASS/FAIL matches actual Siri status
- [ ] Location Services — accurate
- [ ] Bluetooth — accurate (turn it on/off and rescan to verify)
- [ ] AirDrop & Handoff — accurate
- [ ] Analytics & Telemetry — accurate
- [ ] Spotlight Indexing — accurate
- [ ] macOS Firewall — accurate, reports block-all status
- [ ] FileVault — accurate (System Settings → Privacy & Security → FileVault)
- [ ] User Account — correctly identifies admin vs non-admin
- [ ] iCloud — detects signed-in iCloud account
- [ ] Automatic Login — accurate

**Phase 2 — Network (4 checks):**
- [ ] Network Isolation — shows correct SSID, gateway, local IP
- [ ] Screen Sharing — accurate
- [ ] Remote Login (SSH) — accurate
- [ ] mDNS/Bonjour — runs 5-second probe, reports result

**Phase 3 — Prerequisites:**
- [ ] Homebrew detected (or offered for install)
- [ ] Node.js detected (or offered for install)
- [ ] Docker detected (if installed)

**Phase 5 — Security Audit:**
- [ ] OpenClaw Instance Detection — finds running instance or reports not found
- [ ] CVE Audit — fetches live CVE feed, checks version
- [ ] Container Security (if Docker mode) — 11 sub-checks
- [ ] OpenClaw Config Audit — checks directory/file perms, gateway settings
- [ ] Hardening Audit — sandbox, exec, DM settings
- [ ] .env File Security — permission check
- [ ] Credential Exposure Scan — scans config, history, logs (never echoes keys)
- [ ] Session Rogue Commands — scans JSONL session files
- [ ] Skills Security — checks skills directory
- [ ] SOUL.md Security — file perms, prompt injection detection

**Overall:**
- [ ] Score calculated correctly: (PASS + FIXED) / (PASS + FAIL + FIXED) * 100
- [ ] Grade assigned correctly (A=95+, B=85-94, C=70-84, D=50-69, F=<50)
- [ ] Report output is readable and makes sense
- [ ] `--report /tmp/test-report.txt` flag works — file saved with correct content

**Usability:**
- [ ] Is the output easy to read? Colors, formatting, spacing?
- [ ] Does it feel fast enough? Any checks that hang too long?
- [ ] Are the check names and details clear to someone who isn't a security expert?
- [ ] Does the grade feel fair? Would you trust it?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 3.5 CLI Scan — macOS (MacBook #2)

- [ ] Run `clawkeeper.sh scan` on the second MacBook
- [ ] Compare results — are differences explained by actual config differences?
- [ ] Any checks that give inconsistent/wrong results?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 3.6 CLI Scan — Linux (DigitalOcean VPS)

Run: `clawkeeper.sh scan`

**Phase 1 — Host Hardening (7 Linux checks):**
- [ ] User Account — correctly detects root vs non-root, docker group
- [ ] SSH Hardening — checks PermitRootLogin, PasswordAuthentication, X11Forwarding, MaxAuthTries
- [ ] Firewall (UFW) — detects status correctly
- [ ] Automatic Security Updates — detects unattended-upgrades or dnf-automatic
- [ ] Fail2ban — detects installed/running status
- [ ] Unnecessary Services — checks cups, avahi, bluetooth, ModemManager, etc.
- [ ] Disk Encryption — checks for LUKS/dm-crypt

**Phase 2 — Network (2 Linux checks):**
- [ ] Network Configuration — shows public IP, local IP, virtualization type
- [ ] Open Ports Audit — lists listeners, flags 0.0.0.0:18789 as critical

**Phase 3 — Prerequisites:**
- [ ] Essential Packages (git, curl, openssl, ca-certificates)
- [ ] Node.js or Docker (depending on mode)

**Phase 5 — Security Audit:**
- [ ] Same audit checks as macOS — do they work on Linux?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 3.7 CLI Interactive Setup (MacBook #1)

Run: `clawkeeper.sh setup`

- [ ] Banner + expectations text displayed
- [ ] Prompted for deployment mode (Docker vs Native)
- [ ] Each failing check offers remediation prompt (Y/n)
- [ ] Remediation actually works (test at least 2-3):
  - [ ] Disable Siri
  - [ ] Enable Firewall
  - [ ] Enable FileVault (info-only, no auto-fix expected)
- [ ] After remediation, re-scan shows the fix applied

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 3.8 CLI Help & Edge Cases

- [ ] `clawkeeper.sh help` — readable output
- [ ] `clawkeeper.sh --help` — same
- [ ] `clawkeeper.sh scan --non-interactive` — no prompts, clean exit
- [ ] `clawkeeper.sh` (no args) — interactive menu
- [ ] Run as root on Linux — any different behavior?
- [ ] Ctrl+C during a scan — exits cleanly, no zombie processes

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

---

## PART 4 — AGENT & API UPLOAD

### 4.1 API Key Creation

- [ ] Log into dashboard → Settings
- [ ] Create a new API key — name it "MacBook-1-test"
- [ ] Key displayed once (starts with `ck_live_`) — copy it
- [ ] Key appears in the table with name, prefix, created date
- [ ] Create a second key for Linux VPS

**Notes:**
```
_____________________________________________________________
```

### 4.2 Agent Install — macOS (MacBook #1)

Run: `clawkeeper.sh agent install`

- [ ] Prompted for API key — paste the key
- [ ] Config saved to `~/.clawkeeper/config`
- [ ] LaunchAgent installed (`~/Library/LaunchAgents/com.clawkeeper.agent.plist`)
- [ ] `clawkeeper.sh agent status` — shows config + scheduler status

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 4.3 Agent Run — macOS (MacBook #1)

Run: `clawkeeper.sh agent run`

- [ ] Scan executes
- [ ] Results uploaded to API — HTTP 200 response
- [ ] Dashboard shows the host appear under Hosts
- [ ] Scan data visible on the host detail page
- [ ] Credits deducted (check sidebar credit meter or Settings)
- [ ] Check response: `credits_remaining` and `credits_monthly_cap` values

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 4.4 Agent Install + Run — Linux (DigitalOcean VPS)

- [ ] `clawkeeper.sh agent install` — prompted for API key
- [ ] Config saved to `~/.clawkeeper/config`
- [ ] systemd timer installed (`clawkeeper-agent.timer`)
- [ ] `clawkeeper.sh agent status` — shows status
- [ ] `clawkeeper.sh agent run` — scan + upload succeeds
- [ ] Host appears in dashboard with Linux platform
- [ ] Scan results match what CLI showed locally

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 4.5 Agent on MacBook #2

- [ ] Install agent with the second account's API key
- [ ] Run agent — upload succeeds
- [ ] Host visible in second account's dashboard (not the first account's)

**Notes:**
```
_____________________________________________________________
```

### 4.6 Multiple Scans

- [ ] Run `clawkeeper.sh agent run` 3-4 times on MacBook #1
- [ ] Dashboard host detail → Scan History shows all scans
- [ ] Scores/grades update correctly
- [ ] "Recent Scans" on dashboard overview shows latest

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 4.7 Agent Uninstall

- [ ] `clawkeeper.sh agent uninstall` — removes config, scheduler, plist/timer
- [ ] `clawkeeper.sh agent status` — shows not configured
- [ ] Verify plist/timer actually removed from disk

**Notes:**
```
_____________________________________________________________
```

---

## PART 5 — DASHBOARD DEEP DIVE

### 5.1 First-Time Experience (Fresh Account)

- [ ] Log in with a brand new account (no scans yet)
- [ ] Dashboard shows onboarding wizard — is it helpful?
- [ ] Hosts page shows empty state with install instructions
- [ ] Does the empty state make it obvious what to do next?
- [ ] **[UX] How many clicks from signup to first scan result in dashboard?**

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 5.2 Dashboard Overview (Account with Scans)

- [ ] Stats cards: Total Instances, Average Score, Failing Hosts, Active Insights
- [ ] Grade distribution cards (A through F) — counts correct
- [ ] Recent Scans list — shows last 5, timestamps make sense
- [ ] Active Insights shows "Pro feature" lock for free users
- [ ] Upgrade banner visible for free users

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 5.3 Hosts Page

- [ ] All hosts listed with correct data
- [ ] Host count vs plan limit shown (e.g., "1/2 hosts")
- [ ] Click hostname → navigates to host detail
- [ ] "Add Host" button works — shows guided flow
- [ ] At host limit: upgrade banner appears

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 5.4 Host Detail Page

- [ ] Header: hostname, platform, grade badge
- [ ] Stats: score, scan count, agent version, last scan
- [ ] Security Zones grid — do the zone names make sense?
- [ ] Checks tabs — organized by phase, all checks listed with status
- [ ] Scan History table — shows all scans with correct data
- [ ] Free plan: 7-day retention message shown, upgrade prompt
- [ ] Score History chart: locked for free, shows for pro
- [ ] Share scan button works (test in next section)

**Usability:**
- [ ] Is this page overwhelming or clear?
- [ ] Can you quickly identify what needs fixing?
- [ ] Does the grade feel actionable?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 5.5 Scan Sharing

- [ ] On host detail, click "Share scan"
- [ ] Share link generated and copied
- [ ] Open share link in incognito — public page loads
- [ ] Grade, score, stats, failed checks all visible
- [ ] "Scan yours free" CTA links to signup (with referral code if available)
- [ ] OG image renders (paste link into Slack/Twitter preview)

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 5.6 Activity Page

- [ ] Free user: blurred mock preview shown with upgrade CTA
- [ ] Is the blurred preview compelling enough to upgrade?
- [ ] (If Pro account available) Filters work: by host, by category
- [ ] Events load and display correctly

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 5.7 Insights Page

- [ ] Free user: blurred mock preview with 3 example insights
- [ ] Upgrade CTA links to `/upgrade?reason=insights`
- [ ] Are the mock insights compelling? Do they make you want Pro?
- [ ] (If Pro) Stats row, filters, insight cards render

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 5.8 Settings Page

- [ ] Plan card shows correct plan (Free/Pro)
- [ ] Usage meters: hosts x/limit, API keys x/limit, retention days
- [ ] Install command copy works
- [ ] API Key Manager: create, view, delete keys
  - [ ] Delete a key — confirmation prompt? Key removed from table?
  - [ ] `last_used_at` updates after an agent run?
- [ ] Referral section: code displayed, copy works, share link works
- [ ] Notification settings: locked for free, shows upgrade CTA

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

### 5.9 Upgrade Page

- [ ] Renders pricing cards for all tiers
- [ ] Free tier features listed accurately
- [ ] Pro tier: price correct ($16/mo?), feature list accurate
- [ ] Enterprise: "Contact sales" / demo CTA
- [ ] Click upgrade → Stripe checkout loads (don't complete unless you want to test billing)
- [ ] `?reason=host_limit` param: does it show contextual messaging?
- [ ] `?reason=insights` param: same test

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

### 5.10 Sidebar & Navigation

- [ ] All nav links work and highlight active page
- [ ] Pro badges on Insights and Activity for free users
- [ ] Scan credits meter: shows correct remaining/total
- [ ] Credits change after an agent run
- [ ] Upgrade CTA at bottom for free users
- [ ] Sign out works from sidebar
- [ ] Mobile: hamburger menu works, all nav items accessible

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

---

## PART 6 — REFERRAL SYSTEM

### 6.1 Referral Code Generation

- [ ] Settings page → Referral section shows your code (CK________)
- [ ] Copy code button works
- [ ] Share link format: `clawkeeper.dev/r/CKXXXXXX`

### 6.2 Referral via Email Signup

- [ ] Open `/signup?ref=CKXXXXXX` (use MacBook #1's code)
- [ ] Referral code pre-filled in the invite code field
- [ ] Green "Valid!" validation message appears
- [ ] Complete signup → referral applied
- [ ] Referrer gets +5 credits, referee gets +5 credits

### 6.3 Referral via OAuth Signup

- [ ] Open `/signup`, enter referral code manually
- [ ] Click "Continue with GitHub" or "Continue with Google"
- [ ] Complete OAuth flow → dashboard loads
- [ ] Check: referral code applied (credits on both accounts)

### 6.4 Referral Link Redirect

- [ ] Visit `clawkeeper.dev/r/CKXXXXXX` → redirects to `/signup?ref=CKXXXXXX`

### 6.5 Referral Edge Cases

- [ ] Invalid code (e.g., `CKZZZZZZ`) → "Invalid or expired code" message
- [ ] Own code → should be rejected (self-referral prevention)
- [ ] Already-referred account → applying code again should fail

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

## PART 7 — PLAN LIMITS & PAYWALLS

### 7.1 Free Plan Limits

- [ ] Host limit: can you add more hosts than allowed? Error message clear?
- [ ] Scan credits: run scans until credits depleted — error from API? Dashboard message?
- [ ] 7-day scan retention: old scans hidden after 7 days?
- [ ] Insights locked, Activity locked, Notifications locked
- [ ] Score History chart locked on host detail

### 7.2 Upgrade Prompts

- [ ] Every paywall has a working link to `/upgrade`
- [ ] Upgrade reasons passed correctly (`?reason=host_limit`, `?reason=insights`, etc.)
- [ ] Do the paywalls feel fair or frustrating?
- [ ] Is there enough free value to hook someone before asking them to pay?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

## PART 8 — CROSS-DEVICE & RESPONSIVE

### 8.1 Mobile Browser (Phone)

- [ ] Landing page: readable, CTAs accessible, no horizontal scroll
- [ ] Login/Signup: social buttons + form usable on small screen
- [ ] Dashboard: mobile nav works, pages readable
- [ ] Host detail: tables scroll horizontally or stack

### 8.2 Tablet

- [ ] Layout adapts between mobile and desktop breakpoints

### 8.3 Multiple Browsers

- [ ] Test in Safari, Chrome, Firefox — any rendering differences?

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

---

## PART 9 — ERROR HANDLING & EDGE CASES

- [ ] API upload with invalid API key → clear error (401)
- [ ] API upload with expired/deleted key → clear error
- [ ] API upload with no credits → 402 response, clear message
- [ ] API upload exceeding host limit → 403 response, clear message
- [ ] Visit `/hosts/nonexistent-uuid` → 404 page
- [ ] Visit `/s/invalidcode` → 404 page
- [ ] Double-click submit buttons — no duplicate submissions
- [ ] Slow network: do loading states appear? Spinners?
- [ ] Browser back button behavior from dashboard pages

**Notes:**
```
_____________________________________________________________
_____________________________________________________________
```

---

## PART 10 — OVERALL USABILITY & VALUE ASSESSMENT

Rate each 1-5 (1=poor, 5=excellent):

```
Landing page clarity:        [ ] / 5  —  Do I understand what this product does in 5 seconds?
Time to first value:         [ ] / 5  —  How fast do I go from signup to seeing my security grade?
CLI scan experience:         [ ] / 5  —  Is the scan output clear, fast, and trustworthy?
Dashboard value:             [ ] / 5  —  Does the dashboard tell me something the CLI didn't?
Upgrade motivation:          [ ] / 5  —  Do the Pro teasers make me want to pay?
Trust & credibility:         [ ] / 5  —  Does this feel like a real, professional product?
Documentation quality:       [ ] / 5  —  Could someone self-serve without help?
Mobile experience:           [ ] / 5  —  Usable on phone?
Error handling:              [ ] / 5  —  When things go wrong, do I understand why?
Would I recommend this:      [ ] / 5  —  Would I share this with a colleague?
```

**Top 3 things that feel great:**
```
1. ___________________________________________________________
2. ___________________________________________________________
3. ___________________________________________________________
```

**Top 3 things that need work:**
```
1. ___________________________________________________________
2. ___________________________________________________________
3. ___________________________________________________________
```

**Features that feel missing:**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

**Bugs found (summary):**
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```
