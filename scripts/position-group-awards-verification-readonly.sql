-- ============================================================================
-- PRC D'OR -- BEST MIDFIELDER / BEST DEFENDER: PRODUCTION VERIFICATION
-- Migration under test: src/supabase/migrations/20261120120000_position_group_awards.sql
-- Contains ONLY SELECT statements. Safe to run in Lovable Cloud SQL Editor.
-- Read-only: no INSERT / UPDATE / DELETE / ALTER / DROP / CREATE / DO anywhere.
-- Run top to bottom in one pass. If a statement errors the editor stops there.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1 -- Table shape: CHECK constraints and the new column
-- EXPECT 1a: exactly 4 rows, no constraint still listing only the four legacy
--            keys (award_key, eligibility_type, position_group, rule).
-- EXPECT 1b: exactly 1 row, type text, nullable, no default.
-- EXPECT 1c: exactly 1 row, UNIQUE (voting_period_id, award_key).
-- ----------------------------------------------------------------------------

-- 1a. All CHECK constraints on public.special_awards
SELECT c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid = 'public.special_awards'::regclass
  AND c.contype = 'c'
ORDER BY c.conname;

-- 1b. The eligibility_position_group column
SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'special_awards'
  AND c.column_name = 'eligibility_position_group';

-- 1c. The uniqueness the top-up INSERT's ON CONFLICT depends on
SELECT c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid = 'public.special_awards'::regclass
  AND c.contype = 'u'
ORDER BY c.conname;

-- ----------------------------------------------------------------------------
-- SECTION 2 -- Position classifier: stored enum labels, abbreviations,
--              unknown labels and NULL. EXPECT: 28 rows, every pass = true.
--              Unknown / empty / NULL must normalise to NULL (fail closed),
--              Winger must land in 'forward' (excluded from both new awards).
-- ----------------------------------------------------------------------------

WITH cases(ord, pos, expected) AS (
  VALUES
    (1,  'Midfielder',  'midfielder'),
    (2,  'midfielder',  'midfielder'),
    (3,  'CM',          'midfielder'),
    (4,  'CDM',         'midfielder'),
    (5,  'CAM',         'midfielder'),
    (6,  'LM',          'midfielder'),
    (7,  'RM',          'midfielder'),
    (8,  'Defender',    'defender'),
    (9,  'defender',    'defender'),
    (10, 'CB',          'defender'),
    (11, 'LB',          'defender'),
    (12, 'RB',          'defender'),
    (13, 'LWB',         'defender'),
    (14, 'RWB',         'defender'),
    (15, 'Centre-Back', 'defender'),
    (16, 'Center-back', 'defender'),
    (17, 'Striker',     'forward'),
    (18, 'ST',          'forward'),
    (19, 'Forward',     'forward'),
    (20, 'CF',          'forward'),
    (21, 'Winger',      'forward'),
    (22, 'LW',          'forward'),
    (23, 'RW',          'forward'),
    (24, 'Goalkeeper',  'goalkeeper'),
    (25, 'GK',          'goalkeeper'),
    (26, 'Playmaker',   NULL),
    (27, '',            NULL),
    (28, NULL,          NULL)
)
SELECT c.ord,
       c.pos AS input_position,
       c.expected,
       public.special_award_position_group(c.pos) AS actual,
       public.special_award_position_group(c.pos) IS NOT DISTINCT FROM c.expected AS pass
FROM cases c
ORDER BY c.ord;

-- ----------------------------------------------------------------------------
-- SECTION 3 -- Eligibility evaluator: the four legacy rules byte-equivalent,
--              the new by_position_group rule fail-closed.
--              EXPECT: 18 rows, every pass = true.
-- ----------------------------------------------------------------------------

WITH cases(ord, name, etype, epos, emaxage, page, ppos, egroup, expected) AS (
  VALUES
    (1,  'legacy / all | any position',        'all',               NULL::public.player_position, NULL::int, 30::int, 'Striker'::public.player_position, NULL::text, true),
    (2,  'legacy / all | NULL position',       'all',               NULL::public.player_position, NULL::int, 30::int, NULL::public.player_position,       NULL::text, true),
    (3,  'legacy / max_age 21 | age 21',       'max_age',           NULL::public.player_position, 21,        21,      'Striker',   NULL, true),
    (4,  'legacy / max_age 21 | age 22',       'max_age',           NULL::public.player_position, 21,        22,      'Striker',   NULL, false),
    (5,  'legacy / max_age 21 | age NULL',     'max_age',           NULL::public.player_position, 21,        NULL,    'Striker',   NULL, false),
    (6,  'legacy / by_position GK | GK',       'by_position',       'Goalkeeper',                 NULL,      30,      'Goalkeeper', NULL, true),
    (7,  'legacy / by_position GK | Defender', 'by_position',       'Goalkeeper',                 NULL,      30,      'Defender',   NULL, false),
    (8,  'legacy / by_position GK | NULL',     'by_position',       'Goalkeeper',                 NULL,      30,      NULL,         NULL, false),
    (9,  'new / midfielder | Midfielder',      'by_position_group', NULL,                         NULL,      26,      'Midfielder', 'midfielder', true),
    (10, 'new / midfielder | Defender',        'by_position_group', NULL,                         NULL,      26,      'Defender',   'midfielder', false),
    (11, 'new / midfielder | Winger',          'by_position_group', NULL,                         NULL,      26,      'Winger',     'midfielder', false),
    (12, 'new / midfielder | Striker',         'by_position_group', NULL,                         NULL,      26,      'Striker',    'midfielder', false),
    (13, 'new / midfielder | Goalkeeper',      'by_position_group', NULL,                         NULL,      26,      'Goalkeeper', 'midfielder', false),
    (14, 'new / midfielder | NULL position',   'by_position_group', NULL,                         NULL,      26,      NULL,         'midfielder', false),
    (15, 'new / defender | Defender',          'by_position_group', NULL,                         NULL,      27,      'Defender',   'defender', true),
    (16, 'new / defender | Midfielder',        'by_position_group', NULL,                         NULL,      27,      'Midfielder', 'defender', false),
    (17, 'new / defender | NULL position',     'by_position_group', NULL,                         NULL,      27,      NULL,         'defender', false),
    (18, 'new / NULL group | Midfielder',      'by_position_group', NULL,                         NULL,      26,      'Midfielder', NULL, false)
)
SELECT c.ord,
       c.name,
       c.expected,
       public.special_award_eligible_profile(c.etype, c.epos, c.emaxage, c.page, c.ppos, c.egroup) AS actual,
       public.special_award_eligible_profile(c.etype, c.epos, c.emaxage, c.page, c.ppos, c.egroup)
         IS NOT DISTINCT FROM c.expected AS pass
FROM cases c
ORDER BY c.ord;

-- ----------------------------------------------------------------------------
-- SECTION 4 -- Function inventory: signatures, security posture, definitions
-- EXPECT 4a: 9 rows, one overload each
--              special_award_position_group(text)                        vol=i, not secdef, search_path set
--              special_award_eligible_profile(text,player_position,int,
--                     int,player_position,text)                         vol=s, not secdef, search_path set
--              admin_* / submit_special_ballot                           vol=v, secdef=true, search_path set
--              private.has_role(uuid, app_role)                          vol=s, secdef=true, search_path set
-- EXPECT 4b: 0 rows (no function with more than one overload)
-- EXPECT 4c: every marker present = true
-- ----------------------------------------------------------------------------

-- 4a. Inventory
SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature,
       p.provolatile AS vol,
       p.prosecdef AS security_definer,
       coalesce(array_to_string(p.proconfig, ', '), '(none)') AS proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE (n.nspname, p.proname) IN (
  ('private', 'has_role'),
  ('public', 'special_award_position_group'),
  ('public', 'special_award_eligible_profile'),
  ('public', 'admin_nominate_player'),
  ('public', 'admin_create_special_award_edition'),
  ('public', 'admin_set_special_award_eligibility'),
  ('public', 'admin_set_special_award_status'),
  ('public', 'admin_set_all_special_award_status'),
  ('public', 'submit_special_ballot')
)
ORDER BY 1;

-- 4b. Duplicate overloads (the legacy five-argument evaluator must be gone)
SELECT n.nspname AS schema, p.proname, count(*) AS overloads
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('special_award_position_group', 'special_award_eligible_profile',
                    'admin_nominate_player', 'admin_create_special_award_edition',
                    'admin_set_special_award_eligibility', 'admin_set_special_award_status',
                    'admin_set_all_special_award_status', 'submit_special_ballot')
GROUP BY n.nspname, p.proname
HAVING count(*) > 1
ORDER BY 2;

-- 4c. Definition markers (which version of each body actually won)
SELECT 'M01_classifier_exists' AS marker,
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'special_award_position_group'
       ) AS present
UNION ALL
SELECT 'M02_evaluator_six_arg_only',
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'special_award_eligible_profile') = 1
UNION ALL
SELECT 'M03_evaluator_handles_by_position_group',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'special_award_eligible_profile'
           AND p.prosrc LIKE '%''by_position_group''%'
       )
UNION ALL
SELECT 'M04_nominate_passes_award_position_group',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_nominate_player'
           AND p.prosrc LIKE '%_award.eligibility_position_group%'
           AND p.prosrc LIKE '%special_award_eligible_profile%'
       )
UNION ALL
SELECT 'M05_nominate_admin_gate',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_nominate_player'
           AND p.prosrc LIKE '%not authorized: admin only%'
           AND p.prosrc LIKE '%does not meet the eligibility rule%'
       )
UNION ALL
SELECT 'M06_nominate_is_security_definer_with_search_path',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_nominate_player'
           AND p.prosecdef
           AND coalesce(array_to_string(p.proconfig, ','), '') LIKE '%search_path=public%pg_temp%'
       )
UNION ALL
SELECT 'M07_eligibility_lock_on_both_new_awards',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_set_special_award_eligibility'
           AND p.prosrc LIKE '%eligibility is fixed for this award%'
           AND p.prosrc LIKE '%best_midfielder%'
           AND p.prosrc LIKE '%best_defender%'
       )
UNION ALL
SELECT 'M08_eligibility_rpc_keeps_legacy_three_types',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_set_special_award_eligibility'
           AND p.prosrc LIKE '%NOT IN (''all'', ''by_position'', ''max_age'')%'
           AND p.prosrc LIKE '%votes already exist: eligibility is locked%'
       )
UNION ALL
SELECT 'M09_edition_creation_seeds_six_awards',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_create_special_award_edition'
           AND p.prosrc LIKE '%best_midfielder%'
           AND p.prosrc LIKE '%best_defender%'
           AND p.prosrc LIKE '%''by_position_group'', ''midfielder''%'
           AND p.prosrc LIKE '%''by_position_group'', ''defender''%'
           AND p.prosrc LIKE '%award_key = ''kopa''%'
           AND p.prosrc LIKE '%award_key = ''yashin''%'
       )
UNION ALL
SELECT 'M10_master_control_lists_all_six_keys',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_set_all_special_award_status'
           AND p.prosrc LIKE '%best_midfielder%'
           AND p.prosrc LIKE '%best_defender%'
           AND p.prosrc LIKE '%kopa%'
           AND p.prosrc LIKE '%socrates%'
       )
UNION ALL
SELECT 'M11_master_control_new_body_wording',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_set_all_special_award_status'
           AND p.prosrc LIKE '%all six awards%'
           AND p.prosrc LIKE '%THEN 3 ELSE 5%'
       )
UNION ALL
SELECT 'M12_master_control_old_four_key_body_gone',
       NOT EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_set_all_special_award_status'
           AND (p.prosrc LIKE '%all four awards%' OR p.prosrc NOT LIKE '%best_midfielder%')
       )
UNION ALL
SELECT 'M13_ballot_untouched_fixed_five_for_new_awards',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'submit_special_ballot'
           AND p.prosrc LIKE '%ELSE 5%'
           AND p.prosrc LIKE '%GREATEST(LEAST(_available, 5), 3)%'
           AND p.prosrc NOT LIKE '%position_group%'
           AND p.prosrc NOT LIKE '%best_midfielder%'
       )
UNION ALL
SELECT 'M14_per_award_status_thresholds_unchanged',
       EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_set_special_award_status'
           AND p.prosrc LIKE '%CASE WHEN _key = ''yashin'' THEN 3 ELSE 5 END%'
           AND p.prosrc NOT LIKE '%position_group%'
       )
UNION ALL
SELECT 'M15_results_and_stats_rpcs_still_award_agnostic',
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('get_special_award_results', 'get_special_award_stats',
                            'is_special_award_results_visible')
          AND (p.prosrc LIKE '%kopa%' OR p.prosrc LIKE '%yashin%'
               OR p.prosrc LIKE '%gerd_muller%' OR p.prosrc LIKE '%socrates%'
               OR p.prosrc LIKE '%best_midfielder%' OR p.prosrc LIKE '%best_defender%')) = 0
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- SECTION 5 -- EXECUTE grants
-- EXPECT 5a: anon = false for every listed function
--            authenticated = true for the six award RPCs (admin_create_,
--            admin_nominate_, admin_set_special_award_eligibility,
--            admin_set_special_award_status, admin_set_all_special_award_status,
--            submit_special_ballot) and for private.has_role, but FALSE for the
--            two internal helpers (special_award_position_group,
--            special_award_eligible_profile)
--            postgres = true everywhere
--            service_role = informational (Supabase default ACL may keep
--            EXECUTE on the helpers, harmless: server-side key only)
-- EXPECT 5b: zero rows with grantee PUBLIC (PUBLIC EXECUTE fully revoked)
-- ----------------------------------------------------------------------------

-- 5a. Per-role EXECUTE matrix
SELECT f.sch || '.' || f.fn AS function, r.role,
       COALESCE((
         SELECT has_function_privilege(r.role, p.oid, 'EXECUTE')
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = f.sch AND p.proname = f.fn
         LIMIT 1
       ), false) AS can_execute
FROM (VALUES ('private', 'has_role'),
             ('public', 'special_award_position_group'),
             ('public', 'special_award_eligible_profile'),
             ('public', 'admin_nominate_player'),
             ('public', 'admin_create_special_award_edition'),
             ('public', 'admin_set_special_award_eligibility'),
             ('public', 'admin_set_special_award_status'),
             ('public', 'admin_set_all_special_award_status'),
             ('public', 'submit_special_ballot')) AS f(sch, fn)
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role'), ('postgres')) AS r(role)
ORDER BY 1, r.role;

-- 5b. PUBLIC must not hold EXECUTE on any of them
SELECT a.routine_schema || '.' || a.routine_name AS function,
       a.grantee,
       a.privilege_type
FROM information_schema.routine_privileges a
WHERE a.routine_schema IN ('public', 'private')
  AND a.routine_name IN ('has_role', 'special_award_position_group', 'special_award_eligible_profile',
                         'admin_nominate_player', 'admin_create_special_award_edition',
                         'admin_set_special_award_eligibility', 'admin_set_special_award_status',
                         'admin_set_all_special_award_status', 'submit_special_ballot')
  AND a.grantee = 'PUBLIC'
ORDER BY 1, 2, 3;

-- ----------------------------------------------------------------------------
-- SECTION 6 -- Award rows
-- EXPECT 6a: one row per edition that has award rows, each 6 / 4 / 1 / 1
-- EXPECT 6b: only periods that never had special awards may appear (0 rows
--            is normal, and the master control ignores them)
-- EXPECT 6c: every best_midfielder row = by_position_group + 'midfielder',
--            every best_defender row = by_position_group + 'defender',
--            matching title and description, NULL position / max_age
-- EXPECT 6d: legacy rows keep group NULL and a legacy eligibility_type only
--            (defaults: kopa max_age 21, yashin Goalkeeper, gerd + socrates
--            all -- an admin may have reconfigured these, which is allowed)
-- ----------------------------------------------------------------------------

-- 6a. Completeness of every edition
SELECT p.year,
       count(*) AS award_rows,
       count(*) FILTER (WHERE sa.award_key IN ('kopa', 'yashin', 'gerd_muller', 'socrates')) AS legacy_rows,
       count(*) FILTER (WHERE sa.award_key = 'best_midfielder') AS midfielder_rows,
       count(*) FILTER (WHERE sa.award_key = 'best_defender') AS defender_rows,
       count(*) FILTER (WHERE sa.voting_open) AS open_awards,
       count(*) FILTER (WHERE sa.results_visible) AS visible_awards
FROM public.special_awards sa
JOIN public.voting_periods p ON p.id = sa.voting_period_id
GROUP BY p.id, p.year
ORDER BY p.year;

-- 6b. Voting periods with no special-award rows at all (informational)
SELECT p.year, p.title
FROM public.voting_periods p
WHERE NOT EXISTS (
  SELECT 1 FROM public.special_awards sa WHERE sa.voting_period_id = p.id
)
ORDER BY p.year;

-- 6c. The two new award rows
SELECT p.year,
       sa.award_key, sa.title, sa.description,
       sa.eligibility_type, sa.eligibility_position_group,
       sa.eligibility_position, sa.eligibility_max_age,
       sa.voting_open, sa.results_visible
FROM public.special_awards sa
JOIN public.voting_periods p ON p.id = sa.voting_period_id
WHERE sa.award_key IN ('best_midfielder', 'best_defender')
ORDER BY p.year, sa.award_key;

-- 6d. The four legacy awards
SELECT sa.award_key,
       sa.eligibility_type,
       sa.eligibility_position,
       sa.eligibility_max_age,
       sa.eligibility_position_group,
       count(*) AS award_rows
FROM public.special_awards sa
WHERE sa.award_key IN ('kopa', 'yashin', 'gerd_muller', 'socrates')
GROUP BY sa.award_key, sa.eligibility_type, sa.eligibility_position,
         sa.eligibility_max_age, sa.eligibility_position_group
ORDER BY sa.award_key, sa.eligibility_type;

-- 6e. INFO: existing nominees evaluated against the CURRENT rule of their own
--     award. 0 rows expected in practice. A row here means a nominee no longer
--     satisfies the configured rule -- historically possible for legacy awards
--     (eligibility may be reconfigured while no ballots exist), NOT caused by
--     this migration.
SELECT sa.award_key, sa.eligibility_type, sa.eligibility_position_group,
       pr.full_name, pr.position, pr.age,
       count(*) AS candidates
FROM public.special_award_candidates c
JOIN public.special_awards sa ON sa.id = c.award_id
JOIN public.profiles pr ON pr.id = c.player_id
GROUP BY sa.id, sa.award_key, sa.eligibility_type, sa.eligibility_position,
         sa.eligibility_max_age, sa.eligibility_position_group,
         pr.id, pr.full_name, pr.position, pr.age
HAVING NOT public.special_award_eligible_profile(
         sa.eligibility_type, sa.eligibility_position, sa.eligibility_max_age,
         pr.age, pr.position, sa.eligibility_position_group)
ORDER BY sa.award_key, pr.full_name;

-- ----------------------------------------------------------------------------
-- SECTION 7 -- Server-side nomination eligibility against real data
-- EXPECT 7a: best_midfielder.eligible = profiles grouped 'midfielder'
--            best_defender.eligible   = profiles grouped 'defender'
--            yashin.eligible          = Goalkeepers (unless reconfigured)
--            gerd_muller / socrates   = every profile (rule 'all')
--            kopa.eligible            = profiles aged 21 or under (0 is a
--                                       normal data outcome, not a defect)
--            never: eligible = 0 for an 'all' rule, or eligible = every
--                   profile for a position-group rule (that would mean the
--                   rule degraded to 'all')
-- EXPECT 7b: reference distribution used to read 7a
-- ----------------------------------------------------------------------------

-- 7a. Newest edition, every award, every profile
WITH newest AS (
  SELECT a.voting_period_id
  FROM public.special_awards a
  JOIN public.voting_periods p ON p.id = a.voting_period_id
  ORDER BY p.year DESC, p.id
  LIMIT 1
)
SELECT sa.award_key,
       sa.eligibility_type,
       sa.eligibility_position::text AS rule_position,
       sa.eligibility_max_age AS rule_max_age,
       sa.eligibility_position_group AS rule_group,
       count(*) AS profiles_checked,
       count(*) FILTER (
         WHERE public.special_award_eligible_profile(
           sa.eligibility_type, sa.eligibility_position, sa.eligibility_max_age,
           pr.age, pr.position, sa.eligibility_position_group)
       ) AS eligible_profiles
FROM newest n
JOIN public.special_awards sa ON sa.voting_period_id = n.voting_period_id
CROSS JOIN public.profiles pr
GROUP BY sa.id, sa.award_key, sa.eligibility_type, sa.eligibility_position,
         sa.eligibility_max_age, sa.eligibility_position_group
ORDER BY sa.award_key;

-- 7b. Profile distribution by normalised position group
SELECT public.special_award_position_group(pr.position::text) AS position_group,
       count(*) AS profiles
FROM public.profiles pr
GROUP BY 1
ORDER BY 1;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
