-- Migration 1: permission reconciliation (forward-only, idempotent).
--
-- SECURITY INTENT
-- Live evidence (audit 2026-10) showed all six application tables with ACL
-- "arwdDxtm" for anon, authenticated, and service_role: every role held
-- INSERT/SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER, and effective
-- column SELECT on profiles.email and votes.voter_id despite earlier
-- column-level REVOKEs (a table-level GRANT SELECT overrides column REVOKEs
-- in PostgreSQL, so the June column REVOKEs were never effective).
-- This migration:
--   1. strips ALL table privileges from anon on all six tables;
--   2. re-grants authenticated the minimal table/column set proven by the
--      frontend call sites (see matrix below);
--   3. replaces the broad votes read policy with an own-ballot/admin policy;
--   4. makes profiles.email unreadable/unwritable for authenticated by
--      granting per-column privileges that exclude it (Phase 1 frontend
--      no longer selects or updates email);
--   5. reconciles function EXECUTE privileges (explicit REVOKE from anon,
--      which Supabase default privileges grant on every new function);
--   6. hardens trigger-function search_path to include pg_temp.
--
-- CALL-SITE MATRIX (verified in this worktree before writing)
--   votes:           SELECT (vote.tsx myVoteQ, own rows), INSERT (vote.tsx
--                    submit — RETAINED UNTIL MIGRATION 2 cutover), DELETE
--                    (admin.tsx resetVotes, admin RLS)
--   profiles:        SELECT (11 non-email columns + FK-embed from
--                    hall-of-fame.tsx), UPDATE (profile.tsx 8 columns,
--                    auth.tsx profile_image), no client INSERT
--   voting_periods:  SELECT (vote/dashboard/admin/results/players.$id),
--                    UPDATE (admin.tsx is_active/results_visible/winner)
--   user_roles:      SELECT only (lib/auth.tsx, admin-delete-player.server.ts)
--   hall_of_fame:    SELECT (+ FK-embed), INSERT+UPDATE (admin upsert paths)
--   admin_notifications: SELECT + UPDATE read_at (AdminNotifications.tsx)
--   RPCs:            is_period_results_visible(uuid), get_period_results(uuid),
--                    get_player_period_rank(uuid,uuid),
--                    get_period_vote_stats(uuid), has_voted_in_period(uuid),
--                    get_active_period_analytics(), admin_list_player_emails()
--
-- INTENTIONAL COMPATIBILITY DECISIONS
--   * votes INSERT is NOT revoked here: the client ballot path
--     (vote.tsx submit) still inserts directly. Migration 2 + the frontend
--     RPC cutover must complete before the INSERT grant is removed.
--   * RLS is enabled but deliberately NOT forced on any table: the entire
--     results/RPC architecture relies on SECURITY DEFINER functions running
--     as the table owner (owner bypasses RLS unless FORCE is set). Forcing
--     RLS would blind every SECURITY DEFINER RPC and break the app.
--   * No ALTER DEFAULT PRIVILEGES statements: live pg_default_acl was not
--     observable from the repository. Supabase templates default-grant
--     EXECUTE to anon on new functions, which is why each function below
--     gets an explicit REVOKE ... FROM anon. Default ACLs for FUTURE
--     objects are deferred to human review via
--     scripts/preflight-migration-1.sql (section 5).
--   * No objects are dropped except the votes_select_all policy, which is
--     intentionally replaced by votes_select_own (own/admin read). All
--     other policies, functions, tables, and columns are preserved.
--   * service_role grants are left untouched (trusted backend role).
--
-- RUN VIA: Supabase SQL Editor (same out-of-band channel as the Sept/Oct
-- migrations). Idempotent: safe to re-run. Run
-- scripts/preflight-migration-1.sql BEFORE and AFTER this file.

-- ===========================================================================
-- 1. Role-check helper: ensure the private-schema helper exists before any
--    policy below references it. Body matches 20260626044853 exactly;
--    CREATE OR REPLACE keeps this migration re-runnable. The helper only
--    reads user_roles and is granted to authenticated + service_role for
--    RLS evaluation.
-- ===========================================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
-- anon must never reach the private schema (was never granted; belt-and-braces).
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

-- Defensive: if a leftover public.has_role still exists (repo migration
-- 20260626044853 dropped it; live may predate that), revoke every overload
-- from all API roles — but ONLY when no RLS policy still references it,
-- so this can never break live policy evaluation.
DO $$
DECLARE
  fn record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies pol
    WHERE pol.qual ILIKE '%public.has_role%'
       OR pol.with_check ILIKE '%public.has_role%'
  ) THEN
    FOR fn IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'has_role'
    LOOP
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
        fn.sig
      );
    END LOOP;
  END IF;
END $$;

-- ===========================================================================
-- 2. Table privileges: revoke everything from anon; re-grant authenticated
--    only what the call-site matrix above proves is used. REVOKE ALL covers
--    SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER — the
--    TRUNCATE/REFERENCES/TRIGGER privileges observed live for anon and
--    authenticated are removed here and never re-granted.
-- ===========================================================================

-- votes: SELECT + INSERT (until Migration 2) + DELETE (admin reset path).
REVOKE ALL ON TABLE public.votes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.votes TO authenticated;

-- profiles: per-column privileges so profiles.email is neither SELECTable
-- nor UPDATEable by authenticated (a table-level SELECT/UPDATE grant would
-- implicitly re-expose email; per-column grants are the only effective
-- mechanism in PostgreSQL). No client INSERT path exists: rows are created
-- by the SECURITY DEFINER on_auth_user_created trigger.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, nickname, age, position, jersey_number,
  profile_image, bio, social_handle, created_at, updated_at
) ON public.profiles TO authenticated;
GRANT UPDATE (
  full_name, nickname, age, position, jersey_number,
  profile_image, bio, social_handle
) ON public.profiles TO authenticated;
-- email intentionally absent from both grants. updated_at is maintained by
-- the set_updated_at trigger (trigger assignments are not privilege-checked
-- against the calling role), and no client payload sends it.

-- voting_periods: SELECT for all signed-in users; UPDATE for admin paths
-- (RLS voting_periods_admin_manage gates rows to admins).
REVOKE ALL ON TABLE public.voting_periods FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.voting_periods TO authenticated;

-- user_roles: read-only (own roles via RLS; admin reads targets for the
-- delete-player guard). No client write path.
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

-- hall_of_fame: SELECT for the public archive page (plus FK-embed into
-- profiles), INSERT+UPDATE for the two admin upsert paths. No DELETE path.
REVOKE ALL ON TABLE public.hall_of_fame FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hall_of_fame TO authenticated;

-- admin_notifications: SELECT + UPDATE(read_at) for admins (RLS-restricted).
-- INSERT is produced only by the SECURITY DEFINER registration trigger.
REVOKE ALL ON TABLE public.admin_notifications FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.admin_notifications TO authenticated;

-- ===========================================================================
-- 3. Votes read policy: replace the broad votes_select_all (USING true,
--    which let every authenticated user read every ballot) with an
--    own-ballot/admin policy. private.has_role's signature and body were
--    verified above and in 20260626044853. votes_insert_own and
--    votes_admin_delete are left untouched (Migration 2 scope).
-- ===========================================================================
DROP POLICY IF EXISTS votes_select_all ON public.votes;
DROP POLICY IF EXISTS votes_select_own ON public.votes;
CREATE POLICY votes_select_own ON public.votes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = voter_id
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ===========================================================================
-- 4. Trigger functions: add pg_temp to search_path (search-path hijacking
--    hardening). Bodies are byte-identical to the current definitions in
--    20260626044853 / 20260922120000 apart from the SET clause. Existing
--    triggers keep working: CREATE OR REPLACE does not detach triggers.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

  INSERT INTO public.admin_notifications (type, title, message, user_id)
  VALUES (
    'user_registration',
    'New User Registered',
    '@' || display_name || ' just joined PRC D''or',
    NEW.id
  )
  ON CONFLICT (type, user_id) DO NOTHING;

  RETURN NEW;
END $$;

-- Trigger functions must not be directly invocable by API roles (they can
-- only fire via DDL-installed triggers). PostgreSQL checks EXECUTE at
-- CREATE TRIGGER time, not at event time, so this cannot break triggers.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 5. Function EXECUTE reconciliation. Supabase default privileges grant
--    EXECUTE to anon on newly created functions, which is why each RPC gets
--    an explicit REVOKE from anon even though earlier migrations already
--    revoked PUBLIC. Signatures verified against repo migration definitions
--    (get_period_vote_stats' DEFAULT NULL argument does not change the
--    argtypes list, so (uuid) matches both overloads' signature).
--    admin_list_player_emails() stays callable by authenticated: its body
--    returns rows only when the caller is an admin (defence in depth).
-- ===========================================================================
REVOKE ALL ON FUNCTION public.get_period_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_results(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_period_results_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_period_results_visible(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_player_period_rank(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_period_rank(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_period_vote_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_vote_stats(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_voted_in_period(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_voted_in_period(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_active_period_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_period_analytics() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_player_emails() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_player_emails() TO authenticated;

-- ===========================================================================
-- 6. POST-APPLY VERIFICATION
--    Run scripts/preflight-migration-1.sql (it contains both the before
--    inventory and the after-assertions). Expected outcomes:
--      anon:        has_table_privilege = false on all six tables;
--                   EXECUTE = false on all functions above.
--      authenticated on profiles: email SELECT = false, email UPDATE = false;
--                   the 8 editable columns UPDATE = true.
--      authenticated on votes: SELECT/INSERT/DELETE = true
--                   (INSERT retained until Migration 2).
--      policies:    votes_select_all absent; votes_select_own present
--                   with roles = {authenticated}.
--      proconfig:   set_updated_at and handle_new_user both show
--                   search_path=public,pg_temp.
--    Then smoke-test the app: login, players list, vote page (insert a test
--    ballot on a scratch period only — never mutate 2026 data), profile
--    edit, admin pages, results visibility toggle.
-- ===========================================================================
