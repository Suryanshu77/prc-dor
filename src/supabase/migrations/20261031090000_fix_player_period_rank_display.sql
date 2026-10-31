-- Fix: public.get_player_period_rank returned the internal sort key as rank.
--
-- The manual-final-ranking rewrite (20261030120000) orders a period by
--     COALESCE(CASE WHEN total_points > 0 THEN final_position END,
--             1000000 + calc_row)
-- so a saved position wins and everything else falls behind it — but it also
-- selected that very expression as the `rank` output column, leaking the
-- 1000000 offset into the API. The player profile page (players.$id.tsx)
-- renders the value verbatim, so every period without a saved manual ranking
-- showed "#1000001" instead of a real position.
--
-- This migration changes nothing but the projection:
--   * the sort key stays an ORDER BY expression inside the new `ordered` CTE;
--   * the visible rank is a ROW_NUMBER() over that same order, computed for
--     the complete period BEFORE the single-player filter is applied — asking
--     for one player can never change the numbers (1..N, deterministic);
--   * a saved final_position still wins and a zero-point player still falls
--     behind every stored position (the CASE nulls their override);
--   * signature, return columns and types, SECURITY DEFINER, search_path,
--     grants, deterministic tie-breaking (total_points DESC,
--     first_place_votes DESC, id) and the pre-existing results_visible/admin
--     gate are all preserved.
CREATE OR REPLACE FUNCTION public.get_player_period_rank(_player_id uuid, _period_id uuid)
RETURNS TABLE (
  rank int,
  total_points int,
  first_place_votes int,
  total_rankings int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH calc AS (
    SELECT
      r.id,
      r.total_points,
      r.first_place_votes,
      r.total_rankings,
      ROW_NUMBER() OVER (
        ORDER BY r.total_points DESC, r.first_place_votes DESC, r.id
      ) AS calc_row
    FROM public.player_results_by_period r
    WHERE r.voting_period_id = _period_id
  ),
  ordered AS (
    SELECT
      c.*,
      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(
            CASE WHEN c.total_points > 0 THEN fr.final_position END,
            1000000 + c.calc_row
          ),
          c.calc_row
      ) AS display_rank
    FROM calc c
    LEFT JOIN public.final_rankings fr
      ON fr.voting_period_id = _period_id
     AND fr.player_id = c.id
  )
  SELECT
    display_rank::int,
    total_points,
    first_place_votes,
    total_rankings
  FROM ordered
  WHERE id = _player_id
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.voting_periods vp
         WHERE vp.id = _period_id
           AND vp.results_visible = true
      )
    )
  LIMIT 1;
$$;

-- Access control is preserved exactly: admins through their admin role, every
-- other signed-in user through the authenticated grant, never anon, never
-- PUBLIC. Re-issuing the grants keeps the ACL deterministic even if another
-- migration has moved it in between.
REVOKE ALL ON FUNCTION public.get_player_period_rank(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_period_rank(uuid, uuid) TO authenticated;
