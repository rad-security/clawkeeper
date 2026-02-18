-- ============================================================================
-- Prevent duplicate org creation per user.
--
-- The ensureOrganization() app function creates an org + owner membership
-- on first login. Without a DB-level guard, concurrent requests can race
-- and create multiple orgs for the same user.
--
-- This unique index ensures each user can only be an owner of one org.
-- (A user could still be a member/admin of multiple orgs in the future.)
-- ============================================================================

create unique index if not exists org_members_one_owner_per_user
  on org_members (user_id)
  where (role = 'owner');
