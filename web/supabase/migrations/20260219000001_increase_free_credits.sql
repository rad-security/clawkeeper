-- Update defaults for new orgs
ALTER TABLE organizations
  ALTER COLUMN credits_balance SET DEFAULT 10,
  ALTER COLUMN credits_monthly_cap SET DEFAULT 10;

-- Bump existing free-tier orgs to 10 (idempotent)
UPDATE organizations
SET credits_monthly_cap = 10,
    credits_balance = LEAST(credits_balance + 5, 10)
WHERE plan = 'free' AND credits_monthly_cap = 5;

-- Update referral_events defaults
ALTER TABLE referral_events
  ALTER COLUMN referee_credits SET DEFAULT 5;
