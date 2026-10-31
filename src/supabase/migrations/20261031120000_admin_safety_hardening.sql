-- 20261031120000_admin_safety_hardening.sql
--
-- Safety hardening for the admin vote-audit / final-ranking feature (approved
-- audit findings H1, M2, M4, F8, F9; M1/M3/M5/M6 are UI/script-side only and
-- are implemented in the admin UI and scripts/admin-remove-voter-ballot.sql).
--
-- SECURITY / DATA-SAFETY INTENT (per change):
--
--   H1 admin_reset_votes(uuid, text)
--      Period reset previously hard-deleted votes with no audit record and
--      left final_rankings stale (admin.tsx resetVotes). This RPC preserves
--      the original reset semantics (hard delete of the period's votes - the
--      votes DELETE grant and votes_admin_delete policy are deliberately left
--      intact per tests/main-ballot-rpc.test.mjs) but also clears the
--      period's final_rankings rows and writes an admin_audit_log row with
--      counts. Admin-gated (raises "not authorized: admin only") like every
--      other admin_* RPC. Advisory-locked so a concurrent moderation action
--      cannot interleave.
--
--   M2 admin_get_ballot(uuid, uuid, boolean)
--      The 2-arg version filtered removed_at IS NULL with no way to inspect a
--      removed ballot. The old signature is DROPped (a DEFAULT-arg overload
--      would be ambiguous to 2-arg callers) and re-created with an optional
--      _include_removed boolean defaulting to false, plus removed_at /
--      removal_reason output columns. Active-ballot semantics unchanged
--      (body mirrors the original). Same admin gate.
--
--   M4 get_active_period_analytics()
--      Ranked player totals ignored manually approved final_rankings, unlike
--      get_period_results. Re-defined with the same COALESCE(final_position)
--      ordering as get_period_results. Callers (analytics.tsx) unchanged.
--
--   F8 get_period_vote_stats(uuid)
--      Ungated: any caller could count ballots and voters for a hidden
--      period. Re-defined: admin sees everything; non-admin only counts over
--      results_visible periods. Return shape is preserved: a NULL _period_id
--      aggregates across the caller's visible periods; a hidden period
--      requested by a non-admin returns one row of zeros (not an empty set).
--
--   F9 admin_save_final_ranking / admin_reset_final_ranking
--      Concurrent saves could interleave (last write wins). A
--      pg_advisory_xact_lock keyed on the period serializes save/reset; the
--      expected count is re-read AFTER the lock and the INSERT row count is
--      verified against it. Bodies otherwise mirror the originals (same
--      validation errors, same audit-log shape). Signatures unchanged (plain
--      CREATE OR REPLACE); existing grants survive.
--
-- NOT CHANGED: RLS policies; the votes DELETE grant and votes_admin_delete
-- policy (tests pin both); main-ballot submit RPC; historical migrations;
-- publication semantics (M5 fix is UI-side: declareWinner now sets
-- results_visible alongside results_published using the existing flags).
--
-- DEPLOYMENT: applies on Supabase (Postgres 15+) and in the PGlite test
-- harness (PG 18). Idempotent; no data backfill; contains no secrets.

-- ============================================================================
-- H1 - audited period reset
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_votes(
  _period_id uuid,
  _reason text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_deleted int;
  v_rankings int;
BEGIN
  IF v_admin IS NULL
     OR NOT private.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'admin_reset_votes: voting period is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.voting_periods vp WHERE vp.id = _period_id
  ) THEN
    RAISE EXCEPTION 'admin_reset_votes: voting period does not exist';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('reset_votes:' || _period_id::text, 0)
  );

  DELETE FROM public.final_rankings
   WHERE voting_period_id = _period_id;
  GET DIAGNOSTICS v_rankings = ROW_COUNT;

  DELETE FROM public.votes
   WHERE voting_period_id = _period_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.admin_audit_log (
    action, admin_user_id, target_user_id, voting_period_id, reason, details,
    records_affected
  )
  VALUES (
    'reset_votes',
    v_admin,
    NULL,
    _period_id,
    NULLIF(btrim(coalesce(_reason, '')), ''),
    jsonb_build_object(
      'votes_deleted', v_deleted,
      'final_rankings_cleared', v_rankings,
      'restored_calculated_order', true
    ),
    v_deleted
  );

  RETURN v_deleted;
END $$;

REVOKE ALL ON FUNCTION public.admin_reset_votes(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_votes(uuid, text) TO authenticated;

-- ============================================================================
-- M2 - inspect removed ballots
-- ============================================================================

-- A single-function signature change: DROP + CREATE (a DEFAULT-arg overload
-- would make 2-arg calls ambiguous for PostgREST and psql).
DROP FUNCTION IF EXISTS public.admin_get_ballot(uuid, uuid);

CREATE OR REPLACE FUNCTION public.admin_get_ballot(
  _period_id uuid,
  _voter_id uuid,
  _include_removed boolean DEFAULT false
)
RETURNS TABLE (
  rank_position int,
  player_id uuid,
  full_name text,
  nickname text,
  player_position public.player_position,
  jersey_number int,
  profile_image text,
  points int,
  total_points int,
  removed_at timestamptz,
  removal_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _period_id IS NULL OR _voter_id IS NULL THEN
    RAISE EXCEPTION 'admin_get_ballot: voting period and voter are required';
  END IF;

  RETURN QUERY
  SELECT
    v.rank_position,
    v.ranked_player_id,
    p.full_name,
    p.nickname,
    p."position",
    p.jersey_number,
    p.profile_image,
    v.points,
    (
      SELECT coalesce(sum(v2.points), 0)::int
        FROM public.votes v2
       WHERE v2.voter_id = _voter_id
         AND v2.voting_period_id = _period_id
         AND v2.removed_at IS NULL
    ),
    v.removed_at,
    v.removal_reason
  FROM public.votes v
  LEFT JOIN public.profiles p ON p.id = v.ranked_player_id
  WHERE v.voter_id = _voter_id
    AND v.voting_period_id = _period_id
    AND (coalesce(_include_removed, false) OR v.removed_at IS NULL)
  ORDER BY v.rank_position;
END $$;

REVOKE ALL ON FUNCTION public.admin_get_ballot(uuid, uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ballot(uuid, uuid, boolean)
  TO authenticated;

-- ============================================================================
-- M4 - analytics honors the approved final order
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_period_analytics()
RETURNS TABLE (
  id uuid,
  full_name text,
  nickname text,
  "position" public.player_position,
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
  WITH calc AS (
    SELECT
      r.*,
      ROW_NUMBER() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
      ) AS calc_row
    FROM public.player_results_by_period r
    JOIN public.voting_periods vp ON vp.id = r.voting_period_id
    WHERE vp.is_active = true
      AND (
        private.has_role(auth.uid(), 'admin'::public.app_role)
        OR vp.results_visible = true
      )
  )
  SELECT
    c.id,
    c.full_name,
    c.nickname,
    c."position",
    c.jersey_number,
    c.profile_image,
    c.total_points,
    c.first_place_votes,
    c.total_rankings
  FROM calc c
  LEFT JOIN public.final_rankings fr
    ON fr.voting_period_id = c.voting_period_id
   AND fr.player_id = c.id
  ORDER BY
    COALESCE(
      CASE WHEN c.total_points > 0 THEN fr.final_position END,
      1000000 + c.calc_row
    ),
    c.calc_row;
$$;

REVOKE ALL ON FUNCTION public.get_active_period_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_period_analytics() TO authenticated;

-- ============================================================================
-- F8 - vote stats respect results_visible for non-admins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_period_vote_stats(
  _period_id uuid DEFAULT NULL
)
RETURNS TABLE (vote_count int, voter_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    count(*)::int AS vote_count,
    count(DISTINCT v.voter_id)::int AS voter_count
  FROM public.votes v
  JOIN public.voting_periods vp ON vp.id = v.voting_period_id
  WHERE v.removed_at IS NULL
    AND (_period_id IS NULL OR v.voting_period_id = _period_id)
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR vp.results_visible = true
    );
$$;

REVOKE ALL ON FUNCTION public.get_period_vote_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_vote_stats(uuid) TO authenticated;

-- ============================================================================
-- F9 - serialize final-ranking writes per period
--    Bodies mirror 20261030120000; only the advisory lock, the post-lock
--    recount, and the INSERT row-count guard are new.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_save_final_ranking(
  _period_id uuid,
  _player_ids uuid[]
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_expected int;
  v_given int;
  v_distinct int;
  v_saved int;
BEGIN
  IF v_admin IS NULL
     OR NOT private.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'admin_save_final_ranking: voting period is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.voting_periods vp WHERE vp.id = _period_id
  ) THEN
    RAISE EXCEPTION 'admin_save_final_ranking: voting period does not exist';
  END IF;

  -- Serialize with any concurrent save/reset for the same edition; the
  -- expected count is re-read after the lock takes effect.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('final_ranking:' || _period_id::text, 0)
  );

  -- The order must cover exactly the ranked set of this edition: every player
  -- with at least one counted point, once each.
  SELECT count(*) INTO v_expected
    FROM public.player_results_by_period r
   WHERE r.voting_period_id = _period_id
     AND r.total_points > 0;

  IF v_expected = 0 THEN
    RAISE EXCEPTION 'admin_save_final_ranking: no ranked players in this period';
  END IF;

  v_given := coalesce(array_length(_player_ids, 1), 0);
  SELECT count(DISTINCT x) INTO v_distinct FROM unnest(_player_ids) AS x;

  IF v_given <> v_expected OR v_distinct <> v_expected THEN
    RAISE EXCEPTION
      'admin_save_final_ranking: expected exactly % distinct ranked players, got % entries',
      v_expected, v_given;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(_player_ids) AS t(pid)
    WHERE t.pid IS NULL
       OR NOT EXISTS (
         SELECT 1
           FROM public.player_results_by_period r
          WHERE r.voting_period_id = _period_id
            AND r.id = t.pid
            AND r.total_points > 0
       )
  ) THEN
    RAISE EXCEPTION
      'admin_save_final_ranking: the ranking contains an unknown or unranked player';
  END IF;

  -- Replace, never merge: one atomic save per edition.
  DELETE FROM public.final_rankings
   WHERE voting_period_id = _period_id;

  INSERT INTO public.final_rankings (
    voting_period_id, player_id, final_position, calculated_position,
    approved_by, approved_at
  )
  SELECT
    _period_id,
    t.pid,
    t.ord::int,
    c.calc_row,
    v_admin,
    now()
  FROM unnest(_player_ids) WITH ORDINALITY AS t(pid, ord)
  JOIN (
    SELECT
      r.id AS pid,
      (ROW_NUMBER() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
      ))::int AS calc_row
    FROM public.player_results_by_period r
    WHERE r.voting_period_id = _period_id
      AND r.total_points > 0
  ) c ON c.pid = t.pid;
  GET DIAGNOSTICS v_saved = ROW_COUNT;

  IF v_saved <> v_expected THEN
    RAISE EXCEPTION
      'admin_save_final_ranking: wrote % final_ranking rows, expected %',
      v_saved, v_expected;
  END IF;

  INSERT INTO public.admin_audit_log (
    action, admin_user_id, target_user_id, voting_period_id, reason, details,
    records_affected
  )
  VALUES (
    'save_final_ranking',
    v_admin,
    NULL,
    _period_id,
    NULL,
    jsonb_build_object('final_positions', to_jsonb(_player_ids)),
    v_saved
  );

  RETURN v_saved;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reset_final_ranking(_period_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_admin IS NULL
     OR NOT private.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'admin_reset_final_ranking: voting period is required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('final_ranking:' || _period_id::text, 0)
  );

  DELETE FROM public.final_rankings
   WHERE voting_period_id = _period_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    INSERT INTO public.admin_audit_log (
      action, admin_user_id, target_user_id, voting_period_id, reason, details,
      records_affected
    )
    VALUES (
      'reset_final_ranking',
      v_admin,
      NULL,
      _period_id,
      NULL,
      jsonb_build_object('restored_calculated_order', true),
      v_deleted
    );
  END IF;

  RETURN v_deleted;
END $$;
