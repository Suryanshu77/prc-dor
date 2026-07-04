
-- 1) Move has_role to a private (non-API) schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate policies that referenced public.has_role
DROP POLICY IF EXISTS hof_admin_manage ON public.hall_of_fame;
CREATE POLICY hof_admin_manage ON public.hall_of_fame
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
CREATE POLICY user_roles_admin_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS voting_periods_admin_manage ON public.voting_periods;
CREATE POLICY voting_periods_admin_manage ON public.voting_periods
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS votes_admin_delete ON public.votes;
CREATE POLICY votes_admin_delete ON public.votes
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop the public-schema has_role now that nothing references it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2) Hide profile emails from other authenticated users
REVOKE SELECT (email) ON public.profiles FROM authenticated;
GRANT SELECT (email) ON public.profiles TO service_role;

-- Admin-only RPC to fetch emails for the admin players table
CREATE OR REPLACE FUNCTION public.admin_list_player_emails()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE private.has_role(auth.uid(), 'admin'::public.app_role)
$$;
REVOKE ALL ON FUNCTION public.admin_list_player_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_player_emails() TO authenticated;

-- 3) Restrict votes SELECT to own row (admins see all); expose aggregates via a function
DROP POLICY IF EXISTS votes_select_all ON public.votes;
CREATE POLICY votes_select_own ON public.votes
  FOR SELECT TO authenticated
  USING (auth.uid() = voter_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- The leaderboard view aggregates across all votes -- make it bypass caller RLS
ALTER VIEW public.player_results SET (security_invoker = off);

-- Aggregate counts function (callable by any signed-in user)
CREATE OR REPLACE FUNCTION public.get_period_vote_stats(_period_id uuid)
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
  WHERE voting_period_id = _period_id
$$;
REVOKE ALL ON FUNCTION public.get_period_vote_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_period_vote_stats(uuid) TO authenticated;
