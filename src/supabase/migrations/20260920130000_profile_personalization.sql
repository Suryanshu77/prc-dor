-- Profile personalization: bio and social handle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS social_handle TEXT;

-- Email is owned by auth.users (managed through the auth flow), not editable
-- via the profiles table.
REVOKE UPDATE (email) ON public.profiles FROM authenticated;