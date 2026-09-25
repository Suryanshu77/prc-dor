-- Admin notifications for new user registrations.
-- Purely additive: does not touch existing tables. The existing auth.users
-- trigger (public.handle_new_user) is extended below to emit a
-- `user_registration` notification whenever a new account is created.

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'user_registration',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  -- One notification per (type, user) guards against duplicate events.
  UNIQUE (type, user_id)
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

-- Admin-only access. Inserts are produced by the SECURITY DEFINER trigger (or the
-- service role); authenticated clients get no INSERT/DELETE grants, so normal
-- users can neither fabricate nor delete notifications and can never read rows.
CREATE POLICY "admin_notifications_select_admin" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin_notifications_update_admin" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Realtime delivery. Full replica identity so the payload carries every column
-- (e.g. updated read_at) and not just the PK. Realtime still enforces the RLS
-- policies above, so only admins receive these events.
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END $$;

-- Extend the existing new-user trigger with an admin notification. Profile and
-- role creation are preserved exactly as before.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pos public.player_position;
  display_name TEXT;
BEGIN
  BEGIN
    pos := (NEW.raw_user_meta_data->>'position')::public.player_position;
  EXCEPTION WHEN OTHERS THEN
    pos := NULL;
  END;

  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name, nickname, age, position, jersey_number, profile_image, email)
  VALUES (
    NEW.id,
    display_name,
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

  INSERT INTO public.admin_notifications (type, title, message, user_id)
  VALUES (
    'user_registration',
    'New User Registered',
    '@' || display_name || ' just joined PRC D''or',
    NEW.id
  )
  ON CONFLICT (type, user_id) DO NOTHING;

  RETURN NEW;
END $$;