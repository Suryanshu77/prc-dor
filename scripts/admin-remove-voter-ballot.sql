-- ============================================================================
-- PRC D'OR — MANUAL REMOVAL OF A FRAUDULENT BALLOT (GUARDED)
-- ============================================================================
-- !! READ THE WHOLE FILE BEFORE RUNNING ANYTHING !!
--
-- Preferred path: use the admin dashboard (Admin → Vote Audit → select the
-- voter → Remove ballot). That calls public.admin_remove_voter_ballot(),
-- which applies exactly the same guards, soft-deletes the same rows, writes
-- the same audit-log entry and recalculates nothing. This script exists only
-- for the case where the dashboard is unavailable (e.g. the RPC is blocked or
-- you need to act during an incident).
--
-- WHAT IT DOES
--   Soft-deletes ONE voter's main-ballot rows for ONE edition:
--     UPDATE public.votes
--        SET removed_at = now(), removed_by = <admin>, removal_reason = <why>
--      WHERE voting_period_id = <edition> AND voter_id = <voter>;
--   It never hard-deletes, never rewrites points, never touches
--   public.special_votes, and it records the action in public.admin_audit_log.
--   Everything lives inside one transaction: if any guard fails, the whole
--   thing rolls back and NOTHING is changed.
--
-- WHAT IT DOES NOT DO
--   * It does not re-run any aggregate — public.player_results*,
--     get_period_results() and get_period_vote_stats() filter removed_at
--     themselves, so results update automatically and correctly.
--   * It does not change public.final_rankings — if you had already saved a
--     manual final order, review it again afterwards.
--   * It does not touch special-award votes (kopa / yashin / gerd-muller /
--     socrates). Those are a separate system.
--
-- REVERSING A MISTAKE
--   Nothing is destroyed, so a removal can be undone:
--     UPDATE public.votes
--        SET removed_at = NULL, removed_by = NULL, removal_reason = NULL
--      WHERE voting_period_id = <edition> AND voter_id = <voter>;
--   ...or use the Restore button in the dashboard, which writes its own
--   audit-log row so the history stays honest.
--
-- SAFETY PROPERTIES ENFORCED BELOW
--   1. You must be an authenticated superuser / service role AND the SQL must
--      run in a transaction that is rolled back unless every check passes.
--   2. The voter must exist in public.profiles.
--   3. The edition must exist.
--   4. The voter must actually have active ballot rows in that edition.
--   5. You may never remove your own ballot (same rule as the RPC).
--   6. The removal reason must be non-empty (audit quality).
--   7. Every removed row is counted and reported before COMMIT.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- STEP 0 — PARAMETERS. Edit these three values, nothing else.
-- ---------------------------------------------------------------------------
\set period_id  'REPLACE-WITH-EDITION-UUID'
\set voter_id   'REPLACE-WITH-VOTER-PROFILE-UUID'
\set reason     'REPLACE-WITH-A-ONE-LINE-REASON'
\set admin_id   'REPLACE-WITH-YOUR-PROFILE-UUID'

-- If your SQL client does not support \set (Supabase SQL editor does not),
-- paste the four literals directly into every occurrence of :period_id,
-- :voter_id, :reason and :admin_id further down instead. The script refuses
-- to run while the placeholders are still present (guard G0 below).


-- ---------------------------------------------------------------------------
-- STEP 1 — PREFLIGHT (read-only). Review every result before continuing.
-- ---------------------------------------------------------------------------

-- G0: the placeholders were actually replaced
SELECT
  :'period_id' <> 'REPLACE-WITH-EDITION-UUID'     AS period_id_filled,
  :'voter_id'  <> 'REPLACE-WITH-VOTER-PROFILE-UUID' AS voter_id_filled,
  :'reason'    <> 'REPLACE-WITH-A-ONE-LINE-REASON'  AS reason_filled,
  :'admin_id'  <> 'REPLACE-WITH-YOUR-PROFILE-UUID'  AS admin_id_filled;
-- All four columns must read `true`. If any is `false`, stop and fill them in.

-- Who you are about to remove, from which edition, and how many rows it is
SELECT
  vp.year                          AS edition,
  vp.title,
  vp.is_active                     AS voting_still_open,
  p.id                             AS voter_id,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(p.nickname, ''), 'Unknown') AS voter_name,
  p.email,
  count(*) FILTER (WHERE v.removed_at IS NULL)  AS rows_to_remove,
  COALESCE(sum(v.points) FILTER (WHERE v.removed_at IS NULL), 0)        AS points_that_will_stop_counting,
  count(*) FILTER (WHERE v.removed_at IS NOT NULL)                      AS rows_already_removed
FROM public.voting_periods vp
CROSS JOIN public.profiles p
LEFT JOIN public.votes v
       ON v.voting_period_id = vp.id
      AND v.voter_id = p.id
WHERE vp.id = :'period_id'
  AND p.id  = :'voter_id'
GROUP BY vp.year, vp.title, vp.is_active, p.id, p.full_name, p.nickname, p.email;

-- The exact ballot that will be deactivated (should be 10 rows)
SELECT
  v.rank_position,
  COALESCE(p.full_name, 'Unknown') AS player,
  v.points
FROM public.votes v
LEFT JOIN public.profiles p ON p.id = v.ranked_player_id
WHERE v.voting_period_id = :'period_id'
  AND v.voter_id = :'voter_id'
  AND v.removed_at IS NULL
ORDER BY v.rank_position;

-- Confirm you are not removing your own ballot (guard G5 rejects this later)
SELECT :'admin_id' = :'voter_id' AS this_is_your_own_ballot;
-- Must read `false`. If it reads `true`, you are about to remove yourself,
-- which the product forbids on purpose.

-- Nothing else about this voter will change: special-award ballots stay
SELECT
  sa.award_key,
  count(*) AS special_vote_rows_that_will_NOT_be_touched
FROM public.special_votes sv
JOIN public.special_awards sa ON sa.id = sv.award_id
WHERE sv.voter_id = :'voter_id'
GROUP BY sa.award_key
ORDER BY sa.award_key;


-- ---------------------------------------------------------------------------
-- STEP 2 — THE REMOVAL. Review the preflight output first, then run this.
--         If any guard raises, the transaction aborts and nothing is written.
-- ---------------------------------------------------------------------------

BEGIN;

DO $$
DECLARE
  v_period_id   uuid := :'period_id';
  v_voter_id    uuid := :'voter_id';
  v_reason      text := :'reason';
  v_admin_id    uuid := :'admin_id';
  v_expected    bigint;
  v_updated     bigint;
  v_profile_ok  boolean;
  v_period_ok   boolean;
  v_points      int;
  v_snapshot    jsonb;
BEGIN
  -- G0 — refuse the untouched placeholders
  IF v_period_id IS NULL OR v_period_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'guard G0: period_id placeholder was not replaced';
  END IF;
  IF v_voter_id IS NULL OR v_voter_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'guard G0: voter_id placeholder was not replaced';
  END IF;
  IF v_admin_id IS NULL OR v_admin_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'guard G0: admin_id placeholder was not replaced';
  END IF;
  IF v_reason IS NULL OR btrim(v_reason) = '' OR v_reason LIKE 'REPLACE-WITH-%' THEN
    RAISE EXCEPTION 'guard G6: removal reason is required';
  END IF;

  -- G6 — reason length sanity (keep audit rows readable)
  IF length(v_reason) > 500 THEN
    RAISE EXCEPTION 'guard G6: removal reason is too long (max 500 characters)';
  END IF;

  -- G2 — the voter exists
  SELECT true INTO v_profile_ok FROM public.profiles WHERE id = v_voter_id;
  IF COALESCE(v_profile_ok, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'guard G2: no profile with id %', v_voter_id;
  END IF;

  -- G3 — the edition exists
  SELECT true INTO v_period_ok FROM public.voting_periods WHERE id = v_period_id;
  IF COALESCE(v_period_ok, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'guard G3: no voting period with id %', v_period_id;
  END IF;

  -- G5 — you may not remove your own ballot (mirrors admin_remove_voter_ballot)
  IF v_admin_id = v_voter_id THEN
    RAISE EXCEPTION 'you cannot remove your own ballot';
  END IF;

  -- G7 — only an admin may run this (mirrors private.has_role check).
  --      The SQL editor connects as the postgres/service role, where auth.uid()
  --      is NULL, so the role-name check is the practical gate; when the script
  --      is ever executed as a normal authenticated user it must also satisfy
  --      private.has_role(admin).
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role', 'authenticator')
     AND NOT private.has_role(v_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  -- Serialise with any other moderation of the same ballot. The key matches
  -- admin_remove_voter_ballot, so a concurrent RPC cannot interleave between
  -- the count below and the UPDATE.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'remove_ballot:' || v_voter_id::text || ':' || v_period_id::text, 0
    )
  );

  -- G4 — the voter actually has an active ballot in this edition (recounted
  --      after the lock takes effect)
  SELECT count(*) INTO v_expected
    FROM public.votes
   WHERE voting_period_id = v_period_id
     AND voter_id = v_voter_id
     AND removed_at IS NULL;
  IF v_expected = 0 THEN
    RAISE EXCEPTION 'guard G4: voter % has no active ballot in edition %', v_voter_id, v_period_id;
  END IF;

  -- Evidence for the audit row: same shape as admin_remove_voter_ballot
  -- (ballot_snapshot + points_removed), captured before the rows are marked
  -- removed.
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
  WHERE v.voting_period_id = v_period_id
    AND v.voter_id = v_voter_id
    AND v.removed_at IS NULL;

  SELECT coalesce(sum(v.points), 0)::int INTO v_points
    FROM public.votes v
   WHERE v.voting_period_id = v_period_id
     AND v.voter_id = v_voter_id
     AND v.removed_at IS NULL;

  -- THE removal (soft delete — the rows stay in public.votes forever)
  UPDATE public.votes
     SET removed_at     = now(),
         removed_by     = v_admin_id,
         removal_reason = btrim(v_reason)
   WHERE voting_period_id = v_period_id
     AND voter_id = v_voter_id
     AND removed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Guard: the UPDATE must have touched exactly the rows counted under the
  -- lock; anything else means a concurrent writer slipped in.
  IF v_updated <> v_expected THEN
    RAISE EXCEPTION
      'guard: affected-row mismatch (counted % under the lock, updated %) — rolling back',
      v_expected, v_updated;
  END IF;

  -- The audit trail (append only; RLS already blocks non-admin writes).
  -- details mirrors admin_remove_voter_ballot (ballot_snapshot, points_removed)
  -- with the script source kept for provenance.
  INSERT INTO public.admin_audit_log (
    admin_user_id, action, target_user_id, voting_period_id, reason,
    records_affected, details
  ) VALUES (
    v_admin_id, 'remove_voter_ballot', v_voter_id, v_period_id, btrim(v_reason),
    v_updated,
    jsonb_build_object(
      'ballot_snapshot', v_snapshot,
      'points_removed', v_points,
      'source', 'scripts/admin-remove-voter-ballot.sql',
      'special_votes_untouched', true
    )
  );

  RAISE NOTICE 'removed % ballot rows for voter % in edition %',
    v_updated, v_voter_id, v_period_id;
END $$;

-- Guarded verification: only COMMIT if exactly the expected state was reached.
DO $$
DECLARE
  v_still_active integer;
BEGIN
  SELECT count(*) INTO v_still_active
    FROM public.votes
   WHERE voting_period_id = :'period_id'
     AND voter_id = :'voter_id'
     AND removed_at IS NULL;

  IF v_still_active <> 0 THEN
    RAISE EXCEPTION 'verification failed: % rows are still active — rolling back', v_still_active;
  END IF;
END $$;

COMMIT;


-- ---------------------------------------------------------------------------
-- STEP 3 — POST-CONDITIONS. Run after COMMIT to confirm what happened.
-- ---------------------------------------------------------------------------

-- The ballot is now inactive and annotated
SELECT
  v.rank_position,
  COALESCE(p.full_name, 'Unknown') AS player,
  v.points,
  v.removed_at,
  v.removed_by,
  v.removal_reason
FROM public.votes v
LEFT JOIN public.profiles p ON p.id = v.ranked_player_id
WHERE v.voting_period_id = :'period_id'
  AND v.voter_id = :'voter_id'
ORDER BY v.rank_position;

-- The audit row exists
SELECT
  created_at, action, reason, records_affected, details
FROM public.admin_audit_log
WHERE voting_period_id = :'period_id'
  AND target_user_id = :'voter_id'
ORDER BY created_at DESC
LIMIT 5;

-- The standing recalculated without this voter (points must have dropped)
SELECT
  ROW_NUMBER() OVER (ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id) AS position,
  r.full_name,
  r.total_points,
  r.first_place_votes
FROM public.player_results_by_period r
WHERE r.voting_period_id = :'period_id'
  AND r.total_points > 0
ORDER BY position
LIMIT 20;

-- Special-award ballots untouched
SELECT count(*) AS special_vote_rows_still_present
FROM public.special_votes
WHERE voter_id = :'voter_id';


-- ---------------------------------------------------------------------------
-- ROLLBACK (only if you ran STEP 2 and it failed part-way)
-- ---------------------------------------------------------------------------
-- Every statement in STEP 2 is inside BEGIN/COMMIT. If you saw an exception,
-- the transaction is still open — run:
--
--   ROLLBACK;
--
-- and nothing will have been written.

-- ---------------------------------------------------------------------------
-- UNDO (after a COMMIT you regret)
-- ---------------------------------------------------------------------------
-- UPDATE public.votes
--    SET removed_at = NULL, removed_by = NULL, removal_reason = NULL
--  WHERE voting_period_id = :'period_id'
--    AND voter_id = :'voter_id';
--
-- INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, voting_period_id, reason, records_affected)
--   SELECT :'admin_id', 'restore_voter_ballot', :'voter_id', :'period_id', 'undo of manual removal', count(*)
--     FROM public.votes
--    WHERE voting_period_id = :'period_id' AND voter_id = :'voter_id';
--
-- COMMIT;
