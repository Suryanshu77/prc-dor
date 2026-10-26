-- Preflight + postflight validation for
-- src/supabase/migrations/20261023120000_reconcile_permissions.sql
--
-- READ-ONLY: every statement is a SELECT or a catalog query. Safe to run in
-- the Supabase SQL Editor. Run sections 1-6 BEFORE applying the migration
-- and keep the output; after applying, run the file again and check the
-- AFTER assertions in each section (they print true/false plus an
-- expected_outcome label). Sections are independent; results appear as
-- separate result grids.

-- ---------------------------------------------------------------------------
-- 1. Table ACLs for the six application tables, per role.
--    BEFORE: expect anon/authenticated to show "arwdDxtm"-style grants
--    (incl. T=TRUNCATE, x=REFERENCES, t=TRIGGER) on most tables.
--    AFTER:  anon_has_direct_acl_entry must be false on every table.
--            uses_default_acl_only=true means the table has no explicit ACL
--            and falls back to default privileges (review in section 5).
--            authenticated should show only SELECT/INSERT/DELETE (votes),
--            SELECT/UPDATE (profiles per-column), SELECT/UPDATE
--            (voting_periods, admin_notifications), SELECT (user_roles),
--            SELECT/INSERT/UPDATE (hall_of_fame).
-- ---------------------------------------------------------------------------
SELECT
  c.relname AS table_name,
  r.rolname AS grantee,
  string_agg(acl.privilege_type, ',' ORDER BY acl.privilege_type) AS privileges
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) acl
JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
WHERE n.nspname = 'public'
  AND c.relname IN (
    'votes', 'profiles', 'voting_periods', 'user_roles',
    'hall_of_fame', 'admin_notifications'
  )
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
GROUP BY c.relname, r.rolname
ORDER BY c.relname, r.rolname;

-- AFTER assertion: anon must hold zero direct table ACL entries on all six
-- tables. aclexplode() is used instead of has_table_privilege() because the
-- goal is to detect ANY ACL entry for anon, not a single named privilege.
-- When relacl is NULL the table has no explicit ACL and instead inherits
-- privileges from default ACLs (pg_default_acl); those defaults are
-- configuration reported in section 5, not direct table grants, and are not
-- modified by Migration 1.
SELECT
  c.relname AS table_name,
  c.relacl IS NULL AS uses_default_acl_only,
  EXISTS (
    SELECT 1
    FROM pg_catalog.aclexplode(c.relacl) acl
    JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
    WHERE r.rolname = 'anon'
  ) AS anon_has_direct_acl_entry,
  'anon_has_direct_acl_entry must be false AFTER; uses_default_acl_only=true means check section 5 default ACLs separately' AS expected_outcome
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'votes', 'profiles', 'voting_periods', 'user_roles',
    'hall_of_fame', 'admin_notifications'
  )
ORDER BY c.relname;

-- ---------------------------------------------------------------------------
-- 2. Effective column privileges (the checks that the June column REVOKEs
--    never satisfied). BEFORE: expect email/voter_id = true (table-level
--    grants override column REVOKEs). AFTER: email false/false; voter_id
--    true (own-ballot RLS + filter in vote.tsx requires it).
-- ---------------------------------------------------------------------------
SELECT
  'profiles.email' AS column_ref,
  has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT') AS auth_select,
  has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE') AS auth_update,
  'BOTH must be false AFTER' AS expected_outcome
UNION ALL
SELECT
  'profiles.full_name',
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'SELECT'),
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'BOTH must be true AFTER'
UNION ALL
SELECT
  'profiles.bio',
  has_column_privilege('authenticated', 'public.profiles', 'bio', 'SELECT'),
  has_column_privilege('authenticated', 'public.profiles', 'bio', 'UPDATE'),
  'BOTH must be true AFTER'
UNION ALL
SELECT
  'votes.voter_id',
  has_column_privilege('authenticated', 'public.votes', 'voter_id', 'SELECT'),
  false,
  'SELECT must stay true AFTER (myVoteQ filter + own-row RLS)';

-- ---------------------------------------------------------------------------
-- 3. RLS state and policies for the six tables.
--    AFTER: relrowsecurity true everywhere, relforcerowsecurity false
--    everywhere (forcing would break every SECURITY DEFINER RPC), and
--    votes_select_all gone / votes_select_own present for
--    authenticated only.
-- ---------------------------------------------------------------------------
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  'rls_enabled=true, rls_forced=false' AS expected_outcome
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'votes', 'profiles', 'voting_periods', 'user_roles',
    'hall_of_fame', 'admin_notifications'
  )
ORDER BY c.relname;

SELECT
  schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'votes', 'profiles', 'voting_periods', 'user_roles',
    'hall_of_fame', 'admin_notifications'
  )
ORDER BY tablename, policyname;

-- AFTER assertion for the votes read policy.
SELECT
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'votes'
      AND policyname = 'votes_select_all'
  ) AS votes_select_all_still_exists,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'votes'
      AND policyname = 'votes_select_own'
      AND roles = '{authenticated}'
  ) AS votes_select_own_present,
  'first=false, second=true AFTER' AS expected_outcome;

-- ---------------------------------------------------------------------------
-- 4. Function inventory: signatures, SECURITY DEFINER flag, search_path,
--    and EXECUTE privileges per role.
--    AFTER: proconfig of set_updated_at/handle_new_user contains
--    search_path=public,pg_temp; anon EXECUTE false on every row;
--    authenticated EXECUTE true on the seven RPCs and private.has_role.
-- ---------------------------------------------------------------------------
SELECT
  n.nspname AS schema,
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  p.proconfig,
  (SELECT coalesce(array_agg(r.rolname ORDER BY r.rolname), '{}')
   FROM aclexplode(p.proacl) a
   JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
   WHERE a.privilege_type = 'EXECUTE'
  ) AS execute_grantees
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE (n.nspname = 'public' AND p.proname IN (
         'get_period_results', 'is_period_results_visible',
         'get_player_period_rank', 'get_period_vote_stats',
         'has_voted_in_period', 'get_active_period_analytics',
         'admin_list_player_emails', 'set_updated_at', 'handle_new_user'
       ))
   OR (n.nspname = 'private' AND p.proname = 'has_role')
   OR (n.nspname = 'public' AND p.proname = 'has_role')
ORDER BY n.nspname, p.proname, args;

-- AFTER assertion: one row per RPC; every anon_execute should be false.
SELECT
  n.nspname AS schema,
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute,
  CASE
    WHEN p.proname IN ('set_updated_at', 'handle_new_user') THEN
      'anon=false, auth=false AFTER (trigger-only)'
    WHEN p.proname = 'has_role' AND n.nspname = 'public' THEN
      'all=false AFTER (if row exists)'
    ELSE 'anon=false, auth=true AFTER'
  END AS expected_outcome
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE (n.nspname = 'public' AND p.proname IN (
         'get_period_results', 'is_period_results_visible',
         'get_player_period_rank', 'get_period_vote_stats',
         'has_voted_in_period', 'get_active_period_analytics',
         'admin_list_player_emails', 'set_updated_at', 'handle_new_user',
         'has_role'
       ))
   OR (n.nspname = 'private' AND p.proname = 'has_role')
ORDER BY schema, p.proname, args;

-- ---------------------------------------------------------------------------
-- 5. Default privileges (REPORT ONLY — the migration deliberately does not
--    change these; a human must review before any ALTER DEFAULT PRIVILEGES).
--    Flag any default ACL granting to anon/authenticated on schema public
--    or private.
-- ---------------------------------------------------------------------------
SELECT
  n.nspname AS schema,
  pg_catalog.pg_get_userbyid(d.defaclrole) AS default_owner,
  d.defaclobjtype AS object_type,
  d.defaclacl AS default_acl
FROM pg_catalog.pg_default_acl d
JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname IN ('public', 'private', 'storage')
ORDER BY n.nspname, default_owner;

-- ---------------------------------------------------------------------------
-- 6. Data spot-checks (must be IDENTICAL before and after — Migration 1 is
--    permission-only and must never alter 2026 data).
--    Expected (2026 audit baseline): 183 vote rows, 21 profiles,
--    21 distinct voters, 1299 total points, 1 hall_of_fame row.
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.votes) AS vote_rows,
  (SELECT count(*) FROM public.profiles) AS profile_rows,
  (SELECT count(DISTINCT voter_id) FROM public.votes) AS distinct_voters,
  (SELECT coalesce(sum(points), 0) FROM public.votes) AS total_points,
  (SELECT count(*) FROM public.hall_of_fame) AS hof_rows,
  (SELECT count(*) FROM public.voting_periods) AS period_rows,
  'must match the pre-migration snapshot exactly' AS expected_outcome;

-- ---------------------------------------------------------------------------
-- 7. Orphan-migration visibility (informational): the repo has 12 migration
--    files; live history ends at an orphan 20260704055006. This migration
--    runs out-of-band via the SQL Editor like the Sept/Oct ones, so the
--    _migrations table is not expected to match; print it for the record.
-- ---------------------------------------------------------------------------
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
