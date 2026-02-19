-- Insights table: AI-powered security findings generated at scan time
create table insights (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id),
  insight_type    text not null,
  severity        text not null,
  category        text not null,
  title           text not null,
  description     text not null,
  remediation     text not null,
  affected_hosts  jsonb not null default '[]',
  metadata        jsonb not null default '{}',
  is_resolved     boolean not null default false,
  resolved_at     timestamptz,
  scan_id         uuid references scans (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_insights_org_created on insights (org_id, created_at desc);
create index idx_insights_org_resolved on insights (org_id, is_resolved);
