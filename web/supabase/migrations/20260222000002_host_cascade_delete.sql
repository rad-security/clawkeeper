-- ============================================================================
-- Host Cascade Delete Migration
-- Fixes foreign key constraints so that deleting a host cleanly removes
-- or nullifies all related records.
--
-- Cascade chain:
--   DELETE host
--     → scans CASCADE deleted
--       → scan_checks CASCADE deleted (already configured)
--       → alert_events.scan_id SET NULL
--       → insights.scan_id SET NULL
--     → events.host_id SET NULL
--     → alert_events.host_id SET NULL
--     → shield_events.host_id SET NULL (already configured)
-- ============================================================================

-- scans.host_id → hosts(id) ON DELETE CASCADE
alter table scans
  drop constraint scans_host_id_fkey,
  add constraint scans_host_id_fkey
    foreign key (host_id) references hosts(id) on delete cascade;

-- events.host_id → hosts(id) ON DELETE SET NULL
alter table events
  drop constraint events_host_id_fkey,
  add constraint events_host_id_fkey
    foreign key (host_id) references hosts(id) on delete set null;

-- alert_events.host_id → hosts(id) ON DELETE SET NULL
alter table alert_events
  drop constraint alert_events_host_id_fkey,
  add constraint alert_events_host_id_fkey
    foreign key (host_id) references hosts(id) on delete set null;

-- alert_events.scan_id → scans(id) ON DELETE SET NULL
alter table alert_events
  drop constraint alert_events_scan_id_fkey,
  add constraint alert_events_scan_id_fkey
    foreign key (scan_id) references scans(id) on delete set null;

-- insights.scan_id → scans(id) ON DELETE SET NULL
alter table insights
  drop constraint insights_scan_id_fkey,
  add constraint insights_scan_id_fkey
    foreign key (scan_id) references scans(id) on delete set null;
