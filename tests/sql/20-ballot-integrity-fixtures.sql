-- PROTOTYPE (Phase 0, test-only): atomic ballot integrity for the main Ballon d'Or.
-- Validates the existing public.votes schema only: no tables, grants, or policies
-- are modified. Not applied to any environment; candidate design for Phase 1.
--
-- Design: a row-level BEFORE INSERT trigger CANNOT verify ballot completeness
-- (rows may not exist yet when a row fires). Two atomic mechanisms instead:
--   1) submit_main_ballot(): validates the whole ballot input array, then inserts
--      in one statement (single transaction, no DB-wide scan needed).
--   2) DEFERRABLE INITIALLY DEFERRED constraint trigger: defense-in-depth for any
--      other writer; fires at COMMIT, when the full ballot is visible.

-- Points map frozen to 2026 scoring (mirrors src/lib/points.ts).
CREATE OR REPLACE FUNCTION public.ballot_points_for_rank(p_rank int)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_rank
    WHEN 1 THEN 15 WHEN 2 THEN 12 WHEN 3 THEN 10 WHEN 4 THEN 8 WHEN 5 THEN 7
    WHEN 6 THEN 6 WHEN 7 THEN 5 WHEN 8 THEN 4 WHEN 9 THEN 3 WHEN 10 THEN 2
  END;
$$;

-- Checks one (voter, period) ballot: 0 rows = fully removed (admin reset) = OK.
CREATE OR REPLACE FUNCTION public.fn_validate_ballot(p_voter uuid, p_period uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
  v_bad_points int;
  v_rank int;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.votes
   WHERE voter_id = p_voter AND voting_period_id = p_period;
  IF v_count = 0 THEN RETURN; END IF;
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'ballot_integrity: incomplete ballot (voter %, period %, rows %)',
      p_voter, p_period, v_count;
  END IF;
  FOR v_rank IN 1..10 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.votes
       WHERE voter_id = p_voter AND voting_period_id = p_period AND rank_position = v_rank
    ) THEN
      RAISE EXCEPTION 'ballot_integrity: missing rank % (voter %, period %)',
        v_rank, p_voter, p_period;
    END IF;
  END LOOP;
  SELECT count(*) INTO v_bad_points
    FROM public.votes
   WHERE voter_id = p_voter AND voting_period_id = p_period
     AND points IS DISTINCT FROM public.ballot_points_for_rank(rank_position);
  IF v_bad_points > 0 THEN
    RAISE EXCEPTION 'ballot_integrity: points do not match rank map (voter %, period %)',
      p_voter, p_period;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_trg_validate_ballot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_voter uuid;
  v_period uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_voter := OLD.voter_id; v_period := OLD.voting_period_id;
  ELSE
    v_voter := NEW.voter_id; v_period := NEW.voting_period_id;
  END IF;
  PERFORM public.fn_validate_ballot(v_voter, v_period);
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_votes_ballot_complete
  AFTER INSERT OR DELETE ON public.votes
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_validate_ballot();

-- Single entry point for voters; derives points server-side.
-- Voting-window enforcement (starts_at/ends_at) is intentionally deferred to Phase 1.
CREATE OR REPLACE FUNCTION public.submit_main_ballot(p_period_id uuid, p_player_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_voter uuid := auth.uid();
  v_n int := coalesce(array_length(p_player_ids, 1), 0);
  v_active boolean;
  v_existing int;
  v_unknown int;
BEGIN
  IF v_voter IS NULL THEN
    RAISE EXCEPTION 'submit_main_ballot: not authenticated';
  END IF;
  IF v_n <> 10 THEN
    RAISE EXCEPTION 'submit_main_ballot: ballot must rank exactly 10 players (got %)', v_n;
  END IF;
  IF (SELECT count(DISTINCT pid) FROM unnest(p_player_ids) AS t(pid)) <> 10 THEN
    RAISE EXCEPTION 'submit_main_ballot: duplicate player in ballot';
  END IF;
  SELECT is_active INTO v_active FROM public.voting_periods WHERE id = p_period_id;
  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'submit_main_ballot: voting period is not active';
  END IF;
  SELECT count(*) INTO v_existing
    FROM public.votes WHERE voter_id = v_voter AND voting_period_id = p_period_id;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'submit_main_ballot: ballot already submitted';
  END IF;
  SELECT count(*) INTO v_unknown
    FROM unnest(p_player_ids) AS t(pid)
   WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = t.pid);
  IF v_unknown > 0 THEN
    RAISE EXCEPTION 'submit_main_ballot: unknown player in ballot';
  END IF;
  INSERT INTO public.votes (voter_id, ranked_player_id, rank_position, points, voting_period_id)
  SELECT v_voter, t.pid, t.ord::int, public.ballot_points_for_rank(t.ord::int), p_period_id
    FROM unnest(p_player_ids) WITH ORDINALITY AS t(pid, ord);
END $$;
