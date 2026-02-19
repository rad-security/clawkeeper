-- Notification settings for email and webhook alerts (Pro/Enterprise feature)
create table if not exists notification_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email_enabled boolean not null default false,
  email_address text,
  webhook_enabled boolean not null default false,
  webhook_url text,
  webhook_secret text,
  notify_on_cve boolean not null default true,
  notify_on_critical boolean not null default true,
  notify_on_grade_drop boolean not null default true,
  notify_on_new_host boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_settings_org_unique unique (org_id)
);

-- RLS
alter table notification_settings enable row level security;

create policy "Users can view their org notification settings"
  on notification_settings for select
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "Users can insert their org notification settings"
  on notification_settings for insert
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "Users can update their org notification settings"
  on notification_settings for update
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

-- Index
create index if not exists idx_notification_settings_org on notification_settings(org_id);
