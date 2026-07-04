
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.player_position AS ENUM ('Goalkeeper','Defender','Midfielder','Winger','Striker');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  age INT,
  position public.player_position,
  jersey_number INT,
  profile_image TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Voting periods
CREATE TABLE public.voting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'PRC D''or',
  is_active BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  banner_url TEXT,
  announcement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.voting_periods TO authenticated;
GRANT ALL ON public.voting_periods TO service_role;
ALTER TABLE public.voting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voting_periods_select_all" ON public.voting_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "voting_periods_admin_manage" ON public.voting_periods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Votes
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ranked_player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank_position INT NOT NULL CHECK (rank_position BETWEEN 1 AND 10),
  points INT NOT NULL,
  voting_period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(voter_id, rank_position, voting_period_id),
  UNIQUE(voter_id, ranked_player_id, voting_period_id),
  CHECK (voter_id <> ranked_player_id)
);
GRANT SELECT, INSERT, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select_all" ON public.votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes_insert_own" ON public.votes FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = voter_id
  AND EXISTS (SELECT 1 FROM public.voting_periods vp WHERE vp.id = voting_period_id AND vp.is_active = true)
);
CREATE POLICY "votes_admin_delete" ON public.votes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Hall of fame
CREATE TABLE public.hall_of_fame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL UNIQUE,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT NOT NULL,
  winner_image TEXT,
  total_points INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hall_of_fame TO authenticated;
GRANT ALL ON public.hall_of_fame TO service_role;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hof_select_all" ON public.hall_of_fame FOR SELECT TO authenticated USING (true);
CREATE POLICY "hof_admin_manage" ON public.hall_of_fame FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Leaderboard view (security_invoker so RLS of base tables applies)
CREATE VIEW public.player_results
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.full_name,
  p.nickname,
  p.position,
  p.jersey_number,
  p.profile_image,
  COALESCE(SUM(v.points), 0)::INT AS total_points,
  COUNT(v.id) FILTER (WHERE v.rank_position = 1)::INT AS first_place_votes,
  COUNT(v.id)::INT AS total_rankings
FROM public.profiles p
LEFT JOIN public.votes v ON v.ranked_player_id = p.id
GROUP BY p.id;
GRANT SELECT ON public.player_results TO authenticated;

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Handle new user: create profile + assign roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pos public.player_position;
BEGIN
  BEGIN
    pos := (NEW.raw_user_meta_data->>'position')::public.player_position;
  EXCEPTION WHEN OTHERS THEN
    pos := NULL;
  END;

  INSERT INTO public.profiles (id, full_name, nickname, age, position, jersey_number, profile_image, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'nickname',
    NULLIF(NEW.raw_user_meta_data->>'age','')::INT,
    pos,
    NULLIF(NEW.raw_user_meta_data->>'jersey_number','')::INT,
    NEW.raw_user_meta_data->>'profile_image',
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF NEW.email = 'suryanshu.saxena@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial voting period (2026, active)
INSERT INTO public.voting_periods (year, title, is_active, starts_at, ends_at)
VALUES (2026, 'PRC D''or 2026', true, now(), now() + interval '60 days');
