-- Preflight for
-- src/supabase/migrations/20261113160000_profile_directory.sql
--
-- READ-ONLY: every statement is a SELECT or a catalog query. Safe to run in
-- the Supabase SQL Editor BEFORE applying the migration. Run all sections,
-- keep the output, and check each expected_outcome label. Nothing here
-- writes data or schema.
--
-- WHY THIS EXISTS
-- The migration runs as one BEGIN/COMMIT transaction, so a normal apply is
-- all-or-nothing and safe to re-run. The risk is a PRIOR PARTIAL APPLY —
-- e.g. statements pasted one by one into the SQL Editor. CREATE TYPE,
-- ADD CONSTRAINT, CREATE UNIQUE INDEX and CREATE TRIGGER carry no
-- IF NOT EXISTS and would fail on a second pass. Section 5 flags every such
-- object; section 4 flags the data the backfill / SET NOT NULL / format
-- CHECK / unique-index steps depend on.
--
-- CONCURRENT SIGNUP (recorded for the operator, no preflight action):
-- two signups racing for the same username candidate can both pass the
-- SELECT-then-INSERT de-duplication; the loser fails on
-- profiles_username_lower_key and its whole signup rolls back. Fail-closed
-- — a duplicate handle can never commit; the member retries and gets the
-- next suffix.

-- ---------------------------------------------------------------------------
-- 1. Migration history (informational). profile_directory_applied must be
--    false BEFORE the first apply and true AFTER. Also prints the full
--    history so orphan / out-of-band versions stay visible.
-- ---------------------------------------------------------------------------
SELECT EXISTS (
  SELECT 1
  FROM supabase_migrations.schema_migrations
  WHERE version LIKE '20261113160000%'
) AS profile_directory_applied,
  'false BEFORE first apply, true AFTER' AS expected_outcome;

SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- ---------------------------------------------------------------------------
-- 2. Prerequisites from earlier migrations — ALL must be true BEFORE
--    applying, or the migration fails inside its transaction and rolls
--    back (it references these objects directly).
-- ---------------------------------------------------------------------------
SELECT
  to_regclass('public.voter_approvals') IS NOT NULL AS voter_approvals_table,
  to_regtype('public.voter_approval_status') IS NOT NULL AS approval_status_type,
  to_regclass('public.user_roles') IS NOT NULL AS user_roles_table,
  to_regclass('public.admin_notifications') IS NOT NULL AS admin_notifications_table,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'has_role'
  ) AS private_has_role_fn,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'assert_voter_approved'
  ) AS private_assert_voter_approved_fn,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) AS handle_new_user_fn,
  'ALL must be true BEFORE applying' AS expected_outcome;

-- ---------------------------------------------------------------------------
-- 3. Profile columns (informational). ADD COLUMN IF NOT EXISTS is safe in
--    both directions; username_pre_existing=true means the backfill only
--    touches rows where username IS NULL.
-- ---------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'username'
  ) AS username_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'banner_image'
  ) AS banner_image_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'favourite_club'
  ) AS favourite_club_exists,
  'all=false on a clean database; true values only mean a prior partial
   or already-complete apply of the column additions' AS expected_outcome;

-- ---------------------------------------------------------------------------
-- 4. Username data readiness — invalid_format and case_duplicates must be
--    0 BEFORE applying (the SET NOT NULL / format CHECK / expression
--    unique index steps fail otherwise). username_is_null is the backfill
--    work queue: expected > 0 on a live database, 0 AFTER a successful
--    apply. colliding_email_bases is informational — those rows receive
--    _2/_3 suffixes automatically.
-- ---------------------------------------------------------------------------
SELECT
  count(*) AS profile_rows,
  count(*) FILTER (WHERE username IS NULL) AS username_is_null_backfill_queue,
  count(*) FILTER (
    WHERE username IS NOT NULL AND username !~ '^[a-z0-9_]{3,24}$'
  ) AS invalid_format,
  count(*) FILTER (WHERE username IS NOT NULL)
    - count(DISTINCT lower(username)) AS case_duplicates,
  'invalid_format=0 AND case_duplicates=0 required BEFORE; username_is_null=0 AFTER' AS expected_outcome
FROM public.profiles;

SELECT
  lower_part AS email_local_part,
  count(*) AS rows_sharing_local_part,
  'informational: the backfill and signup trigger append _2/_3 suffixes automatically' AS expected_outcome
FROM (
  SELECT lower(split_part(coalesce(p.email, u.email, ''), '@', 1)) AS lower_part
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
) t
WHERE lower_part IS NOT NULL AND lower_part <> ''
GROUP BY lower_part
HAVING count(*) > 1
ORDER BY lower_part;

-- ---------------------------------------------------------------------------
-- 5. Object conflicts — objects the migration creates WITHOUT IF NOT EXISTS.
--    On a clean database every flag is false BEFORE and true AFTER. A true
--    flag BEFORE means a PRIOR PARTIAL APPLY (or a same-named unrelated
--    object): resolve manually before applying, otherwise the migration
--    fails inside its transaction and rolls back (nothing is half-applied).
-- ---------------------------------------------------------------------------
SELECT
  to_regtype('public.follow_request_status') IS NOT NULL
    AS type_follow_request_status,
  to_regclass('public.follow_requests') IS NOT NULL
    AS table_follow_requests,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'profiles'
      AND c.conname = 'profiles_username_format'
  ) AS constraint_username_format,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND indexname = 'profiles_username_lower_key'
  ) AS index_username_lower,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger tg
    JOIN pg_catalog.pg_class t ON t.oid = tg.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'profiles'
      AND tg.tgname = 'trg_profiles_username_normalize'
      AND NOT tg.tgisinternal
  ) AS trigger_username_normalize,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'is_approved'
  ) AS fn_private_is_approved,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('request_follow', 'decide_follow', 'remove_follow')
  ) AS fn_follow_rpcs,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'profiles_select_visible'
  ) AS policy_profiles_select_visible,
  'all=false BEFORE first apply, all=true AFTER (they are the migration output)' AS expected_outcome;

-- EXPECTED TRUE BEFORE and FALSE AFTER: the legacy wide-open policy the
-- migration replaces. false/false means it was already dropped elsewhere.
SELECT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'profiles_select_all'
) AS profiles_select_all_present,
  'true BEFORE (the migration drops it), false AFTER' AS expected_outcome;

-- Current policies on profiles, for the record (BEFORE: profiles_select_all
-- plus the own-row INSERT/UPDATE policies; AFTER: profiles_select_visible
-- replaces profiles_select_all).
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
