-- Additive: period-scoped leaderboard for the permanent yearly Results/History.
-- Does NOT modify the existing global `player_results` view, the `votes` table, or
-- the `hall_of_fame` archive (year-keyed, immutable). Purely additive.
--
-- Mirrors the exact column set of `public.player_results` but scoped per voting
-- period so per-year results never bleed into each other.

CREATE VIEW public.player_results_by_period
WITH (security_invoker = on)
AS
SELECT
  vp.id AS voting_period_id,
  vp.year,
  p.id,
  p.full_name,
  p.nickname,
  p.position,
  p.jersey_number,
  p.profile_image,
  COALESCE(SUM(v.points), 0)::INT AS total_points,
  COUNT(v.id) FILTER (WHERE v.rank_position = 1)::INT AS first_place_votes,
  COUNT(v.id)::INT AS total_rankings
FROM public.voting_periods vp
CROSS JOIN public.profiles p
LEFT JOIN public.votes v
  ON v.ranked_player_id = p.id
  AND v.voting_period_id = vp.id
GROUP BY vp.id, vp.year, p.id;

GRANT SELECT ON public.player_results_by_period TO authenticated;
