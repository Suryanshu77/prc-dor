-- SECURITY FIX: Revoke direct access to result views from authenticated users
-- Results must only be accessible through SECURITY DEFINER functions that enforce visibility

-- Revoke SELECT on player_results view from authenticated
REVOKE SELECT ON public.player_results FROM authenticated;

-- Revoke SELECT on player_results_by_period view from authenticated
REVOKE SELECT ON public.player_results_by_period FROM authenticated;

-- Grant SELECT on views to service_role (for admin functions)
GRANT SELECT ON public.player_results TO service_role;
GRANT SELECT ON public.player_results_by_period TO service_role;

-- Function to get a player's rank in a specific voting period
-- Respects results_visible for non-admin users
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
  SELECT
    (ROW_NUMBER() OVER (ORDER BY r.total_points DESC, r.first_place_votes DESC))::int AS rank,
    r.total_points,
    r.first_place_votes,
    r.total_rankings
  FROM public.player_results_by_period r
  WHERE r.voting_period_id = _period_id
    AND r.id = _player_id
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

REVOKE ALL ON FUNCTION public.get_player_period_rank(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_period_rank(uuid, uuid) TO authenticated;

-- Function to get analytics data for the active voting period
-- Respects results_visible for non-admin users
-- Returns empty result set if results are hidden and user is not admin
CREATE OR REPLACE FUNCTION public.get_active_period_analytics()
RETURNS TABLE (
  id uuid,
  full_name text,
  nickname text,
  position public.player_position,
  jersey_number int,
  profile_image text,
  total_points int,
  first_place_votes int,
  total_rankings int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id,
    r.full_name,
    r.nickname,
    r.position,
    r.jersey_number,
    r.profile_image,
    r.total_points,
    r.first_place_votes,
    r.total_rankings
  FROM public.player_results_by_period r
  JOIN public.voting_periods vp ON vp.id = r.voting_period_id
  WHERE vp.is_active = true
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR vp.results_visible = true
    )
  ORDER BY r.total_points DESC, r.first_place_votes DESC;
$$;

REVOKE ALL ON FUNCTION public.get_active_period_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_period_analytics() TO authenticated;