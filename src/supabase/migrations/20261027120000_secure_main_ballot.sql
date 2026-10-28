-- Migration: secure main Ballon d'Or ballot submission (the permission
-- "Migration 2" cutover announced in 20261023120000_reconcile_permissions.sql
-- — not the Special Awards file, which also calls itself Migration 2).
-- Forward-only, idempotent, and it never touches data: no rows are inserted,
-- updated, or deleted here, and no voting-period state changes.
--
-- SECURITY INTENT (audit finding: client-computed ballot points)
--   Before this migration the vote page (src/routes/_authenticated/vote.tsx)
--   built its own rows and inserted them straight into public.votes with
--   `points` calculated in the browser:
--       const rows = ranking.map((p, i) => ({ voter_id: user.id, ...,
--                     points: POINTS_BY_RANK[i + 1], ... }));
--       await supabase.from("votes").insert(rows);
--   The server only enforced RLS `auth.uid() = voter_id AND period is_active`,
--   CHECK (rank_position BETWEEN 1 AND 10), CHECK (voter_id <> ranked_player_id)
--   and the two UNIQUE constraints. Nothing checked that a submission held
--   exactly 10 rows, that its ranks formed the complete set 1..10, or that the
--   points matched the frozen 15,12,10,8,7,6,5,4,3,2 map — so any authenticated
--   user could POST /rest/v1/votes directly with forged points (e.g. 1000 on
--   rank 1) or a 3-row partial ballot, and it would commit.
--
-- FIX
--   1. public.submit_main_ballot(_period_id, _player_ids) — SECURITY DEFINER
--      RPC and the only write path for ballots:
--        * voter identity comes exclusively from auth.uid(); there is no voter
--          parameter, so a client can never submit on someone else's behalf;
--        * the voting period must exist and be open. "Open" = is_active, the
--          same definition the vote page and the original votes_insert_own
--          policy already use (see NOT CHANGED for starts_at/ends_at);
--        * exactly 10 distinct player ids, each of which must exist in
--          public.profiles and must not be the voter. Ballot size 10 is the
--          existing application rule — votes.rank_position CHECK 1..10,
--          POINTS_BY_RANK / RANK_LABELS (src/lib/points.ts, pinned by
--          tests/points.test.mjs), the "Rank your Top 10" UI and README
--          "Top-10 ranked voting" — it is not an assumption;
--        * ranks 1..10 and points are derived server-side from
--          public.ballot_points_for_rank(); the client sends an ordered uuid[]
--          and nothing else (no rank/points arguments exist to tamper with);
--        * pg_advisory_xact_lock(voter, period) is taken BEFORE the
--          "already submitted" check, so two concurrent submissions from one
--          voter serialise: the loser waits for the winner to commit, then
--          sees the rows and fails cleanly with "already submitted". The two
--          pre-existing UNIQUE constraints remain the hard backstop — a
--          duplicate ballot can never commit even if something bypasses the
--          check.
--   2. INSERT/UPDATE/TRUNCATE on public.votes are REVOKE'd from anon and
--      authenticated (SELECT and DELETE are kept: own-ballot read, admin
--      reset). Direct table writes are then impossible for ordinary users —
--      RLS alone is not a privilege boundary (see 20261025120000 §2).
--   3. votes_insert_own (RLS, unreachable without the INSERT grant) is
--      tightened to the same scoring rule, so any future re-grant cannot
--      reintroduce forged points.
--   4. A DEFERRABLE INITIALLY DEFERRED AFTER INSERT constraint trigger
--      re-validates the touched (voter, period) ballot at COMMIT: a row-level
--      BEFORE INSERT trigger cannot check completeness, because sibling rows
--      may not exist yet when a row fires (proof:
--      tests/ballot-integrity.test.mjs "FLAW DEMO"). It is deliberately
--      INSERT-only: a DELETE-side check would break the admin "permanent
--      player deletion" flow, because votes.ranked_player_id is ON DELETE
--      CASCADE and removing a player tears exactly one row out of every ballot
--      that ranks them (20261023120000 keeps DELETE for admin resets). This
--      deliberately diverges from the Phase-0 prototype
--      (tests/sql/20-ballot-integrity-fixtures.sql, which used INSERT OR
--      DELETE): after step 4 no client can DELETE ballot rows at all, so the
--      only remaining way to tear a ballot is an admin-initiated cascade,
--      which must be allowed to commit. Clients can therefore never leave a
--      partial ballot behind.
--
-- NOT CHANGED (explicitly out of scope)
--   * voting_periods: no UPDATE/INSERT/DELETE here, so no period is opened,
--     closed, re-dated or deactivated by this migration, and the 2026 row keeps
--     its current is_active / results_visible values. is_active stays the sole
--     definition of "open"; the starts_at/ends_at columns are NOT enforced
--     because the seeded 2026 period carries a 60-day ends_at from the June
--     seed while is_active = true — enforcing the window here could silently
--     close live voting. That judgement needs human verification against live
--     data before anyone adds window enforcement.
--   * existing ballots (including 2026 history): never read for modification,
--     never rewritten, never deleted. The deferred trigger only fires on
--     future INSERTs, so historical rows stay exactly as stored and remain
--     readable through get_period_results / player_results_by_period /
--     has_voted_in_period.
--   * admin abilities: votes DELETE (admin.tsx resetVotes) keeps its grant and
--     the votes_admin_delete policy is untouched; results-visibility gates,
--     hall of fame, analytics and every special-award object are untouched.
--   * service_role keeps its votes privileges (trusted server-side role; the
--     service-role key never ships to a client).
--
-- DEPLOYMENT ORDER (out-of-band, Supabase SQL editor — same channel as
--   20261023120000 and 20261025120000): apply this file immediately before
--   deploying the vote.tsx cutover in the same release. Between the two, the
--   old page's direct INSERT is rejected (the user can retry after the deploy;
--   no data is written or lost). Re-running the file is safe.

-- ===========================================================================
-- 1. Server-side score map: the single source of truth for the 15..2 ballot.
--    Mirrors src/lib/points.ts POINTS_BY_RANK, pinned by tests/points.test.mjs
--    (a complete 1..10 ballot totals 72 points).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ballot_points_for_rank(p_rank int)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_rank
    WHEN 1  THEN 15
    WHEN 2  THEN 12
    WHEN 3  THEN 10
    WHEN 4  THEN 8
    WHEN 5  THEN 7
    WHEN 6  THEN 6
    WHEN 7  THEN 5
    WHEN 8  THEN 4
    WHEN 9  THEN 3
    WHEN 10 THEN 2
  END;
$$;
REVOKE ALL ON FUNCTION public.ballot_points_for_rank(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ballot_points_for_rank(int) TO authenticated;

-- ===========================================================================
-- 2. Deferred completeness validator (defence in depth for any writer).
--    It runs at COMMIT — not per row — because a row-level BEFORE INSERT
--    trigger cannot see sibling rows that have not been inserted yet.
--    0 rows for (voter, period) = the whole ballot was removed (admin reset)
--    = valid state. Otherwise the ballot must be exactly ranks 1..10 (unique
--    per voter/period via the pre-existing UNIQUE constraint, so 10 rows with
--    ranks in 1..10 is exactly the set 1..10) with the frozen points.
--    INSERT-only: see the header for why no DELETE-side check exists.
--    SECURITY DEFINER: the validation must see every row of the ballot
--    (RLS-filtered reads would hide rows of other voters) and must be able to
--    call ballot_points_for_rank() no matter which role fired the trigger —
--    EXECUTE on both helpers is revoked from the API roles, which keeps them
--    out of the PostgREST RPC surface; PostgreSQL checks EXECUTE on a trigger
--    function when the trigger is created, not when it fires, so the trigger
--    still runs for every writer.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_validate_main_ballot(p_voter uuid, p_period uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows int;
  v_valid_ranks int;
  v_bad_points int;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE rank_position BETWEEN 1 AND 10),
    count(*) FILTER (
      WHERE points IS DISTINCT FROM public.ballot_points_for_rank(rank_position)
    )
  INTO v_rows, v_valid_ranks, v_bad_points
  FROM public.votes
  WHERE voter_id = p_voter
    AND voting_period_id = p_period;

  IF v_rows = 0 THEN
    RETURN; -- fully removed ballot (admin reset) is a valid state
  END IF;
  IF v_rows <> 10 OR v_valid_ranks <> 10 THEN
    RAISE EXCEPTION 'main_ballot_integrity: incomplete ballot (voter %, period %, rows %)',
      p_voter, p_period, v_rows;
  END IF;
  IF v_bad_points > 0 THEN
    RAISE EXCEPTION 'main_ballot_integrity: points do not match rank map (voter %, period %)',
      p_voter, p_period;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.fn_validate_main_ballot(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_trg_main_ballot_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.fn_validate_main_ballot(NEW.voter_id, NEW.voting_period_id);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.fn_trg_main_ballot_complete()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_main_ballot_complete ON public.votes;
CREATE CONSTRAINT TRIGGER trg_main_ballot_complete
  AFTER INSERT ON public.votes
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_main_ballot_complete();

-- ===========================================================================
-- 3. Ballot submission RPC — the only write path for voters.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.submit_main_ballot(
  _period_id uuid,
  _player_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_voter uuid := auth.uid();
  v_n int;
  v_open boolean;
  v_existing int;
  v_unknown int;
BEGIN
  IF v_voter IS NULL THEN
    RAISE EXCEPTION 'submit_main_ballot: not authenticated';
  END IF;

  -- Serialise submissions from this voter for this period. The lock MUST be
  -- acquired before the duplicate check: two racing requests cannot see each
  -- other's uncommitted rows, so without the lock both could pass the check
  -- and the loser would die on a UNIQUE violation instead of a clean message.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_voter::text || ':' || _period_id::text, 0)
  );

  v_n := coalesce(array_length(_player_ids, 1), 0);
  IF _player_ids IS NULL OR v_n <> 10 THEN
    RAISE EXCEPTION 'submit_main_ballot: ballot must rank exactly 10 players (got %)', v_n;
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_player_ids) AS t(pid) WHERE t.pid IS NULL
  ) THEN
    RAISE EXCEPTION 'submit_main_ballot: invalid player id in ballot';
  END IF;
  IF (SELECT count(DISTINCT t.pid) FROM unnest(_player_ids) AS t(pid)) <> 10 THEN
    RAISE EXCEPTION 'submit_main_ballot: duplicate player in ballot';
  END IF;

  SELECT vp.is_active INTO v_open
    FROM public.voting_periods vp
   WHERE vp.id = _period_id;
  IF v_open IS NULL THEN
    RAISE EXCEPTION 'submit_main_ballot: voting period does not exist';
  END IF;
  IF v_open <> true THEN
    RAISE EXCEPTION 'submit_main_ballot: voting period is not open';
  END IF;

  SELECT count(*) INTO v_existing
    FROM public.votes
   WHERE voter_id = v_voter
     AND voting_period_id = _period_id;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'submit_main_ballot: ballot already submitted';
  END IF;

  SELECT count(*) INTO v_unknown
    FROM unnest(_player_ids) AS t(pid)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.profiles p WHERE p.id = t.pid
   );
  IF v_unknown > 0 THEN
    RAISE EXCEPTION 'submit_main_ballot: unknown player in ballot';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(_player_ids) AS t(pid) WHERE t.pid = v_voter
  ) THEN
    RAISE EXCEPTION 'submit_main_ballot: you cannot vote for yourself';
  END IF;

  -- Ranks 1..10 follow the submitted order and the points come from the score
  -- map: the caller supplies no rank and no points value.
  INSERT INTO public.votes
    (voter_id, ranked_player_id, rank_position, points, voting_period_id)
  SELECT
    v_voter,
    t.pid,
    t.ord::int,
    public.ballot_points_for_rank(t.ord::int),
    _period_id
  FROM unnest(_player_ids) WITH ORDINALITY AS t(pid, ord);
END $$;
REVOKE ALL ON FUNCTION public.submit_main_ballot(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_main_ballot(uuid, uuid[]) TO authenticated;

-- ===========================================================================
-- 4. Privilege cutover: ordinary clients may read ballots and admins may still
--    delete them, but nobody but the owner/service_role can write rows any
--    more. REVOKE comes before the re-GRANT so the result is explicit and
--    idempotent; the statement below leaves authenticated with exactly
--    SELECT + DELETE on public.votes (the state 20261023120000 documented as
--    "retained until Migration 2"). service_role is intentionally untouched.
-- ===========================================================================
REVOKE ALL ON TABLE public.votes FROM anon;
REVOKE INSERT, UPDATE, TRUNCATE ON TABLE public.votes FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.votes TO authenticated;

-- ===========================================================================
-- 5. RLS insert guard, tightened (defence in depth). Unreachable today — step
--    4 removed the INSERT grant — but it keeps a future re-grant honest: own
--    ballot, points matching the rank map, period open. votes_select_own and
--    votes_admin_delete are left untouched.
-- ===========================================================================
DROP POLICY IF EXISTS votes_insert_own ON public.votes;
CREATE POLICY votes_insert_own ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND points = public.ballot_points_for_rank(rank_position)
    AND EXISTS (
      SELECT 1 FROM public.voting_periods vp
       WHERE vp.id = voting_period_id
         AND vp.is_active = true
    )
  );

-- ===========================================================================
-- 6. POST-APPLY VERIFICATION (run by tests/main-ballot-rpc.test.mjs locally;
--    for the live database, review only — never executed from this repo):
--     * has_table_privilege('authenticated','public.votes','INSERT')  = false
--     * has_table_privilege('authenticated','public.votes','UPDATE')  = false
--     * has_table_privilege('authenticated','public.votes','TRUNCATE')= false
--     * has_table_privilege('authenticated','public.votes','SELECT')  = true
--     * has_table_privilege('authenticated','public.votes','DELETE')  = true
--     * has_function_privilege('anon', ...submit_main_ballot...)      = false
--     * has_function_privilege('authenticated',...submit_main_ballot)= true
--     * trg_main_ballot_complete exists, is a CONSTRAINT trigger,
--       deferrable + initially deferred, event = INSERT
--     * public.voting_periods row count / is_active / results_visible
--       unchanged; public.votes row count unchanged
--   Then smoke-test: sign in, submit a ballot on a scratch period only,
--   confirm the vote page shows the locked-in state, confirm admin reset and
--   results visibility still work. Never mutate 2026 data.
-- ===========================================================================
