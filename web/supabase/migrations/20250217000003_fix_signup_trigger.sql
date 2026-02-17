-- ============================================================================
-- 003_fix_signup_trigger.sql
--
-- Fixes "Database error saving new user" on signup by removing the
-- handle_new_user trigger. Organization creation is now handled in the
-- app layer by ensureOrganization() using the service-role client.
--
-- Also adds 'enterprise' to the plan check constraint.
-- ============================================================================

-- Drop the trigger that blocks signups when it fails
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- Update the plan constraint to include 'enterprise'
alter table organizations drop constraint if exists organizations_plan_check;
alter table organizations add constraint organizations_plan_check
  check (plan in ('free', 'pro', 'enterprise'));
