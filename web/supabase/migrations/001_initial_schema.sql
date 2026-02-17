-- ============================================================================
-- ClawKeeper Initial Schema Migration
-- 001_initial_schema.sql
--
-- Creates all core tables, indexes, RLS policies, and trigger functions.
-- ============================================================================

-- ============================================================================
-- 1. UTILITY FUNCTIONS (table-independent)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at trigger function
-- Automatically sets updated_at = now() on any UPDATE.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- organizations
-- Top-level tenant. Every resource belongs to an organization.
-- ---------------------------------------------------------------------------
create table organizations (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  plan            text        not null default 'free'
                              check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- org_members
-- Junction table linking auth.users to organizations with a role.
-- ---------------------------------------------------------------------------
create table org_members (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references organizations (id),
  user_id         uuid        not null references auth.users (id),
  role            text        not null default 'owner'
                              check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),

  unique (org_id, user_id)
);

-- ---------------------------------------------------------------------------
-- api_keys
-- Organisation-scoped API keys. The raw key is never stored; only a SHA-256
-- hash and the first 8 characters (key_prefix) for identification.
-- ---------------------------------------------------------------------------
create table api_keys (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references organizations (id),
  name            text        not null,
  key_prefix      text        not null,   -- first 8 chars of the key (display)
  key_hash        text        not null,   -- sha256 hash of the full key
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- hosts
-- A machine / endpoint registered within an organization.
-- ---------------------------------------------------------------------------
create table hosts (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references organizations (id),
  hostname        text        not null,
  platform        text,
  os_version      text,
  last_grade      text,
  last_score      int,
  last_scan_at    timestamptz,
  agent_version   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (org_id, hostname)
);

-- ---------------------------------------------------------------------------
-- scans
-- A single scan result for a host. Contains aggregate counts and the raw
-- report payload.
-- ---------------------------------------------------------------------------
create table scans (
  id              uuid        primary key default gen_random_uuid(),
  host_id         uuid        not null references hosts (id),
  org_id          uuid        not null references organizations (id),
  score           int         not null,
  grade           text        not null,
  passed          int         not null default 0,
  failed          int         not null default 0,
  fixed           int         not null default 0,
  skipped         int         not null default 0,
  raw_report      text,
  scanned_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- scan_checks
-- Individual check results within a scan. Cascade-deleted when the parent
-- scan is removed.
-- ---------------------------------------------------------------------------
create table scan_checks (
  id              uuid        primary key default gen_random_uuid(),
  scan_id         uuid        not null references scans (id) on delete cascade,
  status          text        not null
                              check (status in ('PASS', 'FAIL', 'FIXED', 'SKIPPED')),
  check_name      text        not null,
  detail          text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- alert_rules
-- User-defined alerting rules scoped to an organization.
-- ---------------------------------------------------------------------------
create table alert_rules (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references organizations (id),
  name            text        not null,
  rule_type       text        not null
                              check (rule_type in ('grade_drop', 'check_fail', 'score_below')),
  config          jsonb       not null default '{}',
  enabled         boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- alert_events
-- Materialised alert occurrences. References are nullable so that historical
-- events survive if the rule, host, or scan is later deleted.
-- ---------------------------------------------------------------------------
create table alert_events (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references organizations (id),
  alert_rule_id   uuid        references alert_rules (id),
  host_id         uuid        references hosts (id),
  scan_id         uuid        references scans (id),
  message         text        not null,
  notified_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 3. HELPER FUNCTIONS (depend on tables above)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: user_org_ids()
-- Returns the set of org_ids the currently authenticated user belongs to.
-- Used throughout RLS policies. Must be defined after org_members exists.
-- ---------------------------------------------------------------------------
create or replace function user_org_ids()
returns setof uuid as $$
  select org_id from org_members where user_id = auth.uid();
$$ language sql security definer stable;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

create index idx_scans_host_scanned     on scans (host_id, scanned_at desc);
create index idx_scan_checks_scan       on scan_checks (scan_id);
create index idx_hosts_org              on hosts (org_id);
create index idx_alert_rules_org        on alert_rules (org_id);
create index idx_api_keys_key_hash      on api_keys (key_hash);
create index idx_api_keys_org           on api_keys (org_id);

-- ============================================================================
-- 5. updated_at TRIGGERS
-- ============================================================================

create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create trigger trg_hosts_updated_at
  before update on hosts
  for each row execute function set_updated_at();

create trigger trg_alert_rules_updated_at
  before update on alert_rules
  for each row execute function set_updated_at();

-- ============================================================================
-- 6. AUTO-CREATE ORGANIZATION ON USER SIGNUP
-- ============================================================================

-- When a new user signs up via Supabase Auth, automatically create a personal
-- organization and add the user as its owner.
create or replace function handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name)
    values (coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
    returning id into new_org_id;

  insert into org_members (org_id, user_id, role)
    values (new_org_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on every table.
alter table organizations  enable row level security;
alter table org_members     enable row level security;
alter table api_keys        enable row level security;
alter table hosts           enable row level security;
alter table scans           enable row level security;
alter table scan_checks     enable row level security;
alter table alert_rules     enable row level security;
alter table alert_events    enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy "org_select" on organizations
  for select to authenticated
  using (id in (select user_org_ids()));

create policy "org_insert" on organizations
  for insert to authenticated
  with check (id in (select user_org_ids()));

create policy "org_update" on organizations
  for update to authenticated
  using (id in (select user_org_ids()));

create policy "org_delete" on organizations
  for delete to authenticated
  using (id in (select user_org_ids()));

-- ---------------------------------------------------------------------------
-- org_members
-- ---------------------------------------------------------------------------
create policy "org_members_select" on org_members
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "org_members_insert" on org_members
  for insert to authenticated
  with check (org_id in (select user_org_ids()));

create policy "org_members_update" on org_members
  for update to authenticated
  using (org_id in (select user_org_ids()));

create policy "org_members_delete" on org_members
  for delete to authenticated
  using (org_id in (select user_org_ids()));

-- ---------------------------------------------------------------------------
-- api_keys
-- ---------------------------------------------------------------------------
create policy "api_keys_select" on api_keys
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "api_keys_insert" on api_keys
  for insert to authenticated
  with check (org_id in (select user_org_ids()));

create policy "api_keys_update" on api_keys
  for update to authenticated
  using (org_id in (select user_org_ids()));

create policy "api_keys_delete" on api_keys
  for delete to authenticated
  using (org_id in (select user_org_ids()));

-- ---------------------------------------------------------------------------
-- hosts
-- ---------------------------------------------------------------------------
create policy "hosts_select" on hosts
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "hosts_insert" on hosts
  for insert to authenticated
  with check (org_id in (select user_org_ids()));

create policy "hosts_update" on hosts
  for update to authenticated
  using (org_id in (select user_org_ids()));

create policy "hosts_delete" on hosts
  for delete to authenticated
  using (org_id in (select user_org_ids()));

-- ---------------------------------------------------------------------------
-- scans
-- ---------------------------------------------------------------------------
create policy "scans_select" on scans
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "scans_insert" on scans
  for insert to authenticated
  with check (org_id in (select user_org_ids()));

create policy "scans_update" on scans
  for update to authenticated
  using (org_id in (select user_org_ids()));

create policy "scans_delete" on scans
  for delete to authenticated
  using (org_id in (select user_org_ids()));

-- ---------------------------------------------------------------------------
-- scan_checks  (joins through scans to resolve org_id)
-- ---------------------------------------------------------------------------
create policy "scan_checks_select" on scan_checks
  for select to authenticated
  using (
    exists (
      select 1 from scans
      where scans.id = scan_checks.scan_id
        and scans.org_id in (select user_org_ids())
    )
  );

create policy "scan_checks_insert" on scan_checks
  for insert to authenticated
  with check (
    exists (
      select 1 from scans
      where scans.id = scan_checks.scan_id
        and scans.org_id in (select user_org_ids())
    )
  );

create policy "scan_checks_update" on scan_checks
  for update to authenticated
  using (
    exists (
      select 1 from scans
      where scans.id = scan_checks.scan_id
        and scans.org_id in (select user_org_ids())
    )
  );

create policy "scan_checks_delete" on scan_checks
  for delete to authenticated
  using (
    exists (
      select 1 from scans
      where scans.id = scan_checks.scan_id
        and scans.org_id in (select user_org_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- alert_rules
-- ---------------------------------------------------------------------------
create policy "alert_rules_select" on alert_rules
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "alert_rules_insert" on alert_rules
  for insert to authenticated
  with check (org_id in (select user_org_ids()));

create policy "alert_rules_update" on alert_rules
  for update to authenticated
  using (org_id in (select user_org_ids()));

create policy "alert_rules_delete" on alert_rules
  for delete to authenticated
  using (org_id in (select user_org_ids()));

-- ---------------------------------------------------------------------------
-- alert_events
-- ---------------------------------------------------------------------------
create policy "alert_events_select" on alert_events
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "alert_events_insert" on alert_events
  for insert to authenticated
  with check (org_id in (select user_org_ids()));

create policy "alert_events_update" on alert_events
  for update to authenticated
  using (org_id in (select user_org_ids()));

create policy "alert_events_delete" on alert_events
  for delete to authenticated
  using (org_id in (select user_org_ids()));
