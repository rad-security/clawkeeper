-- ============================================================================
-- ClawKeeper Events Migration
-- 002_events.sql
--
-- Auditable event stream for tracking scan-derived and agent lifecycle events.
-- Append-only — no update/delete policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- events
-- Immutable audit log of all notable occurrences within an organization.
-- ---------------------------------------------------------------------------
create table events (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references organizations (id),
  host_id         uuid        references hosts (id),
  event_type      text        not null
                              check (event_type in (
                                'scan.completed',
                                'grade.changed',
                                'check.flipped',
                                'host.registered',
                                'agent.installed',
                                'agent.started',
                                'agent.stopped',
                                'agent.uninstalled'
                              )),
  title           text        not null,
  detail          jsonb       not null default '{}',
  actor           text,       -- 'agent', 'system', or user email
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_events_org_created   on events (org_id, created_at desc);
create index idx_events_host_created  on events (host_id, created_at desc);
create index idx_events_org_type      on events (org_id, event_type);

-- ============================================================================
-- ROW LEVEL SECURITY (append-only: select + insert only)
-- ============================================================================

alter table events enable row level security;

create policy "events_select" on events
  for select to authenticated
  using (org_id in (select user_org_ids()));

create policy "events_insert" on events
  for insert to authenticated
  with check (org_id in (select user_org_ids()));
