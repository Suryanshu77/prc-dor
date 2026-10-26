-- Migration 2: PRC D'or 2027 Special Awards (Kopa, Yashin, Gerd Müller,
-- Socrates). Forward-only, idempotent, purely additive.
--
-- SECURITY INTENT
--   * The existing Ballon d'or platform (voting_periods, votes, results RPCs,
--     hall_of_fame, admin_notifications) is NOT touched. All new objects are
--     additive; historical 2026 ballots are never read or modified by this
--     migration.
--   * Editions are voting_periods rows (one per year, e.g. "PRC D'or 2027").
--     Each award is its own row in special_awards with its own voting status
--     and results visibility, so an award can open/close independently.
--   * Eligibility is DATA, not code: eligibility_type ('all' | 'by_position'
--     | 'max_age') with eligibility_position / eligibility_max_age configured
--     by admins per award, enforced server-side at nomination time.
--   * Ballots: exactly 5 candidates, rank 1..5, points 5,4,3,2,1 enforced by
--     CHECK (points = 6 - rank_position). One final ballot per user per award
--     per edition via UNIQUE (voter_id, award_id, ...) constraints; ballots
--     are immutable (no UPDATE path, only admin DELETE for resets).
--   * Clients write through the SECURITY DEFINER RPCs below (nomination,
--     status/eligibility changes, submit_special_ballot). Direct INSERT on
--     special_votes is therefore NOT granted to authenticated; the RLS
--     INSERT policy exists only as a defence-in-depth guard.
--     IMPORTANT: the live Supabase instance has active default ACLs that
--     grant ALL privileges on new tables (and EXECUTE on new functions) to
--     anon/authenticated. RLS is NOT a privilege boundary (TRUNCATE is
--     privilege-gated, not RLS-gated), so this migration REVOKEs all table
--     privileges from anon/authenticated FIRST (§2) before re-granting
--     SELECT. Without the REVOKEs, an authenticated user could INSERT into
--     special_votes directly (bypassing submit_special_ballot's exactly-5 /
--     finality logic via the permissive special_votes_insert_own policy)
--     and TRUNCATE the tables. Granting is NOT enough when default ACLs
--     are active.
--   * Public results are gated exactly like get_period_results: visible only
--     when the award's results_visible = true, always for admins.
--
-- CALL-SITE MATRIX (implemented in this changeset)
--   special_awards:           SELECT (vote-special page, results, admin)
--   special_award_candidates: SELECT (vote-special page, results, admin)
--   special_votes:            SELECT own rows (already-voted check)
--   RPCs (all admin mutations SECURITY DEFINER + has_role guard):
--     admin_create_special_award_edition(int, tstz)   -> period + 4 award rows
--     admin_nominate_player(uuid, uuid)               -> validate eligibility
--     admin_remove_nominee(uuid, uuid)                -> block after votes
--     admin_set_special_award_eligibility(uuid,text,int,player_position)
--     admin_set_special_award_status(uuid, bool, bool)-> open + visibility
--     admin_reset_special_votes(uuid)
--     get_special_award_stats(uuid)                -> visibility/admin-gated stats
--     submit_special_ballot(uuid, uuid[])             -> atomic 5-row ballot
--     get_special_award_results(uuid)                 -> visibility-gated table
--     is_special_award_results_visible(uuid)
--
-- RUN VIA: Supabase SQL Editor (same out-of-band channel as Migration 1).
-- No prod data is mutated: tables start empty; the 2027 edition and its 4
-- awards are created at runtime by an admin via
-- admin_create_special_award_edition(2027).

-- ===========================================================================
-- 0. Ensure the private schema helper exists (matches 20261023120000 exactly;
--    keeps this migration standalone and re-runnable).
-- ===========================================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
REVOKE USAGE ON SCHEMA private FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- ===========================================================================
-- 1. Tables
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.special_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  award_key TEXT NOT NULL
    CHECK (award_key IN ('kopa', 'yashin', 'gerd_muller', 'socrates')),
  title TEXT NOT NULL,
  description TEXT,
  -- Configurable eligibility rule. 'all' = every profile is eligible,
  -- 'by_position' requires eligibility_position, 'max_age' requires
  -- eligibility_max_age (compared against the profile's self-reported age).
  eligibility_type TEXT NOT NULL DEFAULT 'all'
    CHECK (eligibility_type IN ('all', 'by_position', 'max_age')),
  eligibility_position public.player_position,
  -- Guard: a typed rule must carry its parameter.
  eligibility_max_age INT,
  voting_open BOOLEAN NOT NULL DEFAULT FALSE,
  results_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voting_period_id, award_key),
  -- A typed rule must carry its parameter.
  CHECK (
    (eligibility_type = 'all')
    OR (eligibility_type = 'by_position' AND eligibility_position IS NOT NULL)
    OR (eligibility_type = 'max_age' AND eligibility_max_age IS NOT NULL AND eligibility_max_age > 0)
  )
);

CREATE TABLE IF NOT EXISTS public.special_award_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES public.special_awards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (award_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.special_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  award_id UUID NOT NULL REFERENCES public.special_awards(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.special_award_candidates(id) ON DELETE CASCADE,
  rank_position INT NOT NULL CHECK (rank_position BETWEEN 1 AND 5),
  -- Ranked ballot 5,4,3,2,1 — derived from rank, never client-supplied.
  points INT NOT NULL CHECK (points = 6 - rank_position),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One final ballot per user per award: one row per rank, one vote per
  -- candidate, and both scoped to the specific award (=> per edition,
  -- because every award row belongs to exactly one voting period).
  UNIQUE (voter_id, award_id, rank_position),
  UNIQUE (voter_id, award_id, candidate_id)
);

-- Trigger timestamps for the awards config table (reuses the hardened
-- set_updated_at trigger function; triggers fire regardless of EXECUTE
-- privileges, which are revoked from API roles via Migration 1).
DROP TRIGGER IF EXISTS trg_special_awards_updated ON public.special_awards;
CREATE TRIGGER trg_special_awards_updated
  BEFORE UPDATE ON public.special_awards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- 1b. Indexes for the hot read paths. The UNIQUE constraints already index
--     (voter_id, award_id, ...) prefixes and (award_id, player_id); these
--     cover the award-wide scans used by stats/reset and the results join.
--     CREATE INDEX IF NOT EXISTS keeps the migration re-runnable.
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_special_votes_award_id
  ON public.special_votes (award_id);
CREATE INDEX IF NOT EXISTS idx_special_votes_candidate_id
  ON public.special_votes (candidate_id);

-- ===========================================================================
-- 2. Grants (minimal, matching the reconcile-permissions philosophy: clients
--    read via SELECT; all writes go through SECURITY DEFINER RPCs).
--    REVOKE FIRST: the live Supabase default ACLs (pg_default_acl) grant ALL
--    on new tables to anon/authenticated/service_role. RLS is NOT a
--    privilege boundary (TRUNCATE bypasses RLS), so an explicit REVOKE of
--    every privilege is required before re-granting SELECT. Without it:
--    - authenticated could INSERT into special_votes directly via the
--      permissive special_votes_insert_own RLS policy, bypassing
--      submit_special_ballot's exactly-5-candidates / finality checks;
--    - anon/authenticated could TRUNCATE the tables (TRUNCATE is
--      privilege-gated, not RLS-gated).
--    service_role is left untouched (Supabase server-side access pattern;
--    the service-role key never ships to the client).
-- ===========================================================================
REVOKE ALL ON TABLE public.special_awards FROM anon, authenticated;
REVOKE ALL ON TABLE public.special_award_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.special_votes FROM anon, authenticated;
GRANT SELECT ON TABLE public.special_awards TO authenticated;
GRANT SELECT ON TABLE public.special_award_candidates TO authenticated;
-- Own-ballot read (already-voted check). INSERT/UPDATE/DELETE stay ungranted:
-- submission is the atomic submit_special_ballot RPC, resets are admin RPCs.
GRANT SELECT ON TABLE public.special_votes TO authenticated;

-- ===========================================================================
-- 3. RLS policies (mirror the existing votes/hall_of_fame/user_roles
--    patterns; private.has_role is owned by admins only).
-- ===========================================================================
ALTER TABLE public.special_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_award_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS special_awards_select_all ON public.special_awards;
CREATE POLICY special_awards_select_all ON public.special_awards
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS special_awards_admin_manage ON public.special_awards;
CREATE POLICY special_awards_admin_manage ON public.special_awards
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS special_award_candidates_select_all ON public.special_award_candidates;
CREATE POLICY special_award_candidates_select_all ON public.special_award_candidates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS special_award_candidates_admin_manage ON public.special_award_candidates;
CREATE POLICY special_award_candidates_admin_manage ON public.special_award_candidates
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Ballots: users read only their own rows (admins see all for moderation).
DROP POLICY IF EXISTS special_votes_select_own ON public.special_votes;
CREATE POLICY special_votes_select_own ON public.special_votes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = voter_id
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Defence-in-depth INSERT guard for the day a client path is granted INSERT
-- (the submission RPC itself runs as owner and bypasses RLS):
-- own ballot, cast for a candidate of this award on an award whose voting is
-- open, and never for yourself.
DROP POLICY IF EXISTS special_votes_insert_own ON public.special_votes;
CREATE POLICY special_votes_insert_own ON public.special_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1
      FROM public.special_awards sa
      JOIN public.special_award_candidates c ON c.id = candidate_id
      WHERE sa.id = c.award_id
        AND sa.voting_open = true
        AND c.player_id <> auth.uid()
    )
  );

-- Immutability: no UPDATE policy exists at all. Admin-only DELETE for resets.
DROP POLICY IF EXISTS special_votes_admin_delete ON public.special_votes;
CREATE POLICY special_votes_admin_delete ON public.special_votes
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- ===========================================================================
-- 4. Row-level guard: a ballot row's candidate must exist, must belong to the
--    voted award, and must never be the voter themself. (The submission RPC
--    also checks all of this; the trigger defends against any future direct
--    write path. parallels votes' CHECK (voter_id <> ranked_player_id).)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.special_votes_guard_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  _award_id uuid;
BEGIN
  SELECT award_id INTO _award_id
    FROM public.special_award_candidates
    WHERE id = NEW.candidate_id;
  IF _award_id IS NULL OR _award_id <> NEW.award_id THEN
    RAISE EXCEPTION 'special_votes: candidate does not belong to the voted award';
  END IF;
  IF NEW.voter_id = (
    SELECT player_id FROM public.special_award_candidates WHERE id = NEW.candidate_id
  ) THEN
    RAISE EXCEPTION 'special_votes: you cannot vote for yourself';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.special_votes_guard_row() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_special_votes_guard_row ON public.special_votes;
CREATE TRIGGER trg_special_votes_guard_row
  BEFORE INSERT ON public.special_votes
  FOR EACH ROW EXECUTE FUNCTION public.special_votes_guard_row();

-- ===========================================================================
-- 5. Admin management RPCs — every mutation is SECURITY DEFINER, admin-gated
--    with private.has_role, and runs with the table owner's privileges so no
--    extra INSERT/UPDATE grants on these tables are ever handed to clients.
--    All functions harden search_path like the existing RPCs and drop the
--    Supabase-default EXECUTE grants for anon/PUBLIC.
-- ===========================================================================

-- Create the edition (a voting_periods row) plus the four award defaults:
--   kopa        -> eligible = young players (max_age, default 21)
--   yashin      -> eligible = goalkeepers (by_position)
--   gerd_muller -> eligible = all nominees (striker pedigree shows in votes)
--   socrates    -> eligible = all nominees
-- Defaults are admin-configurable afterwards via admin_set_special_award_
-- eligibility. Idempotent: year conflict keeps the existing period, award
-- conflict keeps the existing award.
CREATE OR REPLACE FUNCTION public.admin_create_special_award_edition(
  _year int,
  _ends_at timestamptz DEFAULT NULL
)
RETURNS TABLE (award_key text, award_id uuid, period_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- The RETURNS TABLE out-params share names with real table columns
-- (award_key); prefer actual columns inside the body.
#variable_conflict use_column
DECLARE
  _period uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  INSERT INTO public.voting_periods (year, title, is_active, ends_at)
  VALUES (_year, 'PRC D''or ' || _year, false, _ends_at)
  ON CONFLICT (year) DO NOTHING;

  SELECT id INTO _period FROM public.voting_periods WHERE year = _year;
  IF _period IS NULL THEN
    RAISE EXCEPTION 'could not create the % voting period', _year;
  END IF;

  INSERT INTO public.special_awards
    (voting_period_id, award_key, title)
  VALUES
    (_period, 'kopa',        'Kopa Trophy'),
    (_period, 'yashin',      'Yashin Trophy'),
    (_period, 'gerd_muller', 'Gerd Müller Trophy'),
    (_period, 'socrates',    'Socrates Award')
  ON CONFLICT (voting_period_id, award_key) DO NOTHING;

  UPDATE public.special_awards sa
    SET eligibility_type = 'max_age', eligibility_max_age = 21
    WHERE sa.voting_period_id = _period
      AND sa.award_key = 'kopa'
      AND sa.eligibility_type = 'all';

  UPDATE public.special_awards sa
    SET eligibility_type = 'by_position', eligibility_position = 'Goalkeeper'
    WHERE sa.voting_period_id = _period
      AND sa.award_key = 'yashin'
      AND sa.eligibility_type = 'all'
      AND sa.eligibility_position IS NULL;

  RETURN QUERY
    SELECT a.award_key, a.id, a.voting_period_id
    FROM public.special_awards a
    WHERE a.voting_period_id = _period
    ORDER BY a.award_key;
END $$;

REVOKE ALL ON FUNCTION public.admin_create_special_award_edition(int, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_special_award_edition(int, timestamptz) TO authenticated;

-- Server-side eligibility evaluation against a profile row.
CREATE OR REPLACE FUNCTION public.special_award_eligible_profile(
  _eligibility_type text,
  _eligibility_position public.player_position,
  _eligibility_max_age int,
  _profile_age int,
  _profile_position public.player_position
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  -- COALESCE: a NULL profile age/position under 'max_age'/'by_position'
  -- must be a FALSE, not a SQL NULL that would sneak through NOT checks.
  SELECT COALESCE(
    CASE _eligibility_type
      WHEN 'max_age' THEN
        _profile_age IS NOT NULL AND _profile_age <= _eligibility_max_age
      WHEN 'by_position' THEN
        _profile_position = _eligibility_position
      ELSE true -- 'all'
    END,
    false
  )
$$;

-- Internal helper: only called by admin_nominate_player (SECURITY DEFINER,
-- running as owner postgres). Without this REVOKE, the live default ACLs
-- (and the PUBLIC EXECUTE default) would let anon call it directly (W2).
-- Owner (postgres) retains implicit EXECUTE; no grant to authenticated is
-- needed because no client path calls it.
REVOKE ALL ON FUNCTION public.special_award_eligible_profile(text, public.player_position, int, int, public.player_position) FROM PUBLIC, anon, authenticated;

-- Nominate a player for an award. Validates the award and the configured
-- eligibility rule, and locks nominations once voting is open.
CREATE OR REPLACE FUNCTION public.admin_nominate_player(
  _award_id uuid,
  _player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _award public.special_awards;
  _full_name text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  SELECT * INTO _award FROM public.special_awards WHERE id = _award_id;
  IF _award.id IS NULL THEN
    RAISE EXCEPTION 'special award not found';
  END IF;
  IF _award.voting_open THEN
    RAISE EXCEPTION 'voting is open: nominations are locked for "%"', _award.title;
  END IF;

  SELECT full_name INTO _full_name FROM public.profiles WHERE id = _player_id;
  IF _full_name IS NULL THEN
    RAISE EXCEPTION 'player not found';
  END IF;

  IF NOT public.special_award_eligible_profile(
    _award.eligibility_type,
    _award.eligibility_position,
    _award.eligibility_max_age,
    (SELECT age FROM public.profiles WHERE id = _player_id),
    (SELECT position FROM public.profiles WHERE id = _player_id)
  ) THEN
    RAISE EXCEPTION '% does not meet the eligibility rule for "%"', _full_name, _award.title;
  END IF;

  INSERT INTO public.special_award_candidates (award_id, player_id)
  VALUES (_award_id, _player_id)
  ON CONFLICT (award_id, player_id) DO NOTHING;

  RETURN (
    SELECT c.id FROM public.special_award_candidates c
    WHERE c.award_id = _award_id AND c.player_id = _player_id
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_nominate_player(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_nominate_player(uuid, uuid) TO authenticated;

-- Remove a nominee while a candidate has received no votes.
CREATE OR REPLACE FUNCTION public.admin_remove_nominee(
  _award_id uuid,
  _player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _candidate uuid;
  _votes int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  SELECT id INTO _candidate FROM public.special_award_candidates
  WHERE award_id = _award_id AND player_id = _player_id;
  IF _candidate IS NULL THEN
    RAISE EXCEPTION 'candidate not found for this award';
  END IF;

  SELECT count(*)::int INTO _votes FROM public.special_votes WHERE candidate_id = _candidate;
  IF _votes > 0 THEN
    RAISE EXCEPTION 'candidate already received votes: reset the award votes first';
  END IF;

  DELETE FROM public.special_award_candidates WHERE id = _candidate;
END $$;

REVOKE ALL ON FUNCTION public.admin_remove_nominee(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_nominee(uuid, uuid) TO authenticated;

-- Configure the eligibility rule (before voting opens; blocks changes once
-- ballots exist so completed votes never disagree with the rule).
CREATE OR REPLACE FUNCTION public.admin_set_special_award_eligibility(
  _award_id uuid,
  _eligibility_type text,
  _max_age int,
  _position public.player_position
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _votes int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _eligibility_type NOT IN ('all', 'by_position', 'max_age') THEN
    RAISE EXCEPTION 'unknown eligibility type: %', _eligibility_type;
  END IF;
  IF _eligibility_type = 'max_age' AND (_max_age IS NULL OR _max_age <= 0) THEN
    RAISE EXCEPTION 'max_age eligibility requires a positive age';
  END IF;
  IF _eligibility_type = 'by_position' AND _position IS NULL THEN
    RAISE EXCEPTION 'by_position eligibility requires a position';
  END IF;

  SELECT count(*)::int INTO _votes
  FROM public.special_votes sv
  JOIN public.special_award_candidates c ON c.id = sv.candidate_id
  WHERE c.award_id = _award_id;
  IF _votes > 0 THEN
    RAISE EXCEPTION 'votes already exist: eligibility is locked for this award';
  END IF;

  UPDATE public.special_awards
    SET eligibility_type      = _eligibility_type,
        eligibility_max_age   = CASE WHEN _eligibility_type = 'max_age' THEN _max_age ELSE NULL END,
        eligibility_position  = CASE WHEN _eligibility_type = 'by_position' THEN _position ELSE NULL END
  WHERE id = _award_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'special award not found';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_set_special_award_eligibility(uuid, text, int, public.player_position) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_special_award_eligibility(uuid, text, int, public.player_position) TO authenticated;

-- Status per award: open/close voting and reveal/hide results. Opening
-- voting requires at least 5 candidates (the ballot needs 5 picks).
CREATE OR REPLACE FUNCTION public.admin_set_special_award_status(
  _award_id uuid,
  _voting_open boolean,
  _results_visible boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _awards int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  SELECT count(*)::int INTO _awards
  FROM public.special_award_candidates WHERE award_id = _award_id;
  IF _voting_open AND _awards < 5 THEN
    RAISE EXCEPTION 'at least 5 candidates are required before voting can open (have %)', _awards;
  END IF;

  UPDATE public.special_awards
    SET voting_open    = COALESCE(_voting_open, voting_open),
        results_visible = COALESCE(_results_visible, results_visible)
  WHERE id = _award_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'special award not found';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_set_special_award_status(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_special_award_status(uuid, boolean, boolean) TO authenticated;

-- Reset every ballot for one award (mirrors admin resetVotes for periods).
CREATE OR REPLACE FUNCTION public.admin_reset_special_votes(_award_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  DELETE FROM public.special_votes WHERE award_id = _award_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_reset_special_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_special_votes(uuid) TO authenticated;

-- Participation stats per award (ballots + distinct voters). Gated exactly
-- like get_special_award_results: visible only when the award's
-- results_visible = true, always for admins. Without the gate, vote_count /
-- voter_count would leak pre-publication (W1). The EXISTS gate (not a JOIN)
-- keeps the {0, 0} row intact for zero-vote awards once results are visible.
CREATE OR REPLACE FUNCTION public.get_special_award_stats(_award_id uuid)
RETURNS TABLE (vote_count int, voter_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT agg.vote_count, agg.voter_count
  FROM (
    SELECT
      COUNT(*)::int AS vote_count,
      COUNT(DISTINCT sv.voter_id)::int AS voter_count
    FROM public.special_votes sv
    WHERE sv.award_id = _award_id
  ) agg
  WHERE EXISTS (
    SELECT 1 FROM public.special_awards sa
    WHERE sa.id = _award_id
      AND (
        sa.results_visible = true
        OR private.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.get_special_award_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_special_award_stats(uuid) TO authenticated;

-- Atomic ballot submission: exactly 5 distinct candidates of the award,
-- ranked order preserved, points derived server-side (5..1), voting open,
-- one final ballot per voter per award. Mirrors submit_main_ballot.
CREATE OR REPLACE FUNCTION public.submit_special_ballot(
  _award_id uuid,
  _ranked_candidate_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _voting_open boolean;
  _awards int;
  _total int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT sa.voting_open INTO _voting_open
  FROM public.special_awards sa WHERE sa.id = _award_id;
  IF _voting_open IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'voting is not open for this award';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.special_votes
    WHERE voter_id = auth.uid() AND award_id = _award_id
  ) THEN
    RAISE EXCEPTION 'ballot already submitted for this award';
  END IF;

  IF array_length(_ranked_candidate_ids, 1) <> 5 THEN
    RAISE EXCEPTION 'exactly 5 candidates are required';
  END IF;
  IF (SELECT COUNT(DISTINCT c) FROM unnest(_ranked_candidate_ids) c) <> 5 THEN
    RAISE EXCEPTION 'duplicate candidate in ballot';
  END IF;

  SELECT count(*)::int INTO _total
  FROM public.special_award_candidates c
  WHERE c.award_id = _award_id
    AND c.id = ANY(_ranked_candidate_ids);
  IF _total <> 5 THEN
    RAISE EXCEPTION 'ballot contains an unknown or ineligible candidate';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.special_award_candidates c
    WHERE c.award_id = _award_id
      AND c.id = ANY(_ranked_candidate_ids)
      AND c.player_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'you cannot vote for yourself';
  END IF;

  INSERT INTO public.special_votes (voter_id, award_id, candidate_id, rank_position, points)
  SELECT auth.uid(), _award_id, c, ord,
         -- 5, 4, 3, 2, 1 — the special awards ballot scoring
         6 - ord
  FROM unnest(_ranked_candidate_ids) WITH ORDINALITY AS t(c, ord);
END $$;

REVOKE ALL ON FUNCTION public.submit_special_ballot(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_special_ballot(uuid, uuid[]) TO authenticated;

-- Final ranking per award — public only when the admin makes results
-- visible; admins always see results (same contract as get_period_results).
CREATE OR REPLACE FUNCTION public.get_special_award_results(_award_id uuid)
RETURNS TABLE (
  award_id uuid,
  candidate_id uuid,
  id uuid,                 -- profile id
  full_name text,
  nickname text,
  -- NOTE: named player_position; `position` is reserved-adjacent and PostgREST
  -- callers read the alias anyway.
  player_position public.player_position,
  jersey_number int,
  profile_image text,
  total_points int,
  first_place_votes int,
  total_rankings int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.award_id,
    c.id AS candidate_id,
    p.id,
    p.full_name,
    p.nickname,
    p.position AS player_position,
    p.jersey_number,
    p.profile_image,
    COALESCE(SUM(sv.points), 0)::INT AS total_points,
    COUNT(sv.id) FILTER (WHERE sv.rank_position = 1)::INT AS first_place_votes,
    COUNT(sv.id)::INT AS total_rankings
  FROM public.special_award_candidates c
  JOIN public.special_awards sa ON sa.id = c.award_id
  JOIN public.profiles p ON p.id = c.player_id
  LEFT JOIN public.special_votes sv ON sv.candidate_id = c.id
  WHERE c.award_id = _award_id
    AND (
      sa.results_visible = true
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
  GROUP BY c.award_id, c.id, p.id
  ORDER BY total_points DESC, first_place_votes DESC, p.full_name ASC
$$;

REVOKE ALL ON FUNCTION public.get_special_award_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_special_award_results(uuid) TO authenticated;

-- Per-award UI helper: is the voting party allowed to see the ranking?
CREATE OR REPLACE FUNCTION public.is_special_award_results_visible(_award_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.special_awards sa
      WHERE sa.id = _award_id AND sa.results_visible = true
    )
$$;

REVOKE ALL ON FUNCTION public.is_special_award_results_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_special_award_results_visible(uuid) TO authenticated;
