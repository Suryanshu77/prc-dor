-- TEST-ONLY: minimal stubs so the production migration applies inside PGlite.
-- Never apply to any real environment: production Supabase already provides these.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Mirrors Supabase's auth.uid(); tests impersonate a user via:
--   SELECT set_config('test.user_id', '<uuid>', false);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.user_id', true), '')::uuid
$$;
