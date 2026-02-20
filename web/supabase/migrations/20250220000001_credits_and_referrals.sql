-- ============================================================================
-- Credits & Referral System Migration
-- Adds credit tracking to organizations, referral codes, referral events,
-- and shared scans for the viral growth loop.
-- ============================================================================

-- ============================================================================
-- 1. ADD CREDIT COLUMNS TO ORGANIZATIONS
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN credits_balance        integer     NOT NULL DEFAULT 5,
  ADD COLUMN credits_monthly_cap    integer     NOT NULL DEFAULT 5,
  ADD COLUMN credits_last_refill_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN referred_by_code       text;

-- ============================================================================
-- 2. REFERRAL CODES
-- ============================================================================

CREATE TABLE referral_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text        NOT NULL UNIQUE,
  org_id     uuid        NOT NULL REFERENCES organizations (id),
  user_id    uuid        NOT NULL REFERENCES auth.users (id),
  max_uses   integer     NOT NULL DEFAULT 50,
  use_count  integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_org ON referral_codes (org_id);
CREATE INDEX idx_referral_codes_code ON referral_codes (code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes_select" ON referral_codes
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "referral_codes_insert" ON referral_codes
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "referral_codes_update" ON referral_codes
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

-- ============================================================================
-- 3. REFERRAL EVENTS
-- ============================================================================

CREATE TABLE referral_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code    text        NOT NULL,
  referrer_org_id  uuid        NOT NULL REFERENCES organizations (id),
  referee_org_id   uuid        NOT NULL REFERENCES organizations (id),
  referrer_credits integer     NOT NULL DEFAULT 5,
  referee_credits  integer     NOT NULL DEFAULT 3,
  created_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (referee_org_id)
);

CREATE INDEX idx_referral_events_referrer ON referral_events (referrer_org_id);

ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_events_select" ON referral_events
  FOR SELECT TO authenticated
  USING (
    referrer_org_id IN (SELECT user_org_ids())
    OR referee_org_id IN (SELECT user_org_ids())
  );

-- ============================================================================
-- 4. SHARED SCANS
-- ============================================================================

CREATE TABLE shared_scans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id    uuid        NOT NULL REFERENCES scans (id),
  org_id     uuid        NOT NULL REFERENCES organizations (id),
  share_code text        NOT NULL UNIQUE,
  is_public  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_scans_code ON shared_scans (share_code);
CREATE INDEX idx_shared_scans_org ON shared_scans (org_id);

ALTER TABLE shared_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_scans_select_own" ON shared_scans
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "shared_scans_insert" ON shared_scans
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()));

-- Public read access for share pages (anon role)
CREATE POLICY "shared_scans_select_public" ON shared_scans
  FOR SELECT TO anon
  USING (is_public = true);

-- ============================================================================
-- 5. CREDIT INCREMENT FUNCTION (admin only via service role)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_credits(p_org_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE organizations
  SET credits_balance = credits_balance + p_amount
  WHERE id = p_org_id;
END;
$$;
