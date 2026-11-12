-- TEST-ONLY: minimal stubs so the production migration applies inside PGlite.
-- Never apply to any real environment: production Supabase already provides these.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;

CREATE SCHEMA auth;
-- email MUST stay character varying(255) to mirror production Supabase.
-- Declaring it `text` hid the 42804 "structure of query does not match
-- function result type" defect that broke the admin Registrations queue:
-- plpgsql compares RETURN QUERY output to the declared RETURNS TABLE types
-- exactly, so a bare auth.users.email (varchar) against a declared `text`
-- column only fails against the real auth schema.
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email varchar(255),
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Mirrors Supabase's auth.uid(); tests impersonate a user via:
--   SELECT set_config('test.user_id', '<uuid>', false);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.user_id', true), '')::uuid
$$;
