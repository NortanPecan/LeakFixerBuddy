-- BuddyChallenge: two users competing on the same challenge goal
CREATE TABLE IF NOT EXISTS buddy_challenges (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id         UUID REFERENCES challenges(id) ON DELETE CASCADE,
  initiator_id         UUID REFERENCES app_users(id),
  partner_id           UUID REFERENCES app_users(id),
  initiator_progress   INT DEFAULT 0,
  partner_progress     INT DEFAULT 0,
  status               TEXT DEFAULT 'pending',  -- pending, accepted, declined
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buddy_challenges_initiator ON buddy_challenges(initiator_id);
CREATE INDEX IF NOT EXISTS idx_buddy_challenges_partner   ON buddy_challenges(partner_id);
CREATE INDEX IF NOT EXISTS idx_buddy_challenges_challenge ON buddy_challenges(challenge_id);
