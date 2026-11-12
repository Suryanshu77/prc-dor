-- 20261111140000_voter_approval_system.sql
--
-- Voter approval system: a dedicated public.voter_approvals table (NOT a
-- column on profiles) gates submit_main_ballot / submit_special_ballot.
--
-- PRODUCT DECISIONS ENCODED HERE
--   * Statuses: pending | approved | rejected (enum public.voter_approval_status).
--   * Existing legitimate users (auth.users with a profiles row) are seeded
--     approved. Admins are seeded approved. New signups start pending via
--     handle_new_user (same transaction as signup).
--   * Five accounts deliberately removed by the admin for cheating are seeded
--     REJECTED by exact Auth UUID. Their profiles are intentionally absent and
--     MUST NOT be recreated. They stay blocked even if they log in again.
--   * No public self-service reapply path: clients have SELECT-only on
--     voter_approvals (RLS: own row or admin). Decisions go through
--     SECURITY DEFINER admin RPCs only.
--   * Fail closed: a missing approval row rejects the ballot.
--   * Admins pass the check via private.has_role('admin') even without a row.
--
-- WHAT THIS MIGRATION DOES NOT TOUCH
--   * auth.users, user_roles, votes, special_votes: no INSERT/UPDATE/DELETE.
--   * public.profiles: no rows inserted, updated, or deleted — the five
--     rejected UUIDs keep their missing profiles.
--   * Historical ballots stay byte-identical (seed and RPC changes are
--     forward-only for new submissions).
--
-- OBJECT INVENTORY (checked against the repo before writing; no duplicates)
--   voter_approvals, voter_approval_status, assert_voter_approved,
--   get_my_approval_status, admin_list_registration_requests,
--   admin_decide_registration: none existed.
--   handle_new_user / submit_main_ballot / submit_special_ballot are
--   CREATE OR REPLACE overwrites of existing functions (trigger stays bound).
--
-- ROLLBACK CONSIDERATIONS (manual; not executed here)
--   1. Restore handle_new_user from 20261023120000_reconcile_permissions.sql
--      (drops the voter_approvals INSERT; CREATE OR REPLACE keeps the trigger).
--   2. Restore submit_main_ballot from 20261027120000_secure_main_ballot.sql
--      and submit_special_ballot from 20261025120000_special_awards.sql
--      (removes the approval gate from new ballots only).
--   3. DROP FUNCTION public.admin_decide_registration(uuid, text, text);
--      DROP FUNCTION public.admin_list_registration_requests(text);
--      DROP FUNCTION public.get_my_approval_status();
--      DROP FUNCTION private.assert_voter_approved(uuid);
--   4. DROP TABLE public.voter_approvals;
--      DROP TYPE public.voter_approval_status;
--   Rolling back re-opens voting for the five rejected UUIDs unless another
--   block is installed first — treat rollback as product decision, not a
--   routine hotfix. Approval history (who approved whom, when) is lost with
--   the table; export admin_audit_log rows (action LIKE '%_registration')
--   before dropping if an audit trail must survive.
--
-- DEPLOYMENT: Supabase SQL Editor, same channel as prior migrations.
-- Transaction: explicit BEGIN; … COMMIT; so the whole script is one atomic
-- unit in SQL Editor (which may otherwise auto-commit statement-by-statement).
-- On any error before COMMIT the transaction aborts and nothing is applied —
-- including a re-run that fails at CREATE TYPE (not idempotent).
-- Idempotent pieces: CREATE OR REPLACE / ON CONFLICT / DROP POLICY IF EXISTS.
-- No secrets. PGlite-compatible for tests/voter-approval.test.mjs.

BEGIN;

-- ===========================================================================
-- 1. Enum + table
-- ===========================================================================
CREATE TYPE public.voter_approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.voter_approvals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.voter_approval_status NOT NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- pending has no decision; approved/rejected must be stamped
  CONSTRAINT voter_approvals_decided_state CHECK (
    (status = 'pending' AND decided_at IS NULL AND decided_by IS NULL)
    OR (status <> 'pending' AND decided_at IS NOT NULL)
  ),
  -- rejection_reason is optional but only legal on rejected
  CONSTRAINT voter_approvals_rejection_reason CHECK (
    rejection_reason IS NULL OR status = 'rejected'
  )
);

CREATE TRIGGER trg_voter_approvals_updated
  BEFORE UPDATE ON public.voter_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.voter_approvals ENABLE ROW LEVEL SECURITY;

-- Clients may read only their own row (admins read all via RLS). No client
-- INSERT/UPDATE/DELETE: decisions are SECURITY DEFINER RPCs; signup writes
-- come from the SECURITY DEFINER trigger; seed runs as the migration role.
DROP POLICY IF EXISTS voter_approvals_select_own ON public.voter_approvals;
CREATE POLICY voter_approvals_select_own ON public.voter_approvals
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

REVOKE ALL ON TABLE public.voter_approvals FROM anon, authenticated;
GRANT SELECT ON TABLE public.voter_approvals TO authenticated;
-- service_role keeps default table privileges (trusted server-side role).

-- ===========================================================================
-- 2. Seed — existing users only; never touches profiles or votes
-- ===========================================================================
-- 2a. Every auth user who already has a profile is a legitimate existing
--     account → approved (system decision: decided_by NULL, decided_at now).
--     ON CONFLICT DO NOTHING keeps re-runs and later manual decisions intact.
INSERT INTO public.voter_approvals (user_id, status, decided_at, decided_by)
SELECT u.id, 'approved'::public.voter_approval_status, now(), NULL::uuid
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ON CONFLICT (user_id) DO NOTHING;

-- 2b. Admins are approved even if a profile row were missing (belt and
--     braces; in practice every admin also has a profile).
INSERT INTO public.voter_approvals (user_id, status, decided_at, decided_by)
SELECT DISTINCT ur.user_id, 'approved'::public.voter_approval_status, now(), NULL::uuid
FROM public.user_roles ur
WHERE ur.role = 'admin'::public.app_role
ON CONFLICT (user_id) DO NOTHING;

-- 2c. The five cheating accounts: permanently rejected by exact Auth UUID
--     from the Phase 0 orphan report. WHERE EXISTS keeps the migration
--     FK-safe in hermetic test databases that never create these users;
--     in production all five exist and are stamped. ON CONFLICT DO UPDATE
--     forces rejected even if a prior row somehow said approved.
--     Profiles are NOT created for these ids.
INSERT INTO public.voter_approvals (
  user_id, status, decided_at, decided_by, rejection_reason
)
SELECT
  v.user_id,
  'rejected'::public.voter_approval_status,
  now(),
  NULL::uuid,
  v.reason
FROM (VALUES
  ('4db2e610-505f-4842-8b66-86fdc4ad068e'::uuid,
   'Account removed by administrator: voting fraud'),
  ('b2e52277-7174-457f-857c-d8296a3bdee0'::uuid,
   'Account removed by administrator: voting fraud'),
  ('83a5ace1-1426-4501-9a2a-5b83c5bd537d'::uuid,
   'Account removed by administrator: voting fraud'),
  ('42321688-4be7-4112-ad72-b05d6b1e5c78'::uuid,
   'Account removed by administrator: voting fraud'),
  ('0e84b649-105a-41d5-bb58-97e6b2f38aaa'::uuid,
   'Account removed by administrator: voting fraud')
) AS v(user_id, reason)
WHERE EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = v.user_id
)
ON CONFLICT (user_id) DO UPDATE SET
  status = 'rejected'::public.voter_approval_status,
  decided_at = now(),
  decided_by = NULL,
  rejection_reason = EXCLUDED.rejection_reason,
  updated_at = now();

-- ===========================================================================
-- 3. Signup trigger — pending row is transactional with auth.users INSERT
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
BEGIN
  BEGIN
    pos := (NEW.raw_user_meta_data->>'position')::public.player_position;
  EXCEPTION WHEN OTHERS THEN
    pos := NULL;
  END;

  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name, nickname, age, position, jersey_number, profile_image, email)
  VALUES (
    NEW.id,
    display_name,
    NEW.raw_user_meta_data->>'nickname',
    NULLIF(NEW.raw_user_meta_data->>'age','')::INT,
    pos,
    NULLIF(NEW.raw_user_meta_data->>'jersey_number','')::INT,
    NEW.raw_user_meta_data->>'profile_image',
    NEW.email
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
END $function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 4. Server-side gate — one helper, called by both ballot RPCs
-- ===========================================================================
-- Fail-closed semantics:
--   * missing row      → reject
--   * pending          → reject
--   * rejected         → reject
--   * approved         → allow
--   * admin role       → allow without a row (admins remain approved)
-- Raises with a stable 'voter approval:' prefix the UI and tests match on.
CREATE OR REPLACE FUNCTION private.assert_voter_approved(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.voter_approval_status;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'voter approval: not authenticated';
  END IF;

  IF private.has_role(_user_id, 'admin'::public.app_role) THEN
    RETURN;
  END IF;

  SELECT va.status INTO v_status
  FROM public.voter_approvals va
  WHERE va.user_id = _user_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'voter approval: no approval record';
  END IF;
  IF v_status = 'pending'::public.voter_approval_status THEN
    RAISE EXCEPTION 'voter approval: pending admin approval';
  END IF;
  IF v_status = 'rejected'::public.voter_approval_status THEN
    RAISE EXCEPTION 'voter approval: account rejected';
  END IF;
  -- approved falls through
END $$;

REVOKE ALL ON FUNCTION private.assert_voter_approved(uuid)
  FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 5. Self-status RPC for the frontend gate
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_my_approval_status()
RETURNS public.voter_approval_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN private.has_role(auth.uid(), 'admin'::public.app_role)
      THEN 'approved'::public.voter_approval_status
    ELSE (
      SELECT va.status
      FROM public.voter_approvals va
      WHERE va.user_id = auth.uid()
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.get_my_approval_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_approval_status() TO authenticated;

-- ===========================================================================
-- 6. Admin RPCs — list / decide; no self-approval; audit via admin_audit_log
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_list_registration_requests(
  _status text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  status public.voter_approval_status,
  rejection_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
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

  IF _status IS NOT NULL
     AND lower(_status) NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION
      'admin_list_registration_requests: status must be pending, approved or rejected';
  END IF;

  RETURN QUERY
  SELECT
    va.user_id,
    u.email,
    COALESCE(p.full_name, p.nickname, split_part(u.email, '@', 1))::text,
    va.status,
    va.rejection_reason,
    va.decided_by,
    va.decided_at,
    va.created_at,
    va.updated_at
  FROM public.voter_approvals va
  JOIN auth.users u ON u.id = va.user_id
  LEFT JOIN public.profiles p ON p.id = va.user_id
  WHERE _status IS NULL
     OR va.status::text = lower(_status)
  ORDER BY
    CASE va.status
      WHEN 'pending'::public.voter_approval_status THEN 0
      WHEN 'rejected'::public.voter_approval_status THEN 1
      ELSE 2
    END,
    va.updated_at DESC,
    va.user_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_registration_requests(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_registration_requests(text)
  TO authenticated;

-- Approve or reject. _decision is 'approved' or 'rejected' only — there is
-- no path back to pending (re-decision between approved/rejected is an
-- explicit admin correction, still audited). Self-approval is blocked.
-- Rejected users get no client RPC to reapply; only this admin RPC can
-- change their row.
CREATE OR REPLACE FUNCTION public.admin_decide_registration(
  _user_id uuid,
  _decision text,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_decision public.voter_approval_status;
  v_reason text;
  v_action text;
BEGIN
  IF v_admin IS NULL
     OR NOT private.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized: admin only';
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'admin_decide_registration: user is required';
  END IF;

  IF _user_id = v_admin THEN
    RAISE EXCEPTION 'admin_decide_registration: cannot decide your own registration';
  END IF;

  IF lower(coalesce(_decision, '')) NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION
      'admin_decide_registration: decision must be approved or rejected';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id) THEN
    RAISE EXCEPTION 'admin_decide_registration: user not found';
  END IF;

  v_decision := lower(_decision)::public.voter_approval_status;
  v_reason := NULLIF(btrim(coalesce(_reason, '')), '');

  IF v_decision = 'rejected'::public.voter_approval_status THEN
    v_action := 'reject_registration';
  ELSE
    v_action := 'approve_registration';
    v_reason := NULL; -- reason is rejection-only
  END IF;

  INSERT INTO public.voter_approvals (
    user_id, status, decided_by, decided_at, rejection_reason
  )
  VALUES (
    _user_id, v_decision, v_admin, now(),
    CASE WHEN v_decision = 'rejected'::public.voter_approval_status
         THEN v_reason END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    decided_by = EXCLUDED.decided_by,
    decided_at = EXCLUDED.decided_at,
    rejection_reason = EXCLUDED.rejection_reason,
    updated_at = now();

  INSERT INTO public.admin_audit_log (
    action, admin_user_id, target_user_id, reason, details, records_affected
  )
  VALUES (
    v_action,
    v_admin,
    _user_id,
    v_reason,
    jsonb_build_object('decision', v_decision::text),
    1
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_decide_registration(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_registration(uuid, text, text)
  TO authenticated;

-- ===========================================================================
-- 7. Ballot RPCs — approval gate (CREATE OR REPLACE; bodies otherwise match
--    20261027120000 / 20261025120000 apart from the assert call)
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

  -- Approval gate: pending / rejected / missing all fail closed; admins pass.
  PERFORM private.assert_voter_approved(v_voter);

  -- Serialise submissions from this voter for this period. The lock MUST be
  -- acquired before the duplicate check: two racing requests cannot see each
  -- other's uncommitted rows, so without the lock both would pass the check
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
  _total int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Approval gate: same fail-closed helper as the main ballot.
  PERFORM private.assert_voter_approved(auth.uid());

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

-- ===========================================================================
-- 8. POST-APPLY VERIFICATION (tests/voter-approval.test.mjs locally;
--    live DB: review only — never executed from this repo)
--   * voter_approvals row count = distinct auth.users with profiles
--       + admins without profiles + existing rejected UUIDs present in auth
--   * the five UUIDs: status=rejected, profiles row ABSENT
--   * no INSERT/UPDATE/DELETE grants on voter_approvals for authenticated
--   * get_my_approval_status / admin_* EXECUTE only for authenticated
--   * votes row count unchanged (183 at Phase 0); special_votes unchanged
--   * handle_new_user inserts pending; both submit_* call assert_voter_approved
-- ===========================================================================

COMMIT;
