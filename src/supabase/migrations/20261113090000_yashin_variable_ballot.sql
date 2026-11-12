-- 20261113090000_yashin_variable_ballot.sql
--
-- Yashin Trophy: variable nomination threshold and variable-length ballots.
--
-- WHY
--   The Yashin eligibility rule is by_position 'Goalkeeper' and PRC D'or has
--   only 3-4 eligible goalkeepers, so the fixed "open at 5 / rank exactly 5"
--   contract made the award impossible to run. Every other award (Kopa,
--   Socrates, Gerd Muller) keeps a pool of at least 5 and is unaffected.
--
-- WHAT CHANGES (forward-only; no previously applied migration is edited)
--   1. admin_set_special_award_status
--        open threshold: yashin -> 3 nominees, every other award -> 5
--   2. submit_special_ballot
--        required ranking length:
--          yashin  -> LEAST(GREATEST(nominees, 3), 5)   (3, 4 or 5)
--          others  -> 5                                 (unchanged)
--
-- WHAT DOES NOT CHANGE
--   * Scoring: points stay `6 - rank_position` (5, 4, 3, 2, 1). A 3- or
--     4-row Yashin ballot simply stores rows 1..3 / 1..4, i.e. 5,4,3 and
--     5,4,3,2. No existing points row is rewritten.
--   * Aggregation: get_special_award_results sums `special_votes.points`
--     per candidate and counts first-place rows, so variable-length ballots
--     aggregate correctly with no change to that RPC.
--   * Security: the full production body of submit_special_ballot is
--     reproduced here, including auth, private.assert_voter_approved,
--     voting window, one-final-ballot-per-user-per-award, self-vote
--     rejection and the unknown/ineligible candidate check.
--   * Grants: identical REVOKE/GRANT statements. CREATE OR REPLACE also
--     preserves the existing ACL and prosecdef, so anon stays denied.
--   * Eligibility: admin_nominate_player still applies the per-award
--     eligibility rule (goalkeepers only for Yashin) on every nomination.
--
-- HISTORY SAFETY
--   Existing special_votes rows are untouched: this migration only replaces
--   two function bodies. Historical ballots and standings are byte-identical
--   after it runs.
--
-- PRODUCTION NOTE
--   This file is shipped for review/apply by the normal migration workflow.
--   It was NOT executed against production while being authored.

-- ---------------------------------------------------------------------------
-- 1. Opening threshold: 3 for Yashin, 5 for every other award.
-- ---------------------------------------------------------------------------
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
  _key text;
  _min int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  -- Yashin's eligible pool is 3-4 goalkeepers, so it opens at 3. A missing
  -- award keeps the historical 5 (award_key is NULL -> ELSE branch) and then
  -- falls through to the 'special award not found' error below, exactly as
  -- the previous version of this function behaved.
  SELECT sa.award_key INTO _key
  FROM public.special_awards sa WHERE sa.id = _award_id;
  _min := CASE WHEN _key = 'yashin' THEN 3 ELSE 5 END;

  SELECT count(*)::int INTO _awards
  FROM public.special_award_candidates WHERE award_id = _award_id;
  IF _voting_open AND _awards < _min THEN
    RAISE EXCEPTION 'at least % candidates are required before voting can open (have %)', _min, _awards;
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

-- ---------------------------------------------------------------------------
-- 2. Variable-length ballot submission.
--
-- Body reproduced from 20261111140000_voter_approval_system.sql (the version
-- live in production) with only the ranking-length checks generalised.
-- ---------------------------------------------------------------------------
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
  _key text;
  _available int;
  _required int;
  _total int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Approval gate: same fail-closed helper as the main ballot.
  PERFORM private.assert_voter_approved(auth.uid());

  SELECT sa.voting_open, sa.award_key INTO _voting_open, _key
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

  SELECT count(*)::int INTO _available
  FROM public.special_award_candidates c
  WHERE c.award_id = _award_id;

  -- Yashin ranks every nominee while the pool is 3 or 4 and the top 5 once
  -- the pool reaches 5+. The GREATEST(..., 3) floor is fail-closed: if the
  -- pool were ever shrunk below 3 after voting closed, no ballot could be
  -- submitted instead of silently accepting a 1- or 2-row ballot.
  -- Every other award is the unchanged fixed top-5 ballot.
  _required := CASE
    WHEN _key = 'yashin' THEN GREATEST(LEAST(_available, 5), 3)
    ELSE 5
  END;

  IF COALESCE(array_length(_ranked_candidate_ids, 1), 0) <> _required THEN
    RAISE EXCEPTION 'exactly % candidates are required', _required;
  END IF;
  IF (SELECT COUNT(DISTINCT c) FROM unnest(_ranked_candidate_ids) c) <> _required THEN
    RAISE EXCEPTION 'duplicate candidate in ballot';
  END IF;

  SELECT count(*)::int INTO _total
  FROM public.special_award_candidates c
  WHERE c.award_id = _award_id
    AND c.id = ANY(_ranked_candidate_ids);
  IF _total <> _required THEN
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
         -- 5, 4, 3, 2, 1 — the special awards ballot scoring. A shorter
         -- Yashin ballot simply stops after its last rank (3 -> 5,4,3).
         6 - ord
  FROM unnest(_ranked_candidate_ids) WITH ORDINALITY AS t(c, ord);
END $$;

REVOKE ALL ON FUNCTION public.submit_special_ballot(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_special_ballot(uuid, uuid[]) TO authenticated;
