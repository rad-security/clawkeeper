-- Runtime Shield: real-time prompt injection defense tables
-- Adds shield_policies, shield_events, and extends hosts + notification_settings

-- shield_policies: one per org, stores security config
create table shield_policies (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  security_level  text not null default 'strict'
                  check (security_level in ('paranoid','strict','moderate','minimal')),
  custom_blacklist text[] not null default '{}',
  trusted_sources text[] not null default '{}',
  entropy_threshold float not null default 4.5,
  max_input_length int not null default 10000,
  auto_block      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint shield_policies_org_unique unique (org_id)
);

-- shield_events: individual runtime detection events
create table shield_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  host_id         uuid references hosts(id) on delete set null,
  hostname        text not null,
  detection_layer text not null
                  check (detection_layer in ('regex','semantic','context_integrity','blacklist','entropy_heuristic')),
  verdict         text not null check (verdict in ('blocked','warned','passed')),
  severity        text not null check (severity in ('critical','high','medium','low')),
  security_level  text not null,
  pattern_name    text,
  input_hash      text not null,
  input_length    int,
  confidence      float,
  context         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- Extend hosts for shield status
alter table hosts
  add column if not exists shield_active boolean not null default false,
  add column if not exists shield_last_seen_at timestamptz;

-- Extend notification_settings
alter table notification_settings
  add column if not exists notify_on_shield_block boolean not null default true;

-- Indexes
create index idx_shield_events_org_created on shield_events(org_id, created_at desc);
create index idx_shield_events_org_verdict on shield_events(org_id, verdict);
create index idx_shield_events_host on shield_events(host_id, created_at desc);
create index idx_shield_events_pattern on shield_events(org_id, pattern_name);
create index idx_hosts_shield_active on hosts(org_id, shield_active);

-- RLS
alter table shield_policies enable row level security;
alter table shield_events enable row level security;

create policy "shield_policies_select" on shield_policies for select using (org_id in (select user_org_ids()));
create policy "shield_policies_insert" on shield_policies for insert with check (org_id in (select user_org_ids()));
create policy "shield_policies_update" on shield_policies for update using (org_id in (select user_org_ids()));
create policy "shield_events_select" on shield_events for select using (org_id in (select user_org_ids()));
create policy "shield_events_insert" on shield_events for insert with check (org_id in (select user_org_ids()));
