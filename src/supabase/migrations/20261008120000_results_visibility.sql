-- Add results_visible column to voting_periods
ALTER TABLE public.voting_periods
ADD COLUMN IF NOT EXISTS results_visible BOOLEAN NOT NULL DEFAULT FALSE;

-- Function to get period results with visibility enforcement
-- Admins always see results; public users only see when results_visible = true
CREATE OR REPLACE FUNCTION public.get_period_results(_period_id uuid)
RETURNS TABLE (
  voting_period_id uuid,
  year int,
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
    r.voting_period_id,
    r.year,
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
  WHERE r.voting_period_id = _period_id
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.voting_periods vp
        WHERE vp.id = _period_id
          AND vp.results_visible = true
      )
    )
  ORDER BY r.total_points DESC, r.first_place_votes DESC;
$$;

REVOKE ALL ON FUNCTION public.get_period_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_period_results(uuid) TO authenticated;

-- Helper function to check if results are visible for a period (for UI)
CREATE OR REPLACE FUNCTION public.is_period_results_visible(_period_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.voting_periods vp
      WHERE vp.id = _period_id
        AND vp.results_visible = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_period_results_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_period_results_visible(uuid) TO authenticated;