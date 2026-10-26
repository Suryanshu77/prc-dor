-- Combined preflight + postflight report for
-- src/supabase/migrations/20261023120000_reconcile_permissions.sql
--
-- READ-ONLY. One statement, one result set, four columns:
--   section     -- '1'..'7' matching preflight-migration-1.sql sections
--   check_name  -- stable identifier for the individual check
--   status      -- 'PASS' (assertion met) | 'FAIL' (assertion violated)
--                 | 'INFO' (inventory / report-only / human review)
--   details     -- human-readable payload
--
-- Run BEFORE and AFTER applying the migration. PASS/FAIL rows encode the
-- expected AFTER state; INFO rows are inventories a human compares across
-- the two runs. Mirrors every query in scripts/preflight-migration-1.sql.
--
-- Note: section 7 reads supabase_migrations.schema_migrations (Supabase
-- managed). If that schema is absent the whole statement fails; on a
-- Supabase project it always exists.

WITH six_tables AS (
  SELECT unnest(ARRAY[
    'votes', 'profiles', 'voting_periods',
    'user_roles', 'hall_of_fame', 'admin_notifications'
  ])::text AS relname
),

-- ===========================================================================
-- Section 1: table ACL inventory (INFO) + anon direct-ACL assertion
-- ===========================================================================
sec1_inventory AS (
  SELECT
    '1'::text AS section,
    ('table_acl:' || c.relname || ':' || r.rolname)::text AS check_name,
    'INFO'::text AS status,
    ('privileges=' || coalesce(
       string_agg(acl.privilege_type, ',' ORDER BY acl.privilege_type),
       '(none)'
     ))::text AS details
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) acl
  JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
  WHERE n.nspname = 'public'
    AND c.relname IN (SELECT relname FROM six_tables)
    AND r.rolname IN ('anon', 'authenticated', 'service_role')
  GROUP BY c.relname, r.rolname
),
sec1_anon AS (
  SELECT
    '1'::text AS section,
    ('anon_direct_acl:' || c.relname)::text AS check_name,
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(c.relacl) acl
      JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
      WHERE r.rolname = 'anon'
    ) THEN 'FAIL' ELSE 'PASS' END::text AS status,
    ('anon_has_direct_acl_entry must be false AFTER; relacl_is_null='
      || (c.relacl IS NULL)::text
      || ' (true means defaults apply, see section 5)')::text AS details
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (SELECT relname FROM six_tables)
),

-- ===========================================================================
-- Section 2: effective column privileges (authenticated)
-- ===========================================================================
sec2 AS (
  SELECT '2'::text AS section,
         'column_priv:profiles.email'::text AS check_name,
         CASE WHEN NOT has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT')
                AND NOT has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE')
              THEN 'PASS' ELSE 'FAIL' END::text AS status,
         ('auth_select=' || has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT')
           || ', auth_update=' || has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE')
           || ' (both must be false AFTER)')::text AS details
  UNION ALL
  SELECT '2', 'column_priv:profiles.full_name',
         CASE WHEN has_column_privilege('authenticated', 'public.profiles', 'full_name', 'SELECT')
                AND has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
              THEN 'PASS' ELSE 'FAIL' END,
         ('auth_select=' || has_column_privilege('authenticated', 'public.profiles', 'full_name', 'SELECT')
           || ', auth_update=' || has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
           || ' (both must be true AFTER)')::text
  UNION ALL
  SELECT '2', 'column_priv:profiles.bio',
         CASE WHEN has_column_privilege('authenticated', 'public.profiles', 'bio', 'SELECT')
                AND has_column_privilege('authenticated', 'public.profiles', 'bio', 'UPDATE')
              THEN 'PASS' ELSE 'FAIL' END,
         ('auth_select=' || has_column_privilege('authenticated', 'public.profiles', 'bio', 'SELECT')
           || ', auth_update=' || has_column_privilege('authenticated', 'public.profiles', 'bio', 'UPDATE')
           || ' (both must be true AFTER)')::text
  UNION ALL
  SELECT '2', 'column_priv:votes.voter_id',
         CASE WHEN has_column_privilege('authenticated', 'public.votes', 'voter_id', 'SELECT')
              THEN 'PASS' ELSE 'FAIL' END,
         ('auth_select=' || has_column_privilege('authenticated', 'public.votes', 'voter_id', 'SELECT')
           || ' (must stay true AFTER: myVoteQ filter + own-row RLS)')::text
),

-- ===========================================================================
-- Section 3: RLS state, policy inventory, votes read-policy assertion
-- ===========================================================================
sec3_rls AS (
  SELECT
    '3'::text AS section,
    ('rls_state:' || c.relname)::text AS check_name,
    CASE WHEN c.relrowsecurity AND NOT c.relforcerowsecurity
         THEN 'PASS' ELSE 'FAIL' END::text AS status,
    ('rls_enabled=' || c.relrowsecurity
      || ', rls_forced=' || c.relforcerowsecurity
      || ' (expected true/false AFTER)')::text AS details
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (SELECT relname FROM six_tables)
),
sec3_policies AS (
  SELECT
    '3'::text AS section,
    ('policy:' || pol.tablename || ':' || pol.policyname)::text AS check_name,
    'INFO'::text AS status,
    ('cmd=' || pol.cmd
      || ', roles=' || array_to_string(pol.roles, ',')
      || ', qual=' || coalesce(pol.qual, '(none)')
      || ', with_check=' || coalesce(pol.with_check, '(none)'))::text AS details
  FROM pg_catalog.pg_policies pol
  WHERE pol.schemaname = 'public'
    AND pol.tablename IN (SELECT relname FROM six_tables)
),
sec3_votes AS (
  SELECT '3'::text AS section,
         'votes_policy:votes_select_all'::text AS check_name,
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public' AND tablename = 'votes'
             AND policyname = 'votes_select_all'
         ) THEN 'FAIL' ELSE 'PASS' END::text AS status,
         'votes_select_all must be absent AFTER'::text AS details
  UNION ALL
  SELECT '3',
         'votes_policy:votes_select_own',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public' AND tablename = 'votes'
             AND policyname = 'votes_select_own'
             AND roles = '{authenticated}'
         ) THEN 'PASS' ELSE 'FAIL' END,
         'votes_select_own must be present for authenticated AFTER'::text
),

-- ===========================================================================
-- Section 4: function inventory + EXECUTE privilege assertions
-- ===========================================================================
sec4 AS (
  SELECT
    '4'::text AS section,
    ('function:' || n.nspname || '.' || p.proname
      || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')')::text AS check_name,
    CASE
      WHEN p.proname IN ('set_updated_at', 'handle_new_user') THEN
        CASE WHEN NOT has_function_privilege('anon', p.oid, 'EXECUTE')
               AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
             THEN 'PASS' ELSE 'FAIL' END
      WHEN p.proname = 'has_role' AND n.nspname = 'public' THEN
        CASE WHEN NOT has_function_privilege('anon', p.oid, 'EXECUTE')
               AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
               AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
             THEN 'PASS' ELSE 'FAIL' END
      ELSE
        CASE WHEN NOT has_function_privilege('anon', p.oid, 'EXECUTE')
               AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
             THEN 'PASS' ELSE 'FAIL' END
    END::text AS status,
    ('security_definer=' || p.prosecdef
      || ', proconfig=' || coalesce(array_to_string(p.proconfig, ','), '(none)')
      || ', execute_grantees=' || coalesce(
           (SELECT array_to_string(array_agg(r.rolname ORDER BY r.rolname), ',')
            FROM pg_catalog.aclexplode(p.proacl) a
            JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
            WHERE a.privilege_type = 'EXECUTE'),
           '(none)'
         ))::text AS details
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
),

-- ===========================================================================
-- Section 5: default privileges (report-only, human review)
-- ===========================================================================
sec5 AS (
  SELECT
    '5'::text AS section,
    ('default_acl:' || n.nspname || ':'
      || pg_catalog.pg_get_userbyid(d.defaclrole) || ':'
      || d.defaclobjtype::text)::text AS check_name,
    'INFO'::text AS status,
    ('defaclacl=' || coalesce(array_to_string(d.defaclacl, '; '), '(none)')
      || ' (review for anon/authenticated grants; migration does not change these)')::text AS details
  FROM pg_catalog.pg_default_acl d
  JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
  WHERE n.nspname IN ('public', 'private', 'storage')
),

-- ===========================================================================
-- Section 6: data spot-checks (must be identical before/after)
-- ===========================================================================
sec6 AS (
  SELECT '6'::text AS section, 'data:vote_rows'::text AS check_name,
         'INFO'::text AS status,
         ((SELECT count(*) FROM public.votes))::text AS details
  UNION ALL
  SELECT '6', 'data:profile_rows', 'INFO',
         ((SELECT count(*) FROM public.profiles))::text
  UNION ALL
  SELECT '6', 'data:distinct_voters', 'INFO',
         ((SELECT count(DISTINCT voter_id) FROM public.votes))::text
  UNION ALL
  SELECT '6', 'data:total_points', 'INFO',
         ((SELECT coalesce(sum(points), 0) FROM public.votes))::text
  UNION ALL
  SELECT '6', 'data:hof_rows', 'INFO',
         ((SELECT count(*) FROM public.hall_of_fame))::text
  UNION ALL
  SELECT '6', 'data:period_rows', 'INFO',
         ((SELECT count(*) FROM public.voting_periods))::text
),

-- ===========================================================================
-- Section 7: migration history (informational)
-- ===========================================================================
sec7 AS (
  SELECT
    '7'::text AS section,
    ('migration:' || m.version)::text AS check_name,
    'INFO'::text AS status,
    coalesce(m.name, '(unnamed)')::text AS details
  FROM supabase_migrations.schema_migrations m
)

-- ===========================================================================
-- Final union: one result set, four text columns
-- ===========================================================================
SELECT section, check_name, status, details FROM sec1_inventory
UNION ALL
SELECT section, check_name, status, details FROM sec1_anon
UNION ALL
SELECT section, check_name, status, details FROM sec2
UNION ALL
SELECT section, check_name, status, details FROM sec3_rls
UNION ALL
SELECT section, check_name, status, details FROM sec3_policies
UNION ALL
SELECT section, check_name, status, details FROM sec3_votes
UNION ALL
SELECT section, check_name, status, details FROM sec4
UNION ALL
SELECT section, check_name, status, details FROM sec5
UNION ALL
SELECT section, check_name, status, details FROM sec6
UNION ALL
SELECT section, check_name, status, details FROM sec7
ORDER BY section, check_name;
