
CREATE OR REPLACE FUNCTION public.get_period_vote_stats(_period_id uuid DEFAULT NULL)
RETURNS TABLE(vote_count integer, voter_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COUNT(*)::int AS vote_count,
    COUNT(DISTINCT voter_id)::int AS voter_count
  FROM public.votes
  WHERE _period_id IS NULL OR voting_period_id = _period_id
$$;
