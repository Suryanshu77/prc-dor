-- Read-only 2026 baseline verification (Phase 0). SELECT-only; safe to run in the
-- Supabase SQL Editor. Run BEFORE any Phase 1 migration; re-run identical queries
-- after each migration and diff the results. Save output (e.g., as CSV) as the
-- pre-change record. No statements below modify any data or schema.

-- ---------------------------------------------------------------------------
-- 1. All voting periods: flags, winner, window (F1/F7/F11 evidence)
-- ---------------------------------------------------------------------------
SELECT
  id, year, title, is_active, starts_at, ends_at,
  results_published, results_visible, winner_id, created_at
FROM public.voting_periods
ORDER BY year;

-- Expected for 2026: is_active (true/false?), ends_at, results_published,
-- results_visible, winner_id — capture the actual values; do not assume.

-- ---------------------------------------------------------------------------
-- 2. Hall of Fame records (F10 evidence: year is UNIQUE today)
-- ---------------------------------------------------------------------------
SELECT id, year, winner_id, winner_name, winner_image, total_points, notes, created_at
FROM public.hall_of_fame
ORDER BY year;

-- ---------------------------------------------------------------------------
-- 3. Vote counts per period: rows vs distinct voters (F1 evidence)
-- ---------------------------------------------------------------------------
SELECT
  vp.year,
  vp.id AS period_id,
  COUNT(v.id) AS vote_rows,
  COUNT(DISTINCT v.voter_id) AS distinct_voters,
  COALESCE(SUM(v.points), 0) AS total_points
FROM public.voting_periods vp
LEFT JOIN public.votes v ON v.voting_period_id = vp.id
GROUP BY vp.year, vp.id
ORDER BY vp.year;

-- ---------------------------------------------------------------------------
-- 4. Ballot completeness histogram (critical before adding any integrity
--    constraint: partial legacy ballots would make a deferred constraint
--    trigger fail on future writes touching those ballots)
-- ---------------------------------------------------------------------------
SELECT year, rows_per_voter, COUNT(*) AS voters_with_that_row_count
FROM (
  SELECT vp.year, v.voter_id, COUNT(*) AS rows_per_voter
  FROM public.votes v
  JOIN public.voting_periods vp ON vp.id = v.voting_period_id
  GROUP BY vp.year, v.voter_id
) t
GROUP BY year, rows_per_voter
ORDER BY year, rows_per_voter;

-- A healthy closed period shows only rows_per_voter = 10.
-- Any value <> 10 is a partial/legacy ballot (must be resolved or grandfathered
-- before installing ballot-completeness enforcement).

-- ---------------------------------------------------------------------------
-- 5. Points-map conformance (F1 evidence: points column has no DB constraint;
--    map is src/lib/points.ts: 15/12/10/8/7/6/5/4/3/2, full ballot = 72)
-- ---------------------------------------------------------------------------
SELECT vp.year, v.voter_id, v.rank_position, v.points,
       CASE v.rank_position
         WHEN 1 THEN 15 WHEN 2 THEN 12 WHEN 3 THEN 10 WHEN 4 THEN 8 WHEN 5 THEN 7
         WHEN 6 THEN 6 WHEN 7 THEN 5 WHEN 8 THEN 4 WHEN 9 THEN 3 WHEN 10 THEN 2
       END AS expected_points
FROM public.votes v
JOIN public.voting_periods vp ON vp.id = v.voting_period_id
WHERE v.points IS DISTINCT FROM CASE v.rank_position
  WHEN 1 THEN 15 WHEN 2 THEN 12 WHEN 3 THEN 10 WHEN 4 THEN 8 WHEN 5 THEN 7
  WHEN 6 THEN 6 WHEN 7 THEN 5 WHEN 8 THEN 4 WHEN 9 THEN 3 WHEN 10 THEN 2
END
ORDER BY vp.year, v.voter_id, v.rank_position;
-- Zero rows expected. Any row is historical tampering/data drift — record it.

-- ---------------------------------------------------------------------------
-- 6. Duplicate-rank and duplicate-player checks (unique constraints should
--    already guarantee zero rows here; confirm nothing was added out-of-band)
-- ---------------------------------------------------------------------------
SELECT
    'dup_rank' AS issue,
    voter_id::text AS voter_id,
    voting_period_id::text AS voting_period_id,
    rank_position::text AS duplicate_value,
    COUNT(*) AS duplicate_count
FROM public.votes
GROUP BY voter_id, voting_period_id, rank_position
HAVING COUNT(*) > 1

UNION ALL

SELECT
    'dup_player' AS issue,
    voter_id::text AS voter_id,
    voting_period_id::text AS voting_period_id,
    ranked_player_id::text AS duplicate_value,
    COUNT(*) AS duplicate_count
FROM public.votes
GROUP BY voter_id, voting_period_id, ranked_player_id
HAVING COUNT(*) > 1

ORDER BY issue, voter_id;

-- ---------------------------------------------------------------------------
-- 7. Checksum for post-migration comparison (any schema/data-affecting mistake
--    in Phase 1 changes these numbers; compare before/after side by side)
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM public.votes) AS total_vote_rows,
  (SELECT COUNT(DISTINCT voter_id) FROM public.votes) AS total_voters,
  (SELECT COALESCE(SUM(points), 0) FROM public.votes) AS total_points,
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.hall_of_fame) AS hall_of_fame_rows,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') AS admin_roles,
  (SELECT md5(string_agg(line, E'\n' ORDER BY line)) FROM (
     SELECT (v.voter_id || '|' || v.ranked_player_id || '|' || v.rank_position
             || '|' || v.points || '|' || v.voting_period_id) AS line
     FROM public.votes v
   ) t) AS votes_md5;

-- ---------------------------------------------------------------------------
-- 8. Column-level evidence for the F4/F5 findings (structure only)
-- ---------------------------------------------------------------------------
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('votes', 'voting_periods', 'hall_of_fame')
ORDER BY table_name, ordinal_position;

-- votes.voter_id must still exist as a column (only its GRANTs were revoked
-- in migration 20260626044937; the F4 bug queries this column).

-- ---------------------------------------------------------------------------
-- 9. Effective privileges of the anon/authenticated roles on votes (F1/F5)
--    (read-only catalog queries)
-- ---------------------------------------------------------------------------
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'votes'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

SELECT grantee, routine_name, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, routine_name, privilege_type;
