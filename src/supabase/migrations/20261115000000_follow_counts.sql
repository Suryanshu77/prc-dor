-- Follow counts: aggregate follower/following totals for the profile header.
--
-- WHAT THIS ADDS
--   * public.get_follow_counts(_user_id) -> TABLE (followers, following),
--     counting only status = 'approved' rows. Pending and rejected requests
--     never contribute to either number.
--
-- WHY AN RPC IS REQUIRED
--   follow_requests RLS (20261113160000_profile_directory.sql) is own-rows
--   only: a member sees rows where they are follower or followee, never
--   someone else's. A client-side COUNT over another member's relationships
--   therefore always counts zero rows, and widening the policy to expose
--   other members' rows is exactly what this file must NOT do. The RPC runs
--   SECURITY DEFINER and returns two aggregate numbers — no rows, no
--   identities, no per-request detail, no new table privileges.
--
-- SECURITY
--   * SECURITY DEFINER with a fixed SET search_path = public, pg_temp.
--   * Fail-closed caller gate mirrors profiles_select_visible:
--       own counts           -> always readable (own-row visibility; a
--                               pending member reads their own zeros)
--       anyone else's counts -> viewer approved (private.assert_voter_approved
--                               raises the stable 'voter approval: ...'
--                               prefix for pending/rejected/anonymous
--                               callers; admins pass inside it, exactly
--                               like the policy's has_role branch) AND
--                               target approved (private.is_approved), with
--                               the admin role bypassing the target check
--                               exactly like the profiles policy.
--     A non-existent target id raises the same 'player not found' text
--     request_follow uses, so approval state never leaks through errors.
--     The existence check runs for EVERY caller — the admin bypass covers
--     approval only, never existence (RLS can only ever return real rows,
--     so an admin asking about a non-existent id must fail closed rather
--     than read zeros) — and only after the viewer gate, so an unapproved
--     caller cannot probe which ids exist.
--   * EXECUTE revoked from PUBLIC and anon, granted to authenticated only.
--   * No GRANT on any table, no RLS policy touched, no change to the
--     existing request_follow / decide_follow / remove_follow RPCs.
--
-- NOT APPLIED TO PRODUCTION — local, forward-only migration file.
-- Verified by tests/follow-counts.test.mjs against a local PGlite chain.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_follow_counts(_user_id uuid)
RETURNS TABLE (followers bigint, following bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'follow counts: player not found';
  END IF;

  IF v_uid IS DISTINCT FROM _user_id THEN
    PERFORM private.assert_voter_approved(v_uid);
    IF NOT (
      private.is_approved(_user_id)
      OR private.has_role(v_uid, 'admin'::public.app_role)
    ) THEN
      RAISE EXCEPTION 'follow counts: player not found';
    END IF;
  END IF;

  -- The target must be a real profile for EVERY caller, including admins:
  -- the admin bypass above covers approval only, never existence (an admin
  -- asking about a non-existent id must fail closed, not read zeros). Runs
  -- after the viewer gate so an unapproved caller sees the same
  -- 'voter approval: ...' error for every id and cannot probe existence.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _user_id
  ) THEN
    RAISE EXCEPTION 'follow counts: player not found';
  END IF;

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE fr.followee_id = _user_id)::bigint,
    count(*) FILTER (WHERE fr.follower_id = _user_id)::bigint
  FROM public.follow_requests fr
  WHERE fr.status = 'approved'::public.follow_request_status
    AND (fr.followee_id = _user_id OR fr.follower_id = _user_id);
END $$;

REVOKE ALL ON FUNCTION public.get_follow_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO authenticated;

COMMIT;
