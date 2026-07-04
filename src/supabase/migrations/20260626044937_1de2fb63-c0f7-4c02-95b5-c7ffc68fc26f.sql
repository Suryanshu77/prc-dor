
-- Revert the security-definer view; rely on column-level privileges on votes instead
ALTER VIEW public.player_results SET (security_invoker = on);

-- Restore broad read on votes, but hide voter_id from authenticated users
DROP POLICY IF EXISTS votes_select_own ON public.votes;
CREATE POLICY votes_select_all ON public.votes
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT (voter_id) ON public.votes FROM authenticated;
-- authenticated still has SELECT on the remaining columns from the original table grant

-- Helper: did the current user vote in a given period?
CREATE OR REPLACE FUNCTION public.has_voted_in_period(_period_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.votes
    WHERE voting_period_id = _period_id AND voter_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.has_voted_in_period(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_voted_in_period(uuid) TO authenticated;
