-- Profile directory: usernames, banner, football favourites, follow requests.
--
-- WHAT THIS ADDS
--   * public.profiles.username       globally unique, case-insensitive, editable
--   * public.profiles.banner_image   profile banner (storage path, like profile_image)
--   * public.profiles.favourite_*    optional football preferences
--   * public.follow_requests         approval-based follow state between members
--
-- SECURITY INTENT
--   * profiles.email stays out of every client grant. The new columns are
--     added to BOTH per-column GRANT lists below, re-stated in full after
--     REVOKE ALL so this migration supersedes (not edits)
--     20261023120000_reconcile_permissions.sql — an already-applied file is
--     never re-run, so a column missing from these grants fails at runtime
--     with 42501 rather than silently exposing data.
--   * Username uniqueness is owned by the database: an expression unique
--     index on lower(username) plus a format CHECK, never app-side checks
--     alone.
--   * Profile visibility replaces profiles_select_all (USING (true) from
--     20260623050414) with a membership-gated policy: own row, admins, or
--     approved-to-approved, backed by the SECURITY DEFINER helper
--     private.is_approved (section 3b).
--   * follow_requests is SELECT-only for clients; every write is a
--     SECURITY DEFINER RPC with an explicit auth check, mirroring
--     20261111140000_voter_approval_system.sql. request_follow and
--     decide_follow additionally require both members approved;
--     remove_follow stays ungated so a revoked member can still withdraw.
--   * No new storage bucket: banners reuse the `avatars` bucket under
--     <uid>/banner.<ext>, whose RLS already scopes writes to the owner.
--
-- POST-APPLY VERIFICATION (tests/profile-directory.test.mjs locally;
-- live DB: review only - never executed from this repo)
--   * every profile row has a username matching ^[a-z0-9_]{3,24}$
--   * lower(username) is unique
--   * SELECT/UPDATE grants list exactly the approved columns, never email
--   * profiles_select_all is gone; profiles_select_visible is the only
--     SELECT policy for authenticated
--   * pending/rejected rows are invisible to non-admin members
--   * authenticated holds SELECT only on follow_requests
--   * request_follow / decide_follow / remove_follow exist, are revoked
--     from anon and granted to authenticated

BEGIN;

-- ===========================================================================
-- 1. Profile columns
-- ===========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS banner_image text,
  ADD COLUMN IF NOT EXISTS favourite_club text,
  ADD COLUMN IF NOT EXISTS favourite_player text,
  ADD COLUMN IF NOT EXISTS favourite_national_team text,
  ADD COLUMN IF NOT EXISTS favourite_league text,
  ADD COLUMN IF NOT EXISTS favourite_moment text;

-- ---------------------------------------------------------------------------
-- 1a. Backfill existing members from their email local-part
-- ---------------------------------------------------------------------------
-- Rule (mirrored by handle_new_user below): lower-case the part before '@',
-- strip everything outside [a-z0-9_], fall back to 'user_<md5 prefix>' when
-- the result is empty/too short, prefix 'user_' when it would start with a
-- digit, cap at 24 chars, then append '_2', '_3', ... until the candidate is
-- free. Deterministic (ordered by created_at, id) so re-runs and staging
-- refreshes converge on the same handles.
--
-- CONCURRENT SIGNUP + RETRY NOTES
-- The backfill loop and handle_new_user de-duplicate with a
-- SELECT-then-INSERT pattern inside one transaction, so two signups racing
-- for the same candidate can both pass the EXISTS check: the loser then
-- fails on profiles_username_lower_key and its whole signup (auth.users
-- included) rolls back. Fail-closed — a duplicate handle can never commit;
-- the member simply retries and receives the next suffix.
-- This file is one BEGIN/COMMIT transaction: a failed apply rolls back
-- completely and is safe to re-run. The backfill only touches
-- username IS NULL rows, so a re-run resumes where a previous run stopped.
-- If a previous apply was interrupted OUTSIDE this transaction (statements
-- pasted one by one), run scripts/preflight-profile-directory-readonly.sql
-- first: CREATE TYPE, ADD CONSTRAINT, CREATE UNIQUE INDEX and CREATE
-- TRIGGER below carry no IF NOT EXISTS and would fail on a second pass.
DO $$
DECLARE
  rec record;
  base text;
  candidate text;
  suffix int;
BEGIN
  FOR rec IN
    SELECT p.id, p.email AS profile_email, u.email AS auth_email
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.username IS NULL
    ORDER BY p.created_at, p.id
  LOOP
    base := regexp_replace(
              lower(split_part(coalesce(rec.profile_email, rec.auth_email, ''), '@', 1)),
              '[^a-z0-9_]', '', 'g');
    IF base IS NULL OR length(base) < 3 THEN
      base := 'user_' || substr(md5(rec.id::text), 1, 8);
    ELSIF base ~ '^[0-9]' THEN
      base := 'user_' || base;
    END IF;
    base := left(base, 24);

    candidate := base;
    suffix := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.username IS NOT NULL AND lower(p.username) = lower(candidate)
    ) LOOP
      suffix := suffix + 1;
      candidate := left(base, 24 - length(suffix::text) - 1) || '_' || suffix::text;
    END LOOP;

    UPDATE public.profiles SET username = candidate WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,24}$');

CREATE UNIQUE INDEX profiles_username_lower_key
  ON public.profiles (lower(username));

-- The format CHECK already rejects upper-case (so the unique index can never
-- be sidestepped by case); this trigger just rewrites instead of erroring so
-- a pasted "Ronaldo" becomes a clean "ronaldo".
CREATE OR REPLACE FUNCTION public.normalize_profile_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username := lower(NEW.username);
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.normalize_profile_username()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_profiles_username_normalize
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_username();

-- ===========================================================================
-- 2. Signup trigger — assigns a username in the same transaction as the
--    profile insert (supersedes the 20261111140000 definition).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  pos public.player_position;
  display_name TEXT;
  v_base TEXT;
  v_username TEXT;
  v_suffix INT;
BEGIN
  BEGIN
    pos := (NEW.raw_user_meta_data->>'position')::public.player_position;
  EXCEPTION WHEN OTHERS THEN
    pos := NULL;
  END;

  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Same algorithm as the backfill above, so a signup can never collide with
  -- a handle derived from an identical e-mail local-part.
  v_base := regexp_replace(
              lower(split_part(COALESCE(NEW.email, ''), '@', 1)),
              '[^a-z0-9_]', '', 'g');
  IF v_base IS NULL OR length(v_base) < 3 THEN
    v_base := 'user_' || substr(md5(NEW.id::text), 1, 8);
  ELSIF v_base ~ '^[0-9]' THEN
    v_base := 'user_' || v_base;
  END IF;
  v_base := left(v_base, 24);

  v_username := v_base;
  v_suffix := 1;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles p WHERE lower(p.username) = lower(v_username)
  ) LOOP
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24 - length(v_suffix::text) - 1) || '_' || v_suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, nickname, age, position, jersey_number, profile_image, email, username)
  VALUES (
    NEW.id,
    display_name,
    NEW.raw_user_meta_data->>'nickname',
    NULLIF(NEW.raw_user_meta_data->>'age','')::INT,
    pos,
    NULLIF(NEW.raw_user_meta_data->>'jersey_number','')::INT,
    NEW.raw_user_meta_data->>'profile_image',
    NEW.email,
    v_username
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF NEW.email = 'suryanshu.saxena@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  -- Approval row rides the same transaction as signup: if this INSERT fails,
  -- auth.users rolls back too (no half-registered user without a status).
  INSERT INTO public.voter_approvals (user_id, status)
  VALUES (NEW.id, 'pending'::public.voter_approval_status)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.admin_notifications (type, title, message, user_id)
  VALUES (
    'user_registration',
    'New User Registered',
    '@' || display_name || ' just joined PRC D''or',
    NEW.id
  )
  ON CONFLICT (type, user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 3. Client privileges — the full approved column set, restated
-- ===========================================================================
-- email is intentionally absent from both grants (column grants are the only
-- effective mechanism in PostgreSQL). id is read-only for clients; created_at
-- / updated_at are trigger- or default-maintained, so no client payload sends
-- them. updated_at is maintained by the set_updated_at trigger (trigger
-- assignments are not privilege-checked against the calling role).
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, nickname, age, position, jersey_number,
  profile_image, bio, social_handle, created_at, updated_at,
  username, banner_image, favourite_club, favourite_player,
  favourite_national_team, favourite_league, favourite_moment
) ON public.profiles TO authenticated;
GRANT UPDATE (
  full_name, nickname, age, position, jersey_number,
  profile_image, bio, social_handle,
  username, banner_image, favourite_club, favourite_player,
  favourite_national_team, favourite_league, favourite_moment
) ON public.profiles TO authenticated;

-- ===========================================================================
-- 3b. Profile visibility — replace profiles_select_all
-- ===========================================================================
-- 20260623050414 shipped profiles_select_all USING (true): every
-- authenticated member could read every profile, including pending and
-- rejected registrations. Visibility is membership-gated instead:
--   * own row                  -> always (the signup flow updates and reads
--                                  its row while still pending)
--   * admin (private.has_role) -> everything, including unapproved rows
--   * everyone else            -> viewer AND target both approved
-- private.is_approved is SECURITY DEFINER: a plain EXISTS on
-- voter_approvals inside the policy would be defeated by that table's
-- voter_approvals_select_own policy (own-row only, 20261111140000), which
-- would hide every other member's status and fail closed for everyone.
-- Fail-closed: NULL uid, missing row, pending and rejected all mean false.
CREATE OR REPLACE FUNCTION private.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'::public.app_role
  )
  OR EXISTS (
    SELECT 1 FROM public.voter_approvals va
    WHERE va.user_id = _user_id
      AND va.status = 'approved'::public.voter_approval_status
  );
$$;

REVOKE ALL ON FUNCTION private.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_approved(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_visible ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.is_approved(auth.uid()) AND private.is_approved(id))
  );

-- ===========================================================================
-- 4. Follow requests — enum + table
-- ===========================================================================
-- One row per ordered pair: pending -> approved | rejected, with re-requests
-- flipping rejected back to pending. Unfollow/withdraw deletes the row.
CREATE TYPE public.follow_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.follow_request_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follow_requests_no_self_follow CHECK (follower_id <> followee_id),
  CONSTRAINT follow_requests_one_pair UNIQUE (follower_id, followee_id),
  -- pending has no decision; approved/rejected must be stamped
  CONSTRAINT follow_requests_decided_state CHECK (
    (status = 'pending' AND decided_at IS NULL AND decided_by IS NULL)
    OR (status <> 'pending' AND decided_at IS NOT NULL)
  ),
  -- only the recipient (followee) ever decides
  CONSTRAINT follow_requests_decider_is_followee CHECK (
    decided_by IS NULL OR decided_by = followee_id
  )
);

CREATE INDEX follow_requests_followee_status_key
  ON public.follow_requests (followee_id, status);

CREATE TRIGGER trg_follow_requests_updated
  BEFORE UPDATE ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Follower sees their own outgoing state (so the profile button knows where
-- it stands); followee sees requests addressed to them (the requests panel);
-- admins see everything. No client INSERT/UPDATE/DELETE: writes go through
-- the SECURITY DEFINER RPCs below.
DROP POLICY IF EXISTS follow_requests_select_own ON public.follow_requests;
CREATE POLICY follow_requests_select_own ON public.follow_requests
  FOR SELECT TO authenticated
  USING (
    follower_id = auth.uid()
    OR followee_id = auth.uid()
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

REVOKE ALL ON TABLE public.follow_requests FROM anon, authenticated;
GRANT SELECT ON TABLE public.follow_requests TO authenticated;
-- service_role keeps default table privileges (trusted server-side role).

-- ===========================================================================
-- 5. Follow RPCs — request / decide / remove
-- ===========================================================================
-- Fail-closed semantics for request_follow:
--   * anonymous                 -> reject
--   * follower not approved     -> reject (assert_voter_approved)
--   * self-follow               -> reject
--   * target missing/unapproved -> reject ('player not found'; approval
--                                  state never leaks through error text)
--   * already following         -> idempotent (returns 'approved')
--   * request pending           -> idempotent (returns 'pending')
--   * previously declined       -> re-opened as 'pending'
-- Raises with a stable 'follow request:' prefix the UI and tests match on.
CREATE OR REPLACE FUNCTION public.request_follow(_followee uuid)
RETURNS public.follow_request_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_follower uuid := auth.uid();
  v_status public.follow_request_status;
BEGIN
  IF v_follower IS NULL THEN
    RAISE EXCEPTION 'follow request: not authenticated';
  END IF;
  -- Defense in depth: the authenticated UI is already gated on approval, so
  -- a pending member can never reach this button. The gate is membership —
  -- only approved members may follow, and (below) only approved members
  -- may be followed.
  PERFORM private.assert_voter_approved(v_follower);

  IF _followee IS NULL OR _followee = v_follower THEN
    RAISE EXCEPTION 'follow request: cannot follow yourself';
  END IF;
  -- Target must exist AND be an approved member; both cases raise the same
  -- 'player not found' so approval state never leaks through error text.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _followee AND private.is_approved(p.id)
  ) THEN
    RAISE EXCEPTION 'follow request: player not found';
  END IF;

  INSERT INTO public.follow_requests (follower_id, followee_id, status)
  VALUES (v_follower, _followee, 'pending'::public.follow_request_status)
  ON CONFLICT (follower_id, followee_id) DO NOTHING;

  SELECT fr.status INTO v_status
  FROM public.follow_requests fr
  WHERE fr.follower_id = v_follower AND fr.followee_id = _followee;

  IF v_status = 'rejected'::public.follow_request_status THEN
    UPDATE public.follow_requests
       SET status = 'pending'::public.follow_request_status,
           decided_at = NULL,
           decided_by = NULL,
           updated_at = now()
     WHERE follower_id = v_follower AND followee_id = _followee
     RETURNING status INTO v_status;
  END IF;

  RETURN COALESCE(v_status, 'pending'::public.follow_request_status);
END $$;

REVOKE ALL ON FUNCTION public.request_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_follow(uuid) TO authenticated;

-- Approve or reject a pending request. Only an approved followee may
-- decide (approval can be revoked after a request arrives), and a
-- decision cannot be re-decided (matching voter_approvals: no path back
-- to pending from an admin decision — here the follower may re-request
-- instead).
CREATE OR REPLACE FUNCTION public.decide_follow(_request_id uuid, _decision text)
RETURNS public.follow_request_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status public.follow_request_status;
  v_followee uuid;
  v_decision public.follow_request_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'follow request: not authenticated';
  END IF;
  PERFORM private.assert_voter_approved(v_uid);
  IF _decision IS NULL OR lower(_decision) NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'follow request: decision must be approved or rejected';
  END IF;
  v_decision := lower(_decision)::public.follow_request_status;

  SELECT fr.status, fr.followee_id INTO v_status, v_followee
  FROM public.follow_requests fr
  WHERE fr.id = _request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'follow request: not found';
  END IF;
  IF v_followee <> v_uid THEN
    RAISE EXCEPTION 'follow request: only the recipient can decide';
  END IF;
  IF v_status <> 'pending'::public.follow_request_status THEN
    RAISE EXCEPTION 'follow request: already decided';
  END IF;

  UPDATE public.follow_requests
     SET status = v_decision,
         decided_by = v_uid,
         decided_at = now(),
         updated_at = now()
   WHERE id = _request_id
     AND followee_id = v_uid
     AND status = 'pending'::public.follow_request_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'follow request: already decided';
  END IF;

  RETURN v_decision;
END $$;

REVOKE ALL ON FUNCTION public.decide_follow(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_follow(uuid, text) TO authenticated;

-- Follower withdraws a pending request or unfollows. Row removal is the
-- only DELETE path: clients hold no DELETE grant on follow_requests.
-- Deliberately NOT approval-gated: a member whose approval was revoked
-- must still be able to withdraw their own rows (deletes only ever touch
-- follower_id = auth.uid()).
CREATE OR REPLACE FUNCTION public.remove_follow(_followee uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_follower uuid := auth.uid();
BEGIN
  IF v_follower IS NULL THEN
    RAISE EXCEPTION 'follow request: not authenticated';
  END IF;
  IF _followee IS NULL THEN
    RAISE EXCEPTION 'follow request: player not found';
  END IF;

  DELETE FROM public.follow_requests
  WHERE follower_id = v_follower AND followee_id = _followee;
END $$;

REVOKE ALL ON FUNCTION public.remove_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_follow(uuid) TO authenticated;

COMMIT;
