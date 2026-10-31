-- Migration: admin vote auditing, fraudulent-voter removal and manual final
-- ranking control (the "Vote Audit" and "Final Ranking Control" sections of the
-- admin dashboard). Forward-only, idempotent, and safe to re-run.
--
-- SECURITY / DATA-SAFETY INTENT
--   This migration deliberately separates three things that must never be
--   conflated:
--     1. the ORIGINAL ballot rows (public.votes) — immutable in content;
--     2. AGGREGATE points (the calculated ranking) — derived from (1);
--     3. the FINAL published order — a presentation override stored in its own
--        table and never written into (1) or (2).
--
--   1. AUDIT (read-only)
--      admin_list_voters / admin_get_ballot / admin_preview_voter_removal /
--      admin_get_ranking_preview expose ballots and the calculated ranking to
--      administrators only. They are SECURITY DEFINER functions guarded by
--      private.has_role(auth.uid(), 'admin'), so an ordinary authenticated user
--      gets "not authorized: admin only" instead of another voter's ballot.
--      Nothing here writes to public.votes.
--
--   2. REMOVAL (soft, reversible, transactional)
--      A confirmed fraudulent ballot is soft-deleted by admin_remove_voter_ballot:
--      the rows stay in public.votes but get removed_at / removed_by /
--      removal_reason, and every aggregate (the two result views plus the
--      result/analytics/stats RPCs) filters removed_at IS NULL. Consequences:
--        * the removed votes stop contributing to player points immediately;
--        * other voters' ballots, player profiles, the voter's Supabase auth
--          account and every special-award ballot are untouched (the function
--          only ever UPDATEs public.votes for one (voter, period) pair);
--        * the operation is reversible with admin_restore_voter_ballot;
--        * the whole body runs as a single statement, so either every step
--          (update + audit row) commits or none of it does;
--        * an admin_audit_log row records admin, target, edition, reason,
--          timestamp, removed row count and a JSON snapshot of the ballot so
--          the evidence survives without keeping a second copy of personal
--          data.
--      The voter still has rows in public.votes, so submit_main_ballot keeps
--      rejecting them with "ballot already submitted": a removed participant
--      cannot re-enter the same edition, and has_voted_in_period stays true.
--
--   3. FINAL RANKING (separate table, admin only)
--      final_rankings stores the manually approved order per edition
--      (voting_period_id, player_id, final_position, calculated_position,
--      approved_by, approved_at). admin_save_final_ranking replaces the whole
--      order in one transaction after validating it against the calculated
--      ranking; admin_reset_final_ranking deletes it and the edition falls
--      back to the points-based order. get_period_results /
--      get_player_period_rank read the override only as an ORDER BY — they
--      never rewrite points, ballots or vote history, and the point columns
--      they return are the untouched aggregate totals.
--      Writes are impossible for ordinary users: final_rankings carries no
--      INSERT/UPDATE/DELETE grant for anon/authenticated and its RLS policy is
--      admin-only, so the only writers are the SECURITY DEFINER RPCs above.
--
--   Results visibility is NOT re-invented here: publication keeps using the
--   existing voting_periods.results_visible / results_published flags and the
--   existing is_period_results_visible() gate. Saving a manual order therefore
--   only changes the order of results that are already visible.
--
-- NOT CHANGED
--   * Special awards (special_awards / special_award_candidates / special_votes
--     and every get_special_award_* / submit_special_ballot RPC): untouched.
--   * submit_main_ballot, ballot_points_for_rank, the deferred completeness
--     trigger, the votes privilege cutover and votes_insert_own: untouched.
--   * Historical ballots: no row is inserted, updated or deleted by this file
--     (the UPDATE/DELETE statements live inside SECURITY DEFINER functions that
--     only run when an administrator calls them).
--   * voting_periods state: no period is opened, closed, published or re-dated.
--   * public.profiles and public.user_roles: untouched.
--
-- DEPLOYMENT (out-of-band, same channel as 20261023120000 / 20261025120000 /
--   20261027120000): review, then apply in the Supabase SQL editor, then deploy
--   the admin UI that calls the new RPCs. Applying it first is safe — the new
--   columns default to NULL, so every aggregate keeps returning exactly what it
--   returned before until an administrator actually removes a ballot.

-- ===========================================================================
-- 1. Moderation columns: soft deletion of a single voter's ballot.
--    NULL removed_at = the vote still counts. No default is given on purpose:
--    existing rows and future ballots stay "active" without a write.
-- ===========================================================================
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removal_reason text;

-- ===========================================================================
-- 2. Administrative audit log.
--    Append-only from the application's point of view: there is no INSERT or
--    UPDATE grant for anon/authenticated — only the SECURITY DEFINER moderation
--    RPCs write here (the table owner bypasses RLS, same as every other admin
--    RPC in this schema).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  voting_period_id uuid REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  records_affected int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_period
  ON public.admin_audit_log (voting_period_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON public.admin_audit_log (target_user_id, created_at DESC);

-- ===========================================================================
-- 3. Manually approved final ranking — one row per (edition, player).
--    Deliberately a separate table: touching it can never change a vote, a
--    ballot or an aggregate point total.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.final_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_period_id uuid NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_position int NOT NULL CHECK (final_position >= 1),
  calculated_position int,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voting_period_id, player_id),
  UNIQUE (voting_period_id, final_position)
);

CREATE INDEX IF NOT EXISTS idx_final_rankings_period
  ON public.final_rankings (voting_period_id, final_position);

-- ===========================================================================
-- 4. Aggregates must ignore soft-deleted ballots.
--    Both views keep their exact column list and types (CREATE OR REPLACE VIEW
--    only changes the join predicate), so every caller keeps working.
-- ===========================================================================
CREATE OR REPLACE VIEW public.player_results
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.full_name,
  p.nickname,
  p.position,
  p.jersey_number,
  p.profile_image,
  COALESCE(SUM(v.points), 0)::INT AS total_points,
  COUNT(v.id) FILTER (WHERE v.rank_position = 1)::INT AS first_place_votes,
  COUNT(v.id)::INT AS total_rankings
FROM public.profiles p
LEFT JOIN public.votes v
  ON v.ranked_player_id = p.id
 AND v.removed_at IS NULL
GROUP BY p.id;

CREATE OR REPLACE VIEW public.player_results_by_period
WITH (security_invoker = on)
AS
SELECT
  vp.id AS voting_period_id,
  vp.year,
  p.id,
  p.full_name,
  p.nickname,
  p.position,
  p.jersey_number,
  p.profile_image,
  COALESCE(SUM(v.points), 0)::INT AS total_points,
  COUNT(v.id) FILTER (WHERE v.rank_position = 1)::INT AS first_place_votes,
  COUNT(v.id)::INT AS total_rankings
FROM public.voting_periods vp
CROSS JOIN public.profiles p
LEFT JOIN public.votes v
  ON v.ranked_player_id = p.id
 AND v.voting_period_id = vp.id
 AND v.removed_at IS NULL
GROUP BY vp.id, vp.year, p.id;

-- Aggregate counters (analytics dashboards, admin stat cards).
CREATE OR REPLACE FUNCTION public.get_period_vote_stats(_period_id uuid DEFAULT NULL)
RETURNS TABLE(vote_count integer, voter_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COUNT(*)::int AS vote_count,
    COUNT(DISTINCT voter_id)::int AS voter_count
  FROM public.votes
  WHERE removed_at IS NULL
    AND (_period_id IS NULL OR voting_period_id = _period_id)
$$;

-- ===========================================================================
-- 5. The published order: calculated ranking by default, manually approved
--    order when one has been saved for the edition.
--    Column list, types and the visibility gate are unchanged — only the ORDER
--    BY and the (already implied) "not removed" filter move. Points are read
--    straight from the aggregate view and are never rewritten.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_period_results(_period_id uuid)
RETURNS TABLE (
  voting_period_id uuid,
  year int,
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
      r.voting_period_id,
      r.year,
      r.id,
      r.full_name,
      r.nickname,
      r."position" AS pos,
      r.jersey_number,
      r.profile_image,
      r.total_points,
      r.first_place_votes,
      r.total_rankings,
      ROW_NUMBER() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
      ) AS calc_row
    FROM public.player_results_by_period r
    WHERE r.voting_period_id = _period_id
  )
  SELECT
    c.voting_period_id,
    c.year,
    c.id,
    c.full_name,
    c.nickname,
    c.pos,
    c.jersey_number,
    c.profile_image,
    c.total_points,
    c.first_place_votes,
    c.total_rankings
  FROM calc c
  LEFT JOIN public.final_rankings fr
    ON fr.voting_period_id = _period_id
   AND fr.player_id = c.id
  WHERE private.has_role(auth.uid(), 'admin'::public.app_role)
     OR EXISTS (
       SELECT 1 FROM public.voting_periods vp
        WHERE vp.id = _period_id
          AND vp.results_visible = true
     )
  -- A stored position wins; players outside the stored set (or a stale row
  -- left behind after a removal dropped them to 0 points) fall back to the
  -- calculated order behind every stored player.
  ORDER BY
    COALESCE(
      CASE WHEN c.total_points > 0 THEN fr.final_position END,
      1000000 + c.calc_row
    ),
    c.calc_row;
$$;

CREATE OR REPLACE FUNCTION public.get_player_period_rank(_player_id uuid, _period_id uuid)
RETURNS TABLE (
  rank int,
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
      r.id,
      r.total_points,
      r.first_place_votes,
      r.total_rankings,
      ROW_NUMBER() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
      ) AS calc_row
    FROM public.player_results_by_period r
    WHERE r.voting_period_id = _period_id
  )
  SELECT
    COALESCE(
      CASE WHEN c.total_points > 0 THEN fr.final_position END,
      1000000 + c.calc_row
    )::int AS final_rank,
    c.total_points,
    c.first_place_votes,
    c.total_rankings
  FROM calc c
  LEFT JOIN public.final_rankings fr
    ON fr.voting_period_id = _period_id
   AND fr.player_id = c.id
  WHERE c.id = _player_id
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.voting_periods vp
         WHERE vp.id = _period_id
           AND vp.results_visible = true
      )
    )
  LIMIT 1;
$$;

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
  SELECT
    r.id,
    r.full_name,
    r.nickname,
    r."position",
    r.jersey_number,
    r.profile_image,
    r.total_points,
    r.first_place_votes,
    r.total_rankings
  FROM public.player_results_by_period r
  JOIN public.voting_periods vp ON vp.id = r.voting_period_id
  WHERE vp.is_active = true
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR vp.results_visible = true
    )
  ORDER BY r.total_points DESC, r.first_place_votes DESC;
$$;

-- ===========================================================================
-- 6. Vote audit — read-only RPCs, administrator only.
--    Every function raises for a non-admin instead of returning an empty set,
--    so an ordinary user can never probe who voted for whom.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_list_voters(_period_id uuid)
RETURNS TABLE (
  voter_id uuid,
  display_name text,
  email text,
  submitted_at timestamptz,
  vote_count int,
  total_points int,
  ballot_rows int,
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
  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'admin_list_voters: voting period is required';
  END IF;

  RETURN QUERY
  WITH ballots AS (
    SELECT
      v.voter_id AS vid,
      max(v.created_at) AS submitted,
      count(*) FILTER (WHERE v.removed_at IS NULL)::int AS active_rows,
      coalesce(sum(v.points) FILTER (WHERE v.removed_at IS NULL), 0)::int
        AS active_points,
      count(*)::int AS total_rows,
      max(v.removed_at) AS removed,
      max(v.removal_reason) AS removed_reason
    FROM public.votes v
    WHERE v.voting_period_id = _period_id
    GROUP BY v.voter_id
  )
  SELECT
    b.vid,
    coalesce(nullif(p.full_name, ''), nullif(p.nickname, ''), 'Unknown voter'),
    nullif(p.email, ''),
    b.submitted,
    b.active_rows,
    b.active_points,
    b.total_rows,
    b.removed,
    b.removed_reason
  FROM ballots b
  LEFT JOIN public.profiles p ON p.id = b.vid
  ORDER BY (b.removed IS NULL) DESC,
           coalesce(nullif(p.full_name, ''), nullif(p.nickname, ''), '') ASC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_ballot(_period_id uuid, _voter_id uuid)
RETURNS TABLE (
  rank_position int,
  player_id uuid,
  full_name text,
  nickname text,
  player_position public.player_position,
  jersey_number int,
  profile_image text,
  points int,
  total_points int
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
    )
  FROM public.votes v
  LEFT JOIN public.profiles p ON p.id = v.ranked_player_id
  WHERE v.voter_id = _voter_id
    AND v.voting_period_id = _period_id
    AND v.removed_at IS NULL
  ORDER BY v.rank_position;
END $$;

-- Preview of what a removal would touch, shown before the confirmation dialog.
-- special_vote_rows is reported for reassurance only: special-award ballots are
-- deliberately never modified by admin_remove_voter_ballot.
CREATE OR REPLACE FUNCTION public.admin_preview_voter_removal(
  _period_id uuid,
  _voter_id uuid
)
RETURNS TABLE (
  vote_rows int,
  total_points int,
  special_vote_rows int,
  already_removed boolean
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

  RETURN QUERY
  SELECT
    (
      SELECT count(*)::int FROM public.votes v
       WHERE v.voter_id = _voter_id
         AND v.voting_period_id = _period_id
         AND v.removed_at IS NULL
    ),
    (
      SELECT coalesce(sum(v.points), 0)::int FROM public.votes v
       WHERE v.voter_id = _voter_id
         AND v.voting_period_id = _period_id
         AND v.removed_at IS NULL
    ),
    (
      SELECT count(*)::int
        FROM public.special_votes sv
        JOIN public.special_awards sa ON sa.id = sv.award_id
       WHERE sv.voter_id = _voter_id
         AND sa.voting_period_id = _period_id
    ),
    coalesce(
      (
        SELECT bool_or(v.removed_at IS NOT NULL) FROM public.votes v
         WHERE v.voter_id = _voter_id
           AND v.voting_period_id = _period_id
      ),
      false
    );
END $$;

-- Calculated ranking (with tie information) next to the stored final order.
CREATE OR REPLACE FUNCTION public.admin_get_ranking_preview(_period_id uuid)
RETURNS TABLE (
  player_id uuid,
  full_name text,
  nickname text,
  player_position public.player_position,
  jersey_number int,
  profile_image text,
  total_points int,
  first_place_votes int,
  total_rankings int,
  calculated_rank int,
  calculated_row int,
  final_position int,
  approved_at timestamptz
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
  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'admin_get_ranking_preview: voting period is required';
  END IF;

  RETURN QUERY
  WITH calc AS (
    SELECT
      r.id AS pid,
      r.full_name AS fname,
      r.nickname AS nick,
      r."position" AS pos,
      r.jersey_number AS jersey,
      r.profile_image AS image,
      r.total_points AS pts,
      r.first_place_votes AS f1,
      r.total_rankings AS tr,
      (RANK() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC
      ))::int AS calc_rank,
      (ROW_NUMBER() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
      ))::int AS calc_row
    FROM public.player_results_by_period r
    WHERE r.voting_period_id = _period_id
      AND r.total_points > 0
  )
  SELECT
    c.pid,
    c.fname,
    c.nick,
    c.pos,
    c.jersey,
    c.image,
    c.pts,
    c.f1,
    c.tr,
    c.calc_rank,
    c.calc_row,
    f.final_position,
    f.approved_at
  FROM calc c
  LEFT JOIN public.final_rankings f
    ON f.voting_period_id = _period_id
   AND f.player_id = c.pid
  ORDER BY COALESCE(f.final_position, 1000000 + c.calc_row), c.calc_row;
END $$;

-- ===========================================================================
-- 7. Removal of a confirmed fraudulent ballot.
--    Single statement = single transaction: the UPDATE and the audit row commit
--    together or not at all. Only public.votes rows of ONE (voter, period) are
--    touched; auth.users, public.profiles, public.votes of other voters and
--    every special_* table are never written to.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_remove_voter_ballot(
  _period_id uuid,
  _voter_id uuid,
  _reason text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_reason text := coalesce(btrim(_reason), '');
  v_active int;
  v_removed int;
  v_total int;
  v_snapshot jsonb;
BEGIN
  IF v_admin IS NULL
     OR NOT private.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _period_id IS NULL OR _voter_id IS NULL THEN
    RAISE EXCEPTION 'admin_remove_voter_ballot: voting period and voter are required';
  END IF;
  IF v_reason = '' THEN
    RAISE EXCEPTION 'admin_remove_voter_ballot: a reason is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.voting_periods vp WHERE vp.id = _period_id
  ) THEN
    RAISE EXCEPTION 'admin_remove_voter_ballot: voting period does not exist';
  END IF;
  IF _voter_id = v_admin THEN
    RAISE EXCEPTION 'admin_remove_voter_ballot: you cannot remove your own ballot';
  END IF;

  -- Serialise with any other moderation of the same ballot.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'remove_ballot:' || _voter_id::text || ':' || _period_id::text, 0
    )
  );

  SELECT count(*) INTO v_active
    FROM public.votes v
   WHERE v.voter_id = _voter_id
     AND v.voting_period_id = _period_id
     AND v.removed_at IS NULL;

  IF v_active = 0 THEN
    RAISE EXCEPTION 'admin_remove_voter_ballot: no active ballot found for this voter and period';
  END IF;

  -- Evidence for the audit row: ranks, players and points, captured before the
  -- rows are marked removed (the rows themselves are kept, reversible).
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank_position', v.rank_position,
        'player_id', v.ranked_player_id,
        'points', v.points
      )
      ORDER BY v.rank_position
    ),
    '[]'::jsonb
  )
  INTO v_snapshot
  FROM public.votes v
  WHERE v.voter_id = _voter_id
    AND v.voting_period_id = _period_id
    AND v.removed_at IS NULL;

  SELECT coalesce(sum(v.points), 0)::int INTO v_total
    FROM public.votes v
   WHERE v.voter_id = _voter_id
     AND v.voting_period_id = _period_id
     AND v.removed_at IS NULL;

  UPDATE public.votes
     SET removed_at = now(),
         removed_by = v_admin,
         removal_reason = v_reason
   WHERE voter_id = _voter_id
     AND voting_period_id = _period_id
     AND removed_at IS NULL;
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  INSERT INTO public.admin_audit_log (
    action, admin_user_id, target_user_id, voting_period_id, reason, details,
    records_affected
  )
  VALUES (
    'remove_voter_ballot',
    v_admin,
    _voter_id,
    _period_id,
    v_reason,
    jsonb_build_object(
      'ballot_snapshot', v_snapshot,
      'points_removed', v_total
    ),
    v_removed
  );

  RETURN v_removed;
END $$;

-- Reversal of a removal: the rows become active again and every aggregate
-- picks them up on the next read. Refuses to run if an active ballot already
-- exists (the UNIQUE constraints would reject it anyway).
CREATE OR REPLACE FUNCTION public.admin_restore_voter_ballot(
  _period_id uuid,
  _voter_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_active int;
  v_restored int;
BEGIN
  IF v_admin IS NULL
     OR NOT private.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;
  IF _period_id IS NULL OR _voter_id IS NULL THEN
    RAISE EXCEPTION 'admin_restore_voter_ballot: voting period and voter are required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'remove_ballot:' || _voter_id::text || ':' || _period_id::text, 0
    )
  );

  SELECT count(*) INTO v_active
    FROM public.votes v
   WHERE v.voter_id = _voter_id
     AND v.voting_period_id = _period_id
     AND v.removed_at IS NULL;

  IF v_active > 0 THEN
    RAISE EXCEPTION 'admin_restore_voter_ballot: this voter already has an active ballot';
  END IF;

  UPDATE public.votes
     SET removed_at = NULL,
         removed_by = NULL,
         removal_reason = NULL
   WHERE voter_id = _voter_id
     AND voting_period_id = _period_id
     AND removed_at IS NOT NULL;
  GET DIAGNOSTICS v_restored = ROW_COUNT;

  IF v_restored = 0 THEN
    RAISE EXCEPTION 'admin_restore_voter_ballot: no removed ballot found for this voter and period';
  END IF;

  INSERT INTO public.admin_audit_log (
    action, admin_user_id, target_user_id, voting_period_id, reason, details,
    records_affected
  )
  VALUES (
    'restore_voter_ballot',
    v_admin,
    _voter_id,
    _period_id,
    NULL,
    jsonb_build_object('ballot_restored', true),
    v_restored
  );

  RETURN v_restored;
END $$;

-- ===========================================================================
-- 8. Manual final ranking control.
--    save = validate + replace the whole order atomically;
--    reset = delete it, which restores the calculated (points-based) order.
--    Neither function touches public.votes or any aggregate.
-- ===========================================================================
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

-- ===========================================================================
-- 9. Privileges and row level security.
--    Reads: admin-only through RLS (the table grants exist so PostgREST can
--    resolve the relation; the policy is what filters it).
--    Writes: revoked from the API roles entirely — only the SECURITY DEFINER
--    functions above can insert/update/delete.
-- ===========================================================================
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_rankings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.admin_audit_log FROM authenticated;
GRANT SELECT ON TABLE public.admin_audit_log TO authenticated;
GRANT ALL ON TABLE public.admin_audit_log TO service_role;

DROP POLICY IF EXISTS admin_audit_log_select_admin ON public.admin_audit_log;
CREATE POLICY admin_audit_log_select_admin ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON TABLE public.final_rankings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.final_rankings FROM authenticated;
GRANT SELECT ON TABLE public.final_rankings TO authenticated;
GRANT ALL ON TABLE public.final_rankings TO service_role;

DROP POLICY IF EXISTS final_rankings_select_admin ON public.final_rankings;
CREATE POLICY final_rankings_select_admin ON public.final_rankings
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Moderation columns must stay unwritable for API roles: an ordinary user can
-- neither mark their own ballot removed nor resurrect someone else's.
REVOKE UPDATE, INSERT, TRUNCATE ON TABLE public.votes FROM anon;

-- The audit/RPC surface: EXECUTE for signed-in users only (the functions then
-- re-check the admin role internally), never for anon.
REVOKE ALL ON FUNCTION public.admin_list_voters(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_voters(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_ballot(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ballot(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_preview_voter_removal(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_voter_removal(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_ranking_preview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ranking_preview(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_voter_ballot(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_voter_ballot(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_restore_voter_ballot(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_voter_ballot(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_save_final_ranking(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_final_ranking(uuid, uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_reset_final_ranking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_final_ranking(uuid) TO authenticated;

-- The rewritten aggregates keep their original grants (they were only ever
-- reachable through SECURITY DEFINER RPCs) — re-stated here so the intent is
-- explicit and re-running the file cannot widen anything.
REVOKE ALL ON FUNCTION public.get_period_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_results(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_player_period_rank(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_period_rank(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_active_period_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_period_analytics() TO authenticated;
REVOKE ALL ON FUNCTION public.get_period_vote_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_vote_stats(uuid) TO authenticated;

-- ===========================================================================
-- 10. POST-APPLY VERIFICATION (review only — never executed from this repo
--     against production):
--       * has_table_privilege('authenticated','public.votes','UPDATE') = false
--       * has_table_privilege('authenticated','public.final_rankings','INSERT') = false
--       * has_table_privilege('authenticated','public.final_rankings','UPDATE') = false
--       * has_table_privilege('authenticated','public.admin_audit_log','INSERT') = false
--       * has_function_privilege('anon','public.admin_list_voters(uuid)','EXECUTE') = false
--       * has_function_privilege('authenticated','public.admin_remove_voter_ballot(uuid,uuid,text)','EXECUTE') = true
--       * public.votes row count unchanged; removed_at IS NULL on every row
--       * public.final_rankings and public.admin_audit_log empty
--       * public.voting_periods: no column value changed
--       * get_period_results order for every period unchanged (no final
--         ranking saved yet)
--     Then smoke-test on a scratch period: list voters, open a ballot, remove
--     and restore a test ballot, save/reset a final ranking. Never touch 2026
--     production ballots.
-- ===========================================================================
