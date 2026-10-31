-- ============================================================================
-- PRC D'OR — ADMIN VOTE AUDIT QUERIES (READ-ONLY)
-- ============================================================================
-- Run these in the Supabase SQL Editor to investigate voting patterns before
-- deciding whether a ballot is fraudulent. NOTHING in this file writes,
-- updates or deletes anything: every statement is a SELECT.
--
-- Schema facts these queries rely on (see
-- src/supabase/migrations/20261030120000_admin_vote_audit_and_final_ranking.sql):
--   * public.votes            — one row per ranked pick. Columns:
--                               voter_id, ranked_player_id, rank_position (1..10),
--                               points (15,12,10,8,7,6,5,4,3,2), voting_period_id,
--                               created_at, removed_at, removed_by, removal_reason.
--                               removed_at IS NOT NULL = the ballot was removed by
--                               an admin and no longer counts.
--   * public.profiles         — the players (full_name, nickname, email, ...).
--   * public.voting_periods   — one row per edition (year, title, is_active,
--                               results_visible, results_published).
--   * public.special_votes    — special-award ballots (kopa/yashin/gerd_muller/
--                               socrates). NEVER touched by main-ballot removal.
--   * public.final_rankings   — the manually approved final order (admin only).
--   * public.admin_audit_log  — record of every moderation action.
--
-- HOW TO USE
--   1. Run "STEP 0" and copy the edition id (uuid) you want to audit.
--   2. Replace :period_id below with that uuid (Supabase's SQL editor does not
--      define psql variables, so paste the literal uuid in place of
--      :period_id wherever it appears).
--   3. Work down the sections. Each is self-contained and read-only.
--
-- Removing a confirmed fraudulent ballot is NOT done here — use the admin
-- dashboard (Vote Audit → Remove), or scripts/admin-remove-voter-ballot.sql
-- for a guarded SQL procedure.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- STEP 0 — List the editions and pick one
-- ---------------------------------------------------------------------------
SELECT
  vp.id            AS period_id,
  vp.year,
  vp.title,
  vp.is_active     AS voting_open,
  vp.results_visible,
  vp.results_published,
  (SELECT count(*) FROM public.votes v
    WHERE v.voting_period_id = vp.id AND v.removed_at IS NULL) AS active_vote_rows,
  (SELECT count(DISTINCT v.voter_id) FROM public.votes v
    WHERE v.voting_period_id = vp.id AND v.removed_at IS NULL) AS active_voters,
  (SELECT count(*) FROM public.votes v
    WHERE v.voting_period_id = vp.id AND v.removed_at IS NOT NULL) AS removed_vote_rows
FROM public.voting_periods vp
ORDER BY vp.year DESC;


-- ---------------------------------------------------------------------------
-- 1. LIST ALL VOTERS FOR A PARTICULAR EDITION
--    (active and removed, with their ballot size and points)
-- ---------------------------------------------------------------------------
SELECT
  v.voter_id,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(p.nickname, ''), 'Unknown voter') AS voter_name,
  p.email,
  MIN(v.created_at)                                   AS first_row_at,
  MAX(v.created_at)                                   AS submitted_at,
  COUNT(*) FILTER (WHERE v.removed_at IS NULL)       AS active_rows,
  COALESCE(SUM(v.points) FILTER (WHERE v.removed_at IS NULL), 0) AS active_points,
  COUNT(*)                                           AS total_rows,
  MAX(v.removed_at)                                  AS removed_at,
  MAX(v.removal_reason)                              AS removal_reason
FROM public.votes v
LEFT JOIN public.profiles p ON p.id = v.voter_id
WHERE v.voting_period_id = :period_id
GROUP BY v.voter_id, p.full_name, p.nickname, p.email
ORDER BY (MAX(v.removed_at) IS NULL) DESC, voter_name;


-- ---------------------------------------------------------------------------
-- 2. INSPECT THE COMPLETE BALLOT OF ONE VOTER
--    Replace :voter_id with the voter's uuid.
-- ---------------------------------------------------------------------------
SELECT
  v.rank_position,
  v.ranked_player_id,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(p.nickname, ''), 'Unknown') AS player_voted_for,
  p.position      AS player_position,
  p.jersey_number,
  v.points,
  v.created_at,
  v.removed_at,
  v.removal_reason
FROM public.votes v
LEFT JOIN public.profiles p ON p.id = v.ranked_player_id
WHERE v.voting_period_id = :period_id
  AND v.voter_id = :voter_id
ORDER BY v.rank_position;

-- Same ballot, one line per pick, plus the running total:
SELECT
  v.rank_position AS rank,
  COALESCE(p.full_name, '?') AS player,
  v.points,
  SUM(v.points) OVER (ORDER BY v.rank_position) AS running_points
FROM public.votes v
LEFT JOIN public.profiles p ON p.id = v.ranked_player_id
WHERE v.voting_period_id = :period_id
  AND v.voter_id = :voter_id
  AND v.removed_at IS NULL
ORDER BY v.rank_position;


-- ---------------------------------------------------------------------------
-- 3. SEE WHICH VOTERS SELECTED A PARTICULAR PLAYER
--    Replace :player_id with the player's profile uuid.
-- ---------------------------------------------------------------------------
SELECT
  v.voter_id,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(p.nickname, ''), 'Unknown voter') AS voter_name,
  pv.email                                        AS voter_email,
  v.rank_position,
  v.points,
  v.created_at,
  (v.removed_at IS NOT NULL)                     AS ballot_removed
FROM public.votes v
LEFT JOIN public.profiles p  ON p.id  = v.voter_id
LEFT JOIN public.profiles pv ON pv.id = v.voter_id
WHERE v.voting_period_id = :period_id
  AND v.ranked_player_id = :player_id
ORDER BY v.removed_at IS NULL DESC, v.rank_position;


-- ---------------------------------------------------------------------------
-- 4. COMPARE THE VOTING PATTERNS OF TWO USERS
--    Replace :voter_a and :voter_b. The output is one row per player either of
--    them voted for, with each one's rank — the fastest way to see whether two
--    accounts picked the same players in the same order.
-- ---------------------------------------------------------------------------
WITH a AS (
  SELECT ranked_player_id, rank_position, points
  FROM public.votes
  WHERE voting_period_id = :period_id AND voter_id = :voter_a AND removed_at IS NULL
),
b AS (
  SELECT ranked_player_id, rank_position, points
  FROM public.votes
  WHERE voting_period_id = :period_id AND voter_id = :voter_b AND removed_at IS NULL
)
SELECT
  COALESCE(pa.full_name, pb.full_name, '?')  AS player,
  a.rank_position                            AS rank_by_a,
  b.rank_position                            AS rank_by_b,
  CASE
    WHEN a.rank_position IS NOT NULL AND b.rank_position IS NOT NULL
     AND a.rank_position = b.rank_position THEN 'identical position'
    WHEN a.rank_position IS NOT NULL AND b.rank_position IS NOT NULL THEN 'both picked'
    ELSE NULL
  END                                        AS agreement,
  a.points                                   AS points_from_a,
  b.points                                   AS points_from_b
FROM a
FULL OUTER JOIN b ON b.ranked_player_id = a.ranked_player_id
LEFT JOIN public.profiles pa ON pa.id = a.ranked_player_id
LEFT JOIN public.profiles pb ON pb.id = b.ranked_player_id
ORDER BY COALESCE(a.rank_position, b.rank_position);


-- ---------------------------------------------------------------------------
-- 5. PAIRS OF USERS WHO RANK EACH OTHER HIGHLY (reciprocal voting)
--    A and B both placed the other in their top N. The `voter_id < ranked_player_id`
--    predicate keeps one row per unordered pair. Run it with N = 3 and N = 5.
-- ---------------------------------------------------------------------------
SELECT
  ab.voter_id                                   AS voter_a,
  pa.full_name                                  AS voter_a_name,
  ab.ranked_player_id                           AS voter_b,
  pb.full_name                                  AS voter_b_name,
  ab.rank_position                              AS a_ranks_b_at,
  ba.rank_position                              AS b_ranks_a_at,
  (ab.rank_position + ba.rank_position)         AS combined_rank
FROM public.votes ab
JOIN public.votes ba
  ON ba.voter_id        = ab.ranked_player_id
 AND ba.ranked_player_id = ab.voter_id
JOIN public.profiles pa ON pa.id = ab.voter_id
JOIN public.profiles pb ON pb.id = ab.ranked_player_id
WHERE ab.voting_period_id = :period_id
  AND ab.voter_id < ab.ranked_player_id     -- one row per pair
  AND ab.removed_at IS NULL
  AND ba.removed_at IS NULL
  AND ab.rank_position <= 3                 -- <<< change to 5 for top-5
  AND ba.rank_position <= 3                 -- <<< change to 5 for top-5
ORDER BY combined_rank, ab.rank_position;


-- ---------------------------------------------------------------------------
-- 6. GROUPS WITH UNUSUALLY SIMILAR OR RECIPROCAL PATTERNS
--    Every unordered pair of voters, scored by how much of their ballot
--    overlaps and how much of it overlaps inside the top 3 / top 5. A genuine
--    pact shows a high shared_top5 together with the reciprocal rows from
--    query 5; coincidental overlap alone is much weaker evidence.
-- ---------------------------------------------------------------------------
WITH v AS (
  SELECT voter_id, ranked_player_id, rank_position
  FROM public.votes
  WHERE voting_period_id = :period_id AND removed_at IS NULL
),
pairs AS (
  SELECT
    x.voter_id AS voter_a,
    y.voter_id AS voter_b,
    count(*)                                            AS shared_picks,
    count(*) FILTER (
      WHERE x.rank_position <= 3 AND y.rank_position <= 3
    )                                                   AS shared_top3,
    count(*) FILTER (
      WHERE x.rank_position <= 5 AND y.rank_position <= 5
    )                                                   AS shared_top5
  FROM v x
  JOIN v y
    ON y.ranked_player_id = x.ranked_player_id
   AND y.voter_id > x.voter_id          -- one row per unordered pair
  GROUP BY x.voter_id, y.voter_id
)
SELECT
  pa.full_name AS voter_a_name,
  pb.full_name AS voter_b_name,
  pr.voter_a,
  pr.voter_b,
  pr.shared_picks,
  pr.shared_top3,
  pr.shared_top5
FROM pairs pr
LEFT JOIN public.profiles pa ON pa.id = pr.voter_a
LEFT JOIN public.profiles pb ON pb.id = pr.voter_b
WHERE pr.shared_picks >= 4              -- tune: ignore pairs sharing < 4 picks
ORDER BY pr.shared_top5 DESC, pr.shared_top3 DESC, pr.shared_picks DESC
LIMIT 50;


-- ---------------------------------------------------------------------------
-- 7. HOW OFTEN TWO USERS PLACE THE SAME PLAYERS IN THEIR TOP 3 / TOP 5
--    Narrower, per-pair version of query 6. Replace :voter_a / :voter_b.
-- ---------------------------------------------------------------------------
WITH a AS (
  SELECT ranked_player_id, rank_position
  FROM public.votes
  WHERE voting_period_id = :period_id AND voter_id = :voter_a AND removed_at IS NULL
),
b AS (
  SELECT ranked_player_id, rank_position
  FROM public.votes
  WHERE voting_period_id = :period_id AND voter_id = :voter_b AND removed_at IS NULL
)
SELECT
  (SELECT count(*) FROM a)                                                    AS ballot_size_a,
  (SELECT count(*) FROM b)                                                    AS ballot_size_b,
  (SELECT count(*) FROM a JOIN b ON b.ranked_player_id = a.ranked_player_id)  AS shared_picks,
  (SELECT count(*) FROM a JOIN b ON b.ranked_player_id = a.ranked_player_id
    WHERE a.rank_position <= 3 AND b.rank_position <= 3)                      AS shared_top3,
  (SELECT count(*) FROM a JOIN b ON b.ranked_player_id = a.ranked_player_id
    WHERE a.rank_position <= 5 AND b.rank_position <= 5)                      AS shared_top5,
  (SELECT rank_position FROM a
    WHERE ranked_player_id = :voter_b)                                        AS a_rank_of_b,
  (SELECT rank_position FROM b
    WHERE ranked_player_id = :voter_a)                                        AS b_rank_of_a;


-- ---------------------------------------------------------------------------
-- 8. ALL VOTES SUBMITTED DURING A PARTICULAR WINDOW
--    Useful for spotting a burst of coordinated sign-ups/submissions.
-- ---------------------------------------------------------------------------
SELECT
  v.created_at,
  v.voter_id,
  COALESCE(p.full_name, 'Unknown')   AS voter_name,
  v.rank_position,
  COALESCE(rp.full_name, 'Unknown')  AS player_voted_for,
  v.points,
  (v.removed_at IS NOT NULL)         AS ballot_removed
FROM public.votes v
LEFT JOIN public.profiles p  ON p.id  = v.voter_id
LEFT JOIN public.profiles rp ON rp.id = v.ranked_player_id
WHERE v.voting_period_id = :period_id
  AND v.created_at >= TIMESTAMPTZ '2026-01-01 00:00:00+00'   -- <<< edit
  AND v.created_at <  TIMESTAMPTZ '2027-01-01 00:00:00+00'   -- <<< edit
ORDER BY v.created_at, v.voter_id, v.rank_position;


-- ---------------------------------------------------------------------------
-- 9. AGGREGATE RANKING AFTER REMOVALS (what the public sees once visible)
--    Mirrors public.get_period_results for an administrator: only active
--    ballots count, and a saved manual order (public.final_rankings) wins.
-- ---------------------------------------------------------------------------
WITH calc AS (
  SELECT
    r.id,
    r.full_name,
    r.total_points,
    r.first_place_votes,
    ROW_NUMBER() OVER (
      ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
    ) AS calculated_row
  FROM public.player_results_by_period r
  WHERE r.voting_period_id = :period_id
)
SELECT
  c.calculated_row,
  fr.final_position AS manually_approved_position,
  c.full_name,
  c.total_points,
  c.first_place_votes
FROM calc c
LEFT JOIN public.final_rankings fr
  ON fr.voting_period_id = :period_id
 AND fr.player_id = c.id
WHERE c.total_points > 0
ORDER BY COALESCE(fr.final_position, c.calculated_row);


-- ---------------------------------------------------------------------------
-- 10. SPECIAL-AWARD BALLOTS OF ONE VOTER (never removed with the main ballot)
-- ---------------------------------------------------------------------------
SELECT
  sa.award_key,
  sa.title,
  sv.rank_position,
  COALESCE(p.full_name, '?') AS candidate,
  sv.points,
  sv.created_at
FROM public.special_votes sv
JOIN public.special_awards sa ON sa.id = sv.award_id
LEFT JOIN public.profiles p   ON p.id = sv.candidate_id
WHERE sv.voter_id = :voter_id
ORDER BY sa.award_key, sv.rank_position;


-- ---------------------------------------------------------------------------
-- 11. MODERATION HISTORY (what has already been done, and by whom)
-- ---------------------------------------------------------------------------
SELECT
  l.created_at,
  l.action,
  admin.full_name  AS performed_by,
  target.full_name AS target_user,
  vp.year          AS edition,
  l.reason,
  l.records_affected,
  l.details
FROM public.admin_audit_log l
LEFT JOIN public.profiles admin  ON admin.id  = l.admin_user_id
LEFT JOIN public.profiles target ON target.id = l.target_user_id
LEFT JOIN public.voting_periods vp ON vp.id = l.voting_period_id
ORDER BY l.created_at DESC
LIMIT 100;


-- ---------------------------------------------------------------------------
-- 12. SANITY: ballot integrity for the edition
--     Every active voter must have exactly 10 rows, ranks 1..10 and the frozen
--     point map. Anything listed here is a data problem, not necessarily fraud.
-- ---------------------------------------------------------------------------
SELECT
  v.voter_id,
  COALESCE(p.full_name, 'Unknown') AS voter_name,
  COUNT(*)                                                            AS rows,
  COUNT(DISTINCT v.rank_position)                                     AS distinct_ranks,
  MIN(v.rank_position)                                                AS min_rank,
  MAX(v.rank_position)                                                AS max_rank,
  SUM(v.points)                                                       AS total_points,
  COUNT(*) FILTER (
    WHERE v.points IS DISTINCT FROM public.ballot_points_for_rank(v.rank_position)
  )                                                                   AS bad_point_rows
FROM public.votes v
LEFT JOIN public.profiles p ON p.id = v.voter_id
WHERE v.voting_period_id = :period_id
  AND v.removed_at IS NULL
GROUP BY v.voter_id, p.full_name
HAVING COUNT(*) <> 10
    OR COUNT(DISTINCT v.rank_position) <> 10
    OR SUM(v.points) <> 72
    OR COUNT(*) FILTER (
         WHERE v.points IS DISTINCT FROM public.ballot_points_for_rank(v.rank_position)
       ) > 0
ORDER BY voter_name;
